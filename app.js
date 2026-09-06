const API='https://api.github.com';
const $=s=>document.querySelector(s);
const views={search:$('#searchView'),loading:$('#loadingView'),profile:$('#profileView'),error:$('#errorView')};
let data=null, period='week';

function show(name){Object.entries(views).forEach(([k,v])=>v.classList.toggle('hidden',k!==name));window.scrollTo(0,0)}
function sinceFor(p){const d=new Date();const ms={day:864e5,week:7*864e5,month:30*864e5,sixmonths:182*864e5,year:365*864e5};return p==='lifetime'?new Date(0):new Date(d-ms[p])}
function fmt(n){return new Intl.NumberFormat().format(n||0)}
async function api(path){const r=await fetch(API+path,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error(r.status===404?'User not found.':r.status===403?'GitHub rate limit reached. Try again in a little while.':`GitHub API error (${r.status}).`);return r.json()}
function parseInput(value){
  let v=value.trim().replace(/^@/,'');
  try{
    if(/^https?:\/\//i.test(v)){
      const u=new URL(v);
      if(u.hostname.toLowerCase()!=='github.com') throw new Error('Please enter a github.com profile link.');
      v=u.pathname.split('/').filter(Boolean)[0]||'';
    }else if(v.toLowerCase().startsWith('github.com/')){
      v=v.split('/').filter(Boolean)[1]||'';
    }
  }catch(e){throw e}
  if(!/^[a-zA-Z0-9-]+$/.test(v))throw new Error('Enter a GitHub username or profile link.');
  return v;
}

async function load(input){
  show('loading');$('#loadingText').textContent='Finding your profile...';
  try{
    const username=parseInput(input);
    const user=await api(`/users/${encodeURIComponent(username)}`);
    $('#loadingText').textContent='Loading your repositories...';
    const repos=[];
    for(let page=1;page<=10;page++){
      const batch=await api(`/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&type=owner&sort=pushed`);
      repos.push(...batch);
      if(batch.length<100)break;
    }
    data={user,repos};
    $('#loadingText').textContent='Loading contribution calendar...';
    render();
    show('profile');
    location.hash='/'+encodeURIComponent(user.login);
  }catch(e){$('#errorText').textContent=e.message;show('error')}
}

function searchQuery(type,p){
  const start=sinceFor(p);const end=new Date();
  const startIso=start.toISOString().slice(0,10);const endIso=end.toISOString().slice(0,10);
  const user=data.user.login;
  if(type==='commits')return `author:${user}+author-date:${startIso}..${endIso}`;
  if(type==='prs')return `author:${user}+type:pr+created:${startIso}..${endIso}`;
  return `author:${user}+type:issue+created:${startIso}..${endIso}`;
}
async function searchCount(q){const r=await api(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`);return r.total_count||0}
async function commitCount(p){
  const r=await fetch(API+`/search/commits?q=${encodeURIComponent(searchQuery('commits',p))}&per_page=1`,{headers:{Accept:'application/vnd.github+json'}});
  if(!r.ok){if(r.status===422)return 0;throw new Error(r.status===403?'GitHub rate limit reached. Try again in a little while.':`GitHub API error (${r.status}).`)}
  return (await r.json()).total_count||0;
}
async function activityFor(p){
  const [commits,prs,issues]=await Promise.all([commitCount(p),searchCount(searchQuery('prs',p)),searchCount(searchQuery('issues',p))]);
  const start=sinceFor(p);const recent=data.recentEvents||[];const ev=recent.filter(e=>new Date(e.created_at)>=start);
  return {commits,prs,issues,reviews:ev.filter(e=>e.type==='PullRequestReviewEvent').length,pushes:ev.filter(e=>e.type==='PushEvent').length,events:ev};
}
function lifetime(){const u=data.user;return {repos:u.public_repos,followers:u.followers,following:u.following,stars:data.repos.reduce((a,r)=>a+(r.stargazers_count||0),0)}}
function render(){
  const u=data.user;$('#avatar').src=u.avatar_url;$('#displayName').textContent=u.name||u.login;$('#handle').textContent='@'+u.login+(u.bio?' · '+u.bio:'');
  $('#githubProfile').href=u.html_url;
  $('#contributionGraph').src=`https://github.com/users/${encodeURIComponent(u.login)}/contributions`;
  renderStats();renderRepos();
}
async function renderStats(){
  const labels={day:'Last 24 hours',week:'Last 7 days',month:'Last month',sixmonths:'Last 6 months',year:'Last year',lifetime:'Lifetime'};
  $('#periodLabel').textContent=labels[period].toUpperCase();
  $('#statsGrid').innerHTML='<div class="stat loading-stat"><div class="label">COMMITS</div><div class="value">…</div><div class="note">counting public commits</div></div><div class="stat loading-stat"><div class="label">PULL REQUESTS</div><div class="value">…</div><div class="note">opened by you</div></div><div class="stat loading-stat"><div class="label">ISSUES</div><div class="value">…</div><div class="note">opened by you</div></div><div class="stat loading-stat"><div class="label">REVIEWS</div><div class="value">…</div><div class="note">recent public reviews</div></div>';
  $('#extraStats').innerHTML='<div class="extra"><b>…</b><span>CALCULATING</span></div><div class="extra"><b>…</b><span>CALCULATING</span></div><div class="extra"><b>…</b><span>CALCULATING</span></div>';
  try{
    const events=await api(`/users/${encodeURIComponent(data.user.login)}/events/public?per_page=100`);data.recentEvents=events;
    const a=await activityFor(period);const life=lifetime();
    const cards=[['COMMITS',a.commits,'public commits found'],['PULL REQUESTS',a.prs,'opened by you'],['ISSUES',a.issues,'opened by you'],['REVIEWS',a.reviews,'public reviews in recent activity']];
    $('#statsGrid').innerHTML=cards.map(c=>`<div class="stat"><div class="label">${c[0]}</div><div class="value">${fmt(c[1])}</div><div class="note">${c[2]}</div></div>`).join('');
    const extras=period==='lifetime'?[['PUBLIC REPOSITORIES',life.repos],['TOTAL STARS',life.stars],['ACCOUNT AGE',age(data.user.created_at)]]:[['PUSH EVENTS',a.pushes],['TOTAL ACTIVITY EVENTS',a.events.length],['ACTIVE REPOS',new Set(a.events.map(e=>e.repo?.name).filter(Boolean)).size]];
    $('#extraStats').innerHTML=extras.map(x=>`<div class="extra"><b>${typeof x[1]==='number'?fmt(x[1]):x[1]}</b><span>${x[0]}</span></div>`).join('');
  }catch(e){$('#statsGrid').innerHTML=`<div class="stats-message">${esc(e.message)}</div>`;$('#extraStats').innerHTML=''}
  document.querySelectorAll('.periods button').forEach(b=>b.classList.toggle('active',b.dataset.period===period));
}
function age(s){const y=(Date.now()-new Date(s))/31557600000;return `${y.toFixed(1)} years`}
function renderRepos(){
  const cutoff=sinceFor(period);let rs=data.repos.filter(r=>period==='lifetime'||new Date(r.pushed_at)>=cutoff).sort((a,b)=>b.stargazers_count-a.stargazers_count).slice(0,6);
  if(!rs.length)rs=data.repos.slice(0,6);
  $('#repos').innerHTML=rs.map(r=>`<article class="repo"><div class="repo-top"><a class="repo-name" href="${r.html_url}" target="_blank" rel="noreferrer">${esc(r.name)}</a><span class="repo-count">★ ${fmt(r.stargazers_count)}</span></div><div class="repo-desc">${esc(r.description||'No description')}</div><div class="repo-meta"><span>${r.language||'Unknown language'}</span><span>Forks <b>${fmt(r.forks_count)}</b></span><span>Issues <b>${fmt(r.open_issues_count)}</b></span></div></article>`).join('');
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

$('#searchForm').addEventListener('submit',e=>{e.preventDefault();const value=$('#username').value.trim();if(value)load(value)});
$('#backBtn').onclick=()=>show('search');$('#errorBack').onclick=()=>show('search');
$('.periods').addEventListener('click',e=>{if(e.target.matches('button[data-period]')){period=e.target.dataset.period;renderStats();renderRepos()}});
$('#shareBtn').onclick=async()=>{const url=location.href.split('#')[0]+'#/'+encodeURIComponent(data.user.login);if(navigator.share)await navigator.share({title:`${data.user.login} on Gitbrag`,url});else{await navigator.clipboard.writeText(url);$('#shareBtn').textContent='Copied';setTimeout(()=>$('#shareBtn').textContent='Share',1500)}};
const hash=location.hash.match(/^#\/(.+)$/);if(hash)load(decodeURIComponent(hash[1]));
