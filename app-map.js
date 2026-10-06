/* Map outline and pins share one equirectangular projection and SVG viewBox. */
const MAP_HOME={x:0,y:0,size:500};
const mapViews={overviewCityMap:{...MAP_HOME},cityPageMap:{...MAP_HOME}};
function normalizeCityName(name){return s(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function projectCity(lon,lat){
  const scale=26,cosLat=Math.cos(4*Math.PI/180);
  return [(lon+73)*scale*cosLat+250,(4.07-lat)*scale+250];
}
const countryPath=COLOMBIA_OUTLINE.map(([lon,lat],i)=>`${i?'L':'M'}${projectCity(lon,lat).map(n=>n.toFixed(2)).join(',')}`).join(' ')+' Z';
function cityCoordinates(city){const point=CITY_COORDINATES[normalizeCityName(city)];return point?projectCity(point.lon,point.lat):null;}
function cityAllocations(rows){
  const allocation=new Map();
  rows.forEach(row=>{
    const cities=[...new Set((row.__cities||[]).filter(Boolean))];
    cities.forEach(city=>{
      const item=allocation.get(city)||{key:city,spend:0,leads:0,adsets:new Set()};
      item.spend+=n(get(row,'Inversión'))/cities.length;
      item.leads+=n(get(row,'Leads'))/cities.length;
      item.adsets.add(s(get(row,'Ad Set ID')));
      allocation.set(city,item);
    });
  });
  const selected=$('#fCity').value;
  return [...allocation.values()].filter(x=>(!selected||x.key===selected)&&x.spend>0).sort((a,b)=>b.spend-a.spend);
}
function citySummary(){
  const cities=cityAllocations(state.current),total=cities.reduce((sum,x)=>sum+x.spend,0);
  return {cities,total,top:cities[0],mapped:cities.filter(x=>cityCoordinates(x.key))};
}
function cityKpiCard(icon,label,value,sub){
  return `<article class="city-kpi-card"><div class="city-kpi-icon" aria-hidden="true">${icon}</div><div><span>${label}</span><strong>${value}</strong><small>${sub}</small></div></article>`;
}
function renderCityKpis(target,summary){
  const {cities,total,top,mapped}=summary;
  $(target).innerHTML=[
    cityKpiCard('⌖',$('#fCity').value?'Ubicación seleccionada':'Mayor inversión estimada',escapeHtml(top?.key||'Sin datos'),top?`${fmt1.format(total?top.spend/total*100:0)}% del reparto estimado`:'Ajusta los filtros para explorar'),
    cityKpiCard('◉','Ubicaciones con inversión',fmtNum.format(cities.length),`${mapped.length} con coordenadas identificadas`),
    cityKpiCard('$','Inversión estimada por ubicación',fmtMoney.format(total),'Reparto uniforme entre ubicaciones del Ad Set')
  ].join('');
}
function cityRankingMarkup(cities,total){
  const max=cities[0]?.spend||1,selected=$('#fCity').value;
  return cities.map((city,index)=>`<button type="button" class="geo-ranking-row ${selected===city.key?'selected':''}" data-city="${escapeAttr(city.key)}" aria-pressed="${selected===city.key}" aria-label="Filtrar por ${escapeAttr(city.key)}: ${escapeAttr(fmtMoney.format(city.spend))} estimados">
    <span class="geo-rank-number">${index+1}</span><span class="geo-rank-name"><b>${escapeHtml(city.key)}</b><span class="geo-rank-bar"><i style="width:${Math.max(2,city.spend/max*100)}%"></i></span></span><strong>${fmtMoney.format(city.spend)}</strong><span class="geo-rank-share">${fmt1.format(total?city.spend/total*100:0)}%</span></button>`).join('')||'<div class="empty">No hay ubicaciones para estos filtros.</div>';
}
function mapClusters(cities,zoom){
  const groups=[];
  cities.forEach(city=>{
    const point=cityCoordinates(city.key);if(!point)return;
    const group=groups.find(g=>Math.hypot(g.x-point[0],g.y-point[1])<16/zoom);
    if(group){group.items.push(city);group.spend+=city.spend;}
    else groups.push({x:point[0],y:point[1],items:[city],spend:city.spend});
  });
  return groups;
}
function renderGeographicMap(id,summary=citySummary()){
  const {cities,total,mapped}=summary,selected=$('#fCity').value;
  const view=mapViews[id],zoom=500/view.size;
  const clusters=mapClusters(mapped,zoom),max=clusters.reduce((m,g)=>Math.max(m,g.spend),1);
  const pins=clusters.map(group=>{
    const clustered=group.items.length>1,city=group.items[0];
    const radius=(clustered?11:5+Math.sqrt(group.spend/max)*8)/zoom;
    const label=clustered?`Acercar grupo de ${group.items.length} ubicaciones`:`Filtrar por ${city.key}: ${fmtMoney.format(city.spend)} estimados`;
    return `<g class="geo-point ${clustered?'geo-cluster':''} ${selected===city.key?'selected':''}" role="button" tabindex="0" aria-label="${escapeAttr(label)}" ${clustered?`data-map-cluster="${group.x},${group.y}"`:`data-city="${escapeAttr(city.key)}" aria-pressed="${selected===city.key}"`} transform="translate(${group.x} ${group.y})"><title>${escapeHtml(label)}</title><circle class="geo-hit" r="${Math.max(radius,14/zoom)}"/><circle class="geo-halo" r="${radius+4/zoom}"/><circle class="geo-dot" r="${radius}"/>${clustered?`<text y="${3.5/zoom}" font-size="${10/zoom}">${group.items.length}</text>`:''}</g>`;
  }).join('');
  const top=summary.top;
  const description=selected?(mapped.length?'Seleccionada · filtra todas las vistas':'Sin coordenadas inequívocas · disponible en el listado'):'Selecciona un punto o una ubicación del listado';
  $('#'+id).innerHTML=`<div class="geo-map-shell" data-map-id="${id}">
    <div class="geo-map-toolbar"><span><i></i> COLOMBIA <small>CONTINENTAL</small></span><div class="geo-map-controls"><button type="button" data-map-zoom="in" aria-label="Acercar mapa" ${zoom>=8?'disabled':''}>+</button><button type="button" data-map-zoom="out" aria-label="Alejar mapa" ${zoom<=1?'disabled':''}>−</button><button type="button" data-map-zoom="home" aria-label="Restablecer mapa">↺</button></div></div>
    <svg class="geo-svg" viewBox="${view.x} ${view.y} ${view.size} ${view.size}" aria-label="Mapa interactivo de ubicaciones configuradas en Colombia" role="group"><path class="geo-country" d="${countryPath}"/>${pins}</svg>
    ${!mapped.length?`<div class="geo-no-pins">${cities.length?'Esta selección no tiene coordenadas identificadas.':'Sin ubicaciones para los filtros actuales.'}</div>`:''}
    <div class="geo-map-caption"><span>Arrastra para mover · ${fmt1.format(zoom)}×</span><span class="geo-scale"><i></i> Inversión estimada</span></div>
  </div><div class="geo-map-selection"><div><strong>${escapeHtml(selected||'Explora la inversión')}</strong><span>${description}</span></div>${selected?'<button type="button" data-city="" class="geo-clear">Quitar ciudad ×</button>':'<span class="geo-selection-arrow" aria-hidden="true">↗</span>'}</div>
  <p class="geo-coverage">${mapped.length} de ${cities.length} ubicaciones con coordenadas identificadas. ${cities.length-mapped.length?`${cities.length-mapped.length} permanecen en el listado sin asignarles un punto.`:''}</p>`;
}
function renderOverviewCityFeature(){
  const summary=citySummary();
  renderCityKpis('#overviewCityKpis',summary);
  $('#overviewCityCount').textContent=`${summary.cities.length} ubicaciones`;
  $('#overviewCityRanking').innerHTML=cityRankingMarkup(summary.cities.slice(0,5),summary.total);
  renderGeographicMap('overviewCityMap',summary);
}
function renderCityRanking(){
  const {cities,total}=citySummary(),query=normalizeCityName($('#citySearch').value);
  const matching=cities.filter(city=>normalizeCityName(city.key).includes(query));
  $('#cityCountBadge').textContent=`${matching.length} ubicaciones`;
  $('#cityRanking').innerHTML=cityRankingMarkup(state.allCities?matching:matching.slice(0,12),total);
  $('#showAllCities').hidden=matching.length<=12;
  $('#showAllCities').textContent=state.allCities?'Mostrar top 12':`Ver las ${matching.length} ubicaciones`;
}
function renderCitiesPage(){
  const summary=citySummary();
  renderCityKpis('#cityPageKpis',summary);
  renderCityRanking();
  renderGeographicMap('cityPageMap',summary);
  const topShare=summary.total?(summary.top?.spend||0)/summary.total*100:0;
  $('#cityBottomKpis').innerHTML=`<div><span>Ubicaciones configuradas</span><b>${summary.cities.length}</b></div><div><span>Coordenadas identificadas</span><b>${summary.mapped.length}</b></div><div><span>Participación top ubicación</span><b>${fmt1.format(topShare)}%</b></div><div><span>Participación top 5</span><b>${fmt1.format(summary.total?summary.cities.slice(0,5).reduce((sum,x)=>sum+x.spend,0)/summary.total*100:0)}%</b></div>`;
}
function handleMapAction(event){
  const city=event.target.closest('[data-city]');
  if(city){
    $('#fCity').value=city.dataset.city;
    if($('#fCity').value!==city.dataset.city)return;
    renderAll();return;
  }
  const more=event.target.closest('#showAllCities');
  if(more){state.allCities=!state.allCities;renderCityRanking();return;}
  const control=event.target.closest('[data-map-zoom], [data-map-cluster]');
  if(!control)return;
  const id=control.closest('[data-map-id]').dataset.mapId,view=mapViews[id];
  const action=control.dataset.mapZoom;
  if(action==='home')Object.assign(view,MAP_HOME);
  else{
    const center=control.dataset.mapCluster?.split(',').map(Number)||[view.x+view.size/2,view.y+view.size/2];
    const size=Math.min(500,Math.max(62.5,view.size*(action==='out'?2:.5)));
    Object.assign(view,{x:center[0]-size/2,y:center[1]-size/2,size});
  }
  renderGeographicMap(id);
  if(action)$('#'+id).querySelector(`[data-map-zoom="${action}"]`)?.focus({preventScroll:true});
}
function setupMapDragging(){
  let drag=null;
  document.addEventListener('pointerdown',event=>{
    const svg=event.target.closest('.geo-svg');
    if(!svg||event.target.closest('[role="button"]')||event.button!==0)return;
    const id=svg.closest('[data-map-id]').dataset.mapId,view=mapViews[id];
    drag={id,svg,startX:event.clientX,startY:event.clientY,x:view.x,y:view.y,scale:view.size/Math.min(svg.clientWidth,svg.clientHeight)};
    svg.setPointerCapture(event.pointerId);
  });
  document.addEventListener('pointermove',event=>{
    if(!drag)return;
    const view=mapViews[drag.id];
    view.x=Math.min(500-view.size/3,Math.max(-view.size*2/3,drag.x-(event.clientX-drag.startX)*drag.scale));
    view.y=Math.min(500-view.size/3,Math.max(-view.size*2/3,drag.y-(event.clientY-drag.startY)*drag.scale));
    drag.svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.size} ${view.size}`);
  });
  const stop=()=>{drag=null;};
  document.addEventListener('pointerup',stop);document.addEventListener('pointercancel',stop);
}
