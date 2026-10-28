import {S,STATUS,ST_KEYS,COURIERS,tk,DAY,HOUR,startOfDay,prod,catName,catOf,openModal} from '../lib/core.js';
import {useAdm,setAdm,inRange,isLive,riskOf} from './logic.js';

function niceMax(v){if(v<=5)return 5;const p=Math.pow(10,Math.floor(Math.log10(v)));const n=v/p;return (n<=1?1:n<=2?2:n<=5?5:10)*p}
function BarChart({data}){
  const W=640,H=200,pl=34,pr=8,pt=10,pb=24,max=niceMax(Math.max(1,...data.map(d=>d.v))),iw=W-pl-pr,ih=H-pt-pb,bw=iw/data.length,every=Math.ceil(data.length/10);
  return <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily orders chart">
    {[0,1,2,3,4,5].map(i=>{const y=pt+ih-ih*i/5;return <g key={i}><line className="grid" x1={pl} x2={W-pr} y1={y} y2={y}/><text className="lbl" x={pl-6} y={y+4} textAnchor="end">{Math.round(max*i/5)}</text></g>})}
    {data.map((d,i)=>{const h=ih*d.v/max,x=pl+i*bw+bw*.18,y=pt+ih-h;return <g key={i}><rect className={'bar'+(i===data.length-1?' hi':'')} x={x.toFixed(1)} y={y.toFixed(1)} width={(bw*.64).toFixed(1)} height={h.toFixed(1)} rx="2"><title>{`${d.label}: ${d.v} orders, ${tk(d.s)}`}</title></rect>
      {(i%every===0||i===data.length-1)&&<text className="lbl" x={(pl+i*bw+bw/2).toFixed(1)} y={H-6} textAnchor="middle">{d.label}</text>}</g>})}</svg>;
}
export function HBars({rows,color}){
  const m=Math.max(1,...rows.map(r=>r[1]));
  if(!rows.length)return <p className="muted small">No data for this period</p>;
  return rows.map((r,i)=><div className="hbar" key={i}><span title={r[0]} style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r[0]}</span><span className="t"><i style={{width:r[1]/m*100+'%','--c':r[2]||color||'var(--brand)'}}/></span><span className="n">{r[1]}</span></div>);
}

export default function Overview(){
  const adm=useAdm();
  const L=S.orders.filter(o=>inRange(o)),live=L.filter(isLive),sales=live.reduce((s,o)=>s+o.total,0);
  const deliv=L.filter(o=>o.status==='delivered'),canc=L.filter(o=>o.status==='cancelled'),ret=L.filter(o=>o.status==='returned');
  const rate=(a,b)=>b?Math.round(a/b*100):0;
  const profit=live.reduce((s,o)=>s+o.items.reduce((a,i)=>a+(i.price-(i.cost||0))*i.qty,0)-o.discount,0);
  const kpis=[['Total orders',L.length,`${L.filter(o=>o.status==='pending').length} pending`,'var(--brand)'],['Total sales',tk(sales),`Est. profit ${tk(profit)}`,'var(--accent)'],['Delivered',deliv.length,tk(deliv.reduce((s,o)=>s+o.total,0)),'var(--good)'],['Cancelled',canc.length,`Cancel rate ${rate(canc.length,L.length)}%`,'var(--bad)'],['Avg. order value',tk(live.length?sales/live.length:0),'per order','var(--info)'],['Return',ret.length,`Return rate ${rate(ret.length,L.filter(o=>['delivered','returned'].includes(o.status)).length)}%`,'var(--hold)']];
  const days=adm.range==='all'?30:['today','yesterday'].includes(adm.range)?7:Math.max(7,+adm.range),t0=startOfDay(Date.now()),trend=[];
  for(let i=days-1;i>=0;i--){const d0=t0-i*DAY,os=S.orders.filter(o=>o.createdAt>=d0&&o.createdAt<d0+DAY),dd=new Date(d0);trend.push({label:`${dd.getDate()}/${dd.getMonth()+1}`,v:os.length,s:os.filter(isLive).reduce((s,o)=>s+o.total,0)})}
  const cmap={warn:'warn',info:'info',hold:'hold',info2:'brand',transit:'accent',good:'good',bad:'bad',bad2:'bad'};
  const sd=ST_KEYS.map(k=>[STATUS[k].t,L.filter(o=>o.status===k).length,`var(--${cmap[STATUS[k].c]})`]).filter(r=>r[1]);
  const reached=s=>L.filter(o=>o.history.some(h=>h.s===s)).length;
  const fsteps=[['Order placed',L.length],['Confirmed',reached('confirmed')],['Handed to courier',reached('ready')],['In transit',reached('transit')],['Delivered',reached('delivered')]];
  const now=Date.now(),lastAt=o=>o.history.filter(h=>h.s!=='note').slice(-1)[0].at;
  const p6=S.orders.filter(o=>o.status==='pending'&&now-o.createdAt>6*HOUR),u24=S.orders.filter(o=>['confirmed','hold'].includes(o.status)&&now-lastAt(o)>24*HOUR),r24=S.orders.filter(o=>o.status==='ready'&&now-lastAt(o)>24*HOUR),tr5=S.orders.filter(o=>o.status==='transit'&&now-lastAt(o)>5*DAY);
  const cour=Object.keys(COURIERS).map(c=>{const os=L.filter(o=>o.courier===c),d=os.filter(o=>o.status==='delivered').length,r=os.filter(o=>o.status==='returned').length;return {c,n:os.length,d,r,rate:d+r?Math.round(d/(d+r)*100):0}});
  const codPipe=S.orders.filter(o=>['ready','transit'].includes(o.status)).reduce((s,o)=>s+o.total,0),codDone=deliv.reduce((s,o)=>s+o.total,0);
  const succ=cour.reduce((s,c)=>s+c.d,0)/Math.max(1,cour.reduce((s,c)=>s+c.d+c.r,0));
  const dmap={};live.forEach(o=>dmap[o.district]=(dmap[o.district]||0)+1);const topD=Object.entries(dmap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const pm={};L.forEach(o=>o.items.forEach(it=>{pm[it.pid]=pm[it.pid]||{n:0,r:0,name:it.name};if(o.status==='returned')pm[it.pid].r+=it.qty;else if(o.status!=='cancelled')pm[it.pid].n+=it.qty}));const topP=Object.values(pm).sort((a,b)=>b.n-a.n).slice(0,6);
  const cm={};L.forEach(o=>{if(!isLive(o))return;o.items.forEach(it=>{const c=prod(it.pid)?prod(it.pid).cat:'';cm[c]=(cm[c]||0)+it.price*it.qty})});
  const topCat=Object.entries(cm).sort((a,b)=>b[1]-a[1]).map(([c,v])=>[catName(c),v,catOf(c).tint]);
  const byPhone={};S.orders.filter(isLive).forEach(o=>{byPhone[o.phone]=byPhone[o.phone]||{n:0,s:0,name:o.name};byPhone[o.phone].n++;byPhone[o.phone].s+=o.total});
  const custs=Object.values(byPhone),rep=custs.filter(c=>c.n>1),clv=custs.length?custs.reduce((s,c)=>s+c.s,0)/custs.length:0;
  const cr={};canc.forEach(o=>{const k=o.cancelReason||'No reason given';cr[k]=(cr[k]||0)+1});
  const rr={return:0,refund:0,replacement:0};let refundAmt=0;S.orders.filter(o=>o.ret&&inRange(o)).forEach(o=>{rr[o.ret.type]++;if(o.ret.type==='refund')refundAmt+=o.total});
  const td=startOfDay(now),team=S.staff.map(s=>{const c={conf:0,pack:0,ship:0,del:0};S.orders.forEach(o=>o.history.forEach(h=>{if(h.by===s&&h.at>=td){if(h.s==='confirmed')c.conf++;if(h.s==='ready')c.pack++;if(h.s==='transit')c.ship++;if(h.s==='delivered')c.del++}}));return [s,c]});
  const lowV=[];S.products.forEach(p=>p.variants.forEach(v=>{if(v.stock<=3)lowV.push({p,v})}));
  /* insights: [kind, content, orderId?] */
  const ins=[];
  S.orders.filter(o=>['pending','confirmed','hold'].includes(o.status)).map(o=>({o,r:riskOf(o)})).filter(x=>x.r.length).slice(0,3).forEach(x=>ins.push(['risk',<><b>{x.o.inv}</b> ({x.o.name}, {x.o.district}): {x.r[0]}. Confirm by phone before shipping.</>,x.o.id]));
  if(p6.length)ins.push(['warn',`${p6.length} orders have been pending for more than 6 hours. Delays raise the chance of cancellation.`]);
  const topCR=Object.entries(cr).sort((a,b)=>b[1]-a[1])[0];if(topCR)ins.push(['warn',`Top cancel reason: "${topCR[0]}" (${topCR[1]}).`]);
  const best=cour.filter(c=>c.d+c.r>=3).sort((a,b)=>b.rate-a.rate)[0];if(best)ins.push(['ok',`${COURIERS[best.c].t} has the best delivery success in this period, ${best.rate}%.`]);
  if(lowV.length)ins.push(['warn',`${lowV.length} variants have 3 or fewer in stock, e.g. ${lowV.slice(0,2).map(x=>x.p.name+(x.v.key?' ('+x.v.key+')':'')).join(', ')}.`]);
  {const ni=S.incomplete.filter(x=>x.status==='new');if(ni.length)ins.unshift(['warn',<>{ni.length} incomplete orders are waiting for follow-up, potential sales {tk(ni.reduce((s,x)=>s+x.sub,0))}। <a href="#admin-incomplete">Call now</a></>])}
  {const pp=S.orders.filter(o=>o.payment&&o.payment.status==='pending');if(pp.length)ins.unshift(['warn',`${pp.length} bKash/Nagad payments are waiting for verification. Match the TrxID and confirm.`,pp[0].id])}
  {const rp=S.reviews.filter(r=>!r.approved).length;if(rp)ins.push(['ok',<>{rp} new reviews are waiting for approval. <a href="#admin-reviews">View</a></>])}
  if(topCat[0])ins.push(['ok',`Top-selling category: "${topCat[0][0]}", ${tk(topCat[0][1])}.`]);
  return <>
    <div className="kpis">{kpis.map(k=><div className="kpi" style={{'--k':k[3]}} key={k[0]}><div className="l">{k[0]}</div><div className="v">{k[1]}</div><div className="s">{k[2]}</div></div>)}</div>
    <div className="panels">
      <div className="panel w8"><h3>Order trend <small>Last {days} days, orders per day</small></h3><BarChart data={trend}/></div>
      <div className="panel"><h3>Orders by status</h3><HBars rows={sd}/></div>
      <div className="panel w6"><h3>Smart insights & risk <small>rule-based</small></h3>{ins.length?ins.map((i,k)=><div key={k} className={'insight '+(i[0]==='risk'?'risk':i[0]==='warn'?'warn':'')}><span className="dot"/><div className="grow">{i[1]}{i[2]&&<> <button className="iconbtn small" style={{color:'var(--brand)',padding:'0 4px'}} onClick={()=>openModal('order',{id:i[2]})}>View order</button></>}</div></div>):<p className="muted">No alerts right now.</p>}</div>
      <div className="panel w6"><h3>Processing SLA <small>right now</small></h3><div className="sla">
        <div className={p6.length?'alert':''}><div className="v">{p6.length}</div>Pending over 6 hours</div><div className={u24.length?'alert':''}><div className="v">{u24.length}</div>Confirmed or on hold over 24 hours</div>
        <div className={r24.length?'alert':''}><div className="v">{r24.length}</div>Ready, not picked up in 24 hours</div><div className={tr5.length?'alert':''}><div className="v">{tr5.length}</div>In transit over 5 days</div></div>
        <button className="btn sm ghost" style={{marginTop:10}} onClick={()=>{setAdm({status:'pending',from:'',to:'',pg:1});location.hash='admin-orders'}}>View pending orders</button></div>
      <div className="panel"><h3>Order funnel <small>where orders drop off</small></h3><div className="funnel">{fsteps.map((f,i)=>{const w=L.length?f[1]/L.length*100:0,prev=i?fsteps[i-1][1]:0,lost=i?prev-f[1]:0;
        return <div className="fstep" key={i}><span>{f[0]}</span>{i&&lost>0?<span className="leak">−{lost} ({Math.round(lost/(prev||1)*100)}%)</span>:<span/>}<div className="t"><i style={{width:Math.max(w,6)+'%'}}>{f[1]}</i></div></div>})}</div></div>
      <div className="panel"><h3>Courier performance</h3><table className="t mini"><thead><tr><th>Courier</th><th>Total</th><th>Delivered</th><th>Return</th><th>Success</th></tr></thead><tbody>{cour.map(c=><tr key={c.c}><td>{COURIERS[c.c].t}</td><td className="num">{c.n}</td><td className="num">{c.d}</td><td className="num">{c.r}</td><td><span className={'pill nodot '+(c.rate>=85?'good':c.rate>=70?'warn':'bad')}>{c.rate}%</span></td></tr>)}</tbody></table></div>
      <div className="panel"><h3>COD collection</h3><div className="sla"><div><div className="v num" style={{fontSize:20}}>{tk(codPipe)}</div>With couriers, incoming</div><div><div className="v num" style={{fontSize:20}}>{tk(codDone)}</div>Delivered in this period</div></div><p className="small muted" style={{margin:'10px 0 0'}}>Expected collection at past success rate: <b className="num">{tk(codPipe*succ)}</b></p></div>
      <div className="panel"><h3>Sales by category</h3><HBars rows={topCat.map(x=>[x[0],Math.round(x[1]),x[2]])}/></div>
      <div className="panel"><h3>Top products & returns</h3><table className="t mini"><thead><tr><th>Product</th><th>Sold</th><th>Return</th></tr></thead><tbody>{topP.length?topP.map((p,i)=><tr key={i}><td>{p.name}</td><td className="num">{p.n}</td><td className="num" style={p.r?{color:'var(--bad)'}:null}>{p.r}</td></tr>):<tr><td colSpan={3} className="muted">No data</td></tr>}</tbody></table></div>
      <div className="panel"><h3>Top districts</h3><HBars rows={topD}/></div>
      <div className="panel"><h3>Refunds & replacements</h3><div className="sla"><div><div className="v">{rr.return}</div>Return</div><div><div className="v">{rr.replacement}</div>Replacement</div><div><div className="v">{rr.refund}</div>Refund</div><div><div className="v num" style={{fontSize:20}}>{tk(refundAmt)}</div>Refund amount</div></div></div>
      <div className="panel"><h3>Cancel reason</h3><HBars rows={Object.entries(cr).sort((a,b)=>b[1]-a[1])} color="var(--bad)"/></div>
      <div className="panel"><h3>Repeat customers & lifetime value</h3><div className="sla"><div><div className="v">{custs.length?Math.round(rep.length/custs.length*100):0}%</div>Repeat customers ({rep.length} )</div><div><div className="v num" style={{fontSize:20}}>{tk(clv)}</div>Avg. lifetime value</div></div><a className="btn sm ghost" href="#admin-customers" style={{marginTop:10}}>View all customers</a></div>
      <div className="panel w6"><h3>Today's team performance</h3><table className="t mini"><thead><tr><th>Staff</th><th>Confirmed</th><th>Packed</th><th>Shipped</th><th>Delivery</th></tr></thead><tbody>{team.map(([s,c])=><tr key={s}><td>{s}</td><td className="num">{c.conf}</td><td className="num">{c.pack}</td><td className="num">{c.ship}</td><td className="num">{c.del}</td></tr>)}</tbody></table></div>
      <div className="panel w6"><h3>Low-stock variants <small>3 or fewer</small></h3><table className="t mini"><tbody>{lowV.length?lowV.slice(0,7).map((x,i)=><tr key={i}><td>{x.p.name}</td><td className="small muted">{x.v.key||'—'}</td><td>{x.v.stock<=0?<span className="pill bad">Out</span>:<span className="pill warn">{x.v.stock}</span>}</td></tr>):<tr><td className="muted">All good</td></tr>}</tbody></table><a className="btn sm ghost" href="#admin-products" style={{marginTop:10}}>Update stock</a></div>
    </div></>;
}
