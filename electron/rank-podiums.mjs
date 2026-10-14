import {noMotion} from './game-presentation.mjs';import {visibleRanges} from './layer-visibility.mjs';
const ranks={one:1,two:2,three:3,first:1,second:2,third:3};
export function rankCues(project){const cues=[];
 for(const s of project.scenes)for(const [i,w] of s.words.entries()){
  const phrase=s.words.slice(i,i+5).map(w=>(w.captionText??w.text).toLowerCase().replace(/[^a-z0-9 ]/g,'')).join(' '),match=/^(?:(?:the )?(?:number|rank|ranked|position)\s+(one|two|three|[123])\b|(first|second|third) place\b)/.exec(phrase);if(!match)continue;
  const token=match[1]||match[2],rank=ranks[token]||Number(token),mention=(project.pokemonMentions||[]).filter(m=>m.status==='ready'&&m.mediaId&&m.start<=w.start&&w.start-m.end<18).at(-1),explicit=s.reaction?.rankings?.find(r=>Math.abs(r.start-w.start)<1),mediaId=explicit?.mediaId||mention?.mediaId;if(!mediaId)continue;
  const before=s.words.slice(Math.max(0,i-4),i).map(w=>w.text).join(' ');if(/\b(?:not|never|isnt|isn't)\b/i.test(before))continue;cues.push({sceneId:s.id,start:w.start,end:s.end,rank,mediaId,quote:match[0]});
 }
 return cues.filter((c,i)=>!cues.slice(0,i).some(prior=>prior.sceneId===c.sceneId&&prior.rank===c.rank&&c.start-prior.start<1.5));
}
export function applyRankPodiums(project){const next=structuredClone(project),events=[];
 for(const s of next.scenes){s.layers=(s.layers||[]).filter(l=>!l.rankPodium||l.manual||l.instructionLocked);for(const l of s.layers)if(l.rankPodiumBaseline){for(const [k,v] of Object.entries(l.rankPodiumBaseline)){if(v===undefined)delete l[k];else l[k]=v;}delete l.rankPodiumBaseline;}}
 for(const cue of rankCues(next)){const s=next.scenes.find(s=>s.id===cue.sceneId);if(s.manualTemplate||s.layers.some(l=>l.rankPodium&&(l.manual||l.instructionLocked)))continue;const actor=s.layers.find(l=>l.mediaId===cue.mediaId&&l.role==='subject'&&visibleRanges(l,s.start,s.end,s.layers).some(r=>cue.start>=r.start&&cue.start<r.end)&&!l.manual&&!l.instructionLocked);if(!actor)continue;
  const id=s.id+'-rank-podium-'+Math.round(cue.start*1000),x=.28,y=.49,width=.44,height=.14;
  actor.rankPodiumBaseline={x:actor.x,y:actor.y,width:actor.width,height:actor.height,keyframes:actor.keyframes,excludedRanges:actor.excludedRanges};actor.excludedRanges=[...(actor.excludedRanges||[]),{start:cue.start,end:cue.end}];
  s.layers.push({...actor,id:id+'-actor',actorSourceId:actor.id,rankPodium:true,start:cue.start,end:cue.end,x:.22,y:.16,width:.56,height:.33,excludedRanges:[],keyframes:undefined,animation:noMotion(next)?'none':'spring-pop',entranceDuration:.22,exit:'none'});
  s.layers.push({id,type:'svg',role:'ranking-podium',rankPodium:true,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 140"><path d="M25 32L80 0H385L415 32V135H25Z" fill="#f8d368" stroke="#7d5719" stroke-width="4"/><path d="M25 32H415M385 0L415 32" fill="none" stroke="#fff0bd" stroke-width="5"/><path d="M25 32H415V135H25Z" fill="#bb842e"/></svg>',x,y,width,height,z:24,start:cue.start,end:cue.end,animation:noMotion(next)?'none':'scale-reveal',entranceDuration:.22,exit:'none'});
  s.layers.push({id:id+'-number',type:'text',role:'rank-number',rankPodium:true,text:String(cue.rank),x:.455,y:.535,width:.1,height:.07,fontSize:82,color:'#fff4cc',z:25,start:cue.start,end:cue.end,animation:'none',exit:'none'});events.push({sceneId:s.id,start:cue.start,cue:'pop',priority:8,reason:'Narrated rank '+cue.rank+' podium'});
 }
 next.rankPodiumReport={events};return next;}
