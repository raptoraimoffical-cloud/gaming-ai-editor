const indexes=new WeakMap();
// Cache object lookups, never animation values. Replacements and in-place
// edits remain observable; duplicate IDs retain Array.find's first-match rule.
export function byId(array,id){
 if(!array||id===undefined)return undefined;
 let index=indexes.get(array);
 const build=()=>{const items=new Map();array.forEach((value,i)=>{if(!items.has(value.id))items.set(value.id,{value,i});});index={length:array.length,items};indexes.set(array,index);};
 if(!index||index.length!==array.length)build();
 const entry=index.items.get(id);if(entry&&array[entry.i]===entry.value&&entry.value.id===id)return entry.value;
 const found=array.find(value=>value.id===id);if(entry||found)build();return found;
}
