import json, re, collections

from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SP = str(ROOT / 'data') + '/'
s1=json.load(open(SP+'raw/sheet1.json')); s2=json.load(open(SP+'raw/eo_or.json')); s3=json.load(open(SP+'raw/sheet3.json'))

def ein(v):
    s=str(v or '').replace('.0','').strip()
    return s.zfill(9) if s.isdigit() and len(s)<=9 else None

def clean(v):
    if v is None: return None
    s=str(v).strip()
    if s in ('','None','nan'): return None
    return s

bmf={}
for r in s2:
    e=ein(r['EIN'])
    if e: bmf[e]=r

# NTEE major group -> label
NTEE_MAJOR={
 'A':'Arts, Culture & Humanities','B':'Education','C':'Environment','D':'Animal-Related',
 'E':'Health Care','F':'Mental Health & Crisis Intervention','G':'Diseases & Medical Disciplines',
 'H':'Medical Research','I':'Crime & Legal-Related','J':'Employment','K':'Food, Agriculture & Nutrition',
 'L':'Housing & Shelter','M':'Public Safety, Disaster Preparedness & Relief','N':'Recreation & Sports',
 'O':'Youth Development','P':'Human Services','Q':'International, Foreign Affairs','R':'Civil Rights & Advocacy',
 'S':'Community Improvement & Capacity Building','T':'Philanthropy, Voluntarism & Grantmaking',
 'U':'Science & Technology','V':'Social Science','W':'Public & Societal Benefit','X':'Religion-Related',
 'Y':'Mutual & Membership Benefit','Z':'Unknown'}

SUBSECTION={'3':'501(c)(3) charitable','4':'501(c)(4) social welfare','5':'501(c)(5) labor/agricultural',
 '6':'501(c)(6) business league','7':'501(c)(7) social club','8':'501(c)(8) fraternal beneficiary',
 '9':'501(c)(9) voluntary employees beneficiary','10':'501(c)(10) domestic fraternal','13':'501(c)(13) cemetery',
 '19':'501(c)(19) veterans','12':'501(c)(12) benevolent life insurance / mutual utility','2':'501(c)(2) title holding',
 '14':'501(c)(14) credit union','15':'501(c)(15) mutual insurance','23':'501(c)(23) veterans association',
 '25':'501(c)(25) title holding','92':'401(a) trust','91':'4947(a)(1) trust'}

# income/asset code -> range label (IRS BMF codes)
CODE_RANGE={0:'$0',1:'$1–$9,999',2:'$10,000–$24,999',3:'$25,000–$99,999',4:'$100,000–$499,999',
 5:'$500,000–$999,999',6:'$1,000,000–$4,999,999',7:'$5,000,000–$9,999,999',8:'$10,000,000–$49,999,999',
 9:'$50,000,000+'}

def money(v):
    try:
        f=float(v)
        return int(f) if f else 0
    except: return None

def num(v):
    try: return int(float(v))
    except: return None

def bmf_block(e):
    b=bmf.get(e)
    if not b: return {}
    ntee=clean(b.get('NTEE_CD'))
    sub=str(num(b.get('SUBSECTION')) or '')
    ruling=clean(b.get('RULING'))
    ry=None
    if ruling:
        rr=str(num(ruling) or '')
        if len(rr)==6: ry=int(rr[:4])
    inc=num(b.get('INCOME_CD')); ast=num(b.get('ASSET_CD'))
    out={
      'irsName': clean(b.get('NAME')),
      'ntee': ntee,
      'nteeMajor': NTEE_MAJOR.get((ntee or ' ')[0]) if ntee else None,
      'subsection': SUBSECTION.get(sub, f'501(c)({sub})' if sub else None),
      'rulingYear': ry,
      'revenueAmt': money(b.get('REVENUE_AMT')),
      'assetAmt': money(b.get('ASSET_AMT')),
      'incomeRange': CODE_RANGE.get(inc) if inc is not None else None,
      'assetRange': CODE_RANGE.get(ast) if ast is not None else None,
      'deductible': num(b.get('DEDUCTIBILITY'))==1,
    }
    return {k:v for k,v in out.items() if v not in (None,'')}

def titlecase(s):
    if not s: return s
    s=str(s).strip()
    # only fix ALL-CAPS
    letters=[c for c in s if c.isalpha()]
    if letters and all(c.isupper() for c in letters):
        small={'of','and','the','for','a','an','in','on','at','to','by','de','la','el'}
        acro={'FFA','4-H','PTA','PTO','USA','US','VFW','AFL','CIO','YMCA','YWCA','FBLA','DAR','AMVETS',
              'LLC','INC','II','III','IV','NW','SW','NE','SE','OR','EMS','ATV','BMX','STEM','UMC','LDS',
              'AAUW','AARP','NAACP','LGBTQ','SBDC','CASA','ABATE','FOP','IBEW','SEIU','AFSCME','OEA','NEA'}
        parts=s.split()
        out=[]
        for i,p in enumerate(parts):
            core=re.sub(r'[^A-Z0-9]','',p)
            if core in acro or (len(core)<=3 and core.isalpha() and core not in {'THE','AND','FOR','OF','INC'} and i==0 and len(parts)==1):
                out.append(p)
            elif p.lower() in small and i>0:
                out.append(p.lower())
            else:
                out.append(re.sub(r"[A-Za-z']+", lambda m: m.group(0).capitalize(), p.lower()))
        s=' '.join(out)
    # ordinals: 2Nd -> 2nd
    s=re.sub(r'(\d)(St|Nd|Rd|Th)\b', lambda m: m.group(1)+m.group(2).lower(), s)
    # Mc/Mac names
    s=re.sub(r'\bMc([a-z])', lambda m: 'Mc'+m.group(1).upper(), s)
    s=re.sub(r'\bO\'([a-z])', lambda m: "O'"+m.group(1).upper(), s)
    s=re.sub(r'\bPo Box\b','PO Box',s)
    s=re.sub(r'\b(Ne|Nw|Se|Sw)\b', lambda m: m.group(1).upper(), s)
    s=re.sub(r'\bUs\b','US',s)
    return s

def fix_url(u):
    u=clean(u)
    if not u: return None
    if re.match(r'^https?://', u, re.I): return u
    # bare domain?
    if re.match(r'^(www\.)?[\w-]+(\.[\w-]+)+(/.*)?$', u): return 'https://'+u
    return None  # things like "Home | Dayton FFA Alumni" are page titles, not URLs

def fix_zip(z):
    z=clean(z)
    if not z: return None
    z=z.replace('.0','')
    m=re.match(r'^(\d{5})', z)
    return m.group(1) if m else None

def fix_phone(p):
    p=clean(p)
    if not p: return None
    d=re.sub(r'\D','',p)
    if len(d)==11 and d[0]=='1': d=d[1:]
    return f'{d[0:3]}-{d[3:6]}-{d[6:10]}' if len(d)==10 else p

records={}
order=[]

def put(rec):
    key=rec.get('ein') or ('name:'+re.sub(r'[^a-z0-9]','',rec['name'].lower()))
    if key in records:
        for k,v in rec.items():
            if v and not records[key].get(k): records[key][k]=v
    else:
        rec['id']=key
        records[key]=rec; order.append(key)
    return records[key]

# 1) sheet1 - the curated master with focus labels
for r in s1:
    if clean(r['Focus'])=='Focus': continue
    e=ein(r['EIN'])
    name=clean(r['Name'])
    if not name: continue
    rec={
      'ein': e,
      'name': titlecase(name),
      'rawName': name,
      'aka': titlecase(clean(r['AKA'])) if clean(r['AKA']) else None,
      'originalFocus': clean(r['Focus']),
      'contact': titlecase(re.sub(r'^%\s*','',clean(r['Contact']) or '')) or None if clean(r['Contact']) else None,
      'address': titlecase(clean(r['Mailing Address'])),
      'city': titlecase(clean(r['City'])),
      'state': clean(r['State']) or 'OR',
      'zip': fix_zip(r['Zip-Code']),
      'email': (clean(r['Email']) or '').lower() or None,
      'website': fix_url(r['Website']),
      'websiteRaw': clean(r['Website']),
      'mission': clean(r['Mission']),
      'source': ['spreadsheet'],
    }
    rec={k:v for k,v in rec.items() if v not in (None,'')}
    if e: rec.update(bmf_block(e))
    put(rec)

# 2) extra EINs present in sheet3 BMF block but not sheet1
s1_eins={ein(r['EIN']) for r in s1 if ein(r['EIN'])}
for r in s3:
    e=ein(r['Nonprofit'])
    if not e or e in s1_eins: continue
    b=bmf.get(e) or {}
    name=clean(r['Phone Number']) or clean(b.get('NAME'))
    if not name: continue
    rec={
      'ein': e, 'name': titlecase(name), 'rawName': name,
      'contact': titlecase(re.sub(r'^%\s*','',clean(r['Email']) or '')) or None if clean(r['Email']) else None,
      'address': titlecase(clean(r['Street Address'])),
      'city': titlecase(clean(r['City'])), 'state': clean(r['State']) or 'OR',
      'zip': fix_zip(r['Zip']),
      'source': ['irs-bmf'],
    }
    rec={k:v for k,v in rec.items() if v not in (None,'')}
    rec.update(bmf_block(e))
    put(rec)

# 3) the 7 hand-curated directory rows (merge by fuzzy name where possible)
def nkey(n):
    n=re.sub(r'\(.*?\)','',str(n or '')).upper()
    n=re.sub(r'[^A-Z0-9 ]',' ',n)
    n=re.sub(r'\b(THE|INC|INCORPORATED|CORP|CORPORATION|OF|AND|A)\b',' ',n)
    return re.sub(r'\s+','',n)
byname={nkey(v['name']):v for v in records.values()}
for r in s3[:7]:
    name=clean(r['Nonprofit'])
    if not name or name=='EIN': continue
    extra={
      'phone': fix_phone(r['Phone Number']),
      'email': (clean(r['Email']) or '').lower() or None,
      'website': fix_url(r['Website']),
      'services': clean(r['Services']),
      'address': clean(r['Street Address']),
      'city': clean(r['City']), 'zip': fix_zip(r['Zip']),
    }
    extra={k:v for k,v in extra.items() if v}
    k=nkey(name)
    tgt=byname.get(k)
    if tgt:
        for kk,vv in extra.items():
            tgt.setdefault(kk,vv)
        tgt.setdefault('curatedName', name)
        tgt.setdefault('source',[]).append('curated-list')
    else:
        rec={'name':name,'rawName':name,'state':'OR','source':['curated-list']}
        rec.update(extra)
        put(rec)

out=[records[k] for k in order]
print('total records', len(out))
print('with ntee', sum(1 for r in out if r.get('ntee')))
print('with website', sum(1 for r in out if r.get('website')))
print('with focus', sum(1 for r in out if r.get('originalFocus')))
print('with revenue>0', sum(1 for r in out if r.get('revenueAmt')))
json.dump(out, open(SP+'master.json','w'), indent=1)
print(json.dumps(out[0], indent=1))
print(json.dumps(out[640], indent=1))
