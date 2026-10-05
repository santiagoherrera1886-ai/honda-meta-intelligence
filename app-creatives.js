function filteredCreatives(){const model=$('#fModel').value,city=$('#fCity').value,camp=$('#fCampaign').value,aud=$('#fAudience').value;const uniqueAds=[...new Map(state.ads.filter(ad=>s(get(ad,'Ad ID'))).map(ad=>[s(get(ad,'Ad ID')),ad])).values()];return uniqueAds.map(ad=>{const ap=state.adPerfMap.get(s(get(ad,'Ad ID')))||{};const seg=state.segMap.get(s(get(ad,'Ad Set ID')))||{};const mod=classifyModel(get(ad,'Modelo'),get(ad,'Anuncio'),get(ad,'Conjunto'),get(ad,'Campaña'),get(seg,'Modelo'));const aGroup=audienceGroup(seg);return {ad,ap,seg,model:mod,group:aGroup,audience:audienceClass(seg),spend:n(get(ap,'Inversión')),leads:n(get(ap,'Leads')),ctr:n(get(ap,'CTR')),cpl:n(get(ap,'Leads'))?n(get(ap,'Inversión'))/n(get(ap,'Leads')):0}}).filter(x=>{if(model&&x.model!==model)return false;if(city&&!(x.seg.__cities||[]).includes(city))return false;if(camp&&s(get(x.ad,'Campaña'))!==camp)return false;if(aud&&x.audience!==aud)return false;if(state.segment!=='Todos'&&x.group!==state.segment)return false;return true})}
function renderCreatives(){let items=filteredCreatives();const sort=$('#creativeSort').value;items.sort((a,b)=>sort==='leads'?b.leads-a.leads:sort==='ctr'?b.ctr-a.ctr:sort==='cpl'?(a.cpl||1e18)-(b.cpl||1e18):b.spend-a.spend);items=items.filter(x=>x.spend>0||x.leads>0||x.ctr>0||s(get(x.ad,'Preview URL'))).slice(0,40);$('#creativeEmpty').classList.toggle('hidden',items.length>0);$('#creativeGrid').innerHTML=items.map((x,i)=>{const ad=x.ad,thumb=s(get(ad,'Thumbnail URL')),preview=s(get(ad,'Preview URL')),ig=s(get(ad,'Instagram Permalink'));return `<article class="creative"><div class="creative-media">${thumb?`<img src="${escapeAttr(thumb)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="fallback" style="display:none">🏍️</div>`:'<div class="fallback">🏍️</div>'}<span class="creative-rank">#${i+1}</span></div><div class="creative-body"><div class="creative-name" title="${escapeHtml(get(ad,'Anuncio'))}">${escapeHtml(get(ad,'Anuncio')||'Anuncio')}</div><div class="creative-meta">${escapeHtml(x.model)} · ${escapeHtml(x.group)} · ${escapeHtml(short(get(ad,'Conjunto'),32))}</div><div class="creative-kpis"><div class="ck"><small>Spend</small><b>${fmtMoney.format(x.spend)}</b></div><div class="ck"><small>Leads</small><b>${fmtNum.format(x.leads)}</b></div><div class="ck"><small>${x.leads?'CPL':'CTR'}</small><b>${x.leads&&x.cpl?fmtMoney.format(x.cpl):fmt2.format(x.ctr)+'%'}</b></div></div><div class="creative-actions">${preview?`<a href="${escapeAttr(preview)}" target="_blank" rel="noopener">Ver preview</a>`:'<a style="opacity:.35;pointer-events:none">Sin preview</a>'}${ig?`<a class="secondary" href="${escapeAttr(ig)}" target="_blank" rel="noopener">Instagram</a>`:''}</div></div></article>`}).join('')}
function renderHealth(){const adsetsPerf=new Set(state.perfEnriched.map(r=>s(get(r,'Ad Set ID'))));const segCoverage=[...adsetsPerf].filter(id=>state.segMap.has(id)).length;const uniqueAds=[...new Map(state.ads.filter(r=>s(get(r,'Ad ID'))).map(r=>[s(get(r,'Ad ID')),r])).values()];const adsWithPreview=uniqueAds.filter(r=>s(get(r,'Preview URL'))).length;const adsWithPerf=uniqueAds.filter(r=>state.adPerfMap.has(s(get(r,'Ad ID')))).length;const classified=state.perfEnriched.filter(r=>r.__model!=='OTRO / SIN CLASIFICAR').length;$('#healthCards').innerHTML=[healthCard('Performance diario',fmtNum.format(state.perfEnriched.length),'filas',true),healthCard('Cobertura segmentación',pct(segCoverage,adsetsPerf.size),'de Ad Sets con performance',segCoverage/adsetsPerf.size>.9),healthCard('Modelo clasificado',pct(classified,state.perfEnriched.length),'de filas performance',classified/state.perfEnriched.length>.8)].join('');const checks=[['Snapshot integrado','OK',`Performance ${state.perf.length.toLocaleString('es-CO')} · Segmentaciones ${state.seg.length.toLocaleString('es-CO')} · Creativos ${state.ads.length.toLocaleString('es-CO')}`],['Cruce Ad Set → segmentación',segCoverage===adsetsPerf.size?'OK':'Revisar',`${segCoverage} de ${adsetsPerf.size} Ad Sets con targeting disponible`],['Preview de anuncios',adsWithPreview?'OK':'Revisar',`${adsWithPreview} de ${uniqueAds.length} anuncios únicos incluyen URL de preview`],['Performance creativo',adsWithPerf?'OK':'Revisar',`${adsWithPerf} anuncios cruzan con META_ADS_PERFORMANCE`],['Clasificación de modelos',classified/state.perfEnriched.length>.8?'OK':'Revisar',`${pct(classified,state.perfEnriched.length)} de filas clasificadas. El dashboard agrega reglas para CB300F, CB190R, NAVI, X-BLADE, WAVE, DREAM, CB110 y NT1100.`],['Alcance histórico','Nota','El alcance diario sumado puede duplicar personas entre días. Se muestra como Alcance diario* y la frecuencia es un proxy cuando se agrupan periodos.']];$('#healthTable').innerHTML=checks.map(x=>`<tr><td><b>${x[0]}</b></td><td>${x[1]==='OK'?'<span style="color:#138a61;font-weight:800">● OK</span>':x[1]==='Revisar'?'<span style="color:#b97800;font-weight:800">● Revisar</span>':'<span style="color:#777;font-weight:800">● Nota</span>'}</td><td>${escapeHtml(x[2])}</td></tr>`).join('')}
function healthCard(label,value,sub,ok){return `<div class="panel"><div class="panel-note">${label}</div><div style="font-size:30px;font-weight:850;letter-spacing:-.04em;margin:8px 0;color:${ok?INK:AMBER}">${value}</div><div class="panel-note">${sub}</div></div>`}
function pct(a,b){return b?fmt1.format(a/b*100)+'%':'0%'}
function short(v,len=38){v=s(v);return v.length>len?v.slice(0,len-1)+'…':v}
function escapeHtml(v){return s(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function escapeAttr(v){return escapeHtml(v)}
function switchSection(id,opts={}){
  $('.section').forEach(x=>x.classList.toggle('active',x.id===id));
  if(opts.hash!==false){
    history.replaceState(null,'',`#${id}`);
  }

  // Sidebar state
  $$('[data-section], [data-jump]').forEach(x=>x.classList.remove('active'));
  const activeSection=document.querySelector(`[data-section="${id}"]`);
  if(activeSection) activeSection.classList.add('active');

  // Overview has the brand hero/model rail. Analysis pages start directly at filters/results.
  document.body.classList.toggle('subpage-mode',id!=='overview');

  const titles={
    overview:'Meta performance command center',
    modelsView:'Performance por modelo',
    audiences:'Audience intelligence',
    campaigns:'Campaign performance',
    creatives:'Creative performance gallery',
    citiesView:'Inversión por ciudad',
    data:'Data health & coverage'
  };
  $('#pageTitle').textContent=titles[id]||titles.overview;

  if(id==='overview') setTimeout(renderOverview,30);
  if(id==='modelsView') setTimeout(()=>{renderModelsPage();renderModelRail();},30);
  if(id==='audiences') setTimeout(renderAudiences,30);
  if(id==='campaigns') setTimeout(renderCampaigns,30);
  if(id==='creatives') setTimeout(renderCreatives,30);
  if(id==='citiesView') setTimeout(renderCitiesPage,30);
  if(id==='data') setTimeout(renderHealth,30);

  if(opts.scroll!==false){
    requestAnimationFrame(()=>{
      const target=id==='overview'
        ? document.querySelector('.hero')
        : document.querySelector('.filters-shell');
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
}

function setupNav(){
  const items=[
    ['overview','Overview'],
    ['modelsView','Modelos'],
    ['audiences','Audiencias'],
    ['campaigns','Campañas'],
    ['creatives','Creatividades'],
    ['citiesView','Ciudades'],
    ['data','Data Health']
  ];

  $('#mobileNav').innerHTML=items.map(([id,l],i)=>
    `<button data-section="${id}" class="${i?'':'active'}">${l}</button>`
  ).join('');

  $('[data-section]').forEach(b=>b.addEventListener('click',()=>{
    switchSection(b.dataset.section);
  }));

  $('[data-open-section]').forEach(b=>b.addEventListener('click',()=>{
    switchSection(b.dataset.openSection);
  }));

  $$('[data-jump]').forEach(b=>b.addEventListener('click',()=>{
    switchSection('overview',{scroll:false});

    // Give the jump item its own active state so the sidebar reacts immediately.
    $$('[data-section], [data-jump]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');

    requestAnimationFrame(()=>{
      const target=document.getElementById(b.dataset.jump);
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }));

  $$('.segpill').forEach(b=>b.addEventListener('click',()=>{
    $$('.segpill').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    state.segment=b.dataset.segment;
    renderAll();
  }));
}

window.addEventListener('hashchange',()=>{
  const id=location.hash.replace('#','');
  if(id&&document.getElementById(id)) switchSection(id,{hash:false});
});
bootstrapHonda();
