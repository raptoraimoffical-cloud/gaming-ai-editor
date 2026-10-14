import React from 'react';
import {GAME_OPTIONS} from '../electron/game-selection.mjs';
export function GameSelector({value,onChange,disabled=false,label='Game'}:{value:string;onChange:(v:string)=>void;disabled?:boolean;label?:string}){
 return <label>{label}<select aria-label={label} disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}>{Object.entries(GAME_OPTIONS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>;
}
