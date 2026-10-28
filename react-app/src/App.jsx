import {useEffect,useState,useSyncExternalStore} from 'react';
import {S,t,pn,prod,ratingOf,useStore,useModal,closeModal,toasts,getRoute,setSEO,applyTheme,loadTrackers,track,pushRecent,
  pdsc,cn,minPrice,maxPrice,totalStock,L,lang} from './lib/core.js';
import {Icon} from './components/ui.jsx';
import Shop from './shop/Shop.jsx';
import {Home,Products,Product,QuickView,Wishlist,Track,Account,Contact,Page,Thanks} from './shop/views.jsx';
import {Cart,Checkout,More} from './shop/modals.jsx';
import {useShop} from './shop/state.js';
import Admin,{ADMIN_MODALS} from './admin/Admin.jsx';

function useRoute(){
  const [r,setR]=useState(getRoute);
  useEffect(()=>{const h=()=>{closeModal();setR(getRoute());window.scrollTo(0,0)};window.addEventListener('hashchange',h);return ()=>window.removeEventListener('hashchange',h)},[]);
  return r;
}

function Toasts(){
  useSyncExternalStore(f=>{toasts.subs.add(f);return ()=>toasts.subs.delete(f)},()=>toasts.list);
  return <div className="toasts" aria-live="polite">{toasts.list.map(x=><div className="toast" key={x.id}>{x.msg}</div>)}</div>;
}

function Confirm({msg,onYes,yesText}){
  return <><p style={{margin:0}}>{msg}</p><div className="row" style={{justifyContent:'flex-end'}}><button className="btn plain" onClick={closeModal}>No</button><button className="btn danger" onClick={()=>{closeModal();onYes()}}>{yesText}</button></div></>;
}

/* type → [title(props), Body, options] */
const SHOP_MODALS={
  cart:[()=>t('cartTitle',S.cart.reduce((s,x)=>s+x.qty,0)),Cart,{drawer:true}],
  checkout:[()=>t('coTitle'),Checkout,{wide:true}],
  quickview:[p=>{const x=prod(p.id);return x?pn(x):''},QuickView,{wide:true}],
  more:[()=>t('more'),More,{drawer:true}],
  confirm:[()=>'Please confirm',Confirm,{}]
};
function ModalHost(){
  const m=useModal();
  useEffect(()=>{if(!m)return;const k=e=>{if(e.key==='Escape')closeModal()};document.addEventListener('keydown',k);return ()=>document.removeEventListener('keydown',k)},[m]);
  if(!m)return null;
  const def=SHOP_MODALS[m.type]||ADMIN_MODALS[m.type];if(!def)return null;
  const [title,Body,opt]=def,head=title(m.props),label=typeof head==='string'?head:'';
  const inner=<><div className="mh"><h3>{head}</h3><button className="iconbtn noprint" onClick={closeModal} aria-label="Close"><Icon n="x"/></button></div><div className="mb"><Body {...m.props}/></div></>;
  const scrim=e=>{if(e.target===e.currentTarget)closeModal()};
  return opt.drawer
    ?<div className="scrim drawer-scrim" onClick={scrim}><div className="drawer" role="dialog" aria-modal="true" aria-label={label}>{inner}</div></div>
    :<div className="scrim" onClick={scrim}><div className={'modal'+(opt.wide?' wide':'')} role="dialog" aria-modal="true" aria-label={label}>{inner}</div></div>;
}

const VIEWS=['home','products','track','wishlist','account','contact','about','privacy','terms','refund','thankyou'];
function Storefront({route}){
  const shop=useShop();
  let view,body;
  if(route.startsWith('product-')){view='product';body=<Product id={route.slice(8)}/>}
  else{view=VIEWS.includes(route)?route:'home';
    body={home:<Home/>,products:<Products/>,track:<Track/>,wishlist:<Wishlist/>,account:<Account/>,contact:<Contact/>,thankyou:<Thanks/>}[view]||<Page k={view}/>}
  // SEO + analytics per page
  useEffect(()=>{const s=S.settings;
    if(view==='product'){const p=prod(route.slice(8));if(!p)return;const r=ratingOf(p.id);pushRecent(p.id);
      setSEO(`${pn(p)} | ${s.name}`,pdsc(p),{'@context':'https://schema.org','@type':'Product',name:pn(p),description:pdsc(p),sku:p.variants[0].sku,category:cn(p.cat),brand:{'@type':'Brand',name:s.name},
        offers:{'@type':'AggregateOffer',priceCurrency:'BDT',lowPrice:minPrice(p),highPrice:maxPrice(p),availability:totalStock(p)>0?'https://schema.org/InStock':'https://schema.org/OutOfStock'},
        ...(r.n?{aggregateRating:{'@type':'AggregateRating',ratingValue:r.avg.toFixed(1),reviewCount:r.n}}:{})});
      track('ViewContent',{value:minPrice(p),ids:[p.id]})}
    else setSEO(view==='home'?`${s.name} | ${L(s,'tagline')}`:`${{products:shop.cat?cn(shop.cat):t('allProducts'),track:t('trackT'),account:t('account'),contact:t('contactT'),wishlist:t('wishlist'),thankyou:t('thanksT','').replace(/,.*/,''),about:t('about'),privacy:t('privacy'),terms:t('terms'),refund:t('refund')}[view]||''} | ${s.name}`,
      L(s,'tagline'),view==='home'?{'@context':'https://schema.org','@type':'Store',name:s.name,telephone:s.phone,address:L(s,'address'),url:location.href.split('#')[0]}:null);
  },[route,lang(),shop.cat]);
  return <Shop view={view}>{body}</Shop>;
}

export default function App(){
  useStore();const route=useRoute();
  useEffect(()=>{applyTheme();loadTrackers()});
  return <>
    {route.startsWith('admin')?<Admin page={route.slice(6)||'overview'}/>:<Storefront route={route}/>}
    <ModalHost/><Toasts/>
  </>;
}
