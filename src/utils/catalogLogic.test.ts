import test from 'node:test';
import assert from 'node:assert/strict';
import type { Company, Review } from '../types.ts';
import {
  buildCompanyDetailPure,
  buildOverviewStats,
  extractDomain,
  normalizeWebsite,
  resolveLogoUrl,
  searchCompaniesPure,
  suggestCompaniesPure,
  validateCommentInput,
  validateCompanyInput,
  validateReviewInput,
} from './catalogLogic.ts';

const sampleCompanies: Company[] = [
  {
    id: 1,
    name: 'Epica',
    category: 'beauty',
    city: 'Киев',
    description: 'Сеть стоматологических клиник в Киеве с современным оборудованием.',
    website: 'https://epica.ua',
    domain: 'epica.ua',
    phone: '+380441112233',
    email: 'info@epica.ua',
    logoUrl: '/api/favicon?domain=epica.ua',
    socials: [],
    status: 'active',
    statusNote: '',
    averageRating: 4.7,
    reviewCount: 15,
    sourceBatch: 'beauty',
  },
  {
    id: 2,
    name: 'FakeCryptoInvest',
    category: 'scammers',
    city: '',
    description: 'Сомнительный инвестиционный проект с жалобами на невыплаты.',
    website: 'https://fakecrypto.example',
    domain: 'fakecrypto.example',
    phone: '',
    email: '',
    logoUrl: '',
    socials: [],
    status: 'active',
    statusNote: 'Жалобы клиентов',
    websiteStatus: 'offline',
    averageRating: 1.2,
    reviewCount: 8,
    sourceBatch: 'scammers',
  },
  {
    id: 3,
    name: 'NovaShop',
    category: 'shops',
    city: 'Львов',
    description: 'Интернет-магазин бытовой электроники с доставкой по Украине.',
    website: 'https://novashop.ua',
    domain: 'novashop.ua',
    phone: '+380671234567',
    email: '',
    logoUrl: '',
    socials: [],
    status: 'active',
    statusNote: '',
    averageRating: 4.5,
    reviewCount: 22,
    sourceBatch: 'shops',
  },
];

test('resolveLogoUrl rewrites legacy /api/favicon URLs to Google S2 favicons and hides offline', () => {
  assert.equal(
    resolveLogoUrl('/api/favicon?domain=epica.ua', 'epica.ua', 'ok'),
    'https://www.google.com/s2/favicons?domain=epica.ua&sz=64',
  );
  assert.equal(resolveLogoUrl('https://example.com/logo.png', 'example.com', 'offline'), '');
  assert.equal(
    resolveLogoUrl('', 'novashop.ua', 'ok'),
    'https://www.google.com/s2/favicons?domain=novashop.ua&sz=64',
  );
});

test('normalizeWebsite and extractDomain normalize domains reliably', () => {
  assert.equal(normalizeWebsite('epica.ua'), 'https://epica.ua');
  assert.equal(extractDomain('https://www.Epica.ua/contacts'), 'epica.ua');
});

test('validateReviewInput enforces min/max bounds and sanitizes author', () => {
  const tooShort = validateReviewInput({ text: 'Коротко', rating: 5 });
  assert.equal(tooShort.ok, false);

  const valid = validateReviewInput({
    author: '   ',
    rating: 9,
    pros: 'Быстро',
    cons: '',
    text: 'Отличный сервис, всё сделали в срок без доплат.',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.clean.author, 'Гость');
    assert.equal(valid.clean.rating, 5);
  }
});

test('validateCompanyInput and validateCommentInput enforce required bounds', () => {
  assert.equal(validateCompanyInput({ name: 'A', description: 'Valid description text' }).ok, false);
  assert.equal(validateCompanyInput({ name: 'Valid Name', description: 'Short' }).ok, false);
  const compOk = validateCompanyInput({
    name: 'Test Company',
    category: 'it',
    website: 'testcompany.ua',
    description: 'Разработка веб-приложений и интеграция систем.',
  });
  assert.equal(compOk.ok, true);
  if (compOk.ok) {
    assert.equal(compOk.clean.domain, 'testcompany.ua');
  }

  assert.equal(validateCommentInput({ text: 'ok' }).ok, false);
  assert.equal(validateCommentInput({ text: 'Спасибо за отзыв!' }).ok, true);
});

test('searchCompaniesPure and suggestCompaniesPure filter by category, city and query', () => {
  const searchLviv = searchCompaniesPure(sampleCompanies, { city: 'львів' });
  assert.equal(searchLviv.total, 1);
  assert.equal(searchLviv.items[0].name, 'NovaShop');

  const searchScam = searchCompaniesPure(sampleCompanies, { category: 'scammers' });
  assert.equal(searchScam.total, 1);
  assert.equal(searchScam.items[0].name, 'FakeCryptoInvest');

  const suggestions = suggestCompaniesPure(sampleCompanies, 'epi');
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].name, 'Epica');
});

test('buildOverviewStats and buildCompanyDetailPure aggregate ratings and comments cleanly', () => {
  const stats = buildOverviewStats(sampleCompanies);
  assert.equal(stats.totalCompanies, 3);
  assert.equal(stats.totalReviews, 45);
  assert.equal(stats.byCategory.scammers, 1);

  const reviews: Review[] = [
    {
      id: 'rev_1',
      companyId: 1,
      author: 'Мария',
      rating: 5,
      pros: 'Вежливо',
      cons: '',
      text: 'Очень довольна клиникой, врач объяснил план лечения.',
      confirmedPurchase: true,
      createdAt: '2026-11-20T10:00:00.000Z',
      helpfulCount: 3,
      unhelpfulCount: 0,
      comments: [],
    },
    {
      id: 'rev_2',
      companyId: 1,
      author: 'Иван',
      rating: 4,
      pros: '',
      cons: '',
      text: 'Всё хорошо, но пришлось подождать 10 минут у ресепшена.',
      confirmedPurchase: false,
      createdAt: '2026-11-21T10:00:00.000Z',
      helpfulCount: 1,
      unhelpfulCount: 0,
      comments: [],
    },
  ];
  const commentsMap = new Map([
    [
      'rev_2',
      [
        {
          id: 'cmt_1',
          reviewId: 'rev_2',
          companyId: 1,
          author: 'Epica',
          text: 'Спасибо за отзыв, учтём замечание по графику.',
          isOfficialReply: true,
          createdAt: '2026-11-22T10:00:00.000Z',
        },
      ],
    ],
  ]);

  const detail = buildCompanyDetailPure(sampleCompanies[0], sampleCompanies, reviews, commentsMap);
  assert.equal(detail.averageRating, 4.5);
  assert.equal(detail.reviewCount, 2);
  assert.equal(detail.ratingBreakdown[5], 1);
  assert.equal(detail.ratingBreakdown[4], 1);
  assert.equal(detail.reviews[0].id, 'rev_2');
  assert.equal(detail.reviews[0].comments.length, 1);
});
