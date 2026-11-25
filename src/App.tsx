import { useCallback, useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  ChartBar,
  House,
  Plus,
  ShieldCheck,
  SignIn,
  SignOut,
  SquaresFour,
  X,
} from '@phosphor-icons/react';
import type {
  AuthUser,
  CategoryId,
  Company,
  Language,
  OverviewStats,
  SearchCompaniesResponse,
} from './types.ts';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  QUICK_SEARCHES,
  UI_TEXT,
} from './i18n.ts';
import { database } from './services/database.ts';
import {
  CategoryIcon,
  CATEGORY_TILE_BASE,
  CATEGORY_TILE_INTERACTIVE,
  SCAMMER_TILE_BASE,
  SCAMMER_TILE_INTERACTIVE,
} from './components/CategoryIcon.tsx';
import {
  OtzyvTopMark,
  SearchPrecisionIcon,
  StepReviewIcon,
  StepVerifyIcon,
} from './components/PremiumIcons.tsx';
import { CompanyCard } from './components/CompanyCard.tsx';
import { CompanyLogo } from './components/CompanyLogo.tsx';
import { CompanyPage } from './components/CompanyPage.tsx';
import { RatingsPage } from './components/RatingsPage.tsx';
import { AddCompanyModal } from './components/AddCompanyModal.tsx';
import { OverviewModal } from './components/OverviewModal.tsx';
import { AdminModal } from './components/AdminModal.tsx';
import {
  buildCompanyPath,
  buildRouteUrl,
  citySlug,
  parseLocationPath,
  RATING_GUIDES,
  type AppRoute,
} from './utils/seoSlug.ts';
import { localizeCity } from './utils/cityLocalization.ts';

function isPlainLeftClick(e: MouseEvent): boolean {
  return !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;
}

function resolveLocationState(): {
  lang: Language;
  route: AppRoute;
  q: string;
  upgradedFromHash: boolean;
} {
  if (typeof window === 'undefined') {
    return { lang: 'ru', route: { view: 'home' }, q: '', upgradedFromHash: false };
  }
  const hash = window.location.hash.replace(/^#/, '');
  if (window.location.pathname === '/' && hash.startsWith('/')) {
    const parsedHash = parseLocationPath(hash.split('?')[0]);
    return { ...parsedHash, q: '', upgradedFromHash: true };
  }
  const parsed = parseLocationPath(window.location.pathname);
  const q = new URLSearchParams(window.location.search).get('q') || '';
  return { ...parsed, q, upgradedFromHash: false };
}

export function App() {
  const initialLoc = resolveLocationState();
  const [lang, setLang] = useState<Language>(initialLoc.lang);
  const t = UI_TEXT[lang];

  const [route, setRoute] = useState<AppRoute>(initialLoc.route);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [searchResult, setSearchResult] = useState<SearchCompaniesResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState(false);

  const [queryInput, setQueryInput] = useState(initialLoc.q);
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [activeQuery, setActiveQuery] = useState(initialLoc.q);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>(
    initialLoc.route.view === 'catalog' ? initialLoc.route.category || 'all' : 'all',
  );
  const [selectedCity, setSelectedCity] = useState(
    initialLoc.route.view === 'catalog' ? initialLoc.route.citySlug || '' : '',
  );
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'closed'>('all');
  const [sortBy, setSortBy] = useState('featured');
  const [page, setPage] = useState(1);

  const [authUser, setAuthUser] = useState<AuthUser | null>(() => database.getCurrentUser());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = database.onAuthChange((user) => {
      setAuthUser(user);
    });
    if (initialLoc.upgradedFromHash) {
      window.history.replaceState(null, '', buildRouteUrl(initialLoc.route, initialLoc.lang));
    }
    const onPopState = () => {
      const next = parseLocationPath(window.location.pathname);
      const q = new URLSearchParams(window.location.search).get('q') || '';
      setLang(next.lang);
      setRoute(next.route);
      if (next.route.view === 'catalog') {
        setSelectedCategory(next.route.category || 'all');
        setSelectedCity(next.route.citySlug || '');
        setQueryInput(q);
        setActiveQuery(q);
        setPage(1);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      unsubscribeAuth();
      window.removeEventListener('popstate', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'ua' ? 'uk' : 'ru';
    if (route.view === 'home') {
      document.title =
        lang === 'ua'
          ? 'OtzyvTop — Незалежний каталог компаній і відгуків'
          : 'OtzyvTop — Независимый каталог компаний и отзывов';
    } else if (route.view === 'ratings') {
      const guide = route.guideSlug
        ? RATING_GUIDES.find((g) => g.slug === route.guideSlug)
        : null;
      document.title = guide
        ? `${lang === 'ua' ? guide.titleUa : guide.titleRu} — OtzyvTop`
        : `${UI_TEXT[lang].ratingsTitle} — OtzyvTop`;
    } else if (route.view === 'catalog') {
      const catLabel =
        selectedCategory === 'all'
          ? UI_TEXT[lang].navCatalog
          : CATEGORY_LABELS[lang][selectedCategory];
      const cityLabel = searchResult?.resolvedCity
        ? ` · ${localizeCity(searchResult.resolvedCity, lang)}`
        : '';
      document.title = `${catLabel}${cityLabel} — OtzyvTop`;
    }
  }, [lang, route, selectedCategory, searchResult?.resolvedCity]);

  const pushUrl = (url: string) => {
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState(null, '', url);
    }
  };

  const switchLang = (nextLang: Language) => {
    if (nextLang === lang) return;
    const rawPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const basePath =
      rawPath === '/ua'
        ? '/'
        : rawPath.startsWith('/ua/')
          ? rawPath.slice(3)
          : rawPath;
    const targetPath = nextLang === 'ua' ? (basePath === '/' ? '/ua' : `/ua${basePath}`) : basePath;
    pushUrl(`${targetPath}${window.location.search}`);
    setLang(nextLang);
  };

  const goHome = () => {
    const nextRoute: AppRoute = { view: 'home' };
    pushUrl(buildRouteUrl(nextRoute, lang));
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goCatalog = (opts?: {
    q?: string;
    category?: CategoryId | 'all';
    city?: string;
    reset?: boolean;
  }) => {
    let nextCat: CategoryId | 'all' = selectedCategory;
    let nextCity = selectedCity;
    let nextQuery = activeQuery;

    if (opts?.reset) {
      nextQuery = '';
      nextCat = 'all';
      nextCity = '';
      setQueryInput('');
      setActiveQuery('');
      setSelectedCategory('all');
      setSelectedCity('');
      setSelectedStatus('all');
      setSortBy('featured');
    } else {
      if (opts?.q !== undefined) {
        nextQuery = opts.q;
        setQueryInput(opts.q);
        setActiveQuery(opts.q);
      }
      if (opts?.category !== undefined) {
        nextCat = opts.category;
        nextCity = opts.city !== undefined ? opts.city : '';
        setSelectedCategory(opts.category);
        setSelectedCity(nextCity);
      } else if (opts?.city !== undefined) {
        nextCity = opts.city;
        setSelectedCity(opts.city);
      }
    }

    const nextRoute: AppRoute = {
      view: 'catalog',
      category: nextCat,
      citySlug: nextCity ? citySlug(nextCity) : undefined,
    };
    const baseUrl = buildRouteUrl(nextRoute, lang);
    const fullUrl = nextQuery.trim()
      ? `${baseUrl}?q=${encodeURIComponent(nextQuery.trim())}`
      : baseUrl;

    setPage(1);
    setShowSuggestions(false);
    pushUrl(fullUrl);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goRatings = (guideSlug?: string) => {
    const nextRoute: AppRoute = { view: 'ratings', guideSlug };
    pushUrl(buildRouteUrl(nextRoute, lang));
    setRoute(nextRoute);
    setShowSuggestions(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goCompany = (target: Company | number) => {
    setShowSuggestions(false);
    const id = typeof target === 'number' ? target : target.id;
    const url =
      typeof target === 'number'
        ? buildRouteUrl({ view: 'company', companyId: id }, lang)
        : buildCompanyPath(target.name, target.id, lang);
    pushUrl(url);
    setRoute({ view: 'company', companyId: id });
  };

  const fetchOverview = useCallback(async () => {
    try {
      const data = await database.getOverview();
      setOverview(data);
    } catch {
      // handled gracefully
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError(false);
    try {
      const data = await database.searchCompanies({
        q: activeQuery,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        city: selectedCity || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        sort: sortBy,
        page,
        limit: 24,
      });
      setSearchResult(data);
    } catch {
      setCatalogError(true);
    } finally {
      setLoadingCatalog(false);
    }
  }, [activeQuery, selectedCategory, selectedCity, selectedStatus, sortBy, page]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (route.view === 'catalog') {
      void fetchCompanies();
    }
  }, [route.view, fetchCompanies]);

  useEffect(() => {
    const q = queryInput.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await database.suggestCompanies(q);
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const handleSignIn = async () => {
    try {
      const user = await database.signInWithGoogle();
      setAuthUser(user);
    } catch {
      // popup cancelled or blocked
    }
  };

  const handleSignOut = async () => {
    await database.signOut();
    setAuthUser(null);
    setShowAdminModal(false);
  };

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    goCatalog({ q: queryInput.trim() });
  };

  const handleCatalogSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveQuery(queryInput.trim());
  };

  const handleCompanyUpdated = () => {
    void fetchOverview();
    if (route.view === 'catalog') {
      void fetchCompanies();
    }
  };

  const handleAddedCompany = (company: Company) => {
    setShowAddModal(false);
    void fetchOverview();
    goCompany(company);
  };

  const stepIcons = [
    <SearchPrecisionIcon key="s1" className="w-5 h-5 text-emerald-800" />,
    <StepVerifyIcon key="s2" className="w-5 h-5 text-emerald-800" />,
    <StepReviewIcon key="s3" className="w-5 h-5 text-emerald-800" />,
  ];

  const homeHref = buildRouteUrl({ view: 'home' }, lang);
  const catalogHref = buildRouteUrl({ view: 'catalog' }, lang);
  const ratingsHref = buildRouteUrl({ view: 'ratings' }, lang);
  const resolvedCityName =
    searchResult?.resolvedCity ||
    (selectedCity &&
      searchResult?.availableCities?.find((c) => citySlug(c) === citySlug(selectedCity))) ||
    '';

  return (
    <div className="min-h-screen flex flex-col bg-[#F3FBF7] text-slate-900 pb-16 md:pb-0">
      {/* Top Bar Contract: Zone 1 (Wordmark + Emblem) — Zone 2 (4 Nav Links) — Zone 3 (1 Primary CTA) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-emerald-950/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href={homeHref}
            onClick={(e) => {
              if (isPlainLeftClick(e)) {
                e.preventDefault();
                goHome();
              }
            }}
            className="inline-flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-emerald-950 whitespace-nowrap shrink-0"
          >
            <OtzyvTopMark className="w-7 h-7" />
            <span>
              Otzyv<span className="text-emerald-600">Top</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href={homeHref}
              onClick={(e) => {
                if (isPlainLeftClick(e)) {
                  e.preventDefault();
                  goHome();
                }
              }}
              className={`hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 ${
                route.view === 'home' ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              {t.navHome}
            </a>
            <a
              href={catalogHref}
              onClick={(e) => {
                if (isPlainLeftClick(e)) {
                  e.preventDefault();
                  goCatalog();
                }
              }}
              className={`hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 ${
                route.view === 'catalog' ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              {t.navCatalog}
            </a>
            <a
              href={ratingsHref}
              onClick={(e) => {
                if (isPlainLeftClick(e)) {
                  e.preventDefault();
                  goRatings();
                }
              }}
              className={`hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 ${
                route.view === 'ratings' ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              {t.navRatings}
            </a>
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navStats}
            </button>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {authUser?.isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdminModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-900/15 rounded-xl hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ShieldCheck weight="duotone" className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span className="hidden sm:inline">{t.adminPanelBtn}</span>
              </button>
            )}

            {authUser ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                title={authUser.email || authUser.displayName || ''}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="hidden lg:inline max-w-[120px] truncate">
                  {authUser.displayName || authUser.email}
                </span>
                <SignOut weight="regular" className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span className="lg:hidden">{t.signOutBtn}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-950/15 rounded-xl hover:border-emerald-600/40 hover:bg-emerald-50/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <SignIn weight="regular" className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>{t.signInBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus weight="bold" className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.addCompanyBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content by Route */}
      <main className="flex-1">
        {route.view === 'home' && (
          <>
            {/* Bright Emerald Gradient Hero with Glow, Dot Grid & Tactile Glass Search Ring */}
            <section className="hero-emerald-bg text-white overflow-visible">
              <div className="hero-dot-grid absolute inset-0 pointer-events-none" />
              <div
                className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <p className="text-xs sm:text-sm font-medium text-emerald-100">
                    {t.heroBadge}
                  </p>

                  {/* Bilingual RU / UA Switcher */}
                  <div
                    className="inline-flex items-center p-1 bg-emerald-950/35 border border-white/20 rounded-xl shrink-0"
                    role="group"
                    aria-label="Language"
                  >
                    <button
                      type="button"
                      onClick={() => switchLang('ru')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        lang === 'ru'
                          ? 'bg-white text-emerald-950 shadow-xs'
                          : 'text-emerald-100 hover:text-white'
                      }`}
                    >
                      RU
                    </button>
                    <button
                      type="button"
                      onClick={() => switchLang('ua')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        lang === 'ua'
                          ? 'bg-white text-emerald-950 shadow-xs'
                          : 'text-emerald-100 hover:text-white'
                      }`}
                    >
                      UA
                    </button>
                  </div>
                </div>

                <div className="max-w-3xl space-y-4">
                  <h1
                    className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.12] text-white"
                    style={{ textWrap: 'balance' }}
                  >
                    {t.heroTitle}
                  </h1>
                  <p className="text-base sm:text-lg text-emerald-50/90 leading-relaxed max-w-2xl">
                    {t.heroSubtitle}
                  </p>
                </div>

                {/* Live Search Bar with Outer Glass Halo + Autocomplete Dropdown */}
                <div className="mt-8 max-w-3xl relative">
                  <div className="bg-white/15 p-1.5 rounded-[22px] backdrop-blur-md ring-1 ring-white/25 shadow-[0_22px_48px_-12px_rgba(2,44,34,0.5)]">
                    <form
                      onSubmit={handleHeroSearch}
                      className="flex flex-col sm:flex-row gap-2 bg-white p-1.5 rounded-2xl"
                    >
                      <div className="relative flex-1 flex items-center">
                        <SearchPrecisionIcon className="w-5 h-5 text-emerald-800/70 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={queryInput}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                          onChange={(e) => {
                            setQueryInput(e.target.value);
                            setShowSuggestions(true);
                          }}
                          placeholder={t.searchPlaceholder}
                          className="w-full pl-11 pr-9 py-3 text-sm sm:text-base bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        {queryInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setQueryInput('');
                              setSuggestions([]);
                            }}
                            className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                            aria-label={t.clearSearch}
                          >
                            <X weight="regular" className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="px-7 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {t.searchButton}
                      </button>
                    </form>
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-emerald-950/10 rounded-2xl shadow-xl overflow-hidden z-40 divide-y divide-slate-100">
                      {suggestions.map((item) => (
                        <a
                          key={item.id}
                          href={buildCompanyPath(item.name, item.id, lang)}
                          onMouseDown={(e) => {
                            if (isPlainLeftClick(e)) {
                              e.preventDefault();
                              goCompany(item);
                            }
                          }}
                          onClick={(e) => {
                            if (isPlainLeftClick(e)) e.preventDefault();
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50/60 transition-colors text-left"
                        >
                          <CompanyLogo
                            name={item.name}
                            logoUrl={item.logoUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {CATEGORY_LABELS[lang][item.category]}
                              {item.city ? ` · ${localizeCity(item.city, lang)}` : ''}
                              {item.domain ? ` · ${item.domain}` : ''}
                            </p>
                          </div>
                          <ArrowRight
                            weight="regular"
                            className="w-4 h-4 text-slate-400 shrink-0"
                            aria-hidden="true"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Search Shortcuts */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-emerald-100">
                  <span className="opacity-85">{t.quickSearchLabel}</span>
                  {QUICK_SEARCHES[lang].map((qs) => (
                    <button
                      key={qs.label}
                      type="button"
                      onClick={() => goCatalog({ q: qs.query })}
                      className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {qs.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 4-Column KPI Strip with Vertical Dividers */}
            {overview && (
              <section className="bg-white border-b border-emerald-950/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:divide-x sm:divide-emerald-950/10">
                  <div className="sm:pr-6">
                    <p className="text-xs text-slate-500">{t.statCompanies}</p>
                    <p className="text-2xl font-extrabold text-emerald-950 mt-1 tabular-nums">
                      {overview.totalCompanies.toLocaleString(
                        lang === 'ua' ? 'uk-UA' : 'ru-RU',
                      )}
                    </p>
                  </div>
                  <div className="sm:px-6">
                    <p className="text-xs text-slate-500">{t.statCategories}</p>
                    <p className="text-2xl font-extrabold text-emerald-950 mt-1 tabular-nums">
                      {CATEGORY_ORDER.length}
                    </p>
                  </div>
                  <div className="sm:px-6">
                    <p className="text-xs text-slate-500">{t.statCities}</p>
                    <p className="text-2xl font-extrabold text-emerald-950 mt-1 tabular-nums">
                      {overview.totalCities.toLocaleString(
                        lang === 'ua' ? 'uk-UA' : 'ru-RU',
                      )}
                    </p>
                  </div>
                  <div className="sm:pl-6">
                    <p className="text-xs text-slate-500">{t.statReviews}</p>
                    <p className="text-2xl font-extrabold text-emerald-950 mt-1 tabular-nums">
                      {overview.totalReviews.toLocaleString(
                        lang === 'ua' ? 'uk-UA' : 'ru-RU',
                      )}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 10 Categories Grid (Architectural Emerald-Ivory Icon Housings + Phosphor Duotone) */}
            <section
              id="home-categories"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    {t.categoriesTitle}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {t.categoriesSubtitle}
                  </p>
                </div>
                <a
                  href={catalogHref}
                  onClick={(e) => {
                    if (isPlainLeftClick(e)) {
                      e.preventDefault();
                      goCatalog({ reset: true });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
                >
                  <span>{t.viewAllCatalog}</span>
                  <ArrowRight weight="regular" className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {CATEGORY_ORDER.filter((cat) => cat !== 'scammers').map((cat, idx) => {
                  const count = overview?.byCategory[cat] ?? 0;
                  const numStr = String(idx + 1).padStart(2, '0');
                  return (
                    <a
                      key={cat}
                      href={buildRouteUrl({ view: 'catalog', category: cat }, lang)}
                      onClick={(e) => {
                        if (isPlainLeftClick(e)) {
                          e.preventDefault();
                          goCatalog({ category: cat });
                        }
                      }}
                      className="group bg-white border border-emerald-950/10 rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.05)] hover:shadow-[0_14px_28px_-8px_rgba(6,78,59,0.12)] hover:-translate-y-0.5 hover:border-emerald-600/40 transition-all duration-200 text-left flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-11 h-11 rounded-xl border flex items-center justify-center ${CATEGORY_TILE_INTERACTIVE}`}
                        >
                          <CategoryIcon category={cat} className="w-5 h-5" />
                        </div>
                        <span className="font-mono text-[11px] font-medium text-slate-400 tabular-nums group-hover:hidden">
                          {numStr}
                        </span>
                        <ArrowRight
                          weight="regular"
                          className="w-4 h-4 text-emerald-700 hidden group-hover:inline-block"
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                          {CATEGORY_LABELS[lang][cat]}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 tabular-nums">
                          {t.companiesCountSuffix(count)}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Dedicated Full-Width 'Мошенники' Registry Banner Card */}
              <a
                href={buildRouteUrl({ view: 'catalog', category: 'scammers' }, lang)}
                onClick={(e) => {
                  if (isPlainLeftClick(e)) {
                    e.preventDefault();
                    goCatalog({ category: 'scammers' });
                  }
                }}
                className="group w-full bg-white border border-rose-900/15 rounded-2xl p-5 sm:px-6 shadow-[0_2px_10px_-4px_rgba(136,19,55,0.06)] hover:shadow-[0_14px_28px_-8px_rgba(136,19,55,0.13)] hover:-translate-y-0.5 hover:border-rose-500/45 transition-all duration-200 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${SCAMMER_TILE_INTERACTIVE}`}
                  >
                    <CategoryIcon category="scammers" className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[11px] font-semibold text-rose-700/80 tabular-nums">
                        11
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                        {CATEGORY_LABELS[lang].scammers}
                      </h3>
                      <span className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md px-2 py-0.5 tabular-nums">
                        {t.companiesCountSuffix(overview?.byCategory.scammers ?? 0)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {t.scammerCardDesc}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 whitespace-nowrap shrink-0">
                  <span>{t.openCategoryBtn}</span>
                  <ArrowRight
                    weight="regular"
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </section>

            {/* Featured Companies */}
            {overview && overview.featuredCompanies.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">
                      {t.featuredTitle}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {t.featuredSubtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <a
                      href={ratingsHref}
                      onClick={(e) => {
                        if (isPlainLeftClick(e)) {
                          e.preventDefault();
                          goRatings();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 whitespace-nowrap shrink-0"
                    >
                      <span>{t.navRatings}</span>
                    </a>
                    <a
                      href={catalogHref}
                      onClick={(e) => {
                        if (isPlainLeftClick(e)) {
                          e.preventDefault();
                          goCatalog();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
                    >
                      <span>{t.viewAllCatalog}</span>
                      <ArrowRight weight="regular" className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {overview.featuredCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      lang={lang}
                      onOpen={goCompany}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 3-Step Clarity Section */}
            <section className="bg-white border-t border-emerald-950/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {t.howItWorksTitle}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {t.steps.map((step, idx) => (
                    <div key={step.num} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${CATEGORY_TILE_BASE}`}
                        >
                          {stepIcons[idx]}
                        </div>
                        <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                          {step.num}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {route.view === 'catalog' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Catalog Header & Search */}
            <div className="bg-white border border-emerald-950/10 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {selectedCategory !== 'all' && (
                    <div
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                        selectedCategory === 'scammers'
                          ? SCAMMER_TILE_BASE
                          : CATEGORY_TILE_BASE
                      }`}
                    >
                      <CategoryIcon category={selectedCategory} className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">
                      {selectedCategory === 'all'
                        ? t.navCatalog
                        : CATEGORY_LABELS[lang][selectedCategory]}
                      {resolvedCityName ? ` · ${localizeCity(resolvedCityName, lang)}` : ''}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {searchResult ? t.foundCount(searchResult.total) : '—'}
                    </p>
                  </div>
                </div>

                {/* RU / UA Switcher */}
                <div className="inline-flex items-center p-1 bg-emerald-50 border border-emerald-900/10 rounded-xl self-start">
                  <button
                    type="button"
                    onClick={() => switchLang('ru')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      lang === 'ru'
                        ? 'bg-white text-emerald-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    RU
                  </button>
                  <button
                    type="button"
                    onClick={() => switchLang('ua')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      lang === 'ua'
                        ? 'bg-white text-emerald-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    UA
                  </button>
                </div>
              </div>

              <form onSubmit={handleCatalogSearch} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <SearchPrecisionIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                  {queryInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setQueryInput('');
                        setActiveQuery('');
                        setPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label={t.clearSearch}
                    >
                      <X weight="regular" className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <select
                  aria-label={t.allCities}
                  value={resolvedCityName || selectedCity}
                  onChange={(e) => {
                    const nextCity = e.target.value;
                    goCatalog({ category: selectedCategory, city: nextCity, q: activeQuery });
                  }}
                  className="px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="">{t.allCities}</option>
                  {(searchResult?.availableCities || []).map((cityName) => (
                    <option key={cityName} value={cityName}>
                      {localizeCity(cityName, lang)}
                    </option>
                  ))}
                </select>

                <select
                  aria-label={t.allStatuses}
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as 'all' | 'active' | 'closed');
                    setPage(1);
                  }}
                  className="px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="all">{t.allStatuses}</option>
                  <option value="active">{t.statusActive}</option>
                  <option value="closed">{t.statusClosed}</option>
                </select>

                <select
                  aria-label={t.sortLabel}
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="featured">{t.sortFeatured}</option>
                  <option value="name">{t.sortName}</option>
                  <option value="rating">{t.sortRating}</option>
                  <option value="newest">{t.sortNewest}</option>
                </select>

                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.searchButton}
                </button>
              </form>

              {/* Category Filter Strip */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <a
                  href={catalogHref}
                  onClick={(e) => {
                    if (isPlainLeftClick(e)) {
                      e.preventDefault();
                      goCatalog({ category: 'all', city: '', q: activeQuery });
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-600/40'
                  }`}
                >
                  {t.allCategories}
                </a>
                {CATEGORY_ORDER.map((cat) => {
                  const active = selectedCategory === cat;
                  const isScamCat = cat === 'scammers';
                  return (
                    <a
                      key={cat}
                      href={buildRouteUrl({ view: 'catalog', category: cat }, lang)}
                      onClick={(e) => {
                        if (isPlainLeftClick(e)) {
                          e.preventDefault();
                          goCatalog({ category: cat, city: '', q: activeQuery });
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        active
                          ? isScamCat
                            ? 'bg-rose-700 text-white border-rose-700'
                            : 'bg-emerald-700 text-white border-emerald-700'
                          : isScamCat
                            ? 'bg-rose-50/60 text-rose-800 border-rose-200 hover:border-rose-400'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-600/40'
                      }`}
                    >
                      <CategoryIcon
                        category={cat}
                        weight={active ? 'regular' : 'duotone'}
                        className="w-3.5 h-3.5"
                      />
                      <span>{CATEGORY_LABELS[lang][cat]}</span>
                    </a>
                  );
                })}

                {(activeQuery ||
                  selectedCategory !== 'all' ||
                  selectedCity ||
                  selectedStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => goCatalog({ reset: true })}
                    className="ml-auto text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {t.resetFilters}
                  </button>
                )}
              </div>

              {/* Programmatic SEO Quick Links: Category x City */}
              {searchResult && searchResult.availableCities.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 mr-1">
                    {t.popularCitiesInCat}
                  </span>
                  {searchResult.availableCities.slice(0, 8).map((cityName) => {
                    const cSlug = citySlug(cityName);
                    if (!cSlug) return null;
                    const isCityActive =
                      resolvedCityName.toLowerCase() === cityName.toLowerCase();
                    return (
                      <a
                        key={cityName}
                        href={buildRouteUrl(
                          { view: 'catalog', category: selectedCategory, citySlug: cSlug },
                          lang,
                        )}
                        onClick={(e) => {
                          if (isPlainLeftClick(e)) {
                            e.preventDefault();
                            goCatalog({
                              category: selectedCategory,
                              city: isCityActive ? '' : cityName,
                              q: activeQuery,
                            });
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                          isCityActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                            : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:border-emerald-600/40 hover:text-emerald-800'
                        }`}
                      >
                        {localizeCity(cityName, lang)}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Catalog Results */}
            {loadingCatalog ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-emerald-950/10 rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-12 w-full bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : catalogError ? (
              <div className="bg-white border border-emerald-950/10 rounded-2xl p-12 text-center space-y-4">
                <p className="text-base font-semibold text-slate-900">{t.errorTitle}</p>
                <button
                  type="button"
                  onClick={fetchCompanies}
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer"
                >
                  {t.retryBtn}
                </button>
              </div>
            ) : !searchResult || searchResult.items.length === 0 ? (
              <div className="bg-white border border-emerald-950/10 rounded-2xl p-12 text-center space-y-3">
                <p className="text-base font-semibold text-slate-900">{t.emptyTitle}</p>
                <p className="text-sm text-slate-500 max-w-md mx-auto">{t.emptyDesc}</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => goCatalog({ reset: true })}
                    className="px-5 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer"
                  >
                    {t.resetFilters}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {searchResult.items.map((company, index) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      lang={lang}
                      rank={searchResult.page === 1 ? index + 1 : undefined}
                      onOpen={goCompany}
                    />
                  ))}
                </div>

                {searchResult.totalPages > 1 && (
                  <div className="pt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-500 tabular-nums">
                      {t.pageOf(searchResult.page, searchResult.totalPages)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={searchResult.page <= 1}
                        onClick={() => {
                          setPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium bg-white border border-emerald-950/10 rounded-xl text-slate-700 hover:border-emerald-600/40 disabled:opacity-40 cursor-pointer"
                      >
                        <CaretLeft weight="regular" className="w-4 h-4" aria-hidden="true" />
                        <span>{t.prevPage}</span>
                      </button>
                      <button
                        type="button"
                        disabled={searchResult.page >= searchResult.totalPages}
                        onClick={() => {
                          setPage((p) => Math.min(searchResult.totalPages, p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium bg-white border border-emerald-950/10 rounded-xl text-slate-700 hover:border-emerald-600/40 disabled:opacity-40 cursor-pointer"
                      >
                        <span>{t.nextPage}</span>
                        <CaretRight weight="regular" className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {route.view === 'ratings' && (
          <RatingsPage
            lang={lang}
            guideSlug={route.guideSlug}
            onOpenGuide={goRatings}
            onOpenCompany={goCompany}
          />
        )}

        {route.view === 'company' && (
          <CompanyPage
            companyId={route.companyId}
            lang={lang}
            authUser={authUser}
            onSignIn={handleSignIn}
            onBackToCatalog={(cat, cityName) =>
              goCatalog({ category: cat || 'all', city: cityName || '' })
            }
            onNavigateHome={goHome}
            onOpenCompany={goCompany}
            onCompanyUpdated={handleCompanyUpdated}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-emerald-950/10 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>{t.footerCopyright}</span>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={catalogHref}
              onClick={(e) => {
                if (isPlainLeftClick(e)) {
                  e.preventDefault();
                  goCatalog({ reset: true });
                }
              }}
              className="hover:text-emerald-700 transition-colors"
            >
              {t.navCatalog}
            </a>
            <a
              href={ratingsHref}
              onClick={(e) => {
                if (isPlainLeftClick(e)) {
                  e.preventDefault();
                  goRatings();
                }
              }}
              className="hover:text-emerald-700 transition-colors"
            >
              {t.navRatings}
            </a>
            <a
              href={buildRouteUrl({ view: 'catalog', category: 'scammers' }, lang)}
              onClick={(e) => {
                if (isPlainLeftClick(e)) {
                  e.preventDefault();
                  goCatalog({ category: 'scammers' });
                }
              }}
              className="hover:text-rose-700 transition-colors"
            >
              {CATEGORY_LABELS[lang].scammers}
            </a>
          </div>
          <span>{t.footerSource}</span>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar (<= 15% height, zero overflow at 390px) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xs border-t border-emerald-950/10 grid grid-cols-4 h-14"
        aria-label="Mobile Navigation"
      >
        <button
          type="button"
          onClick={goHome}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            route.view === 'home' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <House weight={route.view === 'home' ? 'duotone' : 'regular'} className="w-4 h-4" aria-hidden="true" />
          <span>{t.mobileHome}</span>
        </button>
        <button
          type="button"
          onClick={() => goCatalog()}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            route.view === 'catalog' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <SquaresFour weight={route.view === 'catalog' ? 'duotone' : 'regular'} className="w-4 h-4" aria-hidden="true" />
          <span>{t.mobileCatalog}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-emerald-700 cursor-pointer"
        >
          <Plus weight="bold" className="w-4 h-4" aria-hidden="true" />
          <span>{t.mobileAdd}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowStatsModal(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500 cursor-pointer"
        >
          <ChartBar weight="regular" className="w-4 h-4" aria-hidden="true" />
          <span>{t.mobileStats}</span>
        </button>
      </nav>

      {/* Modals */}
      {showAddModal && (
        <AddCompanyModal
          lang={lang}
          authUser={authUser}
          onSignIn={handleSignIn}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAddedCompany}
          onSelectExisting={(existingId) => {
            setShowAddModal(false);
            goCompany(existingId);
          }}
        />
      )}

      {showStatsModal && overview && (
        <OverviewModal
          lang={lang}
          overview={overview}
          onSelectCategory={(cat) => goCatalog({ category: cat })}
          onSelectCity={(city) => goCatalog({ city })}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {showAdminModal && authUser?.isAdmin && (
        <AdminModal
          lang={lang}
          onClose={() => setShowAdminModal(false)}
          onDataChanged={handleCompanyUpdated}
        />
      )}
    </div>
  );
}

export default App;
