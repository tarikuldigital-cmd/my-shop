import {useEffect,useRef,useState} from 'react';
import {S,ago,save,toast,setSEO,openModal} from '../lib/core.js';
import {Icon,Logo} from '../components/ui.jsx';
import {PAGES,RANGES,useAdm,setAdm,allEvents,evText} from './logic.js';
import Overview from './Overview.jsx';
import {OrdersPage,OrderDrawer,OrderTitle,Invoices,NewOrder,RawModal} from './Orders.jsx';
import {Incomplete,IncConvert,Returns,Customers,Messages,Reviews,Products,ProductForm,Categories,Coupons,Settings} from './pages.jsx';

/* Demo login only. A live site needs a server-side login (see README). */
const DEMO={email:'admin@demo.com',pass:'123456'};
let authed=false;try{authed=sessionStorage.getItem('sg_admin')==='1'}catch(e){}

export const ADMIN_MODALS={
  order:[p=><OrderTitle id={p.id}/>,OrderDrawer,{drawer:true}],
  invoices:[p=>`Invoices (${p.ids.length})`,Invoices,{wide:true}],
  neworder:[()=>'Add a new order',NewOrder,{}],
  incconv:[()=>'Create order from incomplete checkout',IncConvert,{}],
  product:[p=>p.id?'Edit product':'New product',ProductForm,{wide:true}],
  fraw:[()=>'BD Courier raw response',RawModal,{}]
};

function Login({onOk}){
  const [email,setEmail]=useState(DEMO.email),[pass,setPass]=useState(DEMO.pass),[err,setErr]=useState('');
  return <div className="login"><form className="card" onSubmit={e=>{e.preventDefault();if(email.trim()===DEMO.email&&pass===DEMO.pass){try{sessionStorage.setItem('sg_admin','1')}catch(x){}onOk()}else setErr('Wrong email or password')}}>
    <a className="logo" href="#home"><Logo/></a><h2 style={{fontSize:20}}>Admin login</h2>
    <div className="field"><label htmlFor="lEmail">Email</label><input className="inp" id="lEmail" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></div>
    <div className="field"><label htmlFor="lPass">Password</label><input className="inp" id="lPass" type="password" value={pass} onChange={e=>setPass(e.target.value)} autoComplete="current-password"/></div>
    <span className="err">{err}</span><button className="btn block">Log in</button>
    <p className="demo-note" style={{margin:0}}>Demo login: admin@demo.com / 123456. This is for demonstration only, not real security. The live site needs a server-side login.</p>
    <a href="#home" className="small">← Back to the store</a></form></div>;
}

function Notif({onClose}){
  const ref=useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target)&&!e.target.closest('[data-notif]'))onClose()};document.addEventListener('click',h);return ()=>document.removeEventListener('click',h)},[]);
  return <div className="notif" role="dialog" aria-label="Recent updates" ref={ref}><div className="h"><span>Recent updates</span><button className="iconbtn small" style={{color:'var(--brand)'}} onClick={()=>{S.lastSeen=Date.now();save();onClose()}}>Mark all read</button></div>
    {allEvents().slice(0,25).map((e,i)=><div key={i} className={'it'+(e.at>S.lastSeen?' unread':'')}><b>{e.o.inv}</b> {evText(e)} · {e.by}<div className="muted small">{ago(e.at)}{e.note?' · '+e.note:''}</div></div>)}</div>;
}

export default function Admin({page}){
  const [ok,setOk]=useState(authed),[notif,setNotif]=useState(false);const a=useAdm();
  if(!PAGES[page])page='overview';
  useEffect(()=>{setSEO('Admin | '+S.settings.name,'');setNotif(false)},[page]);
  if(!ok)return <Login onOk={()=>{authed=true;setOk(true)}}/>;
  const pend=S.orders.filter(o=>o.status==='pending').length,unread=allEvents().filter(e=>e.at>S.lastSeen).length,msgs=S.messages.filter(m=>!m.read).length;
  const Nav=({k,label,b})=><a className={'nav'+(page===k?' on':'')} href={'#admin'+(k==='overview'?'':'-'+k)}>{label}{b?<span className="badge">{b}</span>:null}</a>;
  const Body={overview:Overview,orders:OrdersPage,returns:Returns,incomplete:Incomplete,customers:Customers,messages:Messages,reviews:Reviews,products:Products,categories:Categories,coupons:Coupons,settings:Settings}[page];
  return <div className="admin"><aside className="aside" aria-label="Admin menu">
      <a className="logo" href="#admin"><Logo/></a>
      <div className="grp">Orders</div><Nav k="overview" label="Overview"/><Nav k="orders" label="Orders" b={pend}/><Nav k="incomplete" label="Incomplete orders" b={S.incomplete.filter(x=>x.status==='new').length}/><Nav k="returns" label="Returns"/>
      <div className="grp">Customers</div><Nav k="customers" label="Customers"/><Nav k="messages" label="Messages" b={msgs}/><Nav k="reviews" label="Reviews" b={S.reviews.filter(r=>!r.approved).length}/>
      <div className="grp">Catalogue</div><Nav k="products" label="Products"/><Nav k="categories" label="Categories"/><Nav k="coupons" label="Coupons"/>
      <div className="grp">Store</div><Nav k="settings" label="Settings"/><a className="nav" href="#home">View store ↗</a>
      <div className="me"><div className="field"><label htmlFor="meSel">Working as</label><select className="inp" id="meSel" value={S.me} onChange={e=>{S.me=+e.target.value;save();toast(`Now working as ${S.staff[S.me]}`)}}>{S.staff.map((s,i)=><option key={i} value={i}>{s}</option>)}</select></div>
        <button className="btn sm plain" onClick={()=>{authed=false;try{sessionStorage.removeItem('sg_admin')}catch(e){}location.hash='home'}}>Log out</button></div>
    </aside><div className="amain"><div className="atop"><h1>{PAGES[page]}</h1>
      {page==='overview'&&<div className="seg" role="group" aria-label="Period">{RANGES.map(([k,l])=><button key={k} className={a.range===k?'on':''} onClick={()=>setAdm({range:k})}>{l}</button>)}</div>}
      <button className="iconbtn" data-notif onClick={()=>setNotif(!notif)} aria-label="Notifications" style={{position:'relative'}}><Icon n="bell"/>{unread?<span className="badge" style={{position:'absolute',top:0,right:-2,height:16,minWidth:16,fontSize:10}}>{unread>9?'9+':unread}</span>:null}</button>
      {notif&&<Notif onClose={()=>setNotif(false)}/>}
    </div><div className="acontent"><Body/></div></div></div>;
}
