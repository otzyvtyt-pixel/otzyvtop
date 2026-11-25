# OtzyvTop Security Specification (Phase 0)

## 1. Data Invariants
1. Public visitors (`request.auth == null` or any user) can read `/meta/overview`, `/categories/*`, `/catalogShards/*`, `/companies/*`, plus `/reviews/*` and `/reviewComments/*` where `status == 'approved'`.
2. Non-approved reviews (`status == 'pending' | 'rejected'`) are readable ONLY by the review's author (`authorUid == request.auth.uid`) or an Admin (`isAdmin()`).
3. Review creation requires an authenticated, email-verified user (`request.auth.token.email_verified == true`), strict field allowlist (`keys().hasOnly`), `authorUid == request.auth.uid`, `status == 'pending'` (unless Admin), `createdAt == request.time`, valid `rating` (`1..5`), `text.size()` between `10` and `3000`, and non-collision (`!exists(...)`).
4. Updating, approving, rejecting, or deleting any review or company is strictly restricted to Admins (`isAdmin()`), except atomic `+1` helpful/unhelpful counter increments paired with a `/reviewVotes/{reviewId}_{uid}` receipt.
5. Vote deduplication enforces document ID `{reviewId}_{uid}` and forbids overwriting or deleting votes by non-admins.
6. Admin status requires both `request.auth.token.email_verified == true` and either the bootstrapped admin email (`otzyvtyt@gmail.com`) or an existing `/admins/{uid}` marker doc.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Identity Spoofing on Review Create**: Authenticated user `uid_attacker` submits `/reviews/rev_1` with `authorUid: "uid_victim"`.
2. **Self-Approval Bypass**: Non-admin user submits `/reviews/rev_2` with `status: "approved"`.
3. **Shadow / Ghost Field Injection**: User submits `/reviews/rev_3` with valid fields plus `isOfficialVerified: true` or `adminOverride: true`.
4. **Oversized Text DoS**: User submits `/reviews/rev_4` with `text` length `> 3000` (e.g., 20KB payload) or `< 10` characters.
5. **Invalid Rating Poisoning**: User submits `/reviews/rev_5` with `rating: 99` or `rating: 0` or `rating: "5"`.
6. **Client Timestamp Tampering**: User submits `/reviews/rev_6` with backdated `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
7. **Overwrite / Hijack Existing Review**: User attempts `update` or `set` on another user's `/reviews/rev_existing`.
8. **Non-Admin Moderation Escalation**: Non-admin attempts `update` on `/reviews/rev_pending` changing `status` to `"approved"`.
9. **Non-Admin Review Deletion**: Author or random user attempts `delete` on `/reviews/rev_1`.
10. **Unverified Admin Email Spoof**: User with `email: "otzyvtyt@gmail.com"` and `email_verified: false` attempts to approve a review or write `/companies/99999`.
11. **Duplicate / Spoofed Vote**: User creates `/reviewVotes/rev_1_otherUid` or increments `helpfulCount` by `+100` without a vote receipt.
12. **ID Poisoning**: Attacker targets `/reviews/../../admins/bad$id` or a 1,500-char document ID.
