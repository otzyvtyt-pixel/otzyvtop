import fs from 'node:fs';
import path from 'node:path';
import { catalogStore } from '../server/catalog.ts';
import {
  injectSeoIntoHtml,
  renderRobotsTxt,
  renderSitemapIndex,
  renderSitemapPart,
} from '../server/seo.ts';
import {
  buildCompanyPath,
  buildRouteUrl,
  RATING_GUIDES,
  VALID_CATEGORY_IDS,
} from '../src/utils/seoSlug.ts';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ORIGIN = (process.env.APP_URL || 'https://otzyvtop.com').replace(/\/+$/, '');

function writeDistFile(relPath: string, content: string): void {
  const fullPath = path.join(DIST_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function writeRouteHtml(templateHtml: string, routePath: string): void {
  const html = injectSeoIntoHtml(templateHtml, routePath, ORIGIN);
  const clean = routePath.replace(/^\/+|\/+$/g, '');
  const relFile = clean ? path.join(clean, 'index.html') : 'index.html';
  writeDistFile(relFile, html);
}

function main(): void {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('dist/index.html not found. Run `npm run build` first.');
  }

  const templateHtml = fs.readFileSync(indexPath, 'utf8');

  // 1. robots.txt & sitemap.xml + sitemaps/*
  writeDistFile('robots.txt', renderRobotsTxt(ORIGIN));
  const sitemapIndexXml = renderSitemapIndex(ORIGIN);
  writeDistFile('sitemap.xml', sitemapIndexXml);

  const partMatches = Array.from(sitemapIndexXml.matchAll(/\/sitemaps\/([^<]+)</g)).map((m) => m[1]);
  for (const partName of partMatches) {
    const partXml = renderSitemapPart(ORIGIN, partName);
    if (partXml) {
      writeDistFile(path.join('sitemaps', partName), partXml);
    }
  }

  // 2. Static & category & rating routes (RU + UA)
  const routes = new Set<string>(['/', '/ua', '/ratings', '/ua/ratings', '/scammers', '/ua/scammers']);
  for (const cat of VALID_CATEGORY_IDS) {
    routes.add(buildRouteUrl({ kind: 'category', category: cat }, 'ru'));
    routes.add(buildRouteUrl({ kind: 'category', category: cat }, 'ua'));
  }
  for (const guide of RATING_GUIDES) {
    routes.add(buildRouteUrl({ kind: 'rating', guide: guide.slug }, 'ru'));
    routes.add(buildRouteUrl({ kind: 'rating', guide: guide.slug }, 'ua'));
  }

  // 3. All company pages (RU + UA)
  const companies = catalogStore.getAllCompanies();
  for (const company of companies) {
    try {
      if (!company?.name || typeof company.name !== 'string') continue;
      routes.add(buildCompanyPath(company, 'ru'));
      routes.add(buildCompanyPath(company, 'ua'));
    } catch {
      // skip malformed company entry
    }
  }

  let count = 0;
  for (const routePath of routes) {
    writeRouteHtml(templateHtml, routePath);
    count++;
  }

  console.log(
    `[prerenderSeo] Done for ${ORIGIN}: ${count} HTML pages, ${partMatches.length} sitemap parts, robots.txt`,
  );
}

main();
