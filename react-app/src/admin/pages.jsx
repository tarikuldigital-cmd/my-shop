import {useState} from 'react';
import {S,tk,fdate,ago,DAY,AREAS,RET_TYPES,RET_ST,PAGE_TITLES,pad,prod,variant,catName,minPrice,maxPrice,totalStock,hasOpts,soldQty,buildVariants,itemText,
  validPhone,createOrder,save,toast,openModal,closeModal,askConfirm,meName,applyTheme,resetStore} from '../lib/core.js';
import {PImg,CatIcon,Stars,ItemLabel} from '../components/ui.jsx';
import {useAdm,setAdm,INC_ST,isLive,frCall} from './logic.js';
import {HBars} from './Overview.jsx';
import {copyText} from '../shop/views.jsx';

/* ---------------- incomplete orders ---------------- */
export function Incomplete(){
  const a=useAdm(),Lst=S.incomplete,f=a.incFilter,cnt=k=>k==='all'?Lst.length:Lst.filter(x=>x.status===k).length;
  const open=Lst.filter(x=>['new','contacted'].includes(x.status)),conv=cnt('converted'),closed=conv+cnt('dropped');
  const list=Lst.filter(x=>f==='all'||x.status===f).sort((a,b)=>b.updated-a.updated);
  const st=(x,s)=>{x.status=s;x.log.push({t:{contacted:'Called',dropped:'Dropped',new:'Reopened'}[s],by:meName(),at:Date.now()});x.updated=Date.now();save()};
  const msg=x=>copyText(`Hello${x.name?' '+x.name:''}, this is ${S.settings.name}. You started an order for ${x.items.map(itemText).join(', ')} on our site but it was not completed. If anything went wrong, let us know and we can place the order for you now. Cash on delivery available.`,'Message copied, paste it in WhatsApp');
  const convert=x=>{for(const it of x.items){const p=prod(it.pid),v=p&&variant(p,it.vkey);if(!v||v.stock<it.qty){toast(`Not enough stock for "${itemText(it)}"`);return}}openModal('incconv',{id:x.id})};
  return <>
    <div className="demo-note" style={{fontSize:14}}>When a customer types a valid mobile number at checkout but leaves without ordering, their name, phone, address and cart are saved here. Call or WhatsApp them to recover the order.</div>
    <div className="kpis" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))'}}>
      <div className="kpi" style={{'--k':'var(--warn)'}}><div className="l">Follow-up pending</div><div className="v">{cnt('new')}</div><div className="s">{cnt('contacted')} contacted</div></div>
      <div className="kpi" style={{'--k':'var(--accent)'}}><div className="l">Potential sales</div><div className="v">{tk(open.reduce((s,x)=>s+x.sub,0))}</div><div className="s">Open: {open.length} carts</div></div>
      <div className="kpi" style={{'--k':'var(--good)'}}><div className="l">Recovered</div><div className="v">{conv}</div><div className="s">{tk(Lst.filter(x=>x.status==='converted').reduce((s,x)=>s+x.sub,0))} Sold</div></div>
      <div className="kpi" style={{'--k':'var(--info)'}}><div className="l">Recovery rate</div><div className="v">{closed?Math.round(conv/closed*100):0}%</div><div className="s">of closed leads</div></div></div>
    <div className="chips">{[['new','New'],['contacted','Contacted'],['converted','Converted'],['dropped','Dropped'],['all','All']].map(([k,l])=><button key={k} className={'chip'+(f===k?' on':'')} onClick={()=>setAdm({incFilter:k})}>{l}<span className="c">{cnt(k)}</span></button>)}</div>
    <div className="tbl-wrap"><table className="t"><thead><tr><th>Time</th><th>Customer</th><th>Phone</th><th>Address</th><th>Cart</th><th>Amount</th><th>Status</th><th/></tr></thead><tbody>
      {list.length?list.map(x=>{const same=S.orders.filter(o=>o.phone===x.phone).length,last=x.log[x.log.length-1];return <tr key={x.id}>
        <td className="small" style={{whiteSpace:'nowrap'}}>{ago(x.updated)}<div className="muted">{fdate(x.at)}</div></td>
        <td>{x.name||<span className="muted">No name</span>}{same?<div className="small muted">Earlier: {same} orders</div>:null}</td><td className="num">{x.phone}</td>
        <td className="small" style={{maxWidth:200}}>{x.address?x.address+(x.district?', '+x.district:''):<span className="muted">Not given</span>}</td>
        <td className="small" style={{maxWidth:220}}>{x.items.map((i,k)=><div key={k}><ItemLabel i={i}/> ×{i.qty}</div>)}</td><td className="num"><b>{tk(x.sub)}</b></td>
        <td><span className={'pill '+INC_ST[x.status].c}>{INC_ST[x.status].t}</span>{x.orderInv&&<div className="small num muted">{x.orderInv}</div>}{last&&<div className="small muted">{last.t} · {last.by}</div>}</td>
        <td><div className="row" style={{flexWrap:'nowrap'}}>{['new','contacted'].includes(x.status)?<>
          <button className="btn sm" onClick={()=>convert(x)}>Create order</button><button className="btn sm plain" onClick={()=>msg(x)}>Copy message</button>
          {x.status==='new'&&<button className="btn sm plain" onClick={()=>st(x,'contacted')}>Mark contacted</button>}
          <button className="btn sm plain" onClick={()=>st(x,'dropped')} style={{color:'var(--bad)'}}>Drop</button></>
          :x.status==='dropped'?<button className="btn sm plain" onClick={()=>st(x,'new')}>Reopen</button>:null}</div></td></tr>})
      :<tr><td colSpan={8}><div className="empty" style={{border:0}}>Nothing here</div></td></tr>}</tbody></table></div></>;
}
export function IncConvert({id}){
  const x=S.incomplete.find(d=>d.id===id);const [f,setF]=useState({name:x?x.name:'',phone:x?x.phone:'',addr:x?x.address:'',dist:x?x.district:'',conf:true}),[err,setErr]=useState('');
  if(!x)return null;const up=k=>e=>setF({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value});
  return <form style={{display:'flex',flexDirection:'column',gap:12}} noValidate onSubmit={e=>{e.preventDefault();
      if(!f.name.trim()||!validPhone(f.phone)||!f.addr.trim()||!f.dist){setErr('Enter a name, a valid phone, an address and a delivery area');return}
      const o=createOrder({name:f.name.trim(),phone:f.phone.trim(),address:f.addr.trim(),district:f.dist,items:x.items.map(i=>({...i})),source:'Recovered from incomplete',by:meName(),status:f.conf?'confirmed':'pending'});
      x.status='converted';x.orderInv=o.inv;x.log.push({t:'Converted to order ('+o.inv+')',by:meName(),at:Date.now()});save();closeModal();toast(`${o.inv} created`)}}>
    <p className="small muted" style={{margin:0}}>Confirm the remaining details with the customer.</p>
    <div className="grid2"><div className="field"><label htmlFor="icName">Name *</label><input className="inp" id="icName" value={f.name} onChange={up('name')}/></div><div className="field"><label htmlFor="icPhone">Phone *</label><input className="inp" id="icPhone" value={f.phone} onChange={up('phone')}/></div></div>
    <div className="field"><label htmlFor="icAddr">Address *</label><input className="inp" id="icAddr" value={f.addr} onChange={up('addr')}/></div>
    <div className="field"><label htmlFor="icDist">Delivery area *</label><select className="inp" id="icDist" value={f.dist} onChange={up('dist')}><option value="">Select delivery area</option>{AREAS.map(d=><option key={d}>{d}</option>)}</select></div>
    <div className="card" style={{padding:'10px 12px'}}>{x.items.map((i,k)=><div className="sumrow small" key={k}><span><ItemLabel i={i}/> × {i.qty}</span><span className="num">{tk(i.price*i.qty)}</span></div>)}</div>
    <label className="opt"><input type="checkbox" checked={f.conf} onChange={up('conf')}/>Customer confirmed by phone</label>
    <span className="err">{err}</span><button className="btn">Create order</button></form>;
}

/* ---------------- returns ---------------- */
export function Returns(){
  const R=S.orders.filter(o=>o.status==='returned'||o.ret),dl=S.orders.filter(o=>['delivered','returned'].includes(o.status)).length,ref=R.filter(o=>o.ret&&o.ret.type==='refund');
  const reasons={};R.forEach(o=>{const k=o.ret?o.ret.reason:'No reason';reasons[k]=(reasons[k]||0)+1});
  const retst=(o,s)=>{if(!o.ret)o.ret={type:'return',reason:'—',st:'requested',at:Date.now()};o.ret.st=s;o.history.push({s:'note',by:meName(),at:Date.now(),note:RET_ST[s]});save();toast(RET_ST[s])};
  return <><div className="kpis" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))'}}>
      <div className="kpi" style={{'--k':'var(--bad)'}}><div className="l">Total returns</div><div className="v">{R.length}</div><div className="s">Return rate {dl?Math.round(R.length/dl*100):0}%</div></div>
      <div className="kpi" style={{'--k':'var(--warn)'}}><div className="l">Needs action</div><div className="v">{R.filter(o=>o.ret&&o.ret.st==='requested').length}</div><div className="s">Requested, not handled yet</div></div>
      <div className="kpi" style={{'--k':'var(--info)'}}><div className="l">Replacement</div><div className="v">{R.filter(o=>o.ret&&o.ret.type==='replacement').length}</div><div className="s">New item to send</div></div>
      <div className="kpi" style={{'--k':'var(--hold)'}}><div className="l">Refund</div><div className="v">{tk(ref.reduce((s,o)=>s+o.total,0))}</div><div className="s">{ref.length} orders</div></div></div>
    <div className="panels"><div className="panel w8" style={{padding:0,overflow:'hidden'}}><div className="tbl-wrap" style={{border:0}}><table className="t"><thead><tr><th>Invoice</th><th>Customer</th><th>Product</th><th>Type</th><th>Reason</th><th>Status</th><th/></tr></thead><tbody>
      {R.length?R.map(o=>{const r=o.ret||{type:'return',reason:'—',st:'requested'},next={requested:[['received','Item received']],received:r.type==='refund'?[['refunded','Refund sent']]:r.type==='replacement'?[['replaced','Replacement sent']]:[]}[r.st]||[];
        return <tr key={o.id}><td><button className="iconbtn num" style={{color:'var(--brand)',fontWeight:600}} onClick={()=>openModal('order',{id:o.id})}>{o.inv}</button></td><td>{o.name}<div className="small muted">{o.phone}</div></td>
          <td className="small">{o.items.map((i,k)=><div key={k}><ItemLabel i={i}/></div>)}</td><td>{RET_TYPES[r.type]}</td><td className="small">{r.reason}</td>
          <td><span className={'pill '+(r.st==='requested'?'warn':r.st==='received'?'info':'good')}>{RET_ST[r.st]}</span></td><td>{next.map(n=><button key={n[0]} className="btn sm plain" onClick={()=>retst(o,n[0])}>{n[1]}</button>)}</td></tr>})
      :<tr><td colSpan={7} className="muted">No returns</td></tr>}</tbody></table></div></div>
    <div className="panel"><h3>Return reasons</h3><HBars rows={Object.entries(reasons).sort((a,b)=>b[1]-a[1])} color="var(--bad)"/><p className="small muted" style={{margin:'12px 0 0'}}>To log a return, open the order and press "Returned".</p></div></div></>;
}

/* ---------------- customers & messages ---------------- */
export function Customers(){
  const a=useAdm();const m={};
  S.orders.forEach(o=>{const c=m[o.phone]=m[o.phone]||{phone:o.phone,name:o.name,district:o.district,n:0,s:0,canc:0,last:0};c.n++;if(isLive(o))c.s+=o.total;else c.canc++;if(o.createdAt>c.last){c.last=o.createdAt;c.name=o.name}});
  const q=a.cq.trim().toLowerCase(),list=Object.values(m).filter(c=>!q||(c.name+c.phone+c.district).toLowerCase().includes(q)).sort((x,y)=>y.s-x.s);
  return <><div className="row"><input className="inp" type="search" placeholder="Name, phone or district" value={a.cq} onChange={e=>setAdm({cq:e.target.value})} style={{maxWidth:340}} aria-label="Search customers"/><span className="muted small">{list.length}  customers</span></div>
    <div className="tbl-wrap"><table className="t"><thead><tr><th>Customer</th><th>Phone</th><th>District</th><th>Orders</th><th>Total spent</th><th>Cancelled/returned</th><th>Last order</th></tr></thead><tbody>
      {list.map(c=><tr className="click" key={c.phone} onClick={()=>{setAdm({q:c.phone,status:'all',from:'',to:'',courier:'',pg:1});location.hash='admin-orders'}}>
        <td><b>{c.name}</b>{c.n>1&&<> <span className="pill good nodot">Repeat</span></>}</td><td className="num">{c.phone}</td><td>{c.district}</td><td className="num">{c.n}</td><td className="num">{tk(c.s)}</td>
        <td className="num" style={c.canc?{color:'var(--bad)'}:null}>{c.canc}</td><td className="small">{ago(c.last)}</td></tr>)}</tbody></table></div></>;
}
export function Messages(){
  return <><div className="tbl-wrap"><table className="t"><thead><tr><th>Name</th><th>Phone</th><th>Message</th><th>Time</th><th/></tr></thead><tbody>
    {S.messages.length?S.messages.map(m=><tr key={m.id} style={m.read?null:{fontWeight:600}}><td>{m.name}</td><td className="num">{m.phone}</td><td style={{maxWidth:420}}>{m.msg}</td><td className="small">{ago(m.at)}</td>
      <td style={{whiteSpace:'nowrap'}}>{m.read?<span className="pill good">Read</span>:<button className="btn sm plain" onClick={()=>{m.read=true;save()}}>Read</button>}</td></tr>)
    :<tr><td colSpan={5} className="muted">No messages</td></tr>}</tbody></table></div>
    <p className="small muted" style={{margin:0}}>Messages sent from the store's Contact page appear here.</p></>;
}

/* ---------------- reviews ---------------- */
export function Reviews(){
  const a=useAdm(),R=S.reviews,f=a.revFilter,cnt=k=>k==='all'?R.length:R.filter(r=>k==='pending'?!r.approved:r.approved).length;
  const list=R.filter(r=>f==='all'||(f==='pending'?!r.approved:r.approved)).sort((x,y)=>y.at-x.at);
  const avg=R.filter(r=>r.approved).reduce((s,r)=>s+r.rating,0)/Math.max(1,cnt('on'));
  const act=(r,s)=>{if(s==='del'){S.reviews=S.reviews.filter(x=>x!==r);toast('Review deleted')}else{r.approved=s==='on';toast(r.approved?'Review published':'Review hidden')}save()};
  return <><div className="kpis" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))'}}><div className="kpi" style={{'--k':'var(--warn)'}}><div className="l">Pending approval</div><div className="v">{cnt('pending')}</div><div className="s">New customer reviews</div></div>
      <div className="kpi" style={{'--k':'var(--star)'}}><div className="l">Average rating</div><div className="v">{avg.toFixed(1)} ★</div><div className="s">{cnt('on')} published reviews</div></div></div>
    <div className="chips">{[['pending','Pending approval'],['on','Published'],['all','All']].map(([k,l])=><button key={k} className={'chip'+(f===k?' on':'')} onClick={()=>setAdm({revFilter:k})}>{l}<span className="c">{cnt(k)}</span></button>)}</div>
    <div className="tbl-wrap"><table className="t"><thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Time</th><th/></tr></thead><tbody>
      {list.length?list.map(r=>{const p=prod(r.pid);return <tr key={r.id}><td>{p?<a href={'#product-'+p.id}>{p.name}</a>:<span className="muted">Deleted</span>}</td>
        <td>{r.name}{r.verified&&<div><span className="pill good nodot" style={{fontSize:11}}>Verified buyer</span></div>}</td><td><Stars v={r.rating} w={13}/></td><td style={{maxWidth:380}}>{r.text}</td><td className="small">{ago(r.at)}</td>
        <td style={{whiteSpace:'nowrap'}}>{r.approved?<button className="btn sm plain" onClick={()=>act(r,'off')}>Hide</button>:<button className="btn sm" onClick={()=>act(r,'on')}>Publish</button>} <button className="btn sm plain" style={{color:'var(--bad)'}} onClick={()=>act(r,'del')}>Delete</button></td></tr>})
      :<tr><td colSpan={6}><div className="empty" style={{border:0}}>Nothing here</div></td></tr>}</tbody></table></div></>;
}

/* ---------------- products ---------------- */
export function Products(){
  const a=useAdm(),q=a.pq.trim().toLowerCase();
  const ps=S.products.filter(p=>(!q||(p.name+' '+p.variants.map(v=>v.sku).join(' ')).toLowerCase().includes(q))&&(!a.pcat||p.cat===a.pcat));
  const del=p=>askConfirm(`Delete "${p.name}"? Past orders keep the name.`,()=>{S.products=S.products.filter(x=>x!==p);S.cart=S.cart.filter(x=>x.pid!==p.id);S.wish=S.wish.filter(x=>x!==p.id);save();toast('Product deleted')},'Delete');
  return <><div className="row"><input className="inp" id="pq" type="search" placeholder="Search product or SKU" value={a.pq} onChange={e=>setAdm({pq:e.target.value})} style={{maxWidth:320}} aria-label="Search products"/>
      <select className="inp" style={{width:'auto'}} value={a.pcat} onChange={e=>setAdm({pcat:e.target.value})} aria-label="Categories"><option value="">All categories</option>{S.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <span className="grow"/><button className="btn" onClick={()=>openModal('product',{id:''})}>+ New product</button></div>
    <div className="tbl-wrap"><table className="t"><thead><tr><th/><th>Product</th><th>Categories</th><th>Variant</th><th>Price</th><th>Total stock</th><th>Sold</th><th/></tr></thead><tbody id="ptbody">
      {ps.length?ps.map(p=>{const ts=totalStock(p),low=p.variants.filter(v=>v.stock<=3).length;return <tr key={p.id}><td><PImg p={p} cls="thumb"/></td>
        <td><b>{p.name}</b><div className="small muted">{[p.featured&&'Featured',p.isNew&&'New',p.combo&&'Combo'].filter(Boolean).join(' · ')}</div></td><td>{catName(p.cat)}</td>
        <td className="small">{hasOpts(p)?<>{p.variants.length} variants<div className="muted">{p.options.map(o=>o.name).join(' × ')}</div></>:<span className="muted">None</span>}</td>
        <td className="num">{tk(minPrice(p))}{maxPrice(p)>minPrice(p)?' – '+tk(maxPrice(p)):''}</td>
        <td>{ts<=0?<span className="pill bad">Out of stock</span>:<span className="num">{ts}</span>}{low>0&&ts>0&&<div><span className="pill warn nodot">{low} variants low</span></div>}</td><td className="num">{soldQty(p.id)}</td>
        <td style={{whiteSpace:'nowrap'}}><button className="btn sm plain" onClick={()=>openModal('product',{id:p.id})}>Edit</button> <a className="btn sm plain" href={'#product-'+p.id}>View</a> <button className="btn sm plain" onClick={()=>del(p)} style={{color:'var(--bad)'}}>Delete</button></td></tr>})
      :<tr><td colSpan={8} className="muted">No products</td></tr>}</tbody></table></div></>;
}
function resizeImage(file,maxSide,type,q){return new Promise(res=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),sc=Math.min(1,maxSide/(type==='h'?im.height:Math.max(im.width,im.height)));c.width=im.width*sc;c.height=im.height*sc;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL(q?'image/jpeg':'image/png',q))};im.src=r.result};r.readAsDataURL(file)})}
export function ProductForm({id}){
  const src=id?prod(id):{name:'',nameEn:'',cat:S.categories[0]?.id||'',desc:'',descEn:'',featured:false,isNew:true,combo:false,images:[],options:[],variants:[{key:'',vals:[],price:0,old:0,cost:0,stock:10,sku:''}]};
  const [f,setF]=useState({name:src.name,nameEn:src.nameEn||'',cat:src.cat,desc:src.desc,descEn:src.descEn||'',featured:!!src.featured,isNew:!!src.isNew,combo:!!src.combo});
  const [images,setImages]=useState([...(src.images||[])]);
  const [opts,setOpts]=useState(()=>(src.options||[]).map(o=>({name:o.name,values:o.values.join(', ')})));
  const [vars,setVars]=useState(()=>JSON.parse(JSON.stringify(src.variants)));
  const [all,setAll]=useState({price:'',cost:'',stock:''}),[err,setErr]=useState('');
  const up=k=>e=>setF({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value});
  const clean=()=>opts.map(o=>({name:o.name.trim(),values:o.values.split(/[,،]/).map(s=>s.trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)})).filter(o=>o.name&&o.values.length);
  const regen=(list=opts)=>{const c=list.map(o=>({name:o.name.trim(),values:o.values.split(/[,،]/).map(s=>s.trim()).filter(Boolean)})).filter(o=>o.name&&o.values.length);
    const n=c.reduce((s,o)=>s*o.values.length,1);if(n>100){toast('More than 100 combinations, use fewer values');return}const nv=buildVariants(c,vars,vars[0]);setVars(nv);return nv};
  const setVar=(i,k,v)=>setVars(vars.map((x,j)=>j===i?{...x,[k]:k==='sku'?v:v===''?0:Math.max(0,+v)}:x));
  const addImgs=async e=>{const files=[...e.target.files].slice(0,6-images.length);e.target.value='';if(!files.length){toast('Maximum 6 images');return}const out=[];for(const fl of files)out.push(await resizeImage(fl,800,'',.8));setImages(x=>[...x,...out])};
  const submit=e=>{e.preventDefault();const c=clean();
    if(buildVariants(c,vars).map(v=>v.key).join('|')!==vars.map(v=>v.key).join('|')){setErr('Options changed, press "Generate / update variants" first');return}
    if(!f.name.trim()){setErr('Enter a product name');return}
    if(vars.some(v=>!v.price)){setErr('Enter a price for every variant');return}
    const data={...f,name:f.name.trim(),nameEn:f.name.trim(),desc:f.desc.trim(),descEn:f.desc.trim(),images,options:c,variants:vars};
    if(id){Object.assign(prod(id),data);S.cart=S.cart.filter(x=>x.pid!==id||variant(prod(id),x.vkey))}else S.products.unshift({id:'p'+Date.now(),createdAt:Date.now(),...data});
    save();closeModal();toast('Product saved')};
  return <form style={{display:'flex',flexDirection:'column',gap:14}} noValidate onSubmit={submit}>
    <div><div className="field"><label htmlFor="pfName">Product name *</label><input className="inp" id="pfName" value={f.name} onChange={up('name')}/></div></div>
    <div className="field"><label htmlFor="pfCat">Categories</label><select className="inp" id="pfCat" value={f.cat} onChange={up('cat')}>{S.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    <div className="field"><label>Images (up to 6, the first is the main image)</label><div className="imgs">{images.map((im,i)=><div className="im" key={i}><img src={im} alt=""/><button type="button" onClick={()=>setImages(images.filter((_,k)=>k!==i))} aria-label="Remove image">✕</button>{i===0&&<span>Main</span>}</div>)}</div>
      <input type="file" accept="image/*" multiple className="inp" onChange={addImgs}/><span className="small muted">Without images the category image is shown. The second image appears on hover. You can also paste an image link:</span>
      <input className="inp" placeholder="Paste https://...jpg and press Enter" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const v=e.currentTarget.value.trim();if(/^https?:\/\//.test(v)&&images.length<6){setImages([...images,v]);e.currentTarget.value=''}}}}/></div>
    <div><div className="field"><label htmlFor="pfDesc">Description</label><textarea className="inp" id="pfDesc" value={f.desc} onChange={up('desc')}/></div></div>
    <div className="row"><label className="opt"><input type="checkbox" checked={f.featured} onChange={up('featured')}/>Featured</label><label className="opt"><input type="checkbox" checked={f.isNew} onChange={up('isNew')}/>New</label><label className="opt"><input type="checkbox" checked={f.combo} onChange={up('combo')}/>Combo offer</label></div>
    <div className="card" style={{display:'flex',flexDirection:'column',gap:10,background:'var(--bg)'}}><div><b>Variant options</b><div className="small muted">e.g. option "Size" with values "S, M, L". With two options (colour and size) every combination is generated. Leave empty if there are no variants.</div></div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>{opts.length?opts.map((o,i)=><div className="optrow" key={i}>
        <input className="inp" placeholder="Option name (e.g. Colour)" value={o.name} onChange={e=>setOpts(opts.map((x,k)=>k===i?{...x,name:e.target.value}:x))} aria-label="Option name"/>
        <input className="inp" placeholder="Values, comma separated (e.g. Red, Blue)" value={o.values} onChange={e=>setOpts(opts.map((x,k)=>k===i?{...x,values:e.target.value}:x))} aria-label="Option values"/>
        <button type="button" className="btn sm plain" style={{color:'var(--bad)'}} onClick={()=>{const n=opts.filter((_,k)=>k!==i);setOpts(n);regen(n)}}>Remove</button></div>)
        :<span className="small muted">No options, the product has a single version.</span>}</div>
      <div className="row"><button type="button" className="btn sm plain" onClick={()=>{if(opts.length>=3){toast('Up to 3 options allowed');return}setOpts([...opts,{name:'',values:''}])}}>+ Add option</button>
        <button type="button" className="btn sm" onClick={()=>{const nv=regen();if(nv)toast(`${nv.length} variants generated`)}}>Generate / update variants</button></div></div>
    <div><div className="row" style={{justifyContent:'space-between',marginBottom:6}}><b>Price, cost & stock</b><span className="row small">
        <input className="inp" type="number" placeholder="Price for all" style={{width:120}} value={all.price} onChange={e=>setAll({...all,price:e.target.value})} aria-label="Price for all variants"/>
        <input className="inp" type="number" placeholder="Cost" style={{width:110}} value={all.cost} onChange={e=>setAll({...all,cost:e.target.value})} aria-label="Cost for all variants"/>
        <input className="inp" type="number" placeholder="Stock" style={{width:90}} value={all.stock} onChange={e=>setAll({...all,stock:e.target.value})} aria-label="Stock for all variants"/>
        <button type="button" className="btn sm plain" onClick={()=>setVars(vars.map(v=>({...v,...(all.price!==''?{price:+all.price}:{}),...(all.cost!==''?{cost:+all.cost}:{}),...(all.stock!==''?{stock:+all.stock}:{})})))}>Apply to all</button></span></div>
      <div className="tbl-wrap"><table className="t mini"><thead><tr><th>Variant</th><th>Price *</th><th>Old price</th><th>Cost</th><th>Stock</th><th>SKU</th></tr></thead><tbody>
        {vars.map((v,i)=><tr key={v.key||i}><td>{v.key||'Single version'}</td>
          <td><input className="inp" type="number" min="0" value={v.price||''} onChange={e=>setVar(i,'price',e.target.value)} style={{width:95}} aria-label="Price"/></td>
          <td><input className="inp" type="number" min="0" value={v.old||''} onChange={e=>setVar(i,'old',e.target.value)} style={{width:95}} aria-label="Old price"/></td>
          <td><input className="inp" type="number" min="0" value={v.cost||''} onChange={e=>setVar(i,'cost',e.target.value)} style={{width:90}} aria-label="Cost"/></td>
          <td><input className="inp" type="number" min="0" value={v.stock} onChange={e=>setVar(i,'stock',e.target.value)} style={{width:75}} aria-label="Stock"/></td>
          <td><input className="inp" value={v.sku} onChange={e=>setVar(i,'sku',e.target.value)} style={{width:120}} aria-label="SKU"/></td></tr>)}</tbody></table></div>
      <p className="small muted" style={{margin:'6px 0 0'}}>Cost is only shown in admin and is used for profit reports.</p></div>
    <span className="err">{err}</span><button className="btn">Save product</button></form>;
}

/* ---------------- categories ---------------- */
function CatRow({c}){
  const [v,setV]=useState({name:c.name,nameEn:c.nameEn||'',img:c.img||'',tint:c.tint});
  return <tr><td><CatIcon c={c}/></td><td><input className="inp" value={v.name} onChange={e=>setV({...v,name:e.target.value})} aria-label="Category name"/></td>
    <td><div className="row" style={{flexWrap:'nowrap'}}><input className="inp" value={v.img} onChange={e=>setV({...v,img:e.target.value})} placeholder="https://...jpg" aria-label="Image link" style={{minWidth:150}}/><input type="color" value={v.tint} onChange={e=>setV({...v,tint:e.target.value})} aria-label="Colour"/></div></td>
    <td className="num">{S.products.filter(p=>p.cat===c.id).length}</td>
    <td style={{whiteSpace:'nowrap'}}><button className="btn sm plain" onClick={()=>{if(!v.name.trim())return;Object.assign(c,{name:v.name.trim(),nameEn:v.name.trim(),img:v.img.trim(),tint:v.tint});save();toast('Category saved')}}>Save</button> <button className="btn sm plain" style={{color:'var(--bad)'}} onClick={()=>{if(S.products.some(p=>p.cat===c.id)){toast('This category has products, move them first');return}S.categories=S.categories.filter(x=>x!==c);save()}}>Delete</button></td></tr>;
}
export function Categories(){
  const [n,setN]=useState({name:'',nameEn:'',img:'',tint:'#f85606'});
  return <div className="panels"><div className="panel w8" style={{padding:0}}><div className="tbl-wrap" style={{border:0}}><table className="t"><thead><tr><th/><th>Name</th><th>Image (URL) & colour</th><th>Product</th><th/></tr></thead><tbody>{S.categories.map(c=><CatRow key={c.id} c={c}/>)}</tbody></table></div></div>
    <div className="panel"><h3>New category</h3><form style={{display:'flex',flexDirection:'column',gap:10}} onSubmit={e=>{e.preventDefault();if(!n.name.trim())return;S.categories.push({id:'c'+Date.now(),name:n.name.trim(),nameEn:n.name.trim(),icon:'tag',img:n.img.trim(),tint:n.tint});save();setN({name:'',nameEn:'',img:'',tint:n.tint});toast('Category added')}}>
      <input className="inp" placeholder="Name (e.g. Books & Stationery)" value={n.name} onChange={e=>setN({...n,name:e.target.value})} aria-label="New category name"/><input className="inp" placeholder="English name (e.g. Books)" value={n.nameEn} onChange={e=>setN({...n,nameEn:e.target.value})} aria-label="English name"/>
      <input className="inp" placeholder="Image link (https://...jpg)" value={n.img} onChange={e=>setN({...n,img:e.target.value})} aria-label="Image link"/><div className="row"><input type="color" value={n.tint} onChange={e=>setN({...n,tint:e.target.value})} aria-label="Colour"/></div><button className="btn">Add</button></form>
      <p className="small muted">A category with products cannot be deleted; move its products first.</p></div></div>;
}

/* ---------------- coupons ---------------- */
export function Coupons(){
  const [c,setC]=useState({code:'',type:'percent',value:'',min:0}),[err,setErr]=useState('');
  return <div className="panels"><div className="panel w8" style={{padding:0}}><div className="tbl-wrap" style={{border:0}}><table className="t"><thead><tr><th>Code</th><th>Discount</th><th>Minimum order</th><th>Used</th><th>Status</th><th/></tr></thead><tbody>
    {S.coupons.map((x,i)=><tr key={x.code}><td><b className="num">{x.code}</b></td><td>{x.type==='percent'?x.value+'%':tk(x.value)}</td><td className="num">{tk(x.min)}</td><td className="num">{x.used||0} times</td>
      <td><button className={'pill nodot '+(x.active?'good':'')} style={{border:0}} onClick={()=>{x.active=!x.active;save()}}>{x.active?'Active':'Off'}</button></td><td><button className="btn sm plain" style={{color:'var(--bad)'}} onClick={()=>{S.coupons.splice(i,1);save()}}>Delete</button></td></tr>)}</tbody></table></div></div>
    <div className="panel"><h3>New coupon</h3><form style={{display:'flex',flexDirection:'column',gap:10}} onSubmit={e=>{e.preventDefault();const code=c.code.trim().toUpperCase(),v=+c.value;if(!code||!v){setErr('Enter a code and an amount');return}if(S.coupons.some(x=>x.code===code)){setErr('This code already exists');return}
        S.coupons.push({code,type:c.type,value:v,min:+c.min||0,active:true,used:0});save();setC({code:'',type:'percent',value:'',min:0});setErr('');toast('Coupon created')}}>
      <div className="field"><label htmlFor="cpCode">Code</label><input className="inp" id="cpCode" placeholder="EID2026" value={c.code} onChange={e=>setC({...c,code:e.target.value})}/></div>
      <div className="grid2"><div className="field"><label htmlFor="cpType">Type</label><select className="inp" id="cpType" value={c.type} onChange={e=>setC({...c,type:e.target.value})}><option value="percent">Percent (%)</option><option value="flat">Fixed amount</option></select></div>
        <div className="field"><label htmlFor="cpVal">Qty</label><input className="inp" type="number" id="cpVal" min="1" value={c.value} onChange={e=>setC({...c,value:e.target.value})}/></div></div>
      <div className="field"><label htmlFor="cpMin">Minimum order (৳)</label><input className="inp" type="number" id="cpMin" min="0" value={c.min} onChange={e=>setC({...c,min:e.target.value})}/></div><span className="err">{err}</span><button className="btn">Create coupon</button></form></div></div>;
}

/* ---------------- settings ---------------- */
const toLocal=ts=>{const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
export function Settings(){
  const s=S.settings;
  const [f,setF]=useState(()=>({...s,flash:{...s.flash,pids:[...s.flash.pids],end:toLocal(s.flash.endsAt)},banners:s.banners.map(b=>({...b})),pages:{...s.pages},pagesEn:{...(s.pagesEn||{})}}));
  const up=k=>e=>setF({...f,[k]:e.target.value});
  const F=(k,l,type='text',ph='')=><div className="field"><label htmlFor={'st_'+k}>{l}</label><input className="inp" type={type} id={'st_'+k} value={f[k]??''} placeholder={ph} onChange={up(k)}/></div>;
  const fl=f.flash,setFl=p=>setF({...f,flash:{...fl,...p}}),setBn=(i,k,v)=>setF({...f,banners:f.banners.map((b,j)=>j===i?{...b,[k]:v}:b)});
  const submit=e=>{e.preventDefault();const st=S.settings;
    for(const k of ['name','nameBn','tagline','taglineEn','phone','whatsapp','email','facebook','address','addressEn','announce','announceEn','bkash','nagad','pixelId','ga4Id','fraudUrl','fraudSecret'])st[k]=String(f[k]??'').trim();
    for(const k of ['tagline','address','announce'])st[k+'En']=st[k];st.nameBn=st.name;st.whatsapp=st.whatsapp.replace(/\D/g,'');st.brandColor=f.brandColor;
    for(const k of ['inside','outside','freeShipMin'])st[k]=Math.max(0,+f[k]||0);
    if(st.pixelId&&!/^\d{6,20}$/.test(st.pixelId))toast('Pixel ID must be digits only, this one will not work');
    if(st.ga4Id&&!/^G-[A-Z0-9]{4,20}$/.test(st.ga4Id))toast('GA4 ID should look like G-XXXXXXX');
    st.flash={on:fl.on,title:fl.title.trim()||'Flash Sale',titleEn:fl.title.trim(),endsAt:new Date(fl.end).getTime()||Date.now()+DAY,pids:fl.pids};
    st.banners=f.banners.map(b=>({...b,titleEn:b.title,subEn:b.sub,ctaEn:b.cta}));st.pages=f.pages;st.pagesEn={...f.pages};save();applyTheme();toast('Settings saved')};
  const test=async()=>{S.settings.fraudUrl=(f.fraudUrl||'').trim()||'courier-check.php';S.settings.fraudSecret=(f.fraudSecret||'').trim();save();try{await frCall({action:'ping'});toast('BD Courier connection OK ✓')}catch(e){toast(e.message)}};
  const logo=async e=>{const fl=e.target.files[0];if(!fl)return;S.settings.logo=await resizeImage(fl,120,'h');save();toast('Logo saved')};
  return <><form className="panels" onSubmit={submit}>
    <div className="panel w6" style={{display:'flex',flexDirection:'column',gap:12}}><h3>Store details</h3><div className="grid2">{F('name','Store name')}{F('phone','Hotline number')}</div>
      <div className="field"><label htmlFor="st_logo">Logo (optional)</label><input type="file" accept="image/*" id="st_logo" className="inp" onChange={logo}/><div className="row">{s.logo&&<><img src={s.logo} alt="" style={{height:36}}/><button type="button" className="btn sm plain" onClick={()=>{S.settings.logo='';save()}}>Remove logo</button></>}</div></div>
      <div className="field"><label htmlFor="st_brandColor">Brand colour</label><div className="row"><input type="color" id="st_brandColor" value={f.brandColor||'#f85606'} onChange={up('brandColor')} style={{width:60,height:38,border:0,background:'none'}}/><span className="small muted">Used for buttons, links and highlights</span></div></div>
      {F('tagline','Tagline')}
      {F('whatsapp','WhatsApp (with 880, digits only)')}
      <div className="grid2">{F('email','Email')}{F('facebook','Facebook page link','url','https://facebook.com/...')}</div>
      {F('address','Address')}
      {F('announce','Top announcement')}</div>
    <div className="panel w6" style={{display:'flex',flexDirection:'column',gap:12}}><h3>Delivery & payment</h3>
      <div className="grid2">{F('inside','Inside Dhaka charge (৳)','number')}{F('outside','Outside Dhaka charge (৳)','number')}</div>
      {F('freeShipMin','Free delivery above (৳, 0 to turn off)','number')}
      <div className="grid2">{F('bkash','bKash personal number','text','Leave empty to hide bKash')}{F('nagad','Nagad personal number','text','Leave empty to hide Nagad')}</div>
      <h3 style={{marginTop:6}}>Flash Sale</h3>
      <label className="opt"><input type="checkbox" checked={fl.on} onChange={e=>setFl({on:e.target.checked})}/>Flash sale on</label>
      <div className="field"><label htmlFor="fl_title">Title</label><input className="inp" id="fl_title" value={fl.title} onChange={e=>setFl({title:e.target.value})}/></div>
      <div className="field"><label htmlFor="fl_end">Ends at</label><input className="inp" type="datetime-local" id="fl_end" value={fl.end} onChange={e=>setFl({end:e.target.value})}/></div>
      <div className="field"><label>Flash sale products</label><div style={{maxHeight:170,overflow:'auto',border:'1px solid var(--line)',borderRadius:9,padding:'6px 10px'}}>{S.products.map(p=><label className="opt" key={p.id}><input type="checkbox" checked={fl.pids.includes(p.id)} onChange={e=>setFl({pids:e.target.checked?[...fl.pids,p.id]:fl.pids.filter(x=>x!==p.id)})}/>{p.name}</label>)}</div></div>
      <h3 style={{marginTop:6}}>Marketing tracking</h3>
      {F('pixelId','Meta (Facebook) Pixel ID','text','e.g. 123456789012345')}{F('ga4Id','Google Analytics 4 Measurement ID','text','e.g. G-XXXXXXXXXX')}
      <p className="small muted" style={{margin:0}}>When set, the live site sends PageView, ViewContent, AddToCart, InitiateCheckout and Purchase events automatically.</p>
      <h3 style={{marginTop:6}}>Fraud checker (BD Courier)</h3>
      <div className="grid2">{F('fraudUrl','PHP file path','text','courier-check.php')}{F('fraudSecret','Secret word (same as in the PHP file)','password')}</div>
      <div className="row"><button type="button" className="btn sm plain" onClick={test}>Test connection</button><span className="small muted">The API key is not stored here, only in courier-check.php on your hosting.</span></div></div>
    <div className="panel w12" style={{display:'flex',flexDirection:'column',gap:12}}><h3>Homepage banner slider</h3><div className="panels">
      {f.banners.map((b,i)=><div className="panel" key={i} style={{display:'flex',flexDirection:'column',gap:8,background:'var(--bg)'}}><b className="small">Banner {i+1}</b>
        <input className="inp" value={b.title} onChange={e=>setBn(i,'title',e.target.value)} placeholder="Title" aria-label="Title"/>
        <input className="inp" value={b.sub} onChange={e=>setBn(i,'sub',e.target.value)} placeholder="Subtitle" aria-label="Subtitle"/>
        <input className="inp" value={b.cta} onChange={e=>setBn(i,'cta',e.target.value)} placeholder="Button text" aria-label="Button text"/>
        <div className="row" style={{flexWrap:'nowrap'}}><select className="inp" value={b.cat} onChange={e=>setBn(i,'cat',e.target.value)} aria-label="Links to category">{S.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input type="color" value={b.tint} onChange={e=>setBn(i,'tint',e.target.value)} aria-label="Colour"/></div></div>)}</div></div>
    <div className="panel w12" style={{display:'flex',flexDirection:'column',gap:12}}><h3>Page content</h3><div className="grid2">{Object.entries(PAGE_TITLES).map(([k,tl])=><div key={k} style={{display:'contents'}}>
      <div className="field"><label htmlFor={'pg_'+k}>{tl}</label><textarea className="inp" id={'pg_'+k} rows={4} value={f.pages[k]||''} onChange={e=>setF({...f,pages:{...f.pages,[k]:e.target.value}})}/></div></div>)}</div></div>
    <div className="panel w12 row"><button className="btn">Save settings</button><span className="grow"/><button type="button" className="btn danger" onClick={()=>askConfirm('All demo data (orders, products, settings) will be reset. Are you sure?',()=>{resetStore();toast('Demo data reset')},'Reset')}>Reset demo data</button></div></form>
  <div className="demo-note" style={{fontSize:14}}><b>Still needed for the live site:</b> an online database (PHP+MySQL or Firebase), courier APIs (Steadfast, Pathao, RedX), SMS OTP and order SMS, automatic bKash/Nagad verification, and separate staff logins. Right now data is stored only in this browser.</div></>;
}
