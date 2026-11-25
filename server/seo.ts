import type { CategoryId, CompanyDetail, Language } from '../src/types.ts';
import { CATEGORY_LABELS, localizeActiveYears } from '../src/i18n.ts';
import {
  buildCompanyPath,
  buildRouteUrl,
  citySlug,
  parseLocationPath,
  RATING_GUIDES,
  VALID_CATEGORY_IDS,
} from '../src/utils/seoSlug.ts';
import { localizeCity } from '../src/utils/cityLocalization.ts';
import { catalogStore } from './catalog.ts';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildCompanyFaq(
  company: CompanyDetail,
  lang: Language,
): Array<{ q: string; a: string }> {
  const isScam = company.category === 'scammers';
  const isDefunctScam = isScam && company.scamActive === false;
  const catName = CATEGORY_LABELS[lang][company.category];
  const cityLabel = localizeCity(company.city, lang);
  const yearsLabel = localizeActiveYears(company.activeYears, lang);
  const checkedDateFormatted = company.lastCheckedAt
    ? company.lastCheckedAt.split('-').reverse().join('.')
    : '';

  if (lang === 'ua') {
    const contactParts = [
      company.domain ? `актуальний сайт ${company.domain}` : '',
      company.phone ? `телефон ${company.phone}` : '',
      company.email ? `email ${company.email}` : '',
    ].filter(Boolean);
    const statusDetail = isScam
      ? isDefunctScam
        ? `Статус: проєкт/сайт не працює${checkedDateFormatted ? ` (перевірено ${checkedDateFormatted})` : ''}${yearsLabel ? `, ${yearsLabel}` : ''}.`
        : `Статус: ресурс активний${checkedDateFormatted ? ` (перевірено ${checkedDateFormatted})` : ''}.`
      : company.status === 'closed'
        ? `Статус: не працює / недоступна${checkedDateFormatted ? ` (перевірено ${checkedDateFormatted})` : ''}.`
        : company.websiteStatus === 'ok' || company.websiteStatus === 'protected'
          ? `Сайт працює${checkedDateFormatted ? ` (перевірено ${checkedDateFormatted})` : ''}${yearsLabel ? `, роки роботи: ${yearsLabel}` : ''}.`
          : checkedDateFormatted
            ? `Остання перевірка: ${checkedDateFormatted}.`
            : '';

    const adsDetailUa =
      company.adsCreativesCount && company.adsCreativesCount > 0 && company.adsLastAt
        ? ` У Google Ads Transparency зафіксовано ${company.adsCreativesCount} оголошень (останній показ ${company.adsLastAt.split('-').reverse().join('.')}).`
        : '';
    return [
      {
        q: `Який рейтинг та кількість відгуків у ${company.name}?`,
        a: `На платформі OtzyvTop компанія ${company.name} має рейтинг ${company.averageRating.toFixed(1)} з 5 на основі ${company.reviewCount} відгуків у категорії «${catName}». ${statusDetail}${adsDetailUa}`.trim(),
      },
      {
        q: `Які актуальні контакти та сайт вказані для ${company.name}?`,
        a: contactParts.length
          ? `У картці компанії зафіксовані контакти: ${contactParts.join(', ')}${cityLabel ? ` (місто: ${cityLabel})` : ''}.`
          : `Офіційні контакти ${company.name} уточнюються або відсутні у відкритому доступі.`,
      },
      {
        q: isScam
          ? `Чи є скарги на шахрайство щодо ${company.name}?`
          : `Чи працює ${company.name} зараз і як перевірити перед оплатою?`,
        a: isScam
          ? `Так, ${company.name} внесено до реєстру скарг («Шахраї»). ${company.statusNote || 'Перед будь-якими оплатами перевіряйте реквізити та договори.'}`
          : company.status === 'closed'
            ? `${company.statusNote || `За результатами перевірки ${checkedDateFormatted || '2026'} сайт компанії не працює або обслуговування припинено.`} Перед оплатою перевірте актуальність юридичної особи.`
            : `Перед оплатою звірте актуальний домен, телефон та прочитайте свіжі відгуки клієнтів за датами у профілі ${company.name}. ${statusDetail}`.trim(),
      },
      {
        q: `Як залишити відгук або офіційну відповідь представника ${company.name}?`,
        a: `Ви можете опублікувати відгук з оцінкою, плюсами та мінусами у формі на цій сторінці, а представник компанії може відповісти на будь-який коментар.`,
      },
    ];
  }

  const contactParts = [
    company.domain ? `актуальный сайт ${company.domain}` : '',
    company.phone ? `телефон ${company.phone}` : '',
    company.email ? `email ${company.email}` : '',
  ].filter(Boolean);
  const statusDetail = isScam
    ? isDefunctScam
      ? `Статус: проект/сайт не работает${checkedDateFormatted ? ` (проверено ${checkedDateFormatted})` : ''}${yearsLabel ? `, ${yearsLabel}` : ''}.`
      : `Статус: ресурс активен${checkedDateFormatted ? ` (проверено ${checkedDateFormatted})` : ''}.`
    : company.status === 'closed'
      ? `Статус: закрыта / не работает${checkedDateFormatted ? ` (проверено ${checkedDateFormatted})` : ''}.`
      : company.websiteStatus === 'ok' || company.websiteStatus === 'protected'
        ? `Сайт активен${checkedDateFormatted ? ` (проверено ${checkedDateFormatted})` : ''}${yearsLabel ? `, период работы: ${yearsLabel}` : ''}.`
        : checkedDateFormatted
          ? `Последняя проверка: ${checkedDateFormatted}.`
          : '';

  const adsDetailRu =
    company.adsCreativesCount && company.adsCreativesCount > 0 && company.adsLastAt
      ? ` В Google Ads Transparency зафиксировано ${company.adsCreativesCount} объявлений (последний показ ${company.adsLastAt.split('-').reverse().join('.')}).`
      : '';

  return [
    {
      q: `Какой рейтинг и сколько отзывов у ${company.name}?`,
      a: `На платформе OtzyvTop компания ${company.name} имеет рейтинг ${company.averageRating.toFixed(1)} из 5 на основе ${company.reviewCount} отзывов в категории «${catName}». ${statusDetail}${adsDetailRu}`.trim(),
    },
    {
      q: `Какие актуальные контакты и сайт указаны для ${company.name}?`,
      a: contactParts.length
        ? `В карточке компании указаны: ${contactParts.join(', ')}${cityLabel ? ` (город: ${cityLabel})` : ''}.`
        : `Официальные контакты ${company.name} уточняются или отсутствуют в открытом доступе.`,
    },
    {
      q: isScam
        ? `Есть ли жалобы на мошенничество у ${company.name}?`
        : `Работает ли ${company.name} сейчас и как проверить надёжность до оплаты?`,
      a: isScam
        ? `Да, ${company.name} находится в реестре жалоб («Мошенники»). ${company.statusNote || 'Перед любыми переводами проверяйте юридические реквизиты.'}`
        : company.status === 'closed'
          ? `${company.statusNote || `По данным проверки от ${checkedDateFormatted || '2026'} сайт компании не работает или деятельность прекращена.`} Перед оплатой обязательно проверьте актуальность бизнеса.`
          : `Перед оплатой сверьте официальный домен, телефон и изучите свежие отзывы клиентов по датам в карточке ${company.name}. ${statusDetail}`.trim(),
    },
    {
      q: `Как оставить отзыв или официальный ответ от ${company.name}?`,
      a: `Любой клиент может опубликовать оценку, плюсы и минусы в форме ниже, а представитель компании — добавить официальный ответ к отзыву.`,
    },
  ];
}

export function injectSeoIntoHtml(
  templateHtml: string,
  reqUrl: string,
  origin: string,
): string {
  const urlObj = new URL(reqUrl, origin);
  const { lang, route } = parseLocationPath(urlObj.pathname);
  const hasSearchFilterParams =
    urlObj.searchParams.has('q') ||
    urlObj.searchParams.has('sort') ||
    urlObj.searchParams.has('status') ||
    Number(urlObj.searchParams.get('page') || '1') > 1;

  const overview = catalogStore.getOverview();
  let title =
    lang === 'ua'
      ? `OtzyvTop — Відгуки про компанії та рейтинг бізнесу (${overview.totalCompanies.toLocaleString('uk-UA')})`
      : `OtzyvTop — Отзывы о компаниях и рейтинг бизнеса (${overview.totalCompanies.toLocaleString('ru-RU')})`;
  let description =
    lang === 'ua'
      ? `Перевіряйте репутацію, контакти та чесні відгуки про ${overview.totalCompanies.toLocaleString('uk-UA')} компаній в 11 галузях, включно з реєстром скарг на шахраїв.`
      : `Проверяйте репутацию, контакты и честные отзывы о ${overview.totalCompanies.toLocaleString('ru-RU')} компаниях в 11 отраслях, включая реестр жалоб на мошенников.`;
  let canonicalPath = buildRouteUrl(route, lang);
  let ruPath = buildRouteUrl(route, 'ru');
  let uaPath = buildRouteUrl(route, 'ua');
  let ogType = 'website';
  let robots = hasSearchFilterParams ? 'noindex, follow' : 'index, follow';

  const jsonLdScripts: object[] = [];
  let prerenderHtml = '';

  if (route.view === 'home') {
    jsonLdScripts.push(
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'OtzyvTop',
        url: `${origin}/`,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/catalog?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'OtzyvTop',
        url: `${origin}/`,
      },
    );

    const catLinks = VALID_CATEGORY_IDS.map(
      (cat) =>
        `<li><a href="${origin}${buildRouteUrl({ view: 'catalog', category: cat }, lang)}">${escapeHtml(CATEGORY_LABELS[lang][cat])} (${overview.byCategory[cat]})</a></li>`,
    ).join('');
    prerenderHtml = `
      <main>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <ul>${catLinks}</ul>
      </main>`;
  } else if (route.view === 'company') {
    const detail = catalogStore.getCompany(route.companyId);
    if (detail) {
      canonicalPath = buildCompanyPath(detail.name, detail.id, lang);
      ruPath = buildCompanyPath(detail.name, detail.id, 'ru');
      uaPath = buildCompanyPath(detail.name, detail.id, 'ua');
      ogType = 'article';

      const isScam = detail.category === 'scammers';
      const domainPart = detail.domain ? ` (${detail.domain})` : '';
      const phonePart = detail.phone ? ` · ${detail.phone}` : '';
      const locCity = localizeCity(detail.city, lang);
      if (lang === 'ua') {
        title = isScam
          ? `${detail.name}${domainPart} — відгуки, шахраї чи ні, перевірка | OtzyvTop`
          : `${detail.name}${domainPart} — відгуки клієнтів, рейтинг ${detail.averageRating.toFixed(1)} | OtzyvTop`;
        description = `${detail.name}${domainPart}${phonePart}${locCity ? ` · ${locCity}` : ''}. Рейтинг ${detail.averageRating.toFixed(1)}/5 на основі ${detail.reviewCount} відгуків. ${detail.description.slice(0, 110)}`;
      } else {
        title = isScam
          ? `${detail.name}${domainPart} — отзывы, мошенники или нет, проверка | OtzyvTop`
          : `${detail.name}${domainPart} — отзывы клиентов, рейтинг ${detail.averageRating.toFixed(1)} | OtzyvTop`;
        description = `${detail.name}${domainPart}${phonePart}${locCity ? ` · ${locCity}` : ''}. Рейтинг ${detail.averageRating.toFixed(1)}/5 на основе ${detail.reviewCount} отзывов. ${detail.description.slice(0, 110)}`;
      }

      const faqs = buildCompanyFaq(detail, lang);

      jsonLdScripts.push(
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: detail.name,
          url: detail.website || `${origin}${canonicalPath}`,
          ...(detail.phone ? { telephone: detail.phone } : {}),
          ...(detail.email ? { email: detail.email } : {}),
          ...(locCity
            ? { address: { '@type': 'PostalAddress', addressLocality: locCity, addressCountry: 'UA' } }
            : {}),
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: detail.averageRating.toFixed(1),
            reviewCount: Math.max(1, detail.reviewCount),
            bestRating: '5',
            worstRating: '1',
          },
          review: detail.reviews.slice(0, 5).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.author },
            datePublished: r.createdAt.slice(0, 10),
            reviewBody: r.text,
            reviewRating: {
              '@type': 'Rating',
              ratingValue: String(r.rating),
              bestRating: '5',
              worstRating: '1',
            },
          })),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: lang === 'ua' ? 'Головна' : 'Главная',
              item: `${origin}${lang === 'ua' ? '/ua' : '/'}`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: CATEGORY_LABELS[lang][detail.category],
              item: `${origin}${buildRouteUrl({ view: 'catalog', category: detail.category }, lang)}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: detail.name,
              item: `${origin}${canonicalPath}`,
            },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
      );

      prerenderHtml = `
        <article>
          <h1>${escapeHtml(detail.name)}${detail.domain ? ` — ${escapeHtml(detail.domain)}` : ''}</h1>
          <p>${escapeHtml(detail.description)}</p>
          ${detail.phone ? `<p>Телефон: ${escapeHtml(detail.phone)}</p>` : ''}
          <section>
            ${detail.reviews
              .slice(0, 5)
              .map(
                (r) =>
                  `<div><strong>${escapeHtml(r.author)}</strong> (${r.rating}/5, ${r.createdAt.slice(0, 10)}): ${escapeHtml(r.text)}</div>`,
              )
              .join('')}
          </section>
          <section>
            ${faqs.map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p>`).join('')}
          </section>
        </article>`;
    } else {
      robots = 'noindex, nofollow';
    }
  } else if (route.view === 'ratings') {
    const guide = route.guideSlug
      ? RATING_GUIDES.find((g) => g.slug === route.guideSlug)
      : null;
    if (guide) {
      title = `${lang === 'ua' ? guide.titleUa : guide.titleRu} | OtzyvTop`;
      description = lang === 'ua' ? guide.descUa : guide.descRu;
      const list = catalogStore.searchCompanies({
        category: guide.category,
        city: guide.city,
        sort: guide.isBlacklist ? 'featured' : 'rating',
        limit: 15,
      });
      jsonLdScripts.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: title,
        itemListElement: list.items.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: item.name,
          url: `${origin}${buildCompanyPath(item.name, item.id, lang)}`,
        })),
      });
      prerenderHtml = `<main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></main>`;
    } else {
      title =
        lang === 'ua'
          ? 'Рейтинги компаній та чорні списки — добірки 2026 | OtzyvTop'
          : 'Рейтинги компаний и чёрные списки — подборки 2026 | OtzyvTop';
      description =
        lang === 'ua'
          ? 'Редакційні добірки найкращих компаній по галузях і містах, а також реєстр скарг на шахраїв.'
          : 'Редакционные подборки лучших компаний по отраслям и городам, а также реестр жалоб на мошенников.';
    }
  } else if (route.view === 'catalog') {
    const cat = route.category && route.category !== 'all' ? route.category : null;
    const searchRes = catalogStore.searchCompanies({
      category: cat || undefined,
      city: route.citySlug || undefined,
      limit: 12,
    });
    const cityDisplay = searchRes.resolvedCity
      ? localizeCity(searchRes.resolvedCity, lang)
      : '';
    const catLabel = cat ? CATEGORY_LABELS[lang][cat] : lang === 'ua' ? 'Каталог компаній' : 'Каталог компаний';
    const locationSuffix = cityDisplay ? ` (${cityDisplay})` : '';

    if (cat === 'scammers') {
      title =
        lang === 'ua'
          ? `Шахраї та чорний список компаній${locationSuffix} — перевірка відгуків | OtzyvTop`
          : `Мошенники и чёрный список компаний${locationSuffix} — проверка отзывов | OtzyvTop`;
      description =
        lang === 'ua'
          ? `База з ${searchRes.total} скарг на недобросовісні компанії: актуальна перевірка сайтів, реклами Google Ads та історії доменів у відкритих джерелах.`
          : `База из ${searchRes.total} жалоб на недобросовестные компании: актуальная проверка сайтов, рекламы Google Ads и истории доменов в открытых источниках.`;
    } else {
      title =
        lang === 'ua'
          ? `${catLabel}${locationSuffix} — відгуки та рейтинг (${searchRes.total}) | OtzyvTop`
          : `${catLabel}${locationSuffix} — отзывы и рейтинг (${searchRes.total}) | OtzyvTop`;
      description =
        lang === 'ua'
          ? `${catLabel}${locationSuffix}: ${searchRes.total} компаній з перевіреними контактами, рейтингом та реальними відгуками клієнтів.`
          : `${catLabel}${locationSuffix}: ${searchRes.total} компаний с проверенными контактами, рейтингом и реальными отзывами клиентов.`;
    }

    jsonLdScripts.push({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `${origin}${canonicalPath}`,
    });

    prerenderHtml = `
      <main>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <ul>
          ${searchRes.items
            .map(
              (c) =>
                `<li><a href="${origin}${buildCompanyPath(c.name, c.id, lang)}">${escapeHtml(c.name)} (${c.averageRating.toFixed(1)}★)</a></li>`,
            )
            .join('')}
        </ul>
      </main>`;
  }

  const canonicalUrl = `${origin}${canonicalPath}`;
  const ruUrl = `${origin}${ruPath}`;
  const uaUrl = `${origin}${uaPath}`;
  const ogLocale = lang === 'ua' ? 'uk_UA' : 'ru_RU';

  const seoHeadBlock = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="alternate" hreflang="ru" href="${escapeHtml(ruUrl)}" />
    <link rel="alternate" hreflang="uk" href="${escapeHtml(uaUrl)}" />
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(ruUrl)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="OtzyvTop" />
    <meta property="og:locale" content="${ogLocale}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${jsonLdScripts
      .map(
        (obj) =>
          `<script type="application/ld+json">${JSON.stringify(obj).replace(/<\//g, '<\\/')}</script>`,
      )
      .join('\n    ')}`;

  let html = templateHtml.replace(
    /<html lang="[^"]*">/,
    `<html lang="${lang === 'ua' ? 'uk' : 'ru'}">`,
  );

  // Strip static default title/description/og tags before injecting dynamic block
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>/i, '')
    .replace(/<meta\s+property="og:title"[\s\S]*?\/>/i, '')
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/i, '')
    .replace('</head>', `${seoHeadBlock}\n  </head>`);

  if (prerenderHtml) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"><div class="sr-only">${prerenderHtml}</div></div>`,
    );
  }

  return html;
}

export function renderRobotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /*?q=',
    'Disallow: /*?sort=',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

const COMPANIES_PER_SITEMAP = 1000;

export function renderSitemapIndex(origin: string): string {
  const totalCompanies = catalogStore.getAllCompanies().length;
  const companyParts = Math.max(1, Math.ceil(totalCompanies / COMPANIES_PER_SITEMAP));
  const nowDate = '2026-11-23';

  const parts = ['static.xml', 'category-city.xml'];
  for (let i = 1; i <= companyParts; i++) {
    parts.push(`companies-${i}.xml`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${parts
  .map(
    (p) => `  <sitemap>
    <loc>${escapeXml(`${origin}/sitemaps/${p}`)}</loc>
    <lastmod>${nowDate}</lastmod>
  </sitemap>`,
  )
  .join('\n')}
</sitemapindex>`;
}

function urlEntry(ruLoc: string, uaLoc: string, lastmod: string, priority: string): string {
  return `  <url>
    <loc>${escapeXml(ruLoc)}</loc>
    <xhtml:link rel="alternate" hreflang="ru" href="${escapeXml(ruLoc)}" />
    <xhtml:link rel="alternate" hreflang="uk" href="${escapeXml(uaLoc)}" />
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`;
}

export function renderSitemapPart(origin: string, partName: string): string | null {
  const today = '2026-11-23';
  const wrap = (entries: string[]) =>
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`;

  if (partName === 'static.xml') {
    const entries: string[] = [
      urlEntry(`${origin}/`, `${origin}/ua`, today, '1.0'),
      urlEntry(`${origin}/catalog`, `${origin}/ua/catalog`, today, '0.9'),
      urlEntry(`${origin}/ratings`, `${origin}/ua/ratings`, today, '0.9'),
    ];
    for (const cat of VALID_CATEGORY_IDS) {
      entries.push(
        urlEntry(
          `${origin}/category/${cat}`,
          `${origin}/ua/category/${cat}`,
          today,
          '0.8',
        ),
      );
    }
    for (const guide of RATING_GUIDES) {
      entries.push(
        urlEntry(
          `${origin}/ratings/${guide.slug}`,
          `${origin}/ua/ratings/${guide.slug}`,
          today,
          '0.8',
        ),
      );
    }
    return wrap(entries);
  }

  if (partName === 'category-city.xml') {
    const pairs = catalogStore.getCategoryCityPairs(5);
    const entries = pairs.map((p) =>
      urlEntry(
        `${origin}/category/${p.category}/${p.citySlug}`,
        `${origin}/ua/category/${p.category}/${p.citySlug}`,
        today,
        '0.7',
      ),
    );
    return wrap(entries);
  }

  const m = partName.match(/^companies-(\d+)\.xml$/);
  if (m) {
    const partIdx = Number(m[1]);
    const all = catalogStore.getAllCompanies();
    const start = (partIdx - 1) * COMPANIES_PER_SITEMAP;
    if (start < 0 || start >= all.length) return null;
    const slice = all.slice(start, start + COMPANIES_PER_SITEMAP);
    const entries = slice.map((c) => {
      const ruLoc = `${origin}${buildCompanyPath(c.name, c.id, 'ru')}`;
      const uaLoc = `${origin}${buildCompanyPath(c.name, c.id, 'ua')}`;
      return urlEntry(ruLoc, uaLoc, today, c.category === 'scammers' ? '0.7' : '0.6');
    });
    return wrap(entries);
  }

  return null;
}

// Cached Favicon Proxy (eliminates redundant third-party browser requests + improves LCP)
interface CachedIcon {
  buf: Buffer;
  contentType: string;
  ts: number;
}
const faviconCache = new Map<string, CachedIcon | null>();

export async function fetchCachedFavicon(domain: string): Promise<CachedIcon | null> {
  const clean = domain.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
  if (!clean || !clean.includes('.')) return null;

  if (faviconCache.has(clean)) {
    return faviconCache.get(clean) || null;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const res = await fetch(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clean)}&sz=128`,
      { signal: ctrl.signal },
    );
    if (!res.ok) {
      faviconCache.set(clean, null);
      return null;
    }
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const contentType = res.headers.get('content-type') || 'image/png';
    // Google returns a tiny 16x16 default globe (< 350 bytes) when missing; keep valid icons
    if (buf.length < 150) {
      faviconCache.set(clean, null);
      return null;
    }
    if (faviconCache.size > 2000) {
      const firstKey = faviconCache.keys().next().value;
      if (firstKey) faviconCache.delete(firstKey);
    }
    const entry = { buf, contentType, ts: Date.now() };
    faviconCache.set(clean, entry);
    return entry;
  } catch {
    faviconCache.set(clean, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyIndexNow(urls: string[], origin: string): Promise<void> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || urls.length === 0) return;
  try {
    const host = new URL(origin).host;
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key,
        urlList: urls.slice(0, 100),
      }),
    });
  } catch {
    // non-blocking best-effort SEO ping
  }
}

export function resolveCategoryFromSlug(slug: string): CategoryId | null {
  return VALID_CATEGORY_IDS.includes(slug as CategoryId)
    ? (slug as CategoryId)
    : null;
}

export function getPopularCitySlugSample(): Array<{ city: string; slug: string }> {
  return catalogStore
    .getOverview()
    .topCities.map((c) => ({ city: c.city, slug: citySlug(c.city) }));
}
