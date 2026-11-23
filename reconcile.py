import json, sys
cat = json.load(open('/home/hatch/workspace/otzyvtop-backup/catalog-live.json'))
total = int(sys.argv[1])
have = {c['id'] for c in cat}
missing = [i for i in range(1, total + 1) if i not in have]
print('total_live:', total)
print('exported:', len(have))
print('missing_count:', len(missing))
print('missing_ids:', missing[:500])
