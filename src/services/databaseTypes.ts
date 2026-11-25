import type {
  AuthUser,
  CategoryId,
  Company,
  CompanyDetail,
  ModerationStatus,
  OverviewStats,
  Review,
  ReviewComment,
  SearchCompaniesResponse,
} from '../types.ts';

export interface SearchCompaniesQuery {
  q?: string;
  category?: string;
  city?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CreateCompanyInput {
  name: string;
  category: CategoryId;
  city: string;
  website: string;
  phone: string;
  email: string;
  description: string;
}

export interface CreateReviewInput {
  companyId: number;
  author: string;
  rating: number;
  pros: string;
  cons: string;
  text: string;
  confirmedPurchase: boolean;
  senderMeta?: {
    ip: string;
    isVpn: boolean;
    countryCode: string;
    deviceId: string;
    userAgent: string;
    screen: string;
    spamSuspect: boolean;
    spamReasons: string[];
  };
}

export interface CreateCommentInput {
  reviewId: string;
  companyId: number;
  author: string;
  text: string;
  isOfficialReply: boolean;
}

export interface ModerationQueue {
  reviews: Review[];
  comments: ReviewComment[];
}

export interface ImportProgress {
  stage: string;
  current: number;
  total: number;
}

export interface DatabaseRepository {
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;
  getCurrentUser(): AuthUser | null;
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;

  getOverview(): Promise<OverviewStats>;
  searchCompanies(query: SearchCompaniesQuery): Promise<SearchCompaniesResponse>;
  suggestCompanies(q: string): Promise<Company[]>;
  getCompany(companyId: number): Promise<CompanyDetail>;

  addCompany(input: CreateCompanyInput): Promise<{ created: boolean; company: Company }>;
  addReview(input: CreateReviewInput): Promise<Review>;
  voteReview(
    reviewId: string,
    companyId: number,
    vote: 'up' | 'down',
  ): Promise<{ helpfulCount?: number; unhelpfulCount?: number; alreadyVoted?: boolean }>;
  addReviewComment(input: CreateCommentInput): Promise<ReviewComment>;

  isFirestoreSeeded(): Promise<boolean>;
  importCatalogToFirestore(
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<{ companiesImported: number; shardsImported: number }>;
  getModerationQueue(): Promise<ModerationQueue>;
  moderateReview(
    reviewId: string,
    status: ModerationStatus,
    updates?: Partial<Pick<Review, 'rating' | 'pros' | 'cons' | 'text'>>,
  ): Promise<void>;
  deleteReview(reviewId: string): Promise<void>;
  moderateComment(
    commentId: string,
    status: ModerationStatus,
    updates?: Partial<Pick<ReviewComment, 'text' | 'isOfficialReply'>>,
  ): Promise<void>;
  deleteComment(commentId: string): Promise<void>;
  updateCompany(
    companyId: number,
    updates: Partial<
      Pick<
        Company,
        'name' | 'category' | 'city' | 'description' | 'website' | 'phone' | 'email' | 'status' | 'statusNote'
      >
    >,
  ): Promise<void>;
  deleteCompany(companyId: number): Promise<void>;
}
