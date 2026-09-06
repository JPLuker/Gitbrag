const API='https://api.github.com';
const $=s=>document.querySelector(s);
const views={search:$('#searchView'),loading:$('#loadingView'),profile:$('#profileView'),error:$('#errorView')};
let data=null, period='week';

function show(name){Object.entries(views).forEach(([k,v])=>v.classList.toggle('hidden',k!==name));window.scrollTo(0,0)}
function sinceFor(p){const d=new Date();const ms={day:864e5,week:7*864e5,month:30*864e5,sixmonths:182*864e5,year:365*864e5};return p==='lifetime'?new Date(0):new Date(d-ms[p])}
function fmt(n){return new Intl.NumberFormat().format(n)}
async function api(path){const r=await fetch(API+path,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error(r.status===404?'User not found.':`GitHub API error (${r.status}).`);return r.json()}

async function load(username){
  show('loading');$('#loadingText').textContent='Finding your profile...';
  try{
    const user=await api(`/users/${encodeURIComponent(username)}`);
    $('#loadingText').textContent='Counting your public activity...';
    const [repos,events]=await Promise.all([api(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`),api(`/users/${encodeURIComponent(username)}/events/public?per_page=100`)]);
    data={user,repos,events};
    render();show('profile');
  }catch(e){$('#errorText').textContent=e.message;show('error')}
}

function activityFor(p){
  const start=sinceFor(p); const ev=data.events.filter(e=>new Date(e.created_at)>=start);
  let commits=0,prs=0,issues=0,reviews=0,pushes=0;
  ev.forEach(e=>{
    if(e.type==='PushEvent'){pushes++;commits+=(e.payload?.commits||[]).length}
    if(e.type==='PullRequestEvent' && ['opened','closed','reopened'].includes(e.payload?.action))prs++;
    if(e.type==='IssuesEvent' && ['opened','closed','reopened'].includes(e.payload?.action))issues++;
    if(e.type==='PullRequestReviewEvent')reviews++;
  });
  return {commits,prs,issues,reviews,pushes,events:ev};
}

function lifetime(){
  const u=data.user;
  return {repos:u.public_repos,followers:u.followers,following:u.following,stars:data.repos.reduce((a,r)=>a+(r.stargazers_count||0),0)}
}
function render(){
  const u=data.user;$('#avatar').src=u.avatar_url;$('#displayName').textContent=u.name||u.login;$('#handle').textContent='@'+u.login+(u.bio?' · '+u.bio:'');
  renderStats();renderRepos();
}
function renderStats(){
  const a=activityFor(period), life=lifetime(), labels={day:'Last 24 hours',week:'Last 7 days',month:'Last month',sixmonths:'Last 6 months',year:'Last year',lifetime:'Lifetime'};
  $('#periodLabel').textContent=labels[period].toUpperCase();
  let cards;
  if(period==='lifetime') cards=[['PUBLIC REPOS',life.repos,'repositories'],['STARS',life.stars,'across your public repos'],['FOLLOWERS',life.followers,'people following you'],['FOLLOWING',life.following,'people you follow']];
  else cards=[['COMMITS',a.commits,'public activity returned by GitHub'],['PULL REQUESTS',a.prs,'opened / closed / reopened'],['ISSUES',a.issues,'opened / closed / reopened'],['REVIEWS',a.reviews,'pull-request reviews']];
  $('#statsGrid').innerHTML=cards.map(c=>`<div class="stat"><div class="label">${c[0]}</div><div class="value">${fmt(c[1])}</div><div class="note">${c[2]}</div></div>`).join('');
  const extras=period==='lifetime'?[['TOTAL STARS',life.stars],['PUBLIC REPOSITORIES',life.repos],['ACCOUNT AGE',age(u.created_at)]]:[['PUSH EVENTS',a.pushes],['TOTAL ACTIVITY EVENTS',a.events.length],['ACTIVE REPOS',new Set(a.events.map(e=>e.repo?.name).filter(Boolean)).size]];
  $('#extraStats').innerHTML=extras.map(x=>`<div class="extra"><b>${typeof x[1]==='number'?fmt(x[1]):x[1]}</b><span>${x[0]}</span></div>`).join('');
  document.querySelectorAll('.periods button').forEach(b=>b.classList.toggle('active',b.dataset.period===period));
}
function age(s){const y=(Date.now()-new Date(s))/31557600000;return `${y.toFixed(1)} years`}
function renderRepos(){
  const cutoff=sinceFor(period);let rs=data.repos.filter(r=>period==='lifetime'||new Date(r.pushed_at)>=cutoff).sort((a,b)=>b.stargazers_count-a.stargazers_count).slice(0,6);
  if(!rs.length)rs=data.repos.slice(0,6);
  $('#repos').innerHTML=rs.map(r=>`<article class="repo"><div class="repo-top"><a class="repo-name" href="${r.html_url}" target="_blank" rel="noreferrer">${esc(r.name)}</a><span class="repo-count">★ ${fmt(r.stargazers_count)}</span></div><div class="repo-desc">${esc(r.description||'No description')}</div><div class="repo-meta"><span>${r.language||'Unknown language'}</span><span>Forks <b>${fmt(r.forks_count)}</b></span><span>Issues <b>${fmt(r.open_issues_count)}</b></span></div></article>`).join('');
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

$('#searchForm').addEventListener('submit',e=>{e.preventDefault();const u=$('#username').value.trim().replace(/^@/,'');if(u)load(u)});
$('#backBtn').onclick=()=>show('search');$('#errorBack').onclick=()=>show('search');
$('.periods').addEventListener('click',e=>{if(e.target.matches('button[data-period]')){period=e.target.dataset.period;renderStats();renderRepos()}});
$('#shareBtn').onclick=async()=>{const url=location.href.split('#')[0]+'#/'+data.user.login;if(navigator.share)await navigator.share({title:`${data.user.login} on Gitbrag`,url});else{await navigator.clipboard.writeText(url);$('#shareBtn').textContent='Copied';setTimeout(()=>$('#shareBtn').textContent='Share',1500)}};
const hash=location.hash.match(/^#\/(.+)$/);if(hash)load(hash[1]);
