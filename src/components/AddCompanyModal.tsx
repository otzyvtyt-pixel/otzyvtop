import { useState, type FormEvent } from 'react';
import { X } from '@phosphor-icons/react';
import type { CategoryId, Company, Language } from '../types.ts';
import { CATEGORY_LABELS, CATEGORY_ORDER, UI_TEXT } from '../i18n.ts';

interface AddCompanyModalProps {
  lang: Language;
  onClose: () => void;
  onAdded: (company: Company) => void;
  onSelectExisting: (companyId: number) => void;
}

export function AddCompanyModal({
  lang,
  onClose,
  onAdded,
  onSelectExisting,
}: AddCompanyModalProps) {
  const t = UI_TEXT[lang];
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('shops');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<Company | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || submitting) return;
    setSubmitting(true);
    setDuplicate(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          city,
          website,
          phone,
          email,
          description,
        }),
      });
      const data = (await res.json()) as { created: boolean; company: Company };
      if (!data.created) {
        setDuplicate(data.company);
      } else {
        onAdded(data.company);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 backdrop-blur-[2px] p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl my-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.addModalTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.addModalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {duplicate && (
            <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-between gap-3">
              <div className="text-xs text-amber-900">
                <span className="font-semibold">{t.duplicateWarning} </span>
                <span>{duplicate.name}</span>
                {duplicate.city ? ` (${duplicate.city})` : ''}
              </div>
              <button
                type="button"
                onClick={() => onSelectExisting(duplicate.id)}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-900 text-white rounded-md hover:bg-amber-800 shrink-0 cursor-pointer"
              >
                {t.openExisting}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.companyNameLabel}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.companyNamePlaceholder}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.categoryLabel}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryId)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[lang][cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.cityLabel}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t.cityPlaceholder}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.websiteLabel}
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t.websitePlaceholder}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.phoneLabel}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+380..."
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@company.ua"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.descriptionLabel}
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !description.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? t.submitting : t.submitCompany}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
