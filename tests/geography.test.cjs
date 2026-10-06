const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
function fixture(){
  const nodes={'#fCity':{value:''},'#testKpis':{innerHTML:''}};
  const ctx=vm.createContext({console,Intl,Map,Set,document:{querySelector:s=>nodes[s]||null}});
  for(const file of ['geo-targeting.js','geo-data.js','app-core.js','app-creatives.js','app-map.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
  const encoded=fs.readFileSync(path.join(root,'data-packed.js'),'utf8').match(/"([^"]+)"/)[1];
  ctx.snapshot=JSON.parse(zlib.gunzipSync(Buffer.from(encoded,'base64')));
  vm.runInContext('hydrateSnapshot(snapshot);prepareData();state.current=state.perfEnriched;',ctx);
  return {nodes,run:code=>vm.runInContext(code,ctx)};
}
test('Daily financial totals remain the values matched to the Excel',()=>{
  const {run}=fixture();assert.equal(run('state.current.length'),31045);assert.equal(run('agg(state.current).spend'),961236261);assert.equal(run('agg(state.current).leads'),150030);
  assert.equal(run('state.segMap.size'),244);assert.equal(run('new Set(state.current.map(r=>r["Ad Set ID"])).size'),246);
});
test('Three Nariño municipalities retain their Meta IDs, regions and separate Ad Sets',()=>{
  const {run,nodes}=fixture();
  const expected=[['cities:474864','Antioquia',1,6972489],['cities:474867','Nariño',4,12561013],['cities:474871','Cundinamarca',7,64177369]];
  const grouped=[];
  for(const [id,region,sets,spend] of expected){
    nodes['#fCity'].value=id;run(`state.current=state.perfEnriched.filter(row=>row.__cities.includes('${id}'));`);
    assert.equal(run(`state.locationCatalog.get('${id}').region`),region);
    assert.equal(run('citySummary().cities.length'),1);assert.equal(run('citySummary().adsets.size'),sets);
    assert.equal(run('citySummary().total'),spend);assert.equal(run('citySummary().top.spend'),spend);
    assert.equal(run('citySummary().mapped.length'),1);
    grouped.push(...JSON.parse(run('JSON.stringify([...citySummary().adsets])')));
    run('renderCityKpis("#testKpis",citySummary())');assert.match(nodes['#testKpis'].innerHTML,/Sin desglose/);assert.doesNotMatch(nodes['#testKpis'].innerHTML,/14[.,]820[.,]236|reparto|estimada/);
  }
  assert.equal(new Set(grouped).size,12);
});
test('Mixed geography retains seven departments and a zone alongside Nariño, Antioquia',()=>{
  const {run}=fixture();assert.equal(run('GEO_TARGETING.adsets["120252457899750508"].counts.cities'),1);assert.equal(run('GEO_TARGETING.adsets["120252457899750508"].counts.regions'),7);assert.equal(run('GEO_TARGETING.adsets["120252457899750508"].counts.subcities'),1);
  assert.equal(run('GEO_TARGETING.adsets["120252457899750508"].category'),'mixed');
});
test('Cities use geographic IDs, with no equal-share allocations or duplicate Ad Set sums',()=>{
  const {run}=fixture();assert.equal(run('state.snapshotCities.length'),303);assert.equal(run('citySummary().cities.length'),303);assert.equal(run('citySummary().mapped.length'),259);assert.equal(run('citySummary().adsets.size'),87);assert.equal(run('citySummary().total'),325770474);
  assert.equal(run('cityAssociations([]).length'),0);
  assert.equal(run('typeof cityAllocations'),'undefined');
  const report=JSON.parse(fs.readFileSync(path.join(root,'docs/geography-reconciliation.json')));
  assert.equal(Object.values(report.categories).reduce((n,x)=>n+x.spend,0),961236261);
  assert.equal(Object.values(report.categories).reduce((n,x)=>n+x.adsets,0),246);
});
