"""Download only curated source packs; preserve licenses and write an indexed manifest.
No executables/scripts from asset ZIPs are extracted or executed.
"""
import argparse, concurrent.futures, hashlib, html, json, os, re, struct, subprocess, time, urllib.request, urllib.parse, wave, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CATALOG=json.loads((ROOT/'asset-packs/catalog.json').read_text(encoding='utf8'))
HEADERS={'User-Agent':'GamingAIEditor/0.1 (local attributed asset cache)'}

def fetch(url,limit=100_000_000):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=45) as response:
                if int(response.headers.get('Content-Length',0))>limit: raise ValueError('Download exceeds pack limit')
                data=response.read(limit+1)
                if len(data)>limit: raise ValueError('Download exceeds pack limit')
                return data
        except Exception:
            if attempt==2: raise
            time.sleep(1+attempt)

def emit(**data): print(json.dumps(data,ensure_ascii=True),flush=True)

def media_record(pack,file,base,license_file):
    ext=file.suffix.lower()
    if ext not in {'.png','.jpg','.jpeg','.webp','.gif','.wav','.ogg','.mp3'}: return None
    rel=file.relative_to(base).as_posix()
    if any(v in rel.lower() for v in ['preview','sample','spritesheet','tilemap','sheet_']): return None
    kind='audio' if ext in {'.wav','.ogg','.mp3'} else 'image'
    role='sound-effect' if kind=='audio' else 'background' if 'background' in rel.lower() else 'pixel-art' if pack.get('pixelArt') else 'game-art'
    data={'id':'pack-'+hashlib.sha256((pack['id']+':'+rel).encode()).hexdigest()[:24],'name':pack['name']+' / '+file.stem,'path':str(file.resolve()),'url':'','kind':kind,'duration':0,'tags':pack['tags']+' '+rel.replace('_',' ').replace('/',' '),'license':pack['license'],'assetRole':role,'pixelArt':bool(pack.get('pixelArt')),'pack':{'id':pack['id'],'name':pack['name'],'verified':True,'licensePath':str(license_file),'source':pack['source']},'identity':{'franchise':'unknown','subject':file.stem,'variant':'generic original game asset; not an official franchise match','source':pack['source'],'confidence':1},'attribution':{'credit':pack['author']+' / '+pack['license'],'source':pack['source'],'licenseUrl':('https://creativecommons.org/licenses/by/3.0/' if pack['license']=='CC-BY-3.0' else 'https://creativecommons.org/publicdomain/zero/1.0/'),'changes':'Scaled, composed and animated in Gaming AI Editor'}}
    if ext=='.png':
        raw=file.read_bytes();data['width'],data['height']=struct.unpack('>II',raw[16:24]);data['transparent']=raw[25] in (4,6) or b'tRNS' in raw
    if kind=='audio':
        try:
            if ext=='.wav':
                with wave.open(str(file),'rb') as w:data['duration']=w.getnframes()/w.getframerate()
            else:
                value=subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(file)],creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0));data['duration']=float(value.strip())
        except Exception:return None
        if not 0<data['duration']<=30:return None
        # Only file/category names describe a sound. Pack-wide tags must not make
        # every file appear to be a coin, jump, explosion, etc.
        data['tags']='sound-effect '+('retro 8-bit ' if 'retro' in pack['tags'] or '8-bit' in pack['tags'] else '')+rel.replace('_',' ').replace('/',' ')
    return data

def install_zip(pack,folder):
    base=folder/pack['id'];base.mkdir(parents=True,exist_ok=True)
    manifest=base/'manifest.json'
    if manifest.exists(): return json.loads(manifest.read_text(encoding='utf8'))
    page=fetch(pack['source']).decode('utf8');(base/'source-page.html').write_text(page,encoding='utf8')
    license_pattern=r'(?:Creative Commons CC0|>CC0<)' if pack['license'].startswith('CC0') else r'creativecommons.org/licenses/by/3.0' if pack['license']=='CC-BY-3.0' else r'(?!)'
    if not re.search(license_pattern,page,re.I):raise ValueError('Source page no longer declares the catalog license; manual rights review required')
    url=pack.get('download')
    if not url:
        links=re.findall(r'href=[\"\x27]([^\"\x27]+\.zip)[\"\x27]',page)
        url=next((html.unescape(u) for u in links if urllib.parse.urlparse(u).hostname=='kenney.nl'),None)
    if not url or urllib.parse.urlparse(url).hostname not in {'kenney.nl','opengameart.org'}:raise ValueError('Unapproved pack download URL')
    archive=base/'source.zip'
    if not archive.exists():archive.write_bytes(fetch(url))
    extracted=base/'files';extracted.mkdir(exist_ok=True);total=0
    with zipfile.ZipFile(archive) as z:
        for member in z.infolist():
            total+=member.file_size
            if total>500_000_000 or len(z.infolist())>20_000:raise ValueError('Archive exceeds safe extraction budget')
            destination=(extracted/member.filename).resolve()
            if not destination.is_relative_to(extracted.resolve()):raise ValueError('Archive path escapes the pack folder')
            if member.is_dir() or Path(member.filename).suffix.lower() not in {'.png','.jpg','.jpeg','.webp','.gif','.wav','.ogg','.mp3','.txt','.xml','.json','.md'}:continue
            destination.parent.mkdir(parents=True,exist_ok=True)
            if not destination.exists():destination.write_bytes(z.read(member))
    # Source-page evidence is retained even when the archive omits a license file.
    license_file=next((f for f in extracted.rglob('*') if f.is_file() and 'license' in f.name.lower()),base/'source-page.html')
    if license_file.suffix.lower()=='.txt' and not re.search(r'CC0|public.?domain',license_file.read_text(encoding='utf8',errors='replace'),re.I):raise ValueError('Archive license differs from the verified source-page license')
    assets=[a for f in sorted(extracted.rglob('*')) if f.is_file() for a in [media_record(pack,f,extracted,license_file)] if a]
    result={'version':1,'pack':pack,'download':url,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'assets':assets}
    manifest.write_text(json.dumps(result,ensure_ascii=True,indent=2),encoding='utf8');return result

def install_pokemon(pack,folder):
    base=folder/pack['id'];base.mkdir(parents=True,exist_ok=True);manifest=base/'manifest.json'
    if manifest.exists():
        existing=json.loads(manifest.read_text(encoding='utf8'))
        if not existing.get('failures'):return existing
    def cached_json(name,url):
        file=base/name
        if not file.exists():file.write_bytes(fetch(url,10_000_000))
        return json.loads(file.read_text(encoding='utf8'))
    catalog=cached_json('pokemon-catalog.json','https://pokeapi.co/api/v2/pokemon?limit=100000')['results']
    names={int(p['url'].rstrip('/').split('/')[-1]):p['name'] for p in catalog}
    other=cached_json('source-directory.json','https://api.github.com/repos/PokeAPI/sprites/contents/sprites/pokemon/other')
    item=next(p for p in other if p['name']=='showdown')
    tree=cached_json('source-tree.json',item['git_url']+'?recursive=1')['tree']
    # New suffix-based filenames are not equivalent to the numeric base form.
    # Only numeric IDs can be mapped to exact PokéAPI forms without guessing.
    entries=[e for e in tree if e['type']=='blob' and e['path'].endswith('.gif') and Path(e['path']).stem.isdigit() and int(Path(e['path']).stem) in names]
    license_file=base/'LICENCE.txt'
    if not license_file.exists():license_file.write_bytes(fetch('https://raw.githubusercontent.com/PokeAPI/sprites/master/LICENCE.txt'))
    assets=[];failures=[]
    def one(e):
        rel=e['path'];number=int(Path(rel).stem);name=names[number];file=base/'files'/rel;file.parent.mkdir(parents=True,exist_ok=True)
        # Stable default source URLs match the existing PokéAPI sprite resolver.
        url='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/'+rel
        if not file.exists():file.write_bytes(fetch(url,3_000_000))
        b=file.read_bytes()
        if b[:6] not in (b'GIF87a',b'GIF89a'):raise ValueError('Invalid sprite GIF: '+rel)
        # GIF dimensions are native pixels; frame counts are filled by the app indexer.
        width,height=struct.unpack('<HH',b[6:10]);variant=str(Path(rel).parent).replace('\\','/')
        suffix='' if variant=='.' else '-'+variant.replace('/','-')
        display=' '.join(p.capitalize() for p in name.split('-'));display+=(' / '+variant if suffix else '')
        return {'id':'pokemon-'+name+suffix,'kind':'pokemon','name':display,'path':str(file.resolve()),'url':'','duration':0,'tags':name+' pokemon '+variant,'license':pack['license']+'. '+pack['rightsNotice'],'width':width,'height':height,'transparent':True,'pixelArt':True,'assetRole':'pokemon-sprite','pack':{'id':pack['id'],'name':pack['name'],'verified':True,'licensePath':str(license_file),'source':pack['source']},'pokemon':{'name':name,'displayName':display,'formId':number,'nationalDex':number if number<10000 else None,'speciesName':name,'forms':[],'stats':[],'types':[],'availableSprites':[],'sourceUrl':url,'sourceKey':'other/showdown'+('/'+variant if suffix else '')+'/front_default','spriteWidth':width,'spriteHeight':height,'animated':True,'frameCount':0,'cycleMs':0,'attribution':pack['author'],'repository':pack['source'],'licenseUrl':'https://github.com/PokeAPI/sprites/blob/master/LICENCE.txt','licensePath':str(license_file),'notice':pack['rightsNotice'],'metadataPending':True}}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(one,e):e for e in entries}
        for i,f in enumerate(concurrent.futures.as_completed(futures)):
            try:assets.append(f.result())
            except Exception as error:failures.append({'path':futures[f]['path'],'error':str(error)})
            if (i+1)%100==0:emit(stage='Caching exact Pokémon sprite variants',completed=i+1,total=len(entries))
    result={'version':1,'pack':pack,'sourceTree':item['sha'],'assets':sorted(assets,key=lambda a:a['id']),'failures':failures}
    manifest.write_text(json.dumps(result,ensure_ascii=True,indent=2),encoding='utf8');return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--pack',required=True);parser.add_argument('--folder',default=str(ROOT/'workspace/asset-packs'));args=parser.parse_args()
    packs=CATALOG['packs'] if args.pack=='all' else [p for p in CATALOG['packs'] if p['id']==args.pack]
    if not packs:raise ValueError('Unknown curated pack')
    folder=Path(args.folder).resolve();folder.mkdir(parents=True,exist_ok=True)
    for pack in packs:
        emit(stage='Downloading '+pack['name'])
        try:
            result=install_pokemon(pack,folder) if pack['provider']=='pokeapi' else install_zip(pack,folder)
            emit(stage='Pack cached',pack=pack['id'],count=len(result['assets']),manifest=str(folder/pack['id']/'manifest.json'),failures=len(result.get('failures',[])))
        except Exception as error:emit(stage='Pack download failed',pack=pack['id'],error=str(error))
if __name__=='__main__':main()
