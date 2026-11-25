import {getLanguage, setLanguage, t, localizePlace, areaText, translatePage} from './i18n.js?v=20261125-guide';
import {places} from './places.js?v=20261124-lotta';
import {createGuideMap, addPlaceMarker, fitPlaces, translateMap} from './maps.js?v=20261125-guide';
const $=s=>document.querySelector(s);
const paths={pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',sliders:'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 10h6M9 12h6M17 16h6',map:'m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5ZM9 2v17M15 5v17',list:'M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01',expand:'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5',locate:'M12 2v3M12 19v3M2 12h3M19 12h3M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',close:'m6 6 12 12M18 6 6 18',arrow:'M5 12h14m-6-6 6 6-6 6',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',external:'M14 3h7v7M21 3 10 14M10 3H3v18h18v-7',utensils:'M3 2v6a3 3 0 0 0 6 0V2M6 2v20M20 22V2c-4 2-5 7-5 11h5'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.pin}"/></svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={city:'paris',view:'list',category:'all',selected:null};
let map,markers={},detailId=null,mapSignature=null,markerSignature=null,mapFrame=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function hydrate(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function card(raw) {
  const p = localizePlace(raw);
  const photos = p.images.slice(0, 2).map((src, index) => `
    <div class="card-photo"><img src="${esc(src.replace('.jpg', '-thumb.jpg'))}" alt="${esc(p.name)} — photo ${index + 1}" loading="lazy" width="112" height="112"></div>
  `).join('');
  return `<article class="place-card ${state.selected === p.id ? 'is-selected' : ''}" data-card="${p.id}" data-type="${p.type}">
    <div class="photo-pair"><div class="photo-stack">${photos}</div></div>
    <div class="card-body">
      <div class="card-heading">
        <h2 class="place-title">${esc(p.name)}</h2>
        <span class="place-rating">${p.rating.toFixed(1)}/10</span>
      </div>
      <div class="card-meta"><span>${esc(p.category)}</span>${p.tags.includes('Bouillon') ? '<span>· Bouillon</span>' : ''}${p.price ? `<span class="price">· ${esc(p.price)}</span>` : ''}</div>
      <div class="card-area">${icon('pin')}<span>${esc(p.address)}</span></div>
      <p class="card-description">${esc(p.review)}</p>
    </div>
  </article>`;
}

function matchesCategory(p,category){return category==='all'||category==='restaurants'&&!['Bakery','Brunch'].includes(p.category)&&p.type!=='sweets'||category==='brunch'&&p.tags.some(t=>['Brunch','Coffee'].includes(t))||category==='bakery'&&p.category==='Bakery'||category==='takeaway'&&p.tags.includes('Takeaway')||category==='sweets'&&p.type==='sweets'}
function categoryAvailable(category){return places.some(p=>p.city===state.city&&matchesCategory(p,category))}
function filtered(){return places.filter(p=>p.city===state.city&&matchesCategory(p,state.category)).sort((a,b)=>b.rating-a.rating)}
function updateURL(){const u=new URL(location.href);u.search='';u.searchParams.set('lang',getLanguage());if(state.city!=='paris')u.searchParams.set('city',state.city);if(state.view==='map')u.searchParams.set('view','map');if(state.category!=='all')u.searchParams.set('category',state.category);if(detailId)u.searchParams.set('place',detailId);history.replaceState(history.state,'',u)}


function render(){translatePage();if(!categoryAvailable(state.category))state.category='all';const list=filtered();document.title=`${state.city==='paris'?'Paris':t('London')} · ${t("Zach's Frenglish Guide")}`;
$('#results').innerHTML=list.length?list.map(card).join(''):`<div class="empty"><h3>${t('No places found.')}</h3><p>${t('Try another type of place.')}</p><button data-reset>${t('Explore all places')}</button></div>`;
$('.guide').classList.toggle('map-mode',state.view==='map');document.querySelectorAll('[data-city]').forEach(b=>{b.classList.toggle('selected',b.dataset.city===state.city);b.setAttribute('aria-pressed',b.dataset.city===state.city)});document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.view===state.view);b.setAttribute('aria-pressed',b.dataset.view===state.view)});document.querySelectorAll('[data-category]').forEach(b=>{b.hidden=!categoryAvailable(b.dataset.category);b.classList.toggle('selected',b.dataset.category===state.category);b.setAttribute('aria-pressed',b.dataset.category===state.category)});
$('#end-note').textContent=t('That’s the list for now.');
if(state.selected&&!list.some(p=>p.id===state.selected))state.selected=null;
hydrate();updateURL();if(mapFrame)cancelAnimationFrame(mapFrame);mapFrame=requestAnimationFrame(()=>updateMap(filtered()));}
function initMap(){
  if(map)return;
  map=createGuideMap('map',{center:[2.333,48.866],zoom:12,onError:(failed=true)=>{$('#map-error').hidden=!failed}});
}
function fitMap(list=filtered()){fitPlaces(map,list,state.city)}
function updateMap(list){
  if(!$('#map').getClientRects().length)return;
  const box=$('#map').getBoundingClientRect();
  const signature=state.city+'|'+state.view+'|'+list.map(p=>p.id).join(',')+'|'+box.width+':'+box.height;
  const refit=signature!==mapSignature;
  initMap();
  if(!map){$('#map-error').hidden=false;return}
  mapSignature=signature;
  map.resize();translateMap(map);
  map.scrollZoom[state.view==='map'?'enable':'disable']();
  const markerKey = getLanguage() + '|' + list.map(place => place.id).join(',');
  if (markerSignature !== markerKey) {
    markerSignature = markerKey;
    Object.values(markers).forEach(marker => marker.remove());
    markers = {};
    for (const place of list) {
      if (!place.coords) continue;
      markers[place.id] = addPlaceMarker(map, localizePlace(place), selectPin);
    }
  }
  for (const [id, marker] of Object.entries(markers)) {
    marker.getElement().classList.toggle('selected', state.selected === id);
  }
  if(refit)fitMap(list);
}
function selectPin(id) {
  state.selected = id;
  if (state.view !== 'map') setView('map');
  document.querySelectorAll('[data-card]').forEach(card => card.classList.toggle('is-selected', card.dataset.card === id));
  for (const [key, marker] of Object.entries(markers)) {
    marker.getElement().classList.toggle('selected', key === id);
  }
  openDetail(id);
}
function setView(view){state.view=view;render();if(view==='map')$('#places').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'})}
function reset(){state.category='all';render()}
function openDetail(id, push = true) {
  const p = localizePlace(places.find(place => place.id === id));
  if (!p) return;
  detailId = id;
  const dialog = $('#place-dialog');
  const wasOpen = dialog.open;
  const gallery = p.images.slice(0, 2).map((src, index) => `
    <img class="detail-gallery-photo detail-gallery-photo-${index + 1}" src="${esc(src)}" alt="${esc(p.name)} — photo ${index + 1}" loading="${index ? 'lazy' : 'eager'}">
  `).join('');
  $('#detail-content').innerHTML = `
    <div class="detail-gallery${p.images.length < 2 ? ' is-single' : ''}">${gallery}</div>
    <div class="detail-body">
      <div class="detail-heading">
        <div class="detail-category">${esc(p.category)}${p.price ? ' · ' + esc(p.price) : ''}</div>
        <h2 id="detail-title">${esc(p.name)}</h2>
        <span class="detail-rating">${p.rating.toFixed(1)}/10</span>
      </div>
      <p class="detail-location">${esc(areaText(p))} · ${p.city === 'paris' ? 'Paris' : t('London')}</p>
      <p class="review-text">${esc(p.review)}</p>
      <p class="detail-tip">${esc(p.note)} ${esc(p.priceNote || '')}</p>
      <div class="details-address">${icon('pin')}<div><strong>${esc(p.address)}</strong><p>${p.city === 'paris' ? 'Métro' : t('Tube')}: ${esc(p.metro)}</p></div></div>
    </div>`;
  if (!wasOpen) dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('modal-open');
  if (push && !wasOpen) {
    const url = new URL(location.href);
    url.searchParams.set('place', id);
    history.pushState({guideDetail: true}, '', url);
  }
}
function dismissDetail() {
  $('#place-dialog').close();
  document.body.classList.remove('modal-open');
  markers[state.selected]?.getElement().querySelector('button')?.focus({preventScroll: true});
}
function closeDetail() {
  if (history.state?.guideDetail) {
    history.back();
  } else {
    detailId = null;
    dismissDetail();
    updateURL();
  }
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const {lang, city, view, category} = button.dataset;
  if (lang) {
    setLanguage(lang);
    render();
  } else if (city) {
    state.city = city;
    state.selected = null;
    state.category = 'all';
    render();
  } else if (view) {
    setView(view);
  } else if (category) {
    state.category = category;
    render();
  } else if ('reset' in button.dataset) {
    reset();
  }
});
$('#expand-map').onclick = () => setView('map');
$('#fit-map').onclick = () => fitMap();
$('#close-detail').onclick = closeDetail;
$('#place-dialog').addEventListener('cancel', event => {
  event.preventDefault();
  closeDetail();
});
$('#place-dialog').addEventListener('click', event => {
  if (event.target !== event.currentTarget) return;
  const {left, right, top, bottom} = event.currentTarget.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) closeDetail();
});
function restoreURL() {
  const query = new URL(location.href).searchParams;
  if (['en', 'fr'].includes(query.get('lang'))) setLanguage(query.get('lang'));
  const place = places.find(p => p.id === query.get('place'));
  state.city = place?.city || (query.get('city') === 'london' ? 'london' : 'paris');
  state.view = (place || query.get('view') === 'map') ? 'map' : 'list';
  const category = query.get('category');
  state.category = ['restaurants', 'brunch', 'bakery', 'takeaway', 'sweets'].includes(category) ? category : 'all';
  detailId = place?.id || null;
  if (place) state.selected = place.id;
  render();
  if (place) openDetail(place.id, false);
  else if ($('#place-dialog').open) dismissDetail();
}
window.addEventListener('popstate', restoreURL);
window.addEventListener('resize',()=>{if(mapFrame)cancelAnimationFrame(mapFrame);mapFrame=requestAnimationFrame(()=>{updateMap(filtered())})});
restoreURL();
