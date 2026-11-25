import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Company } from '../src/types.ts';
import { generateSeededReviews } from './reviewSeeder.ts';

function makeScammer(overrides: Partial<Company>): Company {
  return {
    id: 9001,
    name: 'Test Scam Project',
    category: 'scammers',
    city: 'Киев',
    description: 'Test scam description',
    website: '',
    domain: '',
    phone: '',
    email: '',
    logoUrl: '',
    socials: [],
    status: 'closed',
    statusNote: '',
    averageRating: 0,
    reviewCount: 0,
    sourceBatch: 'moshennik.eu',
    ...overrides,
  };
}

test('defunct scammer never generates reviews past activityPeriodEnd or in 2026', () => {
  const defunct = makeScammer({
    id: 101,
    name: 'Агентство "Сана-Центр"',
    city: 'Дрогобыч',
    website: 'http://sana-centre.com/',
    domain: 'sana-centre.com',
    websiteStatus: 'offline',
    scamActive: false,
    activityPeriodStart: '2022-03-21',
    activityPeriodEnd: '2023-03-01',
    activeYears: 'Не работает в 2026',
  });

  const reviews = generateSeededReviews(defunct);
  assert.ok(reviews.length >= 10 && reviews.length <= 20);
  for (const r of reviews) {
    assert.ok(
      r.createdAt <= '2023-03-01T23:59:59Z',
      `Review date ${r.createdAt} exceeded activityPeriodEnd 2023-03-01`,
    );
    assert.ok(
      !r.createdAt.startsWith('2026-'),
      `Defunct scammer must not have 2026 review: ${r.createdAt}`,
    );
  }
  // Sorted newest-first
  for (let i = 1; i < reviews.length; i++) {
    assert.ok(reviews[i - 1].createdAt >= reviews[i].createdAt);
  }
});

test('active scammer generates current 2026 reviews within its activity window', () => {
  const active = makeScammer({
    id: 202,
    name: 'Trust Group PRO',
    website: 'https://trust-group.pro/',
    domain: 'trust-group.pro',
    websiteStatus: 'ok',
    scamActive: true,
    activityPeriodStart: '2025-09-19',
    activityPeriodEnd: '2026-11-24',
    activeYears: 'Работает в 2026',
  });

  const reviews = generateSeededReviews(active);
  assert.ok(reviews.length >= 10 && reviews.length <= 20);
  assert.ok(reviews[0].createdAt.startsWith('2026-'));
});

test('all curated scammers in catalog/by-category/scammers.json respect open-web activity dates', () => {
  const filePath = path.resolve(process.cwd(), 'catalog', 'by-category', 'scammers.json');
  const rawList = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Array<Record<string, unknown>>;
  assert.ok(rawList.length >= 350, `Expected >= 350 curated scammers, got ${rawList.length}`);

  let activeCount = 0;
  let adsCount = 0;
  let nssmcCount = 0;
  let emaCount = 0;

  rawList.forEach((raw, idx) => {
    const website = typeof raw.website === 'string' ? raw.website : '';
    let domain = '';
    try {
      if (website) domain = new URL(website).hostname.replace(/^www\./, '');
    } catch {
      domain = '';
    }
    const comp = makeScammer({
      id: idx + 1,
      name: String(raw.name || ''),
      city: String(raw.city || ''),
      description: String(raw.description || ''),
      website,
      domain,
      websiteStatus: raw.websiteStatus as Company['websiteStatus'],
      scamActive: raw.scamActive as boolean,
      activityPeriodStart: String(raw.activityPeriodStart || ''),
      activityPeriodEnd: String(raw.activityPeriodEnd || ''),
      activeYears: String(raw.activeYears || ''),
      adsActive: typeof raw.adsActive === 'boolean' ? raw.adsActive : undefined,
      adsCreativesCount: typeof raw.adsCreativesCount === 'number' ? raw.adsCreativesCount : undefined,
    });

    if (comp.scamActive) activeCount++;
    if (comp.adsCreativesCount && comp.adsCreativesCount > 0) adsCount++;
    if (raw._source_batch === 'nssmc.gov.ua') nssmcCount++;
    if (raw._source_batch === 'ema.com.ua') emaCount++;

    const reviews = generateSeededReviews(comp);
    assert.ok(reviews.length >= 10 && reviews.length <= 20);
    const maxIso = `${comp.activityPeriodEnd}T23:59:59.999Z`;
    for (const r of reviews) {
      assert.ok(
        r.createdAt <= maxIso,
        `Company "${comp.name}" review ${r.createdAt} > ${maxIso}`,
      );
    }
    if (comp.scamActive === false && comp.activityPeriodEnd && comp.activityPeriodEnd < '2026-01-01') {
      for (const r of reviews) {
        assert.ok(
          !r.createdAt.startsWith('2026-'),
          `Defunct "${comp.name}" must have no 2026 reviews, got ${r.createdAt}`,
        );
      }
    }
  });

  assert.ok(activeCount >= 300, `Expected >= 300 genuinely active projects, got ${activeCount}`);
  assert.ok(adsCount >= 10, `Expected >= 10 advertisers detected in Google Ads, got ${adsCount}`);
  assert.ok(nssmcCount >= 150, `Expected >= 150 live NSSMC SCAM projects, got ${nssmcCount}`);
  assert.ok(emaCount >= 10, `Expected >= 10 live EMA BlackList domains, got ${emaCount}`);
});

test('reviews have natural length variety (short, medium, long) and zero duplicate texts per company', () => {
  const sampleCompanies: Company[] = [
    makeScammer({
      id: 3001,
      name: 'Epica (epica.net.ua)',
      description: 'Шахрайський інтернет-магазин, створений для виманювання передплати за побутову електроніку',
      website: 'https://epica.net.ua/',
      domain: 'epica.net.ua',
      phone: '+380441234567',
      email: 'info@epica.net.ua',
      socials: [{ label: 'Telegram', url: 'https://t.me/epica_test' }],
      websiteStatus: 'ok',
      scamActive: true,
      activityPeriodStart: '2026-11-16',
      activityPeriodEnd: '2026-11-24',
    }),
    makeScammer({
      id: 3003,
      name: 'Almax General Test',
      city: 'Украина',
      description: 'Сомнительный сервис: берут предоплату на карту физлица и пропадают без оформления документов.',
      website: 'https://almax-test.ua/',
      domain: 'almax-test.ua',
      phone: '+380671234567',
      email: 'info@almax-test.ua',
      socials: [{ label: 'Telegram', url: 'https://t.me/almax_test' }],
      websiteStatus: 'ok',
      scamActive: true,
      activityPeriodStart: '2026-01-10',
      activityPeriodEnd: '2026-11-24',
    }),
    makeScammer({
      id: 3004,
      name: 'XTP Crypto Broker',
      city: 'Киев',
      description: 'Нелицензированный инвестиционный брокер и торговая платформа форекс/крипто.',
      website: 'https://xtp-test.com/',
      domain: 'xtp-test.com',
      phone: '+380931234567',
      email: 'desk@xtp-test.com',
      websiteStatus: 'ok',
      scamActive: true,
      activityPeriodStart: '2025-10-01',
      activityPeriodEnd: '2026-11-24',
    }),
    {
      id: 3002,
      name: 'Стоматология Улыбка',
      category: 'beauty',
      city: 'Киев',
      description: 'Лечение зубов, имплантация и гигиена полости рта в Киеве.',
      website: 'https://ulybka.example.ua',
      domain: 'ulybka.example.ua',
      phone: '+380671112233',
      email: 'info@ulybka.example.ua',
      logoUrl: '',
      socials: [],
      status: 'active',
      statusNote: '',
      averageRating: 0,
      reviewCount: 0,
      sourceBatch: 'test',
    },
    {
      id: 3005,
      name: 'Сервис Восток',
      category: 'auto',
      city: 'Днепр',
      description: 'СТО, диагностика и шиномонтаж в Днепре.',
      website: 'https://vostok-auto.example.ua',
      domain: 'vostok-auto.example.ua',
      phone: '+380501112233',
      email: 'cto@vostok-auto.example.ua',
      logoUrl: '',
      socials: [],
      status: 'closed',
      statusNote: 'Закрыто',
      averageRating: 0,
      reviewCount: 0,
      sourceBatch: 'test',
    },
  ];

  for (const company of sampleCompanies) {
    const reviews = generateSeededReviews(company);
    const lengths = reviews.map((r) => r.text.length);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    const uniqueTexts = new Set(reviews.map((r) => r.text));
    const uniquePrefixes = new Set(reviews.map((r) => r.text.slice(0, 42)));
    const uniqueAuthors = new Set(reviews.map((r) => r.author));

    assert.equal(uniqueTexts.size, reviews.length, `Duplicate review text found for ${company.name}`);
    assert.equal(uniquePrefixes.size, reviews.length, `Near-duplicate story prefix found for ${company.name}`);
    assert.equal(uniqueAuthors.size, reviews.length, `Duplicate author found for ${company.name}`);
    assert.ok(minLen < 130, `Expected short reviews (<130 chars) for ${company.name}, got min ${minLen}`);
    assert.ok(maxLen > 320, `Expected detailed story reviews (>320 chars) for ${company.name}, got max ${maxLen}`);
    assert.ok(maxLen - minLen > 200, `Expected wide spread in review lengths, got ${maxLen - minLen}`);

    for (const r of reviews) {
      assert.ok(
        !/[а-яА-ЯёЁіїєґІЇЄҐ][a-zA-Z]|[a-zA-Z][а-яА-ЯёЁіїєґІЇЄҐ]/.test(r.text),
        `Mixed-script typo detected in review: ${r.text}`,
      );
      assert.ok(
        !r.text.includes('(epica.net.ua) (epica.net.ua)'),
        `Double domain detected in review: ${r.text}`,
      );
      assert.ok(
        !r.text.includes('(Україна)') && !r.text.includes('(Украина)'),
        `Country-level cityRef leaked into review text: ${r.text}`,
      );
      const strippedForLeak = r.text
        .split(company.name)
        .join('')
        .replace(/ЄМА|Київ/g, '');
      const hasRuChars = /[ыэъёЫЭЪЁ]/.test(strippedForLeak);
      const hasUaChars = /[іїєґІЇЄҐ]/.test(strippedForLeak);
      assert.ok(
        !(hasRuChars && hasUaChars),
        `Mixed RU/UA characters in review: ${r.text}`,
      );
    }

    // Concrete amounts must appear naturally across generated reviews
    const hasConcreteSum = reviews.some((r) => /\d[\d\s]*\s*(?:грн|\$|€)/.test(r.text));
    assert.ok(hasConcreteSum, `Expected concrete UAH/USD/EUR sum in reviews for ${company.name}`);

    // Non-shop scammer taking prepayment must not mention electronics/appliances
    if (company.id === 3003) {
      for (const r of reviews) {
        assert.ok(
          !/бытовую технику|побутову техніку|магазин-однодневка|фейковий магазин/i.test(r.text),
          `Non-shop scammer leaked electronics shop story: ${r.text}`,
        );
      }
    }
  }
});

test('reviews surface verified public company facts (phone, WHOIS date, registry source) when available', () => {
  const emaScam = makeScammer({
    id: 4001,
    name: 'Epica (epica.net.ua)',
    description: 'Шахрайський інтернет-магазин, створений для виманювання передплати за побутову електроніку',
    website: 'https://epica.net.ua/',
    domain: 'epica.net.ua',
    phone: '+380671234567 / +380501112233',
    email: 'info@epica.net.ua',
    sourceBatch: 'ema.com.ua',
    domainRegisteredAt: '2026-11-16',
    adsActive: true,
    adPlatforms: ['Google Ads', 'Meta'],
    websiteStatus: 'ok',
    scamActive: true,
    activityPeriodStart: '2026-11-16',
    activityPeriodEnd: '2026-11-24',
  });

  const nssmcScam = makeScammer({
    id: 4002,
    name: 'Prime Invest',
    description: 'Нелицензированный инвестиционный брокер.',
    website: 'https://prime-invest.example/',
    domain: 'prime-invest.example',
    phone: '+380939876543',
    sourceBatch: 'nssmc.gov.ua',
    domainRegisteredAt: '2025-08-05',
    websiteStatus: 'ok',
    scamActive: true,
    activityPeriodStart: '2025-08-05',
    activityPeriodEnd: '2026-11-24',
  });

  const emaReviews = generateSeededReviews(emaScam);
  const emaAllText = emaReviews.map((r) => r.text).join('\n');
  assert.ok(emaAllText.includes('+380671234567'), 'Expected verified first phone in EMA scam reviews');
  assert.ok(!emaAllText.includes('+380671234567 / +380501112233'), 'Expected single normalized phone, not slash-joined string');
  assert.ok(emaAllText.includes('16.11.2026'), 'Expected DD.MM.YYYY domainRegisteredAt date in EMA scam reviews');
  assert.ok(/ЄМА|EMA/.test(emaAllText), 'Expected EMA registry attribution in EMA scam reviews');

  const nssmcReviews = generateSeededReviews(nssmcScam);
  const nssmcAllText = nssmcReviews.map((r) => r.text).join('\n');
  assert.ok(/НКЦПФР|НКЦБФР/.test(nssmcAllText), 'Expected NSSMC registry attribution in NSSMC scam reviews');
  assert.ok(nssmcAllText.includes('05.08.2025'), 'Expected DD.MM.YYYY domainRegisteredAt date in NSSMC scam reviews');
});

