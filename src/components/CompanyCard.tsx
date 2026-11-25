import { ShieldWarning } from '@phosphor-icons/react';
import type { Company, Language } from '../types.ts';
import { CATEGORY_LABELS, UI_TEXT, localizeActiveYears } from '../i18n.ts';
import { buildCompanyPath } from '../utils/seoSlug.ts';
import { localizeCity } from '../utils/cityLocalization.ts';
import { CompanyLogo } from './CompanyLogo.tsx';
import { StarRating } from './StarRating.tsx';
import { RankBadge, VerifiedShieldIcon } from './PremiumIcons.tsx';

interface CompanyCardProps {
  company: Company;
  lang: Language;
  rank?: number;
  onOpen: (company: Company) => void;
}

export function CompanyCard({ company, lang, rank, onOpen }: CompanyCardProps) {
  const t = UI_TEXT[lang];
  const isScammer = company.category === 'scammers';
  const isClosed = company.status === 'closed';
  const isDefunctScammer = isScammer && company.scamActive === false;
  const formattedYears = localizeActiveYears(company.activeYears, lang);
  const showRank =
    rank !== undefined && rank >= 1 && rank <= 3 && company.reviewCount > 0;
  const href = buildCompanyPath(company.name, company.id, lang);

  return (
    <a
      href={href}
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          onOpen(company);
        }
      }}
      className={`group bg-white border rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.05)] hover:shadow-[0_14px_28px_-8px_rgba(6,78,59,0.13)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-emerald-600 transition-all duration-200 flex flex-col justify-between gap-4 text-left ${
        isScammer
          ? 'border-rose-900/15 hover:border-rose-500/45'
          : 'border-emerald-950/10 hover:border-emerald-600/40'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3.5">
          <CompanyLogo name={company.name} logoUrl={company.logoUrl} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`text-[15px] font-bold text-slate-900 transition-colors truncate ${
                  isScammer
                    ? 'group-hover:text-rose-700'
                    : 'group-hover:text-emerald-700'
                }`}
              >
                {company.name}
              </h3>
              {showRank ? (
                <RankBadge rank={rank as 1 | 2 | 3} />
              ) : isScammer ? (
                <ShieldWarning
                  weight="duotone"
                  className="w-4 h-4 text-rose-700 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                !isClosed &&
                company.website && (
                  <VerifiedShieldIcon className="w-4 h-4 text-emerald-700/80 shrink-0" />
                )
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              <span>{CATEGORY_LABELS[lang][company.category]}</span>
              {company.city && <span> · {localizeCity(company.city, lang)}</span>}
              {company.domain && <span> · {company.domain}</span>}
              {formattedYears && company.activeYears !== 'Работает в 2026' && (
                <span> · {formattedYears}</span>
              )}
            </p>
          </div>
        </div>

        <p className="text-[13.5px] text-slate-600 leading-relaxed line-clamp-3">
          {company.description}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <StarRating rating={company.averageRating} size="sm" />
          <span className="font-mono font-semibold text-slate-800 tabular-nums">
            {company.reviewCount > 0 ? company.averageRating.toFixed(1) : '—'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 tabular-nums">
          {isScammer ? (
            <span className={`font-semibold ${isDefunctScammer ? 'text-slate-600' : 'text-rose-700'}`}>
              {isDefunctScammer ? t.scamDefunctStatus : t.statusScammer}
            </span>
          ) : isClosed ? (
            <span className="text-rose-700 font-semibold">{t.statusClosed}</span>
          ) : company.reviewCount > 0 ? (
            <span className="text-slate-600 font-medium">
              {t.reviewsCount(company.reviewCount)}
            </span>
          ) : (
            <span className="text-slate-400 group-hover:text-emerald-700 transition-colors font-medium">
              <span className="group-hover:hidden">{t.noReviewsYet}</span>
              <span className="hidden group-hover:inline">{t.beFirstHint}</span>
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
