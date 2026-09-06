const PNG_LAYOUTS={
  square:{label:'Square — Instagram / LinkedIn',ratio:1,w:1080,h:1080,className:'layout-square'},
  portrait:{label:'Portrait — Instagram / Facebook / LinkedIn',ratio:4/5,w:1080,h:1350,className:'layout-portrait'},
  story:{label:'Story — Instagram / TikTok / YouTube Shorts',ratio:9/16,w:1080,h:1920,className:'layout-story'},
  landscape:{label:'Landscape — YouTube / X',ratio:16/9,w:1920,h:1080,className:'layout-landscape'},
  socialwide:{label:'Wide — LinkedIn / social link preview',ratio:1.91,w:1200,h:628,className:'layout-socialwide'},
  pinterest:{label:'Pinterest — Standard Pin',ratio:2/3,w:1000,h:1500,className:'layout-pinterest'}
};
let pngLayout='square';
function pngSelected(){return Object.fromEntries([...document.querySelectorAll('[data-module]')].map(x=>[x.dataset.module,!!x.checked]));}
function pngRepoMarkup(){return [...data.repos].sort((a,b)=>(b.stargazers_count||0)-(a.stargazers_count||0)).slice(0,4).map(r=>`<div><b>${esc(r.name)}</b><span>★ ${fmt(r.stargazers_count)} · ${esc(r.language||'Unknown')}</span></div>`).join('')}
function pngCalendarMarkup(){const map=contributionMap(),end=new Date();end.setHours(23,59,59,999);const anchor=new Date(end);anchor.setDate(anchor.getDate()-182);anchor.setDate(anchor.getDate()-anchor.getDay());let cells='';for(let i=0;i<189;i++){const d=new Date(anchor);d.setDate(anchor.getDate()+i);if(d>end)break;const x=map.get(d.toISOString().slice(0,10))||{level:0};cells+=`<i class="level-${x.level}"></i>`}return cells}
function pngBuild(){const m=pngSelected(),u=data.user,life=lifeStats(),count=contributionCount(period),streak=longestStreak(period),active=[m.profile,m.stats,m.calendar,m.repos].filter(Boolean).length;const parts=[];
 if(m.profile)parts.push(`<div class="share-profile"><div class="share-avatar-ring">${avatarDataUrl?`<img src="${avatarDataUrl}" alt="">`:''}</div><div><div class="share-kicker">GITBRAG</div><div class="share-name">${esc(u.name||u.login)}</div><div class="share-handle">@${esc(u.login)}</div></div></div>`);
 if(m.stats)parts.push(`<div class="share-stats"><div><b>${fmt(period==='lifetime'?yearlyTotal():count)}</b><span>CONTRIBUTIONS</span></div><div><b>${fmt(life.repos)}</b><span>PUBLIC REPOS</span></div><div><b>${fmt(life.stars)}</b><span>STARS</span></div><div><b>${fmt(streak)}</b><span>LONGEST STREAK</span></div></div>`);
 if(m.calendar)parts.push(`<div class="share-section share-calendar-module"><div class="share-section-head"><span>CONTRIBUTION ACTIVITY</span><small>LAST 6 MONTHS</small></div><div class="share-calendar">${pngCalendarMarkup()}</div></div>`);
 if(m.repos)parts.push(`<div class="share-section share-repos-module"><div class="share-section-head"><span>TOP REPOSITORIES</span><small>BY STARS</small></div><div class="share-repos">${pngRepoMarkup()}</div></div>`);
 if(m.branding)parts.push(`<div class="share-brand"><strong>GIT<span>BRAG</span></strong><small>github.com/${esc(u.login)}</small></div>`);
 const layout=PNG_LAYOUTS[pngLayout];
 const modClass=Object.entries(m).filter(([k,v])=>v&&k!=='branding').map(([k])=>k).join('-')||'none';
 $('#shareCard').className=`share-card ${layout.className} modules-${active} mods-${modClass}`;
 $('#shareCard').style.width=layout.w+'px';$('#shareCard').style.height=layout.h+'px';$('#shareCard').style.minHeight='0';
 $('#shareCard').innerHTML=`<div class="share-content">${parts.join('')}</div>`;
}
function pngPreview(){const preview=$('#sharePreview');preview.innerHTML='';pngBuild();const clone=$('#shareCard').cloneNode(true);clone.removeAttribute('id');clone.classList.add('preview-card');preview.appendChild(clone);requestAnimationFrame(()=>{const layout=PNG_LAYOUTS[pngLayout],scale=Math.min((preview.clientWidth-24)/layout.w,(preview.clientHeight-24)/layout.h);clone.style.transform=`scale(${scale})`;clone.style.transformOrigin='top left';preview.style.height=Math.min(420,layout.h*scale+24)+'px';});}
function pngOpen(){pngBuild();$('#pngModal').classList.remove('hidden');$('#pngModal').setAttribute('aria-hidden','false');pngPreview();}
function pngClose(){$('#pngModal').classList.add('hidden');$('#pngModal').setAttribute('aria-hidden','true');}
async function pngDownload(){pngBuild();const layout=PNG_LAYOUTS[pngLayout],source=$('#shareCard'),clone=source.cloneNode(true);clone.removeAttribute('id');clone.classList.add('export-card');clone.style.position='fixed';clone.style.left='-100000px';clone.style.top='0';clone.style.width=layout.w+'px';clone.style.height=layout.h+'px';clone.style.minHeight='0';document.body.appendChild(clone);try{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const canvas=await html2canvas(clone,{backgroundColor:'#09090b',scale:1,useCORS:false,allowTaint:false,logging:false,imageTimeout:10000,width:layout.w,height:layout.h,windowWidth:layout.w,windowHeight:layout.h});const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Browser could not encode the PNG.')),'image/png'));const url=URL.createObjectURL(blob),link=document.createElement('a');link.download=`${data.user.login}-gitbrag-${pngLayout}.png`;link.href=url;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){console.error(e);alert(`Could not create the PNG. ${e?.message||'Please try again.'}`)}finally{clone.remove()}}
function pngRefresh(){if(!$('#pngModal').classList.contains('hidden'))pngPreview();}
function pngInit(){const select=$('#pngLayout');if(select){select.innerHTML=Object.entries(PNG_LAYOUTS).map(([key,v])=>`<option value="${key}">${v.label} · ${v.w}×${v.h}</option>`).join('');select.value=pngLayout;select.onchange=()=>{pngLayout=select.value;pngRefresh()}}document.querySelectorAll('[data-module]').forEach(x=>x.addEventListener('change',pngRefresh));$('.periods').addEventListener('click',()=>setTimeout(pngRefresh,0));$('#pngBtn').onclick=pngOpen;$('#closePng').onclick=pngClose;$('.modal-backdrop').onclick=pngClose;$('#downloadPng').onclick=pngDownload;}
pngInit();
