import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ListNumbers, ShieldWarning } from '@phosphor-icons/react';
import type { Company, Language } from '../types.ts';
import { CATEGORY_LABELS, UI_TEXT } from '../i18n.ts';
import { buildRouteUrl, RATING_GUIDES } from '../utils/seoSlug.ts';
import { localizeCity } from '../utils/cityLocalization.ts';
import { database } from '../services/database.ts';
import {
  CategoryIcon,
  CATEGORY_TILE_BASE,
  SCAMMER_TILE_BASE,
} from './CategoryIcon.tsx';
import { CompanyCard } from './CompanyCard.tsx';

interface RatingsPageProps {
  lang: Language;
  guideSlug?: string;
  onOpenGuide: (slug?: string) => void;
  onOpenCompany: (company: Company) => void;
}

export function RatingsPage({
  lang,
  guideSlug,
  onOpenGuide,
  onOpenCompany,
}: RatingsPageProps) {
  const t = UI_TEXT[lang];
  const activeGuide = guideSlug
    ? RATING_GUIDES.find((g) => g.slug === guideSlug) || null
    : null;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeGuide) return;
    let cancelled = false;
    setLoading(true);

    database
      .searchCompanies({
        category: activeGuide.category,
        city: activeGuide.city || '',
        sort: activeGuide.isBlacklist ? 'featured' : 'rating',
        limit: 15,
      })
      .then((data) => {
        if (!cancelled) setCompanies(data.items || []);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeGuide]);

  if (activeGuide) {
    const title = lang === 'ua' ? activeGuide.titleUa : activeGuide.titleRu;
    const desc = lang === 'ua' ? activeGuide.descUa : activeGuide.descRu;
    const allHref = buildRouteUrl({ view: 'ratings' }, lang);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={allHref}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onOpenGuide(undefined);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-emerald-950/10 rounded-lg hover:border-emerald-600/40 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.allRatingsBtn}</span>
          </a>
        </div>

        <section
          className={`bg-white border rounded-2xl p-6 sm:p-8 shadow-xs space-y-3 ${
            activeGuide.isBlacklist ? 'border-rose-900/15' : 'border-emerald-950/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                activeGuide.isBlacklist ? SCAMMER_TILE_BASE : CATEGORY_TILE_BASE
              }`}
            >
              <CategoryIcon category={activeGuide.category} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {CATEGORY_LABELS[lang][activeGuide.category]}
                {activeGuide.city ? ` · ${localizeCity(activeGuide.city, lang)}` : ''}
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                {title}
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">{desc}</p>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-emerald-950/10 rounded-2xl p-5 h-44 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {companies.map((comp, idx) => (
              <CompanyCard
                key={comp.id}
                company={comp}
                lang={lang}
                rank={activeGuide.isBlacklist ? undefined : idx + 1}
                onOpen={onOpenCompany}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <section className="bg-white border border-emerald-950/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <ListNumbers weight="duotone" className="w-4 h-4" aria-hidden="true" />
          <span>OtzyvTop Editorial</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {t.ratingsTitle}
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl">{t.ratingsSubtitle}</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {RATING_GUIDES.map((guide) => {
          const href = buildRouteUrl({ view: 'ratings', guideSlug: guide.slug }, lang);
          const title = lang === 'ua' ? guide.titleUa : guide.titleRu;
          const desc = lang === 'ua' ? guide.descUa : guide.descRu;
          return (
            <a
              key={guide.slug}
              href={href}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onOpenGuide(guide.slug);
                }
              }}
              className={`group bg-white border rounded-2xl p-6 shadow-xs hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-4 ${
                guide.isBlacklist
                  ? 'border-rose-900/15 hover:border-rose-500/45'
                  : 'border-emerald-950/10 hover:border-emerald-600/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                      guide.isBlacklist ? SCAMMER_TILE_BASE : CATEGORY_TILE_BASE
                    }`}
                  >
                    {guide.isBlacklist ? (
                      <ShieldWarning weight="duotone" className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <CategoryIcon category={guide.category} className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                      guide.isBlacklist
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {guide.isBlacklist ? t.blacklistTag : CATEGORY_LABELS[lang][guide.category]}
                  </span>
                </div>
                <h2
                  className={`text-base font-bold text-slate-900 transition-colors ${
                    guide.isBlacklist
                      ? 'group-hover:text-rose-700'
                      : 'group-hover:text-emerald-700'
                  }`}
                >
                  {title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {desc}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  guide.isBlacklist ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                <span>{t.openGuideBtn}</span>
                <ArrowRight weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
