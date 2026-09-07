/* Best-day correction: keep the metric inside the selected period and never include future-dated contribution entries. */
(() => {
  const API='https://github-contributions-api.jogruber.de/v4';
  const periods={day:1,week:7,month:30,sixmonths:182,year:365};
  let rows=[];
  const username=()=>decodeURIComponent(location.hash.replace(/^#\//,''));
  const iso=d=>d.toISOString().slice(0,10);
  const refresh=async()=>{
    const user=username(),active=document.querySelector('.periods button.active')?.dataset.period||'week';
    if(!user||active==='lifetime')return;
    try{
      if(!rows.length){const r=await fetch(`${API}/${encodeURIComponent(user)}?y=all`);if(!r.ok)return;const json=await r.json();rows=Array.isArray(json.contributions)?json.contributions:[]}
      const now=new Date(),start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-(periods[active]||7)+1);
      const best=rows.filter(x=>x.date&&x.date<=iso(now)&&new Date(`${x.date}T00:00:00`)>=start).reduce((m,x)=>Math.max(m,Number(x.count)||0),0);
      const card=document.querySelectorAll('#statsGrid .stat')[2];
      if(card){const value=card.querySelector('.value');if(value)value.textContent=new Intl.NumberFormat().format(best)}
    }catch(e){console.warn('Best-day correction failed.',e)}
  };
  document.addEventListener('click',e=>{if(e.target.matches('.periods button[data-period]'))setTimeout(refresh,50)});
  setTimeout(refresh,700);
})();
