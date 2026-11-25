export type Language = 'ru' | 'ua';

export type CategoryId =
  | 'shops'
  | 'finance'
  | 'delivery'
  | 'food'
  | 'beauty'
  | 'auto'
  | 'realestate'
  | 'education'
  | 'it'
  | 'travel'
  | 'scammers';

export interface SocialLink {
  label: string;
  url: string;
}

export interface ReviewComment {
  id: string;
  author: string;
  text: string;
  isOfficialReply?: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  companyId: number;
  author: string;
  rating: number;
  pros: string;
  cons: string;
  text: string;
  confirmedPurchase: boolean;
  createdAt: string;
  helpfulCount: number;
  unhelpfulCount: number;
  comments: ReviewComment[];
}

export interface Company {
  id: number;
  name: string;
  category: CategoryId;
  city: string;
  description: string;
  website: string;
  domain: string;
  phone: string;
  email: string;
  logoUrl: string;
  socials: SocialLink[];
  status: string;
  statusNote: string;
  lastCheckedAt?: string;
  websiteStatus?: 'ok' | 'protected' | 'offline' | 'parked' | 'timeout' | 'no_site';
  activeYears?: string;
  scamActive?: boolean;
  activityPeriodStart?: string;
  activityPeriodEnd?: string;
  averageRating: number;
  reviewCount: number;
  sourceBatch: string;
}

export interface CompanyDetail extends Company {
  reviews: Review[];
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  relatedCompanies: Company[];
}

export interface OverviewStats {
  totalCompanies: number;
  totalReviews: number;
  totalCities: number;
  activeCompanies: number;
  byCategory: Record<CategoryId, number>;
  topCities: Array<{ city: string; count: number }>;
  featuredCompanies: Company[];
}

export interface SearchCompaniesResponse {
  items: Company[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  availableCities: string[];
  resolvedCity?: string;
}
