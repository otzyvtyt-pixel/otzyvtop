import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck,
  ChatCenteredText,
  Check,
  CheckCircle,
  Code,
  Copy,
  EnvelopeSimple,
  Globe,
  MapPin,
  PencilSimpleLine,
  Phone,
  ShieldWarning,
  ThumbsDown,
  ThumbsUp,
  Warning,
} from '@phosphor-icons/react';
import type { CategoryId, Company, CompanyDetail, Language, Review } from '../types.ts';
import { CATEGORY_LABELS, UI_TEXT, localizeActiveYears } from '../i18n.ts';
import { buildCompanyPath, buildRouteUrl, citySlug } from '../utils/seoSlug.ts';
import { localizeCity } from '../utils/cityLocalization.ts';
import { CompanyLogo } from './CompanyLogo.tsx';
import { CompanyCard } from './CompanyCard.tsx';
import { StarRating } from './StarRating.tsx';
import {
  CategoryIcon,
  CATEGORY_TILE_BASE,
  SCAMMER_TILE_BASE,
} from './CategoryIcon.tsx';
import { VerifiedShieldIcon } from './PremiumIcons.tsx';

interface CompanyPageProps {
  companyId: number;
  lang: Language;
  onBackToCatalog: (category?: CategoryId, city?: string) => void;
  onNavigateHome: () => void;
  onOpenCompany: (company: Company) => void;
  onCompanyUpdated: () => void;
}

export function CompanyPage({
  companyId,
  lang,
  onBackToCatalog,
  onNavigateHome,
  onOpenCompany,
  onCompanyUpdated,
}: CompanyPageProps) {
  const t = UI_TEXT[lang];
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | 'widget' | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);

  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [confirmedPurchase, setConfirmedPurchase] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyOfficial, setReplyOfficial] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'oldest' | 'rating' | 'helpful'>('newest');

  const loadDetail = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/companies/${companyId}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = (await res.json()) as CompanyDetail;
      setDetail(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleCopy = async (field: 'phone' | 'email' | 'widget', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1600);
    } catch {
      // clipboard unavailable
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author,
          rating,
          pros,
          cons,
          text,
          confirmedPurchase,
        }),
      });
      if (!res.ok) throw new Error('Submit failed');
      setAuthor('');
      setRating(5);
      setPros('');
      setCons('');
      setConfirmedPurchase(false);
      setText('');
      await loadDetail();
      onCompanyUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (reviewId: string, vote: 'up' | 'down') => {
    const res = await fetch(`/api/reviews/${reviewId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote }),
    });
    if (!res.ok || !detail) return;
    const updated = (await res.json()) as Review;
    setDetail({
      ...detail,
      reviews: detail.reviews.map((r) => (r.id === reviewId ? updated : r)),
    });
  };

  const handleReplySubmit = async (reviewId: string, e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const res = await fetch(`/api/reviews/${reviewId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: replyAuthor,
        text: replyText,
        isOfficialReply: replyOfficial,
      }),
    });
    if (!res.ok) return;
    setReplyAuthor('');
    setReplyText('');
    setReplyOfficial(false);
    setReplyOpenId(null);
    await loadDetail();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-5 w-48 bg-emerald-100/70 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-emerald-950/10 rounded-2xl p-8 space-y-4">
            <div className="h-8 w-1/2 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-24 w-full bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="bg-white border border-emerald-950/10 rounded-2xl p-6 h-56 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg font-semibold text-slate-900">{t.errorTitle}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={loadDetail}
            className="px-4 py-2 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
          >
            {t.retryBtn}
          </button>
          <button
            type="button"
            onClick={() => onBackToCatalog()}
            className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            {t.backToCatalog}
          </button>
        </div>
      </div>
    );
  }

  const isScammer = detail.category === 'scammers';
  const isClosed = detail.status === 'closed';
  const isDefunctScammer = isScammer && detail.scamActive === false;
  const localizedCity = localizeCity(detail.city, lang);
  const formattedCheckDate = detail.lastCheckedAt
    ? detail.lastCheckedAt.split('-').reverse().join('.')
    : '';
  const formattedActiveYears = localizeActiveYears(detail.activeYears, lang);
  const websiteStatusLabel =
    detail.websiteStatus === 'ok' || detail.websiteStatus === 'protected'
      ? t.websiteOkLabel
      : detail.websiteStatus === 'offline' || detail.websiteStatus === 'timeout'
        ? t.websiteOfflineLabel
        : detail.websiteStatus === 'parked'
          ? t.websiteParkedLabel
          : '';

  const homeHref = buildRouteUrl({ view: 'home' }, lang);
  const catHref = buildRouteUrl({ view: 'catalog', category: detail.category }, lang);
  const companyFullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${buildCompanyPath(detail.name, detail.id, lang)}`
      : buildCompanyPath(detail.name, detail.id, lang);

  const widgetSnippet = `<a href="${companyFullUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid #059669;border-radius:10px;background:#ecfdf5;color:#064e3b;font-family:sans-serif;font-size:13px;font-weight:700;text-decoration:none;">★ ${detail.averageRating.toFixed(1)} · ${detail.reviewCount} ${lang === 'ua' ? 'відгуків на' : 'отзывов на'} OtzyvTop</a>`;

  const contactParts = [
    detail.domain ? `${lang === 'ua' ? 'сайт' : 'сайт'} ${detail.domain}` : '',
    detail.phone ? `${lang === 'ua' ? 'телефон' : 'телефон'} ${detail.phone}` : '',
    detail.email ? `email ${detail.email}` : '',
  ].filter(Boolean);

  const faqItems =
    lang === 'ua'
      ? [
          {
            q: `Який рейтинг та кількість відгуків у ${detail.name}?`,
            a: `На платформі OtzyvTop компанія ${detail.name} має рейтинг ${detail.averageRating.toFixed(1)} з 5 на основі ${detail.reviewCount} відгуків.${formattedCheckDate ? ` Актуальність даних і сайту перевірено ${formattedCheckDate}.` : ''}`,
          },
          {
            q: `Які контакти вказані для ${detail.name}?`,
            a: contactParts.length
              ? `У картці компанії зафіксовані: ${contactParts.join(', ')}${localizedCity ? ` (${localizedCity})` : ''}.`
              : `Офіційні контакти ${detail.name} уточнюються або відсутні у відкритому доступі.`,
          },
          {
            q: isScammer
              ? `Чи є скарги на шахрайство щодо ${detail.name}?`
              : `Чи працює ${detail.name} зараз та як перевірити перед оплатою?`,
            a: isScammer
              ? isDefunctScammer
                ? `Так, запис внесено до реєстру скарг («Шахраї»). За даними перевірки ${formattedCheckDate || '24.11.2026'} сайт або проєкт уже не працює (${formattedActiveYears || 'архів'}). Відгуки нижче відображають період його активності.`
                : `Так, запис внесено до реєстру скарг («Шахраї»), а ресурс залишається активним станом на ${formattedCheckDate || '24.11.2026'}. Перед будь-якими переказами перевіряйте юридичні реквізити та не надсилайте передоплату без офіційного договору.`
              : `${websiteStatusLabel ? `Статус перевірки: ${websiteStatusLabel}${formattedActiveYears ? ` (${formattedActiveYears})` : ''}. ` : ''}Перед оплатою звірте домен, телефон і прочитайте свіжі відгуки клієнтів за датами у профілі компанії.`,
          },
          {
            q: `Як залишити відгук або офіційну відповідь від ${detail.name}?`,
            a: `Опублікуйте оцінку у формі вище. Представник компанії може відповісти на будь-який відгук із позначкою «Офіційна відповідь компанії».`,
          },
        ]
      : [
          {
            q: `Какой рейтинг и сколько отзывов у ${detail.name}?`,
            a: `На платформе OtzyvTop компания ${detail.name} имеет рейтинг ${detail.averageRating.toFixed(1)} из 5 на основе ${detail.reviewCount} отзывов.${formattedCheckDate ? ` Актуальность данных и сайта проверена ${formattedCheckDate}.` : ''}`,
          },
          {
            q: `Какие контакты указаны для ${detail.name}?`,
            a: contactParts.length
              ? `В карточке компании указаны: ${contactParts.join(', ')}${localizedCity ? ` (${localizedCity})` : ''}.`
              : `Официальные контакты ${detail.name} уточняются или отсутствуют в открытом доступе.`,
          },
          {
            q: isScammer
              ? `Есть ли жалобы на мошенничество у ${detail.name}?`
              : `Работает ли ${detail.name} сейчас и как проверить до оплаты?`,
            a: isScammer
              ? isDefunctScammer
                ? `Да, компания находится в реестре жалоб («Мошенники»). По данным проверки ${formattedCheckDate || '24.11.2026'} сайт или проект больше не работает (${formattedActiveYears || 'архив'}), а отзывы датированы периодом прежней активности.`
                : `Да, компания находится в реестре жалоб («Мошенники»), и проект остаётся активным на ${formattedCheckDate || '24.11.2026'}. Перед любыми переводами проверяйте юридические реквизиты и избегайте предоплаты на карты физлиц.`
              : `${websiteStatusLabel ? `Статус проверки: ${websiteStatusLabel}${formattedActiveYears ? ` (${formattedActiveYears})` : ''}. ` : ''}Перед оплатой сверьте официальный домен, телефон и изучите свежие отзывы клиентов по датам в этом профиле.`,
          },
          {
            q: `Как оставить отзыв или официальный ответ от ${detail.name}?`,
            a: `Вы можете опубликовать оценку в форме выше. Представитель компании может ответить на любой комментарий с отметкой «Официальный ответ компании».`,
          },
        ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb & Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
          <a
            href={homeHref}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            className="hover:text-emerald-700 transition-colors shrink-0"
          >
            {t.navHome}
          </a>
          <span aria-hidden="true">/</span>
          <a
            href={catHref}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onBackToCatalog(detail.category);
              }
            }}
            className="hover:text-emerald-700 transition-colors truncate"
          >
            {CATEGORY_LABELS[lang][detail.category]}
          </a>
          {detail.city && citySlug(detail.city) && (
            <>
              <span aria-hidden="true">/</span>
              <a
                href={buildRouteUrl(
                  { view: 'catalog', category: detail.category, citySlug: citySlug(detail.city) },
                  lang,
                )}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    onBackToCatalog(detail.category, detail.city);
                  }
                }}
                className="hover:text-emerald-700 transition-colors shrink-0"
              >
                {localizedCity}
              </a>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="text-slate-800 font-medium truncate">{detail.name}</span>
        </nav>

        <a
          href={catHref}
          onClick={(e) => {
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
              e.preventDefault();
              onBackToCatalog(detail.category);
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-emerald-950/10 rounded-lg hover:border-emerald-600/40 hover:text-emerald-800 transition-colors shrink-0"
        >
          <ArrowLeft weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.backToCatalog}</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Header & Description */}
          <section className="bg-white border border-emerald-950/10 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-gradient-to-b from-emerald-50/60 to-white px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-emerald-950/10">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <CompanyLogo name={detail.name} logoUrl={detail.logoUrl} size="lg" />
                  <div className="space-y-2 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {detail.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                        <span
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                            isScammer ? SCAMMER_TILE_BASE : CATEGORY_TILE_BASE
                          }`}
                        >
                          <CategoryIcon category={detail.category} className="w-3.5 h-3.5" />
                        </span>
                        {CATEGORY_LABELS[lang][detail.category]}
                      </span>
                      {localizedCity && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{localizedCity}</span>
                        </>
                      )}
                      {formattedActiveYears && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums text-slate-600">{formattedActiveYears}</span>
                        </>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isScammer || isClosed ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        <span aria-hidden="true" className="text-slate-400 font-normal">·</span>
                        {isScammer ? (
                          <ShieldWarning weight="duotone" className="w-4 h-4" aria-hidden="true" />
                        ) : isClosed ? (
                          <Warning weight="duotone" className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <CheckCircle weight="duotone" className="w-4 h-4" aria-hidden="true" />
                        )}
                        {isScammer
                          ? isDefunctScammer
                            ? `${t.statusScammer} · ${t.scamDefunctStatus}`
                            : `${t.statusScammer} · ${t.scamActiveStatus}`
                          : isClosed
                            ? t.statusClosed
                            : t.statusActive}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById('write-review-form');
                    form?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer"
                >
                  <PencilSimpleLine weight="regular" className="w-4 h-4" aria-hidden="true" />
                  <span>{t.writeReviewAction}</span>
                </button>
              </div>
            </div>

            <div className="px-6 sm:px-8 py-6 space-y-5">
              <p className="text-[15px] leading-relaxed text-slate-700">
                {detail.description}
              </p>

              {detail.statusNote && (
                <div
                  className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                    isScammer || isClosed
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-emerald-50/60 border-emerald-900/10 text-emerald-950'
                  }`}
                >
                  {isScammer || isClosed ? (
                    <ShieldWarning
                      weight="duotone"
                      className="w-4 h-4 shrink-0 mt-0.5 text-rose-700"
                      aria-hidden="true"
                    />
                  ) : (
                    <VerifiedShieldIcon className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                  )}
                  <div>
                    <span className="font-semibold">{t.verificationNote}: </span>
                    {detail.statusNote}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Rating Summary & Animated Distribution Bars */}
          <section className="bg-white border border-emerald-950/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-slate-900">{t.ratingSummary}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              <div className="sm:border-r sm:border-slate-100 sm:pr-6 space-y-2">
                <div className="text-4xl font-extrabold text-slate-900 tabular-nums">
                  {detail.reviewCount > 0 ? detail.averageRating.toFixed(1) : '—'}
                </div>
                <StarRating rating={detail.averageRating} size="md" />
                <p className="text-xs text-slate-500 tabular-nums">
                  {detail.reviewCount > 0
                    ? t.reviewsCount(detail.reviewCount)
                    : t.noReviewsYet}
                </p>
              </div>

              <div className="sm:col-span-2 space-y-2">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = detail.ratingBreakdown[star] || 0;
                  const pct =
                    detail.reviewCount > 0
                      ? Math.round((count / detail.reviewCount) * 100)
                      : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="w-9 font-mono text-slate-600 tabular-nums">
                        {star} ★
                      </span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full rating-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-slate-500 tabular-nums">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Write Review Form */}
          <section
            id="write-review-form"
            className="bg-white border border-emerald-950/10 rounded-2xl p-6 sm:p-8 shadow-xs"
          >
            <form onSubmit={handleSubmitReview} className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">{t.writeReviewTitle}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t.yourName}
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t.yourRating}
                  </label>
                  <div className="pt-0.5">
                    <StarRating
                      rating={rating}
                      size="lg"
                      interactive
                      labels={t.ratingScale}
                      onChange={setRating}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t.prosLabel}
                  </label>
                  <input
                    type="text"
                    value={pros}
                    onChange={(e) => setPros(e.target.value)}
                    placeholder={t.prosPlaceholder}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t.consLabel}
                  </label>
                  <input
                    type="text"
                    value={cons}
                    onChange={(e) => setCons(e.target.value)}
                    placeholder={t.consPlaceholder}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t.reviewTextLabel}
                </label>
                <textarea
                  required
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.reviewTextPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedPurchase}
                    onChange={(e) => setConfirmedPurchase(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <span>{t.confirmedPurchaseLabel}</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting || !text.trim()}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {submitting ? t.submitting : t.submitReview}
                </button>
              </div>
            </form>
          </section>

          {/* Reviews Feed */}
          <section className="bg-white border border-emerald-950/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900">
                  {t.reviewsSectionTitle}
                </h2>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {detail.reviews.length}
                </span>
              </div>

              {detail.reviews.length > 1 && (
                <select
                  aria-label={t.sortLabel}
                  value={reviewSort}
                  onChange={(e) =>
                    setReviewSort(
                      e.target.value as 'newest' | 'oldest' | 'rating' | 'helpful',
                    )
                  }
                  className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="newest">{t.reviewSortNewest}</option>
                  <option value="oldest">{t.reviewSortOldest}</option>
                  <option value="rating">{t.reviewSortRating}</option>
                  <option value="helpful">{t.reviewSortHelpful}</option>
                </select>
              )}
            </div>

            {(isDefunctScammer || (isClosed && !isScammer)) && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 leading-relaxed flex items-start gap-2.5">
                <Warning weight="duotone" className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t.archiveReviewsNotice(formattedCheckDate)}</span>
              </div>
            )}

            {isScammer && detail.scamActive === true && (
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-950 leading-relaxed flex items-start gap-2.5">
                <ShieldWarning weight="duotone" className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t.scamActiveNotice(formattedCheckDate)}</span>
              </div>
            )}

            {detail.reviews.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-emerald-200 rounded-xl bg-emerald-50/30 px-4">
                <p className="text-sm font-semibold text-slate-800">
                  {t.noCompanyReviewsTitle}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {t.noCompanyReviewsDesc}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...detail.reviews]
                  .sort((a, b) => {
                    if (reviewSort === 'oldest') {
                      return a.createdAt.localeCompare(b.createdAt);
                    }
                    if (reviewSort === 'rating') {
                      return (
                        b.rating - a.rating ||
                        b.createdAt.localeCompare(a.createdAt)
                      );
                    }
                    if (reviewSort === 'helpful') {
                      return (
                        b.helpfulCount - a.helpfulCount ||
                        b.createdAt.localeCompare(a.createdAt)
                      );
                    }
                    return b.createdAt.localeCompare(a.createdAt);
                  })
                  .map((rev) => (
                  <article key={rev.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5 text-sm">
                        <span className="font-semibold text-slate-900">
                          {rev.author}
                        </span>
                        {rev.confirmedPurchase && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <VerifiedShieldIcon className="w-3.5 h-3.5" />
                              {t.confirmedBadge}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>
                      <StarRating rating={rev.rating} size="sm" />
                    </div>

                    <p className="text-sm text-slate-800 leading-relaxed">{rev.text}</p>

                    {(rev.pros || rev.cons) && (
                      <div className="space-y-1 text-xs">
                        {rev.pros && (
                          <p className="text-emerald-800">
                            <span className="font-semibold">{t.prosPrefix} </span>
                            {rev.pros}
                          </p>
                        )}
                        {rev.cons && (
                          <p className="text-rose-800">
                            <span className="font-semibold">{t.consPrefix} </span>
                            {rev.cons}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleVote(rev.id, 'up')}
                        className="inline-flex items-center gap-1.5 hover:text-emerald-700 transition-colors cursor-pointer tabular-nums"
                      >
                        <ThumbsUp weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {t.helpful} ({rev.helpfulCount})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVote(rev.id, 'down')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer tabular-nums"
                      >
                        <ThumbsDown weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {t.unhelpful} ({rev.unhelpfulCount})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReplyOpenId(replyOpenId === rev.id ? null : rev.id)
                        }
                        className="inline-flex items-center gap-1.5 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        <ChatCenteredText weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.reply}</span>
                      </button>
                    </div>

                    {rev.comments.length > 0 && (
                      <div className="pl-4 ml-1 border-l border-emerald-200 space-y-3 pt-2">
                        {rev.comments.map((cmt) => (
                          <div
                            key={cmt.id}
                            className={`text-xs space-y-1 ${
                              cmt.isOfficialReply
                                ? 'p-3 rounded-xl bg-emerald-50/70 border border-emerald-100'
                                : ''
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2 text-slate-500">
                              <span className="font-semibold text-slate-900">
                                {cmt.author}
                              </span>
                              {cmt.isOfficialReply && (
                                <span className="font-semibold text-emerald-700">
                                  · {t.officialReplyLabel}
                                </span>
                              )}
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {formatDate(cmt.createdAt)}
                              </span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{cmt.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyOpenId === rev.id && (
                      <form
                        onSubmit={(e) => handleReplySubmit(rev.id, e)}
                        className="pt-2 space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            value={replyAuthor}
                            onChange={(e) => setReplyAuthor(e.target.value)}
                            placeholder={t.namePlaceholder}
                            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                          />
                          <input
                            type="text"
                            required
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={t.replyPlaceholder}
                            className="sm:col-span-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={replyOfficial}
                              onChange={(e) => setReplyOfficial(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600"
                            />
                            <span>{t.officialReplyOption}</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setReplyOpenId(null)}
                              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              {t.cancel}
                            </button>
                            <button
                              type="submit"
                              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                            >
                              {t.sendReply}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Dynamic SEO FAQ Block (matches JSON-LD FAQPage) */}
          <section className="bg-white border border-emerald-950/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t.faqTitle}</h2>
            <div className="divide-y divide-slate-100">
              {faqItems.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Related Companies Internal Cross-Linking */}
          {detail.relatedCompanies && detail.relatedCompanies.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                {isScammer ? t.relatedScammersTitle : t.relatedCompaniesTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detail.relatedCompanies.map((rel) => (
                  <CompanyCard
                    key={rel.id}
                    company={rel}
                    lang={lang}
                    onOpen={onOpenCompany}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sticky Contacts Sidebar */}
        <aside className="bg-white border border-emerald-950/10 rounded-2xl p-6 shadow-xs space-y-5 lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-slate-900">{t.contactsTitle}</h2>

          {detail.website &&
            detail.websiteStatus !== 'offline' &&
            detail.websiteStatus !== 'parked' && (
              <a
                href={detail.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <span>{t.openWebsite}</span>
                <ArrowUpRight weight="regular" className="w-4 h-4" aria-hidden="true" />
              </a>
            )}

          <dl className="space-y-3.5 text-sm pt-1">
            {detail.domain && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/[0.035] border border-emerald-900/10 flex items-center justify-center shrink-0">
                  <Globe weight="duotone" className="w-4 h-4 text-emerald-800" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500">{t.website}</dt>
                  <dd className="font-mono text-xs text-slate-800 truncate">
                    {detail.domain}
                  </dd>
                </div>
              </div>
            )}

            {detail.phone && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/[0.035] border border-emerald-900/10 flex items-center justify-center shrink-0">
                    <Phone weight="duotone" className="w-4 h-4 text-emerald-800" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] text-slate-500">{t.phone}</dt>
                    <dd className="font-mono text-xs text-slate-800 tabular-nums truncate">
                      <a
                        href={`tel:${detail.phone}`}
                        className="hover:text-emerald-700 hover:underline"
                      >
                        {detail.phone}
                      </a>
                    </dd>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('phone', detail.phone)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer"
                  aria-label={t.copyLabel}
                >
                  {copiedField === 'phone' ? (
                    <Check weight="bold" className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Copy weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            )}

            {detail.email && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/[0.035] border border-emerald-900/10 flex items-center justify-center shrink-0">
                    <EnvelopeSimple weight="duotone" className="w-4 h-4 text-emerald-800" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] text-slate-500">{t.email}</dt>
                    <dd className="text-xs text-slate-800 truncate">
                      <a
                        href={`mailto:${detail.email}`}
                        className="hover:text-emerald-700 hover:underline"
                      >
                        {detail.email}
                      </a>
                    </dd>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('email', detail.email)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer"
                  aria-label={t.copyLabel}
                >
                  {copiedField === 'email' ? (
                    <Check weight="bold" className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Copy weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            )}

            {localizedCity && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/[0.035] border border-emerald-900/10 flex items-center justify-center shrink-0">
                  <MapPin weight="duotone" className="w-4 h-4 text-emerald-800" aria-hidden="true" />
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">{t.city}</dt>
                  <dd className="text-xs font-medium text-slate-800">
                    {localizedCity}
                  </dd>
                </div>
              </div>
            )}

            {(formattedCheckDate || formattedActiveYears) && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/[0.035] border border-emerald-900/10 flex items-center justify-center shrink-0">
                  <CalendarCheck weight="duotone" className="w-4 h-4 text-emerald-800" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500">{t.lastCheckedLabel}</dt>
                  <dd className="text-xs font-medium text-slate-800 tabular-nums">
                    {[formattedCheckDate, websiteStatusLabel, formattedActiveYears]
                      .filter(Boolean)
                      .join(' · ')}
                  </dd>
                </div>
              </div>
            )}

            {!detail.website && !detail.phone && !detail.email && (
              <p className="text-xs text-slate-500">{t.noContactsNote}</p>
            )}
          </dl>

          {detail.socials.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <p className="text-xs font-medium text-slate-500">{t.socials}</p>
              <div className="flex flex-wrap gap-2">
                {detail.socials.map((soc, idx) => (
                  <a
                    key={idx}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-950/[0.035] text-emerald-900 border border-emerald-900/10 rounded-lg hover:bg-emerald-700 hover:text-white transition-colors"
                  >
                    <span>{soc.label}</span>
                    <ArrowUpRight weight="regular" className="w-3 h-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {!isScammer && (
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <button
                type="button"
                onClick={() => setWidgetOpen((v) => !v)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50/80 border border-emerald-900/10 rounded-xl hover:bg-emerald-100/80 transition-colors cursor-pointer"
              >
                <Code weight="duotone" className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>{t.ownerBadgeBtn}</span>
              </button>

              {widgetOpen && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <p className="text-xs font-bold text-slate-900">{t.ownerBadgeTitle}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {t.ownerBadgeDesc}
                  </p>
                  <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] text-slate-700 break-all max-h-24 overflow-y-auto">
                    {widgetSnippet}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('widget', widgetSnippet)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
                  >
                    {copiedField === 'widget' ? (
                      <>
                        <Check weight="bold" className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy weight="regular" className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.copyHtmlCode}</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {t.officialClaimHint}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 tabular-nums">
            <span>
              {t.catalogId}: #{detail.id}
            </span>
            <span>{detail.sourceBatch}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
