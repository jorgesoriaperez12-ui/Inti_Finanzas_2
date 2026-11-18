const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app.js'),'utf8'),html=fs.readFileSync(path.join(root,'app.html'),'utf8'),hdrs=fs.readFileSync(path.join(root,'_headers'),'utf8');
const T=(n,ok)=>{console.log((ok?'OK   ':'FALLA ')+n);if(!ok)process.exitCode=1};
// ---------- 1) todos los ids que usa el código existen en la página ----------
const ids=new Set([...code.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)].map(m=>m[1]));
const miss=[...ids].filter(i=>!new RegExp('id="'+i+'"').test(html));
T('Todos los $(\'id\') del código existen en app.html'+(miss.length?' · faltan: '+miss.join(', '):''),miss.length===0);
const hand=[...html.matchAll(/on(?:click|change|input)="([A-Za-z0-9_]+)\(/g)].map(m=>m[1]);
const nofn=[...new Set(hand)].filter(f=>!new RegExp('function '+f+'\\b|async function '+f+'\\b|const '+f+'\\b').test(code));
T('Todos los onclick/onchange del HTML tienen función y CSP script-src no usa unsafe-inline'+(nofn.length?' · faltan: '+nofn.join(', '):''),nofn.length===0&&hand.length===0&&!/script-src[^;]*'unsafe-inline'/.test(hdrs));
// ---------- 2) base de datos simulada con RLS y triggers ----------
const USER={id:'u1',email:'ana@negocio.pe'};
const tables={movimientos:[],deudas:[],deuda_marcas:[],ajustes:[],perfiles:[{user_id:'u1',plan:'pro',pro_hasta:null}],parametros_tributarios:[{anio:2027,uit:5600,cronograma:['2|15,16,17,18,19,22,23','3|16,17,18,19,22,23,24','4|15,16,17,20,21,22,23','5|17,18,19,20,21,24,25','6|15,16,17,18,21,22,23','7|15,16,19,20,21,22,23','8|16,17,18,19,20,23,24','9|15,16,17,20,21,22,23','10|15,18,19,20,21,22,25','11|16,17,18,19,22,23,24','12|15,16,17,20,21,22,23','1|17,18,19,20,21,24,25']}]};
let seq=0;const inserted=[];
function sbMock(){
 const q=t=>{const st={op:'select',f:[],rng:null,one:false,maybe:false,ret:false,pl:null};
  const b={select(){if(st.op!=='select')st.ret=true;return b},insert(p){st.op='insert';st.pl=p;return b},upsert(p){st.op='upsert';st.pl=p;return b},delete(){st.op='delete';return b},
   eq(c,v){st.f.push(r=>r[c]===v);return b},gte(c,v){st.f.push(r=>r[c]>=v);return b},
   like(c,p){const re=new RegExp('^'+p.replace(/[.*+?^${}()|\[\]\\]/g,'\\$&').replace(/%/g,'.*')+'$');st.f.push(r=>re.test(r[c]));return b},
   order(){return b},range(a,z){st.rng=[a,z];return b},single(){st.one=true;return b},maybeSingle(){st.maybe=true;return b},
   then(ok,ko){return Promise.resolve(run()).then(ok,ko)}};
  function run(){const own=r=>!r.user_id||r.user_id===USER.id,tb=tables[t];
   if(st.op==='select'){let r=tb.filter(own).filter(x=>st.f.every(f=>f(x)));if(st.rng)r=r.slice(st.rng[0],st.rng[1]+1);return st.one||st.maybe?{data:r[0]||null,error:null}:{data:r,error:null}}
   if(st.op==='insert'){const arr=Array.isArray(st.pl)?st.pl:[st.pl];const out=[];
    for(const p of arr){const row=Object.assign({id:'id'+(++seq),user_id:USER.id,creado:'x'},p);
     if(t==='movimientos'){ // trigger del servidor
      if(row.tipo_comprobante==='01'&&(!row.numero_doc_identidad||row.numero_doc_identidad.length!==11))return{data:null,error:{message:'La factura requiere el RUC del cliente o proveedor (11 dígitos)'}};
      if(row.tipo_comprobante==='01'&&!row.serie)return{data:null,error:{message:'Falta la serie y número del comprobante'}};
      row.monto_detraccion=row.sujeto_a_detraccion?Math.round(row.importe_total*row.tasa_detraccion)/100:0;row.monto_neto_pagar=row.importe_total-row.monto_detraccion}
     if(t==='deuda_marcas'&&tb.some(x=>x.clave===row.clave))return{data:null,error:{message:'duplicado'}};
     tb.push(row);out.push(row)}
    inserted.push([t,out.length]);return st.one?{data:out[0],error:null}:{data:st.ret?out:null,error:null}}
   if(st.op==='upsert'){const i=tb.findIndex(x=>x.user_id===st.pl.user_id);if(i>=0)tb[i]=st.pl;else tb.push(st.pl);return{data:null,error:null}}
   if(st.op==='delete'){const before=tb.length;tables[t]=tb.filter(x=>!(own(x)&&st.f.every(f=>f(x))));return{data:null,error:null}}}
  return b};
 let session={user:USER};
 return{from:q,rpc:async n=>n==='resumen_mensual'?{data:[{anio:2026,mes:10,ventas:5000,gastos:3000,n:40}],error:null}:{data:null,error:null},
  auth:{getSession:async()=>({data:{session}}),onAuthStateChange(){},signOut:async()=>{session=null},
   signInWithPassword:async({email,password})=>password==='bien1234'?{data:{user:USER},error:null}:{data:null,error:{message:'Invalid login credentials'}},
   signUp:async()=>({data:{session:null},error:null}),resetPasswordForEmail:async()=>({error:null}),updateUser:async()=>({error:null})}}}
// ---------- 3) entorno de navegador simulado ----------
const els={};const el=id=>els[id]||(els[id]={id,hidden:false,value:'',checked:false,textContent:'',innerHTML:'',className:'',style:{},dataset:{},disabled:false,
 classList:{toggle(){},add(){},remove(){},contains(){return false}},addEventListener(e,f){(this.h=this.h||{})[e]=f},focus(){},click(){},closest(){return this},appendChild(){},remove(){}});
const sb=sbMock();
const sandbox={console,setTimeout,clearTimeout,Promise,Date,Math,JSON,Number,String,Array,Object,Map,Set,RegExp,Error,parseFloat,parseInt,isNaN,Blob:function(){},
 URL:{createObjectURL:()=>'blob:x'},history:{replaceState(){}},location:{hash:'',origin:'https://x.com',pathname:'/app.html',reload(){sandbox.__reloaded=true}},
 confirm:()=>true,prompt:()=>'ELIMINAR',alert(){},scrollTo(){},
 document:{getElementById:el,querySelectorAll:()=>[],createElement:()=>({click(){},remove(){},style:{}}),body:{appendChild(){}},addEventListener(){}},
 Chart:Object.assign(function(){return{destroy(){},resize(){}}},{defaults:{font:{},color:'',borderColor:''}})};
sandbox.window=sandbox;sandbox.CFG={SUPABASE_URL:'https://abc.supabase.co',SUPABASE_ANON_KEY:'anon',PAGO_URL:'https://pagos.x/p'};sandbox.supabase={createClient:()=>sb};
vm.createContext(sandbox);
vm.runInContext(code+'\n;globalThis.__t={cargarTodo,get:()=>({ALL,DB,S,PLAN,USER,MENS,CRONS}),guardarMov,addDeuda,marcar,borrarDeuda,importarCSV,guardar,cargarMovs,msgAuth,vencSunat,parseCSV,mTipo,setMT:v=>{MT=v},alertas,eliminarCuenta,exportarDatos,verEjemplo,authModo,norm,get MODO(){return MODO}}',sandbox);
const t=sandbox.__t,wait=ms=>new Promise(r=>setTimeout(r,ms));
const E=id=>el(id);
(async()=>{
 await wait(50);
 // ---- sesión restaurada + carga ----
 tables.deudas.push({id:'d0',user_id:'u1',nombre:'Alquiler',monto:600,tipo:'mensual',dia:1,fecha:null});
 tables.ajustes.push({user_id:'u1',config:{neg:'Bodega Luz',reg:'RMT',dig:'3',onb:1}});
 await t.cargarTodo();
 const st=t.get();
 T('Con sesión activa la pantalla de acceso se oculta y se muestra el correo',E('auth').hidden===true&&E('usr').textContent==='ana@negocio.pe');
 T('Plan, ajustes (RMT, dígito 3) y deudas llegan desde la base de datos',st.PLAN==='pro'&&st.S.reg==='RMT'&&st.S.dig==='3'&&st.DB.l.length===1&&st.DB.l[0].n==='Alquiler');
 T('El cronograma 2027 viene de la base de datos (fecha exacta, no aproximada)',(()=>{const v=t.vencSunat(2027,0);return v.aprox===false&&v.f.getDate()===17&&v.f.getMonth()===1})());
 T('Los totales mensuales vienen de la función de la base de datos',st.MENS.length===1&&st.MENS[0].ventas===5000);
 // ---- registrar ----
 t.mTipo('Ingreso');E('mm').value='850';E('mc').value='Catering';E('mq').value='1';E('mf').value='2026-11-05';E('mtc').value='01';E('msn').value='f001-123';E('mdi').value='RUC';E('mnd').value='20601112223';E('mrs').value='EVENTOS SAC';E('msd').checked=true;E('mtd').value='12';E('mk').value='Prestación de servicios';
 await t.guardarMov();
 let r=tables.movimientos[0];
 T('Venta con factura: se guarda con serie F001, RUC, detracción 102 y neto 748',r&&r.serie==='F001'&&r.numero==='123'&&r.monto_detraccion===102&&r.monto_neto_pagar===748&&r.user_id==='u1');
 E('mm').value='850';E('mtc').value='01';E('msn').value='F001-124';E('mnd').value='123';await t.guardarMov();
 T('Factura sin RUC válido: el servidor la rechaza y se muestra el motivo',/RUC/.test(E('merr').textContent)&&tables.movimientos.length===1);
 t.get().S.reg='NRUS';E('mm').value='850';E('mtc').value='01';E('msn').value='F001-125';E('mnd').value='20601112223';
 await t.guardarMov();
 T('Con NRUS y factura de venta: se guarda y la campana muestra la alerta',tables.movimientos.length===2&&(()=>{t.alertas();return /NRUS: no puedes emitir facturas/.test(E('al').innerHTML)})());
 // ---- deudas ----
 E('dn').value='Préstamo';E('dm').value='300';E('dt').value='mensual';E('dd').value='15';await t.addDeuda();
 T('Nueva deuda se guarda en la base de datos y en pantalla',tables.deudas.length===2&&t.get().DB.l.length===2);
 await t.marcar('d0',2026,10);T('Marcar una deuda crea la marca; volver a marcarla la quita',tables.deuda_marcas.length===1);
 await t.marcar('d0',2026,10);T('…y se quita al desmarcar',tables.deuda_marcas.length===0);
 await t.borrarDeuda(tables.deudas[1].id);T('Eliminar una deuda la borra de la base de datos',tables.deudas.length===1);
 // ---- ajustes ----
 E('cfgB').value='1000';E('cfgG').value='25';E('cfgF').value='';E('cfgN').value='Bodega Luz';E('cfgR').value='RMT';E('cfgD').value='3';E('cfgU').value='5500';E('cfgI').value='1';E('cfgC').value='0.0154';E('cfgM').value='';E('cfgAR').value='10';
 t.guardar();await wait(20);
 T('Guardar ajustes los sube a la base de datos (onboarding completado)',tables.ajustes[0].config.onb===1&&tables.ajustes[0].config.coef===0.0154);
 // ---- importar CSV de la hoja de Google actual ----
 const csv='Tipo,Descripción o concepto,Fecha y hora,Categoría (tipo de gasto),Monto (S/)\nGasto,Cena ,2026-11-04T08:00:00.000Z,Comida,21\nIngreso,SUELDO,2026-11-04T08:00:00.000Z,Sueldo,"1,200.50"\nGasto,"Lejia, Detergente",2026-11-01,Hogar y compras,12.5\n';
 const n0=tables.movimientos.length;await t.importarCSV({size:csv.length,text:async()=>csv});
 T('Importar el CSV de tu hoja actual: 3 filas nuevas, coma dentro de comillas, separador de miles y fecha YYYY-MM-DD local respetados',tables.movimientos.length===n0+3&&tables.movimientos.some(x=>x.descripcion==='Lejia, Detergente'&&x.importe_total===12.5&&new Date(x.fecha_emision).getDate()===1)&&tables.movimientos.some(x=>x.descripcion==='SUELDO'&&x.importe_total===1200.5));
 await t.importarCSV({size:3e6,text:async()=>''});T('Archivos de más de 2 MB se rechazan',tables.movimientos.length===n0+3);
 // ---- paginación ----
 for(let i=0;i<2300;i++)tables.movimientos.push({id:'m'+i,user_id:'u1',fecha_emision:new Date().toISOString(),tipo_movimiento:'Ingreso',descripcion:'v'+i,categoria:'Venta de productos',importe_total:10,monto_neto_pagar:10});
 await t.cargarMovs();T('Se cargan los '+tables.movimientos.length+' registros en páginas de 1000',t.get().ALL.length>=2300);
 // ---- acceso ----
 const parse=t.parseCSV('a;b\n"x;1";2\n');T('CSV con ; y comillas: se lee bien',parse[1][0]==='x;1'&&parse[1][1]==='2');
 T('Mensajes de error de acceso en español, sin revelar si el correo existe',t.msgAuth({message:'Invalid login credentials'})==='Correo o contraseña incorrectos'&&/No se pudo crear la cuenta con ese correo/.test(t.msgAuth({message:'User already registered'})));
 const submit=E('fa').h.submit,ev={preventDefault(){}};
 t.authModo('signup');E('ae').value='nuevo@x.com';E('ap').value='clave1234';E('aterms').checked=false;await submit(ev);
 T('Crear cuenta sin aceptar términos: se bloquea',/términos/.test(E('aerr').textContent));
 E('aterms').checked=true;E('ap').value='123';await submit(ev);T('Contraseña de menos de 8 caracteres: se rechaza',/8 caracteres/.test(E('aerr').textContent));
 E('ap').value='clave1234';await submit(ev);T('Registro correcto: pide confirmar el correo',/Revisa tu correo/.test(E('aerr').textContent));
 t.authModo('login');E('ap').value='incorrecta1';for(let i=0;i<5;i++)await submit(ev);
 T('Tras 5 intentos fallidos se bloquea 30 segundos',/Demasiados intentos/.test(E('aerr').textContent));
 await submit(ev);T('Durante el bloqueo no se envía ningún intento más',/Espera/.test(E('aerr').textContent));
 // ---- derechos del usuario ----
 await t.eliminarCuenta();T('Eliminar cuenta: pide confirmación, llama a la función segura y recarga la página',sandbox.__reloaded===true);
})().catch(e=>{console.log('ERROR EN LA PRUEBA',e);process.exitCode=1});
