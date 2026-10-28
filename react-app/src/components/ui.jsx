import {useState} from 'react';
import {S,STATUS,catOf,pn,tk,minPrice,maxPrice,bestOld,pctOff,stT,lang,sn} from '../lib/core.js';
import {LOGO_MARK,LOGO_WORD} from '../lib/logo.js';

/* ---------- icons ---------- */
const P={
  cart:'<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  heartO:'<path d="M12 20s-7-4.3-9-8.7C1.6 8 3.6 4.5 7 4.5c2 0 3.4 1.1 5 2.8 1.6-1.7 3-2.8 5-2.8 3.4 0 5.4 3.5 4 6.8-2 4.4-9 8.7-9 8.7z"/>',
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  truck:'<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  ret:'<path d="M4 9h12a4 4 0 0 1 0 8H8"/><path d="M8 5L4 9l4 4"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  bag:'<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  auto:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  check:'<path d="M5 12l5 5L20 7"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  link:'<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'
};
const FILLED={
  heart:'<path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3 1.7-1.8 3.2-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z"/>',
  wa:'<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.6 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/>',
  fb:'<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/>'
};
const SIZES={heart:17,fb:17,eye:17,search:18,sun:16,moon:16,auto:16,phone:16,link:17,bag:18,check:34,bolt:22};
export function Icon({n,size}){
  const w=size||SIZES[n]||20;
  if(FILLED[n])return <svg width={w} height={w} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" dangerouslySetInnerHTML={{__html:FILLED[n]}}/>;
  return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{__html:P[n]||''}}/>;
}

/* Trusted, app-authored strings containing <b> etc. (i18n templates). */
export const Html=({as:T='span',html,...r})=><T {...r} dangerouslySetInnerHTML={{__html:html}}/>;

/* ---------- product image with graceful fallback ---------- */
export function PImg({p,cls='',i=0}){
  const [broken,setBroken]=useState(false);
  if(!p)return <span className={'ph '+cls} style={{'--t':'#889'}}/>;
  const c=catOf(p.cat),im=(p.images||[])[i],src=im||(cls==='alt'?'':c.img);
  if(src&&!broken)return <img className={cls} src={src} alt={p.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setBroken(true)}/>;
  if(cls==='alt')return null;
  return <span className={'ph '+cls+(broken?' broken':'')} style={{'--t':c.tint}} role="img" aria-label={p.name}><i>{pn(p)}</i></span>;
}
export function CatIcon({c}){
  const [ok,setOk]=useState(true);
  return <span className="ci" style={{'--t':c.tint}}>{c.img&&ok?<img src={c.img} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setOk(false)}/>:null}<b>{(c.nameEn||c.name||'?').trim()[0]||''}</b></span>;
}
export function Stars({v,w=14,plain}){
  return <span className={plain?'':'stars'} role={plain?undefined:'img'} aria-label={plain?undefined:`${v.toFixed(1)} / 5`}>
    {[1,2,3,4,5].map(i=><svg key={i} width={w} height={w} viewBox="0 0 24 24" className={v>=i-.25?'':'off'} fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>)}
  </span>;
}
export const Pill=({s,local})=><span className={'pill '+STATUS[s].c}>{local?stT(s):STATUS[s].t}</span>;
export function PriceRange({p}){
  const a=minPrice(p),b=maxPrice(p),o=bestOld(p);
  return <><b>{tk(a)}{b>a?' – '+tk(b):''}</b>{o&&a===b?<><s>{tk(o)}</s><span className="off">-{pctOff(p)}%</span></>:null}</>;
}
export const ItemLabel=({i})=><>{i.name}{i.vkey?<> <span className="muted">({i.vkey})</span></>:null}</>;

export function Logo(){
  const s=S.settings;
  if(s.logo)return <img src={s.logo} alt={s.name}/>;
  if(/^smart chin?a gallery$/i.test((s.name||'').trim()))return <><span className="lmark" dangerouslySetInnerHTML={{__html:LOGO_MARK}}/><span style={{display:'contents'}} dangerouslySetInnerHTML={{__html:LOGO_WORD}}/></>;
  const n=sn(),m=n.match(/^(.*?)\s+(Gallery)$/);
  return <><span className="lmark" dangerouslySetInnerHTML={{__html:LOGO_MARK}}/>{m?<span className="lword"><b>{m[1]}</b><i>{m[2]}</i></span>:<span className="lword"><b>{n}</b></span>}</>;
}
export {lang};
