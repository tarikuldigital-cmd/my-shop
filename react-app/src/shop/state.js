import {useSyncExternalStore} from 'react';
import {go,closeModal} from '../lib/core.js';

/* Storefront UI state shared by header, filters and product grid. */
const subs=new Set();let v=0;
export const shop={q:'',cat:'',quick:[],price:'',min:'',max:'',sort:'new',trackQ:''};
export function setShop(patch){Object.assign(shop,patch);v++;subs.forEach(f=>f())}
export const useShop=()=>{useSyncExternalStore(f=>{subs.add(f);return ()=>subs.delete(f)},()=>v);return shop};

export const goCat=id=>{setShop({cat:id,q:'',quick:[],price:'',min:'',max:''});closeModal();go('products')};
export const goQuick=k=>{setShop({quick:[k],cat:'',q:''});go('products')};
export const lastOrder={id:null};
