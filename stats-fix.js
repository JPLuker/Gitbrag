/* Best-day correction: keep the metric inside the selected period and never include future-dated contribution entries. */
(() => {
  const API='https://github-contributions-api.jogruber.de/v4';
  const periods={day:1,week:7,month:30,sixmonths:182,year:365};
  let lastUser='';
  const username=()=>decodeURIComponent(location.hash.replace(/^#\//,''));
  const iso=(d)=>d.toISOString().slice(0,10);
  const refresh=async()=>{
    const user=username();
    if(!user||user===lastUser&&document.querySelector('.periods button.active')?.dataset.period==='lifetime')return;
    lastUser=user;
    try{
      const r=await fetch(`${API}/${encodeURIComponent(user)}?y=all`);
      if(!r.ok)return;
      const json=await r.json(), rows=Array.isArray(json.contributions)?json.contributions:[];
      const active=document.querySelector('.periods button.active')?.dataset.period||'week';
      if(active==='lifetime')return;
      const now=new Date();
      const start=new Date(now);
      start.setHours(0,0,0,0);
      start.setDate(start.getDate()-(periods[active]||7)+1);
      const values=rows.filter(x=>x.date&&x.date<=iso(now)&&new Date(`${x.date}T00:00:00`)>=start).map(x=>Number(x.count)||0);
      const best=values.length?Math.max(...values):0;
      const cards=document.querySelectorAll('#statsGrid .stat');
      if(cards[2]){
        const value=cards[2].querySelector('.value'),note=cards[2].querySelector('.note');
        if(value)value.textContent=new Intl.NumberFormat().format(best);
        if(note)note.textContent='contributions in one day';
      }
    }catch(e){console.warn('Best-day correction failed.',e)}
  };
  const hook=()=>{setTimeout(refresh,0)};
  document.addEventListener('click',e=>{if(e.target.matches('.periods button[data-period]'))hook()});
  new MutationObserver(hook).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(refresh,500);
})();
