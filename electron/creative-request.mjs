export function sourceMechanicRequest(text){
 const value=String(text||'');
 return /\b(?:moves?|abilit(?:y|ies|ys)|types?|natures?)\b/i.test(value)&&/\b(?:images?|pictures?|screenshots?|google|sourced|official)\b/i.test(value)&&/\b(?:use|find|source|replace|instead|always|only|never|stop|prefer)\b/i.test(value);
}
export function creativeRequest(text,context={}){
 if(context.useAI===false)return false;
 if(/\b(?:add|insert|put|find)\b.{0,24}\b(?:an? |the )?(?:image|picture|photo|gif)\b/i.test(text)&&! /\b(?:more|many|lots|every|whenever|when|each)\b/i.test(text))return false;
 return /\b(?:style|editing|like)\b[^.!?]{0,80}\bwolfey\b|\bwolfey\b[^.!?]{0,80}\b(?:style|editing)\b|\b(?:creative|creativity|humou?r|funny|storytelling|silhouettes?|mystery hook|animated movie)\b|\b(?:hook|intro|narration|story|video)\b.*\b(?:animate|animation|creative|interesting|different|varied)\b|\b(?:animate|act out)\b.*\b(?:narration|story|video|saying|say)\b|\b(?:more|many|frequent|lots of|way more|enough)\b.*\b(?:images|pictures|visuals|effects|animations|sounds|sfx)\b|\b(?:every|each)\s*(?:2|two)\s*(?:seconds?|s)\b|\b(?:move|ability)\s+(?:descriptions?|screenshots?|images?|pictures?)\b|\b(?:show|animate|make|have)\b.*\b(?:attack|fight|battle|using|checks?|checking|counters?|countering|threatens?|threatening)\b|on paper|leaf storm|one[- ]shot|physical (?:or|and) special/i.test(String(text||''));
}
