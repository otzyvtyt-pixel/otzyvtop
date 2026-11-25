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

test('all 548 scammers in catalog/by-category/scammers.json respect activity dates', () => {
  const filePath = path.resolve(process.cwd(), 'catalog', 'by-category', 'scammers.json');
  const rawList = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Array<Record<string, unknown>>;
  assert.ok(rawList.length >= 500);

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
    });

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
});
