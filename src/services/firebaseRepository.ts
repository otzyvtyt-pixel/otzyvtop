import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { generateSeededReviews } from '../../server/reviewSeeder.ts';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../i18n.ts';
import {
  ADMIN_EMAIL,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase.ts';
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
import {
  buildCompanyDetailPure,
  buildOverviewStats,
  resolveLogoUrl,
  searchCompaniesPure,
  suggestCompaniesPure,
  validateCommentInput,
  validateCompanyInput,
  validateReviewInput,
} from '../utils/catalogLogic.ts';
import type {
  CreateCommentInput,
  CreateCompanyInput,
  CreateReviewInput,
  DatabaseRepository,
  ImportProgress,
  ModerationQueue,
  SearchCompaniesQuery,
} from './databaseTypes.ts';

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const email = user.email || null;
  const isAdmin = Boolean(user.emailVerified && email && email.toLowerCase() === ADMIN_EMAIL);
  return {
    uid: user.uid,
    email,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    emailVerified: user.emailVerified,
    isAdmin,
  };
}

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string' && value) return value;
  return new Date().toISOString();
}

function normalizeCompanyRecord(raw: Company): Company {
  return {
    ...raw,
    logoUrl: resolveLogoUrl(raw.logoUrl || '', raw.domain || '', raw.websiteStatus),
  };
}

function toFirestoreCompanyPayload(
  company: Company,
  createdByUid: string,
  createdAtField: unknown,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: company.id,
    name: company.name,
    category: company.category,
    city: company.city || '',
    description: company.description,
    website: company.website || '',
    domain: company.domain || '',
    phone: company.phone || '',
    email: company.email || '',
    logoUrl: company.logoUrl || '',
    socials: Array.isArray(company.socials) ? company.socials.slice(0, 8) : [],
    status: company.status === 'closed' ? 'closed' : 'active',
    statusNote: company.statusNote || '',
    averageRating: Number(company.averageRating) || 0,
    reviewCount: Math.max(0, Math.round(Number(company.reviewCount) || 0)),
    sourceBatch: company.sourceBatch || 'user',
    createdByUid,
    createdAt: createdAtField,
  };

  if (company.lastCheckedAt) payload.lastCheckedAt = company.lastCheckedAt;
  if (company.websiteStatus) payload.websiteStatus = company.websiteStatus;
  if (company.activeYears) payload.activeYears = company.activeYears;
  if (typeof company.scamActive === 'boolean') payload.scamActive = company.scamActive;
  if (company.activityPeriodStart) payload.activityPeriodStart = company.activityPeriodStart;
  if (company.activityPeriodEnd) payload.activityPeriodEnd = company.activityPeriodEnd;
  if (typeof company.adsActive === 'boolean') payload.adsActive = company.adsActive;
  if (typeof company.adsCreativesCount === 'number') {
    payload.adsCreativesCount = company.adsCreativesCount;
  }
  if (company.adsFirstAt) payload.adsFirstAt = company.adsFirstAt;
  if (company.adsLastAt) payload.adsLastAt = company.adsLastAt;
  if (Array.isArray(company.adPlatforms) && company.adPlatforms.length > 0) {
    payload.adPlatforms = company.adPlatforms;
  }
  if (company.domainRegisteredAt) payload.domainRegisteredAt = company.domainRegisteredAt;
  if (company.domainExpiresAt) payload.domainExpiresAt = company.domainExpiresAt;
  if (company.waybackLastAt) payload.waybackLastAt = company.waybackLastAt;
  if (company.tgLastPostAt) payload.tgLastPostAt = company.tgLastPostAt;

  return payload;
}

function mapReviewDoc(id: string, data: Record<string, unknown>): Review {
  return {
    id,
    companyId: Number(data.companyId) || 0,
    author: typeof data.author === 'string' ? data.author : 'Гость',
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : undefined,
    rating: Number(data.rating) || 5,
    pros: typeof data.pros === 'string' ? data.pros : '',
    cons: typeof data.cons === 'string' ? data.cons : '',
    text: typeof data.text === 'string' ? data.text : '',
    confirmedPurchase: Boolean(data.confirmedPurchase),
    status: (data.status as ModerationStatus) || 'approved',
    createdAt: toIsoDate(data.createdAt),
    helpfulCount: Number(data.helpfulCount) || 0,
    unhelpfulCount: Number(data.unhelpfulCount) || 0,
    comments: Array.isArray(data.comments) ? (data.comments as ReviewComment[]) : [],
  };
}

function mapCommentDoc(id: string, data: Record<string, unknown>): ReviewComment {
  return {
    id,
    reviewId: typeof data.reviewId === 'string' ? data.reviewId : undefined,
    companyId: typeof data.companyId === 'number' ? data.companyId : Number(data.companyId) || undefined,
    author: typeof data.author === 'string' ? data.author : 'Гость',
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : undefined,
    text: typeof data.text === 'string' ? data.text : '',
    isOfficialReply: Boolean(data.isOfficialReply),
    status: (data.status as ModerationStatus) || 'approved',
    createdAt: toIsoDate(data.createdAt),
  };
}

export class FirebaseDatabaseRepository implements DatabaseRepository {
  private overviewCache: OverviewStats | null = null;
  private shardCache = new Map<CategoryId, Company[]>();
  private allCatalogCache: Company[] | null = null;
  private seedBundlePromise: Promise<Company[]> | null = null;
  private userCompaniesCache: Company[] | null = null;
  private localSeedVotes = new Map<string, { up: number; down: number }>();

  onAuthChange(cb: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (fbUser) => {
      cb(toAuthUser(fbUser));
    });
  }

  getCurrentUser(): AuthUser | null {
    return toAuthUser(auth.currentUser);
  }

  async signInWithGoogle(): Promise<AuthUser> {
    const cred = await signInWithPopup(auth, googleProvider);
    const mapped = toAuthUser(cred.user);
    if (!mapped) throw new Error('AUTH_FAILED');
    return mapped;
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  private async fetchSeedBundle(): Promise<Company[]> {
    if (!this.seedBundlePromise) {
      this.seedBundlePromise = fetch('/catalog-seed.json')
        .then((res) => {
          if (!res.ok) throw new Error('SEED_BUNDLE_UNAVAILABLE');
          return res.json() as Promise<{ companies?: Company[] }>;
        })
        .then((data) => (Array.isArray(data.companies) ? data.companies.map(normalizeCompanyRecord) : []));
    }
    return this.seedBundlePromise;
  }

  private async loadUserSubmittedCompanies(forceRefresh = false): Promise<Company[]> {
    if (this.userCompaniesCache && !forceRefresh) return this.userCompaniesCache;
    try {
      const q = query(collection(db, 'companies'), where('sourceBatch', '==', 'user'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => normalizeCompanyRecord(d.data() as Company));
      this.userCompaniesCache = list;
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'companies');
    }
  }

  private mergeCompanies(base: Company[], extra: Company[]): Company[] {
    if (extra.length === 0) return base;
    const map = new Map<number, Company>();
    for (const c of base) map.set(c.id, c);
    for (const c of extra) map.set(c.id, c);
    return Array.from(map.values());
  }

  private async loadCategoryCompanies(category: CategoryId): Promise<Company[]> {
    const userAdded = await this.loadUserSubmittedCompanies();
    const userInCat = userAdded.filter((c) => c.category === category);

    if (this.shardCache.has(category)) {
      return this.mergeCompanies(this.shardCache.get(category)!, userInCat);
    }

    try {
      const snap = await getDoc(doc(db, 'catalogShards', category));
      if (snap.exists()) {
        const data = snap.data() as { items?: Company[] };
        const items = Array.isArray(data.items) ? data.items.map(normalizeCompanyRecord) : [];
        this.shardCache.set(category, items);
        return this.mergeCompanies(items, userInCat);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `catalogShards/${category}`);
    }

    // Fallback before one-time import has been executed
    const seed = await this.fetchSeedBundle();
    const byCat = seed.filter((c) => c.category === category);
    this.shardCache.set(category, byCat);
    return this.mergeCompanies(byCat, userInCat);
  }

  private async loadAllCompanies(forceRefresh = false): Promise<Company[]> {
    const userAdded = await this.loadUserSubmittedCompanies(forceRefresh);
    if (this.allCatalogCache && !forceRefresh) {
      return this.mergeCompanies(this.allCatalogCache, userAdded);
    }

    try {
      const snap = await getDocs(collection(db, 'catalogShards'));
      if (!snap.empty) {
        const combined: Company[] = [];
        for (const shardDoc of snap.docs) {
          const data = shardDoc.data() as { category?: CategoryId; items?: Company[] };
          const items = Array.isArray(data.items) ? data.items.map(normalizeCompanyRecord) : [];
          if (data.category) this.shardCache.set(data.category, items);
          combined.push(...items);
        }
        this.allCatalogCache = combined;
        return this.mergeCompanies(combined, userAdded);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'catalogShards');
    }

    // Fallback before one-time import has been executed
    const seed = await this.fetchSeedBundle();
    this.allCatalogCache = seed;
    return this.mergeCompanies(seed, userAdded);
  }

  async getOverview(): Promise<OverviewStats> {
    if (this.overviewCache) return this.overviewCache;

    const userAdded = await this.loadUserSubmittedCompanies();
    try {
      const snap = await getDoc(doc(db, 'meta', 'overview'));
      if (snap.exists()) {
        const raw = snap.data() as OverviewStats;
        const featuredCompanies = Array.isArray(raw.featuredCompanies)
          ? raw.featuredCompanies.map(normalizeCompanyRecord)
          : [];
        const stats: OverviewStats = {
          totalCompanies: Number(raw.totalCompanies || 0) + userAdded.length,
          totalReviews: Number(raw.totalReviews || 0),
          totalCities: Number(raw.totalCities || 0),
          activeCompanies: Number(raw.activeCompanies || 0) + userAdded.filter((c) => c.status !== 'closed').length,
          byCategory: { ...raw.byCategory },
          topCities: raw.topCities || [],
          featuredCompanies,
          availableCities: raw.availableCities || [],
        };
        for (const c of userAdded) {
          stats.byCategory[c.category] = (stats.byCategory[c.category] || 0) + 1;
        }
        this.overviewCache = stats;
        return stats;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'meta/overview');
    }

    // Fallback before one-time import
    const seed = await this.fetchSeedBundle();
    const merged = this.mergeCompanies(seed, userAdded);
    const computed = buildOverviewStats(merged);
    this.overviewCache = computed;
    return computed;
  }

  async searchCompanies(queryParams: SearchCompaniesQuery): Promise<SearchCompaniesResponse> {
    const cat = (queryParams.category || '').trim().toLowerCase();
    const pool =
      cat && cat !== 'all' && CATEGORY_ORDER.includes(cat as CategoryId)
        ? await this.loadCategoryCompanies(cat as CategoryId)
        : await this.loadAllCompanies();
    return searchCompaniesPure(pool, queryParams);
  }

  async suggestCompanies(q: string): Promise<Company[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];
    const pool = await this.loadAllCompanies();
    return suggestCompaniesPure(pool, trimmed);
  }

  private async fetchReviewsAndCommentsForCompany(companyId: number): Promise<{
    firestoreReviews: Review[];
    commentsByReview: Map<string, ReviewComment[]>;
    userVotes: Map<string, 'up' | 'down'>;
  }> {
    const user = this.getCurrentUser();
    const reviewMap = new Map<string, Review>();
    const commentMap = new Map<string, ReviewComment>();
    const userVotes = new Map<string, 'up' | 'down'>();

    if (user?.isAdmin) {
      try {
        const [revSnap, cmtSnap] = await Promise.all([
          getDocs(collection(db, 'reviews')),
          getDocs(collection(db, 'reviewComments')),
        ]);
        for (const d of revSnap.docs) {
          const mapped = mapReviewDoc(d.id, d.data() as Record<string, unknown>);
          if (mapped.companyId === companyId) reviewMap.set(d.id, mapped);
        }
        for (const d of cmtSnap.docs) {
          const mapped = mapCommentDoc(d.id, d.data() as Record<string, unknown>);
          if (mapped.companyId === companyId) commentMap.set(d.id, mapped);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    } else {
      try {
        const approvedRevQ = query(collection(db, 'reviews'), where('status', '==', 'approved'));
        const approvedCmtQ = query(collection(db, 'reviewComments'), where('status', '==', 'approved'));
        const promises: Array<Promise<void>> = [
          getDocs(approvedRevQ).then((snap) => {
            for (const d of snap.docs) {
              const mapped = mapReviewDoc(d.id, d.data() as Record<string, unknown>);
              if (mapped.companyId === companyId) reviewMap.set(d.id, mapped);
            }
          }),
          getDocs(approvedCmtQ).then((snap) => {
            for (const d of snap.docs) {
              const mapped = mapCommentDoc(d.id, d.data() as Record<string, unknown>);
              if (mapped.companyId === companyId) commentMap.set(d.id, mapped);
            }
          }),
        ];

        if (user) {
          const ownRevQ = query(collection(db, 'reviews'), where('authorUid', '==', user.uid));
          const ownCmtQ = query(collection(db, 'reviewComments'), where('authorUid', '==', user.uid));
          const ownVotesQ = query(collection(db, 'reviewVotes'), where('authorUid', '==', user.uid));
          promises.push(
            getDocs(ownRevQ).then((snap) => {
              for (const d of snap.docs) {
                const mapped = mapReviewDoc(d.id, d.data() as Record<string, unknown>);
                if (mapped.companyId === companyId && mapped.status !== 'rejected') {
                  reviewMap.set(d.id, mapped);
                }
              }
            }),
            getDocs(ownCmtQ).then((snap) => {
              for (const d of snap.docs) {
                const mapped = mapCommentDoc(d.id, d.data() as Record<string, unknown>);
                if (mapped.companyId === companyId && mapped.status !== 'rejected') {
                  commentMap.set(d.id, mapped);
                }
              }
            }),
            getDocs(ownVotesQ).then((snap) => {
              for (const d of snap.docs) {
                const data = d.data() as { reviewId?: string; companyId?: number; vote?: 'up' | 'down' };
                if (data.companyId === companyId && data.reviewId && (data.vote === 'up' || data.vote === 'down')) {
                  userVotes.set(data.reviewId, data.vote);
                }
              }
            }),
          );
        }

        await Promise.all(promises);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    }

    const commentsByReview = new Map<string, ReviewComment[]>();
    for (const cmt of commentMap.values()) {
      if (!cmt.reviewId) continue;
      const arr = commentsByReview.get(cmt.reviewId) || [];
      arr.push(cmt);
      commentsByReview.set(cmt.reviewId, arr);
    }

    return {
      firestoreReviews: Array.from(reviewMap.values()),
      commentsByReview,
      userVotes,
    };
  }

  async getCompany(companyId: number): Promise<CompanyDetail> {
    let company: Company | undefined;

    try {
      const compSnap = await getDoc(doc(db, 'companies', String(companyId)));
      if (compSnap.exists()) {
        company = normalizeCompanyRecord(compSnap.data() as Company);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `companies/${companyId}`);
    }

    const allCompanies = await this.loadAllCompanies();
    if (!company) {
      company = allCompanies.find((c) => c.id === companyId);
    }
    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    const { firestoreReviews, commentsByReview, userVotes } =
      await this.fetchReviewsAndCommentsForCompany(companyId);

    const seededReviews =
      company.sourceBatch === 'user' ? [] : generateSeededReviews(company);

    const fsReviewIds = new Set(firestoreReviews.map((r) => r.id));
    const combinedReviews = [
      ...firestoreReviews,
      ...seededReviews
        .filter((r) => !fsReviewIds.has(r.id))
        .map((r) => {
          const delta = this.localSeedVotes.get(r.id);
          const voted = userVotes.get(r.id);
          const extraUp = delta ? delta.up : voted === 'up' ? 1 : 0;
          const extraDown = delta ? delta.down : voted === 'down' ? 1 : 0;
          return {
            ...r,
            helpfulCount: r.helpfulCount + extraUp,
            unhelpfulCount: r.unhelpfulCount + extraDown,
          };
        }),
    ];

    return buildCompanyDetailPure(company, allCompanies, combinedReviews, commentsByReview);
  }

  async addCompany(input: CreateCompanyInput): Promise<{ created: boolean; company: Company }> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('AUTH_REQUIRED');

    const validation = validateCompanyInput(input);
    if (!validation.ok) {
      throw new Error(validation.reason);
    }
    const clean = validation.clean;

    const allCompanies = await this.loadAllCompanies(true);
    const duplicate = allCompanies.find(
      (c) =>
        (clean.domain && c.domain && c.domain.toLowerCase() === clean.domain.toLowerCase()) ||
        (c.name.toLowerCase() === clean.name.toLowerCase() &&
          (!clean.city || !c.city || c.city.toLowerCase() === clean.city.toLowerCase())),
    );
    if (duplicate) {
      return { created: false, company: duplicate };
    }

    const maxId = allCompanies.reduce((max, c) => (c.id > max ? c.id : max), 0);
    const nextId = maxId + 1;
    const newCompany: Company = {
      id: nextId,
      name: clean.name,
      category: clean.category,
      city: clean.city,
      description: clean.description,
      website: clean.website,
      domain: clean.domain,
      phone: clean.phone,
      email: clean.email,
      logoUrl: resolveLogoUrl('', clean.domain, 'ok').slice(0, 400),
      socials: [],
      status: 'active',
      statusNote: '',
      averageRating: 0,
      reviewCount: 0,
      sourceBatch: 'user',
      createdByUid: user.uid,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(
        doc(db, 'companies', String(nextId)),
        toFirestoreCompanyPayload(newCompany, user.uid, serverTimestamp()),
      );
      this.userCompaniesCache = [...(this.userCompaniesCache || []), newCompany];
      this.overviewCache = null;
      return { created: true, company: newCompany };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `companies/${nextId}`);
    }
  }

  async addReview(input: CreateReviewInput): Promise<Review> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('AUTH_REQUIRED');

    const validation = validateReviewInput(input);
    if (!validation.ok) {
      throw new Error(validation.reason);
    }
    const clean = validation.clean;
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const status: ModerationStatus = user.isAdmin ? 'approved' : 'pending';

    try {
      await setDoc(doc(db, 'reviews', reviewId), {
        id: reviewId,
        companyId: input.companyId,
        author: clean.author,
        authorUid: user.uid,
        rating: clean.rating,
        pros: clean.pros,
        cons: clean.cons,
        text: clean.text,
        confirmedPurchase: Boolean(input.confirmedPurchase),
        status,
        createdAt: serverTimestamp(),
        helpfulCount: 0,
        unhelpfulCount: 0,
        comments: [],
      });

      return {
        id: reviewId,
        companyId: input.companyId,
        author: clean.author,
        authorUid: user.uid,
        rating: clean.rating,
        pros: clean.pros,
        cons: clean.cons,
        text: clean.text,
        confirmedPurchase: Boolean(input.confirmedPurchase),
        status,
        createdAt: new Date().toISOString(),
        helpfulCount: 0,
        unhelpfulCount: 0,
        comments: [],
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `reviews/${reviewId}`);
    }
  }

  async voteReview(
    reviewId: string,
    companyId: number,
    vote: 'up' | 'down',
  ): Promise<{ helpfulCount?: number; unhelpfulCount?: number; alreadyVoted?: boolean }> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('AUTH_REQUIRED');

    const voteId = `${reviewId}_${user.uid}`;
    const voteRef = doc(db, 'reviewVotes', voteId);

    try {
      const existingVote = await getDoc(voteRef);
      if (existingVote.exists()) {
        return { alreadyVoted: true };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `reviewVotes/${voteId}`);
    }

    const reviewRef = doc(db, 'reviews', reviewId);
    let reviewExistsInFirestore = false;
    let currentHelpful = 0;
    let currentUnhelpful = 0;

    if (!reviewId.startsWith('seed_')) {
      try {
        const revSnap = await getDoc(reviewRef);
        if (revSnap.exists()) {
          reviewExistsInFirestore = true;
          const rData = revSnap.data() as { helpfulCount?: number; unhelpfulCount?: number };
          currentHelpful = Number(rData.helpfulCount) || 0;
          currentUnhelpful = Number(rData.unhelpfulCount) || 0;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `reviews/${reviewId}`);
      }
    }

    if (reviewExistsInFirestore) {
      try {
        const batch = writeBatch(db);
        batch.set(voteRef, {
          reviewId,
          companyId,
          authorUid: user.uid,
          vote,
          createdAt: serverTimestamp(),
        });
        const nextHelpful = vote === 'up' ? currentHelpful + 1 : currentHelpful;
        const nextUnhelpful = vote === 'down' ? currentUnhelpful + 1 : currentUnhelpful;
        batch.update(
          reviewRef,
          vote === 'up' ? { helpfulCount: nextHelpful } : { unhelpfulCount: nextUnhelpful },
        );
        await batch.commit();
        return { helpfulCount: nextHelpful, unhelpfulCount: nextUnhelpful };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `reviews/${reviewId}`);
      }
    }

    // Seeded deterministic review: store deduplicated user vote receipt in Firestore
    try {
      await setDoc(voteRef, {
        reviewId,
        companyId,
        authorUid: user.uid,
        vote,
        createdAt: serverTimestamp(),
      });
      const prev = this.localSeedVotes.get(reviewId) || { up: 0, down: 0 };
      this.localSeedVotes.set(reviewId, {
        up: prev.up + (vote === 'up' ? 1 : 0),
        down: prev.down + (vote === 'down' ? 1 : 0),
      });
      return {};
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `reviewVotes/${voteId}`);
    }
  }

  async addReviewComment(input: CreateCommentInput): Promise<ReviewComment> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('AUTH_REQUIRED');

    const validation = validateCommentInput(input);
    if (!validation.ok) {
      throw new Error(validation.reason);
    }
    const clean = validation.clean;
    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const status: ModerationStatus = user.isAdmin ? 'approved' : 'pending';

    try {
      await setDoc(doc(db, 'reviewComments', commentId), {
        id: commentId,
        reviewId: input.reviewId,
        companyId: input.companyId,
        author: clean.author,
        authorUid: user.uid,
        text: clean.text,
        isOfficialReply: Boolean(input.isOfficialReply),
        status,
        createdAt: serverTimestamp(),
      });

      return {
        id: commentId,
        reviewId: input.reviewId,
        companyId: input.companyId,
        author: clean.author,
        authorUid: user.uid,
        text: clean.text,
        isOfficialReply: Boolean(input.isOfficialReply),
        status,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `reviewComments/${commentId}`);
    }
  }

  async isFirestoreSeeded(): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, 'meta', 'overview'));
      return snap.exists();
    } catch {
      return false;
    }
  }

  async importCatalogToFirestore(
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<{ companiesImported: number; shardsImported: number }> {
    const user = this.getCurrentUser();
    if (!user || !user.isAdmin) throw new Error('ADMIN_REQUIRED');

    const companies = await this.fetchSeedBundle();
    const overview = buildOverviewStats(companies);

    const byCat = new Map<CategoryId, Company[]>();
    for (const cat of CATEGORY_ORDER) byCat.set(cat, []);
    for (const c of companies) {
      byCat.get(c.category)?.push(c);
    }

    const totalOps = 1 + CATEGORY_ORDER.length * 2 + companies.length;
    let completed = 0;

    // Step 1: Write overview + categories + catalog shards
    onProgress?.({
      stage: 'Загрузка сводки и индексов категорий...',
      current: 0,
      total: totalOps,
    });

    try {
      const metaBatch = writeBatch(db);
      metaBatch.set(doc(db, 'meta', 'overview'), {
        ...overview,
        updatedAt: serverTimestamp(),
      });
      CATEGORY_ORDER.forEach((cat, idx) => {
        const items = byCat.get(cat) || [];
        metaBatch.set(doc(db, 'categories', cat), {
          id: cat,
          count: items.length,
          sortOrder: idx + 1,
          nameRu: CATEGORY_LABELS.ru[cat],
          nameUa: CATEGORY_LABELS.ua[cat],
        });
      });
      await metaBatch.commit();
      completed += 1 + CATEGORY_ORDER.length;

      for (let i = 0; i < CATEGORY_ORDER.length; i += 3) {
        const shardBatch = writeBatch(db);
        const cats = CATEGORY_ORDER.slice(i, i + 3);
        for (const cat of cats) {
          const items = byCat.get(cat) || [];
          shardBatch.set(doc(db, 'catalogShards', cat), {
            category: cat,
            count: items.length,
            items,
            updatedAt: serverTimestamp(),
          });
        }
        await shardBatch.commit();
        completed += cats.length;
        onProgress?.({
          stage: 'Загрузка индексов категорий...',
          current: completed,
          total: totalOps,
        });
      }

      onProgress?.({
        stage: 'Индексы категорий загружены. Импорт карточек компаний...',
        current: completed,
        total: totalOps,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'catalogShards');
    }

    // Step 2: Batched company writes (chunks of 350 to stay well under 500 limit)
    const chunkSize = 350;
    for (let i = 0; i < companies.length; i += chunkSize) {
      const chunk = companies.slice(i, i + chunkSize);
      try {
        const batch = writeBatch(db);
        for (const company of chunk) {
          batch.set(
            doc(db, 'companies', String(company.id)),
            toFirestoreCompanyPayload(company, user.uid, serverTimestamp()),
          );
        }
        await batch.commit();
        completed += chunk.length;
        onProgress?.({
          stage: `Импорт компаний: ${Math.min(i + chunk.length, companies.length)} из ${companies.length}`,
          current: completed,
          total: totalOps,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'companies');
      }
    }

    this.overviewCache = null;
    this.allCatalogCache = null;
    this.shardCache.clear();
    return { companiesImported: companies.length, shardsImported: CATEGORY_ORDER.length };
  }

  async getModerationQueue(): Promise<ModerationQueue> {
    const user = this.getCurrentUser();
    if (!user || !user.isAdmin) throw new Error('ADMIN_REQUIRED');

    try {
      const [revSnap, cmtSnap] = await Promise.all([
        getDocs(collection(db, 'reviews')),
        getDocs(collection(db, 'reviewComments')),
      ]);

      const reviews = revSnap.docs
        .map((d) => mapReviewDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => {
          const order = { pending: 0, approved: 1, rejected: 2 };
          const sa = order[a.status || 'approved'];
          const sb = order[b.status || 'approved'];
          return sa - sb || b.createdAt.localeCompare(a.createdAt);
        });

      const comments = cmtSnap.docs
        .map((d) => mapCommentDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => {
          const order = { pending: 0, approved: 1, rejected: 2 };
          const sa = order[a.status || 'approved'];
          const sb = order[b.status || 'approved'];
          return sa - sb || b.createdAt.localeCompare(a.createdAt);
        });

      return { reviews, comments };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    }
  }

  async moderateReview(
    reviewId: string,
    status: ModerationStatus,
    updates?: Partial<Pick<Review, 'rating' | 'pros' | 'cons' | 'text'>>,
  ): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !user.isAdmin) throw new Error('ADMIN_REQUIRED');

    const payload: Record<string, unknown> = {
      status,
      moderatedAt: serverTimestamp(),
      moderatedBy: user.uid,
    };
    if (updates?.rating !== undefined) payload.rating = updates.rating;
    if (updates?.pros !== undefined) payload.pros = updates.pros;
    if (updates?.cons !== undefined) payload.cons = updates.cons;
    if (updates?.text !== undefined) payload.text = updates.text;

    try {
      await updateDoc(doc(db, 'reviews', reviewId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reviews/${reviewId}`);
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !user.isAdmin) throw new Error('ADMIN_REQUIRED');

    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
    }
  }

  async moderateComment(
    commentId: string,
    status: ModerationStatus,
    updates?: Partial<Pick<ReviewComment, 'text' | 'isOfficialReply'>>,
  ): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !user.isAdmin) throw new Error('ADMIN_REQUIRED');

    const payload: Record<string, unknown> = { status };
    if (updates?.text !== undefined) payload.text = updates.text;
    if (updates?.isOfficialReply !== undefined) {
      payload.isOfficialReply = updates.isOfficialReply;
    }

    try {
      await updateDoc(doc(db, 'reviewComments', commentId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reviewComments/${commentId}`);
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !user.isAdmin) throw new Error('ADMIN_REQUIRED');

    try {
      await deleteDoc(doc(db, 'reviewComments', commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviewComments/${commentId}`);
    }
  }

  async updateCompany(
    companyId: number,
    updates: Partial<
      Pick<
        Company,
        'name' | 'category' | 'city' | 'description' | 'website' | 'phone' | 'email' | 'status' | 'statusNote'
      >
    >,
  ): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !user.isAdmin) throw new Error('ADMIN_REQUIRED');

    try {
      await updateDoc(doc(db, 'companies', String(companyId)), updates);
      this.overviewCache = null;
      this.allCatalogCache = null;
      this.shardCache.clear();
      this.userCompaniesCache = null;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}`);
    }
  }

  async deleteCompany(companyId: number): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !user.isAdmin) throw new Error('ADMIN_REQUIRED');

    try {
      await deleteDoc(doc(db, 'companies', String(companyId)));
      this.overviewCache = null;
      this.allCatalogCache = null;
      this.shardCache.clear();
      this.userCompaniesCache = null;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `companies/${companyId}`);
    }
  }
}
