import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogStore } from './server/catalog.ts';
import {
  fetchCachedFavicon,
  injectSeoIntoHtml,
  notifyIndexNow,
  renderRobotsTxt,
  renderSitemapIndex,
  renderSitemapPart,
} from './server/seo.ts';
import { buildCompanyPath } from './src/utils/seoSlug.ts';
import type { CategoryId } from './src/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function resolveOrigin(req: express.Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  const proto =
    (typeof req.headers['x-forwarded-proto'] === 'string' &&
      req.headers['x-forwarded-proto'].split(',')[0].trim()) ||
    req.protocol ||
    'http';
  const host = req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

async function startServer() {
  catalogStore.ensureLoaded();
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain; charset=utf-8').send(renderRobotsTxt(resolveOrigin(req)));
  });

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml; charset=utf-8').send(renderSitemapIndex(resolveOrigin(req)));
  });

  app.get('/sitemaps/:part', (req, res) => {
    const xml = renderSitemapPart(resolveOrigin(req), req.params.part);
    if (!xml) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.type('application/xml; charset=utf-8').send(xml);
  });

  // IndexNow verification file support when INDEXNOW_KEY is configured
  app.get('/:keyFile.txt', (req, res, next) => {
    const key = process.env.INDEXNOW_KEY?.trim();
    if (key && req.params.keyFile === key) {
      res.type('text/plain; charset=utf-8').send(key);
      return;
    }
    next();
  });

  app.get('/api/favicon', async (req, res) => {
    const domain = typeof req.query.domain === 'string' ? req.query.domain : '';
    const icon = await fetchCachedFavicon(domain);
    if (!icon) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.status(204).end();
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.type(icon.contentType).send(icon.buf);
  });

  app.get('/api/overview', (_req, res) => {
    res.json(catalogStore.getOverview());
  });

  app.get('/api/companies/suggest', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    res.json(catalogStore.suggestCompanies(q));
  });

  app.get('/api/companies', (req, res) => {
    const result = catalogStore.searchCompanies({
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      city: typeof req.query.city === 'string' ? req.query.city : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
      page: typeof req.query.page === 'string' ? Number(req.query.page) : undefined,
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
    });
    res.json(result);
  });

  app.get('/api/companies/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid company ID' });
      return;
    }
    const detail = catalogStore.getCompany(id);
    if (!detail) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.json(detail);
  });

  app.post('/api/companies', (req, res) => {
    const body = req.body as {
      name?: string;
      category?: CategoryId;
      city?: string;
      description?: string;
      website?: string;
      phone?: string;
      email?: string;
    };
    if (!body?.name?.trim() || !body?.description?.trim()) {
      res.status(400).json({ error: 'Name and description are required' });
      return;
    }
    const result = catalogStore.addCompany({
      name: body.name,
      category: body.category || 'shops',
      city: body.city || '',
      description: body.description,
      website: body.website,
      phone: body.phone,
      email: body.email,
    });
    if (result.created) {
      const origin = resolveOrigin(req);
      void notifyIndexNow(
        [
          `${origin}${buildCompanyPath(result.company.name, result.company.id, 'ru')}`,
          `${origin}${buildCompanyPath(result.company.name, result.company.id, 'ua')}`,
        ],
        origin,
      );
    }
    res.status(result.created ? 201 : 200).json(result);
  });

  app.post('/api/companies/:id/reviews', (req, res) => {
    const id = Number(req.params.id);
    const body = req.body as {
      author?: string;
      rating?: number;
      pros?: string;
      cons?: string;
      text?: string;
      confirmedPurchase?: boolean;
    };
    if (!Number.isFinite(id) || !body?.text?.trim()) {
      res.status(400).json({ error: 'Review text is required' });
      return;
    }
    const review = catalogStore.addReview(id, {
      author: body.author || 'Гость',
      rating: body.rating ?? 5,
      pros: body.pros,
      cons: body.cons,
      text: body.text,
      confirmedPurchase: body.confirmedPurchase,
    });
    if (!review) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const company = catalogStore.getCompany(id);
    if (company) {
      const origin = resolveOrigin(req);
      void notifyIndexNow(
        [`${origin}${buildCompanyPath(company.name, company.id, 'ru')}`],
        origin,
      );
    }
    res.status(201).json(review);
  });

  app.post('/api/reviews/:reviewId/vote', (req, res) => {
    const vote = (req.body as { vote?: string })?.vote === 'down' ? 'down' : 'up';
    const updated = catalogStore.voteReview(req.params.reviewId, vote);
    if (!updated) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.json(updated);
  });

  app.post('/api/reviews/:reviewId/comments', (req, res) => {
    const body = req.body as { author?: string; text?: string; isOfficialReply?: boolean };
    if (!body?.text?.trim()) {
      res.status(400).json({ error: 'Comment text is required' });
      return;
    }
    const comment = catalogStore.addReviewComment(
      req.params.reviewId,
      body.author || 'Гость',
      body.text,
      Boolean(body.isOfficialReply),
    );
    if (!comment) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.status(201).json(comment);
  });

  if (isProd) {
    const distPath = path.join(__dirname, 'dist');
    const distTemplate = fs.existsSync(path.join(distPath, 'index.html'))
      ? fs.readFileSync(path.join(distPath, 'index.html'), 'utf8')
      : '';
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      const html = injectSeoIntoHtml(distTemplate, req.originalUrl, resolveOrigin(req));
      res.status(200).type('text/html; charset=utf-8').send(html);
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const rawTemplate = fs.readFileSync(
          path.join(__dirname, 'index.html'),
          'utf8',
        );
        const transformed = await vite.transformIndexHtml(
          req.originalUrl,
          rawTemplate,
        );
        const html = injectSeoIntoHtml(
          transformed,
          req.originalUrl,
          resolveOrigin(req),
        );
        res.status(200).type('text/html; charset=utf-8').send(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const overview = catalogStore.getOverview();
    console.log(
      `OtzyvTop server listening on http://0.0.0.0:${PORT} (${overview.totalCompanies} companies loaded)`,
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start OtzyvTop server:', err);
  process.exit(1);
});
