import {useEffect,useState} from 'react';
import {S,t,L,lang,cn,pn,pdsc,dn,tk,fdate,DAY,prod,catName,catOf,minPrice,maxPrice,totalStock,pctOff,soldQty,ratingOf,reviewsOf,hasOpts,flashOn,inFlash,
  normPhone,validPhone,save,toast,openModal,COURIERS,PAY,go} from '../lib/core.js';
import {Icon,Html,PImg,CatIcon,Stars,Pill,ItemLabel} from '../components/ui.jsx';
import {ProductCard,Grid,SecHead,Countdown,Gallery,BuyBox,BoxPrice,useBuyBox,buyNow} from './parts.jsx';
import {useShop,setShop,goCat,lastOrder} from './state.js';

export function copyText(txt,ok){try{navigator.clipboard.writeText(txt).then(()=>toast(ok),()=>toast(t('copyFail')))}catch(e){toast(t('copyFail'))}}
export function searchText(p){return (p.name+' '+(p.nameEn||'')+' '+catName(p.cat)+' '+(catOf(p.cat).nameEn||'')+' '+p.desc+' '+(p.descEn||'')+' '+p.variants.map(v=>v.key+' '+v.sku).join(' ')).toLowerCase()}

/* ---------------- home ---------------- */
function Slider(){
  const bs=S.settings.banners;const [i,setI]=useState(0);
  useEffect(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches||bs.length<2)return;const id=setInterval(()=>setI(x=>(x+1)%bs.length),6000);return ()=>clearInterval(id)},[i,bs.length]);
  const b=bs[i]||bs[0];if(!b)return null;
  let ps=S.products.filter(p=>p.cat===b.cat);if(ps.length<3)ps=ps.concat(S.products.filter(p=>p.featured&&p.cat!==b.cat));
  return <section className="hero" aria-roledescription="carousel"><div id="slides"><div className="slide" style={{'--t':b.tint}}>
      <div className="txt"><span className="eyebrow">{cn(b.cat)}</span><h1>{L(b,'title')}</h1><p>{L(b,'sub')}</p>
        <div className="row"><button className="btn lg" onClick={()=>goCat(b.cat)}>{L(b,'cta')}</button><a className="btn ghost lg" href="#products">{t('allProducts')}</a></div></div>
      <div className="art">{ps.slice(0,3).map(p=><PImg key={p.id} p={p}/>)}</div></div></div>
    <div className="dots">{bs.map((x,k)=><button key={k} className={k===i?'on':''} onClick={()=>setI(k)} aria-label={'Banner '+(k+1)}/>)}</div></section>;
}
export function Home(){
  const ps=S.products,f=S.settings.flash,rec=S.recent.map(prod).filter(Boolean).slice(0,5);
  const tr=[['truck','trust1'],['cash','trust2'],['ret','trust3'],['shield','trust4']];
  return <>
    <Slider/>
    <div className="trust">{tr.map(x=><div key={x[1]}><Icon n={x[0]} size={26}/><span><b>{t(x[1])}</b><span className="muted">{t(x[1]+'s')}</span></span></div>)}</div>
    <section className="sec"><SecHead title={t('categories')} sub={t('shopByCat')}/>
      <div className="cats">{S.categories.map(c=><button className="cat" key={c.id} onClick={()=>goCat(c.id)}><CatIcon c={c}/>{cn(c.id)}<span>{t('products',ps.filter(x=>x.cat===c.id).length)}</span></button>)}</div></section>
    {flashOn()&&<section className="sec"><div className="flashbar"><Icon n="bolt"/><div><h2>{L(f,'title')}</h2><p>{t('flashS')}</p></div><span className="small" style={{marginLeft:'auto',opacity:.9}}>{t('endsIn')}</span><Countdown/></div>
      <Grid list={f.pids.map(prod).filter(Boolean)}/></section>}
    {S.categories.map(c=>{const cp=ps.filter(p=>p.cat===c.id);return cp.length?<section className="sec catsec" id={'home-'+c.id} key={c.id}>
      <div className="sec-h"><div className="row" style={{gap:12,flexWrap:'nowrap'}}><CatIcon c={c}/><div><h2>{cn(c.id)}</h2><p>{t('products',cp.length)}</p></div></div><button onClick={()=>goCat(c.id)}>{t('seeAll')} →</button></div>
      <Grid list={cp}/></section>:null})}
    {+S.settings.freeShipMin>0&&<section className="promo"><div><h3>{t('promoT',(+S.settings.freeShipMin).toLocaleString('en-IN'))}</h3><p>{t('promoS')}</p></div><a className="btn accent lg" href="#products">{t('shopNow')}</a></section>}
    {rec.length>0&&<section className="sec"><SecHead title={t('recent')}/><Grid list={rec}/></section>}
  </>;
}

/* ---------------- product list ---------------- */
function filtered(shop){
  let ps=S.products.slice();const q=shop.q.trim().toLowerCase();
  if(q)ps=ps.filter(p=>q.split(/\s+/).every(w=>searchText(p).includes(w)));
  if(shop.cat)ps=ps.filter(p=>p.cat===shop.cat);
  if(shop.quick.includes('featured'))ps=ps.filter(p=>p.featured);
  if(shop.quick.includes('stock'))ps=ps.filter(p=>totalStock(p)>0);
  if(shop.quick.includes('new'))ps=ps.filter(p=>p.isNew||Date.now()-p.createdAt<14*DAY);
  if(shop.quick.includes('combo'))ps=ps.filter(p=>p.combo||pctOff(p)>0);
  if(shop.quick.includes('flash'))ps=ps.filter(inFlash);
  if(shop.quick.includes('rated'))ps=ps.filter(p=>ratingOf(p.id).avg>=4);
  const pr={u500:[0,499],'500-1000':[500,1000],'1000-2000':[1000,2000],o2000:[2000,1e9]}[shop.price];
  if(pr)ps=ps.filter(p=>minPrice(p)<=pr[1]&&maxPrice(p)>=pr[0]);
  if(shop.min!=='')ps=ps.filter(p=>maxPrice(p)>=+shop.min);
  if(shop.max!=='')ps=ps.filter(p=>minPrice(p)<=+shop.max);
  const sorts={new:(a,b)=>b.createdAt-a.createdAt,low:(a,b)=>minPrice(a)-minPrice(b),high:(a,b)=>minPrice(b)-minPrice(a),pop:(a,b)=>soldQty(b.id)-soldQty(a.id),rate:(a,b)=>ratingOf(b.id).avg-ratingOf(a.id).avg};
  return ps.sort(sorts[shop.sort]||sorts.new);
}
export function Products(){
  const shop=useShop();const [mn,setMn]=useState(shop.min),[mx,setMx]=useState(shop.max);
  const [fopen]=useState(()=>innerWidth>860);
  const qf=[['featured','fFeatured'],['stock','fStock'],['new','fNew'],['combo','fDeals'],['rated','fRated']];if(flashOn())qf.unshift(['flash','fFlash']);
  const prs=[['','allPrices'],['u500',t('under',500)],['500-1000','৳500 – ৳1,000'],['1000-2000','৳1,000 – ৳2,000'],['o2000',t('over','2,000')]];
  const title=shop.q?t('resultsFor',shop.q):shop.cat?cn(shop.cat):t('allProducts');
  const chips=[];if(shop.cat)chips.push(['cat',cn(shop.cat)]);shop.quick.forEach(k=>{const f=qf.find(x=>x[0]===k);if(f)chips.push(['q:'+k,t(f[1])])});if(shop.q)chips.push(['q',`"${shop.q}"`]);
  const rm=k=>{if(k==='cat')setShop({cat:''});else if(k==='q')setShop({q:''});else setShop({quick:shop.quick.filter(x=>'q:'+x!==k)})};
  const ps=filtered(shop);
  return <><div className="crumb"><a href="#home">{t('home')}</a>/<span>{title}</span></div>
    <div className="shoplayout"><aside className="filters" aria-label={t('filters')}><details open={fopen}><summary>{t('filters')} <span>▾</span></summary>
      <div style={{display:'flex',flexDirection:'column',gap:18,marginTop:4}}>
        <div><h4>{t('categories')}</h4><label className="opt"><input type="radio" name="fcat" checked={!shop.cat} onChange={()=>setShop({cat:''})}/>{t('allCats')}</label>
          {S.categories.map(c=><label className="opt" key={c.id}><input type="radio" name="fcat" checked={shop.cat===c.id} onChange={()=>setShop({cat:c.id})}/>{cn(c.id)}</label>)}</div>
        <div><h4>{t('quickF')}</h4>{qf.map(([k,l])=><label className="opt" key={k}><input type="checkbox" checked={shop.quick.includes(k)} onChange={e=>setShop({quick:e.target.checked?[...shop.quick,k]:shop.quick.filter(x=>x!==k)})}/>{t(l)}</label>)}</div>
        <div><h4>{t('price')}</h4>{prs.map(([k,l])=><label className="opt" key={k}><input type="radio" name="fprice" checked={shop.price===k} onChange={()=>setShop({price:k,min:'',max:''})}/>{k?l:t(l)}</label>)}
          <div className="row" style={{marginTop:6,flexWrap:'nowrap'}}><input className="inp" type="number" placeholder={t('min')} value={mn} onChange={e=>setMn(e.target.value)} aria-label={t('min')}/><input className="inp" type="number" placeholder={t('max')} value={mx} onChange={e=>setMx(e.target.value)} aria-label={t('max')}/></div>
          <button className="btn sm plain block" style={{marginTop:8}} onClick={()=>setShop({min:mn,max:mx,price:''})}>{t('applyRange')}</button></div>
        <button className="btn sm ghost" onClick={()=>{setMn('');setMx('');setShop({q:'',cat:'',quick:[],price:'',min:'',max:''})}}>{t('clearAll')}</button></div></details></aside>
    <section><div className="toolbar"><div><h1 style={{fontSize:24,fontWeight:800}}>{title}</h1><span className="muted small">{t('products',ps.length)}</span></div>
      <select className="inp" style={{width:'auto'}} value={shop.sort} onChange={e=>setShop({sort:e.target.value})} aria-label="Sort">{[['new','sortNew'],['pop','sortPop'],['rate','sortRate'],['low','sortLow'],['high','sortHigh']].map(([k,l])=><option key={k} value={k}>{t(l)}</option>)}</select></div>
      {chips.length>0&&<div className="activef">{chips.map(c=><button key={c[0]} onClick={()=>rm(c[0])}>{c[1]} ✕</button>)}</div>}
      {ps.length?<Grid list={ps}/>:<div className="empty">{t('nothing')}</div>}</section></div></>;
}

/* ---------------- product page ---------------- */
function ReviewForm({p}){
  const [stars,setStars]=useState(0),[name,setName]=useState(S.user?S.user.name:''),[text,setText]=useState(''),[msg,setMsg]=useState(null);
  const submit=e=>{e.preventDefault();if(!name.trim()||!text.trim()||!stars){setMsg({err:t('reviewErr')});return}
    const bought=S.user&&S.orders.some(o=>o.phone===S.user.phone&&o.items.some(i=>i.pid===p.id));
    S.reviews.unshift({id:'r'+Date.now(),pid:p.id,name:name.trim(),rating:stars,text:text.trim(),at:Date.now(),approved:false,verified:!!bought});save();setStars(0);setText('');setMsg({ok:t('reviewThanks')})};
  return <form className="card" onSubmit={submit} style={{marginTop:16,display:'flex',flexDirection:'column',gap:10}}><b>{t('writeReview')}</b>
    <div className="field"><label>{t('yourRating')}</label><div className="starpick" role="radiogroup">{[1,2,3,4,5].map(k=><button type="button" key={k} className={k<=stars?'on':''} onClick={()=>setStars(k)} aria-label={String(k)}><Stars v={1} w={24} plain/></button>)}</div></div>
    <div className="field"><label htmlFor="rvName">{t('yourName')}</label><input className="inp" id="rvName" value={name} onChange={e=>setName(e.target.value)}/></div>
    <div className="field"><label htmlFor="rvText">{t('yourReview')}</label><textarea className="inp" id="rvText" value={text} onChange={e=>setText(e.target.value)}/></div>
    <span className="err">{msg&&(msg.err||<span style={{color:'var(--good)'}}>{msg.ok}</span>)}</span><button className="btn" style={{alignSelf:'flex-start'}}>{t('submitReview')}</button></form>;
}
export function Product({id}){
  const p=prod(id),box=useBuyBox(p);const [tab,setTab]=useState('desc');
  useEffect(()=>{setTab('desc')},[id]);
  if(!p)return <div className="empty" style={{marginTop:20}}>{t('notFound')} <a href="#products">{t('allProducts')}</a></div>;
  const rel=S.products.filter(x=>x.cat===p.cat&&x.id!==p.id).slice(0,5),r=ratingOf(p.id),rs=reviewsOf(p.id).sort((a,b)=>b.at-a.at),s=S.settings;
  const url=location.href.split('#')[0]+'#product-'+p.id,shareTxt=encodeURIComponent(pn(p)+' '+url);
  const dist=[5,4,3,2,1].map(k=>[k,rs.filter(x=>x.rating===k).length]);
  const showRev=()=>{setTab('rev');setTimeout(()=>{const tb=document.querySelector('.tabs');if(tb)tb.scrollIntoView({behavior:'smooth'})},30)};
  return <>
    <div className="crumb"><a href="#home">{t('home')}</a>/<a href="#products" onClick={e=>{e.preventDefault();goCat(p.cat)}}>{cn(p.cat)}</a>/<span>{pn(p)}</span></div>
    <div className="pd"><Gallery box={box}/><div className="info">
      <span className="pcat">{cn(p.cat)}</span><h1>{pn(p)}</h1>
      {r.n?<button className="rate" onClick={showRev} style={{border:0,background:'none',padding:0,cursor:'pointer'}}><Stars v={r.avg} w={16}/> <b>{r.avg.toFixed(1)}</b> · {t('reviews',r.n)}</button>:null}
      {inFlash(p)&&<div className="flashbar" style={{padding:'10px 14px',margin:0}}><Icon n="bolt"/><b>{L(s.flash,'title')}</b><span className="small" style={{marginLeft:'auto'}}>{t('endsIn')}</span><Countdown/></div>}
      <BuyBox box={box} ctx="pd"/>
      <div className="infobox"><div><Icon n="truck"/><span><b>{t('delTitle')}</b><br/>{t('delInfo',(+s.inside).toLocaleString('en-IN'),(+s.outside).toLocaleString('en-IN'))}{+s.freeShipMin>0?<><br/>{t('delFree',(+s.freeShipMin).toLocaleString('en-IN'))}</>:null}</span></div>
        <div><Icon n="ret"/><span><b>{t('retTitle')}</b><br/>{t('retInfo')}</span></div></div>
      <div className="share"><span>{t('share')}:</span><a className="btn sm plain" href={'https://wa.me/?text='+shareTxt} target="_blank" rel="noopener"><Icon n="wa"/> WhatsApp</a><a className="btn sm plain" href={'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url)} target="_blank" rel="noopener"><Icon n="fb"/> Facebook</a><button className="btn sm plain" onClick={()=>copyText(location.href,t('linkCopied'))}><Icon n="link"/> {t('copyLink')}</button></div>
      <a className="btn plain" href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent('I want to order: '+pn(p)+' '+url)}`} target="_blank" rel="noopener"><Icon n="wa"/> {t('askWa')}</a>
    </div></div>
    <div className="tabs" role="tablist"><button role="tab" className={tab==='desc'?'on':''} onClick={()=>setTab('desc')}>{t('desc')}</button><button role="tab" className={tab==='rev'?'on':''} onClick={()=>setTab('rev')}>{t('reviewsTab',r.n)}</button></div>
    <div className="tabbody">{tab==='desc'?<div className="prose"><p>{pdsc(p)}</p>{hasOpts(p)&&<p className="muted">{p.options.map((o,i)=><span key={i}>{i>0&&<br/>}<b>{o.name}:</b> {o.values.join(', ')}</span>)}</p>}</div>
      :<div className="rsum"><div><div className="big">{r.avg.toFixed(1)}</div><Stars v={r.avg} w={18}/><div className="small muted">{t('basedOn',r.n)}</div>
          <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:4}}>{dist.map(([k,c])=><div className="rbar" key={k}><span>{k}★</span><i><b style={{width:(r.n?c/r.n*100:0)+'%'}}/></i><span className="num">{c}</span></div>)}</div></div>
        <div>{rs.length?rs.map(x=><div className="review" key={x.id}><div className="row" style={{justifyContent:'space-between'}}><b>{x.name}</b><span className="small muted">{fdate(x.at,false)}</span></div>
            <div className="row" style={{gap:8}}><Stars v={x.rating} w={13}/>{x.verified&&<span className="pill good nodot" style={{fontSize:11}}>✓ {t('verified')}</span>}</div><p>{x.text}</p></div>)
          :<p className="muted">{t('noReviews')}</p>}<ReviewForm p={p}/></div></div>}</div>
    {rel.length>0&&<section className="sec"><SecHead title={t('related')}/><Grid list={rel}/></section>}
    <div className="stickybuy"><div className="p"><div className="small muted" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pn(p)}</div><div className="price num"><BoxPrice box={box}/></div></div>
      <button className="btn accent" disabled={!(box.v&&box.v.stock>0)&&box.key!==null} onClick={()=>buyNow(box,'pd')}>{t('buyNow')}</button></div>
  </>;
}
export function QuickView({id}){
  const p=prod(id),box=useBuyBox(p);if(!p)return null;
  return <div className="pd" style={{margin:0,gap:22}}><Gallery box={box}/><div className="info"><span className="pcat">{cn(p.cat)}</span><BuyBox box={box} ctx="qv"/>
    <p className="muted" style={{margin:0}}>{pdsc(p)}</p><a className="btn plain" href={'#product-'+p.id}>{t('desc')} · {t('reviewsTab',ratingOf(p.id).n)} →</a></div></div>;
}

/* ---------------- simple pages ---------------- */
export function Wishlist(){const ps=S.wish.map(prod).filter(Boolean);return <section className="sec"><SecHead title={t('wishlist')}/>{ps.length?<Grid list={ps}/>:<div className="empty">{t('wishEmpty')}</div>}</section>}

export function OrderCards({list}){
  const rank={pending:0,hold:0,confirmed:1,ready:2,transit:3,delivered:4,returned:3,partial:4,cancelled:-1};
  return list.map(o=>{const r=rank[o.status];
    return <div className="card" key={o.id}><div className="row" style={{justifyContent:'space-between'}}><b className="num">{o.inv}</b><Pill s={o.status} local/></div>
      <div className="muted small">{fdate(o.createdAt)} · {t('total')} {tk(o.total)} · {o.payment?(o.payment.method==='cod'?t('cod'):PAY[o.payment.method]):''}</div>
      <div className="small" style={{marginTop:4}}>{o.items.map((i,k)=><div key={k}><ItemLabel i={i}/> ×{i.qty}</div>)}</div>
      {o.status==='cancelled'?<p className="err" style={{margin:'10px 0 0'}}>{t('cancelledMsg')}</p>
        :<div className="journey">{[0,1,2,3,4].map(i=><div key={i} className={'jstep'+(i<=r?' done':'')+(o.status==='returned'&&i===3?' bad':'')}><i/>{t('j'+i)}</div>)}</div>}
      {o.tracking&&<div className="small" style={{marginTop:8}}>{t('courier')}: <b>{COURIERS[o.courier].t}</b> · {t('trackingId')}: <b className="num">{o.tracking}</b></div>}</div>});
}
export function Track(){
  const shop=useShop();const [q,setQ]=useState(shop.trackQ);
  const qq=shop.trackQ.trim(),list=qq?S.orders.filter(o=>o.inv.toUpperCase()===qq.toUpperCase()||o.phone===normPhone(qq)).slice(0,5):[];
  return <div className="narrow"><div className="card"><h1 style={{fontSize:24,fontWeight:800,marginBottom:6}}>{t('trackT')}</h1><p className="muted" style={{margin:'0 0 12px'}}>{t('trackS')}</p>
    <form className="row" onSubmit={e=>{e.preventDefault();setShop({trackQ:q})}}><input className="inp grow" id="trackInput" placeholder={t('trackPh')} value={q} onChange={e=>setQ(e.target.value)} aria-label={t('trackT')}/><button className="btn">{t('search')}</button></form></div>
    <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:12}}>{qq?(list.length?<OrderCards list={list}/>:<div className="empty">{t('trackNone')}</div>):null}</div></div>;
}
export function Account(){
  const u=S.user;const [name,setName]=useState(''),[ph,setPh]=useState(''),[err,setErr]=useState('');
  if(!u)return <div className="narrow" style={{maxWidth:440}}><form className="card" style={{display:'flex',flexDirection:'column',gap:12}} onSubmit={e=>{e.preventDefault();if(!name.trim()||!validPhone(ph)){setErr(t('signInErr'));return}S.user={name:name.trim(),phone:normPhone(ph)};save();toast(t('signedIn'))}}>
    <h1 style={{fontSize:24,fontWeight:800}}>{t('signInT')}</h1><p className="muted" style={{margin:0}}>{t('signInS')}</p>
    <div className="field"><label htmlFor="accName">{t('name')}</label><input className="inp" id="accName" autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></div>
    <div className="field"><label htmlFor="accPhone">{t('phone')}</label><input className="inp" id="accPhone" inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="tel" value={ph} onChange={e=>setPh(e.target.value)}/></div>
    <span className="err">{err}</span><button className="btn lg">{t('signInBtn')}</button><p className="demo-note" style={{margin:0}}>{t('signInDemo')}</p></form></div>;
  const os=S.orders.filter(o=>o.phone===u.phone);
  return <div className="narrow"><div className="card row" style={{justifyContent:'space-between'}}><div><h1 style={{fontSize:22,fontWeight:800}}>{u.name}</h1><span className="muted num">{u.phone}</span></div><button className="btn plain sm" onClick={()=>{S.user=null;save()}}>{t('signOut')}</button></div>
    <h2 style={{margin:'22px 0 10px',fontSize:18}}>{t('myOrders',os.length)}</h2><div style={{display:'flex',flexDirection:'column',gap:12}}>{os.length?<OrderCards list={os}/>:<div className="empty">{t('noOrders')} <a href="#products">{t('startShop')}</a></div>}</div></div>;
}
export function Contact(){
  const s=S.settings;const [f,setF]=useState({name:S.user?S.user.name:'',phone:S.user?S.user.phone:'',msg:''});const [res,setRes]=useState(null);
  const up=k=>e=>setF({...f,[k]:e.target.value});
  return <div className="narrow" style={{maxWidth:960}}><h1 style={{fontSize:26,fontWeight:800,marginBottom:14}}>{t('contactT')}</h1><div className="grid2" style={{alignItems:'start'}}>
    <div className="card"><dl className="kv"><dt>{t('hotline')}</dt><dd className="num"><b>{s.phone}</b></dd><dt>{t('whatsapp')}</dt><dd className="num">+{s.whatsapp}</dd>{s.email&&<><dt>{t('email')}</dt><dd>{s.email}</dd></>}<dt>{t('addressL')}</dt><dd>{L(s,'address')}</dd><dt>{t('hours')}</dt><dd>{t('hoursV')}</dd></dl></div>
    <form className="card" style={{display:'flex',flexDirection:'column',gap:10}} onSubmit={e=>{e.preventDefault();if(!f.name.trim()||!f.msg.trim()){setRes({err:t('msgErr')});return}S.messages.unshift({id:'m'+Date.now(),name:f.name.trim(),phone:f.phone.trim(),msg:f.msg.trim(),at:Date.now(),read:false});save();setF({...f,msg:''});setRes({ok:t('msgOk')})}}>
      <h3>{t('sendMsg')}</h3><div className="field"><label htmlFor="ctName">{t('name')}</label><input className="inp" id="ctName" value={f.name} onChange={up('name')}/></div>
      <div className="field"><label htmlFor="ctPhone">{t('phone')}</label><input className="inp" id="ctPhone" value={f.phone} onChange={up('phone')}/></div>
      <div className="field"><label htmlFor="ctMsg">{t('message')}</label><textarea className="inp" id="ctMsg" value={f.msg} onChange={up('msg')}/></div>
      <span className="err">{res&&(res.err||<span style={{color:'var(--good)'}}>{res.ok}</span>)}</span><button className="btn">{t('send')}</button></form></div></div>;
}
export function Page({k}){
  const txt=lang()==='en'&&S.settings.pagesEn&&S.settings.pagesEn[k]?S.settings.pagesEn[k]:S.settings.pages[k];
  return <div className="narrow"><div className="card prose"><h1 style={{fontSize:26,fontWeight:800,marginBottom:14}}>{t(k)}</h1>{String(txt||'').split(/\n+/).map((x,i)=><p key={i}>{x}</p>)}</div></div>;
}
export function Thanks(){
  const o=S.orders.find(x=>x.id===lastOrder.id);
  if(!o)return <div className="empty" style={{marginTop:20}}><a href="#home">{t('continueShop')}</a></div>;
  const pm=o.payment||{method:'cod'},first=o.name.split(' ')[0].replace(/[<>&]/g,'');
  return <div className="thanks"><div className="card hero-ok"><div className="okcircle"><Icon n="check"/></div><h1 style={{fontSize:24,fontWeight:800}}>{t('thanksT',first)}</h1>
      <Html as="p" className="muted" style={{margin:0}} html={t('thanksS','<b class="num">'+o.inv+'</b>')}/>
      {pm.method==='cod'?<Html as="p" style={{margin:0}} html={t('payCodNote','<b>'+tk(o.total)+'</b>')}/>:<p style={{margin:0}}>{t('payPendNote',PAY[pm.method],pm.trx||'')}</p>}
      <div className="row" style={{justifyContent:'center',marginTop:6}}><button className="btn" onClick={()=>{setShop({trackQ:o.inv});go('track')}}>{t('trackOrder')}</button><a className="btn plain" href="#products">{t('continueShop')}</a></div></div>
    <div className="grid2" style={{alignItems:'start'}}><div className="card"><b>{t('summary')}</b>{o.items.map((i,k)=><div className="sumrow small" key={k}><span><ItemLabel i={i}/> × {i.qty}</span><span className="num">{tk(i.price*i.qty)}</span></div>)}
        <div className="sumrow small"><span>{t('delivery')}</span><span className="num">{o.delivery?tk(o.delivery):t('free')}</span></div>{o.discount?<div className="sumrow small"><span>{t('discount')}</span><span className="num">−{tk(o.discount)}</span></div>:null}
        <div className="sumrow total"><span>{t('total')}</span><span className="num">{tk(o.total)}</span></div></div>
      <div className="card"><b>{t('whatNext')}</b><ol style={{margin:'8px 0 0',paddingLeft:20,lineHeight:1.9}}>{['next1','next2','next3'].map(k=><li key={k}>{t(k)}</li>)}</ol>
        <p className="small muted" style={{margin:'10px 0 0'}}>{o.address}, {dn(o.district)} · {o.phone}</p><a className="small" href="#admin-orders">{t('seeInAdmin')} →</a></div></div></div>;
}
