const GEMINI_KEY_STORAGE = 'otzyvtop_gemini_api_key';
const GEMINI_MODEL = 'gemini-2.5-flash';

export function getSavedGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function saveGeminiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
  } catch {
    // ignore storage errors
  }
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error('Укажите Gemini API Key в настройках админки');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Пустой ответ от Gemini API');
  }
  return text.trim();
}

export interface AiModerationResult {
  verdict: 'approve' | 'review' | 'reject';
  reason: string;
}

export async function moderateReviewWithGemini(
  text: string,
  pros: string,
  cons: string,
  apiKey = getSavedGeminiKey(),
): Promise<AiModerationResult> {
  const prompt = `Ты модератор сайта отзывов о компаниях и мошенниках.
Проверь отзыв.
ВАЖНО: номера банковских карт, телефоны, сайты и реквизиты МОШЕННИКОВ публиковать МОЖНО — НЕ считай их нарушением.
Отклоняй или отправляй на проверку ТОЛЬКО: рекламный спам (промокоды, пиар сторонних услуг), бессмысленный набор символов, заказные шаблонные фейки, экстремизм.

Отзыв:
Плюсы: ${pros || '-'}
Минусы: ${cons || '-'}
Текст: ${text}

Ответь строго в JSON: {"verdict": "approve" | "review" | "reject", "reason": "краткая причина на русском"}`;

  const raw = await callGemini(prompt, apiKey);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as AiModerationResult;
      if (parsed.verdict && parsed.reason) return parsed;
    } catch {
      // fallback below
    }
  }
  return { verdict: 'review', reason: raw.slice(0, 200) };
}

export async function summarizeCompanyReviews(
  companyName: string,
  reviewTexts: string[],
  apiKey = getSavedGeminiKey(),
): Promise<string> {
  const sample = reviewTexts.slice(0, 30).join('\n---\n');
  const prompt = `Проанализируй отзывы о компании "${companyName}" и составь краткую структурированную сводку на русском языке:
1. Главные плюсы (2-3 пункта)
2. Главные минусы (2-3 пункта)
3. Общий вывод (1-2 предложения)

Отзывы:
${sample}`;

  return callGemini(prompt, apiKey);
}

export async function draftComplaintReply(
  companyName: string,
  complaintText: string,
  apiKey = getSavedGeminiKey(),
): Promise<string> {
  const prompt = `Составь вежливый, нейтральный и юридически корректный ответ администратора сайта отзывов представителю компании "${companyName}" на их жалобу:
"${complaintText}"

Ответ должен объяснять, что платформа публикует оценочные суждения пользователей, и предлагать оставить официальный ответ представителя или предоставить документы, если отзыв содержит ложные факты.`;

  return callGemini(prompt, apiKey);
}
