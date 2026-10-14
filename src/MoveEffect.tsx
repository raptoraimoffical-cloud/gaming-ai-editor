import React from 'react';
export function MoveEffect({kind,progress,seconds,imageUrl}:{kind:string;progress:number;seconds:number;imageUrl?:string}){
 const t=Math.max(0,Math.min(1,progress)),fade=Math.min(1,t*7,(1-t)*6),pulse=Math.sin(t*Math.PI),age=seconds;
 if(imageUrl&&kind==='leaf-burst')return <svg data-move-effect={kind} data-sourced-effect width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{opacity:fade,overflow:'hidden'}}>
  {Array.from({length:18},(_,i)=>{const size=54+i%4*14,x=(i%2?1000:80)+Math.sin(age*3+i)*48,y=1800-((age*(170+i%4*30)+i*191)%1600);return <image key={i} href={imageUrl} x={x-size/2} y={y-size/2} width={size} height={size} transform={`rotate(${i*43+age*110} ${x} ${y})`} opacity={.45+pulse*.3}/>;})}
 </svg>;
 if(imageUrl&&kind!=='leaf-storm')return <svg data-move-effect={kind} data-sourced-effect width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{opacity:fade,overflow:'hidden'}}>
  {Array.from({length:kind==='electric-storm'?6:14},(_,i)=>{
   const electric=kind==='electric-storm',bottom=kind==='screen-fire'||kind==='water-splash'||kind==='ice-freeze';
   const size=electric?240:260+(i%3)*45,x=electric?(i%2?940:140):i*87-35,y=electric?270+Math.floor(i/2)*530:bottom?1810-Math.sin(age*4+i)*25:300+(i*173)%1360;
   const angle=electric?(i%2?-12:12)+Math.sin(age*12+i)*4:Math.sin(age*3+i)*6;
   return <image key={i} href={imageUrl} x={x-size/2} y={y-size*.62} width={size} height={size*(.8+.2*pulse)} preserveAspectRatio="xMidYMid meet" transform={`rotate(${angle} ${x} ${y})`} opacity={electric?.65+.25*Math.sin(age*13+i)**2:.8}/>;
  })}
 </svg>;
 return <svg data-move-effect={kind} width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{opacity:fade,overflow:'hidden'}}>
 <defs><linearGradient id={'flame-'+kind} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#ff441e"/><stop offset=".55" stopColor="#ffaf24"/><stop offset="1" stopColor="#fff4a1"/></linearGradient><radialGradient id={'heat-'+kind}><stop stopColor="#ff7620" stopOpacity="0"/><stop offset=".7" stopColor="#ff7620" stopOpacity=".12"/><stop offset="1" stopColor="#f05115" stopOpacity=".48"/></radialGradient><radialGradient id={'scorch-'+kind}><stop offset=".5" stopColor="#160e06" stopOpacity="0"/><stop offset="1" stopColor="#160e06" stopOpacity=".7"/></radialGradient></defs>
 {kind==='screen-fire'&&<>
  <rect width="1080" height="1920" fill={`url(#heat-${kind})`} opacity={pulse}/><rect width="1080" height="1920" fill={`url(#scorch-${kind})`} opacity={Math.min(1,t*3)}/>
  {Array.from({length:21},(_,i)=>{const x=i*54-10,wiggle=Math.sin(age*8+i*1.7)*24,h=(260+(i%5)*95)*Math.sin(Math.PI*Math.min(1,t*1.2))*(.88+.12*Math.sin(age*7+i));return <g key={i}><path d={`M${x-45} 1940Q${x-72} ${1920-h*.36} ${x+wiggle} ${1920-h}Q${x+85} ${1920-h*.35} ${x+48} 1940Z`} fill={`url(#flame-${kind})`}/><path d={`M${x-24} 1940Q${x-30} ${1920-h*.2} ${x+wiggle*.6} ${1920-h*.65}Q${x+32} ${1920-h*.24} ${x+26} 1940Z`} fill="#ffe762"/></g>;})}
  {[0,1].map(side=><g key={side} transform={side?'translate(1080 0) scale(-1 1)':undefined}>{Array.from({length:9},(_,i)=>{const y=200+i*180,w=(70+i%3*55)*pulse;return <path key={i} d={`M0 ${y-100}Q${w*.5} ${y-40} ${w+Math.sin(age*7+i)*20} ${y-120}Q${w*1.5} ${y+35} 0 ${y+125}Z`} fill={`url(#flame-${kind})`} opacity=".9"/>;})}</g>)}
  {Array.from({length:30},(_,i)=>{const y=1920-((age*(160+i%4*65)+i*127)%1850);return <circle key={i} cx={20+(i*137)%1040+Math.sin(age*2+i)*18} cy={y} r={2+i%4} fill={i%2?'#ff8435':'#ffe77a'} opacity={.7*(1-t*.5)}/>;})}
  {t>.45&&[0,1,2].map(i=><ellipse key={i} cx={i%2?980:80} cy={1500-i*310-age*75} rx={85+i*25} ry="120" fill="#39302d" opacity={.10*(t-.45)}/>)}</>}
 {kind==='electric-storm'&&<><rect width="1080" height="1920" fill="#ffe142" opacity={pulse*.06}/>{[0,1,2,3].map(i=><path key={i} d={`M${i%2?1050:30} ${220+i*300}l${i%2?-110:110} 90 -55 18 120 145 -90 45`} fill="none" stroke={i%2?'#fcf7b1':'#ffd326'} strokeWidth={9+Math.sin(age*15+i)*3} opacity={.7*pulse}/>)}</>}
 {kind==='water-splash'&&<><path d={`M0 ${1620-Math.sin(age*3)*35}Q270 ${1480+Math.sin(age*4)*50} 540 1610T1080 1600V1920H0Z`} fill="#248fcb" opacity={.45*pulse}/>{Array.from({length:18},(_,i)=><ellipse key={i} cx={(i*151+50)%1080} cy={1900-((age*(190+i%4*80)+i*190)%1500)} rx={9+i%5*3} ry={18+i%5*6} fill="#9be9ff" opacity={pulse*.8}/>)}<ellipse cx="540" cy="1390" rx={120+t*500} ry={30+t*90} fill="none" stroke="#b4efff" strokeWidth="12" opacity={pulse*.5}/></>}
 {kind==='ice-freeze'&&<><rect width="1080" height="1920" fill="#b4ecff" opacity={pulse*.09}/>{Array.from({length:14},(_,i)=>{const x=(i*179)%1080,y=(i*283)%1920;return <g key={i} transform={`translate(${x} ${y}) rotate(${i*13}) scale(${.4+pulse})`} stroke="#d5f6ff" strokeWidth="4" opacity={pulse*.6}><path d="M-35 0H35M0-35V35M-25-25L25 25M25-25L-25 25"/></g>;})}<path d="M0 0L100 80 20 220 140 380 0 540M1080 100L980 270 1040 480 910 660 1080 860M30 1920L150 1780 75 1600 190 1440" fill="none" stroke="#9ddaff" strokeWidth="7" opacity={pulse*.5}/></>}
 {kind==='leaf-storm'&&imageUrl&&Array.from({length:36},(_,i)=>{const level=i/36,angle=age*9+i*2.4,radius=70+level*400,x=540+Math.cos(angle)*radius,y=1510-level*1150+Math.sin(angle)*60;return <image key={i} href={imageUrl} x={x-42} y={y-42} width="84" height="84" transform={`rotate(${angle*57} ${x} ${y})`} opacity={pulse*.8}/>;})}
 {kind==='leaf-burst'&&Array.from({length:18},(_,i)=><ellipse key={i} cx={(i*173+age*85)%1180-50} cy={(i*197-age*140+2400)%1920} rx="16" ry="35" fill={i%2?'#83c95d':'#b8e97c'} opacity={pulse*.8} transform={`rotate(${i*32+age*45} ${(i*173+age*85)%1180-50} ${(i*197-age*140+2400)%1920})`}/>)}
 {kind==='psychic-wave'&&[0,1,2,3].map(i=><ellipse key={i} cx="540" cy="900" rx={80+((age*260+i*150)%650)} ry={100+((age*300+i*140)%800)} fill="none" stroke={i%2?'#e291ff':'#9581f6'} strokeWidth="7" opacity={pulse*.22}/>)}
 {kind==='attack-impact'&&<g transform={`translate(540 1000) scale(${.6+pulse*.8})`} opacity={pulse*.4}><path d="M0-160L30-40 130-100 60 0 170 60 40 50 20 160-20 60-130 100-60 0-170-50-40-40Z" fill="#ffe17d" stroke="white" strokeWidth="7"/></g>}
 </svg>;
}
