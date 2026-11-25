import type {
  CategoryId,
  Company,
  CompanyDetail,
  OverviewStats,
  Review,
  ReviewComment,
  SearchCompaniesResponse,
} from '../types.ts';
import { citySlug } from './seoSlug.ts';
import { localizeCity, resolveCanonicalCityQuery } from './cityLocalization.ts';

export const VALID_CATEGORIES = new Set<CategoryId>([
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

export const VALIDATION_LIMITS = {
  companyNameMin: 2,
  companyNameMax: 160,
  companyDescMin: 10,
  companyDescMax: 2500,
  companyCityMax: 80,
  companyWebsiteMax: 300,
  companyPhoneMax: 120,
  companyEmailMax: 160,
  reviewAuthorMin: 1,
  reviewAuthorMax: 80,
  reviewProsConsMax: 300,
  reviewTextMin: 10,
  reviewTextMax: 3000,
  commentTextMin: 3,
  commentTextMax: 1500,
} as const;

export function normalizeWebsite(website: unknown): string {
  if (typeof website !== 'string') return '';
  const trimmed = website.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function extractDomain(website: string): string {
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

export function resolveLogoUrl(
  logoUrl: string,
  domain: string,
  websiteStatus?: Company['websiteStatus'],
): string {
  if (websiteStatus === 'offline' || websiteStatus === 'parked') return '';
  if (logoUrl && logoUrl.startsWith('/api/favicon')) {
    try {
      const parsed = new URL(logoUrl, 'https://otzyvtop.local');
      const qDomain = parsed.searchParams.get('domain') || domain;
      return qDomain
        ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(qDomain)}&sz=64`
        : '';
    } catch {
      return domain
        ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
        : '';
    }
  }
  if (logoUrl) return logoUrl;
  return domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
    : '';
}

export function validateReviewInput(input: {
  author?: string;
  rating?: number;
  pros?: string;
  cons?: string;
  text?: string;
}): { ok: true; clean: { author: string; rating: number; pros: string; cons: string; text: string } } | { ok: false; reason: string } {
  const author = (input.author || '').trim().slice(0, VALIDATION_LIMITS.reviewAuthorMax);
  const text = (input.text || '').trim();
  const pros = (input.pros || '').trim().slice(0, VALIDATION_LIMITS.reviewProsConsMax);
  const cons = (input.cons || '').trim().slice(0, VALIDATION_LIMITS.reviewProsConsMax);
  const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));

  if (text.length < VALIDATION_LIMITS.reviewTextMin) {
    return { ok: false, reason: 'REVIEW_TOO_SHORT' };
  }
  if (text.length > VALIDATION_LIMITS.reviewTextMax) {
    return { ok: false, reason: 'REVIEW_TOO_LONG' };
  }
  return {
    ok: true,
    clean: {
      author: author.length >= VALIDATION_LIMITS.reviewAuthorMin ? author : 'Гость',
      rating,
      pros,
      cons,
      text,
    },
  };
}

export function validateCompanyInput(input: {
  name?: string;
  category?: CategoryId;
  city?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
}): {
  ok: true;
  clean: {
    name: string;
    category: CategoryId;
    city: string;
    description: string;
    website: string;
    domain: string;
    phone: string;
    email: string;
  };
} | { ok: false; reason: string } {
  const name = (input.name || '').trim();
  const description = (input.description || '').trim();
  if (name.length < VALIDATION_LIMITS.companyNameMin || name.length > VALIDATION_LIMITS.companyNameMax) {
    return { ok: false, reason: 'INVALID_COMPANY_NAME' };
  }
  if (
    description.length < VALIDATION_LIMITS.companyDescMin ||
    description.length > VALIDATION_LIMITS.companyDescMax
  ) {
    return { ok: false, reason: 'INVALID_COMPANY_DESCRIPTION' };
  }
  const website = normalizeWebsite(input.website || '').slice(0, VALIDATION_LIMITS.companyWebsiteMax);
  const domain = extractDomain(website);
  const category =
    input.category && VALID_CATEGORIES.has(input.category) ? input.category : 'shops';

  return {
    ok: true,
    clean: {
      name,
      category,
      city: (input.city || '').trim().slice(0, VALIDATION_LIMITS.companyCityMax),
      description,
      website,
      domain,
      phone: (input.phone || '').trim().slice(0, VALIDATION_LIMITS.companyPhoneMax),
      email: (input.email || '').trim().slice(0, VALIDATION_LIMITS.companyEmailMax),
    },
  };
}

export function validateCommentInput(input: {
  author?: string;
  text?: string;
}): { ok: true; clean: { author: string; text: string } } | { ok: false; reason: string } {
  const text = (input.text || '').trim();
  if (text.length < VALIDATION_LIMITS.commentTextMin || text.length > VALIDATION_LIMITS.commentTextMax) {
    return { ok: false, reason: 'INVALID_COMMENT_TEXT' };
  }
  const author = (input.author || '').trim().slice(0, VALIDATION_LIMITS.reviewAuthorMax);
  return {
    ok: true,
    clean: {
      author: author || 'Гость',
      text,
    },
  };
}

export function buildOverviewStats(companies: Company[]): OverviewStats {
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

  for (const company of companies) {
    byCategory[company.category] = (byCategory[company.category] || 0) + 1;
    if (company.status !== 'closed') activeCompanies++;
    totalReviews += company.reviewCount || 0;
    if (company.city) {
      cityCounts.set(company.city, (cityCounts.get(company.city) || 0) + 1);
    }
  }

  const topCities = Array.from(cityCounts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const availableCities = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([city]) => city);

  const featuredCompanies: Company[] = [];
  const pickedCategories = new Set<CategoryId>();
  const reviewedFirst = [...companies].sort(
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
    totalCompanies: companies.length,
    totalReviews,
    totalCities: cityCounts.size,
    activeCompanies,
    byCategory,
    topCities,
    featuredCompanies,
    availableCities,
  };
}

export function suggestCompaniesPure(companies: Company[], q: string): Company[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const exactStarts: Company[] = [];
  const contains: Company[] = [];
  for (const c of companies) {
    const nameLower = c.name.toLowerCase();
    if (nameLower.startsWith(query)) {
      exactStarts.push(c);
    } else if (
      nameLower.includes(query) ||
      (c.domain && c.domain.toLowerCase().includes(query)) ||
      (c.city && c.city.toLowerCase().includes(query))
    ) {
      contains.push(c);
    }
    if (exactStarts.length >= 8) break;
  }
  return [...exactStarts, ...contains].slice(0, 6);
}

export function searchCompaniesPure(
  companies: Company[],
  params: {
    q?: string;
    category?: string;
    city?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
  },
): SearchCompaniesResponse {
  const q = (params.q || '').trim().toLowerCase();
  const category = (params.category || '').trim().toLowerCase();
  const city = (params.city || '').trim().toLowerCase();
  const status = (params.status || '').trim().toLowerCase();
  const sort = (params.sort || 'featured').trim().toLowerCase();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(params.limit) || 24));

  const categoryFiltered =
    category && category !== 'all'
      ? companies.filter((c) => c.category === category)
      : companies;

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

export function buildCompanyDetailPure(
  company: Company,
  allCompanies: Company[],
  reviews: Review[],
  commentsByReview: Map<string, ReviewComment[]> = new Map(),
): CompanyDetail {
  const mergedReviews = reviews
    .map((r) => {
      const extraComments = commentsByReview.get(r.id) || [];
      const seen = new Set(r.comments.map((c) => c.id));
      const mergedComments = [...r.comments, ...extraComments.filter((c) => !seen.has(c.id))];
      return { ...r, comments: mergedComments };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let ratingSum = 0;
  for (const r of mergedReviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    ratingBreakdown[star]++;
    ratingSum += r.rating;
  }

  const reviewCount = mergedReviews.length;
  const averageRating =
    reviewCount > 0 ? Math.round((ratingSum / reviewCount) * 10) / 10 : company.averageRating;

  const relatedPool =
    company.category === 'scammers'
      ? allCompanies.filter((c) => c.id !== company.id && c.category === 'scammers')
      : allCompanies.filter((c) => c.id !== company.id && c.category === company.category);

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
    reviewCount,
    averageRating,
    reviews: mergedReviews,
    ratingBreakdown,
    relatedCompanies,
  };
}
