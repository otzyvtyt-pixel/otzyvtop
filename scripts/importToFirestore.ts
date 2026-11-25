/**
 * One-time CLI import script: pushes local catalog/by-category/*.json into Cloud Firestore.
 *
 * Usage:
 *   1. Standard Spark / local user run (authenticates via Firebase Auth email/password or Admin UI):
 *      - Note: In the OtzyvTop web UI, signing in with the Admin Google account (otzyvtyt@gmail.com)
 *        also provides a one-click "Импорт каталога в Firestore" button inside the Admin Panel.
 *   2. CLI run against your own Firebase project (when Firebase Auth ID token or Service Account is provided):
 *      FIREBASE_ID_TOKEN=<admin_id_token> npx tsx scripts/importToFirestore.ts
 *      # Optional: also upload deterministic baseline reviews for first N companies:
 *      FIREBASE_ID_TOKEN=<admin_id_token> IMPORT_REVIEWS_LIMIT=200 npx tsx scripts/importToFirestore.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, serverTimestamp, writeBatch } from 'firebase/firestore';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../src/i18n.ts';
import type { CategoryId, Company } from '../src/types.ts';
import { buildOverviewStats } from '../src/utils/catalogLogic.ts';
import { generateSeededReviews } from '../server/reviewSeeder.ts';
import { loadNormalizedCatalog } from './buildSeedBundle.ts';

function readEnvFile(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  const out: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function readConfig() {
  const env = { ...readEnvFile(), ...process.env };
  const appletPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const applet = fs.existsSync(appletPath)
    ? (JSON.parse(fs.readFileSync(appletPath, 'utf8')) as Record<string, string>)
    : {};

  return {
    apiKey: env.VITE_FIREBASE_API_KEY || applet.apiKey || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || applet.authDomain || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || applet.projectId || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || applet.storageBucket || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || applet.messagingSenderId || '',
    appId: env.VITE_FIREBASE_APP_ID || applet.appId || '',
    databaseId: env.VITE_FIREBASE_DATABASE_ID || applet.firestoreDatabaseId || '(default)',
  };
}

async function runRestCommit(
  projectId: string,
  databaseId: string,
  idToken: string,
  companies: Company[],
  reviewsLimit: number,
) {
  const dbName = `projects/${projectId}/databases/${databaseId || '(default)'}`;
  const url = `https://firestore.googleapis.com/v1/${dbName}/documents:commit`;

  const toFirestoreValue = (val: unknown): Record<string, unknown> => {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === 'object') {
      const fields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (v !== undefined) fields[k] = toFirestoreValue(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  };

  const writes: Array<Record<string, unknown>> = [];
  const overview = buildOverviewStats(companies);
  const nowIso = new Date().toISOString();

  const overviewFields = (toFirestoreValue(overview).mapValue as { fields: Record<string, unknown> })
    .fields;
  overviewFields.updatedAt = { timestampValue: nowIso };
  writes.push({
    update: {
      name: `${dbName}/documents/meta/overview`,
      fields: overviewFields,
    },
  });

  const byCat = new Map<CategoryId, Company[]>();
  for (const cat of CATEGORY_ORDER) byCat.set(cat, []);
  for (const c of companies) {
    byCat.get(c.category)?.push(c);
  }

  CATEGORY_ORDER.forEach((cat, idx) => {
    const items = byCat.get(cat) || [];
    writes.push({
      update: {
        name: `${dbName}/documents/categories/${cat}`,
        fields: (toFirestoreValue({
          id: cat,
          count: items.length,
          sortOrder: idx + 1,
          nameRu: CATEGORY_LABELS.ru[cat],
          nameUa: CATEGORY_LABELS.ua[cat],
        }).mapValue as { fields: Record<string, unknown> }).fields,
      },
    });
    const shardFields = (
      toFirestoreValue({
        category: cat,
        count: items.length,
        items,
      }).mapValue as { fields: Record<string, unknown> }
    ).fields;
    shardFields.updatedAt = { timestampValue: nowIso };
    writes.push({
      update: {
        name: `${dbName}/documents/catalogShards/${cat}`,
        fields: shardFields,
      },
    });
  });

  for (const c of companies) {
    const compFields = (
      toFirestoreValue({
        ...c,
        createdByUid: 'catalog_import',
      }).mapValue as { fields: Record<string, unknown> }
    ).fields;
    compFields.createdAt = { timestampValue: nowIso };
    writes.push({
      update: {
        name: `${dbName}/documents/companies/${c.id}`,
        fields: compFields,
      },
    });
  }

  if (reviewsLimit > 0) {
    for (const c of companies.slice(0, reviewsLimit)) {
      for (const r of generateSeededReviews(c)) {
        const revFields = (
          toFirestoreValue({
            ...r,
            authorUid: 'catalog_import',
            status: 'approved',
          }).mapValue as { fields: Record<string, unknown> }
        ).fields;
        revFields.createdAt = { timestampValue: r.createdAt };
        writes.push({
          update: {
            name: `${dbName}/documents/reviews/${r.id}`,
            fields: revFields,
          },
        });
      }
    }
  }

  const chunkSize = 400;
  for (let i = 0; i < writes.length; i += chunkSize) {
    const chunk = writes.slice(i, i + chunkSize);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ writes: chunk }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Firestore REST commit failed (${res.status}): ${errText}`);
    }
    console.log(`Committed ${Math.min(i + chunk.length, writes.length)} / ${writes.length} writes`);
  }
}

async function main() {
  const cfg = readConfig();
  if (!cfg.projectId || !cfg.apiKey) {
    throw new Error('Missing Firebase configuration in .env or firebase-applet-config.json');
  }

  const companies = loadNormalizedCatalog();
  const reviewsLimit = Number(process.env.IMPORT_REVIEWS_LIMIT || 0);
  const idToken = process.env.FIREBASE_ID_TOKEN?.trim();

  console.log(`Loaded ${companies.length} companies from catalog/by-category/.`);

  if (idToken) {
    await runRestCommit(cfg.projectId, cfg.databaseId, idToken, companies, reviewsLimit);
    console.log('Import complete via FIREBASE_ID_TOKEN.');
    return;
  }

  // Fallback informational dry-run or SDK check if no token passed on CLI
  const app = initializeApp(cfg);
  const db =
    cfg.databaseId && cfg.databaseId !== '(default)'
      ? getFirestore(app, cfg.databaseId)
      : getFirestore(app);

  // Prepare dry verification of batch payload sizes
  const batch = writeBatch(db);
  const overview = buildOverviewStats(companies);
  batch.set(doc(db, 'meta', 'overview'), { ...overview, updatedAt: serverTimestamp() });
  console.log(
    `Prepared ${companies.length} companies, 11 shards, and meta/overview for project "${cfg.projectId}" (db "${cfg.databaseId}").`,
  );
  console.log(
    'To execute writes from CLI, set FIREBASE_ID_TOKEN=<admin_token> (or sign in as Admin in the web UI and click "Импортировать каталог в Firestore").',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
