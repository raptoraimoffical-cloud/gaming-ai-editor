const tidy=s=>String(s||'').replace(/(?:^|\s)-\S+/g,' ').replace(/\.(png|jpe?g|gif|webp)$/i,'').replace(/\b(?:a|an|the|better|real|picture|image|transparent|png|gif|animated|official|artwork|skin|render|character|mob|high resolution)\b/gi,' ').replace(/\s+/g,' ').trim();
export function imageSearchIntent(value,{game='All',type='All',purpose='subject'}={}){
 const raw=String(value||'').trim(),name=tidy(raw),animated=/animated|\bgif\b/i.test(raw)||type==='GIF',background=purpose==='background'||type==='Background'||type==='Gameplay'||/\bbackground|gameplay|environment|screenshot\b/i.test(raw),logo=type==='Logo'||/\blogo\b/i.test(raw);
 let franchise=/minecraft/i.test(raw+game)?'minecraft':/pokemon|pokémon|pikachu|charizard/i.test(raw+game)?'pokemon':/fortnite/i.test(raw+game)?'fortnite':/mario|luigi|bowser|peach/i.test(raw+game)?'mario':/call of duty|\bcod\b/i.test(raw+game)?'call-of-duty':'unknown';
 const subject=name.replace(/^(?:minecraft|pokemon|pokémon|fortnite|super mario|call of duty)\s*/i,'').replace(/\b(?:background|biome|gameplay|environment|screenshot|logo|item|weapon|sprite)\b/gi,'').replace(franchise==='mario'?/\bnintendo\b/gi:/$^/,'').trim()||(franchise==='mario'?'mario':franchise!=='unknown'?franchise:name);
 const photo=purpose==='person'||type==='Photo'||franchise==='unknown'&&/\b(?:portrait|headshot|interview|photograph|person|people)\b/i.test(raw);
 const entity=subject.toLowerCase().replace(/\bpigs\b/g,'pig').replace(/\bchickens\b/g,'chicken').replace(/\bcreepers\b/g,'creeper').replace(photo?/\b(?:portrait|headshot|interview|photograph|photo|person|people)\b/g:/$^/,'').replace(/\s+/g,' ').trim();
 let base=franchise==='mario'?'Super Mario Nintendo':franchise==='pokemon'?'Pokemon '+subject:franchise==='minecraft'?'Minecraft '+entity:franchise==='fortnite'?'Fortnite '+subject:franchise==='call-of-duty'?'Call of Duty '+(/ghost/i.test(subject)?'Simon Ghost Riley':subject):name;
 if(franchise==='mario'&&/luigi|bowser|peach/i.test(subject))base+=' '+subject;
 if(subject.toLowerCase()===franchise&&franchise!=='unknown'&&franchise!=='mario')base=franchise==='pokemon'?'Pokemon':franchise==='minecraft'?'Minecraft':franchise==='fortnite'?'Fortnite':'Call of Duty';
 let query;
 const style=background?'background':logo?'logo':animated?'animated':photo?'photo':type==='Weapon'||/sword|gun|rifle|weapon/i.test(raw)?'weapon':type==='Item'||/pickaxe|helmet|hat|item|potion|berry/i.test(raw)?'item':type==='UI'?'ui':type==='Gameplay'?'gameplay':'character';
 if(style==='background'||style==='gameplay')query=base+(franchise==='minecraft'&&/nether/i.test(subject)?' biome':'')+' gameplay screenshot high resolution';
 else if(style==='logo')query=base+' official game logo transparent png';
 else if(style==='animated')query=base+' animated sprite gif';
 else if(style==='item'||style==='weapon')query=base+' '+style+' png transparent';
 else if(style==='ui')query=base+' game UI icon png';
 else if(style==='photo')query=base+' photo'+(type==='PNG'||/transparent|\bpng\b/i.test(raw)?' transparent png':'');
 else if(franchise==='minecraft')query=base+' mob render transparent png -real -toy -plush -costume';
 else if(franchise==='fortnite')query=base+' skin render transparent png -toy -plush';
 else if(franchise==='mario')query=base+' official character render transparent png -cosplay -costume -toy -cake';
 else query=base+' official artwork transparent png';
 return {query,subject:entity,franchise,style,wantsTransparent:!background&&!animated&&(type==='PNG'||/transparent|\bpng\b/i.test(raw)),animated,background};
}
const trusted={minecraft:/^(?:[^.]+\.)*(?:minecraft\.wiki|minecraft\.net)$/,pokemon:/^(?:[^.]+\.)*(?:pokemon\.com|pokemon\.co\.jp|bulbagarden\.net|pokemondb\.net|pokeapi\.co)$/,mario:/^(?:[^.]+\.)*(?:nintendo\.com|nintendo\.co\.jp|mariowiki\.com)$/,fortnite:/^(?:[^.]+\.)*(?:fortnite\.com|epicgames\.com|fortnite-api\.com|fortnite\.gg|fortnite\.wiki)$/, 'call-of-duty':/^(?:[^.]+\.)*(?:callofduty\.com|activision\.com)$/};
export function assessWebCandidate(candidate,intent){
 const title=String(candidate.name||'').toLowerCase(),raw=[title,candidate.url,candidate.attribution?.source].join(' ').toLowerCase();let hay=raw;try{hay=decodeURIComponent(raw);}catch{}hay=hay.replace(/[_-]/g,' ');
 const reasons=[];if(/cosplay|costume|plush|toy\b|cake|figurine|statue|merchandise|lego|selfie|advertisement|watermark|shutterstock|stock photo|real pig|farm pig|amazon\.|ebay\.|etsy\./i.test(hay))reasons.push('Merchandise, photograph, advertisement or watermarked preview');
 const subject=intent.subject.replace(/^minecraft /,'').split(/\s+/).filter(Boolean),tokens=subject;
 if(!tokens.length||!tokens.every(w=>new RegExp('(?:^|[^a-z0-9])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:s?[^a-z0-9]|$)','i').test(hay)))reasons.push('Requested subject is not documented');
 const franchiseWords={minecraft:/minecraft|minecraft\.wiki/,pokemon:/pok[eé]mon|pokeapi|bulbagarden|pokemondb/,mario:/mario|nintendo/,fortnite:/fortnite|epicgames/, 'call-of-duty':/call.of.duty|activision/};
 if(franchiseWords[intent.franchise]&&!franchiseWords[intent.franchise].test(hay))reasons.push('Requested franchise is not documented');
 if(candidate.width&&candidate.height&&Math.min(candidate.width,candidate.height)<96&&!intent.animated)reasons.push('Tiny thumbnail');
 let host='',imageHost='',urlSubject=false;try{host=new URL(candidate.attribution?.source||candidate.url).hostname;imageHost=new URL(candidate.url).hostname;urlSubject=tokens.every(w=>decodeURIComponent(new URL(candidate.url).pathname).toLowerCase().includes(w));}catch{}
 const knownSource=!!trusted[intent.franchise]?.test(host)&&!!trusted[intent.franchise]?.test(imageHost);
 if(intent.background&&intent.subject===intent.franchise&&knownSource)urlSubject=true;
 if(intent.background&&!/gameplay|screenshot|terrain|forest|cave|landscape|environment|arena|background|map|biome|nether|plains/i.test(hay))reasons.push('A game environment or screenshot is not documented');
 if(candidate.decoded&&intent.background&&candidate.transparent)reasons.push('Transparent foreground art is not a game background');
 if(candidate.decoded&&intent.wantsTransparent&&!candidate.transparent)reasons.push('The decoded image has no transparent pixels');
 if(candidate.decoded&&intent.animated&&!candidate.animationInfo?.animated)reasons.push('The decoded image is static');
 const accepted=!reasons.length,autoEligible=accepted&&knownSource&&urlSubject;
 return {accepted,autoEligible,score:accepted?(autoEligible ? .94 : .69):0,confidence:accepted?(autoEligible ? .94 : .69):0,rejected:reasons,reasons:knownSource?['Documented game-specific source and original URL']:['Identity requires visual confirmation'],query:intent.query,transparent:candidate.transparent===true,intent};
}
