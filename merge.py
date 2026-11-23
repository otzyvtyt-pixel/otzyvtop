import json, sys, os

ledger = sys.argv[1] if len(sys.argv) > 1 else '/home/hatch/workspace/otzyvtop-backup/spill_ledger.txt'
out = sys.argv[2] if len(sys.argv) > 2 else '/home/hatch/workspace/otzyvtop-backup/catalog-live.json'
by_id = {}
files_used = []
with open(ledger) as f:
    paths = [l.strip() for l in f if l.strip()]
for p in paths:
    if not os.path.exists(p):
        print('MISSING FILE:', p); continue
    try:
        d = json.load(open(p))
    except Exception as e:
        print('PARSE FAIL:', p, e); continue
    comps = None
    if isinstance(d, dict):
        data = d.get('data')
        if isinstance(data, dict) and isinstance(data.get('companies'), list):
            comps = data['companies']
    if comps is None:
        print('NO COMPANIES:', p); continue
    files_used.append(p)
    for c in comps:
        cid = c.get('id')
        if isinstance(cid, int) and cid not in by_id:
            by_id[cid] = c
arr = [by_id[k] for k in sorted(by_id)]
with open(out, 'w') as f:
    json.dump(arr, f, ensure_ascii=False)
from collections import Counter
print('files_used:', len(files_used))
print('unique_companies:', len(arr))
print('id_min:', arr[0]['id'] if arr else None, 'id_max:', arr[-1]['id'] if arr else None)
print('per_category:', dict(Counter(c.get('category') for c in arr)))
print('bytes:', os.path.getsize(out))
