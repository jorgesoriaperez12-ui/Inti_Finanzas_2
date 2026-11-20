
const CAT={C:'Comida',V:'Gasto Vehicular',H:'Hogar y compras',E:'Educación',R:'Refrigerios',O:'Otros gastos',S:'Salud',A:'Vivienda y alquiler',W:'Servicios (luz, agua, internet)',T:'Entretenimiento',P:'Ropa y calzado',I:'Sueldo'};
const $=i=>document.getElementById(i),esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fm=n=>Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],DIA=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const PAL=['#e4e4e7','#bcbcc4','#a1a1aa','#85858e','#71717a','#5a5a63','#46464d','#34343a'],GRN=['#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46'];
let ALL=[],ROWS=[],PREV=[],FR=[],PK='',SEL='all',Q='',N=14,CH={},SORT={k:'d',v:-1},S={budget:0,goal:20,form:'',neg:'',reg:'NRUS',dig:'0',uit:5500,igvinc:1,coef:0,amaz:0,amIgv:1,amRen:10,meta:0};

if(typeof Chart!=='undefined'){Chart.defaults.font.family="'JetBrains Mono',monospace";Chart.defaults.font.size=10;Chart.defaults.color='#71717a';Chart.defaults.borderColor='#1f1f23'}
const TT={backgroundColor:'#000',borderColor:'#2e2e33',borderWidth:1,padding:10};
const mk=(id,c)=>{if(CH[id])CH[id].destroy();if(typeof Chart==='undefined'||!$(id))return;c.options=Object.assign({responsive:true,maintainAspectRatio:false,animation:{duration:500}},c.options);CH[id]=new Chart($(id),c)};
const key=d=>String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
const sum=(a,t)=>a.reduce((s,x)=>x.t===t?s+x.m:s,0);
const grp=(a,t,f)=>{const o={};a.forEach(x=>{if(x.t===t){const k=f(x);o[k]=(o[k]||0)+x.m}});return o};
const sorted=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]);
const p2=n=>String(n).padStart(2,'0'),dkey=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()),dsh=d=>p2(d.getDate())+'/'+p2(d.getMonth()+1);
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),2800)}
function dias(a){const m=new Map();[...a].sort((x,y)=>x.d-y.d).forEach(x=>{const k=dkey(x.d);if(!m.has(k))m.set(k,{d:x.d,g:0,i:0});m.get(k)[x.t==='Gasto'?'g':'i']+=x.m});return[...m.values()]}
const num=v=>{if(v===undefined||v===null||v==='')return null;let s=String(v).replace(/S\/\.?\s*/gi,'').trim();if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=/,\d{3}(?:,|$)/.test(s)&&s.split(',').length>2?s.replace(/,/g,''):s.replace(',','.');const n=parseFloat(s);return isNaN(n)?null:n};
function parseFecha(v){if(v instanceof Date)return v;const s=String(v==null?'':v).trim();if(!s)return new Date(NaN);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return new Date(+m[1],+m[2]-1,+m[3],12,0,0);m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);if(m)return new Date(+m[3],+m[2]-1,+m[1],m[4]?+m[4]:12,m[5]?+m[5]:0,m[6]?+m[6]:0);return new Date(s)}
const bool=v=>/^(1|true|si|sí|s|x|yes|verdadero)$/i.test(String(v==null?'':v).trim());
const tcode=v=>{const q=String(v==null?'':v).trim().toLowerCase();if(!q)return'';if(/^0?1$|factura/.test(q))return'01';if(/^0?3$|boleta/.test(q))return'03';if(/^0?2$|rxh|honorarios/.test(q))return'02';if(/^0?4$|liq/.test(q))return'04';return q};
// Cada fila acepta los encabezados nuevos (snake_case) y los de tu hoja actual
function normRow(o){
 const g=a=>{for(const k of a){if(o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k]}return undefined};
 const t0=String(g(['tipo_movimiento','Tipo'])||'').trim(),t=/^(ingreso|venta)/i.test(t0)?'Ingreso':/^(gasto|compra|egreso)/i.test(t0)?'Gasto':'';
 const tot=num(g(['importe_total','Monto (S/)','Monto']))||0,otros=num(g(['otros_tributos']))||0,tc=tcode(g(['tipo_comprobante']));
 let base=num(g(['base_imponible'])),igv=num(g(['igv_monto']));
 if(base==null&&igv!=null)base=Math.max(0,tot-otros-igv);
 else if(base!=null&&igv==null)igv=Math.max(0,tot-otros-base);
 else if(base==null&&igv==null){if(tc==='01'||tc==='04'){base=(tot-otros)/1.18;igv=tot-otros-base}else if(tc==='02'){base=tot-otros;igv=0}}
 const sd=bool(g(['sujeto_a_detraccion'])),td=num(g(['tasa_detraccion']));let md=num(g(['monto_detraccion'])),mn=num(g(['monto_neto_pagar']));
 if(md==null&&sd&&td)md=Math.round(tot*td)/100;
 if(mn==null)mn=md?tot-md:tot;
 return{id:o.id,d:parseFecha(g(['fecha_emision','Fecha y hora','Fecha'])),t,c:String(g(['descripcion','Descripción o concepto','Concepto'])||'').trim(),k:g(['categoria','Categoría (tipo de gasto)','Categoría'])||'Otros',
  m:mn,tot,otros,tc,se:g(['serie']),nu:g(['numero']),rs:String(g(['razon_social'])||''),di:g(['tipo_doc_identidad']),nd:g(['numero_doc_identidad']),pc:g(['categoria_pcge']),base,igv,md:md||0,sd,td:td||0,items:Array.isArray(o.items)?o.items:null}}
// x.m = monto_neto_pagar (flujo de caja: Resumen y Deudas) · x.tot = importe_total (base de impuestos)
const norm=a=>a.map(normRow).filter(x=>!isNaN(x.d)&&x.d.getFullYear()>2000&&x.tot>0&&x.t).sort((a,b)=>b.d-a.d);
const demo=()=>{let z=11;const r=()=>(z=(z*9301+49297)%233280)/233280,o=[],h=new Date();h.setHours(12,0,0,0);
 const P=[['Menú del día',12,'Venta de productos',.9,6],['Pollo a la brasa',34,'Venta de productos',.5,4],['Ceviche',28,'Venta de productos',.45,3],['Gaseosa',4,'Venta de productos',.8,8],['Postre',8,'Venta de productos',.4,4],['Delivery',5,'Prestación de servicios',.5,5]];
 const iso=d=>d.toISOString(),r2=v=>Math.round(v*100)/100,CV={razon_social:'CLIENTES VARIOS',tipo_doc_identidad:'DNI',numero_doc_identidad:'00000000',tipo_comprobante:'03'};
 const gs=(d,c,k,t,rs,ruc,tc)=>{const b=tc==='01'?r2(t/1.18):null;o.push({fecha_emision:iso(d),tipo_movimiento:'Gasto',descripcion:c,categoria:k,importe_total:t,tipo_comprobante:tc,razon_social:rs,tipo_doc_identidad:ruc?'RUC':'',numero_doc_identidad:ruc,base_imponible:b,igv_monto:b==null?null:r2(t-b)})};
 for(let i=78;i>=0;i--){const d=new Date(h);d.setDate(h.getDate()-i);const wd=d.getDay(),dn=d.getDate(),f=(wd===0||wd===6)?1.3:1,vd=[];
  P.forEach(p=>{if(r()<p[3]*Math.min(1,f)){const q=1+Math.floor(r()*p[4]*f*1.2);vd.push({c:q>1?q+' x '+p[0]:p[0],k:p[2],m:q*p[1]})}});
  const tot=vd.reduce((a,x)=>a+x.m,0);
  if(i<10){if(tot>0)o.push(Object.assign({fecha_emision:iso(d),tipo_movimiento:'Ingreso',descripcion:'Boleta consolidada del día',categoria:'Venta de productos',importe_total:r2(tot),serie:'B001'},CV))}
  else vd.forEach(x=>o.push(Object.assign({fecha_emision:iso(d),tipo_movimiento:'Ingreso',descripcion:x.c,categoria:x.k,importe_total:x.m},CV)));
  if(i%12===3){const t=850,b=r2(t/1.18),dt=r2(t*.12);o.push({fecha_emision:iso(d),tipo_movimiento:'Ingreso',descripcion:'Catering para empresa',categoria:'Prestación de servicios',importe_total:t,tipo_comprobante:'01',serie:'F001',razon_social:'EVENTOS ANDINOS SAC',tipo_doc_identidad:'RUC',numero_doc_identidad:'20601112223',base_imponible:b,igv_monto:r2(t-b),sujeto_a_detraccion:'SI',tasa_detraccion:12,monto_detraccion:dt,monto_neto_pagar:r2(t-dt)})}
  if(i%2===0)gs(d,'Compra de insumos','Mercadería e insumos',Math.round(60+r()*100),'DISTRIBUIDORA SELVA SAC','20601234567',i%4===0?'01':'03');
  if(dn===1)gs(d,'Pago de alquiler del local','Alquiler del local',600,'','','');
  if(dn===5)gs(d,'Sueldos del personal','Sueldos y personal',1200,'','','');
  if(dn===10)gs(d,'Luz, agua e internet','Servicios (luz, agua, internet)',210,'EMPRESA DE SERVICIOS SAC','20512345678','01');
  if(dn===12)gs(d,'Publicidad en redes','Publicidad y marketing',100,'AGENCIA DIGITAL EIRL','20498765432','01');
  if(dn===20)gs(d,'Honorarios del contador','Otros gastos',150,'CONTADOR PEREZ JUAN','10456789012','02');
  if(wd===1)gs(d,'Gas y transporte','Transporte y delivery',Math.round(30+r()*40),'','','03')}
 return o};

async function cargar(){if(USER)await cargarTodo()}
function periodos(){const s=$('per'),seen=new Map();ALL.forEach(x=>{const k=key(x.d);if(!seen.has(k))seen.set(k,MES[x.d.getMonth()]+' '+x.d.getFullYear())});
 s.innerHTML='<option value="all">Todo el periodo</option>'+[...seen].map(([k,l])=>`<option value="${k}">${l}</option>`).join('');s.value=seen.has(SEL)?SEL:'all';SEL=s.value}
let PL='';
function pintar(){$('empty').hidden=ALL.length>0;
 ROWS=SEL==='all'?ALL:ALL.filter(x=>key(x.d)===SEL);PREV=[];PK='';
 if(SEL!=='all'){const[m,y]=SEL.split('/').map(Number),pd=new Date(y,m-2,1),k=key(pd);PREV=ALL.filter(x=>key(x.d)===k);if(PREV.length){PK=k;PL=MES[pd.getMonth()]+' '+pd.getFullYear()}}
 resumen();resumen2();ventas();analisis();impuestos();movs();deudas();alertas();marca();
}
function dl(c,p,badUp){if(!PK||!p)return'';const v=(c-p)/p*100,up=v>=0,bad=badUp?up:!up;return`<span class="${bad?'r-t':'g-t'}">${up?'▲':'▼'} ${Math.abs(v).toFixed(0)}%</span> <span class="lb">vs ${PL}</span>`}
function resumen(){
 const G=sum(ROWS,'Gasto'),I=sum(ROWS,'Ingreso'),B=I-G,ah=I?B/I*100:0,pG=sum(PREV,'Gasto'),pI=sum(PREV,'Ingreso');
 const kp=(l,v,c,s)=>`<div class="pn"><div class="lb">${l}</div><div class="big ${c}">${v}</div><div class="sub">${s}</div></div>`;
 $('kp').innerHTML=kp('Ventas','S/ '+fm(I),'gy',dl(I,pI,0)+(S.meta>0&&SEL!=='all'?' <span class="lb">· '+(I/S.meta*100).toFixed(0)+'% de la meta</span>':''))+kp('Gastos','S/ '+fm(G),'gy',dl(G,pG,1))+kp('Ganancia neta','S/ '+fm(B),B>=0?'g-t':'r-t',B>=0?'Ventas − gastos':'Pérdida del periodo')+kp('Margen de ganancia',ah.toFixed(0)+'%',ah>=S.goal?'g-t':'r-t','Meta '+S.goal+'%');
 const hd=ALL.filter(x=>dkey(x.d)===dkey(new Date())),hv=sum(hd,'Ingreso'),hg=sum(hd,'Gasto'),hn=hd.filter(x=>x.t==='Ingreso').length,px=proximos()[0],cd=cierreDia();
 $('hoy').innerHTML=kp('Ventas de hoy','S/ '+fm(hv),'gy',hn+(hn===1?' venta':' ventas'))+kp('Gastos de hoy','S/ '+fm(hg),'gy',(hd.length-hn)+' gastos')+kp('Ganancia del día (cierre de caja)','S/ '+fm(cd.g),cd.g>=0?'g-t':'r-t',cd.txt)+kp('Próximo pago',px?dsh(px.due):'—',px&&px.dias<0?'r-t':px&&px.dias<=5?'y-t':'gy',px?esc(px.d.n)+' · '+(px.dias<0?'venció hace '+(-px.dias)+' d':px.dias===0?'hoy':'en '+px.dias+' d'):'Sin pagos pendientes');
 const dd=dias(ROWS),v=N?dd.slice(-N):dd;
 mk('cEvo',{type:'line',data:{labels:v.map(x=>dsh(x.d)),datasets:[{label:'Gastos',data:v.map(x=>x.g),borderColor:'#d4d4d8',backgroundColor:'rgba(212,212,216,.15)',fill:true,tension:.35,borderWidth:2,pointRadius:2},{label:'Ventas',data:v.map(x=>x.i),borderColor:'#71717a',borderDash:[4,4],tension:.35,borderWidth:1.5,pointRadius:0}]},options:{interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:TT},scales:{y:{beginAtZero:true,ticks:{maxTicksLimit:4}},x:{grid:{display:false},ticks:{maxTicksLimit:7}}}}});
 let cs=sorted(grp(ROWS,'Gasto',x=>x.k));if(cs.length>7){const r=cs.slice(7).reduce((s,e)=>s+e[1],0);cs=cs.slice(0,7).concat([['Otros',r]])}
 mk('cDon',{type:'doughnut',data:{labels:cs.map(e=>e[0]),datasets:[{data:cs.map(e=>e[1]),backgroundColor:cs.map((e,i)=>PAL[i]),borderColor:'#0a0a0a',borderWidth:2}]},options:{cutout:'78%',plugins:{legend:{display:false},tooltip:Object.assign({},TT,{callbacks:{label:c=>' S/ '+fm(c.parsed)}})}}});
 $('leg').innerHTML=cs.map((e,i)=>`<div class="lg"><span><i style="background:${PAL[i]}"></i>${esc(e[0])}</span><b>${G?(e[1]/G*100).toFixed(0):0}%</b></div>`).join('')||'<div class="vac">// sin gastos</div>';
 let nd=1;if(ROWS.length){const t=ROWS.map(x=>+x.d);nd=Math.max(1,Math.round((Math.max(...t)-Math.min(...t))/864e5)+1)}
 let pr='Elige un mes';const[mm,yy]=SEL==='all'?[0,0]:SEL.split('/').map(Number);
 if(mm){const dm=new Date(yy,mm,0).getDate(),h=new Date(),act=h.getFullYear()===yy&&h.getMonth()+1===mm;nd=act?h.getDate():dm;pr='S/ '+fm(act?I/nd*dm:I)}
 const mx=ROWS.filter(x=>x.t==='Gasto').sort((a,b)=>b.m-a.m)[0],bp=S.budget>0&&mm?G/S.budget*100:null;
 const mi=(l,v,c,x)=>`<div class="pn mi"><div class="lb">${l}</div><div class="${c}">${v}</div>${x||''}</div>`;
 const nv=ROWS.filter(x=>x.t==='Ingreso').length,ti=impuestoMes(...refMes());
 $('mini').innerHTML=mi('Ticket promedio','S/ '+fm(nv?I/nv:0),'gy',`<div class="lb" style="margin-top:6px">${nv} ventas</div>`)+mi('Proyección de ventas',pr,'gy')
  +mi('Presupuesto de gastos',bp==null?(S.budget>0?'Elige un mes':'Defínelo en Ajustes'):bp.toFixed(0)+'% usado',bp>=100?'r-t':bp>=80?'y-t':'g-t',bp==null?'':`<div class="bar"><i style="width:${Math.min(bp,100)}%;background:${bp>=100?'#ff4d4d':bp>=80?'#ffc14d':'#10b981'}"></i></div>`)
  +mi('Impuesto estimado',S.reg==='NONE'?'—':'S/ '+fm(ti.total),'gy',`<div class="lb" style="margin-top:6px">${S.reg==='NONE'?'Elige tu régimen en Ajustes':S.reg+' · vence '+dsh(vencSunat(...refMes()).f)}</div>`);
 $('top').innerHTML=sorted(grp(ROWS,'Gasto',x=>x.k)).slice(0,6).map(e=>{const p=G?e[1]/G*100:0;return`<div class="tr"><div class="rw"><span class="tx">${esc(e[0])}</span><span class="r-t">S/ ${fm(e[1])} · ${p.toFixed(0)}%</span></div><div class="bar"><i style="width:${p}%;background:#ff4d4d"></i></div></div>`}).join('')||'<div class="vac">// sin gastos</div>';
 $('rec').innerHTML=ROWS.slice(0,8).map(x=>{const i=x.t==='Ingreso';return`<div class="rw rx"><div><div class="tx">${esc(x.c||x.k)}</div><div class="lb">${dsh(x.d)} · ${esc(x.k)}</div></div><span class="${i?'g-t':'r-t'}">${i?'+':'−'} ${fm(x.m)}</span></div>`}).join('')||'<div class="vac">// sin movimientos</div>';
}
function analisis(){
 const mo={};
 if(MENS.length)MENS.forEach(r=>{mo[r.anio*100+r.mes-1]={i:+r.ventas,g:+r.gastos,l:MES[r.mes-1]+' '+String(r.anio).slice(2)}});
 else ALL.forEach(x=>{const k=x.d.getFullYear()*100+x.d.getMonth();(mo[k]=mo[k]||{i:0,g:0,l:MES[x.d.getMonth()]+' '+String(x.d.getFullYear()).slice(2)})[x.t==='Gasto'?'g':'i']+=x.m});
 const mv=Object.keys(mo).sort().map(k=>mo[k]);
 mk('cMes',{type:'bar',data:{labels:mv.map(x=>x.l),datasets:[{type:'bar',label:'Ventas',data:mv.map(x=>x.i),backgroundColor:'#a1a1aa'},{type:'bar',label:'Gastos',data:mv.map(x=>x.g),backgroundColor:'#52525b'},{type:'line',label:'Balance',data:mv.map(x=>x.i-x.g),borderColor:'#e4e4e7',borderWidth:1.5,pointRadius:3,tension:.3}]},options:{plugins:{legend:{labels:{boxWidth:8}},tooltip:TT},scales:{x:{grid:{display:false}}}}});
 let ac=0;const dv=dias(ROWS),cum=dv.map(x=>ac+=x.i-x.g);
 mk('cFlu',{type:'line',data:{labels:dv.map(x=>dsh(x.d)),datasets:[{label:'Balance acumulado',data:cum,borderColor:'#d4d4d8',segment:{borderColor:c=>c.p1.parsed.y<0?'#71717a':'#d4d4d8'},fill:{target:'origin',above:'rgba(212,212,216,.10)',below:'rgba(113,113,122,.16)'},tension:.3,borderWidth:2,pointRadius:0}]},options:{interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:TT},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}}}}});
 const wd=[0,0,0,0,0,0,0];ROWS.forEach(x=>{if(x.t==='Gasto')wd[x.d.getDay()]+=x.m});const ord=[1,2,3,4,5,6,0],wv=ord.map(i=>wd[i]),wm=Math.max(...wv);
 mk('cSem',{type:'bar',data:{labels:ord.map(i=>DIA[i]),datasets:[{data:wv,backgroundColor:wv.map(v=>v===wm&&wm>0?'#d4d4d8':'rgba(212,212,216,.35)')}]},options:{plugins:{legend:{display:false},tooltip:TT},scales:{x:{grid:{display:false}}}}});
 const ca=grp(ROWS,'Gasto',x=>x.k),cp=grp(PREV,'Gasto',x=>x.k),cl=sorted(ca).slice(0,7).map(e=>e[0]);
 $('tCmp').textContent=PK?'Categorías · actual vs '+PL:'Categorías · elige un mes para comparar';
 mk('cCmp',{type:'bar',data:{labels:cl,datasets:[{label:'Actual',data:cl.map(k=>ca[k]),backgroundColor:'#d4d4d8'}].concat(PK?[{label:PL,data:cl.map(k=>cp[k]||0),backgroundColor:'#52525b'}]:[])},options:{indexAxis:'y',plugins:{legend:{display:!!PK,labels:{boxWidth:8}},tooltip:TT},scales:{y:{grid:{display:false}}}}});
 const iv=sorted(grp(ROWS,'Ingreso',x=>x.k));
 mk('cIng',{type:'doughnut',data:{labels:iv.map(e=>e[0]),datasets:[{data:iv.map(e=>e[1]),backgroundColor:iv.map((e,i)=>GRN[i%5]),borderColor:'#0a0a0a',borderWidth:2}]},options:{cutout:'72%',plugins:{legend:{position:'bottom',labels:{boxWidth:8}},tooltip:TT}}});
 $('big').innerHTML=ROWS.filter(x=>x.t==='Gasto').sort((a,b)=>b.m-a.m).slice(0,5).map(x=>`<div class="rw rx"><div><div class="tx" style="max-width:none">${esc(x.c||x.k)}</div><div class="lb">${dsh(x.d)} · ${esc(x.k)}</div></div><span class="r-t">− ${fm(x.m)}</span></div>`).join('')||'<div class="vac">// sin gastos</div>';
}
function movs(){
 const t=$('ft').value,cur=$('fc').value,q=Q.toLowerCase();
 $('fc').innerHTML='<option value="">Todas las categorías</option>'+[...new Set(ROWS.map(x=>x.k))].sort().map(k=>`<option ${k===cur?'selected':''}>${esc(k)}</option>`).join('');
 const c=$('fc').value;
 FR=ROWS.filter(x=>(!t||x.t===t)&&(!c||x.k===c)&&(!q||(x.c+' '+x.k).toLowerCase().includes(q)));
 const k=SORT.k;FR.sort((a,b)=>(k==='m'||k==='d'?a[k]-b[k]:String(a[k]).localeCompare(String(b[k])))*SORT.v);
 $('tb').innerHTML=FR.slice(0,300).map(x=>{const i=x.t==='Ingreso';return`<tr><td>${dsh(x.d)}</td><td>${esc(x.c||'—')}${x.tc?' <span class="lb">'+esc(x.tc)+'</span>':''}</td><td>${esc(x.k)}</td><td class="n ${i?'g-t':'r-t'}">${i?'+':'−'} ${fm(x.m)}</td><td class="n">${x.id?`<button class="bt" style="padding:4px 8px" data-del-mov="${esc(x.id)}" aria-label="Eliminar">✕</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="5" class="vac">// sin resultados</td></tr>';
 $('ft2').innerHTML=`${FR.length} movimientos · <span class="g-t">+ ${fm(sum(FR,'Ingreso'))}</span> · <span class="r-t">− ${fm(sum(FR,'Gasto'))}</span>`;
}
function ordenar(k){SORT=SORT.k===k?{k,v:-SORT.v}:{k,v:k==='c'||k==='k'?1:-1};movs()}
function buscar(v){Q=v;if(!$('v-movs').classList.contains('on'))ver('movs');movs()}
function alertas(){
 const G=sum(ROWS,'Gasto'),I=sum(ROWS,'Ingreso'),a=[],mm=SEL!=='all';
 if(G>I)a.push(['r','Gastas más de lo que ingresas: déficit de S/ '+fm(G-I)+'.']);
 if(S.budget>0&&mm){const p=G/S.budget*100;if(p>=100)a.push(['r','Superaste tu presupuesto por S/ '+fm(G-S.budget)+'.']);else if(p>=80)a.push(['y','Ya usaste '+p.toFixed(0)+'% de tu presupuesto.'])}
 const c=sorted(grp(ROWS,'Gasto',x=>x.k))[0];if(c&&G&&c[1]/G>=.4)a.push(['y',esc(c[0])+' concentra el '+(c[1]/G*100).toFixed(0)+'% de tus gastos.']);
 if(I>0&&(I-G)/I*100<S.goal)a.push(['y','Tu ahorro está por debajo de la meta del '+S.goal+'%.']);
 if(PK&&sum(PREV,'Gasto')>0&&G>sum(PREV,'Gasto')*1.2)a.push(['y','Gastas más de 20% por encima de '+PL+'.']);
 const h0=new Date();if(S.reg==='NRUS'){const nf=ALL.filter(x=>x.t==='Ingreso'&&x.tc==='01'&&(h0-x.d)<=90*864e5);if(nf.length)a.push(['r','NRUS: no puedes emitir facturas. Hay '+nf.length+' venta(s) con factura (01) en los últimos 90 días.'])}
 calcDeudas(h0.getFullYear(),h0.getMonth()).concat(calcDeudas(h0.getFullYear(),h0.getMonth()+1)).forEach(x=>{if(x.st==='vencida')a.push(['r','Deuda vencida: '+esc(x.d.n)+' (S/ '+fm(x.d.m)+')']);else if(x.st==='proxima')a.push(['y',esc(x.d.n)+' vence '+(x.dias===0?'hoy':'en '+x.dias+' d')+' · S/ '+fm(x.d.m)])});
 if(!a.length)a.push(['g','Todo en orden. Sin alertas.']);
 $('nbad').textContent=a[0][0]==='g'?0:a.length;
 $('al').innerHTML=a.map(x=>`<div class="al ${x[0]}">${x[1]}</div>`).join('');
}
/* ===== DEUDAS Y PAGOS FUTUROS ===== */
let DB={l:[],p:{}},MENS=[],CRONS={};
const nz=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['de','del','la','el','los','las','por','pago','pagos','cuota','mi','mis','mes','al','en','y','a']);
function lev(a,b){const d=[];for(let i=0;i<=a.length;i++)d[i]=[i];for(let j=1;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
 return 1-d[a.length][b.length]/Math.max(a.length,b.length,1)}
function parecido(a,b){
 const x=nz(a),y=nz(b);if(!x||!y)return false;
 if(x.length>=4&&y.includes(x))return true;
 if(y.length>=4&&x.includes(y))return true;
 const w=x.split(' '),f=w.filter(k=>k.length>2&&!STOP.has(k)),sx=f.length?f:w,wy=y.split(' ');
 if(sx.every(k=>wy.some(v=>v===k||(k.length>=4&&v.length>=4&&v.slice(0,4)===k.slice(0,4)))))return true;
 return lev(x,y)>=.75}
function fechaDeuda(d,y,m){
 if(d.rec==='unico'){const[a,b,c]=String(d.d).split('-').map(Number),f=new Date(a,b-1,c);return(f.getFullYear()===y&&f.getMonth()===m)?f:null}
 return new Date(y,m,Math.min(+d.d||1,new Date(y,m+1,0).getDate()))}
function calcDeudas(y,m){
 const dt=new Date(y,m,1);y=dt.getFullYear();m=dt.getMonth();
 const hoy=new Date();hoy.setHours(0,0,0,0);const gas=ALL.filter(x=>x.t==='Gasto'),out=[];
 const add=(d,due,test)=>{const w0=+due-15*864e5,w1=+due+15*864e5,hit=gas.filter(x=>+x.d>=w0&&+x.d<=w1&&test(x));
  const man=!!DB.p[d.id+'|'+y+'-'+m],pag=hit.length>0||man,dias=Math.round((due-hoy)/864e5);
  out.push({d,due,hit,man,pag,dias,st:pag?'pagada':dias<0?'vencida':dias<=5?'proxima':'pendiente'})};
 DB.l.forEach(d=>{const due=fechaDeuda(d,y,m);if(due)add(d,due,x=>parecido(d.n,x.c))});
 if(S.reg!=='NONE'){const pm=m===0?11:m-1,py=m===0?y-1:y,v=vencSunat(py,pm);
  if(v.f.getFullYear()===y&&v.f.getMonth()===m){const t=impuestoMes(py,pm);
   if(t.total>0)add({id:'sunat-'+py+'-'+pm,n:'Impuesto SUNAT · '+MES[pm]+' ('+S.reg+')',m:Math.round(t.total*100)/100,rec:'sunat'},v.f,x=>/sunat|impuesto|nrus|\bigv\b|tribut|renta|\brus\b|\brer\b|mype/.test(nz(x.c)+' '+nz(x.k)))}}
 return out.sort((a,b)=>a.due-b.due)}
function refMes(){const h=new Date();if(SEL==='all')return[h.getFullYear(),h.getMonth()];const[m,y]=SEL.split('/').map(Number);return[y,m-1]}
function deudas(){
 const[y,m]=refMes(),it=calcDeudas(y,m),fin=new Date(y,m+1,1);
 const tot=it.reduce((a,x)=>a+x.d.m,0),pg=it.filter(x=>x.pag).reduce((a,x)=>a+x.d.m,0),pen=tot-pg;
 const prev=ALL.filter(x=>x.d<fin),sal=sum(prev,'Ingreso')-sum(prev,'Gasto'),fal=pen-sal;
 const k=(l,v,c,sb)=>`<div class="pn"><div class="lb">${l}</div><div class="big ${c}">${v}</div><div class="sub">${sb}</div></div>`;
 $('dk').innerHTML=k('Deuda del mes','S/ '+fm(tot),'gy',MES[m]+' '+y)
  +k('Pendiente por pagar','S/ '+fm(pen),pen>0?'r-t':'g-t',it.filter(x=>!x.pag).length+' de '+it.length+' sin pagar')
  +k('Saldo disponible','S/ '+fm(sal),'gy','Ingresos − gastos acumulados')
  +k(fal>0?'Te faltan':'Cubierto',fal>0?'S/ '+fm(fal):'S/ '+fm(-fal)+' libres',fal>0?'r-t':'g-t',fal>0?'Para cubrir lo pendiente':'Después de pagar todo');
 $('dtl').textContent='Deudas de '+MES[m]+' '+y;
 const pc=tot?pg/tot*100:0;
 $('dbar').innerHTML=`<div class="rw"><span class="lb">Avance de pagos</span><span>${pc.toFixed(0)}%</span></div><div class="bar"><i style="width:${pc}%;background:#10b981"></i></div>`;
 const ST={pagada:['PAGADA','g-t'],vencida:['VENCIDA','r-t'],proxima:['PRÓXIMA','y-t'],pendiente:['PENDIENTE','gy']};
 const tx=x=>x.hit.length?'registrada '+dsh(x.hit[0].d):x.man?'marcada a mano':x.dias<0?'venció hace '+(-x.dias)+' d':x.dias===0?'vence hoy':'en '+x.dias+' d';
 const bs='style="padding:6px 9px"';
 $('dtb').innerHTML=it.map(x=>`<tr><td>${esc(x.d.n)}<div class="lb">${x.d.rec==='sunat'?'Impuesto SUNAT':x.d.rec==='unico'?'Pago único':'Mensual'}</div></td><td>${dsh(x.due)}<div class="lb">${tx(x)}</div></td><td class="n r-t">S/ ${fm(x.d.m)}</td><td class="${ST[x.st][1]}">${ST[x.st][0]}</td><td class="n">${x.hit.length?'':`<button class="bt" ${bs} data-marcar="${esc(x.d.id)}" data-y="${y}" data-m="${m}">${x.man?'Desmarcar':'Marcar'}</button> `}${x.d.rec==='sunat'?'':`<button class="bt" ${bs} data-del-deuda="${esc(x.d.id)}" aria-label="Eliminar">✕</button>`}</td></tr>`).join('')||'<tr><td colspan="5" class="vac">// agrega tu primera deuda arriba</td></tr>';
 const fu=DB.l.filter(d=>d.rec==='unico'&&new Date(...String(d.d).split('-').map((v,i)=>i===1?v-1:+v))>=fin).sort((a,b)=>a.d<b.d?-1:1);
 $('dfu').hidden=!fu.length;
 $('dfl').innerHTML=fu.map(d=>`<div class="rw rx"><div><div class="tx">${esc(d.n)}</div><div class="lb">${esc(d.d.split('-').reverse().join('/'))}</div></div><span class="r-t">S/ ${fm(d.m)} <button class="bt" ${bs} data-del-deuda="${esc(d.id)}" aria-label="Eliminar">✕</button></span></div>`).join('');
}
function tipoDeuda(){const u=$('dt').value==='unico';$('dd').hidden=u;$('df').hidden=!u}
async function addDeuda(){
 const n=$('dn').value.trim(),mo=parseFloat($('dm').value),tp=$('dt').value,dd=tp==='mensual'?parseInt($('dd').value):$('df').value;
 if(!n||!(mo>0)){toast('Escribe el nombre y el monto');return}
 if(tp==='mensual'&&!(dd>=1&&dd<=31)){toast('El día de pago debe estar entre 1 y 31');return}
 if(tp==='unico'&&!dd){toast('Elige la fecha de pago');return}
 const row={nombre:n,monto:Math.round(mo*100)/100,tipo:tp};if(tp==='mensual')row.dia=dd;else row.fecha=dd;
 const{data,error}=await sb.from('deudas').insert(row).select().single();
 if(error){toast('No se pudo guardar: '+error.message);return}
 DB.l.push({id:data.id,n:data.nombre,m:+data.monto,rec:data.tipo,d:data.tipo==='mensual'?data.dia:data.fecha});
 ['dn','dm','dd','df'].forEach(i=>$(i).value='');toast('Deuda agregada');deudas();alertas()}
async function marcar(id,y,m){const k=id+'|'+y+'-'+m;
 if(DB.p[k]){const{error}=await sb.from('deuda_marcas').delete().eq('clave',k);if(error){toast(error.message);return}delete DB.p[k]}
 else{const{error}=await sb.from('deuda_marcas').insert({clave:k});if(error){toast(error.message);return}DB.p[k]=1}
 deudas();alertas()}
async function borrarDeuda(id){if(!confirm('¿Eliminar esta deuda?'))return;
 const{error}=await sb.from('deudas').delete().eq('id',id);if(error){toast(error.message);return}
 await sb.from('deuda_marcas').delete().like('clave',id+'|%');
 DB.l=DB.l.filter(d=>d.id!==id);Object.keys(DB.p).forEach(k=>{if(k.indexOf(id+'|')===0)delete DB.p[k]});deudas();alertas();toast('Deuda eliminada')}

/* ===== NEGOCIO: marca, ventas por día, productos e impuestos ===== */
const kc=(l,v,c,sb)=>`<div class="pn"><div class="lb">${l}</div><div class="big ${c}">${v}</div><div class="sub">${sb||''}</div></div>`;
function marca(){$('ttl').textContent=(S.neg||'SYS.PANEL').toUpperCase();document.title=S.neg||'Panel de negocio'}
let ND=14,PM='v';
function dayRows(rows){const m=new Map();rows.forEach(x=>{const k=dkey(x.d);if(!m.has(k))m.set(k,{d:new Date(x.d.getFullYear(),x.d.getMonth(),x.d.getDate()),v:0,g:0,n:0});const o=m.get(k);if(x.t==='Ingreso'){o.v+=x.m;o.n++;if(esCons(x))o.c=1}else o.g+=x.m});return[...m.values()].sort((a,b)=>b.d-a.d)}
function prods(rows){const m=new Map();
 rows.forEach(x=>{if(x.t!=='Ingreso'||esCons(x)||/^(otros ingresos|intereses)/i.test(x.k))return;
  if(x.items&&x.items.length){x.items.forEach(it=>{const n=String(it.n||x.k).trim(),k=nz(n)||'sin nombre',o=m.get(k)||{n,q:0,v:0,c:x.k};o.q+=(+it.q||1);o.v+=(+it.t||0);m.set(k,o)});return}
  let c=(x.c||x.k).trim(),q=1;const a=c.match(/^(\d+(?:[.,]\d+)?)\s*[xX*]\s*(.+)$/),b=c.match(/^(.+?)\s+[xX*]\s*(\d+)$/);
  if(a){q=parseFloat(a[1].replace(',','.'));c=a[2]}else if(b){c=b[1];q=+b[2]}
  const k=nz(c)||'sin nombre',o=m.get(k)||{n:c,q:0,v:0,c:x.k};o.q+=q;o.v+=x.m;m.set(k,o)});
 return[...m.values()]}
function proximos(){const h=new Date(),y=h.getFullYear(),m=h.getMonth();return calcDeudas(y,m).concat(calcDeudas(y,m+1)).filter(x=>!x.pag).sort((a,b)=>a.due-b.due)}
function resumen2(){
 $('prox').innerHTML=proximos().slice(0,6).map(x=>`<div class="rw rx"><div><div class="tx">${esc(x.d.n)}</div><div class="lb">${dsh(x.due)} · ${x.dias<0?'venció hace '+(-x.dias)+' d':x.dias===0?'vence hoy':'en '+x.dias+' d'}</div></div><span class="r-t">S/ ${fm(x.d.m)}</span></div>`).join('')||'<div class="vac">// sin pagos pendientes</div>';
 const P=prods(ROWS).sort((a,b)=>b.v-a.v).slice(0,5),mx=P[0]?P[0].v:1;
 $('topP').innerHTML=P.map(x=>`<div class="tr"><div class="rw"><span class="tx">${esc(x.n)}</span><span class="g-t">S/ ${fm(x.v)} · ${+x.q.toFixed(1)} u.</span></div><div class="bar"><i style="width:${x.v/mx*100}%;background:#d4d4d8"></i></div></div>`).join('')||'<div class="vac">// sin ventas</div>';
}
function ventas(){
 const D=dayRows(ROWS),asc=[...D].reverse(),n=D.length||1,gn=x=>x.v-x.g;
 const best=[...D].sort((a,b)=>gn(b)-gn(a))[0],bad=[...D].sort((a,b)=>gn(a)-gn(b))[0],wd=[0,0,0,0,0,0,0];
 ROWS.forEach(x=>{if(x.t==='Ingreso')wd[x.d.getDay()]+=x.m});const wm=Math.max(...wd);
 const cd=cierreDia();
 $('vk').innerHTML=kc('Ganancia del día (cierre de caja)','S/ '+fm(cd.g),cd.g>=0?'g-t':'r-t',cd.txt)
  +kc('Mejor día',best?'S/ '+fm(gn(best)):'—',best&&gn(best)>=0?'g-t':'r-t',best?dsh(best.d)+' · '+DIA[best.d.getDay()]:'Sin datos')
  +kc('Día más flojo',bad?'S/ '+fm(gn(bad)):'—',bad&&gn(bad)>=0?'g-t':'r-t',bad?dsh(bad.d)+' · '+DIA[bad.d.getDay()]:'Sin datos')
  +kc('Ganancia diaria promedio','S/ '+fm(D.reduce((a,x)=>a+gn(x),0)/n),'gy',D.length+' días con movimiento');
 const v=ND?asc.slice(-ND):asc;
 mk('cDia',{type:'bar',data:{labels:v.map(x=>dsh(x.d)),datasets:[{type:'bar',label:'Ventas',data:v.map(x=>x.v),backgroundColor:'#a1a1aa'},{type:'bar',label:'Gastos',data:v.map(x=>x.g),backgroundColor:'#52525b'},{type:'line',label:'Ganancia',data:v.map(gn),borderColor:'#e4e4e7',borderWidth:1.5,pointRadius:2,tension:.3}]},options:{plugins:{legend:{labels:{boxWidth:8}},tooltip:TT},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}}}}});
 const tp=sorted(grp(ROWS,'Ingreso',x=>x.k));
 mk('cTip',{type:'doughnut',data:{labels:tp.map(e=>e[0]),datasets:[{data:tp.map(e=>e[1]),backgroundColor:tp.map((e,i)=>GRN[i%5]),borderColor:'#0a0a0a',borderWidth:2}]},options:{cutout:'72%',plugins:{legend:{position:'bottom',labels:{boxWidth:8}},tooltip:TT}}});
 const P=prods(ROWS).sort((a,b)=>b[PM]-a[PM]),tv=P.reduce((a,x)=>a+x.v,0);
 mk('cPro',{type:'bar',data:{labels:P.slice(0,8).map(x=>x.n),datasets:[{label:PM==='v'?'Ventas S/':'Unidades',data:P.slice(0,8).map(x=>x[PM]),backgroundColor:'#d4d4d8'}]},options:{indexAxis:'y',plugins:{legend:{display:false},tooltip:TT},scales:{y:{grid:{display:false}}}}});
 let ac=0,np=0;for(const x of [...P].sort((a,b)=>b.v-a.v)){ac+=x.v;np++;if(ac>=tv*.8)break}
 $('par').textContent=P.length?np+' de '+P.length+' productos o servicios generan el 80% de tus ventas.':'';
 $('tpr').innerHTML=P.slice(0,60).map(x=>`<tr><td>${esc(x.n)}<div class="lb">${esc(x.c)}</div></td><td class="n">${+x.q.toFixed(2)}</td><td class="n g-t">S/ ${fm(x.v)}</td><td class="n">${tv?(x.v/tv*100).toFixed(0):0}%</td></tr>`).join('')||'<tr><td colspan="4" class="vac">// sin ventas en este periodo</td></tr>';
 $('tdi').innerHTML=D.slice(0,60).map(x=>`<tr><td>${dsh(x.d)}<div class="lb">${DIA[x.d.getDay()]}${x.c?' · consolidada':''}</div></td><td class="n g-t">S/ ${fm(x.v)}</td><td class="n r-t">S/ ${fm(x.g)}</td><td class="n ${gn(x)>=0?'g-t':'r-t'}">${gn(x)>=0?'+':'−'} ${fm(Math.abs(gn(x)))}</td><td class="n">${x.v>0?(gn(x)/x.v*100).toFixed(0)+'%':'—'}</td><td class="n">${x.n}</td></tr>`).join('')||'<tr><td colspan="6" class="vac">// sin movimientos en este periodo</td></tr>';
}
document.querySelectorAll('#rng2 button').forEach(b=>b.onclick=()=>{ND=+b.dataset.n;document.querySelectorAll('#rng2 button').forEach(x=>x.classList.toggle('on',x===b));ventas()});
document.querySelectorAll('#rng3 button').forEach(b=>b.onclick=()=>{PM=b.dataset.m;document.querySelectorAll('#rng3 button').forEach(x=>x.classList.toggle('on',x===b));ventas()});

/* ----- Impuestos SUNAT (referencial, parámetros 2026) ----- */
// Cronograma oficial 2026 (R.S. 281-2022/SUNAT): "mes de pago|día para dígitos 0,1,2-3,4-5,6-7,8-9,BC", una fila por período Ene..Dic
const CRON=['2|16,17,18,19,20,23,24','3|16,17,18,19,20,23,24','4|17,20,21,22,23,24,27','5|18,19,20,21,22,25,26','6|15,16,17,18,19,22,23','7|15,16,17,20,21,22,24','8|18,19,20,21,24,25,26','9|15,16,17,18,21,22,23','10|16,19,20,21,22,23,26','11|16,17,18,19,20,23,24','12|17,18,21,22,23,24,28','1|18,19,20,21,22,25,26'];
const RG={NRUS:'Nuevo RUS',RER:'Régimen Especial (RER)',RMT:'MYPE Tributario (RMT)',NONE:''};
function vencSunat(py,pm){
 const d=Math.min(9,Math.max(0,parseInt(S.dig)||0)),gi=[0,1,2,2,3,3,4,4,5,5][d];
 const CR=CRONS[py]||(py===2026?CRON:null);
 if(Array.isArray(CR)&&CR[pm]){const[a,b]=String(CR[pm]).split('|'),mes=+a;return{f:new Date(mes===1?py+1:py,mes-1,+b.split(',')[gi]),aprox:false}}
 let f=new Date(py,pm+1,16);while(f.getDay()===0||f.getDay()===6)f.setDate(f.getDate()+1);
 for(let i=0;i<gi;i++){do f.setDate(f.getDate()+1);while(f.getDay()===0||f.getDay()===6)}
 return{f,aprox:true}}
const NOCOMP=['Impuestos y SUNAT','Préstamos y deudas','Sueldos y personal'],NODED=['Impuestos y SUNAT','Préstamos y deudas'];
function esCons(x){return x.t==='Ingreso'&&(!x.tc||x.tc==='03')&&/consolid|ventas? del d[ií]a|cierre de caja|resumen diario/i.test((x.c||'')+' '+(x.rs||''))}
// Base imponible e IGV de CADA transacción según su comprobante (sin comprobante detallado: usa el ajuste "precio incluye IGV")
function baseIgv(x){
 if(x.base!=null)return{b:x.base,i:x.igv||0};
 const n=x.tot-x.otros;
 if(x.t==='Ingreso'){const inc=S.igvinc?1.18:1;return{b:n/inc,i:S.igvinc?n-n/1.18:n*.18}}
 return{b:n,i:0}}
const exoIGV=()=>!!(S.amaz&&S.amIgv);
const baseYTD=(y,m)=>ALL.filter(x=>x.t==='Ingreso'&&x.d.getFullYear()===y&&x.d.getMonth()<=m).reduce((a,x)=>a+(exoIGV()?x.tot-x.otros:baseIgv(x).b),0);
function impuestoMes(y,m){
 const R=ALL.filter(x=>x.d.getFullYear()===y&&x.d.getMonth()===m),Iv=R.filter(x=>x.t==='Ingreso'),Gs=R.filter(x=>x.t==='Gasto'),
  V=Iv.reduce((a,x)=>a+x.tot,0),G=Gs.reduce((a,x)=>a+x.tot,0),comp=Gs.filter(x=>!NOCOMP.includes(x.k)).reduce((a,x)=>a+x.tot,0),
  det=Iv.reduce((a,x)=>a+x.md,0),o={V,G,comp,det,total:0,ren:0,igv:0,igvV:0,igvC:0,base:0,exo:false};
 if(S.reg==='NONE')return o;
 if(S.reg==='NRUS'){const mx=Math.max(V,comp);o.cat=mx<=5000?1:mx<=8000?2:0;o.ren=o.total=o.cat===1?20:o.cat===2?50:0;return o}
 o.exo=exoIGV();
 Iv.forEach(x=>{if(o.exo)o.base+=x.tot-x.otros;else{const r=baseIgv(x);o.base+=r.b;o.igvV+=r.i}});
 if(!o.exo){Gs.forEach(x=>{if((x.tc==='01'||x.tc==='04')&&x.igv>0)o.igvC+=x.igv});o.igv=Math.max(0,o.igvV-o.igvC)}
 const ytd=baseYTD(y,m);
 o.tasa=S.reg==='RER'?.015:(ytd<=300*S.uit?.01:Math.max(.015,S.coef||0));
 o.coefUsado=S.reg==='RMT'&&ytd>300*S.uit&&(S.coef||0)>.015;
 o.ren=o.base*o.tasa;o.total=o.ren+o.igv;return o}
// Impuesto a la renta anual del RMT: proyección al cierre del año menos los pagos a cuenta
function irAnualRMT(y,m){
 const fin=new Date(y,m+1,1),ing=baseYTD(y,m),gas=ALL.filter(x=>x.t==='Gasto'&&!NODED.includes(x.k)&&x.d.getFullYear()===y&&x.d<fin).reduce((a,x)=>a+(exoIGV()?x.tot-x.otros:baseIgv(x).b),0);
 const u=ing-gas,up=u*12/(m+1),L=15*S.uit,irp=up>0?(S.amaz?up*S.amRen/100:Math.min(up,L)*.10+Math.max(0,up-L)*.295):0;
 let real=0;for(let i=0;i<=m;i++)real+=impuestoMes(y,i).ren;
 const rest=m<11?real/(m+1)*(11-m):0;
 return{u,up,irp,real,rest,saldo:irp-real-rest}}
// Ganancia del día (cierre de caja): boleta consolidada − gastos operativos de esa fecha
function cierreDia(){
 const hoy=dkey(new Date()),ds=ALL.filter(x=>x.t==='Ingreso'&&dkey(x.d)<=hoy).map(x=>dkey(x.d)).sort().pop();
 if(!ds)return{g:0,txt:'Sin ventas registradas'};
 const R=ALL.filter(x=>dkey(x.d)===ds),cons=R.filter(esCons),ing=cons.length?sum(cons,'Ingreso')+sum(R.filter(x=>x.tc==='01'),'Ingreso'):sum(R,'Ingreso'),
  gas=R.filter(x=>x.t==='Gasto'&&!NODED.includes(x.k)).reduce((a,x)=>a+x.m,0),g=ing-gas;
 return{g,ing,gas,txt:(ds===hoy?'Hoy':ds.split('-').reverse().slice(0,2).join('/'))+' · margen '+(ing>0?(g/ing*100).toFixed(0)+'%':'—')+(cons.length?' · boleta consolidada':' · ventas registradas')}}
function impuestos(){
 const[y,m]=refMes(),hoy=new Date();hoy.setHours(0,0,0,0);
 if(S.reg==='NONE'){$('ik').innerHTML='';$('ibr').innerHTML='<div class="vac">// elige tu régimen en Ajustes para calcular tu impuesto</div>';$('ive').innerHTML='';$('itp').innerHTML='';$('inote').textContent='';$('itl').textContent='Impuestos';return}
 const t=impuestoMes(y,m),v=vencSunat(y,m),dias=Math.round((v.f-hoy)/864e5),ln=(a,b,c)=>`<div class="rw rx"><span>${a}</span><span class="${c||''}">${b}</span></div>`;
 const ytd=S.reg==='NRUS'?ALL.filter(x=>x.t==='Ingreso'&&x.d.getFullYear()===y&&x.d.getMonth()<=m).reduce((a,x)=>a+x.tot,0):baseYTD(y,m);
 const tope=S.reg==='NRUS'?96000:S.reg==='RER'?525000:1700*S.uit,pc=ytd/tope*100;
 $('itl').textContent='Cálculo de '+MES[m]+' '+y+' · '+RG[S.reg];
 $('ik').innerHTML=kc('Impuesto estimado','S/ '+fm(t.total),'gy',RG[S.reg])
  +kc('Vence',dsh(v.f),dias<0?'r-t':dias<=7?'y-t':'gy',(dias<0?'venció hace '+(-dias)+' d':dias===0?'vence hoy':'en '+dias+' d')+(v.aprox?' · aprox.':''))
  +kc('Carga tributaria',t.V?(t.total/t.V*100).toFixed(1)+'%':'—','gy','del total vendido en el mes')
  +kc('Ventas del año',pc.toFixed(0)+'% del tope',pc>=100?'r-t':pc>=80?'y-t':'gy','S/ '+fm(ytd)+' de S/ '+fm(tope));
 let b=ln('Ventas del mes (importe total)','S/ '+fm(t.V),'g-t');
 if(t.det>0)b+=ln('Detracciones retenidas (Banco de la Nación)','S/ '+fm(t.det),'');
 if(S.reg==='NRUS'){
  b+=ln('Compras y gastos operativos del mes','S/ '+fm(t.comp),'r-t')+ln('Categoría',t.cat?'Categoría '+t.cat+(t.cat===1?' (hasta S/ 5,000)':' (hasta S/ 8,000)'):'Excede el límite de S/ 8,000','')+ln('Cuota mensual NRUS','S/ '+fm(t.total),'r-t');
  if(!t.cat)b+='<div class="lb" style="margin-top:12px;line-height:1.8">Superaste el límite mensual del NRUS. Debes pasar al RER o al MYPE Tributario.</div>'}
 else{
  b+=ln('Ingresos netos (base imponible)','S/ '+fm(t.base),'')+ln('Renta · '+(t.tasa*100).toFixed(2)+'%'+(t.coefUsado?' (coeficiente)':''),'S/ '+fm(t.ren),'r-t')
   +(t.exo?ln('IGV','Exonerado · Ley 27037','g-t'):ln('IGV de tus ventas','S/ '+fm(t.igvV),'')+ln('Crédito fiscal (facturas y liq. de compra)','− S/ '+fm(t.igvC),'')+ln('IGV a pagar','S/ '+fm(t.igv),'r-t'))
   +ln('Total a pagar','S/ '+fm(t.total),'r-t');
  if(S.reg==='RMT'){const a=irAnualRMT(y,m);
   b+=ln('Utilidad acumulada del año','S/ '+fm(a.u),a.u>=0?'g-t':'r-t')+ln('Utilidad proyectada al cierre del año','S/ '+fm(a.up),'')
    +ln('Renta anual proyectada ('+(S.amaz?S.amRen+'% promocional':'10% hasta 15 UIT, 29.5% el exceso')+')','S/ '+fm(a.irp),'r-t')
    +ln('(−) Pagos a cuenta del año (calculados)','− S/ '+fm(a.real),'')+(a.rest>0?ln('(−) Pagos a cuenta estimados hasta diciembre','− S/ '+fm(a.rest),''):'')
    +ln(a.saldo>=0?'Saldo proyectado a regularizar':'Saldo a favor proyectado','S/ '+fm(Math.abs(a.saldo)),a.saldo>0?'r-t':'g-t')}}
 $('ibr').innerHTML=b;
 let h='';const h0=new Date();
 for(let i=0;i<4;i++){const d0=new Date(h0.getFullYear(),h0.getMonth()+i-1,1),vv=vencSunat(d0.getFullYear(),d0.getMonth()),dd=Math.round((vv.f-hoy)/864e5);
  h+=`<div class="rw rx"><div><div class="tx" style="max-width:none">Período ${MES[d0.getMonth()]} ${d0.getFullYear()}</div><div class="lb">${dsh(vv.f)}${vv.aprox?' · aprox.':''} · ${dd<0?'venció hace '+(-dd)+' d':dd===0?'hoy':'en '+dd+' d'}</div></div><span class="${dd<0?'r-t':dd<=7?'y-t':'gy'}">${DIA[vv.f.getDay()]}</span></div>`}
 $('ive').innerHTML=h+`<div class="lb" style="margin-top:10px">RUC termina en ${S.dig}</div>`;
 $('itp').innerHTML=`<div class="rw"><span>S/ ${fm(ytd)} de S/ ${fm(tope)}</span><span>${pc.toFixed(0)}%</span></div><div class="bar"><i style="width:${Math.min(pc,100)}%;background:${pc>=100?'#ff4d4d':pc>=80?'#ffc14d':'#10b981'}"></i></div>`;
 $('inote').innerHTML='Cálculo referencial con parámetros SUNAT 2026 (UIT S/ '+fm(S.uit)+'). Confírmalo con tu contador. <a href="https://www.sunat.gob.pe/orientacion/cronogramas/2026/cObligacionMensual2026.html" target="_blank" rel="noopener" style="color:#10b981">Cronograma oficial</a>. Las fechas “aprox.” son estimadas hasta que SUNAT publique el cronograma de ese año.';
}

function togAm(){$('amx').hidden=!$('cfgA').checked}
function regUI(){$('fila-coef').style.display=$('cfgR').value==='RMT'?'':'none'}
function togAl(e){if(e&&e.stopPropagation)e.stopPropagation();$('al').hidden=!$('al').hidden}
document.addEventListener('click',e=>{
 if(!e.target||!e.target.closest)return;
 if(!e.target.closest('.rel'))$('al').hidden=true;
 const bm=e.target.closest('[data-del-mov]');if(bm){borrarMov(bm.dataset.delMov);return}
 const mk=e.target.closest('[data-marcar]');if(mk){marcar(mk.dataset.marcar,+mk.dataset.y,+mk.dataset.m);return}
 const bd=e.target.closest('[data-del-deuda]');if(bd){borrarDeuda(bd.dataset.delDeuda)}
});
function ver(v){document.querySelectorAll('.v').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));document.querySelectorAll('.nb').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
 if(v==='ajustes'){llenarCfg();$('cuenta').textContent=USER?USER.email:'';$('plan').textContent=PLAN.toUpperCase()}
 window.scrollTo(0,0);Object.values(CH).forEach(c=>c.resize())}
function guardar(){const g=i=>$(i).value.trim(),uf=g('cfgF');
 if(uf&&!/^https?:\/\//i.test(uf)){toast('La URL del formulario debe iniciar con https://');return}
 S.budget=Math.max(0,parseFloat(g('cfgB'))||0);S.goal=Math.min(100,Math.max(0,parseFloat(g('cfgG'))||0));S.form=uf;S.neg=g('cfgN');S.reg=g('cfgR');S.dig=g('cfgD');
 S.uit=Math.max(100,parseFloat(g('cfgU'))||5500);S.igvinc=g('cfgI')==='1'?1:0;S.coef=Math.min(0.5,Math.max(0,parseFloat(g('cfgC'))||0));S.amaz=$('cfgA').checked?1:0;S.amIgv=$('cfgAI').checked?1:0;S.amRen=parseInt(g('cfgAR'))||0;S.meta=Math.max(0,parseFloat(g('cfgM'))||0);
 S.onb=1;guardarCfg();toast('AJUSTES GUARDADOS');pintar()}
function llenarCfg(){$('cfgB').value=S.budget||'';$('cfgG').value=S.goal;$('cfgF').value=S.form;$('cfgN').value=S.neg;$('cfgR').value=S.reg;$('cfgD').value=S.dig;$('cfgU').value=S.uit;$('cfgI').value=S.igvinc?'1':'0';$('cfgC').value=S.coef||'';$('cfgA').checked=!!S.amaz;$('cfgAI').checked=!!S.amIgv;$('cfgAR').value=String(S.amRen);togAm();regUI();$('cfgM').value=S.meta||''}
function resetCfg(){S={budget:0,goal:20,form:'',neg:'',reg:'NRUS',dig:'0',uit:5500,igvinc:1,coef:0,amaz:0,amIgv:1,amRen:10,meta:0};guardarCfg();ver('ajustes');toast('AJUSTES RESTABLECIDOS');pintar()}
function abrirForm(){abrirModal()}
function exportar(a,n){if(!a.length){toast('NO HAY DATOS PARA EXPORTAR');return}
 const q=s=>{const v=String(s==null?'':s);return'"'+(/^[=+\-@\t\r]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"'},L=['Fecha,Tipo,Categoría,Concepto,Comprobante,Serie-Número,Razón social,Importe total,IGV,Neto a pagar'].concat([...a].sort((x,y)=>y.d-x.d).map(x=>[dkey(x.d),x.t,q(x.k),q(x.c),x.tc||'',q((x.se||'')+(x.nu?'-'+x.nu:'')),q(x.rs),x.tot.toFixed(2),x.igv!=null?x.igv.toFixed(2):'',x.m.toFixed(2)].join(',')));
 const u=URL.createObjectURL(new Blob(['\ufeff'+L.join('\n')],{type:'text/csv;charset=utf-8'})),l=document.createElement('a');l.href=u;l.download=n+'_'+dkey(new Date())+'.csv';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL&&URL.revokeObjectURL(u),1000);toast('CSV DESCARGADO')}
document.querySelectorAll('#rng button').forEach(b=>b.onclick=()=>{N=+b.dataset.n;document.querySelectorAll('#rng button').forEach(x=>x.classList.toggle('on',x===b));resumen()});
document.querySelectorAll('.nb[data-v]').forEach(b=>b.onclick=()=>ver(b.dataset.v));
document.querySelectorAll('th[data-ord]').forEach(th=>th.onclick=()=>ordenar(th.dataset.ord));
$('per').onchange=function(){SEL=this.value;pintar()};
$('q').oninput=function(){buscar(this.value)};
$('btnAl').onclick=e=>togAl(e);
$('btnRef').onclick=()=>cargar();
$('btnNew').onclick=()=>abrirModal();
$('btnEmpNew').onclick=()=>abrirModal();
$('btnDemo').onclick=()=>verEjemplo();
$('actNew').onclick=()=>abrirForm();
$('actCsv').onclick=()=>exportar(ROWS,'periodo');
$('actRef').onclick=()=>cargar();
$('actPrt').onclick=()=>window.print();
$('btnTpl').onclick=()=>plantilla();
$('btnImp').onclick=()=>$('csvf').click();
$('btnExp').onclick=()=>exportar(FR,'movimientos');
$('ft').onchange=()=>movs();
$('fc').onchange=()=>movs();
$('dt').onchange=()=>tipoDeuda();
$('btnAddD').onclick=()=>addDeuda();
$('cfgR').onchange=()=>regUI();
$('btnSaveCfg').onclick=()=>guardar();
$('btnResCfg').onclick=()=>resetCfg();
$('cfgA').onchange=()=>togAm();
$('btnPro').onclick=()=>mejorarPlan();
$('btnExpDat').onclick=()=>exportarDatos();
$('btnOut').onclick=()=>salir();
$('btnDelAcc').onclick=()=>eliminarCuenta();
$('btnCloseM').onclick=()=>cerrarModal();
$('mbtn').onclick=()=>guardarMov();

/* ===== CUENTAS, DATOS EN LÍNEA Y SEGURIDAD (Supabase) ===== */
const CFG=window.CFG||{};
const sbUrl=String(CFG.SUPABASE_URL||'').trim().replace(/\/(?:rest|auth)\/v1\/?$/i,'').replace(/\/+$/,'');
const sbOK=!!(sbUrl&&CFG.SUPABASE_ANON_KEY&&!/TU-PROYECTO|TU_CLAVE/.test(sbUrl+CFG.SUPABASE_ANON_KEY)&&window.supabase);
const sb=sbOK?window.supabase.createClient(sbUrl,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let USER=null,PLAN='free',MODO='login',FALLOS=0,LOCK=0,MT='Ingreso';
const CAT_G=['Mercadería e insumos','Alquiler del local','Sueldos y personal','Servicios (luz, agua, internet)','Transporte y delivery','Publicidad y marketing','Impuestos y SUNAT','Mantenimiento y equipos','Préstamos y deudas','Otros gastos'];
const CAT_I=['Venta de productos','Prestación de servicios','Otros ingresos'];
const PCGE={'Mercadería e insumos':'60 Compras','Alquiler del local':'63 Servicios prestados por terceros','Sueldos y personal':'62 Gastos de personal','Servicios (luz, agua, internet)':'63 Servicios prestados por terceros','Transporte y delivery':'63 Servicios prestados por terceros','Publicidad y marketing':'63 Servicios prestados por terceros','Impuestos y SUNAT':'64 Gastos por tributos','Mantenimiento y equipos':'63 Servicios prestados por terceros','Préstamos y deudas':'45 Obligaciones financieras','Otros gastos':'65 Otros gastos de gestión','Venta de productos':'701 Ventas de mercaderías','Prestación de servicios':'704 Prestación de servicios','Otros ingresos':'75 Otros ingresos de gestión'};

// ---------- Inicio de sesión ----------
function aerr(t,ok){const e=$('aerr');e.textContent=t||'';e.className='err'+(ok?' ok':'')}
function authModo(m){MODO=m;
 const T={login:['Ingresa a tu cuenta','Entrar','¿No tienes cuenta? Crear una','signup'],signup:['Crea tu cuenta','Crear cuenta','¿Ya tienes cuenta? Ingresar','login'],reset:['Recupera tu contraseña','Enviar enlace','Volver a ingresar','login'],recover:['Crea una nueva contraseña','Guardar contraseña','','login']}[m];
 $('asub').textContent=T[0];$('abtn').textContent=T[1];$('asw').textContent=T[2];$('asw').dataset.m=T[3];$('asw').hidden=!T[2];
 $('arow-e').hidden=m==='recover';$('arow-p').hidden=m==='reset';$('aterm-l').hidden=m!=='signup';$('aforgot').hidden=m!=='login';
 $('ap').autocomplete=m==='login'?'current-password':'new-password';aerr('')}
function msgAuth(e){const t=String(e&&e.message||'');
 if(/invalid login/i.test(t))return'Correo o contraseña incorrectos';
 if(/not confirmed/i.test(t))return'Confirma tu correo antes de ingresar (revisa tu bandeja y spam)';
 if(/already registered|already been registered/i.test(t))return'No se pudo crear la cuenta con ese correo. Prueba ingresar o recuperar tu contraseña';
 if(/password/i.test(t)&&/(weak|short|least|characters)/i.test(t))return'La contraseña es muy débil. Usa 8 o más caracteres, con letras y números';
 if(/rate limit|too many/i.test(t))return'Demasiados intentos. Espera unos minutos';
 if(/^[A-Za-zÁ-ú ]/.test(t)&&e&&e.isAuth)return t;return'No se pudo completar la acción. Intenta de nuevo'}
$('asw').onclick=()=>authModo($('asw').dataset.m);
$('aforgot').onclick=()=>authModo('reset');
$('fa').addEventListener('submit',async ev=>{ev.preventDefault();
 if(Date.now()<LOCK){aerr('Espera unos segundos antes de volver a intentar');return}
 const em=$('ae').value.trim().toLowerCase(),pw=$('ap').value,btn=$('abtn');aerr('');
 if(MODO!=='recover'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){aerr('Escribe un correo válido');return}
 if(MODO!=='reset'&&pw.length<8){aerr('La contraseña debe tener al menos 8 caracteres');return}
 if(MODO==='signup'&&!$('aterms').checked){aerr('Debes aceptar los términos y la política de privacidad');return}
 btn.disabled=true;
 try{
  const back=location.origin+location.pathname;
  if(MODO==='reset'){const{error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:back});if(error)throw error;aerr('Si el correo existe, te enviamos un enlace para crear una nueva contraseña.',1)}
  else if(MODO==='recover'){const{error}=await sb.auth.updateUser({password:pw});if(error)throw error;history.replaceState(null,'',back);const{data}=await sb.auth.getSession();if(data.session)await entrar(data.session.user)}
  else if(MODO==='signup'){const{data,error}=await sb.auth.signUp({email:em,password:pw,options:{emailRedirectTo:back}});if(error)throw error;if(data.session)await entrar(data.session.user);else aerr('Cuenta creada. Revisa tu correo para confirmarla y luego ingresa.',1)}
  else{const{data,error}=await sb.auth.signInWithPassword({email:em,password:pw});if(error)throw error;FALLOS=0;await entrar(data.user)}
 }catch(err){FALLOS++;if(FALLOS>=5){LOCK=Date.now()+30000;FALLOS=0;aerr('Demasiados intentos. Espera 30 segundos.')}else aerr(msgAuth(err))}
 btn.disabled=false});
function motivoCfg(){
 if(!window.CFG||!window.CFG.SUPABASE_URL)return'No se pudo leer config.js. Debe estar en la MISMA carpeta que app.html y llamarse exactamente config.js.';
 if(/TU-PROYECTO|TU_CLAVE/.test(String(CFG.SUPABASE_URL)+String(CFG.SUPABASE_ANON_KEY)))return'config.js todavía tiene los valores de ejemplo. Pega tu URL y tu clave anon de Supabase y guarda.';
 if(!window.supabase)return'No cargó la librería de Supabase. Revisa tu conexión o desactiva el bloqueador de anuncios (Brave Shields) para este sitio.';
 return'Falta la URL o la clave en config.js.'}
async function iniciar(){
 if(!sbOK){$('auth').hidden=false;aerr(motivoCfg());$('abtn').disabled=true;return}
 const rec=/type=recovery/.test(location.hash);
 if(rec)authModo('recover');else if(location.hash==='#registro')authModo('signup');
 sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY'){authModo('recover');$('auth').hidden=false}else if(ev==='SIGNED_OUT'&&USER)location.reload()});
 const{data}=await sb.auth.getSession();
 if(data.session&&!rec)await entrar(data.session.user);else $('auth').hidden=false}
async function entrar(u){USER=u;$('auth').hidden=true;$('usr').textContent=u.email||'';await cargarTodo();if(!S.onb){ver('ajustes');toast('Configura tu negocio para empezar')}}
async function salir(){try{await sb.auth.signOut()}catch(e){}location.reload()}

// ---------- Carga de datos (por ventana de tiempo y con paginación) ----------
async function cargarTodo(){
 $('st').textContent='Sincronizando…';$('st').style.color='';
 try{
  const R=await Promise.all([sb.from('ajustes').select('config').maybeSingle(),sb.from('deudas').select('*').order('creado'),sb.from('deuda_marcas').select('clave'),sb.from('perfiles').select('plan,pro_hasta').maybeSingle(),sb.from('parametros_tributarios').select('anio,uit,cronograma')]);
  R.forEach(r=>{if(r.error)throw r.error});
  const cfg=R[0].data&&R[0].data.config?R[0].data.config:{};Object.assign(S,cfg);
  DB={l:R[1].data.map(d=>({id:d.id,n:d.nombre,m:+d.monto,rec:d.tipo,d:d.tipo==='mensual'?d.dia:d.fecha})),p:{}};R[2].data.forEach(x=>DB.p[x.clave]=1);
  const pf=R[3].data;PLAN=pf&&pf.plan==='pro'&&(!pf.pro_hasta||new Date(pf.pro_hasta)>new Date())?'pro':'free';
  R[4].data.forEach(p=>{CRONS[p.anio]=p.cronograma;if(p.anio===new Date().getFullYear()&&!cfg.uit)S.uit=+p.uit});
  await cargarMovs();
 }catch(e){$('st').textContent='Sin conexión';toast('No se pudieron cargar tus datos: '+(e.message||e))}
}
async function cargarMovs(){
 const d0=new Date();d0.setMonth(d0.getMonth()-14);d0.setDate(1);d0.setHours(0,0,0,0);
 let rows=[],from=0;
 for(;;){const{data,error}=await sb.from('movimientos').select('*').gte('fecha_emision',d0.toISOString()).order('fecha_emision',{ascending:false}).range(from,from+999);
  if(error)throw error;rows=rows.concat(data);if(data.length<1000||from>=20000)break;from+=1000}
 const ms=await sb.rpc('resumen_mensual',{meses:24});MENS=ms.error?[]:ms.data;
 ALL=norm(rows);periodos();pintar();$('st').textContent='Datos en vivo';$('st').style.color='#a1a1aa'}
async function guardarCfg(){if(!USER)return;const{error}=await sb.from('ajustes').upsert({user_id:USER.id,config:S,actualizado:new Date().toISOString()});if(error)toast('No se pudo guardar tus ajustes: '+error.message)}
function verEjemplo(){MENS=[];ALL=norm(demo());periodos();pintar();$('st').textContent='Modo ejemplo · no se guarda';$('st').style.color='#ffc14d'}

// ---------- Registrar movimientos ----------
let ITEMS=[{q:1,n:'',pu:''}];
const itT=x=>Math.round((parseFloat(x.q)||0)*(parseFloat(x.pu)||0)*100)/100;
function pintarItems(){
 const ph=MT==='Gasto'?'Compra (ej. pollo, gas, bolsas)':'Producto o servicio';
 $('itl').innerHTML=ITEMS.map((x,i)=>`<div class="itm"><input class="in" data-i="${i}" data-k="n" placeholder="${ph}" maxlength="60" value="${esc(x.n)}" aria-label="Producto o servicio">
<button class="bt" type="button" style="padding:6px 9px" data-item-del="${i}" aria-label="Quitar línea"${ITEMS.length<2?' disabled':''}>✕</button>
<input type="number" min="0" step="any" inputmode="decimal" data-i="${i}" data-k="q" placeholder="Cant." value="${esc(x.q)}" aria-label="Cantidad">
<input type="number" min="0" step="0.01" inputmode="decimal" data-i="${i}" data-k="pu" placeholder="P. unit. S/" value="${esc(x.pu)}" aria-label="Precio unitario">
<div class="itt" id="it${i}">S/ ${fm(itT(x))}</div></div>`).join('');itTot()}
function itTot(){$('mtot').textContent='S/ '+fm(ITEMS.reduce((a,x)=>a+itT(x),0))}
function itemSet(i,k,v){if(!ITEMS[i])return;ITEMS[i][k]=v;if(k!=='n'){const e=$('it'+i);if(e)e.textContent='S/ '+fm(itT(ITEMS[i]))}itTot()}
function itemAdd(){if(ITEMS.length>=30){toast('Máximo 30 líneas por comprobante');return}ITEMS.push({q:1,n:'',pu:''});pintarItems();const n=document.querySelectorAll('#itl .in');if(n.length)n[n.length-1].focus()}
function itemDel(i){if(ITEMS.length<2)return;ITEMS.splice(i,1);pintarItems()}
function mTipo(t){MT=t;document.querySelectorAll('#mtipo button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 $('mk').innerHTML=(t==='Gasto'?CAT_G:CAT_I).map(c=>`<option>${esc(c)}</option>`).join('');
 $('itlbl').textContent=t==='Gasto'?'Compras o gastos del día':'Productos o servicios vendidos';pintarItems()}
document.querySelectorAll('#mtipo button').forEach(b=>b.onclick=()=>mTipo(b.dataset.t));
$('btnItemAdd').onclick=()=>itemAdd();
$('itl').addEventListener('input',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.k)itemSet(+t.dataset.i,t.dataset.k,t.value)});
$('itl').addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-item-del]');if(b)itemDel(+b.dataset.itemDel)});
function abrirModal(){if(!USER){toast('Inicia sesión para registrar');return}ITEMS=[{q:1,n:'',pu:''}];mTipo('Ingreso');$('mf').value=dkey(new Date());$('merr').textContent='';$('modal').hidden=false;const n=document.querySelectorAll('#itl .in');if(n.length)n[0].focus()}
function cerrarModal(){$('modal').hidden=true}
document.addEventListener('keydown',e=>{if(e.key==='Escape')cerrarModal()});
async function guardarMov(){
 const e=m=>{$('merr').textContent=m};
 const items=ITEMS.map(x=>({q:parseFloat(x.q)||0,pu:parseFloat(x.pu)||0,n:String(x.n||'').trim()})).filter(x=>x.q>0&&x.pu>0)
  .map(x=>({q:Math.round(x.q*1000)/1000,n:(x.n||$('mk').value).slice(0,60),pu:Math.round(x.pu*100)/100,t:Math.round(x.q*x.pu*100)/100}));
 if(!items.length){e('Agrega al menos una línea con cantidad y precio');return}
 const monto=Math.round(items.reduce((a,x)=>a+x.t,0)*100)/100;
 if(!(monto>0&&monto<1e8)){e('El total debe ser mayor a 0 y menor a 100,000,000');return}
 const c=items.map(x=>(x.q!==1?x.q+' x ':'')+x.n).join(', ').slice(0,120);
 const tc=$('mtc').value,nd=$('mnd').value.replace(/\D/g,''),sn=$('msn').value.trim().toUpperCase().split('-').map(s=>s.trim());
 if(S.reg==='NRUS'&&MT==='Ingreso'&&tc==='01')toast('NRUS: no puedes emitir facturas. Se guardará y verás la alerta en la campana.');
 const f=$('mf').value?new Date($('mf').value+'T12:00:00'):new Date(),sd=$('msd').checked;
 if(isNaN(f)){e('Elige una fecha válida');return}
 const td=sd?Math.min(100,Math.max(0,parseFloat($('mtd').value)||0)):0;
 const row={fecha_emision:f.toISOString(),tipo_movimiento:MT,descripcion:c,categoria:$('mk').value,categoria_pcge:PCGE[$('mk').value]||null,importe_total:monto,items,
  tipo_comprobante:tc||null,serie:sn[0]?sn[0].slice(0,10):null,numero:sn.slice(1).join('-').slice(0,20)||null,tipo_doc_identidad:nd?$('mdi').value:null,numero_doc_identidad:nd||null,razon_social:$('mrs').value.trim().slice(0,120)||null,
  sujeto_a_detraccion:sd,tasa_detraccion:td};
 $('mbtn').disabled=true;const{error}=await sb.from('movimientos').insert(row);$('mbtn').disabled=false;
 if(error){e(error.message);return}
 ['msn','mnd','mrs'].forEach(i=>$(i).value='');$('mtc').value='';$('msd').checked=false;ITEMS=[{q:1,n:'',pu:''}];pintarItems();cerrarModal();toast('Registro guardado');await cargarMovs()}
async function borrarMov(id){if(!confirm('¿Eliminar este movimiento?'))return;const{error}=await sb.from('movimientos').delete().eq('id',id);if(error){toast(error.message);return}toast('Movimiento eliminado');await cargarMovs()}

// ---------- Importar CSV (acepta tus columnas actuales de Google Sheets) ----------
function parseCSV(t){const rows=[];let r=[],c='',q=false;t=t.replace(/^\ufeff/,'');
 for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch==='"')q=true;
  else if(ch===','||ch===';'){r.push(c);c=''}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);rows.push(r);r=[];c=''}
  else c+=ch}
 if(c!==''||r.length){r.push(c);rows.push(r)}
 return rows.filter(x=>x.some(v=>v!==''))}
async function importarCSV(file){
 if(!USER){toast('Inicia sesión');return}
 if(file.size>2e6){toast('El archivo supera 2 MB');return}
 const T=parseCSV(await file.text());if(T.length<2){toast('El archivo está vacío');return}
 const H=T[0].map(h=>h.trim()),ok=norm(T.slice(1).map(r=>{const o={};H.forEach((h,i)=>o[h]=r[i]);return o}));
 if(!ok.length){toast('No se encontraron filas válidas');return}
 if(ok.length>5000){toast('Máximo 5,000 filas por archivo');return}
 const rows=ok.map(x=>{const nd=x.nd?String(x.nd).replace(/\D/g,''):'';return{fecha_emision:x.d.toISOString(),tipo_movimiento:x.t,descripcion:x.c.slice(0,120),categoria:String(x.k).slice(0,60),categoria_pcge:x.pc||PCGE[x.k]||null,importe_total:x.tot,
  tipo_comprobante:x.tc||null,serie:x.se?String(x.se).slice(0,10):null,numero:x.nu?String(x.nu).slice(0,20):null,tipo_doc_identidad:nd?(x.di||(nd.length===11?'RUC':'DNI')):null,numero_doc_identidad:nd||null,razon_social:x.rs?x.rs.slice(0,120):null,
  base_imponible:x.base,igv_monto:x.igv,otros_tributos:x.otros||0,sujeto_a_detraccion:!!x.sd,tasa_detraccion:x.sd?(x.td||0):0}});
 toast('Importando '+rows.length+' filas…');
 for(let i=0;i<rows.length;i+=500){const{error}=await sb.from('movimientos').insert(rows.slice(i,i+500));if(error){toast('Se detuvo en la fila '+(i+1)+': '+error.message);await cargarMovs();return}}
 toast('Importación completa: '+rows.length+' registros');await cargarMovs()}
$('csvf').onchange=e=>{if(e.target.files[0])importarCSV(e.target.files[0]);e.target.value=''};
function plantilla(){const t='fecha_emision,tipo_movimiento,descripcion,categoria,importe_total,tipo_comprobante,serie,numero,tipo_doc_identidad,numero_doc_identidad,razon_social,sujeto_a_detraccion,tasa_detraccion\n2026-11-02,Ingreso,Menú del día,Venta de productos,12.00,03,B001,45,DNI,00000000,CLIENTES VARIOS,NO,0\n2026-11-03,Gasto,Compra de insumos,Mercadería e insumos,118.00,01,F001,9876,RUC,20601234567,DISTRIBUIDORA SELVA SAC,NO,0\n';
 const u=URL.createObjectURL(new Blob(['\ufeff'+t],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='plantilla_importacion.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL&&URL.revokeObjectURL(u),1000)}

// ---------- Tus datos, tu plan ----------
function mejorarPlan(){if(CFG.PAGO_URL&&/^https?:\/\//i.test(CFG.PAGO_URL))window.open(CFG.PAGO_URL+(CFG.PAGO_URL.includes('?')?'&':'?')+'ref='+encodeURIComponent(USER?USER.id:''),'_blank','noopener');else toast('El pago del plan Pro estará disponible pronto')}
async function exportarDatos(){
 if(!USER){toast('Inicia sesión');return}
 toast('Preparando tu archivo…');let mov=[],from=0;
 for(;;){const{data,error}=await sb.from('movimientos').select('*').order('fecha_emision').range(from,from+999);if(error){toast(error.message);return}mov=mov.concat(data);if(data.length<1000)break;from+=1000}
 const[d,a,dm]=await Promise.all([sb.from('deudas').select('*'),sb.from('ajustes').select('config').maybeSingle(),sb.from('deuda_marcas').select('clave')]);
 const b=new Blob([JSON.stringify({exportado:new Date().toISOString(),correo:USER.email,ajustes:a.data?a.data.config:{},deudas:d.data||[],deuda_marcas:dm.data||[],movimientos:mov},null,1)],{type:'application/json'});
 const u=URL.createObjectURL(b),l=document.createElement('a');l.href=u;l.download='mis-datos-inti-'+dkey(new Date())+'.json';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL&&URL.revokeObjectURL(u),1000)}
async function eliminarCuenta(){
 if(prompt('Esto borra tu cuenta y TODOS tus datos para siempre.\nEscribe ELIMINAR para confirmar:')!=='ELIMINAR')return;
 const{error}=await sb.rpc('eliminar_mi_cuenta');if(error){toast(error.message);return}
 try{await sb.auth.signOut()}catch(e){}location.reload()}

(document.fonts&&document.fonts.load?Promise.race([document.fonts.load("300 13px 'JetBrains Mono'"),new Promise(r=>setTimeout(r,1500))]):Promise.resolve()).then(iniciar);
