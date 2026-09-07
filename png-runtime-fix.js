/* v0.3.12: fixed 1:1 PNG preview; ratio options removed from the UI. */
(() => {
  const $ = id => document.getElementById(id);
  let raf = 0;
  const installFixes = () => {
    if (!document.getElementById('gitbrag-png-simplified')) {
      const style = document.createElement('style');
      style.id = 'gitbrag-png-simplified';
      style.textContent = `
        .share-kicker{display:none!important}
        #pngModal .layout-picker{display:none!important}
        .share-card .share-repos b{font-size:clamp(16px,3.5cqw,42px)!important}
        .share-card .share-repos p{font-size:clamp(8px,1.4cqw,16px)!important}
        .share-card .share-repos span{font-size:clamp(7px,1.05cqw,13px)!important}
        .share-card.size-compact .share-repos b{font-size:clamp(14px,3cqw,34px)!important}
        .share-card.size-balanced .share-repos b{font-size:clamp(16px,3.5cqw,42px)!important}
        .share-card.size-large .share-repos b{font-size:clamp(18px,4cqw,48px)!important}
        .share-card.size-huge .share-repos b{font-size:clamp(20px,4.5cqw,54px)!important}
        .share-card.size-compact .share-repos p{font-size:clamp(8px,1.2cqw,14px)!important}
        .share-card.size-large .share-repos p{font-size:clamp(9px,1.6cqw,18px)!important}
        .share-card.size-huge .share-repos p{font-size:clamp(10px,1.8cqw,20px)!important}
        .layout-square .mods-profile-stats-calendar-repos .share-content{
          grid-template-areas:"profile profile" "stats stats" "calendar repos"!important;
          grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
          grid-template-rows:minmax(0,.7fr) minmax(0,.95fr) minmax(0,1.35fr)!important;
        }
      `;
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[data-gitbrag-stats-fix]')) {
      const script=document.createElement('script');
      script.src='stats-fix.js?v=0.3.12';
      script.dataset.gitbragStatsFix='1';
      document.head.appendChild(script);
    }
  };
  const render = () => {
    raf=0; installFixes();
    const preview=$('sharePreview'),source=$('shareCard');
    if(!preview||!source||typeof window.pngBuild!=='function')return;
    const layout=window.pngBuild();
    if(layout.w!==1080||layout.h!==1080){
      const pill=document.querySelector('#pngRatios [data-ratio="square"]');
      if(pill)pill.click();
    }
    const cs=getComputedStyle(preview),padX=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0),padY=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0),availableWidth=Math.max(1,preview.clientWidth-padX);
    preview.style.setProperty('aspect-ratio','1 / 1','important');
    preview.style.setProperty('height',`${Math.ceil(availableWidth)+padY}px`,'important');
    preview.style.setProperty('overflow','hidden','important');
    preview.innerHTML='';
    const clone=source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove('preview-card','layout-portrait','layout-story','layout-landscape','layout-socialwide','layout-pinterest');
    clone.classList.add('layout-square');
    clone.style.cssText='position:relative!important;left:0!important;top:0!important;width:100%!important;height:100%!important;aspect-ratio:1/1!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;display:block!important;visibility:visible!important;opacity:1!important;transform:none!important;transform-origin:top left!important;margin:0!important;overflow:hidden!important;';
    preview.appendChild(clone);
  };
  const refresh=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>requestAnimationFrame(render))};
  window.pngPreview=render;window.pngRefresh=refresh;window.gitbragRenderPngPreview=render;
  const modal=$('pngModal');
  if(modal){modal.addEventListener('change',()=>refresh(),true);modal.addEventListener('input',()=>refresh(),true);new MutationObserver(()=>{if(!modal.classList.contains('hidden'))refresh()}).observe(modal,{attributes:true,attributeFilter:['class']})}
  const preview=$('sharePreview');
  if(preview&&'ResizeObserver' in window)new ResizeObserver(()=>{if(!$('pngModal')?.classList.contains('hidden'))refresh()}).observe(preview);
})();
