import {useSyncExternalStore} from 'react';
import {S,save,toast,emit,DAY,HOUR,startOfDay,STATUS,meName,COURIERS,PAY,PAY_ST,itemText,DIST_EN,pad} from '../lib/core.js';

/* ---------- admin UI state (filters survive page switches) ---------- */
const subs=new Set();let v=0;
export const adm={range:'30',status:'all',courier:'',q:'',from:'',to:'',pg:1,sel:new Set(),pq:'',pcat:'',cq:'',incFilter:'new',revFilter:'pending'};
export function setAdm(patch){Object.assign(adm,patch);v++;subs.forEach(f=>f())}
export const useAdm=()=>{useSyncExternalStore(f=>{subs.add(f);return ()=>subs.delete(f)},()=>v);return adm};

export const PAGES={overview:'Overview',orders:'Order management',returns:'Returns dashboard',incomplete:'Incomplete orders',customers:'Customer',messages:'Customer messages',reviews:'Reviews & ratings',products:'Products & variants',categories:'Categories',coupons:'Coupons',settings:'Store settings'};
export const RANGES=[['today','Today'],['yesterday','Yesterday'],['7','7 days'],['30','30 days'],['all','All time']];
export function rangeBounds(r){const t0=startOfDay(Date.now());if(r==='today')return [t0,Infinity];if(r==='yesterday')return [t0-DAY,t0];if(r==='all')return [0,Infinity];return [t0-(+r-1)*DAY,Infinity]}
export function inRange(o,r=adm.range){const [a,b]=rangeBounds(r);return o.createdAt>=a&&o.createdAt<b}
export const isLive=o=>!['cancelled','returned'].includes(o.status);
export function riskOf(o){
  const out=[],same=S.orders.filter(x=>x.phone===o.phone&&x.id!==o.id);
  const bad=same.filter(x=>['cancelled','returned'].includes(x.status)).length;
  if(bad)out.push(`${bad} earlier orders from this number were cancelled or returned`);
  if(!same.length&&o.district!=='Dhaka'&&o.total>=4000)out.push('Large first order from outside Dhaka');
  if(same.some(x=>Math.abs(x.createdAt-o.createdAt)<DAY&&['pending','confirmed','hold'].includes(x.status)))out.push('Several orders from this number within 24 hours, possible duplicate');
  return out;
}
export function allEvents(){const ev=[];for(const o of S.orders)for(const h of o.history)ev.push({...h,o,first:h===o.history[0]});return ev.sort((a,b)=>b.at-a.at)}
export const evText=e=>e.first?'new order placed':e.s==='note'?'note added':'marked '+STATUS[e.s].t;
export const INC_ST={new:{t:'New, follow-up pending',c:'warn'},contacted:{t:'Contacted',c:'info'},converted:{t:'Converted to order',c:'good'},dropped:{t:'Dropped',c:''}};

/* ---------- orders portal filters ---------- */
export const OPP=20;
function inODates(o){const a=adm.from?new Date(adm.from+'T00:00').getTime():0,b=adm.to?new Date(adm.to+'T00:00').getTime()+DAY:Infinity;return o.createdAt>=a&&o.createdAt<b}
export function ordersBase(){return S.orders.filter(o=>inODates(o)&&(!adm.courier||o.courier===adm.courier))}
export function ordersFiltered(){const q=adm.q.trim().toLowerCase();return ordersBase().filter(o=>(adm.status==='all'||o.status===adm.status)&&(!q||(o.inv+' '+o.name+' '+o.phone+' '+o.district+' '+(o.tracking||'')).toLowerCase().includes(q)))}
export const OTABS=[['all','All Orders'],['pending','Pending'],['incomplete','Incomplete'],['confirmed','Confirmed'],['hold','On Hold'],['ready','Ready'],['transit','Transit'],['delivered','Delivered'],['cancelled','Cancelled'],['partial','Partial Return'],['returned','Returned']];
export const trackUrl=o=>!o.tracking?'':o.courier==='steadfast'?`https://steadfast.com.bd/t/${o.tracking}`:o.courier==='redx'?`https://redx.com.bd/track-parcel/?trackingId=${o.tracking}`:o.courier==='pathao'?`https://merchant.pathao.com/tracking?consignment_id=${o.tracking}&phone=${o.phone}`:'';
export const waNum=p=>{p=String(p).replace(/\D/g,'');return p.startsWith('880')?p:p.startsWith('0')?'88'+p:'880'+p};

export function exportCSV(){
  const rows=[['Invoice','Date','Name','Phone','District','Address','Items','Subtotal','Delivery','Discount','Total','Status','Payment','Payment status','TrxID','Courier','Tracking','Source']];
  ordersFiltered().forEach(o=>{const d=new Date(o.createdAt);rows.push([o.inv,`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,o.name,o.phone,DIST_EN[o.district]||o.district,o.address,o.items.map(i=>itemText(i)+' x'+i.qty).join('; '),o.sub,o.delivery,o.discount,o.total,STATUS[o.status].t,o.payment?PAY[o.payment.method]:'',o.payment?PAY_ST[o.payment.status].t:'',o.payment&&o.payment.trx||'',o.courier?COURIERS[o.courier].t:'',o.tracking,o.source])});
  const csv='﻿'+rows.map(r=>r.map(v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`orders-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();toast(`Downloading CSV of ${rows.length-1} orders`);
}

/* ---------- BD Courier fraud check (via server-side courier-check.php) ---------- */
export const frPhone=p=>{p=String(p).replace(/\D/g,'');if(p.startsWith('880'))p=p.slice(2);return p};
const FR_TTL=12*3600*1000;export const frBusy=new Set();
export function frParse(resp){
  const num=(...v)=>{for(const x of v)if(x!=null&&x!==''&&!isNaN(+x))return +x;return null};
  let root=resp&&(resp.courierData||resp.courier_data||(resp.data&&(resp.data.courierData||resp.data))||resp);
  const rows=[];let sum=null;
  if(root&&typeof root==='object')for(const [k,v] of Object.entries(root)){
    if(!v||typeof v!=='object'||Array.isArray(v))continue;
    const tot=num(v.total_parcel,v.total_parcels,v.total,v.total_deliveries,v.total_order),ok=num(v.success_parcel,v.success_parcels,v.success,v.delivered,v.total_success),cn=num(v.cancelled_parcel,v.cancel_parcel,v.cancelled,v.cancel,v.returned,v.total_cancel);
    if(tot==null&&ok==null)continue;
    const r={k,name:v.name||k.charAt(0).toUpperCase()+k.slice(1),total:tot??((ok||0)+(cn||0)),ok:ok||0,cancel:cn??Math.max(0,(tot||0)-(ok||0)),ratio:num(v.success_ratio,v.successRatio)};
    if(r.ratio==null)r.ratio=r.total?r.ok/r.total*100:0;
    if(/^(summary|aggregate|total)$/i.test(k))sum=r;else rows.push(r);
  }
  if(!sum){const t=rows.reduce((a,r)=>({total:a.total+r.total,ok:a.ok+r.ok,cancel:a.cancel+r.cancel}),{total:0,ok:0,cancel:0});sum={...t,ratio:t.total?t.ok/t.total*100:0}}
  const rep=resp&&(resp.reports||resp.fraud_reports||(resp.data&&resp.data.reports));
  return {sum,rows,reports:Array.isArray(rep)?rep:[]};
}
export async function frCall(body){
  const st=S.settings;if(!st.fraudSecret)throw new Error('Add the fraud checker secret in Settings first');
  if(/github\.io$/.test(location.hostname)||location.protocol==='file:')throw new Error('Fraud check only works on your own hosting (with courier-check.php), not on GitHub Pages');
  let r;try{r=await fetch(st.fraudUrl||'courier-check.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,secret:st.fraudSecret})})}catch(e){throw new Error('Could not reach courier-check.php on the server')}
  let j;try{j=await r.json()}catch(e){throw new Error('courier-check.php not found or PHP is not running')}
  if(r.status===403)throw new Error('Secret does not match; use the same word in Settings and the PHP file');
  if(!j.ok)throw new Error(j.error||('BD Courier replied: '+(j.data&&(j.data.message||j.data.error)||j.status)));
  return j.data;
}
export async function fraudCheck(phone,force){
  const p=frPhone(phone),c=S.fraud[p];if(!force&&c&&Date.now()-c.at<FR_TTL)return c;
  if(frBusy.has(p))return null;frBusy.add(p);emit();
  try{const data=await frCall({action:'check',phone:p});const res={...frParse(data),at:Date.now(),raw:data};S.fraud[p]=res;save();return res}
  catch(e){toast(e.message);return null}finally{frBusy.delete(p);emit()}
}
export const frCls=r=>r>=80?'good':r>=60?'warn':'bad';
export {meName,HOUR};
