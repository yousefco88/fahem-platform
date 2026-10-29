import os, re, json, glob, urllib.request, concurrent.futures as cf
ROOT='C:/Users/X-LEGEND/Desktop/اكاديمية'
os.chdir(ROOT+'/src')
# 1) الإيموجي المستخدم فعلًا في src (نص + مكوّن Emoji)
EMO=re.compile(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]\uFE0F?(?:\u200D[\U0001F300-\U0001FAFF\u2600-\u27BF]\uFE0F?)*')
used=set()
for f in glob.glob('**/*.js*',recursive=True):
    if '/ui/' in f.replace('\\','/'): continue
    used.update(EMO.findall(open(f,encoding='utf-8').read()))
# خريطة المسارات
m=open('ui/fluentEmoji.js',encoding='utf-8').read()
mp=dict(re.findall(r'^\s*"(.+?)": "(.+?)",$',m,re.M))
CDN='https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/'
def key(e): return '-'.join(f'{ord(c):x}' for c in e.replace('\ufe0f',''))
todo=[]
for e in sorted(used):
    path=mp.get(e) or mp.get(e.replace('\ufe0f',''))
    if path: todo.append((e,key(e),path))
print('used',len(used),'mapped',len(todo))
out=ROOT+'/public/emoji'; os.makedirs(out,exist_ok=True)
def dl(t):
    e,k,path=t; dst=f'{out}/{k}.png'
    if os.path.exists(dst): return (k,'cached')
    for base in (CDN, 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/'):
        try:
            urllib.request.urlretrieve(base+urllib.parse.quote(path),dst); return (k,os.path.getsize(dst))
        except Exception as ex: err='ERR '+str(ex)[:60]
    return (k,err)
import urllib.parse
with cf.ThreadPoolExecutor(8) as ex: res=list(ex.map(dl,todo))
errs=[r for r in res if isinstance(r[1],str) and r[1].startswith('ERR')]
print('downloaded',len(res)-len(errs),'errors',errs[:5])
total=sum(os.path.getsize(f) for f in glob.glob(out+'/*.png')); print('size KB',total//1024)
# 2) خريطة محلية: إيموجي → اسم الملف المحلي
local={e:k for e,k,_ in todo if os.path.exists(f'{out}/{k}.png')}
js="// الإيموجي المنسوخ محليًا إلى public/emoji (مولَّد آليًا بسكربت scripts/sync-emoji.py)\nexport const LOCAL_EMOJI = "+json.dumps(local,ensure_ascii=False,indent=2)+";\n"
open('ui/localEmoji.js','w',encoding='utf-8').write(js)
print('local map',len(local))
