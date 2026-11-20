import pdfplumber, re, json
from collections import Counter

PDF='/mnt/user-data/uploads/Songs-with-chords-Ver-7.pdf'
CH = re.compile(r"[A-G](?:#|b)?(?:maj|min|dim|aug|sus|add|M|m|\+|°)?\d*(?:sus\d|add\d|b\d|#\d)*(?:/[A-G](?:#|b)?)?")
FULL = re.compile(r"^"+CH.pattern+r"$")
JUNK = re.compile(r"^[\-–—|().,:x\dX/]+$")

def is_chord_line(toks):
    real=0
    for t in toks:
        parts=[p for p in re.split(r"[-–—]",t) if p]
        if not parts: continue
        for p in parts:
            if FULL.match(p): real+=1
            elif JUNK.match(p): pass
            else: return False
    return real>0

def page_lines(page, base, xmin, xmax, cw):
    out=[]
    # titles via words (size>14)
    tw=[w for w in page.extract_words(extra_attrs=['size']) if xmin<=w['x0']<xmax and w['top']<725 and w['size']>14]
    tops=[]
    for w in sorted(tw,key=lambda w:(round(w['top']),w['x0'])):
        if tops and abs(tops[-1]['top']-w['top'])<3: tops[-1]['t']+=" "+w['text']
        else: tops.append({'top':w['top'],'t':w['text']})
    for t in tops: out.append({'top':t['top'],'title':True,'text':t['t']})
    chars=[c for c in page.chars if xmin<=c['x0']<xmax and c['top']<725 and c['size']<=14 and c['text'].strip()!='' ]
    chars.sort(key=lambda c:(round(c['top']),c['x0']))
    groups=[]
    for c in chars:
        if groups and abs(groups[-1][0]-c['top'])<3: groups[-1][1].append(c)
        else: groups.append([c['top'],[c]])
    for top,cs in groups:
        w=Counter(round(c['x1']-c['x0'],1) for c in cs).most_common(1)[0][0] or cw
        row={}
        for c in cs: row[round((c['x0']-base)/w)]=c['text']
        line="".join(row.get(i," ") for i in range(max(row)+1))
        out.append({'top':top,'title':False,'text':line.rstrip()})
    out.sort(key=lambda l:l['top'])
    return out

songs=[]; cur=None
pdf=pdfplumber.open(PDF)
for pi in range(5,len(pdf.pages)):
    page=pdf.pages[pi]
    cwc=Counter(round(c['x1']-c['x0'],2) for c in page.chars if 'Courier' in c['fontname'])
    cw=cwc.most_common(1)[0][0] if cwc else 6.62
    for (base,xmin,xmax) in ((22,0,318),(324,318,700)):
        for ln in page_lines(page,base,xmin,xmax,cw):
            if ln['title']:
                t=ln['text']
                if cur and cur['pend_title']:
                    cur['title']+=" "+t
                else:
                    cur={'title':t,'rows':[],'pend_title':True}; songs.append(cur)
                continue
            if cur is None: continue
            cur['pend_title']=False
            cur['rows'].append(ln['text'])

def snap(line,pos):
    n=len(line)
    if pos>=n: return None
    if line[pos]==" ":
        j=pos
        while j<n and line[j]==" ": j+=1
        return j if (j<n and j-pos<=3) else (pos if j<n else None)
    st=pos
    while st>0 and line[st-1]!=" ": st-=1
    return st if pos-st<=2 else pos

def tokens(line):
    return [(m.start(),m.group(0)) for m in re.finditer(r"\S+",line)]

def chord_list(line):
    res=[]
    for st,t in tokens(line):
        for p in re.split(r"[-–—]",t):
            pass
        off=0
        for piece in re.split(r"([-–—])",t):
            if piece and FULL.match(piece): res.append((st+off,piece))
            off+=len(piece)
    return res

def is_chord_line(line):
    toks=[t for _,t in tokens(line)]
    if not toks: return False
    real=0
    for t in toks:
        for p in [p for p in re.split(r"[-–—]",t) if p]:
            if FULL.match(p): real+=1
            elif not JUNK.match(p): return False
    return real>0

def to_chordpro(rows):
    out=[]; i=0
    while i<len(rows):
        r=rows[i]
        if is_chord_line(r):
            chs=chord_list(r)
            if i+1<len(rows) and rows[i+1].strip() and not is_chord_line(rows[i+1]):
                lyric=rows[i+1]; lead=len(lyric)-len(lyric.lstrip()); 
                ins={}; tail=[]
                for pos,c in chs:
                    p=snap(lyric,pos)
                    if p is None: tail.append(c)
                    else: ins.setdefault(p,[]).append(c)
                res=lyric
                for p in sorted(ins,reverse=True):
                    res=res[:p]+"".join(f"[{c}]" for c in ins[p])+res[p:]
                res=res.strip()
                if tail: res+=(" " if res else "")+" ".join(f"[{c}]" for c in tail)
                out.append(res.strip()); i+=2; continue
            out.append(" ".join(f"[{c}]" for _,c in chs)); i+=1; continue
        out.append(r.strip()); i+=1
    txt="\n".join(out); return re.sub(r"\n{3,}","\n\n",txt).strip()

res=[]
for n,sg in enumerate(songs):
    body=to_chordpro(sg['rows'])
    first=re.search(r"\[([A-G][#b]?m?)",body)
    key=first.group(1) if first else ""
    # leading indent of lyrics: strip common indentation
    res.append({"id":f"s{n+1:03d}","title":sg['title'].strip(),"key":key,"bpm":90,"body":body})
json.dump(res,open('/home/claude/churchchords/songs.json','w'),ensure_ascii=False,indent=1)
print(len(res)); 
for s in res[:3]: print(s['title'],s['key']); print(s['body'][:500]); print('---')
