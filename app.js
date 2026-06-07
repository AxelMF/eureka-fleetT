
// ═══ SUPABASE (SINGLE INSTANCE) ═══
const SURL = 'https://nfyhuuryucdhkovugoue.supabase.co';
const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5meWh1dXJ5dWNkaGtvdnVnb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTQwMTYsImV4cCI6MjA5MzEzMDAxNn0.8C5zDPcRBB2rYhFuqErn7BaoNRpYiCHj_PnTEB-6SPs';
const sb = supabase.createClient(SURL, SKEY);

// ═══ CACHE ═══
let cache = {vehiculos:[],campamentos:[],supervisores:[],polizas:[],pinchazos:[],reparaciones:[],neumaticos:[]};
let filts = {pinchazos:'todos',reparaciones:'todos'};
let searches = {};
let mechDonaChart = null, mechCostoChart = null;

// ═══ UTILS ═══
const fmtRD = n => 'RD$ ' + Number(n).toLocaleString('es-DO',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtDate = d => { if(!d) return '—'; const [y,m,di]=d.split('-'); return `${di}/${m}/${y}`; };
const g  = id => (document.getElementById(id)?.value||'').trim();
const gi = id => parseInt(document.getElementById(id)?.value)||0;

function toast(msg,err=false){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast'+(err?' err':'');
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2800);
}
function clearM(id){
  document.querySelectorAll('#'+id+' input,#'+id+' textarea').forEach(el=>el.value='');
  document.querySelectorAll('#'+id+' select').forEach(el=>el.selectedIndex=0);
}
function emptyRow(cols,icon,label){ return `<tr><td colspan="${cols}"><div class="es"><div class="ei">${icon}</div><div class="et">${label}</div></div></td></tr>`; }
function loadingRow(cols){ return `<tr><td colspan="${cols}"><div class="spin-w"><div class="spin"></div>Cargando…</div></td></tr>`; }
function vLabel(v){ return v?`${v.marca||''} ${v.modelo||''} (${v.placa||v.ficha||''})`.trim():'—'; }
function vHtml(v){ return v?`<div class="vi"><span class="vn">${v.marca||''} ${v.modelo||''}</span><span class="vp">${v.placa||''}</span></div>`:'—'; }

// ═══ NAVIGATION ═══
function goPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  el.classList.add('active');
  loadPage(id);
}

async function loadPage(id) {
  if(id==='dashboard')    { await loadDashboard(); }
  if(id==='mapa')        { await mapaInit(); }
  if(id==='vehiculos')    { await ensureVehiculos(); renderVehiculos(); }
  if(id==='campamentos')  { await ensureCampamentos(); renderCampamentos(); }
  if(id==='supervisores') { await ensureSupervisores(); await ensureCampamentos(); renderSupervisores(); }
  if(id==='polizas')      { await loadPolizas(); await ensureVehiculos(); renderPolizas(); }
  if(id==='pinchazos')    { await loadPinchazos(); await ensureVehiculos(); renderPinchazos(); }
  if(id==='reparaciones') { await loadReparaciones(); await ensureVehiculos(); renderReparaciones(); }
  if(id==='neumaticos')   { await loadNeumaticos(); await ensureVehiculos(); renderNeumaticos(); }
  if(id==='historial')    { await ensureVehiculos(); await loadPinchazos(); await loadReparaciones(); await loadNeumaticos(); renderHistorialSelect(); }
  if(id==='conductores')  { await ensureVehiculos(); fillSelects('mcon'); renderConductores(); }
  if(id==='preventivo')   { await ensureVehiculos(); fillSelects('mprev'); renderPreventivo(); }
  if(id==='combustible')  { await ensureVehiculos(); fillSelects('mcomb'); renderCombustible(); }
  if(id==='mecanica')     { mechLoad(); }
}

// ═══ DATA LOADERS ═══
async function ensureVehiculos()    { if(!cache.vehiculos.length)    { const {data}=await sb.from('vehiculos').select('*,campamentos(nombre),supervisores(nombre)').order('id'); cache.vehiculos=data||[]; } }
async function ensureCampamentos()  { if(!cache.campamentos.length)  { const {data}=await sb.from('campamentos').select('*').order('nombre'); cache.campamentos=data||[]; } }
async function ensureSupervisores() { if(!cache.supervisores.length) { const {data}=await sb.from('supervisores').select('*').order('nombre'); cache.supervisores=data||[]; } }
async function loadPolizas()    { const {data}=await sb.from('polizas').select('*,vehiculos(ficha,placa,marca,modelo)').order('id'); cache.polizas=data||[]; }
async function loadPinchazos()  { const {data}=await sb.from('pinchazos').select('*,vehiculos(ficha,placa,marca,modelo)').order('fecha',{ascending:false}); cache.pinchazos=data||[]; }
async function loadReparaciones(){ const {data}=await sb.from('reparaciones').select('*,vehiculos(ficha,placa,marca,modelo)').order('fecha',{ascending:false}); cache.reparaciones=data||[]; }
async function loadNeumaticos() { const {data}=await sb.from('neumaticos').select('*,vehiculos(ficha,placa,marca,modelo)').order('fecha',{ascending:false}); cache.neumaticos=data||[]; }
async function invalidate(table) { cache[table]=[]; }

// ═══ DASHBOARD GENERAL ═══
async function loadDashboard() {
  await Promise.all([ensureVehiculos(),loadPinchazos(),loadReparaciones(),loadNeumaticos()]);
  document.getElementById('sv').textContent = cache.vehiculos.length;
  document.getElementById('sp').textContent = cache.pinchazos.length;
  document.getElementById('sr').textContent = cache.reparaciones.length;
  const tot = [...cache.pinchazos,...cache.reparaciones,...cache.neumaticos].reduce((s,x)=>s+(parseFloat(x.coste)||0),0);
  document.getElementById('sc').textContent = fmtRD(tot);
  const all = [
    ...cache.pinchazos.map(x=>({...x,_t:'p'})),
    ...cache.reparaciones.map(x=>({...x,_t:'r'})),
    ...cache.neumaticos.map(x=>({...x,_t:'n'}))
  ].sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,10);
  // Campamentos sidebar
  const cml = document.getElementById('camp-map-list');
  if(cml) {
    const campStats = {};
    cache.vehiculos.forEach(v=>{ const n=v.campamentos?.nombre||'Sin campamento'; campStats[n]=(campStats[n]||0)+1; });
    const sorted = Object.entries(campStats).sort((a,b)=>b[1]-a[1]);
    const maxV = sorted[0]?.[1]||1;
    cml.innerHTML = sorted.map(([name,count])=>`
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:12px;color:var(--text);font-weight:500">${name.replace(/ \([A-Z]+\)/,'')}</span>
          <span style="font-size:11px;color:var(--muted);font-family:var(--fm)">${count} unid.</span>
        </div>
        <div style="height:5px;background:var(--s2);border-radius:3px"><div style="height:100%;width:${(count/maxV*100).toFixed(0)}%;background:var(--blue);border-radius:3px;transition:width .8s"></div></div>
      </div>`).join('');
  }
  const rl = document.getElementById('recent-list');
  if(!all.length){ rl.innerHTML='<div class="es"><div class="ei">🔍</div><div class="et">Sin incidencias aún</div></div>'; return; }
  rl.innerHTML = '<table><thead><tr><th>Fecha</th><th>Vehículo</th><th>Tipo</th><th>Detalle</th><th>Coste</th></tr></thead><tbody>'
    + all.map(e=>{
      const tp = e._t==='p'?'<span class="badge bo">Pinchazo</span>':e._t==='r'?'<span class="badge bb">Reparación</span>':'<span class="badge by">Neumático</span>';
      const det = e._t==='p'?`${e.tipo||''} · ${e.posicion||''}`:e._t==='r'?e.tipo||'':e.marca||'';
      return `<tr><td style="font-family:var(--fm);font-size:11px">${fmtDate(e.fecha)}</td><td>${e.vehiculos?vHtml(e.vehiculos):'—'}</td><td>${tp}</td><td>${det}</td><td><span class="cost cost-a">${parseFloat(e.coste)>0?fmtRD(e.coste):'—'}</span></td></tr>`;
    }).join('') + '</tbody></table>';
}

// ═══ RENDERS ═══
function renderVehiculos(s='') {
  const q=(s||searches.vehiculos||'').toLowerCase();
  const d=cache.vehiculos.filter(v=>(v.ficha||'').toLowerCase().includes(q)||(v.placa||'').toLowerCase().includes(q)||(v.marca||'').toLowerCase().includes(q));
  const tb=document.getElementById('tv');
  if(!d.length){ tb.innerHTML=emptyRow(7,'🚗','Sin vehículos'); return; }
  const eMap={activo:'badge bg',taller:'badge by',baja:'badge br'};
  const eLabel={activo:'✅ Activo',taller:'🔧 Taller',baja:'❌ Baja'};
  tb.innerHTML=d.map(v=>`<tr>
    <td>${vHtml(v)}</td>
    <td style="font-family:var(--fm);font-size:11px">${v.ficha||'—'}</td>
    <td style="font-family:var(--fm);font-weight:500">${v.placa||'—'}</td>
    <td style="font-size:12px">${v.campamentos?.nombre||'—'}</td>
    <td style="font-size:12px">${v.supervisores?.nombre||'—'}</td>
    <td><span class="${eMap[v.estado]||'badge by'}">${eLabel[v.estado]||v.estado}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="delRow('vehiculos',${v.id})">🗑</button></td>
  </tr>`).join('');
}

function renderCampamentos(s='') {
  const q=(s||searches.campamentos||'').toLowerCase();
  const d=cache.campamentos.filter(c=>(c.nombre||'').toLowerCase().includes(q));
  const tb=document.getElementById('tc');
  if(!d.length){ tb.innerHTML=emptyRow(5,'🏕️','Sin campamentos'); return; }
  tb.innerHTML=d.map(c=>`<tr>
    <td><strong>${c.nombre}</strong></td>
    <td style="font-family:var(--fm)">${c.codigo||'—'}</td>
    <td>${c.coordinador||'—'}</td>
    <td>${c.activo?'<span class="badge bg">✅ Activo</span>':'<span class="badge br">❌ Inactivo</span>'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="delRow('campamentos',${c.id})">🗑</button></td>
  </tr>`).join('');
}

function renderSupervisores(s='') {
  const q=(s||searches.supervisores||'').toLowerCase();
  const d=cache.supervisores.filter(s2=>(s2.nombre||'').toLowerCase().includes(q));
  const tb=document.getElementById('ts');
  if(!d.length){ tb.innerHTML=emptyRow(4,'👷','Sin supervisores'); return; }
  tb.innerHTML=d.map(s2=>{
    const camp=cache.campamentos.find(c=>c.id===s2.campamento_id);
    return`<tr>
      <td><strong>${s2.nombre}</strong></td>
      <td>${camp?.nombre||'—'}</td>
      <td>${s2.activo?'<span class="badge bg">✅ Activo</span>':'<span class="badge br">❌ Inactivo</span>'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="delRow('supervisores',${s2.id})">🗑</button></td>
    </tr>`;
  }).join('');
}

function renderPolizas(s='') {
  const q=(s||searches.polizas||'').toLowerCase();
  const fil=document.getElementById('pf-estado')?.value||'todos';
  const d=cache.polizas.filter(p=>{
    const ms=(p.numero_poliza||'').toLowerCase().includes(q)||(p.aseguradora||'').toLowerCase().includes(q)||
              (p.vehiculos?.placa||'').toLowerCase().includes(q)||(p.vehiculos?.ficha||'').toLowerCase().includes(q);
    const hoy=new Date().toISOString().split('T')[0];
    const dias=p.hasta?Math.ceil((new Date(p.hasta)-new Date())/(1000*60*60*24)):null;
    const est=!p.hasta?'sin-fecha':p.hasta<hoy?'vencida':dias<=30?'critica':dias<=90?'proxima':'activa';
    if(fil==='todos') return ms;
    return ms&&est===fil;
  });
  const tb=document.getElementById('tpo');
  if(!d.length){ tb.innerHTML=emptyRow(8,'📄','Sin pólizas'); return; }
  const hoy=new Date().toISOString().split('T')[0];
  tb.innerHTML=d.map(p=>{
    const dias=p.hasta?Math.ceil((new Date(p.hasta)-new Date())/(1000*60*60*24)):null;
    const est=!p.hasta?'sin-fecha':p.hasta<hoy?'vencida':dias<=30?'critica':dias<=90?'proxima':'activa';
    const semaforo={
      'activa':  ['badge bg','✅ Activa'],
      'proxima': ['badge by','⚠️ Vence pronto'],
      'critica': ['badge bo','🔥 '+dias+'d restantes'],
      'vencida': ['badge br','❌ Vencida'],
      'sin-fecha':['badge by','— Sin fecha']
    }[est];
    const rowStyle=est==='critica'?'background:rgba(224,92,42,0.05)':est==='vencida'?'background:rgba(232,69,69,0.05)':'';
    return`<tr style="${rowStyle}">
      <td>${p.vehiculos?vHtml(p.vehiculos):'—'}</td>
      <td style="font-family:var(--fm);font-size:11px">${p.numero_poliza||'—'}</td>
      <td>${p.aseguradora||'—'}</td>
      <td style="font-family:var(--fm);font-size:11px">${fmtDate(p.desde)}</td>
      <td style="font-family:var(--fm);font-size:11px">${fmtDate(p.hasta)}</td>
      <td style="font-family:var(--fm);font-size:11px;color:var(--muted)">${dias!==null?dias+' días':'—'}</td>
      <td><span class="${semaforo[0]}">${semaforo[1]}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="delRow('polizas',${p.id})">🗑</button></td>
    </tr>`;
  }).join('');
  // KPI counts
  const tot=cache.polizas.length;
  const crit=cache.polizas.filter(p=>{const d2=p.hasta?Math.ceil((new Date(p.hasta)-new Date())/(1000*60*60*24)):null;return d2!==null&&d2<=30&&d2>0;}).length;
  const venc=cache.polizas.filter(p=>p.hasta&&p.hasta<hoy).length;
  const kEl=document.getElementById('poliza-kpis');
  if(kEl) kEl.innerHTML=`
    <span style="font-size:12px;color:var(--muted)">Total: <strong style="color:var(--text)">${tot}</strong></span>
    ${crit>0?`<span style="font-size:12px;color:var(--accent2)">🔥 Críticas: <strong>${crit}</strong></span>`:''}
    ${venc>0?`<span style="font-size:12px;color:var(--red)">❌ Vencidas: <strong>${venc}</strong></span>`:''}
    ${crit===0&&venc===0?`<span style="font-size:12px;color:var(--green)">✅ Todas vigentes</span>`:''}`;
}

const tipoBadges={tape:'badge by',pinchazo:'badge bo','reventón':'badge br','fuga lenta':'badge by'};
const estPBadge={reparado:'badge bg',pendiente:'badge by',sustituido:'badge bb'};
const estRBadge={pendiente:'badge by','en curso':'badge bb',completado:'badge bg'};

function renderPinchazos(s='') {
  const q=(s||searches.pinchazos||'').toLowerCase();
  const d=cache.pinchazos.filter(p=>{
    const v=p.vehiculos; const ms=!q||(v?.placa||'').toLowerCase().includes(q)||(v?.marca||'').toLowerCase().includes(q)||(v?.ficha||'').toLowerCase().includes(q);
    return ms&&(filts.pinchazos==='todos'||p.tipo===filts.pinchazos);
  });
  const tb=document.getElementById('tpi');
  if(!d.length){ tb.innerHTML=emptyRow(8,'🔧','Sin pinchazos'); return; }
  tb.innerHTML=d.map(p=>`<tr>
    <td style="font-family:var(--fm);font-size:11px">${fmtDate(p.fecha)}</td>
    <td>${p.vehiculos?vHtml(p.vehiculos):'—'}</td>
    <td><span class="${tipoBadges[p.tipo]||'badge by'}">${p.tipo}</span></td>
    <td style="font-size:12px">${p.posicion||'—'}</td>
    <td style="font-size:12px">${p.reparacion||'—'}</td>
    <td><span class="cost cost-a">${parseFloat(p.coste)>0?fmtRD(p.coste):'—'}</span></td>
    <td><span class="${estPBadge[p.estado]||'badge by'}">${p.estado}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="delRow('pinchazos',${p.id})">🗑</button></td>
  </tr>`).join('');
}

function renderReparaciones(s='') {
  const q=(s||searches.reparaciones||'').toLowerCase();
  const d=cache.reparaciones.filter(r=>{
    const v=r.vehiculos; const ms=!q||(v?.placa||'').toLowerCase().includes(q)||(r.tipo||'').toLowerCase().includes(q)||(r.taller||'').toLowerCase().includes(q);
    return ms&&(filts.reparaciones==='todos'||r.estado===filts.reparaciones);
  });
  const tb=document.getElementById('tre');
  if(!d.length){ tb.innerHTML=emptyRow(7,'🛠️','Sin reparaciones'); return; }
  tb.innerHTML=d.map(r=>`<tr>
    <td style="font-family:var(--fm);font-size:11px">${fmtDate(r.fecha)}</td>
    <td>${r.vehiculos?vHtml(r.vehiculos):'—'}</td>
    <td>${r.tipo||'—'}</td>
    <td style="font-size:12px;color:var(--muted)">${r.taller||'—'}</td>
    <td><span class="cost cost-a">${parseFloat(r.coste)>0?fmtRD(r.coste):'—'}</span></td>
    <td><span class="${estRBadge[r.estado]||'badge by'}">${r.estado}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="delRow('reparaciones',${r.id})">🗑</button></td>
  </tr>`).join('');
}

function renderNeumaticos(s='') {
  const q=(s||searches.neumaticos||'').toLowerCase();
  const d=cache.neumaticos.filter(n=>{ const v=n.vehiculos; return !q||(v?.placa||'').toLowerCase().includes(q)||(n.marca||'').toLowerCase().includes(q); });
  const tb=document.getElementById('tne');
  if(!d.length){ tb.innerHTML=emptyRow(8,'⚙️','Sin registros'); return; }
  tb.innerHTML=d.map(n=>`<tr>
    <td style="font-family:var(--fm);font-size:11px">${fmtDate(n.fecha)}</td>
    <td>${n.vehiculos?vHtml(n.vehiculos):'—'}</td>
    <td style="font-size:12px">${n.posicion||'—'}</td>
    <td><strong>${n.marca||'—'}</strong><br><span style="font-size:11px;color:var(--muted);font-family:var(--fm)">${n.medida||''}</span></td>
    <td style="font-family:var(--fm);font-size:11px">${n.km?Number(n.km).toLocaleString()+' km':'—'}</td>
    <td><span class="cost cost-a">${parseFloat(n.coste)>0?fmtRD(n.coste):'—'}</span></td>
    <td style="font-family:var(--fm);font-size:11px;color:var(--muted)">${n.prox_km?Number(n.prox_km).toLocaleString()+' km':'—'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="delRow('neumaticos',${n.id})">🗑</button></td>
  </tr>`).join('');
}

// ═══ HISTORIAL ═══
function renderHistorialSelect() {
  const sel=document.getElementById('hvsel');
  const cur=sel.value;
  sel.innerHTML='<option value="">— Todos los vehículos —</option>';
  cache.vehiculos.forEach(v=>{ sel.innerHTML+=`<option value="${v.id}" ${cur==v.id?'selected':''}>${vLabel(v)}</option>`; });
  renderHistorial();
}

function renderHistorial() {
  const vid=parseInt(document.getElementById('hvsel').value)||null;
  const pin=cache.pinchazos.filter(p=>!vid||p.vehiculo_id===vid);
  const rep=cache.reparaciones.filter(r=>!vid||r.vehiculo_id===vid);
  const neu=cache.neumaticos.filter(n=>!vid||n.vehiculo_id===vid);
  const c=document.getElementById('hvcontent');
  if(!pin.length&&!rep.length&&!neu.length){ c.innerHTML='<div class="es"><div class="ei">📋</div><div class="et">Sin historial</div></div>'; return; }
  const tot=[...pin,...rep,...neu].reduce((s,x)=>s+(parseFloat(x.coste)||0),0);
  const evts=[...pin.map(x=>({...x,_t:'pi'})),...rep.map(x=>({...x,_t:'re'})),...neu.map(x=>({...x,_t:'ne'}))].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  c.innerHTML=`
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="stat-card sc-o"><div class="stat-lbl">Pinchazos</div><div class="stat-val sv-o">${pin.length}</div></div>
      <div class="stat-card sc-b"><div class="stat-lbl">Reparaciones</div><div class="stat-val sv-b">${rep.length}</div></div>
      <div class="stat-card sc-g"><div class="stat-lbl">Coste Total</div><div class="stat-val sv-g" style="font-size:18px">${fmtRD(tot)}</div></div>
    </div>
    <div class="tw" style="padding:16px">
      <div class="tl">${evts.map(e=>{
        const vn=e.vehiculos?vLabel(e.vehiculos):'—';
        if(e._t==='pi') return`<div class="tli"><div class="tld pi">🔧</div><div class="tlc"><div class="tlt">${e.tipo||''} — ${e.posicion||''}</div><div class="tlm">${fmtDate(e.fecha)} · ${vn}</div><div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;align-items:center"><span class="badge by">${e.reparacion||''}</span>${parseFloat(e.coste)>0?`<span class="cost cost-a">${fmtRD(e.coste)}</span>`:''}</div>${e.notas?`<div class="tln">${e.notas}</div>`:''}</div></div>`;
        if(e._t==='re') return`<div class="tli"><div class="tld re">🛠️</div><div class="tlc"><div class="tlt">${e.tipo||'Reparación'}</div><div class="tlm">${fmtDate(e.fecha)} · ${vn}</div><div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;align-items:center">${e.taller?`<span class="badge bb">${e.taller}</span>`:''}<span class="${estRBadge[e.estado]||'badge by'}">${e.estado}</span>${parseFloat(e.coste)>0?`<span class="cost cost-a">${fmtRD(e.coste)}</span>`:''}</div>${e.notas?`<div class="tln">${e.notas}</div>`:''}</div></div>`;
        return`<div class="tli"><div class="tld ne">⚙️</div><div class="tlc"><div class="tlt">Cambio neumático — ${e.posicion||''}</div><div class="tlm">${fmtDate(e.fecha)} · ${vn}</div><div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;align-items:center">${e.marca?`<span class="badge by">${e.marca}</span>`:''}<span style="font-size:11px;color:var(--muted);font-family:var(--fm)">${e.medida||''}</span>${parseFloat(e.coste)>0?`<span class="cost cost-a">${fmtRD(e.coste)}</span>`:''}</div>${e.notas?`<div class="tln">${e.notas}</div>`:''}</div></div>`;
      }).join('')}</div>
    </div>`;
}

// ═══ DASHBOARD MECÁNICA ═══
async async function mechLoad() {
  const camp  = document.getElementById('mf-camp').value;
  const brig  = document.getElementById('mf-brig').value;
  const desde = document.getElementById('mf-desde').value;
  const hasta = document.getElementById('mf-hasta').value;
  let q = sb.from('resumen_trabajos').select('*');
  if(camp)  q = q.eq('campamento',   camp);
  if(brig)  q = q.eq('tipo_brigada', brig);
  if(desde) q = q.gte('fecha', desde);
  if(hasta) q = q.lte('fecha', hasta);
  const {data,error} = await q.order('fecha',{ascending:false});
  if(error){ console.error(error); return; }
  mechRender(data||[]);
}

async function mechReset() {
  ['mf-camp','mf-brig','mf-desde','mf-hasta'].forEach(id=>{ document.getElementById(id).value=''; });
  await mechLoad();
}

function mechRender(data) {
  const tot      = data.length;
  const totP     = data.reduce((s,r)=>s+(+r.total_piezas||0),0);
  const totM     = data.reduce((s,r)=>s+(+r.mano_de_obra||0),0);
  const totC     = data.reduce((s,r)=>s+(+r.costo_total||0),0);
  document.getElementById('mk-total').textContent = tot;
  document.getElementById('mk-piezas').textContent = fmtRD(totP);
  document.getElementById('mk-mano').textContent   = fmtRD(totM);
  document.getElementById('mk-costo').textContent  = fmtRD(totC);

  const grp = key => { const m={}; data.forEach(r=>{m[r[key]]=(m[r[key]]||0)+1;}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); };

  const camps = grp('campamento');
  document.getElementById('mb-camp').textContent = camps.length+' campamentos';
  mechRenderRank('mrank-camp', camps, tot, '#378ADD');

  const sups = grp('supervisor');
  document.getElementById('mb-sup').textContent = sups.length+' supervisores';
  mechRenderRank('mrank-sup', sups, tot, '#D85A30');

  const brigs = grp('ficha_brigada').slice(0,10);
  document.getElementById('mb-brig').textContent = 'Top '+brigs.length;
  mechRenderRank('mrank-brig', brigs, tot, '#1D9E75');

  const lf  = data.filter(r=>r.tipo_brigada==='Brigada Ligera (LF)').length;
  const cf  = data.filter(r=>r.tipo_brigada==='Brigada Camión (CF)').length;
  const adm = data.filter(r=>r.tipo_brigada==='Administrativo').length;
  mechRenderDona(lf,cf,adm,tot);

  const cm={}; data.forEach(r=>{cm[r.campamento]=(cm[r.campamento]||0)+(+r.costo_total||0);});
  mechRenderCosto(Object.entries(cm).sort((a,b)=>b[1]-a[1]));

  mechRenderTabla(data);
  document.getElementById('mb-tabla').textContent = tot+' registros';
}

function mechRenderRank(id, entries, total, color) {
  const el=document.getElementById(id);
  if(!entries.length){ el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:16px">Sin datos</div>'; return; }
  const max=entries[0][1];
  el.innerHTML=entries.map(([name,count])=>{
    const pct=total>0?((count/total)*100).toFixed(1):'0.0';
    const barW=max>0?((count/max)*100).toFixed(1):'0';
    return`<div class="rank-item">
      <div class="rank-top"><span class="rank-name">${name}</span><span class="rank-meta">${count} · <strong>${pct}%</strong></span></div>
      <div class="rank-bar-bg"><div class="rank-bar" style="width:${barW}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

function mechRenderDona(lf,cf,adm,total) {
  const pctLF=total>0?Math.round((lf/total)*100):0;
  document.getElementById('mdona-pct').textContent=pctLF+'%';
  const ctx=document.getElementById('mchart-dona').getContext('2d');
  if(mechDonaChart) mechDonaChart.destroy();
  mechDonaChart=new Chart(ctx,{
    type:'doughnut',
    data:{labels:['Brigada Ligera (LF)','Brigada Camión (CF)','Administrativo'],datasets:[{data:[lf||0.001,cf||0.001,adm||0.001],backgroundColor:['#378ADD','#1D9E75','#f0a500'],borderColor:'#161b24',borderWidth:3,hoverOffset:6}]},
    options:{cutout:'72%',responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+ctx.label+': '+(ctx.parsed===0.001?0:ctx.parsed)+' trabajo'+(ctx.parsed!==1?'s':'')}}}}
  });
  document.getElementById('mdona-legend').innerHTML=[['#378ADD','Brigada Ligera (LF)',lf],['#1D9E75','Brigada Camión (CF)',cf],['#f0a500','Administrativo',adm]]
    .map(([c,l,v])=>`<div class="legend-item"><div class="legend-dot" style="background:${c}"></div><span class="legend-label">${l}</span><span class="legend-val">${v} trab.</span></div>`).join('');
}

function mechRenderCosto(entries) {
  const ctx=document.getElementById('mchart-costo').getContext('2d');
  if(mechCostoChart) mechCostoChart.destroy();
  mechCostoChart=new Chart(ctx,{
    type:'bar',
    data:{labels:entries.map(([k])=>k),datasets:[{label:'Costo Total',data:entries.map(([,v])=>v),backgroundColor:entries.map((_,i)=>i===0?'#f0a500':'rgba(55,138,221,0.75)'),borderRadius:6,borderSkipped:false}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+fmtRD(ctx.parsed.x)}}},scales:{x:{grid:{color:'#2a3347'},ticks:{color:'#6b7a99',font:{size:11},callback:v=>'RD$ '+Number(v).toLocaleString('es-DO',{notation:'compact'})}},y:{grid:{display:false},ticks:{color:'#e8ecf4',font:{size:12}}}}}
  });
}

function mechRenderTabla(data) {
  const tb=document.getElementById('mtabla');
  if(!data.length){ tb.innerHTML=emptyRow(10,'🔩','Sin registros'); return; }
  const brigBadge=t=>t==='Brigada Ligera (LF)'?'badge badge-lf':t==='Brigada Camión (CF)'?'badge badge-cf':'badge badge-adm';
  const brigLabel=t=>t==='Brigada Ligera (LF)'?'LF':t==='Brigada Camión (CF)'?'CF':'ADM';
  tb.innerHTML=data.map(r=>`<tr>
    <td style="font-family:var(--fm);font-size:11px;white-space:nowrap">${fmtDate(r.fecha)}</td>
    <td style="font-size:12px">${r.campamento}</td>
    <td><span class="${brigBadge(r.tipo_brigada)}">${brigLabel(r.tipo_brigada)}</span></td>
    <td style="font-family:var(--fm);font-size:11px">${r.ficha_brigada}</td>
    <td style="font-size:12px">${r.supervisor}</td>
    <td style="font-size:12px">${r.tipo_trabajo}</td>
    <td style="font-size:11px;color:var(--muted)">${r.equipo_unidad||'—'}</td>
    <td><span class="cost cost-c">${+r.mano_de_obra>0?fmtRD(r.mano_de_obra):'—'}</span></td>
    <td><span class="cost cost-t">${+r.total_piezas>0?fmtRD(r.total_piezas):'—'}</span></td>
    <td><span class="cost cost-g">${+r.costo_total>0?fmtRD(r.costo_total):'—'}</span></td>
  </tr>`).join('');
}

// ═══ MODALES ═══
function openM(id) {
  document.getElementById(id).classList.add('open');
  const hoy=new Date().toISOString().split('T')[0];
  document.querySelectorAll('#'+id+' input[type="date"]').forEach(d=>{ if(!d.value) d.value=hoy; });
  fillSelects(id);
}
function closeM(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); }));

function fillSelects(id) {
  const vSels=['pi-vehiculo','re-vehiculo','ne-vehiculo','po-vehiculo'];
  vSels.forEach(sid=>{ const el=document.getElementById(sid); if(!el||!el.closest('#'+id)) return; const cv=el.value; el.innerHTML='<option value="">— Seleccionar —</option>'; cache.vehiculos.forEach(v=>{el.innerHTML+=`<option value="${v.id}" ${cv==v.id?'selected':''}>${vLabel(v)}</option>`;}); });
  const vc=document.getElementById('v-campamento'); if(vc&&vc.closest('#'+id)){ vc.innerHTML='<option value="">— Ninguno —</option>'; cache.campamentos.forEach(c=>{vc.innerHTML+=`<option value="${c.id}">${c.nombre}</option>`;}); }
  const vs=document.getElementById('v-supervisor');  if(vs&&vs.closest('#'+id)){ vs.innerHTML='<option value="">— Ninguno —</option>'; cache.supervisores.forEach(s=>{vs.innerHTML+=`<option value="${s.id}">${s.nombre}</option>`;}); }
  const sc=document.getElementById('s-campamento');  if(sc&&sc.closest('#'+id)){ sc.innerHTML='<option value="">— Seleccionar —</option>'; cache.campamentos.forEach(c=>{sc.innerHTML+=`<option value="${c.id}">${c.nombre}</option>`;}); }
}

// ═══ SAVERS ═══
async function saveVehiculo() {
  const placa=g('v-placa'), ficha=g('v-ficha');
  if(!placa&&!ficha){ toast('Placa o ficha requerida',true); return; }
  const {error}=await sb.from('vehiculos').insert({ficha,placa,marca:g('v-marca'),modelo:g('v-modelo'),anio:g('v-anio'),color:g('v-color'),chasis:g('v-chasis'),motor:g('v-motor'),combustible:g('v-combustible'),campamento_id:gi('v-campamento')||null,supervisor_id:gi('v-supervisor')||null,conductor:g('v-conductor'),zona:g('v-zona'),municipio:g('v-municipio'),estado:g('v-estado'),nota:g('v-nota')});
  if(error){ toast('Error: '+error.message,true); return; }
  cache.vehiculos=[]; closeM('mv'); clearM('mv'); toast('✅ Vehículo guardado'); await ensureVehiculos(); renderVehiculos();
}
async function saveCampamento() {
  const nombre=g('c-nombre'); if(!nombre){ toast('Nombre requerido',true); return; }
  const {error}=await sb.from('campamentos').insert({nombre,codigo:g('c-codigo'),coordinador:g('c-coordinador')});
  if(error){ toast('Error: '+error.message,true); return; }
  cache.campamentos=[]; closeM('mc'); clearM('mc'); toast('✅ Campamento guardado'); await ensureCampamentos(); renderCampamentos();
}
async function saveSupervisor() {
  const nombre=g('s-nombre'); if(!nombre){ toast('Nombre requerido',true); return; }
  const {error}=await sb.from('supervisores').insert({nombre,campamento_id:gi('s-campamento')||null});
  if(error){ toast('Error: '+error.message,true); return; }
  cache.supervisores=[]; closeM('ms'); clearM('ms'); toast('✅ Supervisor guardado'); await ensureSupervisores(); renderSupervisores();
}
async function savePoliza() {
  const vid=gi('po-vehiculo'); if(!vid){ toast('Selecciona vehículo',true); return; }
  const {error}=await sb.from('polizas').insert({vehiculo_id:vid,numero_poliza:g('po-numero'),referencia:g('po-ref'),aseguradora:g('po-aseg'),fianza:parseFloat(g('po-fianza'))||null,desde:g('po-desde')||null,hasta:g('po-hasta')||null});
  if(error){ toast('Error: '+error.message,true); return; }
  closeM('mpo'); clearM('mpo'); toast('✅ Póliza guardada'); await loadPolizas(); renderPolizas();
}
async function savePinchazo() {
  const vid=gi('pi-vehiculo'), fecha=g('pi-fecha'); if(!vid||!fecha){ toast('Vehículo y fecha requeridos',true); return; }
  const {error}=await sb.from('pinchazos').insert({vehiculo_id:vid,fecha,tipo:g('pi-tipo'),posicion:g('pi-pos'),reparacion:g('pi-rep'),coste:parseFloat(g('pi-coste'))||0,estado:g('pi-est'),km:parseInt(g('pi-km'))||null,notas:g('pi-nota')});
  if(error){ toast('Error: '+error.message,true); return; }
  cache.pinchazos=[]; closeM('mpi'); clearM('mpi'); toast('✅ Pinchazo registrado'); await loadPinchazos(); renderPinchazos();
}
async function saveReparacion() {
  const vid=gi('re-vehiculo'), fecha=g('re-fecha'); if(!vid||!fecha){ toast('Vehículo y fecha requeridos',true); return; }
  const mano=parseFloat(g('re-mano'))||0, piezas=parseFloat(g('re-piezas'))||0;
  const {error}=await sb.from('reparaciones').insert({vehiculo_id:vid,fecha,tipo:g('re-tipo'),taller:g('re-taller'),coste_mano:mano,coste_piezas:piezas,coste:mano+piezas,km:parseInt(g('re-km'))||null,estado:g('re-est'),notas:g('re-nota')});
  if(error){ toast('Error: '+error.message,true); return; }
  cache.reparaciones=[]; closeM('mre'); clearM('mre'); toast('✅ Reparación guardada'); await loadReparaciones(); renderReparaciones();
}
async function saveNeumatico() {
  const vid=gi('ne-vehiculo'), fecha=g('ne-fecha'); if(!vid||!fecha){ toast('Vehículo y fecha requeridos',true); return; }
  const {error}=await sb.from('neumaticos').insert({vehiculo_id:vid,fecha,posicion:g('ne-pos'),marca:g('ne-marca'),medida:g('ne-medida'),km:parseInt(g('ne-km'))||null,coste:parseFloat(g('ne-coste'))||0,prox_km:parseInt(g('ne-prox'))||null,notas:g('ne-nota')});
  if(error){ toast('Error: '+error.message,true); return; }
  cache.neumaticos=[]; closeM('mne'); clearM('mne'); toast('✅ Cambio registrado'); await loadNeumaticos(); renderNeumaticos();
}

// ═══ DELETE ═══
async function delRow(tabla,id) {
  if(!confirm('¿Eliminar este registro?')) return;
  const {error}=await sb.from(tabla).delete().eq('id',id);
  if(error){ toast('Error: '+error.message,true); return; }
  cache[tabla]=[]; toast('🗑 Eliminado');
  if(tabla==='vehiculos')    { await ensureVehiculos();    renderVehiculos(); }
  if(tabla==='campamentos')  { await ensureCampamentos();  renderCampamentos(); }
  if(tabla==='supervisores') { await ensureSupervisores(); renderSupervisores(); }
  if(tabla==='polizas')      { await loadPolizas();        renderPolizas(); }
  if(tabla==='pinchazos')    { await loadPinchazos();      renderPinchazos(); }
  if(tabla==='reparaciones') { await loadReparaciones();   renderReparaciones(); }
  if(tabla==='neumaticos')   { await loadNeumaticos();     renderNeumaticos(); }
}

// ═══ FILTERS ═══
function setF(el,mod,val) {
  el.closest('.fr').querySelectorAll('.fc').forEach(c=>c.classList.remove('active'));
  el.classList.add('active'); filts[mod]=val;
  if(mod==='pinchazos')    renderPinchazos();
  if(mod==='reparaciones') renderReparaciones();
}
function buscar(mod,val) {
  searches[mod]=val;
  if(mod==='vehiculos')    renderVehiculos(val);
  if(mod==='campamentos')  renderCampamentos(val);
  if(mod==='supervisores') renderSupervisores(val);
  if(mod==='polizas')      renderPolizas(val);
  if(mod==='pinchazos')    renderPinchazos(val);
  if(mod==='reparaciones') renderReparaciones(val);
  if(mod==='neumaticos')   renderNeumaticos(val);
  if(mod==='conductores')  renderConductores(val);
  if(mod==='preventivo')   renderPreventivo(val);
  if(mod==='combustible')  renderCombustible(val);
}

function setPolizaF(el,val){
  el.closest('div').querySelectorAll('.fc').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('pf-estado').value=val;
  renderPolizas();
}

// ── Piezas dinámicas ──
let piezasCount = 0;
function addPieza(){
  const i = piezasCount++;
  const div = document.createElement('div');
  div.id = 'pieza-'+i;
  div.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center';
  div.innerHTML = `
    <input placeholder="Descripción de pieza" oninput="calcTotal()" style="font-size:12px;padding:6px 10px">
    <input type="number" placeholder="Cant." value="1" min="1" oninput="calcTotal()" style="font-size:12px;padding:6px 10px">
    <input type="number" placeholder="Costo unit." step="0.01" oninput="calcTotal()" style="font-size:12px;padding:6px 10px">
    <button class="btn btn-danger btn-sm" onclick="document.getElementById('pieza-${i}').remove();calcTotal()">✕</button>`;
  document.getElementById('piezas-lista').appendChild(div);
}
function calcTotal(){
  const mano = parseFloat(document.getElementById('tm-mano').value)||0;
  let piezasTotal = 0;
  document.querySelectorAll('#piezas-lista > div').forEach(row=>{
    const inputs = row.querySelectorAll('input[type=number]');
    piezasTotal += (parseFloat(inputs[0].value)||0) * (parseFloat(inputs[1].value)||0);
  });
  document.getElementById('tm-total').textContent = fmtRD(mano + piezasTotal);
}
async function saveTrabajo(){
  const fecha=g('tm-fecha'), camp=g('tm-campamento'), ficha=g('tm-ficha'), sup=g('tm-supervisor'), tipo=g('tm-tipo');
  if(!fecha||!camp||!ficha||!sup||!tipo){ toast('Fecha, campamento, ficha, supervisor y tipo son obligatorios',true); return; }
  const {data,error} = await sb.from('trabajos_mecanica').insert({
    fecha, campamento:camp, tipo_brigada:g('tm-brigada'), ficha_brigada:ficha,
    supervisor:sup, tipo_trabajo:tipo, equipo_unidad:g('tm-equipo'),
    mecanico:g('tm-mecanico'), descripcion:g('tm-desc'),
    mano_de_obra:parseFloat(g('tm-mano'))||0
  }).select().single();
  if(error){ toast('Error: '+error.message,true); return; }
  // Insert piezas
  const rows = [];
  document.querySelectorAll('#piezas-lista > div').forEach(row=>{
    const inputs = row.querySelectorAll('input');
    const desc = inputs[0].value.trim();
    const cant = parseInt(inputs[1].value)||1;
    const costo = parseFloat(inputs[2].value)||0;
    if(desc) rows.push({trabajo_id:data.id, descripcion_pieza:desc, cantidad:cant, costo_unitario:costo});
  });
  if(rows.length){ await sb.from('piezas_trabajo').insert(rows); }
  closeM('mtrab'); clearM('mtrab');
  document.getElementById('piezas-lista').innerHTML=''; piezasCount=0;
  toast('✅ Trabajo registrado correctamente');
  mechLoad();
}

function exportPDF(titulo){
  const h = document.querySelector('.print-header');
  if(h){ h.innerHTML = `<img src="data:image/png;base64,${document.querySelector('.logo-area img').src.split(',')[1].substring(0,20)}..." style="height:40px"> <h2 style="margin:6px 0 2px;font-size:18px">${titulo}</h2><p style="font-size:12px;color:#666">Eureka Fleet Manager · ${new Date().toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'})}</p>`; }
  window.print();
}

// ── Conductores (localStorage) ──
function loadConductoresLocal(){ return JSON.parse(localStorage.getItem('conductores')||'[]'); }
function saveConductoresLocal(d){ localStorage.setItem('conductores',JSON.stringify(d)); }
function renderConductores(s=''){
  const q=(s||'').toLowerCase();
  const all=loadConductoresLocal().filter(c=>(c.nombre||'').toLowerCase().includes(q)||(c.cedula||'').toLowerCase().includes(q));
  const tb=document.getElementById('tcon');
  if(!tb) return;
  if(!all.length){ tb.innerHTML=emptyRow(8,'🚘','Sin conductores registrados'); return; }
  const hoy=new Date().toISOString().split('T')[0];
  const estV={activo:'badge bg',inactivo:'badge br',vacaciones:'badge by'};
  tb.innerHTML=all.map((c,i)=>{
    const vto=c.vto||'';
    const vtoStyle=vto&&vto<hoy?'color:var(--red)':vto&&Math.ceil((new Date(vto)-new Date())/(86400000))<=60?'color:var(--accent2)':'';
    const v=cache.vehiculos.find(x=>x.id==c.vehiculo_id);
    return`<tr>
      <td><strong>${c.nombre}</strong></td>
      <td style="font-family:var(--fm);font-size:11px">${c.cedula||'—'}</td>
      <td><span class="badge bb">${c.licencia||'—'}</span></td>
      <td style="font-family:var(--fm);font-size:11px;${vtoStyle}">${fmtDate(vto)||'—'}</td>
      <td style="font-size:12px">${c.tel||'—'}</td>
      <td style="font-size:12px">${v?vLabel(v):'—'}</td>
      <td><span class="${estV[c.estado]||'badge by'}">${c.estado||'—'}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="delConductor(${i})">🗑</button></td>
    </tr>`;
  }).join('');
}
async function saveConductor(){
  const nombre=g('con-nombre'); if(!nombre){ toast('Nombre requerido',true); return; }
  const all=loadConductoresLocal();
  all.push({nombre,cedula:g('con-cedula'),licencia:g('con-licencia'),vto:g('con-vto'),tel:g('con-tel'),emerg:g('con-emerg'),vehiculo_id:gi('con-vehiculo')||null,estado:g('con-estado'),nota:g('con-nota')});
  saveConductoresLocal(all); closeM('mcon'); clearM('mcon');
  toast('✅ Conductor guardado'); renderConductores();
}
function delConductor(i){ if(!confirm('¿Eliminar?')) return; const all=loadConductoresLocal(); all.splice(i,1); saveConductoresLocal(all); renderConductores(); }

// ── Mantenimiento preventivo (localStorage) ──
function loadPreventivoLocal(){ return JSON.parse(localStorage.getItem('preventivo')||'[]'); }
function savePreventivoLocal(d){ localStorage.setItem('preventivo',JSON.stringify(d)); }
function renderPreventivo(s=''){
  const q=(s||'').toLowerCase();
  const all=loadPreventivoLocal().filter(p=>{const v=cache.vehiculos.find(x=>x.id==p.vehiculo_id); return !q||(vLabel(v)||'').toLowerCase().includes(q);});
  const tb=document.getElementById('tprev'); const alerts=document.getElementById('prev-alerts');
  if(!tb) return;
  // Show alerts for overdue
  const criticos=all.filter(p=>{ const v=cache.vehiculos.find(x=>x.id==p.vehiculo_id); return p.km_programado&&(parseInt(v?.km||0)>=parseInt(p.km_programado)); });
  if(alerts) alerts.innerHTML=criticos.length?`<div style="background:rgba(232,69,69,.1);border:1px solid rgba(232,69,69,.3);border-radius:8px;padding:12px 16px;color:var(--red);font-size:13px">🚨 <strong>${criticos.length} vehículo(s)</strong> con mantenimiento vencido por kilómetros</div>`:'';
  if(!all.length){ tb.innerHTML=emptyRow(7,'🛡️','Sin mantenimientos programados'); return; }
  tb.innerHTML=all.map((p,i)=>{
    const v=cache.vehiculos.find(x=>x.id==p.vehiculo_id);
    const vencido=p.km_programado&&parseInt(v?.km||0)>=parseInt(p.km_programado);
    return`<tr style="${vencido?'background:rgba(232,69,69,.05)':''}">
      <td>${v?vHtml(v):'—'}</td>
      <td>${p.tipo||'—'}</td>
      <td style="font-family:var(--fm)">${p.km_programado?Number(p.km_programado).toLocaleString()+' km':'—'}</td>
      <td style="font-family:var(--fm);font-size:11px">${fmtDate(p.fecha)||'—'}</td>
      <td><span class="${vencido?'badge br':'badge bg'}">${vencido?'⚠️ Vencido':'✅ Al día'}</span></td>
      <td style="font-size:12px;color:var(--muted)">${p.nota||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="delPreventivo(${i})">🗑</button></td>
    </tr>`;
  }).join('');
}
async function savePreventivo(){
  const vid=gi('pv-vehiculo'); if(!vid){ toast('Selecciona vehículo',true); return; }
  const all=loadPreventivoLocal();
  all.push({vehiculo_id:vid,tipo:g('pv-tipo'),km_programado:g('pv-km'),fecha:g('pv-fecha'),km_anterior:g('pv-kmant'),nota:g('pv-nota')});
  savePreventivoLocal(all); closeM('mprev'); clearM('mprev');
  toast('✅ Mantenimiento programado'); renderPreventivo();
}
function delPreventivo(i){ if(!confirm('¿Eliminar?')) return; const all=loadPreventivoLocal(); all.splice(i,1); savePreventivoLocal(all); renderPreventivo(); }

// ── Combustible (localStorage) ──
function calcCombTotal(){ const l=parseFloat(document.getElementById('cb-litros')?.value)||0; const p=parseFloat(document.getElementById('cb-precio')?.value)||0; const t=document.getElementById('cb-total'); if(t) t.value=(l*p).toFixed(2); }
function loadCombustibleLocal(){ return JSON.parse(localStorage.getItem('combustible')||'[]'); }
function saveCombustibleLocal(d){ localStorage.setItem('combustible',JSON.stringify(d)); }
function renderCombustible(s=''){
  const q=(s||'').toLowerCase();
  const all=loadCombustibleLocal().filter(c=>{ const v=cache.vehiculos.find(x=>x.id==c.vehiculo_id); return !q||(vLabel(v)||'').toLowerCase().includes(q);}).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const tb=document.getElementById('tcomb');
  if(!tb) return;
  // KPIs
  const mesAct=new Date().toISOString().substring(0,7);
  const estesMes=all.filter(c=>c.fecha&&c.fecha.startsWith(mesAct));
  const totL=estesMes.reduce((s,c)=>s+(parseFloat(c.litros)||0),0);
  const totG=estesMes.reduce((s,c)=>s+(parseFloat(c.total)||0),0);
  if(document.getElementById('comb-mes')) document.getElementById('comb-mes').textContent=estesMes.length;
  if(document.getElementById('comb-litros')) document.getElementById('comb-litros').textContent=totL.toFixed(0)+' L';
  if(document.getElementById('comb-gasto')) document.getElementById('comb-gasto').textContent=fmtRD(totG);
  if(document.getElementById('comb-prom')) document.getElementById('comb-prom').textContent=estesMes.length?fmtRD(totG/estesMes.length):'—';
  if(!all.length){ tb.innerHTML=emptyRow(9,'⛽','Sin cargas registradas'); return; }
  tb.innerHTML=all.map((c,i)=>{
    const v=cache.vehiculos.find(x=>x.id==c.vehiculo_id);
    return`<tr>
      <td style="font-family:var(--fm);font-size:11px">${fmtDate(c.fecha)}</td>
      <td>${v?vHtml(v):'—'}</td>
      <td><span class="badge bb">${c.tipo||'—'}</span></td>
      <td style="font-family:var(--fm)">${c.litros||'—'} L</td>
      <td style="font-family:var(--fm);font-size:11px">${c.precio?'RD$ '+c.precio:'—'}</td>
      <td><span class="cost cost-a">${c.total?fmtRD(c.total):'—'}</span></td>
      <td style="font-family:var(--fm);font-size:11px">${c.km?Number(c.km).toLocaleString()+' km':'—'}</td>
      <td style="font-size:12px">${c.gasolinera||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="delCombustible(${i})">🗑</button></td>
    </tr>`;
  }).join('');
}
async function saveCombustible(){
  const vid=gi('cb-vehiculo'); const fecha=g('cb-fecha');
  if(!vid||!fecha){ toast('Vehículo y fecha requeridos',true); return; }
  const all=loadCombustibleLocal();
  all.push({vehiculo_id:vid,fecha,tipo:g('cb-tipo'),litros:g('cb-litros'),precio:g('cb-precio'),total:g('cb-total'),km:g('cb-km'),gasolinera:g('cb-gasolinera'),nota:g('cb-nota')});
  saveCombustibleLocal(all); closeM('mcomb'); clearM('mcomb');
  toast('✅ Carga registrada'); renderCombustible();
}
function delCombustible(i){ if(!confirm('¿Eliminar?')) return; const all=loadCombustibleLocal(); all.splice(i,1); saveCombustibleLocal(all); renderCombustible(); }


// ══════════════════════════════════════════════════════════════
// MAPA DE FLOTA
// ══════════════════════════════════════════════════════════════

// Coordenadas y colores por campamento
const CAMP_META = {
  'NorOeste (NO)':         { pin:'NO', color:'#378ADD', coord:[200,115] },
  'Distrito Norte (DN)':   { pin:'DN', color:'#1D9E75', coord:[320,100] },
  'Distrito Sur (DS)':     { pin:'DS', color:'#f0a500', coord:[390,185] },
  'Villa Altagracia (VA)': { pin:'VA', color:'#D85A30', coord:[340,170] },
  'Bani (BN)':             { pin:'BN', color:'#7F77DD', coord:[295,210] },
  'San Juan (SJM)':        { pin:'SJM',color:'#2dcc85', coord:[195,185] },
  'Neyba (NY)':            { pin:'NY', color:'#4a90e2', coord:[155,215] },
  'Barahona (BR)':         { pin:'BR', color:'#e84545', coord:[220,248] },
};

let mapaSelectedCamp = null;

async function mapaInit() {
  await ensureVehiculos();
  await ensureCampamentos();
  await ensureSupervisores();
  mapaRenderKPIs();
  mapaRenderPins();
  mapaRenderRanking();
}

function mapaRenderKPIs() {
  const total  = cache.vehiculos.length;
  const activos= cache.vehiculos.filter(v=>v.estado==='activo').length;
  const taller = cache.vehiculos.filter(v=>v.estado==='taller').length;
  const camps  = cache.campamentos.length;
  document.getElementById('mapa-kpis').innerHTML = `
    <div class="stat-card sc-b"><div class="stat-lbl">Total Flota</div><div class="stat-val sv-b">${total}</div><div class="stat-sub">unidades</div></div>
    <div class="stat-card sc-g"><div class="stat-lbl">Activos</div><div class="stat-val sv-g">${activos}</div><div class="stat-sub">en operación</div></div>
    <div class="stat-card sc-o"><div class="stat-lbl">En Taller</div><div class="stat-val sv-o">${taller}</div><div class="stat-sub">en reparación</div></div>
    <div class="stat-card sc-y"><div class="stat-lbl">Campamentos</div><div class="stat-val sv-y">${camps}</div><div class="stat-sub">activos</div></div>`;
}

function mapaRenderPins() {
  // Count vehicles per campamento
  const counts = {};
  cache.vehiculos.forEach(v => {
    const n = v.campamentos?.nombre || 'Sin campamento';
    counts[n] = (counts[n]||0) + 1;
  });
  const max = Math.max(...Object.values(counts), 1);

  Object.entries(CAMP_META).forEach(([name, meta]) => {
    const cnt = counts[name] || 0;
    // Update counter text
    const cntEl = document.getElementById('cnt-'+meta.pin);
    if (cntEl) cntEl.textContent = cnt + ' u.';
    // Scale pin size with count
    const pinEl = document.getElementById('pin-'+meta.pin);
    if (pinEl) {
      const r = 8 + Math.round((cnt/max) * 8);
      pinEl.setAttribute('r', r);
    }
  });

  document.getElementById('mapa-count').textContent = Object.keys(CAMP_META).length + ' campamentos';
}

function mapaRenderRanking() {
  const counts = {};
  cache.vehiculos.forEach(v => {
    const n = v.campamentos?.nombre || 'Sin campamento';
    counts[n] = (counts[n]||0) + 1;
  });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const max = sorted[0]?.[1] || 1;

  document.getElementById('mapa-ranking').innerHTML = sorted.map(([name, cnt]) => {
    const meta = CAMP_META[name];
    const color = meta?.color || '#6b7a99';
    const pct = ((cnt/cache.vehiculos.length)*100).toFixed(0);
    const shortName = name.replace(/ \([A-Z]+\)/,'');
    return `<div style="margin-bottom:11px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center">
        <span style="font-size:12px;color:var(--text);font-weight:500;display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
          ${shortName}
        </span>
        <span style="font-family:var(--fm);font-size:11px;color:var(--muted)">${cnt} · ${pct}%</span>
      </div>
      <div style="height:5px;background:var(--s2);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${((cnt/max)*100).toFixed(0)}%;background:${color};border-radius:3px;transition:width 1s cubic-bezier(.4,0,.2,1)"></div>
      </div>
    </div>`;
  }).join('');
}

function mapaSelectCamp(name) {
  // Deselect all
  document.querySelectorAll('.camp-pin').forEach(g => g.classList.remove('selected'));
  // Select clicked
  const pins = document.querySelectorAll('.camp-pin');
  pins.forEach(g => { if(g.dataset.camp === name) g.classList.add('selected'); });

  mapaSelectedCamp = name;
  const meta = CAMP_META[name];
  const color = meta?.color || '#378ADD';

  // Filter vehicles for this camp
  const vehs = cache.vehiculos.filter(v => v.campamentos?.nombre === name);
  const activos = vehs.filter(v=>v.estado==='activo').length;
  const taller  = vehs.filter(v=>v.estado==='taller').length;
  const sups = [...new Set(vehs.map(v=>v.supervisores?.nombre).filter(Boolean))];
  const camp = cache.campamentos.find(c=>c.nombre===name);

  // Title
  document.getElementById('camp-detail-title').innerHTML =
    `<span style="color:${color}">●</span> ${name.replace(/ \([A-Z]+\)/,'')}`;

  // Body
  const lf = vehs.filter(v=>(v.ficha||'').includes('LF')||(v.ficha||'').includes('LP')||(v.ficha||'').includes('SF')).length;
  const cf = vehs.filter(v=>(v.ficha||'').includes('CF')).length;

  document.getElementById('camp-detail-body').innerHTML = `
    <div class="mapa-stat"><span class="mapa-stat-label">Total unidades</span><span class="mapa-stat-val" style="color:${color};font-size:16px;font-weight:700">${vehs.length}</span></div>
    <div class="mapa-stat"><span class="mapa-stat-label">✅ Activos</span><span class="mapa-stat-val" style="color:var(--green)">${activos}</span></div>
    <div class="mapa-stat"><span class="mapa-stat-label">🔧 En taller</span><span class="mapa-stat-val" style="color:var(--accent2)">${taller}</span></div>
    <div class="mapa-stat"><span class="mapa-stat-label">🏍️ Brigada Ligera</span><span class="mapa-stat-val">${lf}</span></div>
    <div class="mapa-stat"><span class="mapa-stat-label">🚛 Brigada Camión</span><span class="mapa-stat-val">${cf}</span></div>
    <div class="mapa-stat"><span class="mapa-stat-label">👷 Coordinador</span><span class="mapa-stat-val">${camp?.coordinador||'—'}</span></div>
    <div class="mapa-stat" style="flex-direction:column;align-items:flex-start;gap:6px">
      <span class="mapa-stat-label">Supervisores</span>
      <div>${sups.map(s=>`<span class="badge bb" style="margin:2px 2px 0 0;font-size:10px">${s}</span>`).join('')||'—'}</div>
    </div>
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(42,51,71,.3)">
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-family:var(--fm)">FICHAS</div>
      <div style="max-height:120px;overflow-y:auto;display:flex;flex-wrap:wrap">
        ${vehs.slice(0,30).map(v=>`<span class="veh-chip" onclick="goPage('vehiculos',document.querySelector('.nav-item:nth-child(4)'));setTimeout(()=>buscar('vehiculos','${v.ficha||''}'),300)">${v.ficha||v.placa||'—'}</span>`).join('')}
        ${vehs.length>30?`<span style="font-size:11px;color:var(--muted);padding:4px">+${vehs.length-30} más…</span>`:''}
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" style="margin-top:12px;width:100%;justify-content:center;font-size:12px" onclick="goPage('vehiculos',document.querySelector('[onclick*=\'vehiculos\']'));setTimeout(()=>buscar('vehiculos',''),200)">
      Ver flota completa →
    </button>`;
}

function mapaFiltrar() {
  const fil = document.getElementById('map-filter').value;
  // Highlight pins based on filter
  Object.entries(CAMP_META).forEach(([name, meta]) => {
    const pinGroup = [...document.querySelectorAll('.camp-pin')].find(g=>g.dataset.camp===name);
    const vehs = cache.vehiculos.filter(v => v.campamentos?.nombre === name);
    let count;
    if (fil === 'todos')  count = vehs.length;
    if (fil === 'activo') count = vehs.filter(v=>v.estado==='activo').length;
    if (fil === 'taller') count = vehs.filter(v=>v.estado==='taller').length;
    const cntEl = document.getElementById('cnt-'+meta.pin);
    if (cntEl) cntEl.textContent = count + ' u.';
    if (pinGroup) pinGroup.style.opacity = count === 0 ? '0.3' : '1';
  });
}


// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
let curUser = null, curPerfil = null;

const ROL_COLOR = {
  admin:{'bg':'rgba(240,165,0,.2)','c':'#f0a500'},
  supervisor:{'bg':'rgba(55,138,221,.2)','c':'#378ADD'},
  mecanico:{'bg':'rgba(29,158,117,.2)','c':'#1D9E75'},
  consulta:{'bg':'rgba(107,122,153,.2)','c':'#6b7a99'},
};
const ROL_LBL = {admin:'Administrador',supervisor:'Supervisor',mecanico:'Mecánico',consulta:'Solo lectura'};

// helpers UI
function lErr(id,msg){const e=document.getElementById(id);e.textContent=msg;e.style.display='block';setTimeout(()=>e.style.display='none',5000);}
function lOk(id,msg){const e=document.getElementById(id);e.textContent=msg;e.style.display='block';}
function lTab(tab,el){
  ['in','up','pw'].forEach(t=>document.getElementById('lt-'+t).style.display=t===tab?'block':'none');
  document.querySelectorAll('.ltab').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
}
function togglePw(id,btn){
  const i=document.getElementById(id);
  i.type=i.type==='password'?'text':'password';
  btn.textContent=i.type==='password'?'👁':'🙈';
}

// Login
async function doLogin(){
  const email=document.getElementById('l-email').value.trim();
  const pass=document.getElementById('l-pass').value;
  if(!email||!pass){lErr('err-in','Completa email y contraseña');return;}
  const btn=document.getElementById('lbtn-in');
  btn.disabled=true; btn.textContent='Verificando…';
  const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
  if(error){
    btn.disabled=false; btn.textContent='Entrar al sistema';
    const msg=error.message.includes('Invalid')||error.message.includes('invalid')
      ?'Correo o contraseña incorrectos'
      :error.message.includes('Email not confirmed')
      ?'Confirma tu correo primero'
      :error.message;
    lErr('err-in','❌ '+msg);
    return;
  }
  await onLogin(data.user);
}

// Register
async function doRegister(){
  const nombre=document.getElementById('r-nombre').value.trim();
  const email=document.getElementById('r-email').value.trim();
  const pass=document.getElementById('r-pass').value;
  const rol=document.getElementById('r-rol').value;
  const camp=document.getElementById('r-camp').value;
  if(!nombre||!email||!pass){lErr('err-up','Completa todos los campos');return;}
  if(pass.length<6){lErr('err-up','Contraseña mínimo 6 caracteres');return;}
  document.getElementById('lbtn-up').disabled=true;
  const {error}=await sb.auth.signUp({email,password:pass,options:{data:{nombre,rol,campamento:camp}}});
  document.getElementById('lbtn-up').disabled=false;
  if(error){lErr('err-up','❌ '+error.message);return;}
  lOk('ok-up','✅ Cuenta creada. Revisa tu correo para confirmarla.');
}

// Reset
async function doReset(){
  const email=document.getElementById('pw-email').value.trim();
  if(!email){lErr('err-pw','Escribe tu correo');return;}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});
  if(error){lErr('err-pw','❌ '+error.message);return;}
  lOk('ok-pw','✅ Enlace enviado a '+email);
}

// On successful login
async function onLogin(user){
  curUser=user;
  // Get profile
  const {data:perf}=await sb.from('perfiles').select('*').eq('id',user.id).single();
  curPerfil=perf||{nombre:user.email.split('@')[0],rol:'consulta',email:user.email,activo:true};

  const rol=curPerfil.rol||'consulta';
  const nombre=curPerfil.nombre||user.email;
  const rc=ROL_COLOR[rol]||ROL_COLOR.consulta;

  // Show app, hide login
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app-sidebar').style.display='flex';
  document.getElementById('app-main').style.display='flex';

  // Move user pill to topbar slot
  const pill=document.getElementById('user-pill-wrap');
  const slot=document.getElementById('user-pill-slot');
  if(pill&&slot){ pill.style.display='flex'; slot.appendChild(pill); }

  // Update pill UI
  const av=document.getElementById('u-avatar');
  av.textContent=nombre.charAt(0).toUpperCase();
  av.style.background=rc.bg; av.style.color=rc.c;
  document.getElementById('u-name').textContent=nombre;
  document.getElementById('u-role').textContent=ROL_LBL[rol]||rol;

  // Admin extras
  if(rol==='admin') document.getElementById('btn-admin-users').style.display='flex';

  // Apply permissions
  applyPerms(rol);

  // Set date
  document.getElementById('hoy').textContent=new Date().toLocaleDateString('es-DO',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  // Load dashboard
  await loadDashboard();
  toast('✅ Bienvenido, '+nombre.split(' ')[0]+'!');
}

// Permissions per role
function applyPerms(rol){
  if(rol==='consulta'){
    // Hide all add/delete buttons
    document.querySelectorAll('.btn-primary,.btn-danger').forEach(b=>{
      if(!b.closest('#login-screen')&&!b.classList.contains('export-btn'))
        b.style.display='none';
    });
  }
}

// Logout
async function doLogout(){
  await sb.auth.signOut();
  curUser=null; curPerfil=null;
  cache={vehiculos:[],campamentos:[],supervisores:[],polizas:[],pinchazos:[],reparaciones:[],neumaticos:[]};
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('app-sidebar').style.display='none';
  document.getElementById('app-main').style.display='none';
  document.getElementById('user-pill-wrap').style.display='none';
  document.getElementById('btn-admin-users').style.display='none';
  document.getElementById('l-email').value='';
  document.getElementById('l-pass').value='';
  document.getElementById('lbtn-in').disabled=false;
  document.getElementById('lbtn-in').textContent='Entrar al sistema';
  document.getElementById('u-menu').classList.remove('open');
  toast('Sesión cerrada');
}

// User menu
function toggleUMenu(){document.getElementById('u-menu').classList.toggle('open');}
document.addEventListener('click',e=>{
  if(!e.target.closest('.upill')) document.getElementById('u-menu')?.classList.remove('open');
});

// Mi perfil
function showPerfil(){
  document.getElementById('u-menu').classList.remove('open');
  if(!curPerfil) return;
  const rol=curPerfil.rol||'consulta';
  const rc=ROL_COLOR[rol]||ROL_COLOR.consulta;
  const nombre=curPerfil.nombre||'—';
  const m=document.createElement('div');
  m.className='mo open';
  m.innerHTML=`<div class="modal" style="width:380px">
    <div class="mh"><div class="mt">👤 Mi Perfil</div><button class="mc" onclick="this.closest('.mo').remove()">✕</button></div>
    <div class="mb">
      <div style="text-align:center;margin-bottom:18px">
        <div style="width:60px;height:60px;border-radius:50%;background:${rc.bg};color:${rc.c};font-family:var(--fh);font-size:26px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">${nombre.charAt(0).toUpperCase()}</div>
        <div style="font-family:var(--fh);font-size:17px;font-weight:700">${nombre}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">${curPerfil.email||curUser.email}</div>
        <span class="badge bb" style="margin-top:8px">${ROL_LBL[rol]}</span>
      </div>
      <div style="background:var(--s2);border-radius:9px;padding:13px 15px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">Campamento</span><span style="font-size:12px;font-weight:500">${curPerfil.campamento||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="font-size:12px;color:var(--muted)">Estado</span><span class="badge ${curPerfil.activo?'bg':'br'}">${curPerfil.activo?'✅ Activo':'❌ Inactivo'}</span></div>
      </div>
      <div class="fi"><label>Nueva contraseña</label><input id="new-pw" class="linput" type="password" placeholder="Dejar vacío para no cambiar" style="margin-top:6px"></div>
      <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:10px" onclick="changePw()">Actualizar contraseña</button>
    </div>
  </div>`;
  m.addEventListener('click',e=>{if(e.target===m)m.remove();});
  document.body.appendChild(m);
}
async function changePw(){
  const pw=document.getElementById('new-pw')?.value;
  if(!pw||pw.length<6){toast('Mínimo 6 caracteres',true);return;}
  const {error}=await sb.auth.updateUser({password:pw});
  if(error){toast('Error: '+error.message,true);return;}
  toast('✅ Contraseña actualizada');
  document.querySelector('.mo')?.remove();
}

// Gestión usuarios (admin)
async function showUsers(){
  document.getElementById('u-menu').classList.remove('open');
  const {data:users}=await sb.from('perfiles').select('*').order('created_at');
  const m=document.createElement('div');
  m.className='mo open';
  const ROL_OPTS=['admin','supervisor','mecanico','consulta'].map(r=>`<option value="${r}">${ROL_LBL[r]}</option>`).join('');
  m.innerHTML=`<div class="modal" style="width:640px">
    <div class="mh"><div class="mt">⚙️ Gestión de Usuarios</div><button class="mc" onclick="this.closest('.mo').remove()">✕</button></div>
    <div class="mb" style="padding:0;overflow-x:auto">
      <table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Campamento</th><th>Estado</th><th></th></tr></thead>
      <tbody>${(users||[]).map(u=>`<tr>
        <td style="font-weight:500">${u.nombre||'—'}</td>
        <td style="font-size:11px;color:var(--muted)">${u.email||'—'}</td>
        <td><select onchange="updRol('${u.id}',this.value)" style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:12px;padding:3px 6px;outline:none">${['admin','supervisor','mecanico','consulta'].map(r=>`<option value="${r}" ${u.rol===r?'selected':''}>${ROL_LBL[r]}</option>`).join('')}</select></td>
        <td style="font-size:12px">${u.campamento||'—'}</td>
        <td>${u.activo?'<span class="badge bg" style="font-size:10px">Activo</span>':'<span class="badge br" style="font-size:10px">Inactivo</span>'}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="toggleActivo('${u.id}',${u.activo},this)">${u.activo?'Desactivar':'Activar'}</button></td>
      </tr>`).join('')}</tbody></table>
    </div>
  </div>`;
  m.addEventListener('click',e=>{if(e.target===m)m.remove();});
  document.body.appendChild(m);
}
async function updRol(uid,rol){
  const {error}=await sb.from('perfiles').update({rol}).eq('id',uid);
  toast(error?'Error: '+error.message:'✅ Rol actualizado',!!error);
}
async function toggleActivo(uid,activo,btn){
  const {error}=await sb.from('perfiles').update({activo:!activo}).eq('id',uid);
  if(error){toast('Error: '+error.message,true);return;}
  btn.textContent=activo?'Activar':'Desactivar';
  btn.closest('tr').querySelector('.badge').className='badge '+(activo?'br':'bg');
  btn.closest('tr').querySelector('.badge').textContent=activo?'Inactivo':'Activo';
  toast('✅ Usuario '+(activo?'desactivado':'activado'));
}

// Auto-check session on load
async function checkSession(){
  const {data:{session}}=await sb.auth.getSession();
  if(session?.user){ await onLogin(session.user); return; }
  // Listen for auth changes
  sb.auth.onAuthStateChange(async(event,session)=>{
    if(event==='SIGNED_IN'&&session?.user&&!curUser) await onLogin(session.user);
    if(event==='PASSWORD_RECOVERY') lTab('pw',document.querySelector('.ltab:last-child'));
  });
}

// ═══ INIT ═══
checkSession();
