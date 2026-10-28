import {useEffect,useRef,useState} from 'react';
import {S,t,L,lang,cn,pn,tk,minPrice,flashOn,cartCount,openModal,save,toast,validPhone,normPhone,go,track,applyTheme,catName,catOf} from '../lib/core.js';
import {Icon,Logo,PImg,CatIcon} from '../components/ui.jsx';
import {useShop,setShop,goCat,goQuick} from './state.js';
import {searchText} from './views.jsx';

export function cycleTheme(){const order=['auto','light','dark'];S.prefs.theme=order[(order.indexOf(S.prefs.theme)+1)%3];save();applyTheme();toast(t('theme')+': '+t({light:'themeLight',dark:'themeDark'}[S.prefs.theme]||'themeAuto'))}
const ThemeIcon=()=><Icon n={{light:'sun',dark:'moon'}[S.prefs.theme]||'auto'}/>;

function SearchBox({view}){
  const shop=useShop();const [open,setOpen]=useState(false);const ref=useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};const k=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('click',h);document.addEventListener('keydown',k);return ()=>{document.removeEventListener('click',h);document.removeEventListener('keydown',k)}},[]);
  const q=shop.q.trim().toLowerCase();
  const ps=q?S.products.filter(p=>q.split(/\s+/).every(w=>searchText(p).includes(w))).slice(0,6):[];
  return <div className="searchbox" ref={ref}>
    <form className="search" role="search" onSubmit={e=>{e.preventDefault();setShop({cat:''});track('Search',{q:shop.q});setOpen(false);go('products')}}>
      <input id="searchInput" type="search" autoComplete="off" placeholder={t('searchPh')} value={shop.q} aria-label={t('search')} onFocus={()=>setOpen(true)} onChange={e=>{setShop({q:e.target.value});setOpen(true)}}/>
      <button><Icon n="search"/><span>{t('search')}</span></button></form>
    <div id="suggest">{open&&q?<div className="suggest">
      {ps.length?ps.map(p=><a key={p.id} href={'#product-'+p.id} onClick={()=>setOpen(false)}><PImg p={p}/><span><b style={{fontSize:14}}>{pn(p)}</b><br/><span className="small muted">{cn(p.cat)}</span></span><span className="num" style={{fontWeight:700}}>{tk(minPrice(p))}</span></a>)
        :<div style={{padding:12}} className="muted">{t('noMatch')}</div>}
      <a className="all" href="#products" onClick={()=>{setShop({cat:''});setOpen(false)}}>{t('viewAllResults',shop.q)}</a></div>:null}</div>
  </div>;
}

function CatMenu(){
  const [open,setOpen]=useState(false);const ref=useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('click',h);return ()=>document.removeEventListener('click',h)},[]);
  return <div className="browse" ref={ref}><button aria-expanded={open} onClick={()=>setOpen(!open)}><Icon n="menu"/>{t('allCats')}</button>
    {open&&<div className="catmenu">{S.categories.map(c=><button key={c.id} onClick={()=>{setOpen(false);goCat(c.id)}}><CatIcon c={c}/>{cn(c.id)}</button>)}</div>}</div>;
}

function Newsletter(){
  const [ph,setPh]=useState('');
  return <form className="newsletter" onSubmit={e=>{e.preventDefault();if(!validPhone(ph)){toast(t('ePhone'));return}S.subscribers=S.subscribers||[];if(!S.subscribers.find(x=>x.phone===normPhone(ph)))S.subscribers.push({phone:normPhone(ph),at:Date.now()});save();setPh('');toast(t('subOk'))}}>
    <input className="inp" inputMode="tel" placeholder="01XXXXXXXXX" aria-label={t('phone')} value={ph} onChange={e=>setPh(e.target.value)}/><button className="btn">{t('subscribe')}</button></form>;
}

export default function Shop({view,children}){
  const s=S.settings,shop=useShop(),n=cartCount();
  useEffect(()=>{document.body.classList.toggle('has-sticky',view==='product');return ()=>document.body.classList.remove('has-sticky')},[view]);
  return <>
    <div className="utilbar"><div className="wrap"><span className="hide-m">{L(s,'announce')}</span><span className="r">
      <a href="#track" className="hide-m">{t('track')}</a><a href="#contact" className="hide-m">{t('hotline')}: {s.phone}</a>
      <button onClick={cycleTheme} aria-label={t('theme')} title={t('theme')}><ThemeIcon/></button>
      <a href="#admin" className="hide-m" style={{fontWeight:700}}>{t('adminPanel')} →</a></span></div></div>
    <header className="shop"><div className="wrap hmain">
      <a className="logo" href="#home"><Logo/></a>
      <SearchBox view={view}/>
      <div className="hicons"><a className="hicon hide-m" href="#account"><Icon n="user"/>{S.user?S.user.name.split(' ')[0]:t('signIn')}</a>
        <a className="hicon hide-m" href="#wishlist"><Icon n="heartO"/>{t('wishlist')}{S.wish.length?<span className="badge">{S.wish.length}</span>:null}</a>
        <button className="hicon" onClick={()=>openModal('cart')} aria-label={t('cart')}><Icon n="cart"/>{t('cart')}<span className={'badge'+(n?'':' hide')}>{n}</span></button></div>
    </div>
    <div className="catrail"><div className="wrap"><CatMenu/>
      <nav className="railnav" aria-label="Main"><a href="#home" className={view==='home'?'on':''}>{t('home')}</a>
        {flashOn()&&<button className="flash" onClick={()=>goQuick('flash')}>⚡ {L(s.flash,'title')}</button>}
        <a href="#products" className={view==='products'&&!shop.cat?'on':''} onClick={()=>setShop({cat:''})}>{t('allProducts')}</a>
        {S.categories.map(c=><button key={c.id} onClick={()=>goCat(c.id)} className={view==='products'&&shop.cat===c.id?'on':''}>{cn(c.id)}</button>)}
        <a href="#contact" className={view==='contact'?'on':''}>{t('contact')}</a></nav></div></div></header>
    <main className="wrap" id="shopMain">{children}</main>
    <footer className="shop"><div className="wrap"><div className="cols">
      <div><a className="logo" href="#home"><Logo/></a><p className="muted" style={{maxWidth:'36ch'}}>{L(s,'tagline')}</p>
        <p className="small" style={{lineHeight:1.8}}>{L(s,'address')}<br/>{t('hotline')}: <b>{s.phone}</b>{s.email?<><br/>{t('email')}: {s.email}</>:null}</p>
        <div className="small muted">{t('weAccept')}</div><div className="paylogos"><span>Cash on Delivery</span>{s.bkash&&<span>bKash</span>}{s.nagad&&<span>Nagad</span>}</div></div>
      <div><h4>{t('quickLinks')}</h4><ul><li><a href="#home">{t('home')}</a></li><li><a href="#products">{t('allProducts')}</a></li><li><a href="#about">{t('about')}</a></li><li><a href="#contact">{t('contact')}</a></li></ul></div>
      <div><h4>{t('service')}</h4><ul><li><a href="#track">{t('track')}</a></li><li><a href="#account">{t('account')}</a></li><li><a href="#wishlist">{t('wishlist')}</a></li><li><a href="#privacy">{t('privacy')}</a></li><li><a href="#terms">{t('terms')}</a></li><li><a href="#refund">{t('refund')}</a></li></ul></div>
      <div><h4>{t('newsletter')}</h4><p className="small muted" style={{margin:0}}>{t('newsS')}</p><Newsletter/>
        {s.facebook&&<p style={{marginTop:12}}><a href={s.facebook} target="_blank" rel="noopener" className="btn sm plain"><Icon n="fb"/> Facebook</a></p>}</div>
    </div><div className="footbot"><span>© {new Date().getFullYear()} {s.name}. {t('rights')}</span><span>{L(s,'announce')}</span></div></div></footer>
    <a className="wa-fab" href={'https://wa.me/'+s.whatsapp} target="_blank" rel="noopener" aria-label={t('orderWa')}><Icon n="wa"/></a>
    <nav className="bottomnav" aria-label="Mobile">
      <a href="#home" className={view==='home'?'on':''}><Icon n="home"/>{t('home')}</a>
      <a href="#products" className={view==='products'?'on':''}><Icon n="grid"/>{t('shop')}</a>
      <button onClick={()=>openModal('cart')}><Icon n="cart"/>{t('cart')}<span className={'badge'+(n?'':' hide')}>{n}</span></button>
      <a href="#account" className={view==='account'?'on':''}><Icon n="user"/>{t('account')}</a>
      <button onClick={()=>openModal('more')}><Icon n="more"/>{t('more')}</button>
    </nav>
  </>;
}
