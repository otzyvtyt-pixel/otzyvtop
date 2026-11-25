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

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface SocialLink {
  label: string;
  url: string;
}

export interface ReviewComment {
  id: string;
  reviewId?: string;
  companyId?: number;
  author: string;
  authorUid?: string;
  text: string;
  isOfficialReply?: boolean;
  status?: ModerationStatus;
  createdAt: string;
}

export interface Review {
  id: string;
  companyId: number;
  author: string;
  authorUid?: string;
  rating: number;
  pros: string;
  cons: string;
  text: string;
  confirmedPurchase: boolean;
  status?: ModerationStatus;
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
  adsActive?: boolean;
  adsCreativesCount?: number;
  adsFirstAt?: string;
  adsLastAt?: string;
  adPlatforms?: string[];
  domainRegisteredAt?: string;
  domainExpiresAt?: string;
  waybackLastAt?: string;
  tgLastPostAt?: string;
  averageRating: number;
  reviewCount: number;
  sourceBatch: string;
  createdByUid?: string;
  createdAt?: string;
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
  availableCities?: string[];
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

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
}
