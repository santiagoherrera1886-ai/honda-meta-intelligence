/* A single router for sidebar, mobile navigation, deep links and browser history. */
const HONDA_VIEWS={
  overview:['Overview','Resumen de performance'],
  modelsView:['Modelos','Performance por modelo'],
  audiences:['Audiencias','Audiencias y segmentación'],
  campaigns:['Campañas','Performance de campañas'],
  creatives:['Creatividades','Creatividades de Meta Ads'],
  citiesView:['Ciudades','Geografía de los conjuntos'],
  data:['Data Health','Calidad y cobertura de datos']
};
function renderActiveSection(){
  if(!state.ready)return;
  const renderers={overview:renderOverview,modelsView:renderModelsPage,audiences:renderAudiences,campaigns:renderCampaigns,creatives:renderCreatives,citiesView:renderCitiesPage,data:renderHealth};
  $('#viewError').hidden=true;
  try{
    // Destroy charts before hiding/replacing a view; only visible canvases are measured.
    Object.values(charts).forEach(chart=>chart.destroy());
    charts={};
    if(state.view==='overview'||state.view==='modelsView')renderModelRail();
    if(state.view==='overview')updateHero();
    renderers[state.view||'overview']();
    $('#statusText').textContent='Snapshot conectado';
  }catch(error){
    console.error('No se pudo mostrar la vista:',state.view,error);
    $('#viewError').hidden=false;
    $('#viewErrorText').textContent='No pudimos mostrar esta sección. Puedes reintentar o abrir otra desde el menú.';
    $('#statusText').textContent='Revisar visualización';
  }
}
function switchSection(requested,opts={}){
  const id=Object.hasOwn(HONDA_VIEWS,requested)?requested:'overview';
  const changed=state.view!==id;
  state.view=id;
  $$('.section').forEach(section=>{
    const active=section.id===id;
    section.classList.toggle('active',active);
    section.hidden=!active;
  });
  $$('[data-section]').forEach(button=>{
    const active=button.dataset.section===id;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  document.body.classList.toggle('subpage-mode',id!=='overview');
  $('#pageTitle').textContent=HONDA_VIEWS[id][1];
  document.title=`${HONDA_VIEWS[id][0]} · Honda Meta Intelligence`;
  if(opts.hash!==false&&location.hash!==`#${id}`)history.pushState(null,'',`#${id}`);
  else if(requested!==id)history.replaceState(null,'',`#${id}`);
  if(opts.render!==false&&changed)renderActiveSection();
  if(opts.scroll!==false)window.scrollTo({top:0,behavior:'instant'});
}
function setupNav(){
  $('#mobileNav').innerHTML=Object.entries(HONDA_VIEWS).map(([id,[label]])=>`<button type="button" data-section="${id}">${label}</button>`).join('');
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-section], [data-open-section]');
    if(nav){event.preventDefault();switchSection(nav.dataset.section||nav.dataset.openSection);return;}
    const model=event.target.closest('.model-card[data-model]');
    if(model){selectHondaModel(model.dataset.model);return;}
    const segment=event.target.closest('[data-segment]');
    if(segment){state.segment=segment.dataset.segment;renderAll();return;}
    const railControl=event.target.closest('[data-rail-direction]');
    if(railControl){moveModelRail(Number(railControl.dataset.railDirection));return;}
    const retry=event.target.closest('#retryView');
    if(retry){if(state.ready)renderAll();else location.reload();return;}
    handleMapAction(event);
  });
  document.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&event.target.matches('svg [role="button"]')){
      event.preventDefault();handleMapAction(event);
    }
  });
  $('#citySearch').addEventListener('input',()=>renderCityRanking());
  window.addEventListener('popstate',()=>switchSection(location.hash.slice(1),{hash:false}));
  window.addEventListener('hashchange',()=>switchSection(location.hash.slice(1),{hash:false}));
  $('#modelRail').addEventListener('scroll',updateRailControls,{passive:true});
  window.addEventListener('resize',debounce(updateRailControls,100));
  setupMapDragging();
  switchSection(location.hash.slice(1),{hash:false,scroll:false,render:false});
}
setupNav();
bootstrapHonda();
