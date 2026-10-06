/* Map outline and pins share one equirectangular projection and SVG viewBox. */
const MAP_HOME={x:0,y:0,size:500};
const mapViews={overviewCityMap:{...MAP_HOME},cityPageMap:{...MAP_HOME}};
function normalizeCityName(name){return s(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function projectCity(lon,lat){
  const scale=26,cosLat=Math.cos(4*Math.PI/180);
  return [(lon+73)*scale*cosLat+250,(4.07-lat)*scale+250];
}
const countryPath=COLOMBIA_OUTLINE.map(([lon,lat],i)=>`${i?'L':'M'}${projectCity(lon,lat).map(n=>n.toFixed(2)).join(',')}`).join(' ')+' Z';
function cityCoordinates(id){const point=state.locationCatalog.get(id)?.point;return point?projectCity(point.lon,point.lat):null;}
function cityAssociations(rows){
  const associations=new Map();
  rows.forEach(row=>{
    [...new Set(row.__cities||[])].forEach(id=>{
      const item=associations.get(id)||{key:id,spend:0,adsets:new Set()};
      // Entire Ad Set spend is associated, never divided or attributed to a city.
      item.spend+=n(get(row,'Inversión'));
      item.adsets.add(s(get(row,'Ad Set ID')));
      associations.set(id,item);
    });
  });
  const selected=$('#fCity').value;
  return [...associations.values()].filter(x=>(!selected||x.key===selected)&&x.spend>0)
    .sort((a,b)=>b.adsets.size-a.adsets.size||b.spend-a.spend||locationLabel(a.key).localeCompare(locationLabel(b.key),'es'));
}
function citySummary(){
  const rows=state.current.filter(row=>(row.__cities||[]).length);
  const cities=cityAssociations(rows),total=agg(rows).spend;
  return {cities,total,adsets:new Set(rows.map(row=>s(get(row,'Ad Set ID')))),top:cities[0],mapped:cities.filter(x=>cityCoordinates(x.key))};
}
function cityKpiCard(icon,label,value,sub){
  return `<article class="city-kpi-card"><div class="city-kpi-icon" aria-hidden="true">${icon}</div><div><span>${label}</span><strong>${value}</strong><small>${sub}</small></div></article>`;
}
function renderCityKpis(target,summary){
  const {cities,adsets,top,mapped}=summary;
  $(target).innerHTML=[
    cityKpiCard('⌖',$('#fCity').value?'Ciudad seleccionada':'Más conjuntos asociados',escapeHtml(locationLabel(top?.key)||'Sin ciudades'),top?`${top.adsets.size} ${top.adsets.size===1?'conjunto la incluye':'conjuntos la incluyen'}`:'Ajusta los filtros para explorar'),
    cityKpiCard('◉','Conjuntos con ciudades',fmtNum.format(adsets.size),`${cities.length} ciudades distintas · ${mapped.length} ubicadas en el mapa`),
    cityKpiCard('$','Gasto real por ciudad','Sin desglose','El Excel reporta gasto por conjunto, no por ciudad')
  ].join('');
}
function cityRankingMarkup(cities){
  const max=cities[0]?.adsets.size||1,selected=$('#fCity').value;
  return cities.map((city,index)=>{
    const meta=state.locationCatalog.get(city.key);
    return `<button type="button" class="geo-ranking-row ${selected===city.key?'selected':''}" data-city="${escapeAttr(city.key)}" aria-pressed="${selected===city.key}" aria-label="Filtrar por ${escapeAttr(meta.label)}: ${city.adsets.size} conjuntos, ${escapeAttr(fmtMoney.format(city.spend))} de gasto conjunto compartido">
    <span class="geo-rank-number">${index+1}</span><span class="geo-rank-name"><b>${escapeHtml(meta.name)}</b><small>${escapeHtml(meta.region)}</small><span class="geo-rank-bar"><i style="width:${Math.max(2,city.adsets.size/max*100)}%"></i></span></span><strong>${fmtMoney.format(city.spend)}</strong><span class="geo-rank-share">${city.adsets.size}</span></button>`;
  }).join('')||'<div class="empty">No hay ciudades explícitas para estos filtros. Revisa la cobertura por tipo de geografía.</div>';
}
const GEO_KIND_NAMES={cities:['ciudad','ciudades'],regions:['departamento','departamentos'],countries:['país','países'],subcities:['zona','zonas'],neighborhoods:['barrio','barrios'],places:['lugar','lugares'],medium_geo_areas:['área','áreas'],custom_locations:['ubicación personalizada','ubicaciones personalizadas'],zips:['código postal','códigos postales']};
function geoDescription(geo){
  if(!geo)return 'Sin segmentación disponible';
  return Object.entries(geo.counts||{}).map(([kind,count])=>`${count} ${(GEO_KIND_NAMES[kind]||['zona','zonas'])[count===1?0:1]}`).join(' · ')||'Sin ubicaciones explícitas';
}
function geoLocationList(geo){
  if(!geo)return '';
  return Object.keys(GEO_KIND_NAMES).map(kind=>{
    const refs=geo.locations.filter(id=>state.locationCatalog.get(id)?.kind===kind);
    if(!refs.length)return '';
    return `<p><b>${escapeHtml(GEO_KIND_NAMES[kind][1])}:</b> ${refs.map(id=>escapeHtml(locationWithRadius(id,geo))).join('; ')}</p>`;
  }).join('')+(geo.excluded.length?`<p><b>Exclusiones:</b> ${geo.excluded.map(id=>escapeHtml(locationLabel(id))).join('; ')}</p>`:'');
}
function renderGeoTrace(selector,compact=false){
  const selected=$('#fCity').value,summary=citySummary();
  const groups=groupBy(state.current.filter(row=>(row.__cities||[]).length),row=>s(get(row,'Ad Set ID'))).sort((a,b)=>b.spend-a.spend);
  const rows=compact&&!selected?[]:groups.slice(0,selected?250:20);
  $(selector).innerHTML=`<div class="geo-trace-heading"><div><div class="eyebrow">CRUCE CON EL EXCEL · POR AD SET ID</div><h3>${selected?'Conjuntos que incluyen '+escapeHtml(locationLabel(selected)):'De dónde sale el gasto asociado'}</h3><p>Gasto total de ${summary.adsets.size} conjuntos: <b>${fmtMoney.format(summary.total)}</b>. Es presupuesto compartido entre sus ubicaciones; no es gasto entregado en esta ciudad.</p></div>${compact?'<button type="button" class="mini-link" data-open-section="citiesView">Ver geografía completa →</button>':''}</div>
  ${rows.length?`<div class="table-wrap"><table class="table geo-trace-table"><thead><tr><th>Conjunto / ID</th><th>Geografía completa del conjunto</th><th class="metric">Gasto del conjunto</th><th>Gasto real en la ciudad</th></tr></thead><tbody>${rows.map(item=>{
    const row=item.rows[0],geo=state.segMap.get(item.key)?.__geo;
    return `<tr><td><b>${escapeHtml(get(row,'Conjunto'))}</b><small>${escapeHtml(item.key)}</small></td><td><b>${escapeHtml(geoDescription(geo))}</b><details><summary>Ver ubicaciones y radios</summary>${geoLocationList(geo)}</details></td><td class="metric">${fmtMoney.format(item.spend)}</td><td>Sin desglose geográfico</td></tr>`;
  }).join('')}</tbody></table></div>`:''}
  ${!selected&&groups.length>rows.length&&!compact?`<p class="geo-trace-note">Se muestran los ${rows.length} conjuntos de mayor gasto. Selecciona una ciudad para ver sus conjuntos.</p>`:''}`;
}
function renderGeoCoverage(){
  const categories={country:{label:'Solo país',spend:0,ids:new Set()},region:{label:'Solo departamentos',spend:0,ids:new Set()},city:{label:'Solo ciudades',spend:0,ids:new Set()},mixed:{label:'Geografía mixta',spend:0,ids:new Set()},missing:{label:'Sin segmentación',spend:0,ids:new Set()}};
  state.current.forEach(row=>{
    const id=s(get(row,'Ad Set ID')),kind=state.segMap.get(id)?.__geo?.category||'missing';
    categories[kind].spend+=n(get(row,'Inversión'));categories[kind].ids.add(id);
  });
  $('#geoCoverage').innerHTML=`<div class="panel-head"><div><div class="panel-title">Cómo está configurada la inversión del filtro</div><div class="panel-note">Cada conjunto aparece una sola vez. Los cinco grupos suman ${fmtMoney.format(agg(state.current).spend)}.</div></div></div><div class="geo-coverage-grid">${Object.entries(categories).map(([kind,item])=>`<div data-geo-category="${kind}"><span>${item.label}</span><b>${fmtMoney.format(item.spend)}</b><small>${item.ids.size} conjuntos</small></div>`).join('')}</div>`;
}
function mapClusters(cities,zoom){
  const groups=[];
  cities.forEach(city=>{
    const point=cityCoordinates(city.key);if(!point)return;
    // At maximum zoom every city is individually reachable, including by keyboard.
    const group=zoom<8?groups.find(g=>Math.hypot(g.x-point[0],g.y-point[1])<16/zoom):null;
    if(group){group.items.push(city);city.adsets.forEach(id=>group.adsets.add(id));}
    else groups.push({x:point[0],y:point[1],items:[city],adsets:new Set(city.adsets)});
  });
  return groups;
}
function renderGeographicMap(id,summary=citySummary()){
  const {cities,total,mapped}=summary,selected=$('#fCity').value;
  const view=mapViews[id],zoom=500/view.size;
  const clusters=mapClusters(mapped,zoom),max=clusters.reduce((m,g)=>Math.max(m,g.adsets.size),1);
  const pins=clusters.map(group=>{
    const clustered=group.items.length>1,city=group.items[0];
    const radius=(clustered?11:5+Math.sqrt(group.adsets.size/max)*8)/zoom;
    const label=clustered?`Acercar grupo de ${group.items.length} ubicaciones`:`Filtrar por ${locationLabel(city.key)}: ${city.adsets.size} conjuntos asociados`;
    return `<g class="geo-point ${clustered?'geo-cluster':''} ${selected===city.key?'selected':''}" role="button" tabindex="0" aria-label="${escapeAttr(label)}" ${clustered?`data-map-cluster="${group.x},${group.y}"`:`data-city="${escapeAttr(city.key)}" aria-pressed="${selected===city.key}"`} transform="translate(${group.x} ${group.y})"><title>${escapeHtml(label)}</title><circle class="geo-hit" r="${Math.max(radius,14/zoom)}"/><circle class="geo-halo" r="${radius+4/zoom}"/><circle class="geo-dot" r="${radius}"/>${clustered?`<text y="${3.5/zoom}" font-size="${10/zoom}">${group.items.length}</text>`:''}</g>`;
  }).join('');
  const description=selected?(mapped.length?'Filtra conjuntos que incluyen esta ciudad y departamento':'Sin coordenadas inequívocas · disponible en el listado'):'Selecciona un punto o una ubicación del listado';
  $('#'+id).innerHTML=`<div class="geo-map-shell" data-map-id="${id}">
    <div class="geo-map-toolbar"><span><i></i> COLOMBIA <small>CONTINENTAL</small></span><div class="geo-map-controls"><button type="button" data-map-zoom="in" aria-label="Acercar mapa" ${zoom>=8?'disabled':''}>+</button><button type="button" data-map-zoom="out" aria-label="Alejar mapa" ${zoom<=1?'disabled':''}>−</button><button type="button" data-map-zoom="home" aria-label="Restablecer mapa">↺</button></div></div>
    <svg class="geo-svg" viewBox="${view.x} ${view.y} ${view.size} ${view.size}" aria-label="Mapa interactivo de ubicaciones configuradas en Colombia" role="group"><path class="geo-country" d="${countryPath}"/>${pins}</svg>
    ${!mapped.length?`<div class="geo-no-pins">${cities.length?'Esta selección no tiene coordenadas identificadas.':'Sin ubicaciones para los filtros actuales.'}</div>`:''}
    <div class="geo-map-caption"><span>Arrastra para mover · ${fmt1.format(zoom)}×</span><span class="geo-scale"><i></i> Conjuntos asociados</span></div>
  </div><div class="geo-map-selection"><div><strong>${escapeHtml(locationLabel(selected)||'Explora la segmentación')}</strong><span>${description}</span></div>${selected?'<button type="button" data-city="" class="geo-clear">Quitar ciudad ×</button>':'<span class="geo-selection-arrow" aria-hidden="true">↗</span>'}</div>
  <p class="geo-coverage">${mapped.length} de ${cities.length} ciudades con coordenadas identificadas por nombre y departamento. ${cities.length-mapped.length?`${cities.length-mapped.length} permanecen en el listado sin asignarles un punto.`:''}</p>`;
}
function renderOverviewCityFeature(){
  const summary=citySummary();
  renderCityKpis('#overviewCityKpis',summary);
  $('#overviewCityCount').textContent=`${summary.cities.length} ubicaciones`;
  $('#overviewCityRanking').innerHTML=cityRankingMarkup(summary.cities.slice(0,5),summary.total);
  renderGeographicMap('overviewCityMap',summary);
  renderGeoTrace('#overviewGeoTrace',true);
}
function renderCityRanking(){
  const {cities,total}=citySummary(),query=normalizeCityName($('#citySearch').value);
  const matching=cities.filter(city=>normalizeCityName(locationLabel(city.key)).includes(query));
  if(query)matching.sort((a,b)=>Number(normalizeCityName(state.locationCatalog.get(b.key).name)===query)-Number(normalizeCityName(state.locationCatalog.get(a.key).name)===query));
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
  $('#cityBottomKpis').innerHTML=`<div><span>Ciudades por identificador de Meta</span><b>${summary.cities.length}</b></div><div><span>Con coordenadas identificadas</span><b>${summary.mapped.length}</b></div><div><span>Conjuntos con ciudades explícitas</span><b>${summary.adsets.size}</b></div><div><span>Gasto conjunto sin duplicados</span><b>${fmtMoney.format(summary.total)}</b></div>`;
  renderGeoCoverage();
  renderGeoTrace('#cityGeoTrace');
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
