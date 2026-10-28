/* =========================================================
   Smart China Gallery — core data & business logic
   All data lives in localStorage via DB. To go fully online,
   replace DB.load/DB.save with API calls (PHP/MySQL, Firebase…).
   ========================================================= */
import {useSyncExternalStore} from 'react';

export const DB={
  key:'scg_store_v6',
  load(){try{const r=localStorage.getItem(this.key);if(r){const d=JSON.parse(r);if(d&&d.v===6){if(!d.enDefault){d.prefs=d.prefs||{};d.prefs.lang='en';d.enDefault=1}if(d.settings&&/Chaina/.test(d.settings.name||''))d.settings.name=d.settings.name.replace('Chaina','China');return d}}}catch(e){}return null},
  save(state){try{localStorage.setItem(this.key,JSON.stringify(state));return true}catch(e){return false}}
};

export const tk=n=>'৳'+Math.round(n||0).toLocaleString('en-IN');
export const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const pad=n=>String(n).padStart(2,'0');
export function fdate(ts,withTime=true){const d=new Date(ts);let s=`${d.getDate()} ${MONTHS[d.getMonth()]}`;if(withTime){let h=d.getHours(),ap=h<12?'AM':'PM';h=h%12||12;s+=`, ${h}:${pad(d.getMinutes())} ${ap}`}return s}
export function ago(ts){const m=Math.round((Date.now()-ts)/6e4);if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<24)return h+' h ago';return Math.round(h/24)+' days ago'}
export const startOfDay=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
export const DAY=864e5,HOUR=36e5;
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------------- constants ---------------- */
export const STATUS={
  pending:{t:'Pending',c:'warn'},confirmed:{t:'Confirmed',c:'info'},hold:{t:'On hold',c:'hold'},
  ready:{t:'Ready to ship',c:'info2'},transit:{t:'In transit',c:'transit'},
  delivered:{t:'Delivered',c:'good'},cancelled:{t:'Cancelled',c:'bad'},partial:{t:'Partial return',c:'bad2'},returned:{t:'Returned',c:'bad2'}
};
export const ST_KEYS=Object.keys(STATUS);
export const COURIERS={steadfast:{t:'Steadfast',p:'SF'},pathao:{t:'Pathao',p:'PT'},redx:{t:'RedX',p:'RX'}};
export const DISTRICTS=["Dhaka", "Gazipur", "Narayanganj", "Narsingdi", "Manikganj", "Munshiganj", "Tangail", "Kishoreganj", "Faridpur", "Gopalganj", "Madaripur", "Rajbari", "Shariatpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Noakhali", "Lakshmipur", "Chandpur", "Brahmanbaria", "Rangamati", "Khagrachari", "Bandarban", "Rajshahi", "Natore", "Naogaon", "Chapainawabganj", "Pabna", "Sirajganj", "Bogura", "Joypurhat", "Khulna", "Bagerhat", "Satkhira", "Jashore", "Jhenaidah", "Magura", "Narail", "Kushtia", "Chuadanga", "Meherpur", "Barishal", "Bhola", "Patuakhali", "Barguna", "Jhalokati", "Pirojpur", "Sylhet", "Moulvibazar", "Habiganj", "Sunamganj", "Rangpur", "Dinajpur", "Thakurgaon", "Panchagarh", "Nilphamari", "Lalmonirhat", "Kurigram", "Gaibandha", "Mymensingh", "Jamalpur", "Sherpur", "Netrokona"];
export const CANCEL_REASONS=['Did not answer the phone','Customer changed their mind','Duplicate order','Delivery charge too high','Fake order','Out of stock'];
export const RETURN_REASONS=['Did not match the photos','Damaged item','Customer refused the parcel','Wrong size or variant sent'];
export const RET_TYPES={return:'Return',refund:'Refund',replacement:'Replacement'};
export const RET_ST={requested:'Requested',received:'Item received back',refunded:'Refunded',replaced:'Replacement sent'};
export const SOURCES=['Website','Facebook','Phone','WhatsApp'];

/* ---------------- variants ---------------- */
export function cartesian(opts){return opts.reduce((acc,o)=>acc.flatMap(a=>o.values.map(v=>[...a,v])),[[]])}
export function buildVariants(options,prev=[],base={price:0,old:0,stock:0}){
  const clean=options.filter(o=>o.name&&o.values.length);
  if(!clean.length){const p=prev.find(v=>v.key==='')||prev[0]||base;return [{key:'',vals:[],price:+p.price||0,old:+p.old||0,cost:+p.cost||0,stock:+p.stock||0,sku:p.sku||''}]}
  return cartesian(clean).map(vals=>{const key=vals.join(' / ');const p=prev.find(v=>v.key===key)||{...base};return {key,vals,price:+p.price||0,old:+p.old||0,cost:+p.cost||0,stock:+p.stock||0,sku:p.sku||''}});
}
export const variant=(p,key)=>p.variants.find(v=>v.key===key);
export const minPrice=p=>Math.min(...p.variants.map(v=>v.price));
export const maxPrice=p=>Math.max(...p.variants.map(v=>v.price));
export const totalStock=p=>p.variants.reduce((s,v)=>s+v.stock,0);
export const hasOpts=p=>p.options&&p.options.length>0;
export function bestOld(p){const v=p.variants.find(v=>v.price===minPrice(p));return v&&v.old>v.price?v.old:0}
export const pctOff=p=>{const o=bestOld(p);return o?Math.round((o-minPrice(p))/o*100):0};

export function seed(){
  const R=mulberry32(271026),rnd=()=>R(),pick=a=>a[Math.floor(rnd()*a.length)];
  const now=Date.now();
  const categories=[
    {id:'c1',name:'Electronics & Gadgets',nameEn:'Electronics & Gadgets',icon:'device',tint:'#2b62a8',img:'https://images.pexels.com/photos/17810098/pexels-photo-17810098.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c8',name:'Mobile & Creator Gear',nameEn:'Mobile & Creator Gear',icon:'device',tint:'#7048c8',img:'https://images.pexels.com/photos/9413665/pexels-photo-9413665.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c9',name:'Winter Gadgets',nameEn:'Winter Gadgets',icon:'gift',tint:'#d9480f',img:'https://images.pexels.com/photos/15206538/pexels-photo-15206538.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c10',name:'Smart Home & Security',nameEn:'Smart Home & Security',icon:'device',tint:'#0b7285',img:'https://images.pexels.com/photos/24346971/pexels-photo-24346971.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c11',name:'Car & Bike',nameEn:'Car & Bike',icon:'tag',tint:'#495057',img:'https://images.pexels.com/photos/33488/pexels-photo-33488.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c12',name:'Personal Care',nameEn:'Personal Care',icon:'drop',tint:'#9c36b5',img:'https://images.pexels.com/photos/11372618/pexels-photo-11372618.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c2',name:'Fashion',nameEn:'Fashion',icon:'shirt',tint:'#a3405b',img:'https://images.pexels.com/photos/28494850/pexels-photo-28494850.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c3',name:'Home & Kitchen',nameEn:'Home & Kitchen',icon:'pan',tint:'#b8641c',img:'https://images.pexels.com/photos/8055165/pexels-photo-8055165.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c4',name:'Beauty & Care',nameEn:'Beauty & Care',icon:'drop',tint:'#b04a86',img:'https://images.pexels.com/photos/34939709/pexels-photo-34939709.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c5',name:'Plants & Garden',nameEn:'Plants & Garden',icon:'leaf',tint:'#2e7d4f',img:'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c6',name:'Toys & Baby',nameEn:'Toys & Baby',icon:'toy',tint:'#c98400',img:'https://images.pexels.com/photos/5889959/pexels-photo-5889959.jpeg?auto=compress&cs=tinysrgb&w=500'},
    {id:'c7',name:'Grocery',nameEn:'Grocery',icon:'basket',tint:'#5f7d1c',img:'https://images.pexels.com/photos/11032901/pexels-photo-11032901.jpeg?auto=compress&cs=tinysrgb&w=500'}
  ];
  // P(id,name,nameEn,cat,flags,desc,descEn,daysOld,options,priceFn)
  const P=(id,name,nameEn,cat,flags,desc,descEn,days,options,pf)=>{
    const vs=buildVariants(options).map((v,i)=>{const pr=pf(v.vals,i);return {...v,price:pr[0],old:pr[1]||0,cost:Math.round(pr[0]*(.58+rnd()*.12)/10)*10,stock:pr[2]!==undefined?pr[2]:Math.floor(rnd()*24)+(rnd()<.15?0:2),sku:'SCG-'+id.toUpperCase()+'-'+(i+1)}});
    return {id,name,nameEn,cat,desc,descEn,images:[],featured:flags.includes('f'),isNew:flags.includes('n'),combo:flags.includes('c'),createdAt:now-days*DAY,options,variants:vs};
  };
  const O=(name,values)=>({name,values});
  const products=[
    P('p1','Wireless Earbuds Pro','Wireless Earbuds Pro','c1','f','Active noise cancellation, 6 hours per charge and 24 hours total with the case. 6-month warranty.','Active noise cancellation, 6 hours per charge and 24 hours total with the case. 6-month warranty.',40,[O('Colour',['Black','White'])],()=>[1850,2400]),
    P('p2','Smart Watch Series 8','Smart Watch Series 8','c1','fn','Bluetooth calling, heart-rate and sleep tracking, 1.85-inch display.','Bluetooth calling, heart-rate and sleep tracking, 1.85-inch display.',5,[O('Colour',['Black','Silver','Pink'])],()=>[2650,3200]),
    P('p3','Fast-Charging Power Bank','Fast-Charging Power Bank','c1','n','22.5W fast charging with USB-C input and output.','22.5W fast charging with USB-C input and output.',3,[O('Capacity',['10000mAh','20000mAh'])],v=>v[0]==='10000mAh'?[1290,1490]:[1990,2290]),
    P('p4','USB Rechargeable Desk Fan','USB Rechargeable Desk Fan','c1','','3 speeds, runs 5 hours on a single charge.','3 speeds, runs 5 hours on a single charge.',60,[],()=>[590,0,0]),
    P('p5','Men\'s Polo Shirt','Men\'s Polo Shirt','c2','f','100% cotton piqué fabric with colourfast dye.','100% cotton piqué fabric with colourfast dye.',30,[O('Colour',['Navy','White','Maroon']),O('Size',['M','L','XL'])],()=>[690,850]),
    P('p6','Women\'s Cotton Kurti','Women\'s Cotton Kurti','c2','','Soft cotton with a hand-embroidered neckline.','Soft cotton with a hand-embroidered neckline.',25,[O('Size',['S','M','L','XL'])],()=>[1150,0]),
    P('p7','Casual Sneakers','Casual Sneakers','c2','n','Lightweight cushioned sole for everyday wear.','Lightweight cushioned sole for everyday wear.',6,[O('Size',['39','40','41','42','43'])],()=>[1890,2290]),
    P('p8','Non-Stick Frying Pan','Non-Stick Frying Pan','c3','f','5-layer non-stick coating, works on gas and induction.','5-layer non-stick coating, works on gas and induction.',45,[O('Size',['24 cm','26 cm','28 cm'])],(v,i)=>[[950,1100],[1090,1250],[1250,1450]][i]),
    P('p9','Insulated Steel Bottle','Insulated Steel Bottle','c3','','Double-wall insulation keeps drinks hot or cold for 12 hours.','Double-wall insulation keeps drinks hot or cold for 12 hours.',20,[O('Capacity',['750 ml','1 L']),O('Colour',['Black','Blue','Green'])],v=>v[0]==='750 ml'?[450,0]:[550,0]),
    P('p10','Vitamin C Face Serum','Vitamin C Face Serum','c4','n','Brightens skin and fades dark spots. Suitable for all skin types.','Brightens skin and fades dark spots. Suitable for all skin types.',4,[O('Volume',['30 ml','50 ml'])],(v,i)=>[[690,790],[990,1150]][i]),
    P('p11','Organic Hair Oil','Organic Hair Oil','c4','','A blend of coconut, amla and fenugreek. 200 ml.','A blend of coconut, amla and fenugreek. 200 ml.',50,[],()=>[380,450]),
    P('p12','Money Plant with Pot','Money Plant with Pot','c5','f','Thrives indoors even in low light. Care guide included.','Thrives indoors even in low light. Care guide included.',35,[O('Pot',['Plastic pot','Ceramic pot'])],(v,i)=>[[350,0],[650,750]][i]),
    P('p13','Snake Plant','Snake Plant','c5','','Purifies air and needs watering only once a week.','Purifies air and needs watering only once a week.',15,[O('Size',['Small','Medium','Large'])],(v,i)=>[[450,0],[750,0],[1250,1450]][i]),
    P('p14','Building Blocks Set','Building Blocks Set','c6','','For ages 3+, made from child-safe plastic.','For ages 3+, made from child-safe plastic.',28,[O('Pieces',['120 pcs','250 pcs'])],(v,i)=>[[790,950],[1390,1650]][i]),
    P('p15','Baby Diaper Pants','Baby Diaper Pants','c6','f','Keeps baby dry for 12 hours with a soft elastic waist.','Keeps baby dry for 12 hours with a soft elastic waist.',10,[O('Size',['M (42 pcs)','L (36 pcs)','XL (32 pcs)'])],(v,i)=>[[1150,1250],[1150,1250],[1190,1290]][i]),
    P('p16','Chinigura Aromatic Rice','Chinigura Aromatic Rice','c7','','Fragrant rice from Dinajpur, ideal for pulao and payesh.','Fragrant rice from Dinajpur, ideal for pulao and payesh.',22,[O('Weight',['1 kg','5 kg'])],(v,i)=>[[165,0],[790,825]][i]),
    P('p17','Pure Sundarbans Honey','Pure Sundarbans Honey','c7','fn','Raw comb honey with no added sugar or preservatives.','Raw comb honey with no added sugar or preservatives.',2,[O('Weight',['500 g','1 kg'])],(v,i)=>[[650,0],[1250,1300]][i]),
    P('p19','Portable Bluetooth Speaker','Portable Bluetooth Speaker','c1','fn','10W sound, IPX5 water resistant, 12 hours per charge.','10W sound, IPX5 water resistant, 12 hours per charge.',4,[O('Colour',['Black','Red','Blue'])],()=>[1490,1890]),
    P('p20','Water-Resistant Laptop Backpack','Water-Resistant Laptop Backpack','c2','','Fits a 15.6-inch laptop, built-in USB charging port, 30 L.','Fits a 15.6-inch laptop, built-in USB charging port, 30 L.',12,[O('Colour',['Black','Grey'])],()=>[1650,1990]),
    P('p21','Polarized Sunglasses','Polarized Sunglasses','c2','n','UV400 protection, lightweight frame, case and cloth included.','UV400 protection, lightweight frame, case and cloth included.',3,[O('Frame',['Black','Gold','Tortoise'])],()=>[850,1150]),
    P('p22','Electric Kettle 1.8 L','Electric Kettle 1.8 L','c3','f','1500W, boils in about 5 minutes, automatic shut-off.','1500W, boils in about 5 minutes, automatic shut-off.',18,[O('Body',['Stainless steel','Glass'])],(v,i)=>[[1250,1450],[1490,1690]][i]),
    P('p23','Bluetooth Neckband (ENC)','Bluetooth Neckband (ENC)','c1','n','Magnetic earbuds, ENC call noise reduction, 25 hours per charge.','Magnetic earbuds, ENC call noise reduction, 25 hours per charge.',6,[O('Colour',['Black','Blue','Red'])],()=>[690,990]),
    P('p34','HY300 Mini Smart Projector','HY300 Mini Smart Projector','c1','fn','Android, Wi-Fi and Bluetooth, up to 130-inch picture, auto keystone.','Android, Wi-Fi and Bluetooth, up to 130-inch picture, auto keystone.',3,[O('Model',['HY300','HY300 Pro'])],(v,i)=>[[4490,5500],[8490,9900]][i]),
    P('p41','Rechargeable Table Fan + LED Light','Rechargeable Table Fan + LED Light','c1','','Runs 6–8 hours during power cuts, 3 speeds, built-in night light.','Runs 6–8 hours during power cuts, 3 speeds, built-in night light.',30,[O('Size',['12 inch','14 inch'])],(v,i)=>[[2290,2790],[2890,3490]][i]),
    P('p24','K9 Dual Wireless Microphone','K9 Dual Wireless Microphone','c8','fn','Clear audio for TikTok, Reels and YouTube. Plug and play.','Clear audio for TikTok, Reels and YouTube. Plug and play.',2,[O('Port',['Type-C','Lightning'])],()=>[690,950]),
    P('p25','Ring Light + 7 ft Tripod','Ring Light + 7 ft Tripod','c8','f','3 colour modes, 10 brightness levels, phone holder and remote.','3 colour modes, 10 brightness levels, phone holder and remote.',9,[O('Size',['10 inch','12 inch','18 inch'])],(v,i)=>[[900,1150],[1150,1500],[3200,3900]][i]),
    P('p26','Selfie Stick Tripod (Bluetooth Remote)','Selfie Stick Tripod (Bluetooth Remote)','c8','','For vlogs, video calls and group selfies. Folds to pocket size.','For vlogs, video calls and group selfies. Folds to pocket size.',20,[],()=>[650,850]),
    P('p27','Adjustable Phone & Tablet Stand','Adjustable Phone & Tablet Stand','c8','','Aluminium, foldable, ideal for online classes and video calls.','Aluminium, foldable, ideal for online classes and video calls.',40,[O('Colour',['Silver','Black'])],()=>[350,450]),
    P('p28','Mini Room Heater','Mini Room Heater','c9','fn','Heats fast, overheat protection, low power use.','Heats fast, overheat protection, low power use.',1,[O('Model',['500W desk mini','2000W PTC (with remote)'])],(v,i)=>[[790,990],[2690,3200]][i]),
    P('p29','Electric Hot Water Bag','Electric Hot Water Bag','c9','f','Heats in 10–15 minutes, soothing for back and cramp pain.','Heats in 10–15 minutes, soothing for back and cramp pain.',4,[O('Cover',['Plain','Cartoon'])],()=>[390,550]),
    P('p30','Electric Lunch Box','Electric Lunch Box','c9','','Warms food at the office in 15 minutes. Steel inner bowls.','Warms food at the office in 15 minutes. Steel inner bowls.',14,[O('Layers',['1 layer','2 layers'])],(v,i)=>[[990,1290],[1450,1790]][i]),
    P('p31','V380 Wi-Fi IP Camera','V380 Wi-Fi IP Camera','c10','fn','360° rotation, night vision, two-way talk, live view on your phone.','360° rotation, night vision, two-way talk, live view on your phone.',5,[O('Model',['1080p single lens','Dual lens'])],(v,i)=>[[1450,1890],[2590,3200]][i]),
    P('p32','Smart Wi-Fi Plug','Smart Wi-Fi Plug','c10','','Switch heaters, geysers or lights from your phone, with timers.','Switch heaters, geysers or lights from your phone, with timers.',22,[],()=>[990,1290]),
    P('p33','RGB LED Strip Light (with Remote)','RGB LED Strip Light (with Remote)','c10','','16 colours, music sync, a room makeover in 10 minutes.','16 colours, music sync, a room makeover in 10 minutes.',16,[O('Length',['5 m','10 m'])],(v,i)=>[[850,1150],[1490,1850]][i]),
    P('p35','Car & Bike Phone Holder','Car & Bike Phone Holder','c11','f','Firm grip, 360° rotation, ideal for GPS on ride-share trips.','Firm grip, 360° rotation, ideal for GPS on ride-share trips.',11,[O('Type',['Air vent','Dashboard','Bike handle'])],()=>[450,650]),
    P('p36','Bluetooth FM Transmitter Car Charger','Bluetooth FM Transmitter Car Charger','c11','','Hands-free calls, music playback and two fast-charging ports.','Hands-free calls, music playback and two fast-charging ports.',26,[],()=>[950,1250]),
    P('p37','Portable Car Vacuum Cleaner','Portable Car Vacuum Cleaner','c11','','Cordless with strong suction, cleans seats and dashboards in minutes.','Cordless with strong suction, cleans seats and dashboards in minutes.',33,[],()=>[1150,1490]),
    P('p38','Hair & Beard Trimmer','Hair & Beard Trimmer','c12','f','Rechargeable, 4 comb sizes, salon-style cuts at home.','Rechargeable, 4 comb sizes, salon-style cuts at home.',8,[O('Model',['Basic','3-in-1 set'])],(v,i)=>[[790,1050],[1290,1590]][i]),
    P('p39','Massage Gun','Massage Gun','c12','n','4–6 heads for gym recovery and back-pain relief.','4–6 heads for gym recovery and back-pain relief.',7,[O('Size',['Mini','Full size'])],(v,i)=>[[1290,1650],[3490,4200]][i]),
    P('p40','Portable Rechargeable Juice Blender','Portable Rechargeable Juice Blender','c3','n','USB-C charging, fresh juice and smoothies anywhere.','USB-C charging, fresh juice and smoothies anywhere.',10,[O('Size',['380 ml','800 ml'])],(v,i)=>[[890,1150],[1350,1650]][i]),
    P('p42','15-in-1 Vegetable Chopper','15-in-1 Vegetable Chopper','c3','','Cut onions, vegetables and salad in seconds.','Cut onions, vegetables and salad in seconds.',19,[],()=>[690,990]),
    P('p46','Decorative Fairy Lights','Decorative Fairy Lights','c3','','Warm glow for home and event decoration.','Warm glow for home and event decoration.',27,[O('Length',['5 m','10 m'])],(v,i)=>[[290,450],[490,650]][i]),
    P('p43','Korean Sunscreen SPF50','Korean Sunscreen SPF50','c4','','Lightweight, no white cast, made for daily use.','Lightweight, no white cast, made for daily use.',15,[],()=>[1290,1500]),
    P('p44','Hair Straightener','Hair Straightener','c4','','Ceramic plates, heats fast and is gentler on hair.','Ceramic plates, heats fast and is gentler on hair.',24,[],()=>[890,1150]),
    P('p45','Women\'s Crossbody Bag','Women\'s Crossbody Bag','c2','n','PU leather, adjustable strap, room for phone and wallet.','PU leather, adjustable strap, room for phone and wallet.',9,[O('Colour',['Black','Brown','Cream'])],()=>[1290,1690]),
    P('p18','Kitchen Combo: Pan + Bottle','Kitchen Combo: Pan + Bottle','c3','c','A 26 cm pan and a 1 L bottle together, ৳250 less than buying separately.','A 26 cm pan and a 1 L bottle together, ৳250 less than buying separately.',1,[],()=>[1390,1640,14])
  ];
  // Realistic sample photos from Pexels (free to use: https://www.pexels.com/license/). Replace with your own product photos.
  const px=id=>`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`;
  const IMG={p1:[3973980,17810098,16872630,14401717],p2:[267394,5081922,8899536,1682821],p3:[19495448,37475677,3921705],p4:[3675622],
    p5:[28494850,10769408,27385944],p6:[20702676],p7:[10726876,12628400,9660927,18212364],p8:[8055165,8629104,5593697],p9:[7879974,3737799],
    p10:[34939709,30229017,8140898],p11:[14656188,33794923,17511746],p12:[1084199,5978608,4207783],p13:[8936387,2123482,9004904,8061943],
    p15:[5889959],p16:[8108170,1311771,7421198],p17:[11032901,4480158,17023410],p18:[12292644,6245,8055165],
    p19:[3779780,31683433,880874],p24:[722706],p25:[9413665,13929349,6954103],p31:[24347621,24346971,5589597],p32:[29292011],p33:[10482375],p35:[33488,4824425],p38:[12032916,18377451],p39:[11372618,11372617,6389069],p40:[7460165,6824660],p41:[5850342],p46:[52907,966861,1400141],p23:[15399398],p20:[3731256,18999333,1591244],p21:[1499477,6253849,16577200],p22:[15206538,33521165]};
  products.forEach(p=>{p.images=(IMG[p.id]||[]).map(px)});
  const staff=['Riya','Sakib','Mim','Naim'];
  const names=['Nusrat Jahan','Farzana Akter','Tania Sultana','Rumana Islam','Sabrina Haque','Mariam Begum','Ayesha Siddika','Ishrat Jahan','Rakibul Hasan','Mahmudul Haque','Tanvir Ahmed','Sumaiya Rahman','Jannatul Ferdous','Arif Hossain','Nadia Afrin','Shahriar Kabir','Mousumi Das','Sadia Islam','Fahim Muntasir','Kamrun Nahar','Imran Khan','Rezaul Karim'];
  const dhakaAreas=['Dhanmondi','Mirpur 10','Uttara Sector 7','Mohammadpur','Bashundhara R/A','Rampura','Banasree','Khilgaon'];
  const houses=['House 12, Road 5','House 34/A','Flat 4B, House 78','House 21, Lane 3','Holding 90'];
  const distPool=['Chattogram','Gazipur','Narayanganj','Sylhet','Rajshahi','Khulna','Cumilla','Bogura','Mymensingh','Rangpur','Jashore','Barishal'];
  const customers=[],orders=[];let inv=30101;
  const wpick=w=>{const tot=w.reduce((s,x)=>s+x[1],0);let r=rnd()*tot;for(const x of w){if((r-=x[1])<0)return x[0]}return w[0][0]};
  for(let i=0;i<84;i++){
    const ageH=Math.pow(rnd(),1.35)*720,created=now-ageH*HOUR;
    let cust;
    if(customers.length>8&&rnd()<.17)cust=pick(customers);
    else{const district=rnd()<.45?'Dhaka':(rnd()<.8?pick(distPool):pick(DISTRICTS));
      cust={name:pick(names),phone:'01'+pick(['3','7','8','9','5','6','4'])+String(Math.floor(rnd()*1e8)).padStart(8,'0'),district,address:district==='Dhaka'?`${pick(houses)}, ${pick(dhakaAreas)}`:`${pick(houses)}, ${district} Sadar`};
      customers.push(cust)}
    const items=[];const n=rnd()<.72?1:2;
    for(let k=0;k<n;k++){const p=pick(products);const v=pick(p.variants);if(items.find(x=>x.pid===p.id&&x.vkey===v.key))continue;items.push({pid:p.id,vkey:v.key,name:p.name,price:v.price,cost:v.cost,qty:rnd()<.85?1:2})}
    const sub=items.reduce((s,x)=>s+x.price*x.qty,0),delivery=sub>=3000?0:(cust.district==='Dhaka'?60:120);
    let st;
    if(ageH<6)st=rnd()<.75?'pending':'confirmed';
    else if(ageH<24)st=wpick([['pending',18],['confirmed',28],['hold',10],['ready',28],['cancelled',16]]);
    else if(ageH<72)st=wpick([['ready',12],['transit',50],['delivered',22],['cancelled',16]]);
    else st=wpick([['delivered',72],['cancelled',13],['returned',10],['transit',5]]);
    const hist=[{s:'pending',by:'Customer',at:created,note:''}];
    let t=created;const step=(s,a,b,note='')=>{t=Math.min(t+(a+rnd()*(b-a))*HOUR,now-5*6e4);hist.push({s,by:pick(staff),at:t,note})};
    const path={pending:[],confirmed:['confirmed'],hold:['hold'],ready:['confirmed','ready'],transit:['confirmed','ready','transit'],delivered:['confirmed','ready','transit','delivered'],returned:['confirmed','ready','transit','returned'],cancelled:[rnd()<.5?'confirmed':null,'cancelled'].filter(Boolean)}[st];
    const gaps={confirmed:[.3,4],hold:[.5,3],ready:[3,16],transit:[4,20],delivered:[20,60],returned:[30,80],cancelled:[.5,6]};
    let courier='',tracking='';
    for(const s of path){if(s==='ready'){courier=wpick([['steadfast',50],['pathao',30],['redx',20]]);tracking=COURIERS[courier].p+Math.floor(10000000+rnd()*89999999)}step(s,...gaps[s],s==='ready'?`Sent to ${COURIERS[courier].t}`:'')}
    const pm=wpick([['cod',78],['bkash',16],['nagad',6]]);
    const o={id:'o'+i,inv:'INV-'+(inv++),name:cust.name,phone:cust.phone,address:cust.address,district:cust.district,items,sub,delivery,discount:0,coupon:'',total:sub+delivery,status:st,courier,tracking,createdAt:created,history:hist,note:'',
      source:wpick([['Website',55],['Facebook',30],['Phone',10],['WhatsApp',5]]),
      payment:pm==='cod'?{method:'cod',status:st==='delivered'?'paid':'unpaid'}:{method:pm,status:ageH<10&&rnd()<.6?'pending':'paid',trx:'8N'+Math.floor(rnd()*1e8).toString(36).toUpperCase(),sender:'01'+Math.floor(700000000+rnd()*299999999)}};
    if(st==='cancelled'){o.cancelReason=wpick([[CANCEL_REASONS[0],34],[CANCEL_REASONS[1],22],[CANCEL_REASONS[2],12],[CANCEL_REASONS[3],18],[CANCEL_REASONS[4],14]]);hist[hist.length-1].note=o.cancelReason}
    if(st==='returned'){const type=wpick([['return',55],['replacement',25],['refund',20]]);o.ret={type,reason:pick(RETURN_REASONS),st:type==='replacement'?pick(['received','replaced']):type==='refund'?pick(['requested','refunded']):pick(['requested','received']),at:t};hist[hist.length-1].note=o.ret.reason}
    orders.push(o);
  }
  orders.sort((a,b)=>b.createdAt-a.createdAt);
  // reviews
  const rv=[['Great product, exactly like the photos. Delivery was quick too.',5],['Much better quality than the price suggests. Will buy again.',5],['Nice packaging and the product is as described.',4],['Good, but delivery was a day late.',4],['Great quality for the price, would recommend.',5],['Exactly as described. Fast delivery to Chattogram.',5],['Decent overall, the colour looks a little lighter.',3]];
  const reviews=[];let rid=1;
  products.forEach(p=>{const n=Math.floor(rnd()*5);for(let k=0;k<n;k++){const r=pick(rv);reviews.push({id:'r'+(rid++),pid:p.id,name:pick(names),rating:r[1],text:r[0],at:now-Math.floor(rnd()*40)*DAY-Math.floor(rnd()*20)*HOUR,approved:true,verified:rnd()<.7})}});
  reviews.push({id:'r'+(rid++),pid:'p2',name:'Tanvir Ahmed',rating:4,text:'Good battery backup. Bluetooth calls are clear.',at:now-3*HOUR,approved:false,verified:true});
  return {v:6,
    settings:{name:'Smart China Gallery',nameBn:'Smart China Gallery',logo:'',tagline:'Everything you need, in one place. Nationwide delivery with cash on delivery.',taglineEn:'Everything you need, in one place. Nationwide delivery with cash on delivery.',
      phone:'+880 1338-325365',whatsapp:'8801338325365',email:'',address:'New Paltan, Dhaka',addressEn:'New Paltan, Dhaka',facebook:'',
      inside:60,outside:120,freeShipMin:3000,brandColor:'#f85606',bkash:'',nagad:'',pixelId:'',ga4Id:'',
      announce:'Free delivery on orders over ৳3,000 · Cash on delivery nationwide',announceEn:'Free delivery on orders over ৳3,000 · Cash on delivery nationwide',
      flash:{on:true,title:'Flash Sale',titleEn:'Flash Sale',endsAt:now+30*HOUR,pids:['p28','p29','p31','p24','p38']},
      banners:[
        {title:'New gadgets, honest prices',titleEn:'New gadgets, honest prices',sub:'Up to 25% off earbuds, smart watches and power banks.',subEn:'Up to 25% off earbuds, smart watches and power banks.',cta:'Shop gadgets',ctaEn:'Shop gadgets',cat:'c1',tint:'#2b62a8'},
        {title:'Winter gadgets are here',titleEn:'Winter gadgets are here',sub:'Room heaters, hot water bags, kettles and lunch boxes at honest prices.',subEn:'Room heaters, hot water bags, kettles and lunch boxes at honest prices.',cta:'Shop winter',ctaEn:'Shop winter',cat:'c9',tint:'#d9480f'},
        {title:'Kitchen essentials',titleEn:'Kitchen essentials',sub:'Pans, bottles and combo deals in one place.',subEn:'Pans, bottles and combo deals in one place.',cta:'Shop kitchen',ctaEn:'Shop kitchen',cat:'c3',tint:'#b8641c'}],
      pages:{
        about:'Smart China Gallery is an online store for gadgets, fashion, home and kitchen, beauty, plants, toys and groceries. We deliver across Bangladesh and you can pay when the parcel arrives.\n\n(Sample text — edit it from the admin settings.)',
        privacy:'We use your name, phone number and address only to deliver your order. We never sell your information; only the details needed for delivery are shared with the courier.',
        terms:'Our team will call to confirm your order. If we cannot reach you, the order may be put on hold. Colours may look slightly different on different screens. Prices and stock may change at any time.',
        refund:'You can request a return or replacement within 3 days of delivery for damaged, wrong or wrongly sized items. Refunds are sent via bKash or Nagad within 3–5 working days. If you refuse a parcel at delivery, the delivery charge applies.'},
      pagesEn:{
        about:'Smart China Gallery is an online store for gadgets, fashion, home and kitchen, beauty, plants, toys and groceries. We deliver across Bangladesh and you can pay when the parcel arrives.\n\n(Sample text — edit it from the admin settings.)',
        privacy:'We use your name, phone number and address only to deliver your order. We never sell your information; only the details needed for delivery are shared with the courier.',
        terms:'Our team will call to confirm your order. If we cannot reach you, the order may be put on hold. Colours may look slightly different on different screens. Prices and stock may change at any time.',
        refund:'You can request a return or replacement within 3 days of delivery for damaged, wrong or wrongly sized items. Refunds are sent via bKash or Nagad within 3–5 working days. If you refuse a parcel at delivery, the delivery charge applies.'}},
    categories,products,orders,reviews,staff,me:0,nextInv:inv,messages:[{id:'m1',name:'Arif Hossain',phone:'01712000000',msg:'Will the smart watch connect to an iPhone?',at:now-3*HOUR,read:false}],subscribers:[],
    coupons:[{code:'WELCOME10',type:'percent',value:10,min:1000,active:true,used:7},{code:'SAVE200',type:'flat',value:200,min:2500,active:true,used:3},{code:'EID300',type:'flat',value:300,min:3000,active:false,used:12}],
    cart:[],wish:[],recent:[],user:null,prefs:{lang:'en',theme:'light'},enDefault:1,lastSeen:now-6*HOUR,incomplete:seedIncomplete(products,now)};
}
export function seedIncomplete(products,now){
  const R=mulberry32(9917),rnd=()=>R(),pick=a=>a[Math.floor(rnd()*a.length)];
  const nm=['Sabina Yasmin','Rashed Khan','Mitu Akter','Zubayer Hossain','Nazma Begum','Taslima Nasrin','Faisal Ahmed','Rubina Khatun','Sajib Hasan'];
  const st=['new','new','new','new','contacted','contacted','converted','converted','dropped'];
  return st.map((status,i)=>{const p=pick(products),v=pick(p.variants),qty=rnd()<.8?1:2;const hasAddr=rnd()<.6;const d=rnd()<.5?'Dhaka':pick(['Chattogram','Sylhet','Khulna','Rajshahi','Gazipur']);
    const at=now-(i*7+rnd()*6)*HOUR;
    return {id:'d'+i,name:rnd()<.85?nm[i]:'',phone:'01'+pick(['3','7','8','9','5','6'])+String(Math.floor(rnd()*1e8)).padStart(8,'0'),address:hasAddr?'House '+(10+i)+', Road '+(2+i):'',district:hasAddr?d:'',
      items:[{pid:p.id,vkey:v.key,name:p.name,price:v.price,cost:v.cost,qty}],sub:v.price*qty,at,updated:at+4*6e4,status,
      log:status==='new'?[]:[{t:status==='dropped'?'Dropped':status==='converted'?'Converted to order':'Called',by:'Riya',at:at+2*HOUR}],orderInv:status==='converted'?'INV-'+(30090-i):''}});
}


/* ---------------- reactive store ---------------- */
export let S=DB.load()||seed();
S.fraud=S.fraud||{};if(S.settings.fraudUrl==null)S.settings.fraudUrl='courier-check.php';
export const listeners=new Set();let ver=0;
export const subscribe=fn=>{listeners.add(fn);return ()=>listeners.delete(fn)};
export const emit=()=>{ver++;listeners.forEach(fn=>fn())};
export const useStore=()=>useSyncExternalStore(subscribe,()=>ver);
export let storageWarned=false;
export function save(){if(!DB.save(S)&&!storageWarned){storageWarned=true;toast('Data is not saving in this browser; changes will be lost on refresh')}emit()}
export function resetStore(){S=seed();S.fraud={};S.settings.fraudUrl='courier-check.php';save()}

/* ---------------- toasts ---------------- */
export const toasts={list:[],subs:new Set()};
export let tid=0;
export function toast(msg){const id=++tid;toasts.list=[...toasts.list,{id,msg}];toasts.subs.forEach(f=>f());setTimeout(()=>{toasts.list=toasts.list.filter(x=>x.id!==id);toasts.subs.forEach(f=>f())},2600)}

/* ---------------- modal (one at a time) ---------------- */
export const ui={modal:null,subs:new Set(),v:0};
export const uiEmit=()=>{ui.v++;ui.subs.forEach(f=>f())};
export function openModal(type,props={}){ui.modal={type,props};document.body.style.overflow='hidden';uiEmit()}
export function closeModal(){ui.modal=null;document.body.style.overflow='';uiEmit()}
export const useModal=()=>{useSyncExternalStore(f=>{ui.subs.add(f);return ()=>ui.subs.delete(f)},()=>ui.v);return ui.modal};
export function askConfirm(msg,onYes,yesText='Yes, continue'){openModal('confirm',{msg,onYes,yesText})}

/* ---------------- router (hash based, works on any host) ---------------- */
export const getRoute=()=>decodeURIComponent(location.hash.slice(1))||'home';
export function go(view){const h='#'+view;if(location.hash===h)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=view}

/* ---------------- shared helpers ---------------- */
export const prod=id=>S.products.find(p=>p.id===id);
export const catOf=id=>S.categories.find(c=>c.id===id)||{name:'Other',nameEn:'Other',icon:'tag',tint:'#667'};
export const catName=id=>catOf(id).name;
export const meName=()=>S.staff[S.me]||'Admin';

export function soldQty(pid){let n=0;for(const o of S.orders)if(!['cancelled','returned'].includes(o.status))for(const it of o.items)if(it.pid===pid)n+=it.qty;return n}

export const freeShip=sub=>+S.settings.freeShipMin>0&&sub>=+S.settings.freeShipMin;
export const deliveryFor=(d,sub=0)=>freeShip(sub)?0:(d==='Dhaka'?+S.settings.inside:+S.settings.outside);
export function couponCalc(code,sub){
  if(!code)return {d:0};
  const c=S.coupons.find(x=>x.code.toUpperCase()===code.trim().toUpperCase());
  if(!c||!c.active)return {d:0,err:'bad'};
  if(sub<c.min)return {d:0,err:'min',min:c.min};
  return {d:c.type==='percent'?Math.round(sub*c.value/100):Math.min(c.value,sub),c};
}
export const normPhone=p=>String(p).replace(/[\s-]/g,'').replace(/^\+?88/,'');
export const validPhone=p=>/^01[3-9]\d{8}$/.test(normPhone(p));

export const itemText=i=>i.name+(i.vkey?` (${i.vkey})`:'');
export function adjustStock(items,sign){for(const it of items){const p=prod(it.pid);const v=p&&variant(p,it.vkey);if(v)v.stock=Math.max(0,v.stock+sign*it.qty)}}
export const PAY={cod:'Cash on delivery',bkash:'bKash',nagad:'Nagad'};
export const PAY_ST={unpaid:{t:'Collect on delivery',c:''},pending:{t:'To verify',c:'warn'},paid:{t:'Paid',c:'good'},failed:{t:'Wrong TrxID',c:'bad'}};
export function createOrder({name,phone,address,district,items,coupon,note,source,by,status,payment}){
  const sub=items.reduce((s,x)=>s+x.price*x.qty,0),delivery=deliveryFor(district,sub),cc=couponCalc(coupon,sub),now=Date.now();
  items.forEach(it=>{if(it.cost===undefined){const v=prod(it.pid)&&variant(prod(it.pid),it.vkey);it.cost=v?v.cost||0:0}});
  const o={id:'o'+now+Math.floor(Math.random()*999),inv:'INV-'+(S.nextInv++),name,phone:normPhone(phone),address,district,items,sub,delivery,discount:cc.d||0,coupon:cc.c?cc.c.code:'',
    total:sub+delivery-(cc.d||0),status:'pending',courier:'',tracking:'',createdAt:now,history:[{s:'pending',by:by||'Customer',at:now,note:source&&source!=='Website'?source+' order':''}],note:note||'',source:source||'Website',
    payment:payment||{method:'cod',status:'unpaid'}};
  if(cc.c)cc.c.used=(cc.c.used||0)+1;
  adjustStock(items,-1);
  if(status&&status!=='pending'){o.status=status;o.history.push({s:status,by,at:now+1,note:''})}
  S.orders.unshift(o);save();return o;
}
export function setStatus(o,s,note=''){
  if(o.status===s)return;const prev=o.status;
  if(s==='cancelled'&&!['cancelled','returned'].includes(prev))adjustStock(o.items,1);
  if(prev==='cancelled'&&s!=='cancelled')adjustStock(o.items,-1);
  o.status=s;if(s==='cancelled')o.cancelReason=note||o.cancelReason||'';
  if(s==='delivered'&&o.payment&&o.payment.method==='cod')o.payment.status='paid';
  o.history.push({s,by:meName(),at:Date.now(),note});
}
export function sendToCourier(o,c){
  o.courier=c;o.tracking=COURIERS[c].p+Math.floor(10000000+Math.random()*89999999);
  if(['pending','confirmed','hold'].includes(o.status)){if(o.status!=='confirmed')o.history.push({s:'confirmed',by:meName(),at:Date.now(),note:''});o.status='ready';o.history.push({s:'ready',by:meName(),at:Date.now()+1,note:`Sent to ${COURIERS[c].t} (demo)`})}
}
export function reviewsOf(pid){return S.reviews.filter(r=>r.pid===pid&&r.approved)}
export function ratingOf(pid){const rs=reviewsOf(pid);return {n:rs.length,avg:rs.length?rs.reduce((s,r)=>s+r.rating,0)/rs.length:0}}

export const flashOn=()=>{const f=S.settings.flash;return f&&f.on&&f.endsAt>Date.now()&&f.pids.length>0};
export const inFlash=p=>flashOn()&&S.settings.flash.pids.includes(p.id);

export const I18N={
en:{home:'Home',allProducts:'All products',allCats:'All categories',track:'Track order',contact:'Contact',account:'Account',signIn:'Sign in',wishlist:'Wishlist',cart:'Cart',more:'More',shop:'Shop',hotline:'Hotline',adminPanel:'Admin',search:'Search',searchPh:'Search products, categories or brands…',seeAll:'See all',viewAllResults:'See all results for "{0}"',noMatch:'No matches',
 trust1:'Delivery to all 64 districts',trust1s:'1–2 days in Dhaka, 2–4 days outside',trust2:'Cash on delivery',trust2s:'Pay when it arrives',trust3:'Easy 3-day returns',trust3s:'Exchange if anything is wrong',trust4:'Genuine products',trust4s:'Quality-checked before dispatch',
 categories:'Categories',shopByCat:'Find what you need',products:'{0} products',featured:'Featured products',featuredS:'Hand-picked best sellers',newArr:'New arrivals',newArrS:'The latest additions to the store',deals:'Deals & combos',dealsS:'Save more with discounts and bundles',best:'Best sellers',bestS:'What customers keep coming back for',recent:'Recently viewed',
 endsIn:'Ends in',d:'days',h:'hrs',m:'min',s:'sec',flashS:'Limited-time prices — order before stock runs out',
 promoT:'Free delivery on orders over ৳{0}',promoS:'Anywhere in Bangladesh, no coupon needed',shopNow:'Shop now',
 tagNew:'New',tagCombo:'Combo',tagOut:'Sold out',tagFlash:'Flash',addCart:'Add to cart',wishEmpty:'Your wishlist is empty. Tap ♥ on products you like.',chooseOpt:'Choose options',quickView:'Quick view',addWish:'Add to wishlist',
 filters:'Filters',quickF:'Quick filters',fFeatured:'Featured',fStock:'In stock only',fNew:'New arrivals',fDeals:'Deals & combos',fFlash:'Flash sale',fRated:'Rated 4★ and up',price:'Price',allPrices:'Any price',under:'Under ৳{0}',over:'Over ৳{0}',min:'Min',max:'Max',applyRange:'Apply range',clearAll:'Clear all filters',
 sortNew:'Newest first',sortPop:'Best selling',sortLow:'Price: low to high',sortHigh:'Price: high to low',sortRate:'Top rated',resultsFor:'Results for "{0}"',nothing:'No products found. Try changing the filters.',
 notFound:'Product not found.',reviews:'{0} reviews',inStock:'In stock',onlyLeft:'Only {0} left',outOpt:'This option is out of stock',pickOpt:'Choose options to see price and stock',select:'Select',qty:'Quantity',buyNow:'Buy now',askWa:'Ask on WhatsApp',
 delTitle:'Delivery',delInfo:'Dhaka ৳{0} (1–2 days), outside ৳{1} (2–4 days)',delFree:'Free on orders ৳{0}+',retTitle:'Returns & payment',retInfo:'3-day returns. Cash on delivery, bKash, Nagad',share:'Share',copyLink:'Copy link',linkCopied:'Link copied',
 desc:'Description',reviewsTab:'Reviews ({0})',noReviews:'No reviews yet. Be the first to review this product.',basedOn:'Based on {0} reviews',writeReview:'Write a review',yourName:'Your name',yourRating:'Rating',yourReview:'Your review',submitReview:'Submit review',reviewThanks:'Thank you! Your review will appear after approval.',reviewErr:'Please add your name, a rating and a review',verified:'Verified buyer',related:'You may also like',sku:'SKU',
 addedCart:'Added to cart',pickAll:'Please choose all options first',outStock:'Sorry, this option is out of stock',maxStock:'Only {0} in stock',wishAdd:'Added to wishlist',wishRm:'Removed from wishlist',
 cartTitle:'Shopping cart ({0})',cartEmpty:'Your cart is empty',startShop:'Start shopping',remove:'Remove',subtotal:'Subtotal',delAtCheckout:'Delivery is calculated at checkout',checkout:'Checkout',viewCart:'View cart',
 shipLeft:'Add <b>{0}</b> more for free delivery!',shipFree:'You\'ve unlocked free delivery.',
 coTitle:'Checkout',coNote:'Fill in your details to place the order. Our team will call to confirm it.',shipInfo:'Delivery details',name:'Full name',phone:'Mobile number',address:'Full address',addressPh:'House, road, area, thana, district',district:'Delivery area',pickDistrict:'Select district',note:'Delivery note (optional)',notePh:'e.g. deliver after 6 pm',
 payment:'Payment method',cod:'Cash on delivery',codS:'Pay on arrival',bkashS:'Pay in advance',payInstr:'Send money <b>{2}</b> to our {0} personal number <b>{1}</b>, then enter the sending number and transaction ID below.',sender:'Number you paid from',trx:'Transaction ID (TrxID)',
 coupon:'Coupon code',apply:'Apply',couponOk:'Coupon applied, {0} off',couponBad:'This coupon is invalid or has expired',couponMin:'This coupon needs an order of {0} or more',summary:'Order summary',delivery:'Delivery',inside:'Inside Dhaka',outside:'Outside Dhaka',free:'Free',discount:'Coupon discount',total:'Total',placeOrder:'Place order',secure:'Your details are safe and used only for delivery.',
 eName:'Please enter your name',ePhone:'Enter a valid 11-digit mobile number (01XXXXXXXXX)',eAddr:'Please enter your full address',eDist:'Please choose inside or outside Dhaka',eTrx:'Enter the payment number and TrxID',eStock:'Only {1} of "{0}" left — please update your cart',cartEmptyT:'Your cart is empty',
 thanksT:'Thank you, {0}! Your order is placed',thanksS:'Order number {0}. Our team will call shortly to confirm.',payCodNote:'Please pay {0} on delivery.',payPendNote:'We are verifying your {0} payment (TrxID: {1}).',trackOrder:'Track order',continueShop:'Continue shopping',seeInAdmin:'View in admin',whatNext:'What happens next',next1:'We call you to confirm the order',next2:'Your parcel is handed to the courier within 24 hours',next3:'Track it anytime with your tracking ID',
 trackT:'Track your order',trackS:'Enter your invoice number (e.g. INV-30150) or the mobile number you ordered with.',trackPh:'INV-30150 or 01XXXXXXXXX',trackNone:'No orders found for this number.',cancelledMsg:'This order was cancelled. Call our hotline if you have questions.',courier:'Courier',trackingId:'Tracking ID',
 j0:'Placed',j1:'Confirmed',j2:'With courier',j3:'On the way',j4:'Delivered',
 st_pending:'Pending',st_confirmed:'Confirmed',st_hold:'On hold',st_ready:'Ready to ship',st_transit:'In transit',st_delivered:'Delivered',st_cancelled:'Cancelled',st_returned:'Returned',st_partial:'Partial return',
 signInT:'Sign in',signInS:'Sign in with your mobile number to see all your orders and check out faster.',signInBtn:'Sign in',signInDemo:'No OTP in the demo. SMS OTP will be added on the live site.',signInErr:'Enter your name and a valid 11-digit mobile number',signedIn:'Signed in',signOut:'Sign out',myOrders:'My orders ({0})',noOrders:'No orders yet.',
 contactT:'Contact us',whatsapp:'WhatsApp',email:'Email',addressL:'Address',hours:'Hours',hoursV:'Every day, 10 am – 10 pm',sendMsg:'Send a message',message:'Message',send:'Send',msgErr:'Please enter your name and message',msgOk:'Message sent. We\'ll get back to you soon.',
 about:'About us',privacy:'Privacy policy',terms:'Terms & conditions',refund:'Refund & return policy',quickLinks:'Quick links',service:'Customer care',policies:'Policies',newsletter:'Newsletter',newsS:'Get new arrivals and offers — enter your mobile number.',subscribe:'Subscribe',subOk:'Thanks! We\'ll send you our offers.',rights:'All rights reserved.',weAccept:'We accept',
 theme:'Theme',themeAuto:'Auto',themeLight:'Light',themeDark:'Dark',orderWa:'Order on WhatsApp',copyFail:'Could not copy'}};
export const lang=()=>'en';
export const t=(k,...a)=>{let s=I18N.en[k]??k;a.forEach((v,i)=>{s=s.split('{'+i+'}').join(v)});return s};
export const pn=p=>p.name;
export const pdsc=p=>p.desc;
export const cn=id=>catOf(id).name;
export const sn=()=>S.settings.name;
export const L=(o,k)=>o[k];
export const DIST_EN={};
/* Checkout asks only for a full address plus the delivery area (sets the charge). */
export const AREAS=['Dhaka','Outside Dhaka'];
export const dn=d=>d;
export const stT=s=>t('st_'+s);

export function loadTrackers(){
  const s=S.settings;
  if(/^\d{6,20}$/.test(s.pixelId||'')&&!window.fbq){
    !function(f,b,e,v,n,tt,ss){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];tt=b.createElement(e);tt.async=!0;tt.src=v;ss=b.getElementsByTagName(e)[0];ss.parentNode.insertBefore(tt,ss)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',s.pixelId);fbq('track','PageView');
  }
  if(/^G-[A-Z0-9]{4,20}$/.test(s.ga4Id||'')&&!window.gtag){
    const sc=document.createElement('script');sc.async=true;sc.src='https://www.googletagmanager.com/gtag/js?id='+s.ga4Id;document.head.appendChild(sc);
    window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',s.ga4Id);
  }
}
export function track(ev,d={}){
  try{
    if(window.fbq)fbq('track',ev,{currency:'BDT',value:d.value||0,content_ids:d.ids||[],content_type:'product',num_items:d.n||undefined});
    const map={ViewContent:'view_item',AddToCart:'add_to_cart',InitiateCheckout:'begin_checkout',Purchase:'purchase',Search:'search'};
    if(window.gtag)gtag('event',map[ev]||ev,{currency:'BDT',value:d.value||0,transaction_id:d.tid,search_term:d.q,items:(d.ids||[]).map(id=>({item_id:id}))});
  }catch(e){}
}
/* ---- SEO ---- */
export function setSEO(title,desc,ld){
  document.title=title;
  let m=document.querySelector('meta[name="description"]');if(m)m.setAttribute('content',desc||'');
  let s=document.getElementById('ldjson');if(s)s.remove();
  if(ld){s=document.createElement('script');s.type='application/ld+json';s.id='ldjson';s.textContent=JSON.stringify(ld);document.head.appendChild(s)}
  document.documentElement.lang=lang();
}
export function applyTheme(){
  const r=document.documentElement,th=S.prefs.theme;
  if(th==='light'||th==='dark')r.setAttribute('data-theme',th);else r.removeAttribute('data-theme');
  if(/^#[0-9a-fA-F]{6}$/.test(S.settings.brandColor||''))r.style.setProperty('--brand-base',S.settings.brandColor);
}

/* ---------------- cart ---------------- */
export const cartCount=()=>S.cart.reduce((s,x)=>s+x.qty,0);
export const cartItems=()=>S.cart.map(c=>{const p=prod(c.pid);return {...c,p,v:p&&variant(p,c.vkey)}}).filter(x=>x.p&&x.v);
export const cartSub=()=>cartItems().reduce((s,x)=>s+x.v.price*x.qty,0);
export function addToCart(pid,vkey,qty=1,silent=false){
  const p=prod(pid);if(!p)return false;const v=variant(p,vkey);
  if(!v){toast(t('pickAll'));return false}
  if(v.stock<=0){toast(t('outStock'));return false}
  const it=S.cart.find(x=>x.pid===pid&&x.vkey===vkey);const cur=it?it.qty:0;
  if(cur+qty>v.stock){toast(t('maxStock',v.stock));return false}
  if(it)it.qty+=qty;else S.cart.push({pid,vkey,qty});
  save();track('AddToCart',{value:v.price*qty,ids:[pid]});
  if(!silent)openModal('cart');
  return true;
}
export function toggleWish(id){const i=S.wish.indexOf(id);if(i>=0){S.wish.splice(i,1);toast(t('wishRm'))}else{S.wish.push(id);toast(t('wishAdd'))}save()}
export function pushRecent(id){S.recent=[id,...S.recent.filter(x=>x!==id)].slice(0,10);DB.save(S)}
export const PAGE_TITLES={about:'About us',privacy:'Privacy policy',terms:'Terms & conditions',refund:'Refund & return policy'};
