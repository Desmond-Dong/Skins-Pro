import type { HomeAssistant, DashboardConfig, TranslationKey } from './types';
import type { Language } from './i18n.generated';
import { SKINS, DEFAULT_SKIN, SKIN_STRINGS, SKIN_ICON_MAPS } from './skins.generated';
import { DEFAULT_ASSETS } from './constants';
import { STRINGS } from './i18n.generated';

export const BUNDLED_SKINS: readonly string[] = SKINS;

export type { Language } from './i18n.generated';
export type { TranslationKey } from './types';

export function normalizeLanguage(language?: string): Language {
  if ((language || '').toLowerCase().startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
}

export function localizedText(
  base: string | undefined,
  zh: string | undefined,
  en: string | undefined,
  language: Language,
  fallback = '',
): string {
  if (language === 'zh-CN') {
    return zh || base || en || fallback;
  }
  return en || base || zh || fallback;
}

export function deviceStateLabel(state: string, language: Language): string {
  if (state === 'unavailable' || state === 'unknown') {
    return STRINGS[language].offline;
  }
  if (state === 'on' || state === 'playing' || state === 'cool' || state === 'heat' || state === 'armed') {
    return STRINGS[language].on;
  }
  if (state === 'open' || state === 'unlocked') {
    return STRINGS[language].open;
  }
  if (state === 'locked' || state === 'closed') {
    return STRINGS[language].closed;
  }
  if (state === 'off' || state === 'idle' || state === 'standby') {
    return STRINGS[language].off;
  }
  if (/^armed_|^disarmed|^triggered|^pending|^arming/.test(state)) {
    return state.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return formatRawState(state, language);
}

function formatRawState(raw: string, language: Language): string {
  const num = Number(raw);
  if (Number.isFinite(num)) {
    return parseFloat(num.toFixed(2)).toString();
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const locale = language === 'zh-CN' ? 'zh-CN' : 'en';
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
      if (isDateOnly) {
        return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
      }
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }).format(d);
    }
  }
  return raw.replace(/\.\d+/, '') || '--';
}

export function getTranslate(language: Language): (key: TranslationKey) => string {
  return (key: TranslationKey): string => STRINGS[language][key];
}

export function defaultResourceBasePath(): string {
  try {
    return new URL(DEFAULT_SKIN, import.meta.url).toString();
  } catch {
    return `/local/community/skins-pro/${DEFAULT_SKIN}`;
  }
}

export function bundledAssetsRootPath(): string {
  return defaultResourceBasePath().replace(/\/[^/]+\/?$/, '');
}

export function bundledSkinBasePath(skin: string): string {
  return `${bundledAssetsRootPath().replace(/\/$/, '')}/${skin}`;
}

export function formatNumber(value: string, decimals: number): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(decimals) : '--';
}

export function stateValue(hass: HomeAssistant | undefined, entityId?: string, language?: Language): string {
  if (!entityId || !hass) {
    return '';
  }
  return formatRawState(hass.states[entityId]?.state || '', language || 'en');
}

export function timeText(hass: HomeAssistant | undefined, language: Language): string {
  const locale = hass?.locale?.language || language;
  const fmt24 = hass?.locale?.time_format !== '12h';
  return new Intl.DateTimeFormat(locale, { hour: fmt24 ? '2-digit' : 'numeric', minute: '2-digit', hour12: !fmt24 }).format(new Date());
}

export function dateText(hass: HomeAssistant | undefined, language: Language): string {
  const locale = hass?.locale?.language || language;
  const fmt = hass?.locale?.date_format;
  let opts: Intl.DateTimeFormatOptions;
  switch (fmt) {
    case 'MDY': opts = { month: '2-digit', day: '2-digit', year: 'numeric', weekday: 'short' }; break;
    case 'YMD': opts = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }; break;
    default: opts = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }; break;
  }
  return new Intl.DateTimeFormat(locale, opts).format(new Date());
}

export function weatherIcon(state: string): string {
  const iconMap: Record<string, string> = {
    sunny: 'mdi:weather-sunny',
    clear: 'mdi:weather-sunny',
    cloudy: 'mdi:weather-cloudy',
    partlycloudy: 'mdi:weather-partly-cloudy',
    rainy: 'mdi:weather-rainy',
    pouring: 'mdi:weather-pouring',
    snowy: 'mdi:weather-snowy',
    fog: 'mdi:weather-fog',
    windy: 'mdi:weather-windy',
    hail: 'mdi:weather-hail',
    lightning: 'mdi:weather-lightning',
  };
  return iconMap[state] || 'mdi:weather-partly-cloudy';
}

export function iconForDomain(domain: string): string {
  const icons: Record<string, string> = {
    light: 'mdi:lightbulb',
    input_boolean: 'mdi:boolean',
    button: 'mdi:gesture-tap',
    scene: 'mdi:palette',
    switch: 'mdi:toggle-switch',
    climate: 'mdi:air-conditioner',
    water_heater: 'mdi:water-boiler',
    humidifier: 'mdi:water-percent',
    media_player: 'mdi:speaker',
    remote: 'mdi:remote',
    lock: 'mdi:lock',
    cover: 'mdi:blinds',
    fan: 'mdi:fan',
    automation: 'mdi:robot',
    sensor: 'mdi:gauge',
    camera: 'mdi:cctv',
    alarm_control_panel: 'mdi:shield-lock',
    person: 'mdi:person',
    vacuum: 'mdi:robot-vacuum',
    device_tracker: 'mdi:map-marker',
    update: 'mdi:package-up',
  };
  return icons[domain] || 'mdi:devices';
}

export function assetKeyForDomain(skin: string, domain: string): string {
  const map = SKIN_ICON_MAPS[skin] || {};
  if (map[domain]) {
    return map[domain]!;
  }
  const pool = ['light', 'switch', 'button', 'climate', 'water_heater', 'humidifier', 'fan', 'speaker', 'remote', 'lock', 'camera', 'cover', 'valve', 'automation', 'media_player', 'vacuum', 'sensor', 'binary_sensor', 'update', 'device_tracker', 'person'];
  let hash = 0;
  for (let i = 0; i < domain.length; i += 1) {
    hash = ((hash << 5) - hash + domain.charCodeAt(i)) | 0;
  }
  return pool[Math.abs(hash) % pool.length]!;
}

export function selectedSkin(config?: DashboardConfig): string {
  const configuredSkin = config?.resource_pack?.skin;
  if (configuredSkin) {
    return configuredSkin;
  }
  const configuredBasePath = config?.resource_pack?.base_path || '';
  const matchedSkin = BUNDLED_SKINS.find((skin) => configuredBasePath === bundledSkinBasePath(skin) || configuredBasePath.endsWith(`/${skin}`));
  return matchedSkin || DEFAULT_SKIN;
}

export function assetUrl(config?: DashboardConfig, key?: string): string {
  if (!key) return '';
  const skin = selectedSkin(config);
  const configuredBasePath = config?.resource_pack?.base_path || '';
  const basePath = configuredBasePath === '__AUTO__' || !configuredBasePath
    ? bundledSkinBasePath(skin)
    : configuredBasePath;
  const asset = config?.resource_pack?.assets?.[key] || DEFAULT_ASSETS[key] || '';
  if (!asset) return '';
  if (/^https?:\/\//.test(asset) || asset.startsWith('/')) return asset;
  return `${basePath.replace(/\/$/, '')}/${asset}`;
}

export function assetHref(config?: DashboardConfig, key?: string): string {
  const url = assetUrl(config, key);
  if (!url) return '';
  if (key !== 'theme_css') return url;
  const skin = selectedSkin(config);
  const cacheKey = encodeURIComponent(`${skin}|${config?.resource_pack?.base_path || '__AUTO__'}`);
  return `${url}${url.includes('?') ? '&' : '?'}skin=${cacheKey}`;
}

export function skinString(skin: string, key: string): string {
  const data = (SKIN_STRINGS[skin] || SKIN_STRINGS[DEFAULT_SKIN] || {}) as Record<string, string>;
  return data[key] || '';
}

