import {useEffect,useMemo,useRef,useState} from 'react';
import {S,t,pn,tk,AREAS,DAY,PAY,variant,prod,cartItems,cartSub,cartCount,couponCalc,deliveryFor,validPhone,normPhone,createOrder,
  save,toast,track,closeModal,openModal,go} from '../lib/core.js';
import {Html,PImg} from '../components/ui.jsx';
import {lastOrder} from './state.js';
import {cycleTheme} from './Shop.jsx';

export function ShipBar({sub}){const m=+S.settings.freeShipMin;if(!(m>0))return null;const left=Math.max(0,m-sub);
  return <div className="shipbar">{left>0?<Html html={t('shipLeft',tk(left))}/>:'🎉 '+t('shipFree')}<i><b style={{width:Math.min(100,sub/m*100)+'%'}}/></i></div>}

export function Cart(){
  const items=cartItems(),sub=cartSub();
  const cq=(i,d)=>{const it=S.cart[i];if(!it)return;const v=variant(prod(it.pid),it.vkey);it.qty+=d;if(v&&it.qty>v.stock){it.qty=v.stock;toast(t('maxStock',v.stock))}if(it.qty<=0)S.cart.splice(i,1);save()};
  if(!items.length)return <><div className="empty">{t('cartEmpty')}</div><a className="btn block" href="#products" onClick={closeModal}>{t('startShop')}</a></>;
  return <><ShipBar sub={sub}/><div>{items.map((x,i)=><div className="citem" key={x.pid+x.vkey}><PImg p={x.p}/><div>
      <a href={'#product-'+x.pid} onClick={closeModal} style={{fontWeight:700,fontSize:14,color:'var(--ink)',textDecoration:'none'}}>{pn(x.p)}</a>{x.vkey&&<div className="small muted">{x.vkey}</div>}
      <div className="small muted num">{tk(x.v.price)} × {x.qty}</div>
      <div className="row" style={{marginTop:4}}><div className="qty"><button onClick={()=>cq(i,-1)} aria-label="-">−</button><span className="num">{x.qty}</span><button onClick={()=>cq(i,1)} aria-label="+">+</button></div>
        <button className="iconbtn small" onClick={()=>{S.cart.splice(i,1);save()}} style={{color:'var(--bad)'}}>{t('remove')}</button></div></div>
      <b className="num">{tk(x.v.price*x.qty)}</b></div>)}</div>
    <div className="sumrow" style={{fontSize:16}}><span>{t('subtotal')}</span><b className="num">{tk(sub)}</b></div><p className="small muted" style={{margin:0}}>{t('delAtCheckout')}</p>
    <button className="btn block accent lg" onClick={()=>openModal('checkout')}>{t('checkout')} →</button></>;
}

export function Checkout(){
  const items=useMemo(()=>cartItems(),[]),sub=useMemo(()=>cartSub(),[]),s=S.settings,u=S.user||{};
  const [f,setF]=useState({name:u.name||'',phone:u.phone||'',addr:'',dist:'',note:'',pay:'cod',sender:'',trx:'',coupon:''});
  const [coupon,setCoupon]=useState(''),[cMsg,setCMsg]=useState(null),[err,setErr]=useState('');
  const draftId=useRef('d'+Date.now()),timer=useRef(null),done=useRef(false);
  const up=k=>e=>setF(x=>({...x,[k]:e.target.value}));
  useEffect(()=>{if(!items.length){toast(t('cartEmptyT'));closeModal();return}track('InitiateCheckout',{value:sub,ids:items.map(x=>x.pid),n:cartCount()})},[]);
  // incomplete-order capture: as soon as a valid phone is typed, keep a draft
  const saveDraft=()=>{if(done.current||!validPhone(f.phone))return;
    const its=items.map(x=>({pid:x.pid,vkey:x.vkey,name:x.p.name,price:x.v.price,cost:x.v.cost||0,qty:x.qty}));
    let d=S.incomplete.find(x=>x.id===draftId.current);if(!d){d={id:draftId.current,at:Date.now(),status:'new',log:[],orderInv:''};S.incomplete.unshift(d)}
    Object.assign(d,{name:f.name.trim(),phone:normPhone(f.phone),address:f.addr.trim(),district:f.dist,items:its,sub,updated:Date.now()});save()};
  useEffect(()=>{clearTimeout(timer.current);timer.current=setTimeout(saveDraft,700);return ()=>clearTimeout(timer.current)},[f.name,f.phone,f.addr,f.dist,f.note]);
  if(!items.length)return null;
  const cc=couponCalc(coupon,sub),del=f.dist?deliveryFor(f.dist,sub):0,total=sub+del-cc.d;
  const methods=[['cod',t('cod'),t('codS')],['bkash','bKash',t('bkashS')],['nagad','Nagad',t('bkashS')]].filter(x=>x[0]==='cod'||s[x[0]]);
  const apply=()=>{const r=couponCalc(f.coupon,sub);if(r.err){setCoupon('');setCMsg({err:r.err==='min'?t('couponMin',tk(r.min)):t('couponBad')})}else{setCoupon(f.coupon);setCMsg({ok:t('couponOk',tk(r.d))})}};
  const submit=e=>{e.preventDefault();
    const name=f.name.trim(),phone=f.phone.trim(),address=f.addr.trim(),district=f.dist,m=f.pay;
    let er='';if(!name)er=t('eName');else if(!validPhone(phone))er=t('ePhone');else if(address.length<6)er=t('eAddr');else if(!district)er=t('eDist');
    let payment={method:'cod',status:'unpaid'};
    if(!er&&m!=='cod'){if(!validPhone(f.sender)||f.trx.trim().length<6)er=t('eTrx');else payment={method:m,status:'pending',trx:f.trx.trim().toUpperCase(),sender:normPhone(f.sender)}}
    const short=items.find(x=>x.qty>x.v.stock);if(!er&&short)er=t('eStock',pn(short.p),short.v.stock);
    if(er){setErr(er);return}
    done.current=true;clearTimeout(timer.current);
    const o=createOrder({name,phone,address,district,items:items.map(x=>({pid:x.pid,vkey:x.vkey,name:x.p.name,price:x.v.price,cost:x.v.cost||0,qty:x.qty})),coupon,note:f.note.trim(),source:'Website',payment});
    S.incomplete=S.incomplete.filter(x=>x.id!==draftId.current);
    S.incomplete.forEach(x=>{if(x.phone===o.phone&&['new','contacted'].includes(x.status)&&Date.now()-x.at<3*DAY){x.status='converted';x.orderInv=o.inv;x.log.push({t:'Customer ordered themselves ('+o.inv+')',by:'System',at:Date.now()})}});
    S.cart=[];if(!S.user)S.user={name,phone:normPhone(phone)};save();
    track('Purchase',{value:o.total,ids:o.items.map(i=>i.pid),tid:o.inv,n:o.items.length});
    lastOrder.id=o.id;closeModal();go('thankyou');
  };
  return <form noValidate className="co" onSubmit={submit}><div style={{display:'flex',flexDirection:'column',gap:12}}>
      <p className="muted small" style={{margin:0}}>{t('coNote')}</p><b>{t('shipInfo')}</b>
      <div className="grid2"><div className="field"><label htmlFor="coName">{t('name')} *</label><input className="inp" id="coName" autoComplete="name" value={f.name} onChange={up('name')} onBlur={saveDraft}/></div>
        <div className="field"><label htmlFor="coPhone">{t('phone')} *</label><input className="inp" id="coPhone" inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="tel" value={f.phone} onChange={up('phone')} onBlur={saveDraft}/></div></div>
      <div className="field"><label htmlFor="coAddr">{t('address')} *</label><textarea className="inp" id="coAddr" placeholder={t('addressPh')} style={{minHeight:60}} value={f.addr} onChange={up('addr')} onBlur={saveDraft}/></div>
      <div className="field"><span className="lbl" style={{fontWeight:600,fontSize:14}}>{t('district')} *</span><div className="paygrid" role="radiogroup" aria-label={t('district')}>
        {AREAS.map(a=><label className="payopt" style={{position:'relative'}} key={a}><input type="radio" name="area" value={a} checked={f.dist===a} onChange={up('dist')}/><b>{a==='Dhaka'?t('inside'):t('outside')}</b><span className="muted">{tk(deliveryFor(a,sub))}</span></label>)}</div></div>
      <div className="field"><label htmlFor="coNote">{t('note')}</label><input className="inp" id="coNote" placeholder={t('notePh')} value={f.note} onChange={up('note')}/></div>
      <b>{t('payment')}</b>
      <div className="paygrid">{methods.map(([k,a,b])=><label className="payopt" style={{position:'relative'}} key={k}><input type="radio" name="pay" value={k} checked={f.pay===k} onChange={up('pay')}/><b>{a}</b><span className="muted">{b}</span></label>)}</div>
      {f.pay!=='cod'&&<div className="paybox"><Html html={t('payInstr',PAY[f.pay],f.pay==='bkash'?s.bkash:s.nagad,tk(total))}/>
        <div className="grid2" style={{marginTop:10}}><div className="field"><label htmlFor="coSender">{t('sender')}</label><input className="inp" id="coSender" inputMode="tel" placeholder="01XXXXXXXXX" value={f.sender} onChange={up('sender')}/></div>
          <div className="field"><label htmlFor="coTrx">{t('trx')}</label><input className="inp" id="coTrx" placeholder="8N7A6B5C4D" value={f.trx} onChange={up('trx')}/></div></div></div>}
    </div><div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div className="card" style={{background:'var(--bg)',display:'flex',flexDirection:'column',gap:6}}><b>{t('summary')}</b>
        {items.map(x=><div className="sumrow small" key={x.pid+x.vkey}><span>{pn(x.p)}{x.vkey?` (${x.vkey})`:''} × {x.qty}</span><span className="num">{tk(x.v.price*x.qty)}</span></div>)}
        <div className="field" style={{marginTop:6}}><label htmlFor="coCoupon">{t('coupon')}</label><div className="row" style={{flexWrap:'nowrap'}}><input className="inp" id="coCoupon" placeholder="WELCOME10" value={f.coupon} onChange={up('coupon')}/><button type="button" className="btn plain" onClick={apply}>{t('apply')}</button></div>
          <span className="err">{cMsg&&(cMsg.err||<span style={{color:'var(--good)'}}>{cMsg.ok}</span>)}</span></div>
        <div className="sumrow small"><span>{t('subtotal')}</span><span className="num">{tk(sub)}</span></div>
        <div className="sumrow small"><span>{t('delivery')} {f.dist?'('+(f.dist==='Dhaka'?t('inside'):t('outside'))+')':''}</span><span className="num">{f.dist?(del?tk(del):<b style={{color:'var(--good)'}}>{t('free')}</b>):'—'}</span></div>
        {cc.d?<div className="sumrow small" style={{color:'var(--good)'}}><span>{t('discount')} ({cc.c.code})</span><span className="num">−{tk(cc.d)}</span></div>:null}
        <div className="sumrow total"><span>{t('total')}</span><span className="num">{tk(total)}</span></div><ShipBar sub={sub}/></div>
      <span className="err">{err}</span><button className="btn accent block lg">{t('placeOrder')}</button><p className="small muted" style={{margin:0,textAlign:'center'}}>🔒 {t('secure')}</p>
    </div></form>;
}

export function More(){
  return <div className="morelist"><a href="#track" onClick={closeModal}>{t('track')}</a><a href="#wishlist" onClick={closeModal}>{t('wishlist')} ({S.wish.length})</a><a href="#contact" onClick={closeModal}>{t('contact')}</a>
    <a href="#about" onClick={closeModal}>{t('about')}</a><a href="#privacy" onClick={closeModal}>{t('privacy')}</a><a href="#terms" onClick={closeModal}>{t('terms')}</a><a href="#refund" onClick={closeModal}>{t('refund')}</a>
    <button onClick={()=>{closeModal();cycleTheme()}}>{t('theme')}: {t({light:'themeLight',dark:'themeDark'}[S.prefs.theme]||'themeAuto')}</button>
    <a href="#admin" onClick={closeModal} style={{color:'var(--brand)'}}>{t('adminPanel')} →</a></div>;
}
