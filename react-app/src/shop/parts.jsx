import {useEffect,useState} from 'react';
import {S,t,pn,cn,L,tk,pad,DAY,HOUR,pctOff,totalStock,hasOpts,ratingOf,inFlash,variant,addToCart,toggleWish,openModal,closeModal,toast} from '../lib/core.js';
import {Icon,PImg,Stars,PriceRange} from '../components/ui.jsx';

export function ProductCard({p}){
  const d=pctOff(p),out=totalStock(p)<=0,w=S.wish.includes(p.id),r=ratingOf(p.id);
  return <article className="pcard">
    <a className="pimg" href={'#product-'+p.id} aria-label={pn(p)}><PImg p={p}/>{(p.images||[]).length>1?<PImg p={p} cls="alt" i={1}/>:null}</a>
    <span className="tags">{inFlash(p)&&<span className="tag flash">{t('tagFlash')}</span>}{d?<span className="tag">-{d}%</span>:null}{p.isNew&&<span className="tag new">{t('tagNew')}</span>}{p.combo&&<span className="tag combo">{t('tagCombo')}</span>}{out&&<span className="tag out">{t('tagOut')}</span>}</span>
    <div className="cardtools">
      <button className={'wish'+(w?' on':'')} onClick={()=>toggleWish(p.id)} aria-label={t('addWish')} aria-pressed={w}><Icon n="heart"/></button>
      <button className="qv" onClick={()=>openModal('quickview',{id:p.id})} aria-label={t('quickView')}><Icon n="eye"/></button>
    </div>
    <div className="pbody"><div className="pcat">{cn(p.cat)}</div>
      <a className="pname" href={'#product-'+p.id}>{pn(p)}</a>
      {r.n?<div className="rate"><Stars v={r.avg} w={13}/><span className="num">({r.n})</span></div>:null}
      <div className="price num"><PriceRange p={p}/></div>
      <div className="pact">{hasOpts(p)
        ?<button className="btn sm ghost" disabled={out} onClick={()=>openModal('quickview',{id:p.id})}>{t('chooseOpt')}</button>
        :<button className="btn sm" disabled={out} onClick={()=>addToCart(p.id,p.variants[0].key)}><Icon n="cart"/>{t('addCart')}</button>}</div>
    </div></article>;
}
export const Grid=({list})=><div className="pgrid">{list.map(p=><ProductCard key={p.id} p={p}/>)}</div>;

export function SecHead({title,sub,onAll}){
  return <div className="sec-h"><div><h2>{title}</h2>{sub?<p>{sub}</p>:null}</div>{onAll?<button onClick={onAll}>{t('seeAll')} →</button>:null}</div>;
}

export function Countdown(){
  const [,tick]=useState(0);
  useEffect(()=>{const i=setInterval(()=>tick(x=>x+1),1000);return ()=>clearInterval(i)},[]);
  const ms=Math.max(0,S.settings.flash.endsAt-Date.now());
  const v={d:Math.floor(ms/DAY),h:Math.floor(ms%DAY/HOUR),m:Math.floor(ms%HOUR/6e4),s:Math.floor(ms%6e4/1e3)};
  return <div className="countdown">{['d','h','m','s'].map(k=><span key={k}>{pad(v[k])}<small>{t(k)}</small></span>)}</div>;
}

/* ---------- gallery + buy box (product page and quick view) ---------- */
export function useBuyBox(p){
  const init=()=>{const sel={};if(p&&hasOpts(p)){const f=p.variants.find(v=>v.stock>0)||p.variants[0];f.vals.forEach((v,i)=>sel[i]=v)}return sel};
  const [sel,setSel]=useState(init);const [qty,setQty]=useState(1);const [img,setImg]=useState(0);
  useEffect(()=>{setSel(init());setQty(1);setImg(0)},[p&&p.id]);
  const key=!p?null:!hasOpts(p)?'':p.options.some((o,i)=>!sel[i])?null:p.options.map((o,i)=>sel[i]).join(' / ');
  const v=key===null||!p?null:variant(p,key);
  return {p,sel,setSel,qty,setQty,img,setImg,key,v};
}
export function Gallery({box}){
  const {p,img,setImg}=box,n=Math.max(1,(p.images||[]).length);
  return <div className="gallery"><div className="gmain"><PImg key={img} p={p} i={Math.min(img,n-1)}/>
      <span className="tags">{inFlash(p)&&<span className="tag flash">⚡ {t('tagFlash')}</span>}{pctOff(p)?<span className="tag">-{pctOff(p)}%</span>:null}</span></div>
    {n>1&&<div className="gthumbs">{p.images.map((im,i)=><button key={i} className={i===img?'on':''} onClick={()=>setImg(i)} aria-label={'Image '+(i+1)}><img src={im} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.visibility='hidden'}}/></button>)}</div>}
  </div>;
}
export function BoxPrice({box}){
  const {p,v}=box;
  if(v)return <><b>{tk(v.price)}</b>{v.old>v.price?<><s>{tk(v.old)}</s><span className="off">-{Math.round((v.old-v.price)/v.old*100)}%</span></>:null}</>;
  return <PriceRange p={p}/>;
}
export function buyNow(box,ctx){
  const {p,key,qty}=box;if(key===null){toast(t('pickAll'));return}
  const it=S.cart.find(x=>x.pid===p.id&&x.vkey===key);
  if(it||addToCart(p.id,key,qty,true))openModal('checkout');
}
export function BuyBox({box,ctx}){
  const {p,sel,setSel,qty,setQty,key,v}=box;
  const ok=!!(v&&v.stock>0),dis=!ok&&key!==null;
  const add=()=>{if(key===null){toast(t('pickAll'));return}if(addToCart(p.id,key,qty,ctx==='qv')&&ctx==='qv'){closeModal();openModal('cart')}};
  return <>
    <div className="bigprice price num"><BoxPrice box={box}/></div>
    <div>{v?<>{v.stock>0?(v.stock<=5?<span className="pill warn">{t('onlyLeft',v.stock)}</span>:<span className="pill good">{t('inStock')}</span>):<span className="pill bad">{t('outOpt')}</span>}{v.sku?<> <span className="small muted">{t('sku')}: {v.sku}</span></>:null}</>:<span className="small muted">{t('pickOpt')}</span>}</div>
    {(p.options||[]).map((o,i)=><div className="optgrp" key={i}><div className="lbl">{o.name}: <span>{sel[i]||t('select')}</span></div>
      <div className="ochips">{o.values.map(val=>{
        const test={...sel,[i]:val},complete=p.options.every((_,k)=>test[k]);
        const vv=complete?variant(p,p.options.map((_,k)=>test[k]).join(' / ')):null;
        return <button key={val} className={'ochip'+(sel[i]===val?' on':'')+(vv&&vv.stock<=0?' na':'')} aria-pressed={sel[i]===val} onClick={()=>setSel({...sel,[i]:val})}>{val}</button>})}</div></div>)}
    <div className="row"><span className="small muted">{t('qty')}</span><div className="qty"><button type="button" onClick={()=>setQty(Math.max(1,qty-1))} aria-label="-">−</button><span className="num">{qty}</span><button type="button" onClick={()=>setQty(Math.min(99,qty+1))} aria-label="+">+</button></div></div>
    <div className="grid2"><button className="btn ghost lg" disabled={dis} onClick={add}><Icon n="cart"/>{t('addCart')}</button><button className="btn accent lg" disabled={dis} onClick={()=>buyNow(box,ctx)}>{t('buyNow')}</button></div>
  </>;
}
export {L};
