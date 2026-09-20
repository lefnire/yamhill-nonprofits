import json, os, glob, re, sys, collections

from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SP = str(ROOT / 'data') + '/'
master=json.load(open(SP+'master.json'))
tax=json.load(open(SP+'taxonomy.json'))
valid={c['id'] for c in tax['categories']}
by_id={r['id']:r for r in master}

research={}
problems=[]
for f in sorted(glob.glob(SP+'research/batch*.json')):
    name=os.path.basename(f)
    try:
        arr=json.load(open(f))
    except Exception as e:
        problems.append(f'{name}: UNPARSEABLE {e}'); continue
    if not isinstance(arr,list):
        problems.append(f'{name}: not a list'); continue
    for o in arr:
        oid=str(o.get('id','')).strip()
        if oid not in by_id:
            problems.append(f'{name}: unknown id {oid!r}'); continue
        cats=[c for c in (o.get('categories') or []) if c in valid]
        dropped=[c for c in (o.get('categories') or []) if c not in valid]
        if dropped: problems.append(f'{name}: {oid} invalid cats {dropped}')
        if not cats: cats=['other']
        seen=set(); cats=[c for c in cats if not (c in seen or seen.add(c))][:3]
        research[oid]={'displayName':(o.get('displayName') or '').strip() or None,
                       'categories':cats,
                       'description':(o.get('description') or '').strip() or None,
                       'website':(o.get('website') or None),
                       'confidence':o.get('confidence') if o.get('confidence') in ('high','medium','low') else 'low',
                       'batch':name}

missing=[r['id'] for r in master if r['id'] not in research]
print(f'researched {len(research)}/{len(master)}   missing {len(missing)}')
if problems:
    print(f'--- {len(problems)} problems (first 25) ---')
    for p in problems[:25]: print(' ', p)
if missing:
    print('--- missing ids by batch ---')
    bm=collections.Counter()
    for i,r in enumerate(master):
        if r['id'] in missing: bm[f'batch{i//28:02d}']+=1
    print(dict(bm))
    json.dump(missing, open(SP+'missing_ids.json','w'))

if '--check' in sys.argv:
    sys.exit(0)

def clean_aka(a, name):
    # IRS 'AKA' is a junk drawer: stray numeric codes, group prefixes, truncations
    if not a or not isinstance(a,str): return None
    a=a.strip()
    if re.match(r'^[\d.\s]+$', a): return None          # e.g. "4911.0"
    a=re.sub(r'^\d{2,5}\s+', '', a).strip()             # leading IRS group number
    if len(a)<3: return None
    if a.lower().rstrip('.')==name.lower().rstrip('.'): return None
    return a

def ok_url(u):
    if not u or not isinstance(u,str): return None
    u=u.strip()
    if not re.match(r'^https?://[^\s]+\.[^\s]+', u): return None
    if re.search(r'(guidestar|causeiq|propublica|charitynavigator|nonprofitfacts|taxexemptworld|opencorporates|bizapedia|greatnonprofits|charitycheck|501c3lookup|manta\.com|buzzfile|zoominfo|dnb\.com)', u, re.I): return None
    return u

orgs=[]
for r in master:
    res=research.get(r['id'], {})
    desc=res.get('description') or r.get('mission') or r.get('services')
    if not desc:
        bits=[]
        if r.get('nteeMajor'): bits.append(r['nteeMajor'].lower())
        if r.get('city'): bits.append(f"based in {r['city']}, Oregon")
        desc=('A ' + ' organization '.join(bits) + '.') if bits else \
             f"A registered nonprofit organization in {r.get('city') or 'Yamhill County'}, Oregon. Limited public information is available."
        desc=desc[0].upper()+desc[1:]
    website=ok_url(res.get('website')) or ok_url(r.get('website'))
    org={
      'id': r['id'],
      'name': (res.get('displayName') or r['name']).strip(),
      'aka': clean_aka(r.get('aka'), (res.get('displayName') or r['name']).strip()),
      'legalName': r.get('irsName') or r.get('rawName'),
      'description': desc,
      'categories': res.get('categories') or ['other'],
      'city': r.get('city'), 'state': r.get('state','OR'), 'zip': r.get('zip'),
      'address': r.get('address'),
      'website': website, 'email': r.get('email'), 'phone': r.get('phone'),
      'contact': r.get('contact'),
      'ein': r.get('ein'),
      'ntee': r.get('ntee'), 'nteeMajor': r.get('nteeMajor'),
      'subsection': r.get('subsection'), 'rulingYear': r.get('rulingYear'),
      'revenueAmt': r.get('revenueAmt') or None, 'assetAmt': r.get('assetAmt') or None,
      'deductible': r.get('deductible'),
      'originalFocus': r.get('originalFocus'),
      'confidence': res.get('confidence','low'),
    }
    # drop legalName when it's just the display name shouting
    if org['legalName'] and org['legalName'].lower().replace('.','')==org['name'].lower().replace('.',''):
        org['legalName']=None
    orgs.append({k:v for k,v in org.items() if v not in (None,'',[])})

orgs.sort(key=lambda o: o['name'].lower())

# keep only categories that are actually used, in taxonomy order
used=collections.Counter(c for o in orgs for c in o['categories'])
cats=[{**c,'count':used[c['id']]} for c in tax['categories'] if used[c['id']]]

out={'generatedAt':'2026-09-20','count':len(orgs),'categories':cats,'organizations':orgs}
dest=str(ROOT/'src'/'data'/'nonprofits.json')
json.dump(out, open(dest,'w'), indent=1, ensure_ascii=False)
print(f'\nwrote {dest}: {len(orgs)} orgs, {len(cats)} categories in use')
print('category counts:')
for c in sorted(cats, key=lambda c:-c['count']):
    print(f"  {c['count']:4d}  {c['label']}")
print('\nmulti-category orgs:', sum(1 for o in orgs if len(o['categories'])>1))
print('with website:', sum(1 for o in orgs if o.get('website')))
print('confidence:', dict(collections.Counter(o['confidence'] for o in orgs)))
