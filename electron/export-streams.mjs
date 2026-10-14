import {renderMedia,selectComposition} from '@remotion/renderer';
// Mix the same preview audio graph before expensive frame capture. Its temp
// files cannot be cleaned up by a simultaneous graphics-render failure. PCM
// also avoids an intermediate AAC encode before final loudness normalization.
export async function renderExportStreams({composition,serveUrl,inputProps,temp,pcm,hasAudio,progress=()=>{},select=selectComposition,render=renderMedia}){
 if(hasAudio){progress({stage:'Mixing narration, music and sound effects'});const audio=await select({serveUrl,id:'GamingAudio',inputProps});await render({composition:audio,serveUrl,inputProps,codec:'wav',imageFormat:'none',outputLocation:pcm,concurrency:2,enforceAudioTrack:true});}
 const graphicsProps={...inputProps,muteAllAudio:true};progress({stage:'Rendering video',percent:0});await render({composition:{...composition,props:{...composition.props,...graphicsProps}},serveUrl,codec:'h264',outputLocation:temp,inputProps:graphicsProps,muted:true,concurrency:2,crf:18,onProgress:p=>progress({stage:'Rendering video',percent:p.progress*100})});
}
