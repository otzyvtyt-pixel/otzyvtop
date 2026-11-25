import type { CategoryId, Language } from '../types.ts';

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  ґ: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  є: 'ye',
  ж: 'zh',
  з: 'z',
  и: 'i',
  і: 'i',
  ї: 'yi',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function transliterate(input: string): string {
  const lower = input.toLowerCase().trim();
  let out = '';
  for (const ch of lower) {
    if (ch in CYRILLIC_MAP) {
      out += CYRILLIC_MAP[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else {
      out += '-';
    }
  }
  return out
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function companySlug(name: string, id: number): string {
  const base = transliterate(name) || 'company';
  return `${base}-${id}`;
}

export function citySlug(city: string): string {
  return transliterate(city);
}

export function parseCompanyIdFromSlug(slugParam: string): number | null {
  const m = slugParam.match(/-(\d+)$/) || slugParam.match(/^(\d+)$/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export type AppRoute =
  | { view: 'home' }
  | { view: 'catalog'; category?: CategoryId | 'all'; citySlug?: string }
  | { view: 'company'; companyId: number }
  | { view: 'ratings'; guideSlug?: string };

export const VALID_CATEGORY_IDS: CategoryId[] = [
  'beauty',
  'shops',
  'finance',
  'auto',
  'travel',
  'education',
  'realestate',
  'it',
  'delivery',
  'food',
  'scammers',
];

export function buildRouteUrl(route: AppRoute, lang: Language): string {
  const prefix = lang === 'ua' ? '/ua' : '';
  if (route.view === 'home') {
    return prefix || '/';
  }
  if (route.view === 'ratings') {
    return route.guideSlug
      ? `${prefix}/ratings/${encodeURIComponent(route.guideSlug)}`
      : `${prefix}/ratings`;
  }
  if (route.view === 'company') {
    return `${prefix}/company/${route.companyId}`;
  }
  const cat = route.category && route.category !== 'all' ? route.category : null;
  if (cat && route.citySlug) {
    return `${prefix}/category/${cat}/${encodeURIComponent(route.citySlug)}`;
  }
  if (cat) {
    return `${prefix}/category/${cat}`;
  }
  if (route.citySlug) {
    return `${prefix}/city/${encodeURIComponent(route.citySlug)}`;
  }
  return `${prefix}/catalog`;
}

export function buildCompanyPath(name: string, id: number, lang: Language): string {
  const prefix = lang === 'ua' ? '/ua' : '';
  return `${prefix}/company/${companySlug(name, id)}`;
}

export function parseLocationPath(pathname: string): { lang: Language; route: AppRoute } {
  let clean = pathname.replace(/\/+$/, '') || '/';
  let lang: Language = 'ru';
  if (clean === '/ua' || clean.startsWith('/ua/')) {
    lang = 'ua';
    clean = clean.slice(3) || '/';
  }

  if (clean === '/' || clean === '') {
    return { lang, route: { view: 'home' } };
  }

  const companyMatch = clean.match(/^\/company\/([^/]+)$/);
  if (companyMatch) {
    const id = parseCompanyIdFromSlug(decodeURIComponent(companyMatch[1]));
    if (id) return { lang, route: { view: 'company', companyId: id } };
  }

  const catCityMatch = clean.match(/^\/category\/([^/]+)\/([^/]+)$/);
  if (catCityMatch) {
    const cat = catCityMatch[1] as CategoryId;
    if (VALID_CATEGORY_IDS.includes(cat)) {
      return {
        lang,
        route: {
          view: 'catalog',
          category: cat,
          citySlug: decodeURIComponent(catCityMatch[2]),
        },
      };
    }
  }

  const catMatch = clean.match(/^\/category\/([^/]+)$/);
  if (catMatch) {
    const cat = catMatch[1] as CategoryId;
    if (VALID_CATEGORY_IDS.includes(cat)) {
      return { lang, route: { view: 'catalog', category: cat } };
    }
  }

  const cityMatch = clean.match(/^\/city\/([^/]+)$/);
  if (cityMatch) {
    return {
      lang,
      route: {
        view: 'catalog',
        category: 'all',
        citySlug: decodeURIComponent(cityMatch[1]),
      },
    };
  }

  const ratingGuideMatch = clean.match(/^\/ratings\/([^/]+)$/);
  if (ratingGuideMatch) {
    return {
      lang,
      route: { view: 'ratings', guideSlug: decodeURIComponent(ratingGuideMatch[1]) },
    };
  }

  if (clean === '/ratings') {
    return { lang, route: { view: 'ratings' } };
  }

  if (clean === '/catalog') {
    return { lang, route: { view: 'catalog', category: 'all' } };
  }

  return { lang, route: { view: 'home' } };
}

export interface RatingGuideMeta {
  slug: string;
  category: CategoryId;
  city?: string;
  titleRu: string;
  titleUa: string;
  descRu: string;
  descUa: string;
  isBlacklist?: boolean;
}

export const RATING_GUIDES: RatingGuideMeta[] = [
  {
    slug: 'top-beauty-kiev',
    category: 'beauty',
    city: 'Киев',
    titleRu: 'Топ-15 клиник красоты и стоматологий Киева по отзывам (2026)',
    titleUa: 'Топ-15 клінік краси та стоматологій Києва за відгуками (2026)',
    descRu: 'Независимый рейтинг медицинских центров, стоматологий и салонов Киева на основе отзывов и подтверждённых контактов.',
    descUa: 'Незалежний рейтинг медичних центрів, стоматологій та салонів Києва на основі відгуків і підтверджених контактів.',
  },
  {
    slug: 'top-auto-service',
    category: 'auto',
    titleRu: 'Рейтинг проверенных автосервисов и компаний автоподбора (2026)',
    titleUa: 'Рейтинг перевірених автосервісів і компаній автопідбору (2026)',
    descRu: 'Лучшие СТО, детейлинг-центры и службы автоподбора с высокой оценкой клиентов и прозрачной сметой работ.',
    descUa: 'Найкращі СТО, детейлінг-центри та служби автопідбору з високою оцінкою клієнтів і прозорим кошторисом робіт.',
  },
  {
    slug: 'top-online-shops',
    category: 'shops',
    titleRu: 'Топ надёжных интернет-магазинов и маркетплейсов по отзывам покупателей',
    titleUa: 'Топ надійних інтернет-магазинів і маркетплейсів за відгуками покупців',
    descRu: 'Магазины с подтверждёнными реквизитами, официальной гарантией, быстрой отправкой и высоким рейтингом доверия.',
    descUa: 'Магазини з підтвердженими реквізитами, офіційною гарантією, швидкою відправкою та високим рейтингом довіри.',
  },
  {
    slug: 'top-realestate-repair',
    category: 'realestate',
    titleRu: 'Лучшие ремонтные компании, застройщики и агентства недвижимости',
    titleUa: 'Найкращі ремонтні компанії, забудовники та агентства нерухомості',
    descRu: 'Подборка подрядчиков и агентств с реальными отзывами о соблюдении сроков, сметы и качества отделки.',
    descUa: 'Добірка підрядників і агентств із реальними відгуками про дотримання термінів, кошторису та якості ремонту.',
  },
  {
    slug: 'top-finance-law',
    category: 'finance',
    titleRu: 'Проверенные юридические, бухгалтерские и финансовые компании',
    titleUa: 'Перевірені юридичні, бухгалтерські та фінансові компанії',
    descRu: 'Компании для сопровождения сделок, налогового консалтинга и юридической защиты бизнеса с лучшими оценками.',
    descUa: 'Компанії для супроводу угод, податкового консалтингу та юридичного захисту бізнесу з найкращими оцінками.',
  },
  {
    slug: 'top-travel-visas',
    category: 'travel',
    titleRu: 'Топ туристических агентств и визовых центров без скрытых комиссий',
    titleUa: 'Топ туристичних агентств і візових центрів без прихованих комісій',
    descRu: 'Надёжные туроператоры и визовые агентства по отзывам туристов о поддержке и оформлении документов.',
    descUa: 'Надійні туроператори та візові агентства за відгуками туристів про підтримку й оформлення документів.',
  },
  {
    slug: 'top-it-digital',
    category: 'it',
    titleRu: 'Рейтинг IT-студий, веб-разработчиков и digital-агентств',
    titleUa: 'Рейтинг IT-студій, веб-розробників і digital-агентств',
    descRu: 'Проверенные подрядчики по разработке сайтов, CRM, SEO и performance-маркетингу с реальными кейсами.',
    descUa: 'Перевірені підрядники з розробки сайтів, CRM, SEO та performance-маркетингу з реальними кейсами.',
  },
  {
    slug: 'blacklist-scammers',
    category: 'scammers',
    isBlacklist: true,
    titleRu: 'Чёрный список: жалобы на мошенников и сомнительные проекты (moshennik.eu)',
    titleUa: 'Чорний список: скарги на шахраїв і сумнівні проєкти (moshennik.eu)',
    descRu: 'Сводный реестр сомнительных компаний, сайтов и контактов с наибольшим числом жалоб пользователей перед оплатой.',
    descUa: 'Зведений реєстр сумнівних компаній, сайтів і контактів з найбільшою кількістю скарг користувачів перед оплатою.',
  },
];
