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
  if($('#snapshotDate')) $('#snapshotDate').textContent=state.minDate&&state.maxDate?`${state.minDate} → ${state.maxDate}`:'Snapshot';
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
  ['fModel','fCity','fCampaign','fAudience','fDelivery','fFrom','fTo'].forEach(id=>$('#'+id).addEventListener('change',()=>{renderAll();renderModelRail();}));
  $('#fInterest').addEventListener('input',debounce(renderAll,220));
  $('#trendGranularity').addEventListener('change',renderOverview);
  $('#creativeSort').addEventListener('change',renderCreatives);
  $('#clearModel').addEventListener('click',()=>{$('#fModel').value='';renderAll();renderModelRail();});
}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
function filterData(){
  const model=$('#fModel').value,city=$('#fCity').value,camp=$('#fCampaign').value,aud=$('#fAudience').value,del=$('#fDelivery').value,from=$('#fFrom').value,to=$('#fTo').value,interest=$('#fInterest').value.trim().toLowerCase();
  state.current=state.perfEnriched.filter(r=>{
    if(model&&r.__model!==model)return false;
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
  filterData();
  renderOverview();
  renderAudiences();
  renderCampaigns();
  renderCreatives();
  renderHealth();
  updateHero();
}

function modelType(name){
  if(/PCX|DIO|ADV/i.test(name))return 'scooter';
  if(/NX|XR|XRE/i.test(name))return 'adventure';
  if(/WAVE|DREAM|NAVI/i.test(name))return 'commuter';
  return 'street';
}
function bikeSvg(name){
  const type=modelType(name);
  const body=type==='scooter'
    ?'M74 64 C92 43 125 37 158 43 L183 62 L157 73 L117 72 L98 82 L74 78 Z'
    :type==='adventure'
    ?'M70 67 L105 47 L151 45 L178 58 L156 70 L119 66 L96 82 L70 78 Z'
    :type==='commuter'
    ?'M75 65 L103 53 L148 52 L172 62 L151 70 L112 68 L94 81 L72 77 Z'
    :'M72 66 L105 49 L151 47 L180 60 L155 71 L114 69 L93 82 L70 78 Z';
  const tank=type==='scooter'
    ?'<path d="M120 43 C139 36 158 39 170 50 L154 61 L127 59 Z" fill="url(#redg)"/>'
    :'<path d="M111 45 C126 35 151 36 164 48 L151 58 L119 57 Z" fill="url(#redg)"/>';
  const wind=(type==='adventure'||type==='scooter')?'<path d="M165 39 L176 57 L164 55 Z" fill="rgba(190,210,225,.65)" stroke="rgba(255,255,255,.8)" stroke-width="1"/>':'';
  return `<svg viewBox="0 0 240 120" role="img" aria-label="${escapeAttr(name)} render 3D estilizado"><defs><linearGradient id="redg" x1="0" x2="1"><stop offset="0" stop-color="#ff2941"/><stop offset=".55" stop-color="#e40521"/><stop offset="1" stop-color="#8e0013"/></linearGradient><linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#272727"/><stop offset=".5" stop-color="#777"/><stop offset="1" stop-color="#111"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".35"/></filter></defs><ellipse cx="122" cy="100" rx="94" ry="9" fill="rgba(0,0,0,.16)"/><g filter="url(#sh)"><circle cx="67" cy="84" r="25" fill="#111"/><circle cx="67" cy="84" r="16" fill="#d7d7d7"/><circle cx="67" cy="84" r="7" fill="#444"/><circle cx="180" cy="84" r="25" fill="#111"/><circle cx="180" cy="84" r="16" fill="#d7d7d7"/><circle cx="180" cy="84" r="7" fill="#444"/><path d="M67 83 L101 58 L137 84 L180 84" fill="none" stroke="url(#metal)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M112 58 L91 84 M114 59 L146 84" fill="none" stroke="#555" stroke-width="5" stroke-linecap="round"/><path d="${body}" fill="url(#redg)" stroke="rgba(255,255,255,.22)" stroke-width="1.3"/>${tank}<path d="M104 46 L143 45" stroke="#171717" stroke-width="7" stroke-linecap="round"/><path d="M169 58 L177 35 L192 31" stroke="#333" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M190 31 L203 33" stroke="#222" stroke-width="3" stroke-linecap="round"/>${wind}<circle cx="178" cy="59" r="6" fill="#f6f2d8"/></g></svg>`;
}
function renderModelRail(){
  const current=$('#fModel').value;
  const models=(state.modelStats||[]).slice(0,12);
  $('#modelRail').innerHTML=models.map((m,i)=>`<button class="model-card ${current===m.key?'active':''}" data-model="${escapeAttr(m.key)}" style="--delay:${i*20}ms"><div class="model-card-top"><span>${escapeHtml(m.key)}</span><small>${fmtMoney.format(m.spend)}</small></div><div class="model-art">${bikeSvg(m.key)}</div><div class="model-card-foot"><b>${fmtNum.format(m.leads)}</b><span>leads</span><i>${m.leads?fmtMoney.format(m.cpl):'—'} CPL</i></div></button>`).join('');
  $('.model-card').forEach(btn=>btn.addEventListener('click',()=>{$('#fModel').value=btn.dataset.model;renderAll();renderModelRail();}));
}
function updateHero(){
  const selected=$('#fModel').value;
  const top=groupBy(state.current,r=>r.__model).filter(x=>x.key!=='OTRO / SIN CLASIFICAR').sort((a,b)=>b.spend-a.spend)[0];
  const display=selected||top?.key||'PCX160';
  $('#heroModelName').textContent=selected?display:'PORTAFOLIO HONDA';
  $('#heroBike').innerHTML=bikeSvg(display);
}
async function bootstrapHonda(){
  try{
    showLoading(true);
    const data=await window.HONDA_DATA_READY;
    hydrateSnapshot(data);
    prepareData();
    initFilters();
    renderAll();
    renderModelRail();
    if($('#statusText'))$('#statusText').textContent='Snapshot conectado';
  }catch(err){
    console.error(err);
    if($('#statusText'))$('#statusText').textContent='Error de snapshot';
    alert('No pude cargar el snapshot integrado. Revisa el deployment.');
  }finally{
    showLoading(false);
  }
}
