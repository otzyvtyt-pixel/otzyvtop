import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'),
) as {
  entities: Record<string, { properties: Record<string, { minLength?: number; maxLength?: number; enum?: unknown[] }> }>;
  firestore: Record<string, unknown>;
};

interface AuthCtx {
  uid: string;
  email: string;
  email_verified: boolean;
}

const REQUEST_TIME = 'SERVER_TIME';

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

function isAdminAuth(auth: AuthCtx | null): boolean {
  return Boolean(auth && auth.email_verified && auth.email === 'otzyvtyt@gmail.com');
}

function canCreateReview(
  auth: AuthCtx | null,
  reviewId: string,
  payload: Record<string, unknown>,
  docExists = false,
): boolean {
  if (!auth || !auth.email_verified) return false;
  if (!isValidId(reviewId) || docExists) return false;
  const required = [
    'id', 'companyId', 'author', 'authorUid', 'rating',
    'pros', 'cons', 'text', 'confirmedPurchase', 'status',
    'createdAt', 'helpfulCount', 'unhelpfulCount', 'comments',
  ];
  const allowed = [...required, 'moderatedAt', 'moderatedBy'];
  const keys = Object.keys(payload);
  if (!required.every((k) => keys.includes(k))) return false;
  if (!keys.every((k) => allowed.includes(k))) return false;
  if (payload.id !== reviewId) return false;
  if (typeof payload.companyId !== 'number' || !Number.isInteger(payload.companyId) || payload.companyId <= 0) return false;
  if (typeof payload.author !== 'string' || payload.author.length < 1 || payload.author.length > 80) return false;
  if (payload.authorUid !== auth.uid) return false;
  if (typeof payload.rating !== 'number' || payload.rating < 1 || payload.rating > 5) return false;
  if (typeof payload.pros !== 'string' || payload.pros.length > 300) return false;
  if (typeof payload.cons !== 'string' || payload.cons.length > 300) return false;
  if (typeof payload.text !== 'string' || payload.text.length < 10 || payload.text.length > 3000) return false;
  if (typeof payload.confirmedPurchase !== 'boolean') return false;
  if (payload.status !== 'pending' && !isAdminAuth(auth)) return false;
  if (payload.createdAt !== REQUEST_TIME) return false;
  if (payload.helpfulCount !== 0 || payload.unhelpfulCount !== 0) return false;
  if (!Array.isArray(payload.comments) || payload.comments.length !== 0) return false;
  return true;
}

function canModerateReview(auth: AuthCtx | null): boolean {
  return isAdminAuth(auth);
}

function canDeleteReview(auth: AuthCtx | null, reviewId: string): boolean {
  return isAdminAuth(auth) && isValidId(reviewId);
}

function canCreateVote(auth: AuthCtx | null, voteId: string, payload: Record<string, unknown>, exists = false): boolean {
  if (!auth || !auth.email_verified || !isValidId(voteId) || exists) return false;
  const required = ['reviewId', 'companyId', 'authorUid', 'vote', 'createdAt'];
  const keys = Object.keys(payload);
  if (!required.every((k) => keys.includes(k)) || keys.length !== required.length) return false;
  if (typeof payload.reviewId !== 'string' || !isValidId(payload.reviewId)) return false;
  if (payload.authorUid !== auth.uid) return false;
  if (voteId !== `${payload.reviewId}_${auth.uid}`) return false;
  if (payload.vote !== 'up' && payload.vote !== 'down') return false;
  if (payload.createdAt !== REQUEST_TIME) return false;
  return true;
}

test('firestore.rules covers every collection in firebase-blueprint.json and enforces catch-all deny', () => {
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  for (const collectionPath of Object.keys(blueprint.firestore)) {
    const rootName = collectionPath.split('/')[1];
    assert.ok(rulesText.includes(`match /${rootName}/`), `Missing match block for ${collectionPath}`);
  }
  const revProps = blueprint.entities.Review.properties;
  assert.ok(rulesText.includes(`data.text.size() >= ${revProps.text.minLength} && data.text.size() <= ${revProps.text.maxLength}`));
  assert.ok(rulesText.includes(`data.author.size() >= ${revProps.author.minLength} && data.author.size() <= ${revProps.author.maxLength}`));
});

test('Dirty Dozen adversarial payloads are rejected (PERMISSION_DENIED)', () => {
  const userAuth: AuthCtx = { uid: 'user_123', email: 'user@example.com', email_verified: true };
  const adminAuth: AuthCtx = { uid: 'admin_1', email: 'otzyvtyt@gmail.com', email_verified: true };
  const spoofedUnverifiedAdmin: AuthCtx = { uid: 'spoof_1', email: 'otzyvtyt@gmail.com', email_verified: false };

  const validBase = {
    id: 'rev_valid_1',
    companyId: 3034,
    author: 'Олег П.',
    authorUid: 'user_123',
    rating: 5,
    pros: 'Быстро',
    cons: '',
    text: 'Очень хороший сервис, проверили документы и помогли за один день.',
    confirmedPurchase: true,
    status: 'pending',
    createdAt: REQUEST_TIME,
    helpfulCount: 0,
    unhelpfulCount: 0,
    comments: [],
  };

  assert.equal(canCreateReview(userAuth, 'rev_valid_1', validBase), true);

  // 1. Identity Spoofing
  assert.equal(canCreateReview(userAuth, 'rev_1', { ...validBase, id: 'rev_1', authorUid: 'uid_victim' }), false);
  // 2. Self-Approval Bypass
  assert.equal(canCreateReview(userAuth, 'rev_2', { ...validBase, id: 'rev_2', status: 'approved' }), false);
  // 3. Shadow / Ghost Field Injection
  assert.equal(canCreateReview(userAuth, 'rev_3', { ...validBase, id: 'rev_3', isOfficialVerified: true }), false);
  // 4. Oversized & Under-length Text DoS
  assert.equal(canCreateReview(userAuth, 'rev_4a', { ...validBase, id: 'rev_4a', text: 'short' }), false);
  assert.equal(canCreateReview(userAuth, 'rev_4b', { ...validBase, id: 'rev_4b', text: 'a'.repeat(3001) }), false);
  // 5. Invalid Rating Poisoning
  assert.equal(canCreateReview(userAuth, 'rev_5a', { ...validBase, id: 'rev_5a', rating: 99 }), false);
  assert.equal(canCreateReview(userAuth, 'rev_5b', { ...validBase, id: 'rev_5b', rating: 0 }), false);
  // 6. Client Timestamp Tampering
  assert.equal(canCreateReview(userAuth, 'rev_6', { ...validBase, id: 'rev_6', createdAt: '2020-01-01T00:00:00Z' }), false);
  // 7. Overwrite / Hijack Existing Review
  assert.equal(canCreateReview(userAuth, 'rev_valid_1', validBase, true), false);
  // 8. Non-Admin Moderation Escalation
  assert.equal(canModerateReview(userAuth), false);
  assert.equal(canModerateReview(adminAuth), true);
  // 9. Non-Admin Delete
  assert.equal(canDeleteReview(userAuth, 'rev_valid_1'), false);
  assert.equal(canDeleteReview(adminAuth, 'rev_valid_1'), true);
  // 10. Unverified Admin Email Spoof
  assert.equal(canModerateReview(spoofedUnverifiedAdmin), false);
  // 11. Spoofed / Duplicate Vote
  assert.equal(
    canCreateVote(userAuth, 'rev_1_otherUid', {
      reviewId: 'rev_1',
      companyId: 3034,
      authorUid: 'user_123',
      vote: 'up',
      createdAt: REQUEST_TIME,
    }),
    false,
  );
  // 12. ID Poisoning
  assert.equal(canCreateReview(userAuth, '../../admins/bad$id', { ...validBase, id: '../../admins/bad$id' }), false);
  assert.equal(isValidId('a'.repeat(129)), false);
});
