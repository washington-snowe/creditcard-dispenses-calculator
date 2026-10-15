"""Download unmodified brand icons linked by each bank's official website."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import json

SITES = [
    ('nubank', 'Nubank', 'https://nubank.com.br/'),
    ('itau', 'Itaú', 'https://www.itau.com.br/'),
    ('bb', 'Banco do Brasil', 'https://www.bb.com.br/'),
    ('bradesco', 'Bradesco', 'https://banco.bradesco/'),
    ('santander', 'Santander', 'https://www.santander.com.br/'),
    ('inter', 'Inter', 'https://inter.co/'),
    ('caixa', 'Caixa', 'https://www.caixa.gov.br/'),
    ('c6', 'C6 Bank', 'https://www.c6bank.com.br/'),
    ('btg', 'BTG Pactual', 'https://banking.btgpactual.com/'),
    ('mercadopago', 'Mercado Pago', 'https://www.mercadopago.com.br/'),
    ('picpay', 'PicPay', 'https://picpay.com/'),
]
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'}
OUT = Path('public/banks')
OUT.mkdir(parents=True, exist_ok=True)

class Icons(HTMLParser):
    def __init__(self, base):
        super().__init__(); self.base=base; self.urls=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); rel=a.get('rel','').lower()
        if tag == 'link' and 'icon' in rel and a.get('href'):
            priority=3 if 'apple-touch-icon' in rel else 2 if 'svg' in a.get('type','') or '.svg' in a['href'] else 1
            self.urls.append((priority,urljoin(self.base,a['href'])))

def fetch(url, timeout=12):
    with urlopen(Request(url,headers=HEADERS),timeout=timeout) as r:
        if urlparse(r.geturl()).scheme != 'https': raise ValueError('Only HTTPS is permitted')
        return r.read(3_000_000), r.geturl()

def import_bank(site):
    key,name,home=site; candidates=[]; problems=[]
    manifest=OUT/'sources.json'
    if manifest.exists():
        for old in json.loads(manifest.read_text(encoding='utf-8')):
            if old.get('bank') == name and old.get('file') and (OUT/old['file']).exists():
                return old
    try:
        html,base=fetch(home); parser=Icons(base); parser.feed(html.decode('utf-8','replace'))
        candidates=[url for _,url in sorted(parser.urls,reverse=True)]
    except Exception as error: problems.append(str(error))
    candidates += [urljoin(home,'apple-touch-icon.png'),urljoin(home,'favicon.ico')]
    # Some official sites block automated clients. Fetch their cached favicon
    # once during asset import; the desktop never calls this external service.
    candidates.append('https://www.google.com/s2/favicons?domain='+urlparse(home).netloc+'&sz=128')
    for url in dict.fromkeys(candidates):
        try:
            if urlparse(url).scheme != 'https': continue
            content,final=fetch(url)
            if content.startswith(b'\x89PNG\r\n\x1a\n'): ext='png'
            elif content.startswith(b'\x00\x00\x01\x00'): ext='ico'
            elif content.startswith(b'\xff\xd8\xff'): ext='jpg'
            elif b'<svg' in content[:2000] and b'<script' not in content.lower() and b'<foreignobject' not in content.lower(): ext='svg'
            elif content.startswith(b'RIFF') and content[8:12]==b'WEBP': ext='webp'
            else: raise ValueError('Response is not a supported image')
            if len(content)<100: raise ValueError('Empty icon')
            file=key+'.'+ext; (OUT/file).write_bytes(content)
            print(name+': '+final,flush=True)
            return {'bank':name,'file':file,'website':home,'source':final,'sha256':sha256(content).hexdigest()}
        except Exception as error: problems.append(str(error))
    print('::warning::No icon for '+name+': '+'; '.join(problems)[-500:],flush=True)
    return {'bank':name,'website':home,'error':problems[-1] if problems else 'No image'}

with ThreadPoolExecutor(max_workers=5) as pool:
    records=list(pool.map(import_bank,SITES))
(OUT/'sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Imported',sum('file' in x for x in records),'of',len(records),'official icons')
