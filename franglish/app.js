import {getLanguage, setLanguage, dateLocale, t, localizePlace, areaText, translatePage} from './i18n.js';
import {places} from './places.js';
import {createGuideMap, addPlaceMarker, fitPlaces, lngLat, translateMap} from './maps.js';
import {social,ready,signIn,toggleLike,watchLikes,watchComments,watchCommentCount,postComment,deleteComment} from './social.js';
const $=s=>document.querySelector(s);
const paths={heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',comment:'M21 11.5a9 9 0 0 1-9 9c-1.4 0-2.7-.3-3.9-.9L3 21l1.4-5.1A9 9 0 1 1 21 11.5Z',share:'m22 2-7 20-4-9-9-4L22 2ZM22 2 11 13',bookmark:'M6 3h12v19l-6-4-6 4V3Z',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',sliders:'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 10h6M9 12h6M17 16h6',map:'m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5ZM9 2v17M15 5v17',list:'M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01',expand:'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5',locate:'M12 2v3M12 19v3M2 12h3M19 12h3M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',close:'m6 6 12 12M18 6 6 18',arrow:'M5 12h14m-6-6 6 6-6 6',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',external:'M14 3h7v7M21 3 10 14M10 3H3v18h18v-7',utensils:'M3 2v6a3 3 0 0 0 6 0V2M6 2v20M20 22V2c-4 2-5 7-5 11h5'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.pin}"/></svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readStore=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
const localLikes=new Set(readStore('atable-likes'));
const store=(key,set)=>{try{localStorage.setItem(key,JSON.stringify([...set]));return true}catch{toast(t('Your browser couldn’t save this for next time.'));return false}};
const state={city:'paris',view:'list',category:'all',selected:null};
let map,markers={},detailId=null,photoIndex=0,commentOff=()=>{},commentRequest=0,mapSignature=null,mapFrame=null,toastTimer,detailPushed=false;
let likeOffs=[],commentCountOffs=[];
const commentCounts={};
function restartCommentCounts(){commentCountOffs.forEach(off=>off());commentCountOffs=[];if(social.ready)commentCountOffs=places.map(p=>watchCommentCount(p.id,count=>{commentCounts[p.id]=count;updateActions()},()=>{}));}
function restartLikes(){likeOffs.forEach(off=>off());likeOffs=[];if(social.ready)likeOffs=places.map(p=>watchLikes(p.id,ids=>{likeUsers[p.id]=ids;updateActions()},()=>{}));}
const likeUsers={}; const pendingLikes=new Set();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500)}
function hydrate(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function liked(id){return social.ready?Boolean(social.user&&likeUsers[id]?.includes(social.user.uid)):localLikes.has(id)}
function likeCount(id){const count=social.ready?likeUsers[id]?.length:0;return count?String(count):''}
function likeLabel(p){const count=likeCount(p.id);return t(liked(p.id)?'Unlike {name}':'Like {name}',{name:p.name})+(count?', '+t(count==='1'?'{count} like':'{count} likes',{count}):'')}
function commentCount(id){return social.ready&&commentCounts[id]?String(commentCounts[id]):''}
function commentLabel(p){const count=commentCount(p.id);return t('Comment on {name}',{name:p.name})+(count?', '+t(count==='1'?'{count} comment':'{count} comments',{count}):'')}
function actions(p){return `<div class="social-row"><button class="icon-button like-button ${liked(p.id)?'liked':''}" data-like="${p.id}" aria-label="${esc(likeLabel(p))}" aria-pressed="${liked(p.id)}">${icon('heart')}<span class="social-count" data-likes-count="${p.id}" aria-hidden="true">${likeCount(p.id)}</span></button><button class="icon-button comment-button" data-comment="${p.id}" aria-label="${esc(commentLabel(p))}">${icon('comment')}<span class="social-count" data-comments-count="${p.id}" aria-hidden="true">${commentCount(p.id)}</span></button><button class="icon-button" data-share="${p.id}" aria-label="${esc(t('Share {name}',{name:p.name}))}">${icon('share')}</button></div>`}
function card(raw){const p=localizePlace(raw);return `<article class="place-card ${state.selected===p.id?'is-selected':''}" data-card="${p.id}" data-type="${p.type}"><div class="photo-pair"><div class="photo-stack">${p.images.slice(0,2).map((src,index)=>`<button class="card-photo" data-open="${p.id}" data-start-photo="${index}" aria-label="${esc(t('View {name} photo {number}',{name:p.name,number:index+1}))}"><img src="${src.replace('.jpg','-thumb.jpg')}" alt="${esc(p.name)} — photo ${index+1}" loading="lazy" width="112" height="112"></button>`).join('')}</div><span class="place-rating">${p.rating.toFixed(1)}/10</span></div><div class="card-body"><button class="place-title" data-open="${p.id}">${esc(p.name)}</button><div class="card-meta"><span>${esc(p.category)}</span>${p.tags.includes('Bouillon')?'<span>· Bouillon</span>':''}${p.price?`<span class="price">· ${p.price}</span>`:''}</div><div class="card-area">${icon('pin')}<span>${esc(areaText(p))}</span></div><p class="card-description">${esc(p.description)}</p>${actions(p)}</div></article>`;}

function matchesCategory(p,category){return category==='all'||category==='restaurants'&&!['Bakery','Brunch'].includes(p.category)&&p.type!=='sweets'||category==='brunch'&&p.tags.some(t=>['Brunch','Coffee'].includes(t))||category==='bakery'&&p.category==='Bakery'||category==='takeaway'&&p.tags.includes('Takeaway')||category==='sweets'&&p.type==='sweets'}
function categoryAvailable(category){return places.some(p=>p.city===state.city&&matchesCategory(p,category))}
function filtered(){return places.filter(p=>p.city===state.city&&matchesCategory(p,state.category)).sort((a,b)=>b.rating-a.rating)}
function updateURL(){const u=new URL(location.href);u.search='';u.searchParams.set('lang',getLanguage());if(state.city!=='paris')u.searchParams.set('city',state.city);if(state.view==='map')u.searchParams.set('view','map');if(state.category!=='all')u.searchParams.set('category',state.category);if(detailId)u.searchParams.set('place',detailId);history.replaceState(null,'',u)}


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
  Object.values(markers).forEach(marker=>marker.remove());
  markers={};
  for(const p of list){
    if(!p.coords)continue;
    const marker=addPlaceMarker(map,localizePlace(p),selectPin);
    marker.getElement().classList.toggle('selected',state.selected===p.id);
    markers[p.id]=marker;
  }
  if(refit)fitMap(list);
  renderMapSelection();
}
function selectPin(id){
  if(matchMedia('(max-width: 760px)').matches){openDetail(id);return}
  state.selected=id;
  const p=places.find(p=>p.id===id);
  document.querySelectorAll('[data-card]').forEach(el=>el.classList.toggle('is-selected',el.dataset.card===id));
  for(const [key,marker] of Object.entries(markers))marker.getElement().classList.toggle('selected',key===id);
  if(state.view==='list'){setView('map')}else{
    map.easeTo({center:lngLat(p),duration:reduced?0:450});
    renderMapSelection();
    document.querySelector(`[data-card="${id}"]`)?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'nearest'});
  }
}
function renderMapSelection(){if(state.view==='map'&&!filtered().length){$('#map-selection').hidden=false;$('#map-selection').innerHTML=`<div class="empty"><h3>${t('No places found.')}</h3><p>${t('Try another type of place.')}</p><button data-reset>${t('Explore all places')}</button></div>`;return}const p=localizePlace(places.find(p=>p.id===state.selected));$('#map-selection').hidden=state.view!=='map'||!p;if(p)$('#map-selection').innerHTML=`<button class="selected-place" data-type="${p.type}" data-open="${p.id}"><img src="${p.images[0].replace('.jpg','-thumb.jpg')}" alt=""><span><strong>${esc(p.name)}</strong><small>${esc(p.category)} · ${esc(areaText(p))}</small></span>${icon('arrow')}</button>`;}
function setView(view){state.view=view;render();if(view==='map')$('#places').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'})}
function reset(){state.category='all';render()}
function updateActions(){document.querySelectorAll('[data-like]').forEach(b=>{const p=places.find(p=>p.id===b.dataset.like);b.classList.toggle('liked',liked(p.id));b.setAttribute('aria-pressed',liked(p.id));b.setAttribute('aria-label',likeLabel(p))});document.querySelectorAll('[data-likes-count]').forEach(el=>el.textContent=likeCount(el.dataset.likesCount));document.querySelectorAll('[data-comments-count]').forEach(el=>el.textContent=commentCount(el.dataset.commentsCount));document.querySelectorAll('[data-comment]').forEach(b=>b.setAttribute('aria-label',commentLabel(places.find(p=>p.id===b.dataset.comment))));}
function info(title,body){$('#info-content').innerHTML=`<h2 id="info-title">${title}</h2>${body}`;$('#info-dialog').showModal();document.body.classList.add('modal-open')}
function closeInfo(){$('#info-dialog').close();if(!$('#place-dialog').open)document.body.classList.remove('modal-open')}
function openDetail(id,comments=false,push=true,startPhoto=0){const p=localizePlace(places.find(p=>p.id===id));if(!p)return;const oldURL=location.href;detailId=id;photoIndex=Math.min(startPhoto,p.images.length-1);commentOff();const wasOpen=$('#place-dialog').open;
$('#detail-content').innerHTML=`<div class="detail-gallery"><img id="gallery-photo" src="${p.images[photoIndex]}" alt="${esc(p.name)} — photo ${photoIndex+1}"><div class="gallery-controls" ${p.images.length<2?'hidden':''}><button data-photo="-1" aria-label="${t('Previous photo')}">${icon('left')}</button><span id="photo-count">${photoIndex+1} / ${p.images.length}</span><button data-photo="1" aria-label="${t('Next photo')}">${icon('right')}</button></div></div><div class="detail-body"><div class="detail-category">${esc(p.category)}${p.price?' · '+p.price:''}<span class="detail-rating">${p.rating.toFixed(1)}/10</span></div><h2 id="detail-title">${esc(p.name)}</h2><p class="detail-location">${esc(areaText(p))} · ${p.city==='paris'?'Paris':t('London')}</p>${actions(p)}<p class="review-text">${esc(p.review)}</p><p class="detail-tip">${esc(p.note)} ${esc(p.priceNote||'')}</p><div class="details-address">${icon('pin')}<div><strong>${esc(p.address)}</strong><p>${p.city==='paris'?'Métro':t('Tube')}: ${esc(p.metro)}</p></div></div><section class="comments" id="comments-section"><h3>${t('Comments')}</h3><div id="comment-list"></div><div id="comment-compose"></div></section></div>`;
if(!wasOpen)$('#place-dialog').showModal();$('#place-dialog').scrollTop=0;document.body.classList.add('modal-open');if(push&&!wasOpen){const u=new URL(oldURL);u.searchParams.set('place',id);history.pushState(null,'',u);detailPushed=true}else updateURL();loadComments(id);if(comments)setTimeout(()=>$('#comments-section')?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'nearest'}),100);}
function closeDetail(){commentOff();detailId=null;$('#place-dialog').close();document.body.classList.remove('modal-open');if(detailPushed){detailPushed=false;history.back()}else updateURL()}
function compose(){if(!$('#comment-compose')||$('#comment-form'))return;if(!social.ready){$('#comment-compose').innerHTML='';return}$('#comment-compose').innerHTML=`<details class="comment-disclosure"><summary>${t('Been here? leave a note')}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><form class="comment-form" id="comment-form"><label for="comment-name">${t('Your name')}<input id="comment-name" name="displayName" autocomplete="nickname" placeholder="${t('Your name')}" maxlength="80" required></label><label for="comment-text">${t('Your comment')}<textarea id="comment-text" name="comment" placeholder="${t('How was it?')}" maxlength="1000" rows="3" required></textarea></label><div class="comment-submit"><p class="form-error" role="alert"></p><button type="submit">${t('Post')}</button></div></form></details>`;}

async function loadComments(id){const request=++commentRequest;$('#comment-list').innerHTML=`<p class="comments-status">${t('Loading comments…')}</p>`;await ready;if(detailId!==id||request!==commentRequest)return;compose();if(!social.ready){$('#comment-list').innerHTML=`<p class="comments-status">${social.configured?t('Couldn’t load comments. Try again in a moment.'):t('Comments are coming soon.')}</p>`;return}commentOff=watchComments(id,list=>{if(detailId!==id)return;$('#comment-list').innerHTML=list.length?list.map(c=>`<div class="comment"><span class="author-avatar">${esc((c.name||'G').charAt(0))}</span><p><strong>${esc(c.name)}</strong>${esc(c.text)}<time>${c.pending?t('Sending…'):c.createdAt?.toDate?c.createdAt.toDate().toLocaleDateString(dateLocale(),{month:'short',day:'numeric'}):''}</time></p>${c.uid===social.user?.uid?`<button class="comment-delete" data-delete-comment="${esc(c.id)}" aria-label="${t('Delete your comment')}">${t('Delete')}</button>`:''}</div>`).join(''):'';},()=>{if(detailId===id)$('#comment-list').innerHTML=`<p class="comments-status">${t('Couldn’t load comments. Please reopen this place to try again.')}</p>`})}
async function share(id){const p=localizePlace(places.find(p=>p.id===id));const u=new URL(location.href);u.search='';u.searchParams.set('lang',getLanguage());u.searchParams.set('city',p.city);u.searchParams.set('place',p.id);const data={title:`${p.name} · ${t('Food guide')}`,text:`${p.name} — ${p.description}`,url:u.href};try{if(navigator.share){await navigator.share(data);return}await navigator.clipboard.writeText(u.href);toast(t('Link copied.'))}catch(e){if(e.name==='AbortError')return;info(t('Share this place.'),`<p>${esc(t('Copy the link to {name}.',{name:p.name}))}</p><input aria-label="${t('Share link')}" readonly value="${esc(u.href)}"><button class="primary" data-copy-link="${esc(u.href)}">${t('Copy link')}</button>`);$('#info-content input').select();}}
document.addEventListener('click',async e=>{const b=e.target.closest('button');
if(!b){
  const card=e.target.closest('[data-card]');
  if(card&&matchMedia('(max-width: 760px)').matches&&!e.target.closest('a,input,textarea,select')&&!window.getSelection()?.toString())openDetail(card.dataset.card);
  return;
}
const d=b.dataset;if(d.lang){setLanguage(d.lang);render()}else if(d.city){state.city=d.city;state.selected=null;state.category='all';render()}else if(d.view)setView(d.view);else if(d.category){state.category=d.category;render()}else if(d.open)openDetail(d.open,false,true,Number(d.startPhoto)||0);else if(d.comment)openDetail(d.comment,true);else if(d.share)share(d.share);else if(d.like){if(pendingLikes.has(d.like))return;if(!social.configured){localLikes.has(d.like)?localLikes.delete(d.like):localLikes.add(d.like);store('atable-likes',localLikes);updateActions();if(localLikes.has(d.like))toast(t('Liked on this device.'));return}await ready;pendingLikes.add(d.like);b.disabled=true;try{await toggleLike(d.like)}catch(err){toast(t('Couldn’t save your like. Please try again.'))}finally{pendingLikes.delete(d.like);b.disabled=false}}else if(d.photo){const p=places.find(p=>p.id===detailId);photoIndex=(photoIndex+Number(d.photo)+p.images.length)%p.images.length;$('#gallery-photo').src=p.images[photoIndex];$('#gallery-photo').alt=`${p.name} — photo ${photoIndex+1}`;$('#photo-count').textContent=`${photoIndex+1} / ${p.images.length}`}else if('reset'in d)reset();else if('dismissInfo'in d)closeInfo();else if(d.deleteComment){b.disabled=true;try{await deleteComment(detailId,d.deleteComment)}catch{toast(t('Couldn’t delete your comment.'));b.disabled=false}}else if(d.copyLink){try{await navigator.clipboard.writeText(d.copyLink);closeInfo();toast(t('Link copied.'))}catch{toast(t('Select and copy the link above.'))}}});
$('#expand-map').onclick=()=>setView('map');$('#fit-map').onclick=()=>fitMap();$('#close-detail').onclick=closeDetail;$('#close-info').onclick=closeInfo;$('#place-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDetail()});$('#info-dialog').addEventListener('cancel',e=>{e.preventDefault();closeInfo()});for(const [id,close]of [['place-dialog',closeDetail],['info-dialog',closeInfo]])$('#'+id).addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
document.addEventListener('submit',async e=>{if(e.target.id!=='comment-form')return;e.preventDefault();const form=e.target;const nameField=form.elements.displayName;const textField=form.elements.comment;const button=form.querySelector('button');const error=form.querySelector('.form-error');const id=detailId;const name=nameField.value.trim();const text=textField.value.trim();for(const [field,value,message] of [[nameField,name,t('Enter your name.')],[textField,text,t('Write a comment.')]]){field.setCustomValidity(value?'':message);field.oninput=()=>field.setCustomValidity('');if(!value){field.reportValidity();return}}button.disabled=true;button.textContent=t('Posting…');error.textContent='';try{if(social.user?.displayName!==name)await signIn(name);await postComment(id,text);if(detailId===id&&textField.value.trim()===text)textField.value='';toast(t('Comment posted.'));}catch(err){error.textContent=t('Couldn’t post. Please try again.');}finally{button.disabled=false;button.textContent=t('Post');}});
window.addEventListener('auth-change',()=>{restartLikes();restartCommentCounts();updateActions();compose();if(detailId){commentOff();loadComments(detailId)}});
function restoreURL(){const q=new URL(location.href).searchParams;if(['en','fr'].includes(q.get('lang')))setLanguage(q.get('lang'));const p=places.find(p=>p.id===q.get('place'));state.city=p?.city||(q.get('city')==='london'?'london':'paris');state.view=q.get('view')==='map'?'map':'list';state.category=['all','restaurants','brunch','bakery','takeaway','sweets'].includes(q.get('category'))?q.get('category'):'all';detailId=p?.id||null;render();if(p)openDetail(p.id,false,false);else if($('#place-dialog').open){commentOff();$('#place-dialog').close();document.body.classList.remove('modal-open')}}
window.addEventListener('popstate',()=>{detailPushed=false;restoreURL()});window.addEventListener('resize',()=>{if(mapFrame)cancelAnimationFrame(mapFrame);mapFrame=requestAnimationFrame(()=>{updateMap(filtered())})});
restoreURL();ready.then(()=>{if(social.ready){window.dispatchEvent(new CustomEvent('auth-change'))}});
