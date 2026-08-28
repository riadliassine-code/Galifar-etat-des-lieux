(() => {
  const PROJECT_URL="https://bhkbywoqddxjwzhyiisn.supabase.co";
  const DASHBOARD_URL=`${PROJECT_URL}/functions/v1/galifar-dashboard`;
  let dashboardData=null;
  let allowHistory=false;
  let loading=false;

  const byId=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const fmtTime=(v)=>{if(!v)return"—";try{return new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(v));}catch{return"—"}};
  const fmtDay=(v)=>{if(!v)return"";try{return new Intl.DateTimeFormat("fr-FR",{dateStyle:"full"}).format(new Date(`${v}T12:00:00`));}catch{return v}};
  const todayInput=()=>{const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return`${y}-${m}-${day}`};
  const show=(id)=>{document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));document.body.classList.toggle("admin-mode",id.startsWith("admin"));window.scrollTo(0,0)};
  const cycleLabel=(c)=>c==="EN_TOURNEE"?"En tournée":c==="RETOUR_A_FAIRE"?"Retour à faire":c==="TERMINE"?"Retour effectué":"Départ à faire";
  const cycleClass=(c)=>c==="EN_TOURNEE"?"dash-tour":c==="RETOUR_A_FAIRE"?"dash-return":c==="TERMINE"?"dash-done":"dash-depart";

  async function fetchDashboard(){
    if(loading)return;
    const code=byId("adminCode")?.value?.trim();
    if(!code)return;
    loading=true;
    const msg=byId("dashboardMessage");
    if(msg)msg.innerHTML='<div class="notice info">Chargement du tableau de bord…</div>';
    try{
      const day=byId("dashboardDay")?.value||todayInput();
      const r=await fetch(DASHBOARD_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"dashboard",code,day})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||`Erreur ${r.status}`);
      dashboardData=data;
      if(msg)msg.innerHTML="";
      render();
      show("adminDashboardScreen");
    }catch(e){
      if(msg)msg.innerHTML=`<div class="notice error">${esc(e.message)}</div>`;
    }finally{loading=false;}
  }

  function typeMetrics(rows){
    return {
      total:rows.length,
      depart:rows.filter(v=>v.cycle==="DEPART_A_FAIRE").length,
      tour:rows.filter(v=>v.cycle==="EN_TOURNEE").length,
      retour:rows.filter(v=>v.cycle==="RETOUR_A_FAIRE").length,
      termine:rows.filter(v=>v.cycle==="TERMINE").length,
      maintenance:rows.filter(v=>v.status==="MAINTENANCE").length,
      immobilise:rows.filter(v=>v.status==="IMMOBILIZED").length
    };
  }

  function kpiGroup(title,icon,rows){
    const x=typeMetrics(rows);
    return `<section class="dash-type-panel"><div class="dash-type-title"><span class="dash-type-icon">${icon}</span><div><h3>${title}</h3><span>${x.total} véhicule(s)</span></div></div><div class="dash-type-kpis"><div class="dash-mini-kpi dash-kpi-green"><b>${x.depart}</b><span>Départs à faire</span></div><div class="dash-mini-kpi dash-kpi-blue"><b>${x.tour}</b><span>En tournée</span></div><div class="dash-mini-kpi dash-kpi-orange"><b>${x.retour}</b><span>Retours à faire</span></div><div class="dash-mini-kpi dash-kpi-green"><b>${x.termine}</b><span>Retours effectués</span></div><div class="dash-mini-kpi dash-kpi-orange"><b>${x.maintenance}</b><span>Maintenance</span></div><div class="dash-mini-kpi dash-kpi-red"><b>${x.immobilise}</b><span>Immobilisés</span></div></div></section>`;
  }

  function vehicleRow(v){
    const driver=v.retour_driver||v.depart_driver||"—";
    const issue=v.open_issue?`<div class="dash-alert">⚠ ${esc(v.open_issue.category)} • ${esc(v.open_issue.severity)}</div>`:"";
    const technical=v.status==="IMMOBILIZED"?'<span class="status-pill immobilized">Immobilisé</span>':v.status==="MAINTENANCE"?'<span class="status-pill maintenance">Maintenance</span>':'';
    return `<article class="dash-fleet-row"><div class="dash-vehicle"><b>${esc(v.label||v.code)}</b><span>${esc(v.registration||"Plaque à renseigner")}</span></div><div><span class="dash-cycle ${cycleClass(v.cycle)}">${cycleLabel(v.cycle)}</span>${technical}</div><div class="dash-cell"><span class="dash-caption">Livreur</span><b>${esc(driver)}</b></div><div class="dash-cell"><span class="dash-caption">Départ</span><b>${fmtTime(v.depart_at)}</b></div><div class="dash-cell"><span class="dash-caption">Retour</span><b>${fmtTime(v.retour_at)}</b></div>${issue}</article>`;
  }

  function fleetGroup(title,icon,rows){
    return `<section class="dash-fleet-group"><div class="dash-fleet-group-head"><div><span class="dash-group-icon">${icon}</span><h3>${title}</h3></div><span>${rows.length} affiché(s)</span></div>${rows.length?`<div class="dashboard-fleet-list">${rows.map(vehicleRow).join("")}</div>`:'<div class="empty">Aucun véhicule dans cette catégorie avec les filtres actuels.</div>'}</section>`;
  }

  function renderIncidents(){
    const box=byId("dashboardIncidents");
    if(!box)return;
    const rows=dashboardData?.incidents||[];
    const count=byId("dashboardIncidentCount");
    if(count)count.textContent=`${rows.length} incident(s) sur la journée sélectionnée`;
    box.innerHTML=rows.length?rows.map(i=>`<button class="dash-incident" type="button" data-inspection="${esc(i.inspection_id||"")}"><div class="dash-incident-top"><div><b>${esc(i.vehicle_label||"Véhicule")}${i.registration?` — ${esc(i.registration)}`:""}</b><span>${i.inspection_type==="RETOUR"?"Retour":"Départ"} • ${fmtTime(i.inspection_at)} • ${esc(i.driver||"Livreur")}</span></div><span class="dash-severity ${i.severity==="CRITICAL"?"critical":i.severity==="MAJOR"?"major":"minor"}">${esc(i.severity||"ISSUE")}</span></div><div class="dash-incident-category">⚠ ${esc(i.category||"Incident")}</div>${i.description?`<div class="dash-incident-desc">${esc(i.description)}</div>`:""}<div class="dash-open-detail">Voir l’état des lieux et les photos ›</div></button>`).join(""):'<div class="empty">Aucun incident enregistré à cette date.</div>';
    box.querySelectorAll(".dash-incident").forEach(el=>el.addEventListener("click",()=>{const id=el.dataset.inspection;if(id&&typeof window.loadDetail==="function")window.loadDetail(id);}));
  }

  function render(){
    const d=dashboardData||{};
    const all=d.fleet||[];
    const date=byId("dashboardDate");
    if(date)date.textContent=`Suivi opérationnel • ${fmtDay(d.day||todayInput())}`;

    const vans=all.filter(v=>v.type==="FOURGON");
    const bikes=all.filter(v=>v.type==="VELO_CARGO");
    const kpiBox=byId("dashboardKpis");
    if(kpiBox)kpiBox.innerHTML=kpiGroup("Fourgons","🚐",vans)+kpiGroup("Vélos cargo","🚲",bikes);

    const q=byId("dashboardSearch")?.value?.trim().toLowerCase()||"";
    const f=byId("dashboardCycleFilter")?.value||"";
    const filtered=all.filter(v=>{const hay=((v.label||v.code||"")+" "+(v.registration||"")+" "+(v.depart_driver||"")+" "+(v.retour_driver||"")).toLowerCase();return(!q||hay.includes(q))&&(!f||v.cycle===f)});
    const filteredVans=filtered.filter(v=>v.type==="FOURGON");
    const filteredBikes=filtered.filter(v=>v.type==="VELO_CARGO");
    const count=byId("dashboardFleetCount");
    if(count)count.textContent=`${filteredVans.length} fourgon(s) • ${filteredBikes.length} vélo(s) cargo`;
    const box=byId("dashboardFleet");
    if(box)box.innerHTML=fleetGroup("Fourgons","🚐",filteredVans)+fleetGroup("Vélos cargo","🚲",filteredBikes);
    renderIncidents();
  }

  function ensureCalendarAndIncidents(){
    const toolbar=document.querySelector("#adminDashboardScreen .dashboard-toolbar");
    if(toolbar&&!byId("dashboardDay")){
      const wrap=document.createElement("div");
      wrap.className="dash-date-wrap";
      wrap.innerHTML='<label class="label" for="dashboardDay">Calendrier</label><input id="dashboardDay" class="input" type="date">';
      toolbar.insertBefore(wrap,toolbar.firstChild);
      byId("dashboardDay").value=todayInput();
      byId("dashboardDay").max=todayInput();
      byId("dashboardDay").addEventListener("change",fetchDashboard);
    }
    const fleet=byId("dashboardFleet");
    if(fleet&&!byId("dashboardIncidents")){
      const section=document.createElement("section");
      section.className="dash-incidents-section";
      section.innerHTML='<div class="dashboard-section-head"><div><h2>Incidents de la journée</h2><div class="muted" id="dashboardIncidentCount"></div></div></div><div id="dashboardIncidents" class="dash-incidents"></div>';
      fleet.parentNode.insertBefore(section,fleet.nextSibling);
    }
  }

  function init(){
    const list=byId("adminListScreen");
    if(!list||!byId("adminDashboardScreen"))return;
    ensureCalendarAndIncidents();
    const observer=new MutationObserver(()=>{
      if(list.classList.contains("active")&&!allowHistory){setTimeout(fetchDashboard,50)}
      if(!list.classList.contains("active"))allowHistory=false;
    });
    observer.observe(list,{attributes:true,attributeFilter:["class"]});

    byId("dashboardSearch")?.addEventListener("input",render);
    byId("dashboardCycleFilter")?.addEventListener("change",render);
    byId("dashboardRefresh")?.addEventListener("click",fetchDashboard);
    byId("openHistoryFromDashboard")?.addEventListener("click",()=>{allowHistory=true;show("adminListScreen")});
    byId("dashboardLogout")?.addEventListener("click",()=>byId("adminLogout")?.click());

    const logout=byId("adminLogout");
    if(logout&&!byId("backDashboardFromHistory")){
      const back=document.createElement("button");back.id="backDashboardFromHistory";back.type="button";back.className="btn small outline";back.textContent="Tableau de bord";back.addEventListener("click",fetchDashboard);logout.parentNode?.insertBefore(back,logout);
    }
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
