import fs from 'node:fs';
import path from 'node:path';
import type {
  CategoryId,
  Company,
  CompanyDetail,
  OverviewStats,
  Review,
  ReviewComment,
  SearchCompaniesResponse,
  SocialLink,
} from '../src/types.ts';
import {
  computeSeededSummary,
  generateSeededReviews,
} from './reviewSeeder.ts';
import { citySlug } from '../src/utils/seoSlug.ts';
import {
  localizeCity,
  resolveCanonicalCityQuery,
} from '../src/utils/cityLocalization.ts';

interface PersistedActivity {
  addedCompanies: Array<{
    name: string;
    category: CategoryId;
    city: string;
    description: string;
    website: string;
    phone: string;
    email: string;
  }>;
  addedReviews: Record<number, Review[]>;
  votes: Record<string, { helpfulCount: number; unhelpfulCount: number }>;
  comments: Record<string, ReviewComment[]>;
}

const VALID_CATEGORIES = new Set<CategoryId>([
  'shops',
  'finance',
  'delivery',
  'food',
  'beauty',
  'auto',
  'realestate',
  'education',
  'it',
  'travel',
  'scammers',
]);

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

function extractDomain(website: string): string {
  if (!website) return '';
  const trimmed = website.trim();
  if (!trimmed) return '';
  try {
    const normalized =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const url = new URL(normalized);
    return url.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeWebsite(website: unknown): string {
  if (typeof website !== 'string') return '';
  const trimmed = website.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
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

class CatalogStore {
  private companies: Company[] = [];
  private reviewsByCompany = new Map<number, Review[]>();
  private reviewIndex = new Map<string, Review>();
  private nextCompanyId = 1;
  private loaded = false;
  private persistencePath = path.resolve(process.cwd(), 'data', 'user-activity.json');
  private persisted: PersistedActivity = {
    addedCompanies: [],
    addedReviews: {},
    votes: {},
    comments: {},
  };

  private loadPersistence(): void {
    try {
      if (!fs.existsSync(this.persistencePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.persistencePath, 'utf8')) as Partial<PersistedActivity>;
      this.persisted = {
        addedCompanies: Array.isArray(raw.addedCompanies) ? raw.addedCompanies : [],
        addedReviews: raw.addedReviews && typeof raw.addedReviews === 'object' ? raw.addedReviews : {},
        votes: raw.votes && typeof raw.votes === 'object' ? raw.votes : {},
        comments: raw.comments && typeof raw.comments === 'object' ? raw.comments : {},
      };
    } catch {
      // ignore corrupted persistence
    }
  }

  private savePersistence(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.persisted, null, 2), 'utf8');
    } catch {
      // ignore write failure in read-only env
    }
  }

  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.loadPersistence();

    const byCategoryDir = path.resolve(process.cwd(), 'catalog', 'by-category');
    const batchesDir = path.resolve(process.cwd(), 'batches');

    const sourceFiles = fs.existsSync(byCategoryDir)
      ? walkJsonFiles(byCategoryDir).sort()
      : walkJsonFiles(batchesDir).sort();

    const dedupMap = new Map<string, Company>();

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
        const name = typeof entry.name === 'string' ? entry.name.trim() : '';
        if (!name) continue;

        const rawCategory =
          typeof entry.category === 'string'
            ? entry.category.trim().toLowerCase()
            : 'shops';
        const category: CategoryId = VALID_CATEGORIES.has(rawCategory as CategoryId)
          ? (rawCategory as CategoryId)
          : 'shops';

        const city = typeof entry.city === 'string' ? entry.city.trim() : '';
        const description =
          typeof entry.description === 'string' ? entry.description.trim() : '';
        const website = normalizeWebsite(entry.website);
        const domain = extractDomain(website);
        const phone = typeof entry.phone === 'string' ? entry.phone.trim() : '';
        const email = typeof entry.email === 'string' ? entry.email.trim() : '';
        const status =
          typeof entry.status === 'string' && entry.status.trim()
            ? entry.status.trim().toLowerCase()
            : 'active';
        const statusNote =
          typeof entry.statusNote === 'string' ? entry.statusNote.trim() : '';
        const lastCheckedAt =
          typeof entry.lastCheckedAt === 'string' ? entry.lastCheckedAt.trim() : '';
        const rawWebStatus =
          typeof entry.websiteStatus === 'string' ? entry.websiteStatus.trim() : '';
        const websiteStatus = (
          ['ok', 'protected', 'offline', 'parked', 'timeout', 'no_site'].includes(rawWebStatus)
            ? rawWebStatus
            : undefined
        ) as Company['websiteStatus'];
        const activeYears =
          typeof entry.activeYears === 'string' ? entry.activeYears.trim() : '';
        const scamActive =
          typeof entry.scamActive === 'boolean' ? entry.scamActive : undefined;
        const activityPeriodStart =
          typeof entry.activityPeriodStart === 'string'
            ? entry.activityPeriodStart.trim()
            : '';
        const activityPeriodEnd =
          typeof entry.activityPeriodEnd === 'string'
            ? entry.activityPeriodEnd.trim()
            : '';
        const adsActive =
          typeof entry.adsActive === 'boolean' ? entry.adsActive : undefined;
        const adsCreativesCount =
          typeof entry.adsCreativesCount === 'number' && Number.isFinite(entry.adsCreativesCount)
            ? entry.adsCreativesCount
            : undefined;
        const adsFirstAt =
          typeof entry.adsFirstAt === 'string' ? entry.adsFirstAt.trim() : '';
        const adsLastAt =
          typeof entry.adsLastAt === 'string' ? entry.adsLastAt.trim() : '';
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
        const sourceBatch =
          typeof entry._source_batch === 'string' && entry._source_batch.trim()
            ? entry._source_batch.trim()
            : fallbackSource;

        const rawLogo = typeof entry.logoUrl === 'string' ? entry.logoUrl.trim() : '';
        const isGoogleFavicon = rawLogo.startsWith('https://www.google.com/s2/favicons');
        const isDeadSite = websiteStatus === 'offline' || websiteStatus === 'parked';
        const logoUrl = isDeadSite
          ? ''
          : rawLogo && !isGoogleFavicon
            ? rawLogo
            : domain
              ? `/api/favicon?domain=${encodeURIComponent(domain)}`
              : '';

        const dedupKey = `${category}|${name.toLowerCase()}|${city.toLowerCase()}`;

        if (!dedupMap.has(dedupKey)) {
          const company: Company = {
            id: this.nextCompanyId++,
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

    this.companies = Array.from(dedupMap.values());

    // Restore persisted user-added companies
    for (const added of this.persisted.addedCompanies) {
      const website = normalizeWebsite(added.website || '');
      const domain = extractDomain(website);
      const comp: Company = {
        id: this.nextCompanyId++,
        name: added.name,
        category: VALID_CATEGORIES.has(added.category) ? added.category : 'shops',
        city: added.city || '',
        description: added.description,
        website,
        domain,
        phone: added.phone || '',
        email: added.email || '',
        logoUrl: domain ? `/api/favicon?domain=${encodeURIComponent(domain)}` : '',
        socials: [],
        status: 'active',
        statusNote: 'Добавлено пользователем.',
        averageRating: 0,
        reviewCount: 0,
        sourceBatch: 'user',
      };
      this.companies.unshift(comp);
    }

    // Apply persisted added reviews to company summaries
    for (const [idStr, extraRevs] of Object.entries(this.persisted.addedReviews)) {
      const cid = Number(idStr);
      const comp = this.companies.find((c) => c.id === cid);
      if (comp && Array.isArray(extraRevs) && extraRevs.length > 0) {
        const list = this.ensureCompanyReviews(comp);
        const sum = list.reduce((acc, r) => acc + r.rating, 0);
        comp.reviewCount = list.length;
        comp.averageRating = Math.round((sum / list.length) * 10) / 10;
      }
    }
  }

  private ensureCompanyReviews(company: Company): Review[] {
    let list = this.reviewsByCompany.get(company.id);
    if (!list) {
      const seeded = company.sourceBatch === 'user' ? [] : generateSeededReviews(company);
      const userAdded = this.persisted.addedReviews[company.id] || [];
      list = [...userAdded, ...seeded];
      for (const rev of list) {
        const persistedVotes = this.persisted.votes[rev.id];
        if (persistedVotes) {
          rev.helpfulCount = persistedVotes.helpfulCount;
          rev.unhelpfulCount = persistedVotes.unhelpfulCount;
        }
        const extraComments = this.persisted.comments[rev.id];
        if (extraComments && extraComments.length > 0) {
          rev.comments = [...rev.comments, ...extraComments];
        }
        this.reviewIndex.set(rev.id, rev);
      }
      this.reviewsByCompany.set(company.id, list);
    }
    return list;
  }

  private ensureReviewsByReviewId(reviewId: string): void {
    if (this.reviewIndex.has(reviewId)) return;
    const match = reviewId.match(/^seed_(\d+)_/);
    if (!match) return;
    const companyId = Number(match[1]);
    const company = this.companies.find((c) => c.id === companyId);
    if (company) {
      this.ensureCompanyReviews(company);
    }
  }

  getOverview(): OverviewStats {
    this.ensureLoaded();
    const byCategory: Record<CategoryId, number> = {
      shops: 0,
      finance: 0,
      delivery: 0,
      food: 0,
      beauty: 0,
      auto: 0,
      realestate: 0,
      education: 0,
      it: 0,
      travel: 0,
      scammers: 0,
    };

    const cityCounts = new Map<string, number>();
    let activeCompanies = 0;
    let totalReviews = 0;

    for (const company of this.companies) {
      byCategory[company.category] = (byCategory[company.category] || 0) + 1;
      if (company.status !== 'closed') activeCompanies++;
      totalReviews += company.reviewCount;
      if (company.city) {
        cityCounts.set(company.city, (cityCounts.get(company.city) || 0) + 1);
      }
    }

    const topCities = Array.from(cityCounts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // Pick a diverse set of featured companies across categories (prioritizing reviewed, then rich profiles)
    const featuredCompanies: Company[] = [];
    const pickedCategories = new Set<CategoryId>();
    const reviewedFirst = [...this.companies].sort(
      (a, b) =>
        b.reviewCount - a.reviewCount ||
        b.averageRating - a.averageRating ||
        (b.website && b.phone ? 1 : 0) - (a.website && a.phone ? 1 : 0) ||
        a.id - b.id,
    );

    for (const c of reviewedFirst) {
      if (featuredCompanies.length >= 6) break;
      if (
        c.category !== 'scammers' &&
        !pickedCategories.has(c.category) &&
        c.website &&
        c.city
      ) {
        pickedCategories.add(c.category);
        featuredCompanies.push(c);
      }
    }

    return {
      totalCompanies: this.companies.length,
      totalReviews,
      totalCities: cityCounts.size,
      activeCompanies,
      byCategory,
      topCities,
      featuredCompanies,
    };
  }

  suggestCompanies(q: string): Company[] {
    this.ensureLoaded();
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const exactStarts: Company[] = [];
    const contains: Company[] = [];
    for (const c of this.companies) {
      const nameLower = c.name.toLowerCase();
      if (nameLower.startsWith(query)) {
        exactStarts.push(c);
      } else if (
        nameLower.includes(query) ||
        c.domain.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query)
      ) {
        contains.push(c);
      }
      if (exactStarts.length >= 8) break;
    }
    return [...exactStarts, ...contains].slice(0, 6);
  }

  searchCompanies(params: {
    q?: string;
    category?: string;
    city?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): SearchCompaniesResponse {
    this.ensureLoaded();

    const q = (params.q || '').trim().toLowerCase();
    const category = (params.category || '').trim().toLowerCase();
    const city = (params.city || '').trim().toLowerCase();
    const status = (params.status || '').trim().toLowerCase();
    const sort = (params.sort || 'featured').trim().toLowerCase();
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(params.limit) || 24));

    const categoryFiltered =
      category && category !== 'all'
        ? this.companies.filter((c) => c.category === category)
        : this.companies;

    const cityCountMap = new Map<string, number>();
    for (const c of categoryFiltered) {
      if (c.city) cityCountMap.set(c.city, (cityCountMap.get(c.city) || 0) + 1);
    }
    const availableCities = Array.from(cityCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([name]) => name);

    let filtered = categoryFiltered;

    if (status === 'active' || status === 'closed') {
      filtered = filtered.filter((c) => c.status === status);
    }

    let resolvedCity: string | undefined;
    if (city) {
      const canonicalFromAlias = resolveCanonicalCityQuery(city).toLowerCase();
      const targetSlug = citySlug(canonicalFromAlias || city);
      filtered = filtered.filter((c) => {
        if (!c.city) return false;
        const cLower = c.city.toLowerCase();
        const uaLower = localizeCity(c.city, 'ua').toLowerCase();
        if (
          cLower === city ||
          cLower === canonicalFromAlias ||
          uaLower === city ||
          (targetSlug && citySlug(c.city) === targetSlug)
        ) {
          if (!resolvedCity) resolvedCity = c.city;
          return true;
        }
        return false;
      });
    }

    if (q) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          localizeCity(c.city, 'ua').toLowerCase().includes(q) ||
          c.domain.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      );
    }

    const sorted = [...filtered];
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else if (sort === 'rating') {
      sorted.sort(
        (a, b) =>
          b.averageRating - a.averageRating ||
          b.reviewCount - a.reviewCount ||
          a.id - b.id,
      );
    } else if (sort === 'reviews') {
      sorted.sort(
        (a, b) =>
          b.reviewCount - a.reviewCount ||
          b.averageRating - a.averageRating ||
          a.id - b.id,
      );
    } else if (sort === 'newest') {
      sorted.sort((a, b) => b.id - a.id);
    } else {
      sorted.sort(
        (a, b) =>
          b.reviewCount - a.reviewCount ||
          b.averageRating - a.averageRating ||
          a.id - b.id,
      );
    }

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const items = sorted.slice(start, start + limit);

    return {
      items,
      total,
      page: safePage,
      limit,
      totalPages,
      availableCities,
      resolvedCity,
    };
  }

  getCompany(id: number): CompanyDetail | null {
    this.ensureLoaded();
    const company = this.companies.find((c) => c.id === id);
    if (!company) return null;

    const reviews = this.ensureCompanyReviews(company);
    const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const r of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      ratingBreakdown[star]++;
    }

    // Internal SEO cross-linking: same category (prefer same city), or top active alternatives for scammers
    const relatedPool =
      company.category === 'scammers'
        ? this.companies.filter((c) => c.id !== company.id && c.category === 'scammers')
        : this.companies.filter(
            (c) => c.id !== company.id && c.category === company.category,
          );

    const relatedCompanies = relatedPool
      .sort((a, b) => {
        const aSameCity = company.city && a.city === company.city ? 1 : 0;
        const bSameCity = company.city && b.city === company.city ? 1 : 0;
        return (
          bSameCity - aSameCity ||
          b.averageRating - a.averageRating ||
          b.reviewCount - a.reviewCount ||
          a.id - b.id
        );
      })
      .slice(0, 6);

    return {
      ...company,
      reviews: [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ratingBreakdown,
      relatedCompanies,
    };
  }

  getAllCompanies(): Company[] {
    this.ensureLoaded();
    return this.companies;
  }

  getCategoryCityPairs(minCount = 5): Array<{ category: CategoryId; city: string; citySlug: string; count: number }> {
    this.ensureLoaded();
    const map = new Map<string, { category: CategoryId; city: string; count: number }>();
    for (const c of this.companies) {
      if (!c.city) continue;
      const key = `${c.category}|${c.city}`;
      const cur = map.get(key);
      if (cur) cur.count++;
      else map.set(key, { category: c.category, city: c.city, count: 1 });
    }
    return Array.from(map.values())
      .filter((x) => x.count >= minCount && citySlug(x.city).length > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 250)
      .map((x) => ({ ...x, citySlug: citySlug(x.city) }));
  }

  addCompany(input: {
    name: string;
    category: CategoryId;
    city: string;
    description: string;
    website?: string;
    phone?: string;
    email?: string;
  }): { created: boolean; company: Company } {
    this.ensureLoaded();
    const name = input.name.trim();
    const city = input.city.trim();
    const website = normalizeWebsite(input.website || '');
    const domain = extractDomain(website);

    const duplicate = this.companies.find((c) => {
      if (domain && c.domain && c.domain === domain) return true;
      return (
        c.name.toLowerCase() === name.toLowerCase() &&
        c.city.toLowerCase() === city.toLowerCase()
      );
    });

    if (duplicate) {
      return { created: false, company: duplicate };
    }

    const company: Company = {
      id: this.nextCompanyId++,
      name,
      category: VALID_CATEGORIES.has(input.category) ? input.category : 'shops',
      city,
      description: input.description.trim(),
      website,
      domain,
      phone: (input.phone || '').trim(),
      email: (input.email || '').trim(),
      logoUrl: domain ? `/api/favicon?domain=${encodeURIComponent(domain)}` : '',
      socials: [],
      status: 'active',
      statusNote: 'Добавлено пользователем.',
      averageRating: 0,
      reviewCount: 0,
      sourceBatch: 'user',
    };

    this.companies.unshift(company);
    this.persisted.addedCompanies.push({
      name: company.name,
      category: company.category,
      city: company.city,
      description: company.description,
      website: company.website,
      phone: company.phone,
      email: company.email,
    });
    this.savePersistence();
    return { created: true, company };
  }

  addReview(
    companyId: number,
    input: {
      author: string;
      rating: number;
      pros?: string;
      cons?: string;
      text: string;
      confirmedPurchase?: boolean;
    },
  ): Review | null {
    this.ensureLoaded();
    const company = this.companies.find((c) => c.id === companyId);
    if (!company) return null;

    const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
    const review: Review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      companyId,
      author: input.author.trim() || 'Гость',
      rating,
      pros: (input.pros || '').trim(),
      cons: (input.cons || '').trim(),
      text: input.text.trim(),
      confirmedPurchase: Boolean(input.confirmedPurchase),
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
      unhelpfulCount: 0,
      comments: [],
    };

    const list = this.ensureCompanyReviews(company);
    list.unshift(review);
    this.reviewIndex.set(review.id, review);

    if (!this.persisted.addedReviews[companyId]) {
      this.persisted.addedReviews[companyId] = [];
    }
    this.persisted.addedReviews[companyId].unshift(review);
    this.savePersistence();

    const sum = list.reduce((acc, item) => acc + item.rating, 0);
    company.reviewCount = list.length;
    company.averageRating = Math.round((sum / list.length) * 10) / 10;

    return review;
  }

  voteReview(reviewId: string, vote: 'up' | 'down'): Review | null {
    this.ensureLoaded();
    this.ensureReviewsByReviewId(reviewId);
    const review = this.reviewIndex.get(reviewId);
    if (!review) return null;
    if (vote === 'up') review.helpfulCount += 1;
    else review.unhelpfulCount += 1;
    this.persisted.votes[reviewId] = {
      helpfulCount: review.helpfulCount,
      unhelpfulCount: review.unhelpfulCount,
    };
    this.savePersistence();
    return review;
  }

  addReviewComment(
    reviewId: string,
    author: string,
    text: string,
    isOfficialReply = false,
  ): ReviewComment | null {
    this.ensureLoaded();
    this.ensureReviewsByReviewId(reviewId);
    const review = this.reviewIndex.get(reviewId);
    if (!review) return null;
    const comment: ReviewComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author: author.trim() || (isOfficialReply ? 'Представитель компании' : 'Гость'),
      text: text.trim(),
      isOfficialReply,
      createdAt: new Date().toISOString(),
    };
    review.comments.push(comment);
    if (!this.persisted.comments[reviewId]) {
      this.persisted.comments[reviewId] = [];
    }
    this.persisted.comments[reviewId].push(comment);
    this.savePersistence();
    return comment;
  }
}

export const catalogStore = new CatalogStore();
