function kpiIcon(type){
  const icons={
    spend:'◉',leads:'◎',cpl:'⊙',reach:'♙',impressions:'◌',freq:'≋',
    ctr:'↗',clicks:'⌁',cpc:'$',cpm:'⌁',cvr:'◈',lpv:'▤'
  };
  return icons[type]||'•';
}

function sparkline(rows,key,color='#e40521'){
  const g=groupBy(rows,r=>r.__date.slice(0,7)).sort((a,b)=>a.key.localeCompare(b.key));
  if(g.length<2)return '';
  const vals=g.map(x=>{
    if(key==='spend')return x.spend;
    if(key==='leads')return x.leads;
    if(key==='cpl')return x.leads?x.cpl:0;
    return 0;
  });
  const min=Math.min(...vals),max=Math.max(...vals),range=(max-min)||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*100},${34-((v-min)/range)*28}`).join(' ');
  return `<svg class="kpi-spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function kpiMain(label,value,sub,tone,icon,spark=''){
  return `<article class="pkpi pkpi-main pkpi-${tone}">
    <div class="pkpi-head"><span class="pkpi-icon">${kpiIcon(icon)}</span><span class="pkpi-label">${label}</span></div>
    <div class="pkpi-value">${value}</div>
    <div class="pkpi-sub">${sub}</div>
    ${spark}
  </article>`;
}

function kpiSmall(label,value,sub,icon){
  return `<article class="pkpi pkpi-small">
    <div class="pkpi-head"><span class="pkpi-icon soft">${kpiIcon(icon)}</span><span class="pkpi-label">${label}</span></div>
    <div class="pkpi-value">${value}</div>
    <div class="pkpi-sub">${sub}</div>
  </article>`;
}

function renderKpis(el,rows){
  const a=agg(rows);
  el.innerHTML=`
    <div class="pkpi-main-grid">
      ${kpiMain('Inversión',fmtMoney.format(a.spend),'Spend total','dark','spend',sparkline(rows,'spend','#e40521'))}
      ${kpiMain('Leads',fmtNum.format(a.leads),'Resultados lead','red','leads',sparkline(rows,'leads','#ffffff'))}
      ${kpiMain('CPL',a.leads?fmtMoney.format(a.cpl):'—','Inversión / leads','light','cpl',sparkline(rows,'cpl','#111111'))}
    </div>
    <div class="pkpi-small-grid">
      ${kpiSmall('Alcance diario*',fmtNum.format(a.reach),'Suma diaria; puede duplicar usuarios','reach')}
      ${kpiSmall('Impresiones',fmtNum.format(a.impressions),'Entrega total','impressions')}
      ${kpiSmall('Frecuencia*',a.reach?fmt2.format(a.freq):'—','Impresiones / alcance diario','freq')}
      ${kpiSmall('CTR',fmt2.format(a.ctr)+'%','Clicks / impresiones','ctr')}
      ${kpiSmall('Clicks',fmtNum.format(a.clicks),'Todos los clicks','clicks')}
      ${kpiSmall('CPC',a.clicks?fmtMoney.format(a.cpc):'—','Spend / clicks','cpc')}
      ${kpiSmall('CPM',a.impressions?fmtMoney.format(a.cpm):'—','Costo por mil','cpm')}
      ${kpiSmall('CVR',fmt2.format(a.cvr)+'%','Leads / link clicks','cvr')}
      ${kpiSmall('LPV Rate',fmt2.format(a.lpvRate)+'%','LPV / link clicks','lpv')}
    </div>`;
}

function renderOverview(){
  renderOverviewCityFeature();
  renderKpis($('#kpis'),state.current);
  renderInsights();
  renderTrend();
  renderModelChart();
  renderInterestChart();
  renderAudienceChart();
  renderDeliveryChart();
}

function insightBox(tag,strong,span){
  return `<div class="insight"><div class="tag">${tag}</div><strong>${strong}</strong><span>${span}</span></div>`;
}

function renderInsights(){
  const models=groupBy(state.current,r=>r.__model).filter(x=>x.leads>0);
  const bestModel=models.sort((a,b)=>a.cpl-b.cpl)[0];
  const audiences=groupBy(state.current,r=>r.__group).filter(x=>x.impressions>0).sort((a,b)=>b.ctr-a.ctr);
  const campaigns=groupBy(state.current,r=>s(get(r,'Campaña'))).sort((a,b)=>b.spend-a.spend);

  $('#insights').innerHTML=[
    bestModel?insightBox('Mejor CPL por modelo',`${bestModel.key} · ${fmtMoney.format(bestModel.cpl)}`,`${fmtNum.format(bestModel.leads)} leads con ${fmtMoney.format(bestModel.spend)} invertidos.`):insightBox('Mejor CPL por modelo','Sin leads','No hay volumen suficiente en el filtro.'),
    audiences[0]?insightBox('Mayor CTR por audiencia',`${audiences[0].key} · ${fmt2.format(audiences[0].ctr)}%`,`${fmtNum.format(audiences[0].clicks)} clicks en el periodo.`):insightBox('Mayor CTR por audiencia','Sin datos','Ajusta filtros.'),
    campaigns[0]?insightBox('Mayor inversión',short(campaigns[0].key,48),fmtMoney.format(campaigns[0].spend)):insightBox('Mayor inversión','Sin datos','Ajusta filtros.')
  ].join('');
}

function makeChart(id,type,data,options={}){
  if(charts[id])charts[id].destroy();
  const ctx=document.getElementById(id);
  if(!ctx)return;
  charts[id]=new Chart(ctx,{
    type,
    data,
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:{duration:350},
      plugins:{
        legend:{display:true,labels:{boxWidth:10,usePointStyle:true,font:{size:10}}},
        tooltip:{mode:'index',intersect:false}
      },
      scales:type==='doughnut'?{}:{
        x:{grid:{display:false},ticks:{font:{size:9},color:'#777'}},
        y:{grid:{color:'#efefec'},ticks:{font:{size:9},color:'#777'}}
      },
      ...options
    }
  });
}

function renderTrend(){
  const gran=$('#trendGranularity').value;
  const gs=groupBy(state.current,r=>gran==='month'?r.__date.slice(0,7):r.__date).sort((a,b)=>a.key.localeCompare(b.key));

  makeChart('trendChart','bar',{
    labels:gs.map(x=>x.key),
    datasets:[
      {label:'Inversión',data:gs.map(x=>Math.round(x.spend)),backgroundColor:'#111111',borderRadius:5,yAxisID:'y'},
      {label:'Leads',data:gs.map(x=>Math.round(x.leads)),backgroundColor:'#e40521',borderRadius:5,yAxisID:'y1'},
      {label:'CPL',data:gs.map(x=>Math.round(x.cpl||0)),type:'line',borderColor:'#8b8b8b',backgroundColor:'#8b8b8b',pointRadius:gran==='day'?0:3,tension:.32,yAxisID:'y2'}
    ]
  },{
    plugins:{legend:{position:'top',align:'start'}},
    scales:{
      x:{grid:{display:false},ticks:{maxTicksLimit:gran==='day'?12:18,font:{size:9}}},
      y:{position:'left',grid:{color:'#efefec'},ticks:{callback:v=>'$'+Intl.NumberFormat('es-CO',{notation:'compact'}).format(v),font:{size:9}}},
      y1:{position:'right',display:false,grid:{drawOnChartArea:false}},
      y2:{position:'right',grid:{drawOnChartArea:false},ticks:{font:{size:9}}}
    }
  });
}

function renderAudienceChart(){
  const g=groupBy(state.current,r=>r.__group).sort((a,b)=>b.spend-a.spend);
  makeChart('audienceChart','doughnut',{
    labels:g.map(x=>x.key),
    datasets:[{data:g.map(x=>x.spend),backgroundColor:[RED,INK,PURPLE,GREEN,AMBER,'#aaa'],borderWidth:0}]
  },{
    cutout:'68%',
    plugins:{legend:{position:'bottom',labels:{boxWidth:8,usePointStyle:true,font:{size:10}}}}
  });
}

function renderModelChart(){
  const g=groupBy(state.current,r=>r.__model).filter(x=>x.key!=='OTRO / SIN CLASIFICAR').sort((a,b)=>b.leads-a.leads).slice(0,10).reverse();
  makeChart('modelChart','bar',{
    labels:g.map(x=>x.key),
    datasets:[{label:'Leads',data:g.map(x=>x.leads),backgroundColor:INK,borderRadius:5}]
  },{
    indexAxis:'y',
    plugins:{legend:{display:false}}
  });
}

function interestPairs(rows){
  const adsetPerf=new Map();
  rows.forEach(r=>{
    const id=s(get(r,'Ad Set ID'));
    if(!adsetPerf.has(id))adsetPerf.set(id,[]);
    adsetPerf.get(id).push(r);
  });

  const acc=new Map();
  adsetPerf.forEach((rs,id)=>{
    const seg=state.segMap.get(id)||{};
    const ints=s(get(seg,'Intereses')).split(',').map(x=>x.trim()).filter(Boolean);
    const a=agg(rs);
    ints.forEach(i=>{
      const x=acc.get(i)||{spend:0,leads:0,adsets:0};
      x.spend+=a.spend;x.leads+=a.leads;x.adsets++;
      acc.set(i,x);
    });
  });
  return [...acc.entries()].map(([key,v])=>({key,...v})).sort((a,b)=>b.spend-a.spend);
}

function renderInterestChart(){
  const g=interestPairs(state.current).slice(0,10).reverse();
  makeChart('interestChart','bar',{
    labels:g.map(x=>short(x.key,28)),
    datasets:[{label:'Inversión asociada',data:g.map(x=>x.spend),backgroundColor:GREEN,borderRadius:5}]
  },{
    indexAxis:'y',
    plugins:{legend:{display:false}},
    scales:{
      x:{ticks:{callback:v=>'$'+Intl.NumberFormat('es-CO',{notation:'compact'}).format(v),font:{size:9}},grid:{color:'#efefec'}},
      y:{grid:{display:false},ticks:{font:{size:9}}}
    }
  });
}

function renderDeliveryChart(){
  const g=groupBy(state.current,r=>r.__delivery).sort((a,b)=>b.spend-a.spend).slice(0,8);
  makeChart('deliveryChart','doughnut',{
    labels:g.map(x=>x.key||'Sin dato'),
    datasets:[{data:g.map(x=>x.spend),backgroundColor:[INK,RED,GREEN,PURPLE,AMBER,'#999','#bbb','#ddd'],borderWidth:0}]
  },{
    cutout:'64%',
    plugins:{legend:{position:'bottom',labels:{boxWidth:8,usePointStyle:true,font:{size:9}}}}
  });
}


/* === MODELOS PAGE === */
function renderModelsPage(){
  const rows=state.current||[];
  const grouped=groupBy(rows,r=>r.__model)
    .filter(x=>x.key&&x.key!=='OTRO / SIN CLASIFICAR')
    .sort((a,b)=>b.spend-a.spend);

  if($('#modelPageTable')){
    $('#modelPageTable').innerHTML=grouped.map(x=>`
      <tr>
        <td><b>${escapeHtml(modelAsset(x.key).label||x.key)}</b></td>
        <td class="metric">${fmtMoney.format(x.spend)}</td>
        <td class="metric">${fmtNum.format(x.leads)}</td>
        <td class="metric">${x.leads?fmtMoney.format(x.cpl):'—'}</td>
        <td class="metric">${fmtNum.format(x.impressions)}</td>
        <td class="metric">${fmt2.format(x.ctr)}%</td>
      </tr>`).join('')||'<tr><td colspan="6" class="empty">No hay datos para los filtros actuales.</td></tr>';
  }

  const leads=grouped.slice(0,12).reverse();
  makeChart('modelPageLeadsChart','bar',{
    labels:leads.map(x=>modelAsset(x.key).label||x.key),
    datasets:[{label:'Leads',data:leads.map(x=>x.leads),backgroundColor:'#e40521',borderRadius:6}]
  },{
    indexAxis:'y',
    plugins:{legend:{display:false}}
  });

  const cpl=grouped.filter(x=>x.leads>0).sort((a,b)=>a.cpl-b.cpl).slice(0,12).reverse();
  makeChart('modelPageCplChart','bar',{
    labels:cpl.map(x=>modelAsset(x.key).label||x.key),
    datasets:[{label:'CPL',data:cpl.map(x=>Math.round(x.cpl)),backgroundColor:'#111111',borderRadius:6}]
  },{
    indexAxis:'y',
    plugins:{legend:{display:false}},
    scales:{
      x:{grid:{color:'#efefec'},ticks:{callback:v=>'$'+Intl.NumberFormat('es-CO',{notation:'compact'}).format(v),font:{size:9}}},
      y:{grid:{display:false},ticks:{font:{size:9}}}
    }
  });
}
