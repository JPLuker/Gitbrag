function selectedModules(){return Object.fromEntries([...document.querySelectorAll('[data-module]')].map(x=>[x.dataset.module,!!x.checked]))}

function updateShareCard(){
  const m=selectedModules(),u=data.user,count=contributionCount(period),life=lifeStats(),streak=longestStreak(period);
  const parts=[];
  if(m.profile)parts.push(`<div class="share-profile"><div class="share-avatar-ring">${avatarDataUrl?`<img src="${avatarDataUrl}" alt="">`:''}</div><div><div class="share-kicker">GITBRAG</div><div class="share-name">${esc(u.name||u.login)}</div><div class="share-handle">@${esc(u.login)}</div></div></div>`);
  if(m.stats)parts.push(`<div class="share-stats"><div><b>${fmt(period==='lifetime'?yearlyTotal():count)}</b><span>CONTRIBUTIONS</span></div><div><b>${fmt(life.repos)}</b><span>PUBLIC REPOS</span></div><div><b>${fmt(life.stars)}</b><span>STARS</span></div><div><b>${fmt(streak)}</b><span>LONGEST STREAK</span></div></div>`);
  if(m.calendar)parts.push(`<div class="share-section share-calendar-module"><div class="share-section-head"><span>CONTRIBUTION ACTIVITY</span><small>LAST 6 MONTHS</small></div><div class="share-calendar">${buildShareCalendar()}</div></div>`);
  if(m.repos)parts.push(`<div class="share-section share-repos-module"><div class="share-section-head"><span>TOP REPOSITORIES</span><small>BY STARS</small></div><div class="share-repos">${[...data.repos].sort((a,b)=>(b.stargazers_count||0)-(a.stargazers_count||0)).slice(0,4).map(r=>`<div><b>${esc(r.name)}</b><span>★ ${fmt(r.stargazers_count)} · ${esc(r.language||'Unknown')}</span></div>`).join('')}</div></div>`);
  if(m.branding)parts.push(`<div class="share-brand"><strong>GIT<span>BRAG</span></strong><small>github.com/${esc(u.login)}</small></div>`);
  $('#shareCard').innerHTML=`<div class="share-content">${parts.join('')}</div>`;
}

function updateSharePreview(){const preview=$('#sharePreview');preview.innerHTML='';const clone=$('#shareCard').cloneNode(true);clone.removeAttribute('id');clone.classList.add('preview-card');preview.appendChild(clone)}
