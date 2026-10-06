const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmtMoney=new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
const fmtNum=new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
const fmt1=new Intl.NumberFormat('es-CO',{minimumFractionDigits:1,maximumFractionDigits:1});
const fmt2=new Intl.NumberFormat('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2});
const RED='#e40521', INK='#111111', GRAY='#c9c9c4', GREEN='#138a61', PURPLE='#6b5bbd', AMBER='#b97800';
let charts={};
let state={perf:[],seg:[],ads:[],adPerf:[],segMap:new Map(),adPerfMap:new Map(),perfEnriched:[],current:[],segment:'Todos',fileName:'',minDate:'',maxDate:'',snapshotCities:[],modelStats:[]};
const MODEL_PATTERNS=[['DIO DLX',/DIO[-_ ]?DLX/i],['PCX160',/PCX[-_ ]?160|PCX160/i],['NX190',/NX[-_ ]?190|NX190/i],['XR190L',/XR[-_ ]?190L|XR190L/i],['XR150L',/XR[-_ ]?150L|XR150L/i],['CB125F',/CB[-_ ]?125F|CB125F|CB125STD|CB125DLX/i],['CB100',/CB[-_ ]?100|CB100/i],['XRE300',/XRE[-_ ]?300|XRE300/i],['ADV160',/ADV[-_ ]?160|ADV160/i],['CB300F',/CB[-_ ]?300F|CB300F|CB300(?!\d)/i],['CB190R',/CB[-_ ]?190R|CB190R|CB190(?!\d)/i],['NT1100',/NT[-_ ]?1100|NT1100/i],['CB110',/CB[-_ ]?110|CB110/i],['NAVI',/\bNAVI\b|\bNAVY\b/i],['X-BLADE',/XBLADE|X[-_ ]?BLADE/i],['WAVE',/\bWAVE\b/i],['DREAM',/\bDREAM\b/i],['DIO',/\bDIO\b/i]];
function n(v){if(v===null||v===undefined||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;let x=Number(String(v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0}
function s(v){return v===null||v===undefined?'':String(v).trim()}
function isOther(v){return !v||/OTRO|SIN CLASIFICAR/i.test(v)}
function classifyModel(...parts){
  const text=parts.filter(Boolean).join(' ');
  for(const [name,re] of MODEL_PATTERNS){
    re.lastIndex=0;
    if(re.test(text)) return name;
  }
  const explicit=parts.find(v=>v&&!isOther(v)&&String(v).length<24&&!/[_.]/.test(String(v)));
  return explicit||'OTRO / SIN CLASIFICAR';
}
function excelDate(v){if(!v)return '';if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);if(typeof v==='number'||/^\d+(\.0+)?$/.test(String(v))){const q=n(v);if(q>30000&&q<60000){const d=XLSX.SSF.parse_date_code(q);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`}}const t=s(v);const m=t.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;const d=new Date(t);return isNaN(d)?'':d.toISOString().slice(0,10)}
function get(row,...keys){for(const k of keys)if(row[k]!==undefined&&row[k]!==null&&row[k]!=='')return row[k];return ''}
function boolFlag(v){return /^SI|YES|TRUE|1$/i.test(s(v))}
function audienceClass(row){let a=s(get(row,'Tipo audiencia'));if(a)return a;if(boolFlag(get(row,'Es RMK')))return 'RMK';if(boolFlag(get(row,'Es LKL')))return 'LKL';if(boolFlag(get(row,'Es BBDD')))return 'BBDD';if(boolFlag(get(row,'Es Intereses')))return 'Intereses';return 'Broad'}
function audienceGroup(row){const a=audienceClass(row);if(boolFlag(get(row,'Es RMK'))||/RMK|Remarketing/i.test(a))return 'RMK';if(boolFlag(get(row,'Es LKL'))||/LKL|Lookalike/i.test(a))return 'LKL';if(boolFlag(get(row,'Es BBDD'))||/BBDD|Custom Audience/i.test(a))return 'BBDD';if(boolFlag(get(row,'Es Intereses'))||/Interes/i.test(a))return 'Intereses';return 'Broad'}
function sheetRows(wb,name){const ws=wb.Sheets[name];return ws?XLSX.utils.sheet_to_json(ws,{defval:'',raw:true}):[]}
function showLoading(x){$('#loading').classList.toggle('show',x)}
async function loadFile(file){showLoading(true);await new Promise(r=>setTimeout(r,50));try{const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});state.fileName=file.name;state.perf=sheetRows(wb,'META_PERFORMANCE_DIA');state.seg=sheetRows(wb,'META_SEGMENTACIONES');state.ads=sheetRows(wb,'META_ANUNCIOS');state.adPerf=sheetRows(wb,'META_ADS_PERFORMANCE');if(!state.perf.length)throw new Error('No encontré la hoja META_PERFORMANCE_DIA.');prepareData();initFilters();renderAll();$('#dashboard').classList.remove('hidden');$('#statusDot').classList.add('ok');$('#statusText').textContent='Data cargada';$('#dataBig').textContent=file.name.replace(/\.xlsx?$/i,'');$('#uploadShell').style.gridTemplateColumns='1fr 1fr';}catch(e){console.error(e);alert('No pude leer el archivo: '+e.message)}finally{showLoading(false)}}
function hydrateSnapshot(data){
  const D=data.dict||{};
  const campaign=i=>D.campaign?.[i]||'';
  const campaignId=i=>D.campaignId?.[i]||'';
  const adset=i=>D.adset?.[i]||'';
  const adsetId=i=>D.adsetId?.[i]||'';
  const model=i=>D.model?.[i]||'OTRO / SIN CLASIFICAR';
  const audience=i=>D.audience?.[i]||'';
  const goal=i=>D.goal?.[i]||'';

  state.snapshotCities=data.cities||[];

  state.seg=Object.entries(data.seg||{}).map(([id,x])=>({
    'Ad Set ID':id,
    'Campaña':campaign(x.c),
    'Conjunto de anuncios':adset(x.a),
    'Modelo':model(x.m),
    'Tipo audiencia':x.u||'',
    'Optimization goal':x.g||'',
    'Edad mínima':x.mn||'',
    'Edad máxima':x.mx||'',
    'Género':x.sx||'',
    'Ciudades':(x.ci||[]).join(', '),
    'Ciudades + radio':(x.ci||[]).join(', '),
    '__cities':x.ci||[],
    'Regiones':x.rg||'',
    'Intereses':x.it||'',
    'Behaviors':x.bh||'',
    'Cargos laborales':x.wp||'',
    'Custom Audiences':x.ca||'',
    'Custom Audiences excluidas':x.ex||'',
    'Es RMK':x.rm||'',
    'Es LKL':x.lk||'',
    'Es BBDD':x.bb||'',
    'Es Intereses':x.ii||'',
    'Advantage Audience':x.av||''
  }));

  state.perf=(data.perf||[]).map(r=>({
    'Fecha':r[0],
    'Campaign ID':campaignId(r[1]),
    'Campaña':campaign(r[2]),
    'Ad Set ID':adsetId(r[3]),
    'Conjunto':adset(r[4]),
    'Modelo':model(r[5]),
    'Tipo audiencia':audience(r[6]),
    'Optimization goal':goal(r[7]),
    'Resultado principal':goal(r[7]),
    'Inversión':r[8],
    'Impresiones':r[9],
    'Alcance diario':r[10],
    'Clicks':r[11],
    'Link Clicks':r[12],
    'Unique Clicks':r[13],
    'Outbound Clicks':r[14],
    'Landing Page Views':r[15],
    'Leads':r[16],
    'Resultados':r[17]
  }));

  state.ads=(data.ads||[]).map(r=>({
    'Ad ID':r[0],
    'Anuncio':r[1],
    'Ad Set ID':r[2],
    'Campaña':campaign(r[3]),
    'Conjunto':adset(r[4]),
    'Modelo':model(r[5]),
    'Thumbnail URL':r[6],
    'Preview URL':r[7],
    'Instagram Permalink':r[8]
  }));

  state.adPerf=(data.ads||[]).map(r=>({
    'Ad ID':r[0],
    'Inversión':r[9],
    'Impresiones':r[10],
    'Alcance':r[11],
    'Clicks':r[12],
    'Link Clicks':r[13],
    'Leads':r[14],
    'CTR':r[15],
    'CPC':r[16],
    'CPM':r[17]
  }));
}
function prepareData(){
  state.segMap=new Map();
  state.seg.forEach(r=>{
    const id=s(get(r,'Ad Set ID'));
    if(!id)return;
    r.__model=classifyModel(get(r,'Modelo'),get(r,'Conjunto de anuncios'),get(r,'Campaña'));
    r.__audience=audienceClass(r);
    r.__group=audienceGroup(r);
    state.segMap.set(id,r);
  });
  state.adPerfMap=new Map(state.adPerf.map(r=>[s(get(r,'Ad ID')),r]));
  state.perfEnriched=state.perf.map(r=>{
    const aid=s(get(r,'Ad Set ID'));
    const seg=state.segMap.get(aid)||{};
    const date=s(get(r,'Fecha')).slice(0,10);
    const model=classifyModel(get(r,'Modelo'),get(r,'Conjunto'),get(r,'Campaña'),get(seg,'Modelo'));
    return {...r,__date:date,__model:model,__seg:seg,__cities:seg.__cities||[],__audience:audienceClass(Object.assign({},seg,r)),__group:audienceGroup(Object.assign({},seg,r)),__delivery:s(get(r,'Optimization goal','Resultado principal'))};
  }).filter(r=>r.__date);
  const dates=state.perfEnriched.map(r=>r.__date).sort();
  state.minDate=dates[0]||'';
  state.maxDate=dates.at(-1)||'';
  state.modelStats=groupBy(state.perfEnriched,r=>r.__model).filter(x=>x.key&&x.key!=='OTRO / SIN CLASIFICAR').sort((a,b)=>b.spend-a.spend);
  const periodLabel=state.minDate&&state.maxDate?`${state.minDate} → ${state.maxDate}`:'Snapshot';
  if($('#snapshotDate')) $('#snapshotDate').textContent=periodLabel;
  if($('#heroPeriod')) $('#heroPeriod').textContent=periodLabel;
  if($('#sidebarPeriod')) $('#sidebarPeriod').textContent=periodLabel;
  if($('#sidebarRows')) $('#sidebarRows').textContent=`${fmtNum.format(state.perfEnriched.length)} filas · ${fmtNum.format(new Set(state.perfEnriched.map(r=>s(get(r,'Ad Set ID')))).size)} Ad Sets · ${fmtNum.format(state.ads.length)} creativos`;
  if($('#heroRows')) $('#heroRows').textContent=fmtNum.format(state.perfEnriched.length);
  if($('#heroAdsets')) $('#heroAdsets').textContent=fmtNum.format(new Set(state.perfEnriched.map(r=>s(get(r,'Ad Set ID')))).size);
  if($('#heroAds')) $('#heroAds').textContent=fmtNum.format(state.ads.length);
}
function uniq(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es'))}
function setOptions(el,arr,all='Todos'){el.innerHTML=`<option value="">${all}</option>`+arr.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}
function initFilters(){
  setOptions($('#fModel'),state.modelStats.map(x=>x.key));
  setOptions($('#fCity'),state.snapshotCities||[],'Todas las ciudades');
  setOptions($('#fCampaign'),uniq(state.perfEnriched.map(r=>s(get(r,'Campaña')))),'Todas');
  setOptions($('#fAudience'),uniq(state.perfEnriched.map(r=>r.__audience)));
  setOptions($('#fDelivery'),uniq(state.perfEnriched.map(r=>r.__delivery)));
  $('#fFrom').value=state.minDate;
  $('#fTo').value=state.maxDate;
  ['fModel','fCity','fCampaign','fAudience','fDelivery','fFrom','fTo'].forEach(id=>$('#'+id).addEventListener('change',renderAll));
  $('#fInterest').addEventListener('input',debounce(renderAll,220));
  $('#trendGranularity').addEventListener('change',renderOverview);
  $('#creativeSort').addEventListener('change',renderCreatives);
  if($('#clearModel')) $('#clearModel').addEventListener('click',()=>selectHondaModel(''));
  if($('#resetModelPage')) $('#resetModelPage').addEventListener('click',()=>selectHondaModel(''));
  $('#resetFilters').addEventListener('click',resetFilters);
}
function resetFilters(){
  ['fModel','fCity','fCampaign','fAudience','fDelivery','fInterest'].forEach(id=>$('#'+id).value='');
  $('#fFrom').value=state.minDate;
  $('#fTo').value=state.maxDate;
  state.segment='Todos';
  $('#citySearch').value='';
  state.allCities=false;
  Object.values(mapViews).forEach(view=>Object.assign(view,MAP_HOME));
  renderAll();
}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
function filterData(ignoreModel=false){
  const model=$('#fModel').value,city=$('#fCity').value,camp=$('#fCampaign').value,aud=$('#fAudience').value,del=$('#fDelivery').value,from=$('#fFrom').value,to=$('#fTo').value,interest=$('#fInterest').value.trim().toLowerCase();
  return state.perfEnriched.filter(r=>{
    if(!ignoreModel&&model&&r.__model!==model)return false;
    if(city&&!(r.__cities||[]).includes(city))return false;
    if(camp&&s(get(r,'Campaña'))!==camp)return false;
    if(aud&&r.__audience!==aud)return false;
    if(del&&r.__delivery!==del)return false;
    if(from&&r.__date<from)return false;
    if(to&&r.__date>to)return false;
    if(state.segment!=='Todos'&&r.__group!==state.segment)return false;
    if(interest){
      const seg=r.__seg||{};
      const hay=(s(get(seg,'Intereses'))+' '+s(get(seg,'Behaviors'))+' '+s(get(seg,'Cargos laborales'))).toLowerCase();
      if(!hay.includes(interest))return false;
    }
    return true;
  });
}
function agg(rows){const o={spend:0,impressions:0,reach:0,clicks:0,linkClicks:0,uniqueClicks:0,outbound:0,lpv:0,leads:0,results:0};rows.forEach(r=>{o.spend+=n(get(r,'Inversión'));o.impressions+=n(get(r,'Impresiones'));o.reach+=n(get(r,'Alcance diario','Alcance'));o.clicks+=n(get(r,'Clicks'));o.linkClicks+=n(get(r,'Link Clicks'));o.uniqueClicks+=n(get(r,'Unique Clicks'));o.outbound+=n(get(r,'Outbound Clicks'));o.lpv+=n(get(r,'Landing Page Views'));o.leads+=n(get(r,'Leads'));o.results+=n(get(r,'Resultados'))});o.cpl=o.leads?o.spend/o.leads:0;o.ctr=o.impressions?o.clicks/o.impressions*100:0;o.cpc=o.clicks?o.spend/o.clicks:0;o.cpm=o.impressions?o.spend/o.impressions*1000:0;o.freq=o.reach?o.impressions/o.reach:0;o.cvr=o.linkClicks?o.leads/o.linkClicks*100:0;o.lpvRate=o.linkClicks?o.lpv/o.linkClicks*100:0;return o}
function groupBy(rows,keyFn){const m=new Map();rows.forEach(r=>{const k=keyFn(r)||'Sin clasificar';if(!m.has(k))m.set(k,[]);m.get(k).push(r)});return [...m.entries()].map(([key,rs])=>({key,rows:rs,...agg(rs)}))}
function renderAll(){
  state.current=filterData();
  $$('.segpill').forEach(b=>{
    const active=b.dataset.segment===state.segment;
    b.classList.toggle('active',active);
    b.setAttribute('aria-pressed',String(active));
  });
  $('#filterSummary').textContent=`${fmtNum.format(state.current.length)} registros · ${$('#fModel').value||'Todos los modelos'} · ${$('#fCity').value||'Todas las ubicaciones'}`;
  const invalidDates=$('#fFrom').value && $('#fTo').value && $('#fFrom').value>$('#fTo').value;
  $('#filterValidation').textContent=invalidDates?'La fecha «Desde» debe ser anterior o igual a «Hasta».':'';
  $('#filterValidation').hidden=!invalidDates;
  renderActiveSection();
}

const MODEL_ASSETS={
  'CB100':{
    img:'https://motocicletas.honda.com.co/images/cms/cb-100-gris.png',
    label:'CB 100'
  },
  'CB125F':{
    img:'https://d3lewjhzzgclom.cloudfront.net/sites/default/files/csv_import/images/honda-cb125f-20-std-rojo1_3.png',
    fallbacks:[
      'https://motocicletas.honda.com.co/images/cms/cb125f-rojo.png',
      'https://motocicletas.honda.com.co/images/cms/cb125f.png'
    ],
    label:'CB 125F'
  },
  'PCX160':{
    img:'https://motocicletas.honda.com.co/images/cms/Azul-8194f.png',
    label:'PCX 160 ABS'
  },
  'CB300F':{
    img:'https://motocicletas.honda.com.co/images/cms/Nueva-CB-300F-rojo.png',
    label:'CB 300F'
  },
  'XR150L':{
    img:'https://d3lewjhzzgclom.cloudfront.net/sites/default/files/csv_import/images/XR150L-20-blanco-version_3.png',
    fallbacks:[
      'https://motocicletas.honda.com.co/images/cms/xr150l-blanca.png',
      'https://motocicletas.honda.com.co/images/cms/xr150l.png'
    ],
    label:'XR 150L'
  },
  'XR190L':{
    img:'https://tienda.honda.com.co/dw/image/v2/BFKT_PRD/on/demandware.static/-/Sites-FanalcaSA_CO-catalog/default/dw41660fb4/images/large/nueva-honda-xr190l-20-ecommerce.jpg?sh=550&sm=fit&sw=550',
    label:'XR 190L'
  },
  'WAVE':{
    img:'https://d3lewjhzzgclom.cloudfront.net/sites/default/files/csv_import/images/nueva-honda-wave-110-negra3_3.png',
    fallbacks:[
      'https://motocicletas.honda.com.co/images/cms/nueva-honda-wave-110-negra3.png',
      'https://motocicletas.honda.com.co/images/cms/wave-110s-negra.png'
    ],
    label:'WAVE 110S'
  },
  'DIO DLX':{
    img:'https://motocicletas.honda.com.co/images/cms/nueva-dio-dlx-gris.png',
    label:'DIO LED DLX'
  },
  'DIO':{
    img:'https://motocicletas.honda.com.co/images/cms/nueva-dio-dlx-gris.png',
    label:'DIO'
  }
};

function modelAsset(name){
  return MODEL_ASSETS[name]||{label:name,img:''};
}
function hondaBikeFallback(img){
  const name=img.dataset.model||'';
  const asset=modelAsset(name);
  const fallbacks=asset.fallbacks||[];
  const index=Number(img.dataset.fallbackIndex||0);

  if(index<fallbacks.length){
    img.dataset.fallbackIndex=String(index+1);
    img.src=fallbacks[index];
    return;
  }

  img.style.display='none';
  const fallback=img.parentElement?.querySelector('.bike-fallback');
  if(fallback) fallback.classList.add('show');
}

function bikeMedia(name,hero=false){
  const asset=modelAsset(name);
  return `<div class="real-bike ${hero?'real-bike-hero':''}">
    <div class="bike-orbit"></div>
    <div class="bike-stage"></div>
    ${asset.img?`<img src="${escapeAttr(asset.img)}"
      data-model="${escapeAttr(name)}"
      data-fallback-index="0"
      alt="Honda ${escapeAttr(asset.label)}"
      loading="${hero?'eager':'lazy'}"
      onerror="hondaBikeFallback(this)">`:''}
    <div class="bike-fallback ${asset.img?'':'show'}">
      <span>HONDA</span>
      <strong>${escapeHtml(asset.label||name)}</strong>
      <small>Imagen oficial no disponible</small>
    </div>
    <div class="bike-specular"></div>
  </div>`;
}
function modelCardMarkup(m,i,current){
  const asset=modelAsset(m.key);
  return `<button type="button" class="model-card premium-model ${current===m.key?'active':''}" data-model="${escapeAttr(m.key)}" aria-pressed="${current===m.key}" aria-label="Filtrar por ${escapeAttr(asset.label||m.key)}" style="--delay:${i*20}ms">
    <div class="model-card-top">
      <span>${escapeHtml(asset.label||m.key)}</span>
      <small>${fmtMoney.format(m.spend)}</small>
    </div>
    <div class="model-art">${bikeMedia(m.key,false)}</div>
    <div class="model-card-foot">
      <b>${fmtNum.format(m.leads)}</b><span>leads</span>
      <i>${m.leads?fmtMoney.format(m.cpl):'—'} CPL</i>
    </div>
    <div class="official-chip">HONDA · MODELO REAL</div>
  </button>`;
}
function selectHondaModel(model){
  const select=$('#fModel');
  if(!select)return;
  select.value=model||'';
  renderAll();
}
function renderModelRail(){
  const current=$('#fModel').value;
  const filteredStats=new Map(groupBy(filterData(true),r=>r.__model).map(x=>[x.key,x]));
  const models=(state.modelStats||[]).map(m=>filteredStats.get(m.key)||{key:m.key,...agg([])});
  const markup=models.map((m,i)=>modelCardMarkup(m,i,current)).join('');
  const rail=state.view==='modelsView'?$('#modelRailPage'):$('#modelRail');
  if(rail){const position=rail.scrollLeft;rail.innerHTML=markup;rail.scrollLeft=position;}
}
function updateHero(){
  const selected=$('#fModel').value;
  const top=groupBy(state.current,r=>r.__model).filter(x=>x.key!=='OTRO / SIN CLASIFICAR').sort((a,b)=>b.spend-a.spend)[0];
  const display=selected||top?.key||'CB300F';
  const asset=modelAsset(display);
  $('#heroModelName').textContent=selected?(asset.label||display):'PORTAFOLIO HONDA';
  if($('#heroBike').dataset.model!==display){
    $('#heroBike').innerHTML=bikeMedia(display,true);
    $('#heroBike').dataset.model=display;
  }
}
async function bootstrapHonda(){
  try{
    showLoading(true);
    const data=await window.HONDA_DATA_READY;
    hydrateSnapshot(data);
    prepareData();
    initFilters();

    if($('#statusText')) $('#statusText').textContent='Snapshot conectado';

    state.ready=true;
    switchSection(location.hash.slice(1),{scroll:false,hash:false,render:false});
    renderAll();
  }catch(err){
    console.error(err);
    if($('#statusText')) $('#statusText').textContent='Error de snapshot';
    $('#viewError').hidden=false;
    $('#viewErrorText').textContent='No pudimos cargar el snapshot. Recarga la página para volver a intentar.';
  }finally{
    showLoading(false);
  }
}
