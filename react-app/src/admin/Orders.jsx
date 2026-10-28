import {useState} from 'react';
import {S,STATUS,ST_KEYS,COURIERS,PAY,PAY_ST,RET_TYPES,RET_ST,CANCEL_REASONS,RETURN_REASONS,AREAS,SOURCES,tk,fdate,startOfDay,prod,variant,totalStock,
  itemText,validPhone,createOrder,setStatus,sendToCourier,save,toast,openModal,closeModal,meName} from '../lib/core.js';
import {Icon,Pill,ItemLabel} from '../components/ui.jsx';
import {adm,setAdm,useAdm,ordersBase,ordersFiltered,OTABS,OPP,trackUrl,waNum,riskOf,isLive,exportCSV,frPhone,frBusy,fraudCheck,frCls} from './logic.js';
import {copyText} from '../shop/views.jsx';

/* ---------- fraud check UI ---------- */
export function FraudBadge({phone}){
  const p=frPhone(phone),c=S.fraud[p],click=e=>{e.stopPropagation();fraudCheck(p,!!c)};
  if(frBusy.has(p))return <span className="fr-b load">Checking…</span>;
  if(!c)return <button className="fr-b btn-chk" onClick={click}>Check</button>;
  if(!c.sum.total)return <button className="fr-b new" onClick={click} title="No previous parcels with any courier">New customer</button>;
  return <button className={'fr-b '+frCls(c.sum.ratio)} onClick={click} title={`Total ${c.sum.total} · Delivered ${c.sum.ok} · Cancelled ${c.sum.cancel}`}>{Math.round(c.sum.ratio)}% · {c.sum.ok}/{c.sum.total}</button>;
}
function FraudDetail({phone}){
  const p=frPhone(phone),c=S.fraud[p];
  if(frBusy.has(p))return <div className="muted small">Fetching history from BD Courier…</div>;
  if(!c)return <div className="row"><span className="small muted">Courier history for this number has not been checked yet.</span><button className="btn sm" onClick={()=>fraudCheck(p,true)}>Check courier history</button></div>;
  const s=c.sum;
  return <>
    <div className="fr-sum"><div><b>{s.total}</b><span>Total orders</span></div><div className="g"><b>{s.ok}</b><span>Delivered</span></div><div className="r"><b>{s.cancel}</b><span>Cancelled/returned</span></div><div className={frCls(s.ratio)}><b>{s.total?Math.round(s.ratio)+'%':'—'}</b><span>Success rate</span></div></div>
    {s.total?<div className="fr-bar"><i style={{width:s.ratio+'%'}}/></div>:<div className="small muted">No parcels have gone to this number with any courier (new customer).</div>}
    {c.rows.length>0&&<table className="t mini"><thead><tr><th>Courier</th><th>Total</th><th>Delivered</th><th>Cancel</th><th>Rate</th></tr></thead>
      <tbody>{c.rows.map(r=><tr key={r.k}><td>{r.name}</td><td className="num">{r.total}</td><td className="num">{r.ok}</td><td className="num">{r.cancel}</td><td className="num">{r.total?Math.round(r.ratio)+'%':'—'}</td></tr>)}</tbody></table>}
    {c.reports.length>0&&<div className="insight risk" style={{padding:'8px 10px',borderRadius:8,border:'1px solid color-mix(in srgb,var(--bad) 35%,transparent)'}}><span className="dot"/><div><b>{c.reports.length} fraud reports</b>
      {c.reports.slice(0,3).map((x,i)=><div className="small" key={i}>{typeof x==='string'?x:(x.details||x.message||x.comment||JSON.stringify(x))}</div>)}</div></div>}
    <div className="row small muted">From BD Courier · {fdate(c.at)}<span className="grow"/><button className="btn sm plain" onClick={()=>fraudCheck(p,true)}>↻ Check again</button><button className="btn sm plain" onClick={()=>openModal('fraw',{phone:p})}>Raw</button></div>
  </>;
}
export const RawModal=({phone})=><pre style={{whiteSpace:'pre-wrap',fontSize:12,maxHeight:'60vh',overflow:'auto'}}>{JSON.stringify((S.fraud[phone]||{}).raw,null,2)}</pre>;

/* ---------- orders portal ---------- */
function bulkApply(v){
  if(!v){toast('Choose an action first');return}if(v==='csv'){exportCSV();return}if(!adm.sel.size){toast('Select orders first');return}
  if(v==='inv'){openModal('invoices',{ids:[...adm.sel]});return}
  if(v.startsWith('st:')){const s=v.slice(3),n=adm.sel.size;adm.sel.forEach(id=>{const o=S.orders.find(x=>x.id===id);if(o)setStatus(o,s,s==='cancelled'?'Bulk cancelled':'')});adm.sel.clear();save();toast(`${n} orders marked ${STATUS[s].t}`);return}
  const c=v.slice(2);let n=0,skip=0;adm.sel.forEach(id=>{const o=S.orders.find(x=>x.id===id);if(o&&['pending','confirmed','hold','ready'].includes(o.status)&&!o.tracking){sendToCourier(o,c);n++}else skip++});adm.sel.clear();save();toast(`${n} orders sent to ${COURIERS[c].t}${skip?`, ${skip} skipped (already sent or closed)`:''}`);
}
export function OrdersPage(){
  const a=useAdm();const [from,setFrom]=useState(a.from),[to,setTo]=useState(a.to),[bulk,setBulk]=useState('');
  const base=ordersBase(),cnt=k=>k==='all'?base.length:k==='incomplete'?S.incomplete.filter(x=>['new','contacted'].includes(x.status)).length:base.filter(o=>o.status===k).length;
  const t0=startOfDay(Date.now()),td=S.orders.filter(o=>o.createdAt>=t0),evToday=k=>S.orders.filter(o=>o.history.some(h=>h.s===k&&h.at>=t0)).length;
  const all=ordersFiltered(),pages=Math.max(1,Math.ceil(all.length/OPP)),pg=Math.min(a.pg,pages),off=(pg-1)*OPP,list=all.slice(off,off+OPP);
  const allSel=list.length>0&&list.every(o=>a.sel.has(o.id));
  const sel=(id,on)=>{const s=new Set(a.sel);on?s.add(id):s.delete(id);setAdm({sel:s})};
  const filt=patch=>setAdm({...patch,pg:1,sel:new Set()});
  return <>
    <div className="om-top"><div className="om-filters">
      <div className="om-date"><input className="inp" type="date" value={from} onChange={e=>{setFrom(e.target.value);filt({from:e.target.value})}} aria-label="Start date"/><span>–</span><input className="inp" type="date" value={to} onChange={e=>{setTo(e.target.value);filt({to:e.target.value})}} aria-label="End date"/></div>
      <select className="inp" value={a.status} onChange={e=>filt({status:e.target.value})} aria-label="Status"><option value="all">Status: All</option>{ST_KEYS.map(k=><option key={k} value={k}>{STATUS[k].t}</option>)}</select>
      <select className="inp" value={a.courier} onChange={e=>filt({courier:e.target.value})} aria-label="Courier"><option value="">Courier: All</option>{Object.entries(COURIERS).map(([k,c])=><option key={k} value={k}>{c.t}</option>)}</select>
      <input className="inp grow" id="oq" type="search" placeholder="Search invoice / phone / name…" value={a.q} onChange={e=>setAdm({q:e.target.value,pg:1})} aria-label="Search orders"/>
      <button className="btn dark" onClick={()=>{filt({from,to});toast('Order list reloaded')}}>⟳ Reload</button>
      {(a.from||a.to||a.courier||a.q||a.status!=='all')&&<button className="btn sm plain" onClick={()=>{setFrom('');setTo('');filt({from:'',to:'',courier:'',q:'',status:'all'})}}>Clear filters</button>}</div>
      <div className="om-snap"><div className="l">TODAY'S SNAPSHOT</div><div className="v">{td.length}</div><div className="s">Today's new orders · Total {S.orders.length}</div>
        <div className="g"><div><span>Pend</span><b>{td.filter(o=>o.status==='pending').length}</b></div><div><span>Ship</span><b>{evToday('transit')}</b></div><div><span>Del</span><b>{evToday('delivered')}</b></div></div></div></div>
    <div className="om-tabs" role="tablist">{OTABS.map(([k,l])=><button key={k} role="tab" className={(a.status===k?'on ':'')+(['incomplete','partial'].includes(k)?'dot':'')} onClick={()=>k==='incomplete'?location.hash='admin-incomplete':filt({status:k})}>{l}<span className="c">{cnt(k)}</span></button>)}</div>
    <div className="om-bar"><label className="om-all"><input type="checkbox" checked={allSel} onChange={e=>{const s=new Set(a.sel);list.forEach(o=>e.target.checked?s.add(o.id):s.delete(o.id));setAdm({sel:e.target.checked?s:new Set()})}}/> Select All <span className="c">{a.sel.size||all.length}</span></label>
      <select className="inp" id="bulkAct" value={bulk} onChange={e=>setBulk(e.target.value)} aria-label="Bulk action"><option value="">Bulk Action…</option>
        <optgroup label="Change status">{ST_KEYS.filter(k=>k!=='returned').map(k=><option key={k} value={'st:'+k}>{STATUS[k].t}</option>)}</optgroup>
        <optgroup label="Send to courier">{Object.entries(COURIERS).map(([k,c])=><option key={k} value={'c:'+k}>{c.t}</option>)}</optgroup>
        <optgroup label="Other"><option value="inv">Print invoices</option><option value="csv">Export CSV</option></optgroup></select>
      <button className="btn good" onClick={()=>bulkApply(bulk)}>✓ Apply</button>
      <span className="grow"/><div className="om-pg"><button className="btn sm plain" disabled={pg<=1} onClick={()=>{setAdm({pg:pg-1});scrollTo(0,0)}}>‹ Prev</button><span>Page {pg} / {pages}</span><button className="btn sm plain" disabled={pg>=pages} onClick={()=>{setAdm({pg:pg+1});scrollTo(0,0)}}>Next ›</button></div>
      <button className="btn" onClick={()=>openModal('neworder')}>+ New Order</button></div>
    <div className="tbl-wrap"><table className="t om-t"><thead><tr><th/><th>#</th><th>Invoice</th><th>Customer</th><th>Phone</th><th>Courier History</th><th>Status</th><th>Amount</th><th>Courier</th><th>Tracking link</th><th>Payment</th></tr></thead>
      <tbody id="otbody">{list.length?list.map((o,i)=>{const r=['pending','confirmed','hold'].includes(o.status)?riskOf(o):[],s=a.sel.has(o.id),p=o.payment||{method:'cod',status:'unpaid'},paid=p.status==='paid',u=trackUrl(o);
        return <tr key={o.id} className={'click'+(s?' sel':'')} onClick={()=>openModal('order',{id:o.id})}>
          <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={s} onChange={e=>sel(o.id,e.target.checked)} aria-label={'Select '+o.inv}/></td>
          <td className="num muted small">{off+i+1}</td>
          <td><b className="num">{o.inv}</b>{r.length?<> <span className="pill bad nodot" title={r.join('; ')}>Risk</span></>:null}<div className="small muted">{fdate(o.createdAt)}</div></td>
          <td>{o.name}<div className="small muted">{o.district} · {o.items.reduce((n,x)=>n+x.qty,0)} items</div></td>
          <td className="num" style={{whiteSpace:'nowrap'}}>{o.phone} <a className="om-wa" href={'https://wa.me/'+waNum(o.phone)} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} aria-label={'WhatsApp '+o.name}><Icon n="wa"/></a></td>
          <td><FraudBadge phone={o.phone}/></td>
          <td><Pill s={o.status}/></td><td className="num"><b>{tk(o.total)}</b></td>
          <td className="small">{o.courier?COURIERS[o.courier].t+' Courier':<span className="muted">—</span>}</td>
          <td className="small num">{u?<a className="om-trk" href={u} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()}>↗ {o.tracking}</a>:<span className="muted">N/A</span>}</td>
          <td><span className={'om-pay '+(paid?'paid':'due')}>{paid?'PAID':'DUE'}</span>{p.method!=='cod'&&<div className="small muted">{PAY[p.method]}{p.status==='pending'?' · to verify':''}</div>}</td></tr>})
        :<tr><td colSpan={11}><div className="empty" style={{border:0}}>No orders match these filters</div></td></tr>}</tbody></table></div>
  </>;
}

/* ---------- order drawer ---------- */
const ACTS={pending:[['confirmed','Confirm',''],['hold','Put on hold','plain'],['cancelled','Cancel','danger']],confirmed:[['courier','Send to courier',''],['hold','Put on hold','plain'],['cancelled','Cancel','danger']],hold:[['confirmed','Confirm',''],['cancelled','Cancel','danger']],ready:[['transit','Picked up by courier',''],['cancelled','Cancel','danger']],transit:[['delivered','Delivered',''],['partial','Partial return','plain'],['returned','Returned','danger']],delivered:[['returned','Return/replacement','plain']],cancelled:[['pending','Move back to pending','plain']],partial:[],returned:[]};
export const OrderTitle=({id})=>{const o=S.orders.find(x=>x.id===id);return o?<>{o.inv} <Pill s={o.status}/></>:''};
export function OrderDrawer({id}){
  const o=S.orders.find(x=>x.id===id);const [extra,setExtra]=useState(null),[note,setNote]=useState(''),[dc,setDc]=useState('steadfast'),[cr,setCr]=useState(CANCEL_REASONS[0]),[rt,setRt]=useState('return'),[rr,setRr]=useState(RETURN_REASONS[0]);
  if(!o)return null;
  const prev=S.orders.filter(x=>x.phone===o.phone&&x.id!==o.id),risk=riskOf(o),p=o.payment||{method:'cod',status:'unpaid'};
  const msg=`Hello ${o.name}, this is ${S.settings.name}. Your order ${o.inv} (${o.items.map(i=>itemText(i)+' ×'+i.qty).join(', ')}) totals Tk ${o.total}. Address: ${o.address}. Please reply "Yes" to confirm the order.`;
  const act=s=>{if(['courier','cancelled','returned'].includes(s)){setExtra(s);return}setStatus(o,s);save();toast(`${o.inv}: ${STATUS[s].t}`);setExtra(null)};
  const payst=s=>{o.payment.status=s;o.history.push({s:'note',by:meName(),at:Date.now(),note:`Payment: ${PAY_ST[s].t}`});save();toast('Payment updated')};
  return <>
    {risk.length>0&&<div className="insight risk" style={{border:'1px solid color-mix(in srgb,var(--bad) 35%,transparent)',borderRadius:8,padding:'8px 10px'}}><span className="dot"/><div>{risk.map((r,i)=><div key={i}>{r}</div>)}</div></div>}
    <dl className="kv"><dt>Customer</dt><dd><b>{o.name}</b></dd><dt>Phone</dt><dd className="num">{o.phone}</dd><dt>Address</dt><dd>{o.address} · {o.district}</dd><dt>Source</dt><dd>{o.source}</dd>
      <dt>Payment</dt><dd>{PAY[p.method]} · <span className={'pill '+PAY_ST[p.status].c}>{PAY_ST[p.status].t}</span>
        {p.trx&&<div className="small">TrxID: <b className="num">{p.trx}</b> · Sender: <span className="num">{p.sender||''}</span></div>}
        {p.method!=='cod'&&p.status!=='paid'&&<div className="row" style={{marginTop:6}}><button className="btn sm" onClick={()=>payst('paid')}>Payment received</button><button className="btn sm plain" style={{color:'var(--bad)'}} onClick={()=>payst('failed')}>TrxID does not match</button></div>}</dd>
      <dt>Previous orders</dt><dd>{prev.length?`${prev.length} (${prev.filter(x=>x.status==='delivered').length} delivered, ${prev.filter(x=>!isLive(x)).length} cancelled/returned)`:'First order'}</dd>
      {o.courier&&<><dt>Courier</dt><dd>{COURIERS[o.courier].t} · <span className="num">{o.tracking}</span></dd></>}
      {o.note&&<><dt>Customer's note</dt><dd>{o.note}</dd></>}
      {o.status==='cancelled'&&o.cancelReason&&<><dt>Cancel reason</dt><dd>{o.cancelReason}</dd></>}
      {o.ret&&<><dt>{RET_TYPES[o.ret.type]}</dt><dd>{o.ret.reason} · {RET_ST[o.ret.st]}</dd></>}</dl>
    <div className="card" style={{padding:'10px 12px',display:'flex',flexDirection:'column',gap:8}}><b>Courier history (fraud check)</b><div id="frBox" style={{display:'flex',flexDirection:'column',gap:8}}><FraudDetail phone={o.phone}/></div></div>
    <div className="card" style={{padding:'10px 12px'}}>{o.items.map((i,k)=><div className="sumrow small" key={k}><span><ItemLabel i={i}/> × {i.qty}</span><span className="num">{tk(i.price*i.qty)}</span></div>)}
      <div className="sumrow small"><span>Delivery charge</span><span className="num">{tk(o.delivery)}</span></div>{o.discount?<div className="sumrow small"><span>Discount {o.coupon}</span><span className="num">−{tk(o.discount)}</span></div>:null}
      <div className="sumrow total"><span>{p.method!=='cod'&&p.status==='paid'?'Paid in advance (COD ৳0)':'COD to collect'}</span><span className="num">{tk(o.total)}</span></div></div>
    {ACTS[o.status].length>0&&<div><div className="small muted" style={{marginBottom:6}}>Next step</div><div className="row">{ACTS[o.status].map(x=><button key={x[0]} className={'btn sm '+x[2]} onClick={()=>act(x[0])}>{x[1]}</button>)}</div></div>}
    {extra==='courier'&&<div className="card row" style={{padding:10}}><select className="inp" value={dc} onChange={e=>setDc(e.target.value)} style={{width:'auto'}}>{Object.entries(COURIERS).map(([k,c])=><option key={k} value={k}>{c.t}</option>)}</select>
      <button className="btn sm" onClick={()=>{sendToCourier(o,dc);save();toast(`Sent to ${COURIERS[o.courier].t}`);setExtra(null)}}>Send</button><span className="small muted">The demo creates a sample tracking ID. On the live site the courier API will create the parcel.</span></div>}
    {extra==='cancelled'&&<div className="card row" style={{padding:10}}><select className="inp" value={cr} onChange={e=>setCr(e.target.value)} style={{width:'auto'}}>{CANCEL_REASONS.map(r=><option key={r}>{r}</option>)}</select>
      <button className="btn sm danger" onClick={()=>{setStatus(o,'cancelled',cr);save();toast('Order cancelled, stock restored');setExtra(null)}}>Confirm cancellation</button></div>}
    {extra==='returned'&&<div className="card" style={{padding:10,display:'flex',flexDirection:'column',gap:8}}><div className="grid2"><select className="inp" value={rt} onChange={e=>setRt(e.target.value)}>{Object.entries(RET_TYPES).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
      <select className="inp" value={rr} onChange={e=>setRr(e.target.value)}>{RETURN_REASONS.map(r=><option key={r}>{r}</option>)}</select></div>
      <button className="btn sm danger" onClick={()=>{o.ret={type:rt,reason:rr,st:'requested',at:Date.now()};setStatus(o,'returned',rr);save();toast('Added to the returns dashboard');setExtra(null)}}>Mark as returned</button></div>}
    <div className="row"><button className="btn sm plain" onClick={()=>copyText(msg,'Message copied')}>Copy WhatsApp confirmation message</button><button className="btn sm plain" onClick={()=>openModal('invoices',{ids:[o.id]})}>Invoice</button></div>
    <div className="field"><label htmlFor="noteIn">Add an internal note</label><div className="row" style={{flexWrap:'nowrap'}}><input className="inp" id="noteIn" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. customer asked for a call in the afternoon"/>
      <button className="btn sm" onClick={()=>{if(!note.trim())return;o.history.push({s:'note',by:meName(),at:Date.now(),note:note.trim()});setNote('');save()}}>Add</button></div></div>
    <div><div style={{fontWeight:600,marginBottom:8}}>Order journey</div><ul className="timeline">{[...o.history].reverse().map((h,k)=><li key={k}><b>{h===o.history[0]?'Order placed':h.s==='note'?'Note':STATUS[h.s].t}</b><span className="muted small">{fdate(h.at)} · {h.by}</span>{h.note&&<div>{h.note}</div>}</li>)}</ul></div>
  </>;
}

/* ---------- invoices ---------- */
function Invoice({o}){
  const s=S.settings;
  return <div className="invoice"><div className="ih"><div><b style={{fontSize:20}}>{s.name}</b><div className="small muted">Hotline {s.phone}</div></div><div style={{textAlign:'right'}}><b className="num">{o.inv}</b><div className="small muted">{fdate(o.createdAt,false)}</div></div></div>
    <div className="grid2"><div><div className="small muted">Recipient</div><b>{o.name}</b><div className="num">{o.phone}</div><div>{o.address} · {o.district}</div></div><div><div className="small muted">Courier</div><b>{o.courier?COURIERS[o.courier].t:'—'}</b><div className="num">{o.tracking||''}</div></div></div>
    <table className="t mini" style={{marginTop:10}}><thead><tr><th>Product</th><th>Qty</th><th style={{textAlign:'right'}}>Price</th></tr></thead><tbody>
      {o.items.map((i,k)=><tr key={k}><td><ItemLabel i={i}/></td><td className="num">{i.qty}</td><td className="num" style={{textAlign:'right'}}>{tk(i.price*i.qty)}</td></tr>)}
      <tr><td colSpan={2}>Delivery charge</td><td className="num" style={{textAlign:'right'}}>{tk(o.delivery)}</td></tr>
      {o.discount?<tr><td colSpan={2}>Discount</td><td className="num" style={{textAlign:'right'}}>−{tk(o.discount)}</td></tr>:null}
      <tr><td colSpan={2}><b>{o.payment&&o.payment.method!=='cod'&&o.payment.status==='paid'?'Paid in advance':'COD to collect'}</b></td><td className="num" style={{textAlign:'right'}}><b>{tk(o.total)}</b></td></tr></tbody></table></div>;
}
export function Invoices({ids}){
  const os=ids.map(id=>S.orders.find(o=>o.id===id)).filter(Boolean);
  return <><button className="btn sm noprint" style={{alignSelf:'flex-start'}} onClick={()=>{try{window.print()}catch(e){toast('Could not print')}}}>Print</button>{os.map(o=><Invoice key={o.id} o={o}/>)}</>;
}

/* ---------- manual order (phone / Facebook / WhatsApp) ---------- */
export function NewOrder(){
  const avail=S.products.filter(p=>totalStock(p)>0);
  const line=()=>{const p=avail[0];const v=p&&(p.variants.find(v=>v.stock>0)||p.variants[0]);return {pid:p?p.id:'',vkey:v?v.key:'',qty:1}};
  const [f,setF]=useState({name:'',phone:'',addr:'',dist:AREAS[0],src:SOURCES[1],conf:true}),[lines,setLines]=useState([line()]),[err,setErr]=useState('');
  const up=k=>e=>setF({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value});
  const setLine=(i,patch)=>setLines(lines.map((l,k)=>k===i?{...l,...patch}:l));
  const submit=e=>{e.preventDefault();
    if(!f.name.trim()||!validPhone(f.phone)||!f.addr.trim()){setErr('Enter a name, a valid phone number and an address');return}
    const items=[];for(const l of lines){const p=prod(l.pid),v=p&&variant(p,l.vkey);if(!v)continue;const q=Math.max(1,+l.qty||1);const ex=items.find(i=>i.pid===p.id&&i.vkey===l.vkey);if(ex)ex.qty+=q;else items.push({pid:p.id,vkey:l.vkey,name:p.name,price:v.price,qty:q})}
    if(!items.length){setErr('Add at least one product');return}
    const bad=items.find(i=>i.qty>variant(prod(i.pid),i.vkey).stock);if(bad){setErr(`Only ${variant(prod(bad.pid),bad.vkey).stock} of "${itemText(bad)}" in stock`);return}
    const o=createOrder({name:f.name.trim(),phone:f.phone.trim(),address:f.addr.trim(),district:f.dist,items,source:f.src,by:meName(),status:f.conf?'confirmed':'pending'});
    closeModal();toast(`${o.inv} created`);setAdm({status:'all'});
  };
  return <form style={{display:'flex',flexDirection:'column',gap:12}} noValidate onSubmit={submit}>
    <p className="muted small" style={{margin:0}}>Add orders that came in via Facebook, phone or WhatsApp.</p>
    <div className="grid2"><div className="field"><label htmlFor="noName">Name *</label><input className="inp" id="noName" value={f.name} onChange={up('name')}/></div><div className="field"><label htmlFor="noPhone">Phone *</label><input className="inp" id="noPhone" placeholder="01XXXXXXXXX" value={f.phone} onChange={up('phone')}/></div></div>
    <div className="field"><label htmlFor="noAddr">Address *</label><input className="inp" id="noAddr" value={f.addr} onChange={up('addr')}/></div>
    <div className="grid2"><div className="field"><label htmlFor="noDist">Delivery area *</label><select className="inp" id="noDist" value={f.dist} onChange={up('dist')}>{AREAS.map(d=><option key={d}>{d}</option>)}</select></div>
      <div className="field"><label htmlFor="noSrc">Source</label><select className="inp" id="noSrc" value={f.src} onChange={up('src')}>{SOURCES.slice(1).map(s=><option key={s}>{s}</option>)}</select></div></div>
    <div className="field"><label>Product</label><div style={{display:'flex',flexDirection:'column',gap:6}}>{lines.map((l,i)=>{const p=prod(l.pid);return <div className="row" style={{flexWrap:'nowrap'}} key={i}>
      <select className="inp grow" value={l.pid} aria-label="Product" onChange={e=>{const np=prod(e.target.value),v=np.variants.find(v=>v.stock>0)||np.variants[0];setLine(i,{pid:np.id,vkey:v.key})}}>{avail.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select className="inp" value={l.vkey} aria-label="Variant" style={{maxWidth:200}} onChange={e=>setLine(i,{vkey:e.target.value})}>{p&&p.variants.map(v=><option key={v.key} value={v.key} disabled={v.stock<=0}>{v.key||'Single option'} — {tk(v.price)} (stock {v.stock})</option>)}</select>
      <input className="inp" type="number" min="1" value={l.qty} onChange={e=>setLine(i,{qty:e.target.value})} style={{width:70}} aria-label="Qty"/></div>})}</div></div>
    <button type="button" className="btn sm plain" style={{alignSelf:'flex-start'}} onClick={()=>setLines([...lines,line()])}>+ Add another product</button>
    <label className="opt"><input type="checkbox" checked={f.conf} onChange={up('conf')}/>Confirmed by phone (saves as Confirmed)</label>
    <span className="err">{err}</span><button className="btn">Save order</button></form>;
}
