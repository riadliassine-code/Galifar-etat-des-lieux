(() => {
  const PROJECT_URL="https://bhkbywoqddxjwzhyiisn.supabase.co";
  const DASHBOARD_URL=`${PROJECT_URL}/functions/v1/galifar-dashboard`;
  let dashboardData=null;
  let allowHistory=false;
  let loading=false;

  const byId=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const fmtTime=(v)=>{if(!v)return"—";try{return new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(v));}catch{return"—"}};
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
      const r=await fetch(DASHBOARD_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"dashboard",code})});
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

  function render(){
    const d=dashboardData||{},m=d.metrics||{};
    const date=byId("dashboardDate");
    if(date)date.textContent=`Suivi opérationnel • ${new Intl.DateTimeFormat("fr-FR",{dateStyle:"full"}).format(new Date())}`;
    const kpis=[["Départs réalisés",m.departs||0,"dash-kpi-green"],["En tournée",m.en_tournee||0,"dash-kpi-blue"],["Retours à faire",m.retours_a_faire||0,"dash-kpi-orange"],["Retours effectués",m.retours_effectues||0,"dash-kpi-green"],["Anomalies ouvertes",m.anomalies_ouvertes||0,"dash-kpi-orange"],["Immobilisés",m.immobilises||0,"dash-kpi-red"]];
    const kpiBox=byId("dashboardKpis");
    if(kpiBox)kpiBox.innerHTML=kpis.map(k=>`<div class="dash-kpi ${k[2]}"><div class="dash-kpi-value">${esc(k[1])}</div><div class="dash-kpi-label">${esc(k[0])}</div></div>`).join("");

    const q=byId("dashboardSearch")?.value?.trim().toLowerCase()||"";
    const f=byId("dashboardCycleFilter")?.value||"";
    const fleet=(d.fleet||[]).filter(v=>{const hay=((v.label||v.code||"")+" "+(v.registration||"")+" "+(v.depart_driver||"")+" "+(v.retour_driver||"")).toLowerCase();return(!q||hay.includes(q))&&(!f||v.cycle===f)});
    const count=byId("dashboardFleetCount");
    if(count)count.textContent=`${fleet.length} véhicule(s) affiché(s) • ${m.departs_a_faire||0} départ(s) encore à faire`;
    const box=byId("dashboardFleet");
    if(!box)return;
    box.innerHTML=fleet.length?fleet.map(v=>{
      const driver=v.retour_driver||v.depart_driver||"—";
      const issue=v.open_issue?`<div class="dash-alert">⚠ ${esc(v.open_issue.category)} • ${esc(v.open_issue.severity)}</div>`:"";
      const technical=v.status==="IMMOBILIZED"?'<span class="status-pill immobilized">Immobilisé</span>':v.status==="MAINTENANCE"?'<span class="status-pill maintenance">Maintenance</span>':'';
      return `<article class="dash-fleet-row"><div class="dash-vehicle"><b>${esc(v.label||v.code)}</b><span>${esc(v.registration||"Plaque à renseigner")}</span></div><div><span class="dash-cycle ${cycleClass(v.cycle)}">${cycleLabel(v.cycle)}</span>${technical}</div><div class="dash-cell"><span class="dash-caption">Livreur</span><b>${esc(driver)}</b></div><div class="dash-cell"><span class="dash-caption">Départ</span><b>${fmtTime(v.depart_at)}</b></div><div class="dash-cell"><span class="dash-caption">Retour</span><b>${fmtTime(v.retour_at)}</b></div>${issue}</article>`;
    }).join(""):'<div class="empty">Aucun véhicule ne correspond aux filtres.</div>';
  }

  function init(){
    const list=byId("adminListScreen");
    if(!list||!byId("adminDashboardScreen"))return;
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
