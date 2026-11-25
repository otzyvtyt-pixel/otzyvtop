import fs from 'node:fs';
import path from 'node:path';
import type { CategoryId, Company, SocialLink } from '../src/types.ts';
import { computeSeededSummary } from '../server/reviewSeeder.ts';
import {
  extractDomain,
  normalizeWebsite,
  resolveLogoUrl,
  VALID_CATEGORIES,
} from '../src/utils/catalogLogic.ts';

interface RawCompany {
  name?: unknown;
  category?: unknown;
  city?: unknown;
  description?: unknown;
  website?: unknown;
  phone?: unknown;
  email?: unknown;
  logoUrl?: unknown;
  socials?: unknown;
  status?: unknown;
  statusNote?: unknown;
  lastCheckedAt?: unknown;
  websiteStatus?: unknown;
  activeYears?: unknown;
  scamActive?: unknown;
  activityPeriodStart?: unknown;
  activityPeriodEnd?: unknown;
  adsActive?: unknown;
  adsCreativesCount?: unknown;
  adsFirstAt?: unknown;
  adsLastAt?: unknown;
  adPlatforms?: unknown;
  domainRegisteredAt?: unknown;
  domainExpiresAt?: unknown;
  waybackLastAt?: unknown;
  tgLastPostAt?: unknown;
  _source_batch?: unknown;
}

function normalizeSocials(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const result: SocialLink[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      const url = item.trim();
      const domain = extractDomain(url);
      result.push({ label: domain || 'Link', url });
    } else if (item && typeof item === 'object') {
      const obj = item as { label?: unknown; url?: unknown };
      const url = typeof obj.url === 'string' ? obj.url.trim() : '';
      if (url) {
        const label =
          typeof obj.label === 'string' && obj.label.trim()
            ? obj.label.trim()
            : extractDomain(url) || 'Link';
        result.push({ label, url });
      }
    }
    if (result.length >= 8) break;
  }
  return result;
}

function walkJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function loadNormalizedCatalog(): Company[] {
  const byCategoryDir = path.resolve(process.cwd(), 'catalog', 'by-category');
  const batchesDir = path.resolve(process.cwd(), 'batches');
  const sourceFiles = fs.existsSync(byCategoryDir)
    ? walkJsonFiles(byCategoryDir).sort()
    : walkJsonFiles(batchesDir).sort();

  const dedupMap = new Map<string, Company>();
  let nextId = 1;

  for (const filePath of sourceFiles) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;

    const fallbackSource = path.basename(filePath, '.json');

    for (const entry of parsed as RawCompany[]) {
      if (!entry || typeof entry !== 'object') continue;
      const name = (typeof entry.name === 'string' ? entry.name.trim() : '').slice(0, 160);
      if (name.length < 2) continue;

      const rawCategory =
        typeof entry.category === 'string' ? entry.category.trim().toLowerCase() : 'shops';
      const category: CategoryId = VALID_CATEGORIES.has(rawCategory as CategoryId)
        ? (rawCategory as CategoryId)
        : 'shops';

      const city = (typeof entry.city === 'string' ? entry.city.trim() : '').slice(0, 80);
      const rawDescription =
        typeof entry.description === 'string' ? entry.description.trim() : '';
      const fallbackDesc = `${name}${city ? ` (${city})` : ''} — профиль компании в каталоге OtzyvTop.`;
      const description = (
        rawDescription.length >= 10
          ? rawDescription
          : rawDescription
            ? `${rawDescription} — ${fallbackDesc}`
            : fallbackDesc
      ).slice(0, 2500);
      const website = normalizeWebsite(entry.website).slice(0, 300);
      const domain = extractDomain(website).slice(0, 160);
      const phone = (typeof entry.phone === 'string' ? entry.phone.trim() : '').slice(0, 120);
      const email = (typeof entry.email === 'string' ? entry.email.trim() : '').slice(0, 160);
      const rawStatus =
        typeof entry.status === 'string' && entry.status.trim()
          ? entry.status.trim().toLowerCase()
          : 'active';
      const status = rawStatus === 'closed' ? 'closed' : 'active';
      const statusNote = (typeof entry.statusNote === 'string' ? entry.statusNote.trim() : '').slice(
        0,
        600,
      );
      const lastCheckedAt =
        typeof entry.lastCheckedAt === 'string' ? entry.lastCheckedAt.trim() : '';
      const rawWebStatus =
        typeof entry.websiteStatus === 'string' ? entry.websiteStatus.trim() : '';
      const websiteStatus = (
        ['ok', 'protected', 'offline', 'parked', 'timeout', 'no_site'].includes(rawWebStatus)
          ? rawWebStatus
          : undefined
      ) as Company['websiteStatus'];
      const activeYears = typeof entry.activeYears === 'string' ? entry.activeYears.trim() : '';
      const scamActive = typeof entry.scamActive === 'boolean' ? entry.scamActive : undefined;
      const activityPeriodStart =
        typeof entry.activityPeriodStart === 'string' ? entry.activityPeriodStart.trim() : '';
      const activityPeriodEnd =
        typeof entry.activityPeriodEnd === 'string' ? entry.activityPeriodEnd.trim() : '';
      const adsActive = typeof entry.adsActive === 'boolean' ? entry.adsActive : undefined;
      const adsCreativesCount =
        typeof entry.adsCreativesCount === 'number' && Number.isFinite(entry.adsCreativesCount)
          ? entry.adsCreativesCount
          : undefined;
      const adsFirstAt = typeof entry.adsFirstAt === 'string' ? entry.adsFirstAt.trim() : '';
      const adsLastAt = typeof entry.adsLastAt === 'string' ? entry.adsLastAt.trim() : '';
      const adPlatforms = Array.isArray(entry.adPlatforms)
        ? entry.adPlatforms.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        : [];
      const domainRegisteredAt =
        typeof entry.domainRegisteredAt === 'string' ? entry.domainRegisteredAt.trim() : '';
      const domainExpiresAt =
        typeof entry.domainExpiresAt === 'string' ? entry.domainExpiresAt.trim() : '';
      const waybackLastAt =
        typeof entry.waybackLastAt === 'string' ? entry.waybackLastAt.trim() : '';
      const tgLastPostAt =
        typeof entry.tgLastPostAt === 'string' ? entry.tgLastPostAt.trim() : '';
      const sourceBatch = (
        typeof entry._source_batch === 'string' && entry._source_batch.trim()
          ? entry._source_batch.trim()
          : fallbackSource
      ).slice(0, 64);

      const rawLogo = typeof entry.logoUrl === 'string' ? entry.logoUrl.trim() : '';
      const isGoogleFavicon = rawLogo.startsWith('https://www.google.com/s2/favicons');
      const logoUrl = resolveLogoUrl(
        isGoogleFavicon ? '' : rawLogo,
        domain,
        websiteStatus,
      ).slice(0, 400);

      const dedupKey = `${category}|${name.toLowerCase()}|${city.toLowerCase()}`;
      if (!dedupMap.has(dedupKey)) {
        const company: Company = {
          id: nextId++,
          name,
          category,
          city,
          description,
          website,
          domain,
          phone,
          email,
          logoUrl,
          socials: normalizeSocials(entry.socials),
          status,
          statusNote,
          ...(lastCheckedAt ? { lastCheckedAt } : {}),
          ...(websiteStatus ? { websiteStatus } : {}),
          ...(activeYears ? { activeYears } : {}),
          ...(scamActive !== undefined ? { scamActive } : {}),
          ...(activityPeriodStart ? { activityPeriodStart } : {}),
          ...(activityPeriodEnd ? { activityPeriodEnd } : {}),
          ...(adsActive !== undefined ? { adsActive } : {}),
          ...(adsCreativesCount !== undefined ? { adsCreativesCount } : {}),
          ...(adsFirstAt ? { adsFirstAt } : {}),
          ...(adsLastAt ? { adsLastAt } : {}),
          ...(adPlatforms.length > 0 ? { adPlatforms } : {}),
          ...(domainRegisteredAt ? { domainRegisteredAt } : {}),
          ...(domainExpiresAt ? { domainExpiresAt } : {}),
          ...(waybackLastAt ? { waybackLastAt } : {}),
          ...(tgLastPostAt ? { tgLastPostAt } : {}),
          averageRating: 0,
          reviewCount: 0,
          sourceBatch,
        };
        const summary = computeSeededSummary(company);
        company.reviewCount = summary.reviewCount;
        company.averageRating = summary.averageRating;
        dedupMap.set(dedupKey, company);
      }
    }
  }

  return Array.from(dedupMap.values());
}

const isCli =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/buildSeedBundle.ts');

if (isCli) {
  const companies = loadNormalizedCatalog();
  const outDir = path.resolve(process.cwd(), 'public');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'catalog-seed.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), companies }), 'utf8');
  console.log(`Built ${outPath} with ${companies.length} companies.`);
}
