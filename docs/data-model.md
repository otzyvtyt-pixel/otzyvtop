# OtzyvTop — data model

## Company

- `name` — brand name as-is; namesakes get a city/country qualifier
  (e.g. "ПодборАвто Минск", "Domino's Pizza Украина").
- `category` — one of: shops, finance, delivery, food, beauty, auto,
  realestate, education, it, travel.
- `city` — normalised to Russian spelling.
- `phone`, `email` — only if confirmed by the official site or search;
  never invented, otherwise empty.
- `website` — official site; empty if none confirmed.
- `socials` — list of {label, url}, max 8.
- `logoUrl` — logo link; empty = Google favicon by domain (128px),
  or monogram initials fallback.
- `status` — `active` / `closed`; `statusNote` explains closures,
  sanctions, licence issues (e.g. Payeer, Izium technical school).
- `description` — ≤600 chars, Russian. Confirmed facts + one sentence
  in own words summarising what other sites write. Never copy other
  people's reviews in full. Scam suspicion is worded cautiously
  ("в сети есть жалобы/предупреждения").

## Reviews (none yet at backup time)

Review = stars, pros/cons, confirmed-purchase mark, helpful/not-helpful
votes, comments, one official company reply. Moderation can hide /
restore / delete.

## Seeding rules (all batches)

Only real, currently operating companies. Name + official website
verified by web search; "not closed / licence not revoked" checked
separately. Duplicates checked by name (Russian + Latin, with/without
hyphens and spaces, no city in query) AND by website domain, plus the
`addcompany` + `getcompany` insurance: if `addcompany` returns an old
id, verify via `getcompany` whether it is the same company.
`updatecompany` overwrites unpassed fields — always pass the full
field set.
