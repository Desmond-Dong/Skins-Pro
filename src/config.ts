import type { DashboardConfig, HomeAssistant, HassEntity } from './types';
import { DEFAULT_CONFIG, DEFAULT_DEVICES, DEFAULT_ENVIRONMENT, DEFAULT_SCENES } from './constants';

export function mergeConfig(config: DashboardConfig): DashboardConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    resource_pack: {
      ...DEFAULT_CONFIG.resource_pack,
      ...config.resource_pack,
      assets: {
        ...DEFAULT_CONFIG.resource_pack?.assets,
        ...config.resource_pack?.assets,
      },
      theme: {
        ...DEFAULT_CONFIG.resource_pack?.theme,
        ...config.resource_pack?.theme,
      },
    },
    weather: {
      ...DEFAULT_CONFIG.weather,
      ...config.weather,
    },
    info: {
      ...DEFAULT_CONFIG.info,
      ...config.info,
    },
    energy: {
      ...DEFAULT_CONFIG.energy,
      ...config.energy,
    },
    media_player: {
      ...DEFAULT_CONFIG.media_player,
      ...config.media_player,
    },
    home_limits: {
      ...DEFAULT_CONFIG.home_limits,
      ...config.home_limits,
    },
    home_selection: {
      ...DEFAULT_CONFIG.home_selection,
      ...config.home_selection,
    },
    devices: config.devices && config.devices.length > 0 ? config.devices : DEFAULT_CONFIG.devices,
    rooms: config.rooms && config.rooms.length > 0 ? config.rooms : DEFAULT_CONFIG.rooms,
    scenes: config.scenes && config.scenes.length > 0 ? config.scenes : DEFAULT_CONFIG.scenes,
    environment: config.environment && config.environment.length > 0 ? config.environment : DEFAULT_CONFIG.environment,
    nav: config.nav && config.nav.length > 0
      ? [...config.nav, ...(DEFAULT_CONFIG.nav || []).filter((defaultItem) => !config.nav?.some((item) => (item.key || item.target) === (defaultItem.key || defaultItem.target)))]
      : DEFAULT_CONFIG.nav,
  };
}

export function findEntity(states: Record<string, HassEntity | undefined>, candidates: string[]): string | undefined {
  const ids = Object.keys(states);

  for (const candidate of candidates) {
    const exact = ids.find((id) => id === candidate);
    if (exact) return exact;
  }

  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLowerCase();
    const partial = ids.find((id) => id.toLowerCase().includes(lowerCandidate));
    if (partial) return partial;
  }

  return undefined;
}

export function findEntities(states: Record<string, HassEntity | undefined>, domain: string, keywords: string[], limit: number): string[] {
  const ids = Object.keys(states).filter((id) => id.startsWith(`${domain}.`));
  const scored = ids
    .map((id) => {
      const lower = id.toLowerCase();
      const score = keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 1 : 0), 0);
      return { id, score };
    })
    .filter((entry) => entry.score > 0);

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.id);
}

export function buildAutoConfig(hass: HomeAssistant): DashboardConfig {
  const states = hass.states || {};
  const defaultDevice0 = DEFAULT_DEVICES[0]!;
  const defaultDevice1 = DEFAULT_DEVICES[1]!;
  const defaultDevice2 = DEFAULT_DEVICES[2]!;
  const defaultDevice3 = DEFAULT_DEVICES[3]!;
  const defaultDevice4 = DEFAULT_DEVICES[4]!;
  const defaultEnv0 = DEFAULT_ENVIRONMENT[0]!;
  const defaultEnv1 = DEFAULT_ENVIRONMENT[1]!;
  const defaultEnv2 = DEFAULT_ENVIRONMENT[2]!;

  const weatherEntity = findEntity(states, ['weather.home', 'weather.forecast_home', 'weather.']);
  const outdoorTemp = findEntity(states, ['sensor.outdoor_temperature', 'sensor.outside_temperature', 'sensor.weather_temperature']);
  const quoteEntity = findEntity(states, ['input_text.daily_quote', 'sensor.daily_quote', 'sensor.hitokoto']);
  const energyEntity = findEntity(states, ['sensor.energy_cost_today', 'sensor.energy_today', 'sensor.daily_energy']);

  const livingTemp = findEntity(states, ['sensor.living_room_temperature', 'sensor.living_temperature', 'sensor.temperature_living']);
  const livingHumidity = findEntity(states, ['sensor.living_room_humidity', 'sensor.living_humidity', 'sensor.humidity_living']);
  const pm25 = findEntity(states, ['sensor.pm25', 'sensor.pm2_5', 'sensor.air_pm25']);

  const lightEntities = findEntities(states, 'light', ['living', 'garden', 'bedroom', 'kitchen'], 2);
  const climateEntity = findEntity(states, ['climate.living_room_ac', 'climate.living_room', 'climate.ac']);
  const mediaEntity = findEntity(states, ['media_player.living_room_speaker', 'media_player.speaker', 'media_player.living']);
  const lockEntity = findEntity(states, ['lock.front_door', 'lock.door']);
  const gardenLight = findEntity(states, ['light.garden_light_strip', 'light.garden', 'light.outdoor']);

  const sceneEntities = findEntities(states, 'scene', ['home', 'night', 'welcome', 'away', 'movie'], 4);
  const mappedScenes = DEFAULT_SCENES.map((scene, index) => ({
    ...scene,
    entity: sceneEntities[index] || scene.entity,
  }));

  return mergeConfig({
    type: 'custom:skins-pro-card',
    weather: {
      entity: weatherEntity || DEFAULT_CONFIG.weather?.entity,
      temperature_entity: outdoorTemp || DEFAULT_CONFIG.weather?.temperature_entity,
    },
    info: {
      entity: quoteEntity || DEFAULT_CONFIG.info?.entity,
    },
    energy: {
      ...DEFAULT_CONFIG.energy,
      entity: energyEntity || DEFAULT_CONFIG.energy?.entity,
    },
    media_player: {
      entity: mediaEntity || DEFAULT_CONFIG.media_player?.entity,
    },
    devices: [
      { ...defaultDevice0, entity: lightEntities[0] || defaultDevice0.entity, temperature_entity: livingTemp || defaultDevice0.temperature_entity },
      { ...defaultDevice1, entity: climateEntity || defaultDevice1.entity, temperature_entity: livingTemp || defaultDevice1.temperature_entity },
      { ...defaultDevice2, entity: mediaEntity || defaultDevice2.entity },
      { ...defaultDevice3, entity: lockEntity || defaultDevice3.entity },
      { ...defaultDevice4, entity: gardenLight || lightEntities[1] || defaultDevice4.entity },
    ],
    rooms: [
      { image: 'room_living', info_entity: findEntity(states, ['sensor.living_room_summary', 'sensor.living_summary']) },
      { image: 'room_bedroom', info_entity: findEntity(states, ['sensor.bedroom_summary', 'sensor.bed_summary']) },
      { image: 'room_kitchen', info_entity: findEntity(states, ['sensor.kitchen_summary']) },
      { image: 'room_garden', info_entity: findEntity(states, ['sensor.garden_summary']) },
    ],
    scenes: mappedScenes,
    environment: [
      { ...defaultEnv0, entity: livingTemp || defaultEnv0.entity },
      { ...defaultEnv1, entity: livingHumidity || defaultEnv1.entity },
      { ...defaultEnv2, entity: pm25 || defaultEnv2.entity },
    ],
  });
}