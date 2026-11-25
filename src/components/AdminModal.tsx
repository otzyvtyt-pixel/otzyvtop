import { useEffect, useState } from 'react';
import { Check, CloudArrowUp, ShieldCheck, Trash, X } from '@phosphor-icons/react';
import type { Language, ModerationStatus, Review, ReviewComment } from '../types.ts';
import { UI_TEXT } from '../i18n.ts';
import { database, type ImportProgress } from '../services/database.ts';
import {
  getSavedGeminiKey,
  moderateReviewWithGemini,
  saveGeminiKey,
  type AiModerationResult,
} from '../services/geminiAdmin.ts';

interface AdminModalProps {
  lang: Language;
  onClose: () => void;
  onDataChanged: () => void;
}

export function AdminModal({ lang, onClose, onDataChanged }: AdminModalProps) {
  const t = UI_TEXT[lang];
  const [tab, setTab] = useState<'moderation' | 'import' | 'ai'>('moderation');
  const [geminiKey, setGeminiKey] = useState(() => getSavedGeminiKey());
  const [geminiSavedNotice, setGeminiSavedNotice] = useState(false);
  const [aiCheckingId, setAiCheckingId] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, AiModerationResult>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [seeded, setSeeded] = useState<boolean | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoadingQueue(true);
    setActionError(null);
    try {
      const [queue, isSeeded] = await Promise.all([
        database.getModerationQueue(),
        database.isFirestoreSeeded(),
      ]);
      setReviews(queue.reviews);
      setComments(queue.comments);
      setSeeded(isSeeded);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const handleModerateReview = async (reviewId: string, status: ModerationStatus) => {
    setActionError(null);
    try {
      await database.moderateReview(reviewId, status);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status } : r)));
      onDataChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка модерации');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setActionError(null);
    try {
      await database.deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      onDataChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleModerateComment = async (commentId: string, status: ModerationStatus) => {
    setActionError(null);
    try {
      await database.moderateComment(commentId, status);
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, status } : c)));
      onDataChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка модерации');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setActionError(null);
    try {
      await database.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onDataChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    setImportResult(null);
    setActionError(null);
    try {
      const res = await database.importCatalogToFirestore((p) => setProgress(p));
      setSeeded(true);
      setImportResult(
        `Готово: импортировано ${res.companiesImported} компаний и ${res.shardsImported} индексов категорий.`,
      );
      onDataChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setImporting(false);
    }
  };

  const pendingReviewsCount = reviews.filter((r) => r.status === 'pending').length;
  const pendingCommentsCount = comments.filter((c) => c.status === 'pending').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 backdrop-blur-[2px] p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-xl my-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck weight="duotone" className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">{t.adminPanelTitle}</h2>
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

        <div className="px-6 pt-4 border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('moderation')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-colors cursor-pointer ${
              tab === 'moderation'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.adminModerationTab} ({pendingReviewsCount + pendingCommentsCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-colors cursor-pointer ${
              tab === 'import'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.adminImportTab}
          </button>
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-colors cursor-pointer ${
              tab === 'ai'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            AI / Настройки
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {actionError}
            </div>
          )}

          {tab === 'moderation' ? (
            loadingQueue ? (
              <div className="py-12 text-center text-sm text-slate-500">Загрузка...</div>
            ) : reviews.length === 0 && comments.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">
                {t.noPendingItems}
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {t.reviewsSectionTitle} ({reviews.length})
                    </h3>
                    <div className="space-y-3">
                      {reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-slate-900">{rev.author}</span>
                              <span className="text-slate-400">·</span>
                              <span className="font-mono text-slate-600">#{rev.companyId}</span>
                              <span className="text-slate-400">·</span>
                              <span className="font-semibold text-amber-600">{rev.rating} ★</span>
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                  rev.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rev.status === 'rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {rev.status || 'approved'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {rev.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleModerateReview(rev.id, 'approved')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t.approveBtn}</span>
                                </button>
                              )}
                              {rev.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleModerateReview(rev.id, 'rejected')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{t.rejectBtn}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                              >
                                <Trash className="w-3.5 h-3.5" />
                                <span>{t.deleteBtn}</span>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{rev.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {comments.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Комментарии ({comments.length})
                    </h3>
                    <div className="space-y-2.5">
                      {comments.map((cmt) => (
                        <div
                          key={cmt.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-slate-900">{cmt.author}</span>
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                  cmt.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : cmt.status === 'rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {cmt.status || 'approved'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {cmt.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleModerateComment(cmt.id, 'approved')}
                                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                                >
                                  {t.approveBtn}
                                </button>
                              )}
                              {cmt.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleModerateComment(cmt.id, 'rejected')}
                                  className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 cursor-pointer"
                                >
                                  {t.rejectBtn}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(cmt.id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                              >
                                {t.deleteBtn}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-700">{cmt.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-950/10 bg-emerald-50/50 space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  {seeded ? t.importDoneStatus : 'Firestore каталог ещё не импортирован'}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{t.importCatalogDesc}</p>
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{progress.stage}</span>
                    <span className="font-mono tabular-nums">
                      {Math.round((progress.current / Math.max(1, progress.total)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-200"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((progress.current / Math.max(1, progress.total)) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {importResult && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
                  {importResult}
                </div>
              )}

              <button
                type="button"
                disabled={importing}
                onClick={handleImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <CloudArrowUp weight="duotone" className="w-4 h-4" aria-hidden="true" />
                <span>{importing ? 'Импорт...' : t.importCatalogBtn}</span>
              </button>
            </div>
          )}

          {tab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Google Gemini API Key (для AI-модерации)
                </h3>
                <p className="text-xs text-slate-600">
                  Ключ сохраняется только в localStorage вашего браузера и не попадает в публичный код.
                  AI проверяет отзывы на спам/рекламу, но разрешает публикацию карт и телефонов мошенников.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      saveGeminiKey(geminiKey);
                      setGeminiSavedNotice(true);
                      setTimeout(() => setGeminiSavedNotice(false), 2500);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 cursor-pointer"
                  >
                    Сохранить ключ
                  </button>
                </div>
                {geminiSavedNotice && (
                  <div className="text-xs font-medium text-emerald-700">
                    Ключ сохранён локально.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
