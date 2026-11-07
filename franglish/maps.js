import {getLanguage, t} from './i18n.js';

const mapLanguages = new WeakMap();

export const lngLat = place => [place.coords[1], place.coords[0]];

export function createGuideMap(container, {center, zoom, onError} = {}) {
  if (!window.maplibregl) { onError?.(); return null; }
  let instance;
  try {
    instance = new maplibregl.Map({
      container,
      style: 'assets/map-style.json',
      locale: {'NavigationControl.ZoomIn':t('Zoom in'), 'NavigationControl.ZoomOut':t('Zoom out'), 'Map.Title':t('Restaurant map')},
      center,
      zoom,
      minZoom: 3,
      maxZoom: 18,
      attributionControl: false,
      maplibreLogo: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      scrollZoom: false,
      renderWorldCopies: false,
      fadeDuration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200,
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-left');
    instance.on('load', () => translateMap(instance));
    instance.on('error', () => onError?.());
    instance.on('idle', () => {
      translateMap(instance);
      if (instance.areTilesLoaded()) onError?.(false);
    });
    return instance;
  } catch {
    instance?.remove();
    onError?.();
    return null;
  }
}

export function addPlaceMarker(map, place, onClick) {
  const element = document.createElement('div');
  element.className = 'map-pin';
  element.dataset.type = place.type;
  const pin = document.createElement(onClick ? 'button' : 'span');
  pin.className = 'place-pin';
  pin.innerHTML = '<svg viewBox="0 0 24 28" aria-hidden="true"><path class="pin-shape" d="M12 26S21 17.6 21 11a9 9 0 0 0-18 0c0 6.6 9 15 9 15Z"/><circle class="pin-dot" cx="12" cy="11" r="3"/></svg>';
  const label = `${place.name} · ${place.category}`;
  if (onClick) {
    pin.type = 'button';
    pin.setAttribute('aria-label', label);
    pin.addEventListener('click', event => { event.stopPropagation(); onClick(place.id); });
  } else {
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', label);
  }
  element.append(pin);
  const tooltip = document.createElement('span');
  tooltip.className = 'pin-tooltip';
  tooltip.textContent = label;
  tooltip.setAttribute('aria-hidden', 'true');
  element.append(tooltip);
  const marker = new maplibregl.Marker({element, anchor:'bottom'}).setLngLat(lngLat(place)).addTo(map);
  // The inner button supplies the accessible name and keyboard interaction.
  element.removeAttribute('role');
  element.removeAttribute('tabindex');
  element.removeAttribute('aria-label');
  return marker;
}

export function fitPlaces(map, places, city) {
  if (!map) return;
  map.stop();
  const pins = places.filter(place => place.coords);
  if (pins.length > 1) {
    const bounds = new maplibregl.LngLatBounds();
    pins.forEach(place => bounds.extend(lngLat(place)));
    map.fitBounds(bounds, {padding:48, maxZoom:14, duration:0});
  } else {
    map.jumpTo({center:pins.length ? lngLat(pins[0]) : city === 'paris' ? [2.34,48.864] : [-.1971,51.5085], zoom:pins.length ? 14.5 : 12});
  }
}

export function translateMap(map) {
  if (!map) return;
  const container = map.getContainer();
  for (const [selector, label] of [['.maplibregl-ctrl-zoom-in','Zoom in'],['.maplibregl-ctrl-zoom-out','Zoom out']]) {
    const button = container.querySelector(selector);
    button?.setAttribute('title', t(label));
    button?.setAttribute('aria-label', t(label));
  }
  map.getCanvas().setAttribute('aria-label', t('Restaurant map'));
  if (!map.isStyleLoaded()) return;
  const language = getLanguage();
  if (mapLanguages.get(map) === language) return;
  mapLanguages.set(map, language);
  for (const layer of map.getStyle().layers) {
    const field = layer.layout?.['text-field'];
    if (layer.type !== 'symbol' || !field || !JSON.stringify(field).includes('name')) continue;
    map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:'+language], ['get', 'name_'+language], ['get', 'name:latin'], ['get','name']]);
  }
}
