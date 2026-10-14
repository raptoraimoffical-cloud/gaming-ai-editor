"""Build the shipped offline English lexicon from PokeAPI's canonical data."""
import argparse, csv, io, json, urllib.request
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--from-directory')
parser.add_argument('--output',default='electron/data/pokemon-names.json')
args=parser.parse_args()
base='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
files=['pokemon.csv','pokemon_species.csv','pokemon_forms.csv','pokemon_species_names.csv']
data={}
for file in files:
    if args.from_directory: raw=(Path(args.from_directory)/file).read_text(encoding='utf-8')
    else: raw=urllib.request.urlopen(urllib.request.Request(base+file,headers={'User-Agent':'GamingAIEditor/name-catalog'}),timeout=30).read().decode('utf-8')
    data[file]=list(csv.DictReader(io.StringIO(raw)))
species={r['id']:r for r in data['pokemon_species.csv']}
english={r['pokemon_species_id']:r['name'] for r in data['pokemon_species_names.csv'] if r['local_language_id']=='9'}
pokemon={r['id']:r for r in data['pokemon.csv']}
records={}
for row in data['pokemon.csv']:
    name=row['identifier'];s=species[row['species_id']]['identifier'];label=english[row['species_id']]
    records[name]={'name':name,'species':s,'default':row['is_default']=='1','displayName':label if row['is_default']=='1' else None,'aliases':[s,label] if row['is_default']=='1' else [],'url':'https://pokeapi.co/api/v2/pokemon/'+row['id']+'/'}
for row in data['pokemon_forms.csv']:
    if row['identifier'] in records: continue
    p=pokemon[row['pokemon_id']];s=species[p['species_id']]['identifier']
    records[row['identifier']]={'name':row['identifier'],'species':s,'default':False,'aliases':[],'url':'https://pokeapi.co/api/v2/pokemon-form/'+row['id']+'/'}
result={'version':1,'source':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv','sources':[base+f for f in files],'speciesCount':len(species),'records':list(records.values())}
output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Bundled',len(species),'species and',len(records),'species/form identifiers')
