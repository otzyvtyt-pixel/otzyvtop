# OtzyvTop — backup

OtzyvTop — bilingual (Russian / Ukrainian) review website for all companies:
ratings, reviews, company pages. Private backup repository.

- Live site: Muse fullstack artifact `otzyvtop` (runs in the Muse runtime).
- Catalog on 2026-11-23: **4730 companies**, 0 reviews yet.
- Target: 5000 companies, then stop expanding the catalog and switch focus
  to reviews and launch preparation.
- Priority: Ukrainian companies first (Russians search in Yandex);
  prepayment niches first — construction/repair, custom furniture/kitchens,
  dentistry/plastic surgery, tourism/visas, real estate/developers, lawyers,
  weddings, franchises, interior design, investments/brokers, equipment repair
  and car services, car selection/inspection, employment agencies, shops, courses.

## What is in this backup

| Path | Contents |
|---|---|
| `catalog/by-category/` | Consolidated catalog reconstructed from local batch payloads (4659 entries), one file per category. See `catalog-meta.json` for coverage and caveats. Replaced by the exact live-database export (`catalog-live.json`) when it lands. |
| `catalog-meta.json` | How `catalog.json` was built, per-category counts, known gaps. |
| `batches/` | Per-batch working files: verified `final-to-add.json` lists, `progress.md` reports, helper scripts; researcher group payloads for batches that have no final file. Batch 59 (in progress at backup time) is excluded. |
| `docs/` | Project history, data model, design system. |
| `build_backup.py` | Script that built this snapshot from the local working files. |

## Important limitation — read this first

The OtzyvTop **application source code is NOT in this repository**.
The app runs as a fullstack artifact inside the Muse runtime, and the
assistant has no tool to read or export its source (`artifact.export`
fails for fullstack artifacts — verified 2026-11-23). This backup
preserves the valuable part that can be preserved from outside the
runtime: the full company data, the per-batch working files, and the
documentation. The live site keeps running in Muse; the code itself
lives in the artifact platform.

## How to restore the catalog

If the catalog ever needs rebuilding, re-add the companies from
`catalog/by-category/` through the artifact's `addcompany` action (one call per
company), then verify with `getoverview` and spot-check with
`getcompany`. Company logos resolve automatically from the company's
own domain via Google's favicon service (`backfilllogos` action).
Reviews, votes and comments are not in this snapshot (count was 0 at
backup time); when reviews exist they need a separate live export.

## Categories

`shops`, `finance`, `delivery`, `food`, `beauty`, `auto`, `realestate`,
`education`, `it`, `travel`.
