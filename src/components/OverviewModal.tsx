import { X } from '@phosphor-icons/react';
import type { CategoryId, Language, OverviewStats } from '../types.ts';
import { CATEGORY_LABELS, CATEGORY_ORDER, UI_TEXT } from '../i18n.ts';
import { localizeCity } from '../utils/cityLocalization.ts';
import {
  CategoryIcon,
  CATEGORY_TILE_BASE,
  SCAMMER_TILE_BASE,
} from './CategoryIcon.tsx';

interface OverviewModalProps {
  lang: Language;
  overview: OverviewStats;
  onSelectCategory: (cat: CategoryId) => void;
  onSelectCity: (city: string) => void;
  onClose: () => void;
}

export function OverviewModal({
  lang,
  overview,
  onSelectCategory,
  onSelectCity,
  onClose,
}: OverviewModalProps) {
  const t = UI_TEXT[lang];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 backdrop-blur-[2px] p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white border border-emerald-950/10 rounded-2xl shadow-xl my-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.overviewTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.overviewDesc}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label={t.close}
          >
            <X weight="regular" className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">{t.categoryCol}</th>
                  <th className="text-right font-semibold px-4 py-2.5">{t.countCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CATEGORY_ORDER.map((cat) => (
                  <tr
                    key={cat}
                    onClick={() => {
                      onSelectCategory(cat);
                      onClose();
                    }}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800 flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                          cat === 'scammers' ? SCAMMER_TILE_BASE : CATEGORY_TILE_BASE
                        }`}
                      >
                        <CategoryIcon category={cat} className="w-4 h-4" />
                      </span>
                      <span>{CATEGORY_LABELS[lang][cat]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                      {(overview.byCategory[cat] || 0).toLocaleString(
                        lang === 'ua' ? 'uk-UA' : 'ru-RU',
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {overview.topCities.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {t.topCitiesTitle}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {overview.topCities.map((item) => (
                  <button
                    key={item.city}
                    type="button"
                    onClick={() => {
                      onSelectCity(item.city);
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 text-xs border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors cursor-pointer"
                  >
                    <span className="truncate font-medium text-slate-800">
                      {localizeCity(item.city, lang)}
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums ml-2">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
