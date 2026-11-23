#!/usr/bin/env python3
"""Build first OtzyvTop backup staging dir from local working files.

Sources: ~/workspace/otzyvtop/batch*/ payloads + root-level early payloads.
Output: ~/workspace/otzyvtop-backup/  (staging dir for github push-files)
  - README.md, docs/            (written separately)
  - catalog.json                 (consolidated, deduped, from payloads)
  - catalog-meta.json            (coverage + caveats)
  - batches/<batch>/             (final-to-add.json / progress.md / scripts,
                                  group payloads only for batches w/o final file)
Excluded: batch59 (work in progress), all-candidates/dup-hits intermediates.
"""
import json, os, re, shutil, unicodedata
from urllib.parse import urlparse

SRC = "/home/hatch/workspace/otzyvtop"
ROOT = "/home/hatch/workspace"
DST = "/home/hatch/workspace/otzyvtop-backup"
BATCHES = os.path.join(DST, "batches")

def norm(s):
    s = (s or "").strip().lower()
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[\s\-–—_]+", " ", s)
    return s

def domain(url):
    try:
        h = urlparse(url or "").netloc.lower().lstrip("www.")
        return h
    except Exception:
        return ""

def is_company(o):
    return isinstance(o, dict) and isinstance(o.get("name"), str) and o.get("name").strip() \
        and isinstance(o.get("category"), str) and o.get("category").strip()

def iter_company_objects(obj, out):
    if isinstance(obj, list):
        for it in obj:
            iter_company_objects(it, out)
    elif isinstance(obj, dict):
        if is_company(obj):
            out.append(obj)
        else:
            for v in obj.values():
                if isinstance(v, (list, dict)):
                    iter_company_objects(v, out)

def load_json_file(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("SKIP", path, e)
        return None

# --- 1. copy batch working files -------------------------------------------
os.makedirs(BATCHES, exist_ok=True)
batch_dirs = sorted(d for d in os.listdir(SRC)
                    if d.startswith("batch") and os.path.isdir(os.path.join(SRC, d)))
copied = []
for b in batch_dirs:
    if b == "batch59":
        continue
    srcd = os.path.join(SRC, b)
    dstd = os.path.join(BATCHES, b)
    os.makedirs(dstd, exist_ok=True)
    has_final = os.path.exists(os.path.join(srcd, "final-to-add.json"))
    for fn in sorted(os.listdir(srcd)):
        p = os.path.join(srcd, fn)
        if not os.path.isfile(p):
            continue
        low = fn.lower()
        if low in ("all-candidates.json", "all_candidates.json") or low.startswith("dup-hits"):
            continue
        if low.endswith(".py") or low.endswith(".md") or low == "final-to-add.json":
            shutil.copy2(p, os.path.join(dstd, fn)); copied.append((b, fn)); continue
        if low.endswith(".json"):
            # group/topup/agent payloads: copy only when no final file exists
            if not has_final:
                shutil.copy2(p, os.path.join(dstd, fn)); copied.append((b, fn))

# root-level early payloads (batches 1-11, 18)
for name in ("otzyvtop-batch11", "otzyvtop-batch18"):
    srcd = os.path.join(ROOT, name)
    if os.path.isdir(srcd):
        dstd = os.path.join(BATCHES, name.replace("otzyvtop-", ""))
        os.makedirs(dstd, exist_ok=True)
        for fn in sorted(os.listdir(srcd)):
            if fn.endswith(".json"):
                shutil.copy2(os.path.join(srcd, fn), os.path.join(dstd, fn)); copied.append((name, fn))
rp = os.path.join(SRC, "shops-batch-2026-11-22.json")
if os.path.exists(rp):
    os.makedirs(os.path.join(BATCHES, "_root"), exist_ok=True)
    shutil.copy2(rp, os.path.join(BATCHES, "_root", "shops-batch-2026-11-22.json"))

# --- 2. consolidated catalog from payloads ---------------------------------
# priority: final-to-add files first, then everything else
candidates = []  # (priority, batch, obj)
def scan_dir(d, batch, prio):
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".json"):
            continue
        low = fn.lower()
        if low in ("all-candidates.json", "all_candidates.json") or low.startswith("dup-hits"):
            continue
        data = load_json_file(os.path.join(d, fn))
        if data is None:
            continue
        objs = []
        iter_company_objects(data, objs)
        for o in objs:
            candidates.append((prio, batch, o))

for b in batch_dirs:
    if b == "batch59":
        continue
    srcd = os.path.join(SRC, b)
    fin = os.path.join(srcd, "final-to-add.json")
    if os.path.exists(fin):
        data = load_json_file(fin)
        objs = []
        iter_company_objects(data, objs)
        for o in objs:
            candidates.append((0, b, o))
    else:
        scan_dir(srcd, b, 1)
for name in ("otzyvtop-batch11", "otzyvtop-batch18"):
    srcd = os.path.join(ROOT, name)
    if os.path.isdir(srcd):
        scan_dir(srcd, name, 1)
data = load_json_file(rp)
if data:
    objs = []
    iter_company_objects(data, objs)
    for o in objs:
        candidates.append((1, "_root", o))

catalog = {}
for prio, batch, o in sorted(candidates, key=lambda t: t[0]):
    name = (o.get("name") or "").strip()
    city = (o.get("city") or "").strip()
    dom = domain(o.get("website") or "")
    key = (norm(name), norm(city))
    if key in catalog:
        # keep higher-priority record; fill empty fields from the other one
        cur = catalog[key]
        for k in ("phone", "email", "website", "description", "logoUrl", "status", "statusNote"):
            if not cur.get(k) and o.get(k):
                cur[k] = o[k]
        if isinstance(o.get("socials"), list) and o["socials"] and not cur.get("socials"):
            cur["socials"] = o["socials"]
        continue
    if dom:
        dup = None
        for k2, v in catalog.items():
            if v.get("_domain") == dom and norm(v.get("name", "")) == norm(name):
                dup = k2
                break
        if dup:
            continue
    rec = {
        "name": name,
        "category": (o.get("category") or "").strip(),
        "city": city,
        "phone": (o.get("phone") or "").strip(),
        "email": (o.get("email") or "").strip(),
        "website": (o.get("website") or "").strip(),
        "socials": o.get("socials") or [],
        "description": (o.get("description") or "").strip(),
    }
    if o.get("logoUrl"):
        rec["logoUrl"] = o["logoUrl"]
    if o.get("status"):
        rec["status"] = o["status"]
    if o.get("statusNote"):
        rec["statusNote"] = o["statusNote"]
    rec["_domain"] = dom
    rec["_source_batch"] = batch
    catalog[key] = rec

companies = sorted(catalog.values(), key=lambda r: (r["category"], r["name"].lower()))
for r in companies:
    r.pop("_domain", None)
with open(os.path.join(DST, "catalog.json"), "w", encoding="utf-8") as f:
    json.dump(companies, f, ensure_ascii=False, indent=1)

from collections import Counter
cats = Counter(r["category"] for r in companies)
meta = {
    "generated_at": "2026-11-23",
    "live_total_getoverview": 4730,
    "catalog_entries": len(companies),
    "per_category": dict(sorted(cats.items())),
    "sources": "Consolidated from local batch payload files (final-to-add.json where present, otherwise researcher group payloads). Batches 1-11 are only partially covered: their payloads survive as scattered research notes, not per-batch JSON.",
    "caveats": [
        "Payload-based reconstruction, NOT a live-database dump: a small number of candidates that were rejected as duplicates during verification may be present, and post-add corrections (e.g. Payeer closed status, logo backfill) may not be reflected.",
        "The exact live export (catalog-live.json) is produced separately from the artifact database and replaces this file when ready.",
        "Application source code is NOT included: the OtzyvTop app runs in the Muse artifact runtime and cannot be exported by the assistant (artifact.export fails for fullstack artifacts). This backup preserves data, working files and documentation.",
    ],
}
with open(os.path.join(DST, "catalog-meta.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

print("copied files:", len(copied))
print("catalog entries:", len(companies))
print("per category:", dict(sorted(cats.items())))
total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(DST) for f in fs)
print("staging total bytes:", total)
