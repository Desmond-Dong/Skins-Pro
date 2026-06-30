import { LitElement, html, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import type { PropertyValues, TemplateResult } from 'lit';
import './skins-pro-card-editor';

import type {
  AreaRegistryEntry,
  DashboardConfig,
  DeviceRegistryEntry,
  EnergySourceData,
  EntityRegistryEntry,
  EnvironmentMetricConfig,
  HomeAssistant,
  HassEntity,
  MaintenanceItem,
  RenderedDevice,
  RoomConfig,
  ViewName,
  WeatherForecastDay,
} from './types';
import type { TranslationKey } from './types';
import type { Language } from './i18n.generated';
import { STRINGS } from './i18n.generated';

import {
  DEFAULT_ROOMS,
} from './constants';

import {
  assetHref,
  assetKeyForDomain,
  assetUrl,
  dateText,
  deviceStateLabel,
  formatNumber,
  getTranslate,
  iconForDomain,
  localizedText,
  normalizeLanguage,
  selectedSkin,
  skinString,
  stateValue,
  timeText,
  weatherIcon,
} from './utils';

import { mergeConfig } from './config';

import { fetchEnergyHistory, fetchEnergySources } from './energy';

import { loadWeatherForecast, getWeatherDisplayText, getWeatherTemperature } from './weather';

import { loadAreas, loadDeviceRegistry, loadEntityRegistry } from './registry';

import { getMaintenanceItems } from './maintenance';

import { toggleKiosk } from './kiosk';

const CONTROLLABLE_DOMAINS = new Set(['light', 'switch', 'fan', 'cover', 'valve']);

export class MinecraftDashboardCard extends LitElement {
  private _config?: DashboardConfig;
  private _hass?: HomeAssistant;

  @state() private _view: ViewName = 'home';
  @state() private _deviceGrouping: 'area' | 'domain' = 'area';
  @state() private _filterRoom = '';
  @state() private _filterType = '';

  @state() private _areas?: AreaRegistryEntry[];
  @state() private _entityRegistry?: EntityRegistryEntry[];
  @state() private _deviceRegistry?: DeviceRegistryEntry[];

  private _areasLoaded = false;
  private _areasLoading = false;
  private _entityRegistryLoaded = false;
  private _entityRegistryLoading = false;
  private _deviceRegistryLoaded = false;
  private _deviceRegistryLoading = false;

  @state() private _energyHistory?: number[];
  @state() private _energyYesterday?: string;
  private _energyHistoryDone = false;
  private _energyHistoryLoading = false;

  @state() private _energySources: EnergySourceData[] = [];
  private _energyPrefsDone = false;
  private _energyPrefsLoading = false;

  @state() private _weatherForecast?: WeatherForecastDay[];
  private _weatherForecastEntity?: string;
  private _weatherForecastUnsub?: () => Promise<void>;

  private _autoFullscreenDone = false;
  private readonly _handleWindowResize = () => this.applyLayoutHeight();

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  public set hass(value: HomeAssistant | undefined) {
    const old = this._hass;
    this._hass = value;
    this.requestUpdate('hass', old);
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('resize', this._handleWindowResize);
    if (this._hass && this._config?.weather?.entity && this._weatherForecastEntity !== this._config.weather.entity) {
      void this.loadWeatherForecast();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('resize', this._handleWindowResize);
    void this.unsubscribeWeatherForecast();
  }

  public setConfig(config: DashboardConfig): void {
    if (!config || config.type !== 'custom:skins-pro-card') {
      throw new Error('Card type must be custom:skins-pro-card');
    }
    this._config = mergeConfig(config);
    this._energyHistory = undefined;
    this._energyYesterday = undefined;
    this._energyHistoryDone = false;
    this._energySources = [];
    this._energyPrefsDone = false;
    this._weatherForecast = undefined;
    this._weatherForecastEntity = undefined;
    void this.unsubscribeWeatherForecast();
    this.requestUpdate();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this._hass) return;

    if (changed.has('hass') || (this._view === 'energy' && !this._energySources.length)) {
      void this.fetchEnergyPrefs();
    }
    if (changed.has('hass')) {
      void this.loadAreas();
      void this.loadEntityRegistry();
      void this.loadDeviceRegistry();
      void this.loadEnergyHistory();
    }
    const weatherEntity = this._config?.weather?.entity;
    if (weatherEntity && this._weatherForecastEntity !== weatherEntity) {
      void this.loadWeatherForecast();
    }
  }

  public getCardSize(): number {
    return 12;
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement('skins-pro-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return { type: 'custom:skins-pro-card' };
  }

  // ─── Registry loading ───────────────────────────────────

  private async loadAreas(): Promise<void> {
    if (!this._hass || this._areasLoaded || this._areasLoading) return;
    this._areasLoading = true;
    try {
      this._areas = await loadAreas(this._hass);
      this._areasLoaded = true;
    } catch {
      // retry next cycle
    } finally {
      this._areasLoading = false;
    }
  }

  private async loadEntityRegistry(): Promise<void> {
    if (!this._hass || this._entityRegistryLoaded || this._entityRegistryLoading) return;
    this._entityRegistryLoading = true;
    try {
      this._entityRegistry = await loadEntityRegistry(this._hass);
      this._entityRegistryLoaded = true;
    } catch {
    } finally {
      this._entityRegistryLoading = false;
    }
  }

  private async loadDeviceRegistry(): Promise<void> {
    if (!this._hass || this._deviceRegistryLoaded || this._deviceRegistryLoading) return;
    this._deviceRegistryLoading = true;
    try {
      this._deviceRegistry = await loadDeviceRegistry(this._hass);
      this._deviceRegistryLoaded = true;
    } catch {
    } finally {
      this._deviceRegistryLoading = false;
    }
  }

  // ─── Energy ─────────────────────────────────────────────

  private async fetchEnergyPrefs(): Promise<void> {
    if (!this._hass || this._energyPrefsDone || this._energyPrefsLoading) return;
    this._energyPrefsLoading = true;
    try {
      const result = await fetchEnergySources(this._hass, this._config!);
      this._energySources = result.sources;
      this._energyHistory = result.history;
      this._energyYesterday = result.yesterday;
      this._energyPrefsDone = result.sources.length > 0;
    } catch {
    } finally {
      this._energyPrefsLoading = false;
    }
  }

  private async loadEnergyHistory(): Promise<void> {
    const entityId = this._config?.energy?.entity;
    if (!entityId || !this._hass || this._energyPrefsDone || this._energyHistoryDone || this._energyHistoryLoading) return;
    this._energyHistoryLoading = true;
    try {
      const result = await fetchEnergyHistory(this._hass, this._config!);
      this._energyHistory = result.history;
      this._energyYesterday = result.yesterday;
      this._energyHistoryDone = result.history.length > 0;
    } catch {
    } finally {
      this._energyHistoryLoading = false;
    }
  }

  // ─── Weather forecast ───────────────────────────────────

  private async loadWeatherForecast(): Promise<void> {
    const entityId = this._config?.weather?.entity;
    if (!entityId || !this._hass) return;
    if (this._weatherForecastEntity === entityId) return;

    await this.unsubscribeWeatherForecast();
    this._weatherForecastEntity = entityId;

    const result = await loadWeatherForecast(
      this._hass, entityId,
      (forecast) => {
        this._weatherForecast = forecast;
        this.requestUpdate();
      },
    );
    this._weatherForecastUnsub = result.unsub;
    if (result.initial) {
      this._weatherForecast = result.initial;
    }
  }

  private async unsubscribeWeatherForecast(): Promise<void> {
    if (this._weatherForecastUnsub) {
      try {
        await this._weatherForecastUnsub();
      } catch {
        // connection may already be closed
      } finally {
        this._weatherForecastUnsub = undefined;
      }
    }
  }

  // ─── Main render ────────────────────────────────────────

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    if (!this._hass) {
      return html`
        <link rel="stylesheet" href="${assetHref(this._config, 'theme_css')}">
        <ha-card><div class="loading-state">Loading...</div></ha-card>
      `;
    }

    const language = normalizeLanguage(
      this._config.language === 'auto' ? this._hass.language : this._config.language,
    );
    const translate = getTranslate(language);
    const weatherIconName = weatherIcon(stateValue(this._hass, this._config.weather?.entity, language));
    const quote = stateValue(this._hass, this._config.info?.entity, language) || translate('loadingQuote');
    const energyEntityId = this._config.energy?.entity || '';
    const energyValue = this._config.energy?.entity ? formatNumber(stateValue(this._hass, this._config.energy.entity, language), 1) : '--';
    const energyUnit = (this._hass?.states[energyEntityId]?.attributes?.unit_of_measurement as string | undefined) || this._config.energy?.unit || 'kWh';
    const compareValue = this._energyYesterday || '';
    const energyBars = this.renderBars(this._energyHistory || []);
    const registriesLoading = this.renderRegistryLoading(language);

    return html`
      <link rel="stylesheet" href="${assetHref(this._config, 'theme_css')}">
      <ha-card>
        ${registriesLoading}
        <div class="mc-app" data-view=${this._view}>
          <aside class="sidebar">
            <div class="profile" @click=${() => this.toggleKioskFullscreen()}>
              ${this.renderImage('avatar', 'Avatar', 'profile-img')}
              <div class="meta">
                <h2>${this._config.profile_name || localizedText(undefined, this._config.profile_name_zh || skinString(selectedSkin(this._config), 'profile_name_zh'), this._config.profile_name_en || skinString(selectedSkin(this._config), 'profile_name_en'), language)}</h2>
                <p class="muted">${this._config.profile_subtitle || localizedText(undefined, this._config.profile_subtitle_zh || skinString(selectedSkin(this._config), 'profile_subtitle_zh'), this._config.profile_subtitle_en || skinString(selectedSkin(this._config), 'profile_subtitle_en'), language)}</p>
              </div>
            </div>
            <nav class="menu">
              ${this.renderNav(language)}
            </nav>
                        <div class="sidebar-art" @click=${() => this.toggleKioskFullscreen()}>${this.renderImage('decor', 'Decor', '')}</div>
          </aside>
          <main class="stage">
            ${this.renderStageContent(language, translate, weatherIconName, quote, energyValue, energyUnit, compareValue, energyBars)}
          </main>
          <nav class="mobile-nav">${this.renderNav(language)}</nav>
        </div>
      </ha-card>
    `;
  }

  private renderRegistryLoading(language: Language): TemplateResult | typeof nothing {
    if (!this._hass) return nothing;
    const allLoaded = this._areasLoaded && this._entityRegistryLoaded && this._deviceRegistryLoaded;
    if (allLoaded) return nothing;
    const label = language === 'zh-CN' ? '正在加载 Home Assistant 数据…' : 'Loading Home Assistant data…';
    return html`<div class="loading-state loading-registry">${label}</div>`;
  }

  private renderStageContent(
    language: Language,
    translate: (key: TranslationKey) => string,
    weatherIconName: string,
    quote: string,
    energyValue: string,
    energyUnit: string,
    compareValue: string,
    energyBars: TemplateResult,
  ): TemplateResult {
    if (this._view === 'devices') return this.renderDevicesPage(language, translate);
    if (this._view === 'rooms') return this.renderRoomsPage(language, translate);
    if (this._view === 'scenes') return this.renderScenesPage(translate);
    if (this._view === 'automations') return this.renderAutomationsPage(language, translate);
    if (this._view === 'security') return this.renderSecurityPage(language, translate);
    if (this._view === 'energy') return this.renderEnergyPage(language, translate, energyValue, energyUnit, compareValue, energyBars);

    return html`
      <div class="stage-grid">
        <div class="welcome-group">
          <section class="welcome" data-section="home">
            <h1>${this._config?.title || localizedText(undefined, this._config?.title_zh || skinString(selectedSkin(this._config), 'title_zh'), this._config?.title_en || skinString(selectedSkin(this._config), 'title_en'), language)}</h1>
            <p class="quote">${quote}</p>
          </section>
          ${this.renderWeather(weatherIconName)}
        </div>
        <section class="bottom-stack">
          <section class="bottom-block bottom-devices">
            <div class="section-title"><h2>${translate('devices')}</h2><p class="muted">${translate('quickControl')}</p></div>
            <div class="devices">${this.renderShortcutDevices(language)}</div>
          </section>
          <section class="bottom-block">
            <div class="section-title"><h2>${translate('rooms')}</h2><p class="muted">${translate('roomSnapshots')}</p></div>
            <div class="rooms">${this.renderRooms(language)}</div>
          </section>
        </section>
        <aside class="side">
          <section class="time-card">
            <div>
              <div class="time-main">${timeText(this._hass, language)}</div>
              <div class="time-sub">${dateText(this._hass, language)}</div>
            </div>
            <div class="time-icon"><ha-icon icon="mdi:clock-outline"></ha-icon></div>
          </section>
          <section class="glass-card">
            <div class="section-title"><h2>${translate('environment')}</h2></div>
            <div class="env-list">${this.renderEnvironment(language)}</div>
          </section>
          <section class="glass-card panel-energy">
            <div class="section-title"><h2>${translate('todayEnergy')}</h2></div>
            <div class="energy-value">${energyValue}<small> ${energyUnit}</small></div>
            <div class="bars">${energyBars}</div>
            <div class="energy-footer"><span class="muted">${localizedText(this._config?.energy?.compare_text, this._config?.energy?.compare_text_zh, this._config?.energy?.compare_text_en, language, translate('compareYesterday'))}</span><span class="down">${compareValue || '--'}</span></div>
          </section>
          ${this.renderMaintenanceCard(language, translate)}
          <section class="glass-card panel-scenes" data-section="scenes">
            <div class="section-title"><h2>${translate('scenes')}</h2><p class="muted">${translate('modes')}</p></div>
            <div class="scene-grid">${this.renderHomeScenes(translate)}</div>
          </section>
        </aside>
      </div>
    `;
  }

  // ─── Layout / Theme ─────────────────────────────────────

  private applyLayoutHeight(): void {
    const host = this.shadowRoot?.host as HTMLElement | undefined;
    if (!host) return;

    if (window.innerWidth <= 760) {
      host.style.setProperty('--sp-runtime-height', 'auto');
      host.style.setProperty('--sp-runtime-min-height', '100vh');
      return;
    }

    const rect = this.getBoundingClientRect();
    const paddingBottom = 0;
    const availableHeight = Math.max(560, Math.floor(window.innerHeight - rect.top - paddingBottom));
    host.style.setProperty('--sp-runtime-height', `${availableHeight}px`);
    host.style.setProperty('--sp-runtime-min-height', `${availableHeight}px`);
  }

  private applyThemeVariables(): void {
    const host = this.shadowRoot?.host as HTMLElement | undefined;
    if (!host) return;

    const theme = this._config?.resource_pack?.theme;
    if (theme) {
      for (const [key, value] of Object.entries(theme)) {
        host.style.setProperty(key, value);
      }
    }
    host.style.setProperty('--sp-stage-texture', `url("${assetUrl(this._config, 'stage')}")`);
    if (selectedSkin(this._config) !== 'visionOS') {
      host.style.setProperty('--sp-base-texture', `url("${assetUrl(this._config, 'base')}")`);
    }
  }

  // ─── Asset helpers (delegate to utils) ──────────────────

  private renderImage(key: string, alt: string, className?: string): TemplateResult | typeof nothing {
    const url = assetUrl(this._config, key);
    if (!url) return nothing;
    return html`<img class=${className || nothing} alt=${alt} src=${url}>`;
  }

  // ─── Navigation ─────────────────────────────────────────

  private renderNav(language: Language): TemplateResult {
    return html`${(this._config?.nav || []).map((item, index) => {
      const label = localizedText(item.label, item.label_zh, item.label_en, language, STRINGS[language][(item.key as TranslationKey) || 'home'] || item.key || '');
      const target = item.target || item.key || 'home';
      const isActive = target === this._view || (index === 0 && this._view === 'home' && target === 'home');
      return html`
        <button class="nav-button${isActive ? ' active' : ''}" @click=${() => this.navigateTo(target)}>
          <ha-icon icon=${item.icon || 'mdi:circle'}></ha-icon><span>${label}</span>
        </button>
      `;
    })}`;
  }

  private renderPageShell(title: string, subtitle: string, controls: TemplateResult, body: TemplateResult): TemplateResult {
    return html`
      <div class="page-shell">
        <div class="page-header">
          <div>
            <h1>${title}</h1>
            <p class="quote">${subtitle}</p>
          </div>
          <div class="page-controls">${controls}</div>
        </div>
        <div class="page-body">${body}</div>
      </div>
    `;
  }

  // ─── Devices page ───────────────────────────────────────

  private renderDevicesPage(language: Language, translate: (key: TranslationKey) => string): TemplateResult {
    const rooms = this.getDeviceRooms();
    const types = this.getDeviceTypes();
    return this.renderPageShell(
      translate('devices'),
      translate('quickControl'),
      html`
        <div class="filter-bar">
          <button class="chip${this._deviceGrouping === 'area' ? ' active' : ''}" @click=${() => { this._deviceGrouping = 'area'; }}>${translate('byArea')}</button>
          <button class="chip${this._deviceGrouping === 'domain' ? ' active' : ''}" @click=${() => { this._deviceGrouping = 'domain'; }}>${translate('byType')}</button>
          <select class="filter-select" @change=${(e: Event) => { this._filterRoom = (e.target as HTMLSelectElement).value; }}>
            <option value="">${translate('allRooms')}</option>
            ${rooms.map((r) => html`<option value="${r}" .selected=${r === this._filterRoom}>${r}</option>`)}
          </select>
          <select class="filter-select" @change=${(e: Event) => { this._filterType = (e.target as HTMLSelectElement).value; }}>
            <option value="">${translate('allTypes')}</option>
            ${types.map((t) => html`<option value="${t}" .selected=${t === this._filterType}>${t}</option>`)}
          </select>
          <button class="action-btn" @click=${() => this.batchControl('on', translate)}>${translate('turnOnAll')}</button>
          <button class="action-btn" @click=${() => this.batchControl('off', translate)}>${translate('turnOffAll')}</button>
        </div>
      `,
      html`
        <div class="page-scroll themed-scrollbar">
          ${this.renderRealDeviceGroups(language, translate)}
        </div>
      `
    );
  }

  // ─── Rooms page ─────────────────────────────────────────

  private renderRoomsPage(language: Language, translate: (key: TranslationKey) => string): TemplateResult {
    const roomsMarkup = this.renderAreaRooms(language, true, undefined, [], false);
    const roomCount = this._areas?.length || 0;
    const roomPageClass = roomCount > 8 ? 'rooms-page rooms-page-dense' : (roomCount > 4 ? 'rooms-page rooms-page-medium' : 'rooms-page');

    return this.renderPageShell(
      translate('rooms'),
      translate('roomSnapshots'),
      html``,
      html`
        <div class="rooms-page-wrap">
          ${roomsMarkup !== nothing
            ? html`<div class="rooms ${roomPageClass}">${roomsMarkup}</div>`
            : html`<div class="empty-state">${language === 'zh-CN' ? '没有读取到 Home Assistant 房间' : 'No Home Assistant areas found'}</div>`}
        </div>
      `
    );
  }

  // ─── Scenes page ────────────────────────────────────────

  private renderScenesPage(translate: (key: TranslationKey) => string): TemplateResult {
    const scenes = this.renderRealScenes(Number.MAX_SAFE_INTEGER);
    return this.renderPageShell(
      translate('scenes'),
      translate('modes'),
      html``,
      scenes !== nothing
        ? html`<div class="page-scroll themed-scrollbar"><div class="scene-grid scenes-page">${scenes}</div></div>`
        : html`<div class="empty-state">${translate('noScenes')}</div>`
    );
  }

  // ─── Automations page ──────────────────────────────────

  private renderAutomationsPage(language: Language, translate: (key: TranslationKey) => string): TemplateResult {
    const automations = this.renderRealAutomations(language);
    return this.renderPageShell(
      translate('automations'),
      language === 'zh-CN' ? 'Home Assistant 自动化' : 'Home Assistant automations',
      html``,
      automations !== nothing
        ? html`<div class="page-scroll themed-scrollbar"><div class="devices devices-page-grid">${automations}</div></div>`
        : html`<div class="empty-state">${translate('noAutomations')}</div>`
    );
  }

  // ─── Energy page ────────────────────────────────────────

  private renderEnergyPage(language: Language, translate: (key: TranslationKey) => string, energyValue: string, _energyUnit: string, compareValue: string, _energyBars: TemplateResult): TemplateResult {
    const sources = this._energySources.length > 0 ? this._energySources : (
      energyValue !== '--' ? [{
        key: 'todayEnergy' as TranslationKey,
        entityId: this._config?.energy?.entity || '',
        icon: 'mdi:lightning-bolt',
        unit: this._config?.energy?.unit || 'kWh',
        history: this._energyHistory || [],
        yesterday: compareValue || undefined,
        today: energyValue,
      }] : []
    );

    return this.renderPageShell(
      translate('energy'),
      translate('todayEnergy'),
      html``,
      html`
        <div class="page-body single-column energy-detail-page">
          ${sources.map((src) => {
            const bars = this.renderBars(src.history);
            return html`
              <section class="glass-card panel-energy page-energy-card compact-energy-card">
                <div class="section-title"><h2><ha-icon icon="${src.icon}"></ha-icon> ${translate(src.key)}</h2></div>
                <div class="env-list compact-energy-list">
                  <div class="env-row"><div class="dot temp"><ha-icon icon="${src.icon}"></ha-icon></div><div class="muted">${translate(src.key)}</div><div class="env-value">${src.today} ${src.unit}</div></div>
                  <div class="env-row"><div class="dot hum"><ha-icon icon="mdi:compare-vertical"></ha-icon></div><div class="muted">${translate('compareYesterday')}</div><div class="env-value">${src.yesterday || '--'}</div></div>
                </div>
                <div class="bars compact-energy-bars">${bars}</div>
              </section>
            `;
          })}
          ${this.renderMaintenanceCard(language, translate)}
        </div>
      `
    );
  }

  // ─── Security page ──────────────────────────────────────

  private renderSecurityPage(language: Language, translate: (key: TranslationKey) => string): TemplateResult {
    const cards = this.renderSecurityCards(language);
    return this.renderPageShell(
      translate('security'),
      translate('securityOverview'),
      html``,
      cards !== nothing
        ? html`<div class="page-scroll themed-scrollbar"><div class="devices security-grid">${cards}</div></div>`
        : html`<div class="empty-state">${translate('offline')}</div>`
    );
  }

  // ─── Maintenance ────────────────────────────────────────

  private renderMaintenanceCard(language: Language, translate: (key: TranslationKey) => string): TemplateResult | typeof nothing {
    const items = this.getMaintenanceItemsInternal(language);
    if (items.length === 0) return nothing;

    return html`
      <section class="glass-card maintenance-card">
        <div class="maintenance-block">
          <div class="section-title maintenance-title"><h2>${translate('maintenance')}</h2></div>
          <div class="maintenance-list">
            ${items.slice(0, 5).map((item) => html`
              <div class="maintenance-item">
                <span class="maintenance-dot ${item.level}"></span>
                <span class="maintenance-name">${item.name}</span>
                <span class="maintenance-value">${String(item.battery)}%</span>
              </div>
            `)}
          </div>
        </div>
      </section>
    `;
  }

  private getMaintenanceItemsInternal(_language: Language): MaintenanceItem[] {
    return getMaintenanceItems(this._hass);
  }

  // ─── Home: shortcut devices ─────────────────────────────

  private renderShortcutDevices(language: Language): TemplateResult[] {
    const limit = this._config?.home_limits?.devices || 5;
    const selectedEntities = this._config?.home_selection?.devices || [];

    let realDevices: RenderedDevice[];

    if (selectedEntities.length > 0) {
      const colors: RenderedDevice['color'][] = ['yellow', 'green', 'blue', 'purple', 'red', 'brown'];
      realDevices = [];
      for (const entityId of selectedEntities) {
        const stateObj = this._hass?.states[entityId];
        if (!stateObj) continue;
        const domain = entityId.split('.')[0] || '';
        realDevices.push({
          entityId,
          name: String(stateObj.attributes?.friendly_name || entityId),
          subtitle: '',
          detail: domain,
          state: stateObj.state,
          icon: String(stateObj.attributes?.icon || ''),
          color: colors[realDevices.length % colors.length]!,
        });
      }
    } else {
      const allRealDevices = this.getRealDevicesForRender();
      realDevices = allRealDevices.slice(0, limit);
    }

    const skin = selectedSkin(this._config);

    return realDevices.map((device) => {
      const stateLabel = deviceStateLabel(device.state, language);
      const active = ['on', 'playing', 'cool', 'heat', 'armed', 'locked', 'open'].includes(device.state);
      const statusClass = active ? `device-on-${device.color}` : (device.state === 'unavailable' ? 'device-unavailable' : 'device-off');
      const assetKey = assetKeyForDomain(skin, device.entityId.split('.')[0] || 'sensor');
      const domain = device.entityId.split('.')[0] || '';
      const action = CONTROLLABLE_DOMAINS.has(domain) ? 'toggle' : 'more-info';
      return html`
        <button class="device ${statusClass}" @click=${() => this.handleAction(device.entityId, action)}>
          <div class="device-top">
            ${this.renderImage(assetKey, device.name, 'item-img')}
            <div class="tag-stack"><div class="status">${stateLabel}</div></div>
          </div>
          <div class="device-copy"><p class="device-name">${device.name}</p><p class="muted">${device.subtitle}</p></div>
          <div class="control-row"><span class="state-word">${device.detail}</span>${action === 'toggle' ? html`<span class="switch${active ? ' on' : ''}"></span>` : ''}</div>
        </button>
      `;
    });
  }

  // ─── Weather ────────────────────────────────────────────

  private renderWeather(weatherIconName: string): TemplateResult {
    const entityId = this._config?.weather?.entity || '';
    const condition = getWeatherDisplayText(this._hass, entityId);
    const temp = getWeatherTemperature(this._hass, entityId);

    if (!entityId) return html``;

    const allForecast = this._weatherForecast || [];
    const forecast = allForecast.slice(0, 5);
    const today = allForecast[0];
    const locale = this._hass?.locale?.language || this._hass?.language || 'en';
    const weekdayFmt: Intl.DateTimeFormatOptions = { weekday: 'short' };

    const todayHigh = today?.temperature != null ? `${Math.round(Number(today.temperature))}°` : '';
    const todayLow = today?.templow != null ? `${Math.round(Number(today.templow))}°` : '';
    const todayPrecip = today?.precipitation != null ? `${Math.round(Number(today.precipitation))}mm` : '';

    return html`
      <div class="weather-block" @click=${() => this.moreInfo(entityId)}>
        <div class="weather-current">
          <div class="weather-state-icon"><ha-icon icon="${weatherIconName}"></ha-icon></div>
          <div class="weather-current-info">
            <div class="weather-current-temp">${temp || '--'}${todayHigh && todayLow ? html` <span class="weather-current-hl">${todayHigh}/${todayLow}</span>` : ''}</div>
            <div class="weather-current-cond">${condition}${todayPrecip ? html` · ${todayPrecip}` : ''}</div>
          </div>
        </div>
        ${forecast.length > 0 ? html`
          <div class="weather-forecast">
            ${forecast.map((day) => {
              const dt = day.datetime ? new Date(day.datetime) : null;
              const dayLabel = dt ? dt.toLocaleDateString(locale, weekdayFmt) : '';
              const high = day.temperature != null ? `${Math.round(Number(day.temperature))}°` : '--';
              const low = day.templow != null ? `${Math.round(Number(day.templow))}°` : '';
              return html`
                <div class="forecast-day">
                  <div class="forecast-weekday">${dayLabel}</div>
                  <div class="forecast-icon"><ha-icon icon="${weatherIcon(day.condition || '')}"></ha-icon></div>
                  <div class="forecast-temps"><span class="forecast-high">${high}</span><span class="forecast-low">${low}</span></div>
                </div>
              `;
            })}
          </div>
        ` : nothing}
      </div>
    `;
  }

  // ─── Home: scenes ──────────────────────────────────────

  private renderHomeScenes(translate: (key: TranslationKey) => string): TemplateResult {
    const limit = this._config?.home_limits?.scenes || 6;
    const selectedScenes = this._config?.home_selection?.scenes || [];
    const scenes = this.renderRealScenes(limit, selectedScenes);
    if (scenes !== nothing) return scenes;
    return html`<div class="empty-state compact-empty">${translate('noScenes')}</div>`;
  }

  // ─── Home: rooms ────────────────────────────────────────

  private renderRooms(language: Language): TemplateResult | typeof nothing {
    const limit = this._config?.home_limits?.rooms || 4;
    const selectedRooms = this._config?.home_selection?.rooms || [];
    const areaRooms = this.renderAreaRooms(language, false, limit, selectedRooms);
    if (areaRooms !== nothing) return areaRooms;

    const rooms = this.getRoomsForRender();
    if (rooms.length === 0) return nothing;
    return html`${rooms.map((room) => {
      const imageKey = room.image || 'room_living';
      const info = room.info_entity ? stateValue(this._hass, room.info_entity, language) : '';
      const fallbackInfo = this._areas?.length ? this.areaFallbackInfo(room, language) : '--';
      const displayName = room.name || '--';
      return html`
        <button class="room" @click=${() => room.target ? this.navigatePath(room.target!) : undefined}>
          ${this.renderImage(imageKey, displayName, '')}
          <div class="room-label">
            <h3>${displayName}</h3>
            <p class="muted">${info || fallbackInfo || '--'}</p>
          </div>
        </button>
      `;
    })}`;
  }

  private getRoomsForRender(): RoomConfig[] {
    const configuredRooms = this._config?.rooms || [];
    const hasCustomRooms = configuredRooms.length > 0 && !this.isDefaultRooms(configuredRooms);
    if (hasCustomRooms) return configuredRooms;

    if (this._areas && this._areas.length > 0) {
      const images = ['room_living', 'room_bedroom', 'room_kitchen', 'room_garden'];
      return this._areas.map((area, index) => ({
        name: area.name,
        image: images[index % images.length],
      }));
    }

    return configuredRooms;
  }

  private isDefaultRooms(rooms: RoomConfig[]): boolean {
    if (rooms.length !== DEFAULT_ROOMS.length) return false;
    return rooms.every((room, index) => {
      const fallback = DEFAULT_ROOMS[index];
      return fallback && room.image === fallback.image && room.info_entity === fallback.info_entity;
    });
  }

  private areaFallbackInfo(_room: RoomConfig, language: Language): string {
    const area = this._areas?.find((entry) => entry.name === (_room.name || _room.name_zh || _room.name_en));
    if (!area) return 'Home Assistant Area';
    return this.areaSummaryById(area.area_id, language);
  }

  // ─── Area rooms ─────────────────────────────────────────

  private renderAreaRooms(language: Language, requireRealAreas: boolean, limit?: number, selectedRooms: string[] = [], showSummary = true): TemplateResult | typeof nothing {
    if (!this._areas || this._areas.length === 0) return nothing;

    const imageKeys = ['room_living', 'room_bedroom', 'room_kitchen', 'room_garden'];
    const filteredAreas = selectedRooms.length > 0
      ? selectedRooms
        .map((item) => {
          if (item.includes('.')) {
            const entry = this._entityRegistry?.find((e) => e.entity_id === item);
            if (entry?.area_id) return this._areas?.find((a) => a.area_id === entry.area_id);
            return undefined;
          }
          return this._areas?.find((a) => a.area_id === item) || this._areas?.find((a) => a.name === item);
        })
        .filter((area): area is AreaRegistryEntry => Boolean(area))
      : this._areas;
    const rooms = filteredAreas.slice(0, limit || filteredAreas.length).map((area, index) => ({
      areaId: area.area_id,
      name: area.name,
      image: imageKeys[index % imageKeys.length],
      picture: area.picture,
      summary: this.areaSummaryById(area.area_id, language),
      counts: this.areaCounts(area.area_id),
      scenes: this.areaScenes(area.area_id, area.name),
    }));

    if (requireRealAreas && rooms.length === 0) return nothing;

    const useAreaPics = this._config?.use_area_pictures;

    return html`${rooms.map((room) => {
      const imgSrc = useAreaPics && room.picture ? room.picture : assetUrl(this._config, room.image || 'room_living');
      const roomImg = imgSrc ? html`<img alt=${room.name} src=${imgSrc}>` : nothing;

      const sceneChips = room.scenes.length > 0 ? html`
        <div class="room-scenes">
          ${room.scenes.map((scene) => html`
            <button class="room-scene-chip" @click=${(e: Event) => { e.stopPropagation(); this.runScene(scene.entity_id); }}>
              ${scene.name}
            </button>
          `)}
        </div>
      ` : nothing;

      if (showSummary) {
        return html`
          <button class="room">
            ${roomImg}
            ${sceneChips}
            <div class="room-label">
              <h3>${room.name}</h3>
              <p class="muted">${room.summary}</p>
            </div>
          </button>
        `;
      }
      const countLabel = language === 'zh-CN'
        ? `${room.counts.devices} 设备 · ${room.counts.entities} 实体`
        : `${room.counts.devices} devices · ${room.counts.entities} entities`;
      return html`
        <button class="room">
          ${roomImg}
          ${sceneChips}
          <div class="room-label">
            <h3>${room.name}</h3>
            <p class="muted">${room.summary}</p>
            <p class="room-stats">${countLabel}</p>
          </div>
        </button>
      `;
    })}`;
  }

  // ─── Area helpers ───────────────────────────────────────

  private areaSummaryById(areaId: string, language: Language): string {
    if (!areaId) return 'Home Assistant Area';

    const areaDeviceIds = new Set(
      (this._deviceRegistry || [])
        .filter((d) => d.area_id === areaId && !d.disabled_by)
        .map((d) => d.id)
    );

    const entries = (this._entityRegistry || [])
      .filter((entry) => {
        if (entry.hidden_by || entry.disabled_by) return false;
        return entry.area_id === areaId || (entry.device_id && areaDeviceIds.has(entry.device_id));
      })
      .map((e) => e.entity_id);

    if (entries.length === 0) {
      return language === 'zh-CN' ? '暂无实体' : 'No entities';
    }

    const byClass = (cls: string) =>
      entries.find((eid) => this._hass?.states[eid]?.attributes?.device_class === cls);

    const parts: string[] = [];

    const presence = byClass('presence') || byClass('occupancy') || byClass('motion');
    if (presence) {
      const occupied = stateValue(this._hass, presence, language) === 'on';
      parts.push(language === 'zh-CN' ? (occupied ? '有人' : '无人') : (occupied ? 'Occupied' : 'Empty'));
    }

    const temp = byClass('temperature');
    if (temp) {
      parts.push(`${formatNumber(stateValue(this._hass, temp, language), 1)}°C`);
    }

    const hum = byClass('humidity');
    if (hum) {
      parts.push(`${formatNumber(stateValue(this._hass, hum, language), 0)}%`);
    }

    if (!temp) {
      const illum = byClass('illuminance');
      if (illum) {
        parts.push(`${formatNumber(stateValue(this._hass, illum, language), 0)}lx`);
      }
    }

    if (parts.length > 0) return parts.join(' · ');
    return language === 'zh-CN' ? `${entries.length} 个实体` : `${entries.length} entities`;
  }

  private areaCounts(areaId: string): { devices: number; entities: number } {
    if (!areaId) return { devices: 0, entities: 0 };

    const areaDevices = (this._deviceRegistry || [])
      .filter((d) => d.area_id === areaId && !d.disabled_by);
    const deviceIds = new Set(areaDevices.map((d) => d.id));

    const areaEntities = (this._entityRegistry || [])
      .filter((e) => {
        if (e.hidden_by || e.disabled_by) return false;
        return e.area_id === areaId || (e.device_id && deviceIds.has(e.device_id));
      });

    return { devices: deviceIds.size, entities: areaEntities.length };
  }

  private areaScenes(areaId: string, roomName?: string): Array<{ entity_id: string; name: string }> {
    if (!this._hass) return [];

    const found = new Set<string>();
    const result: Array<{ entity_id: string; name: string }> = [];

    if (areaId && this._entityRegistry && this._deviceRegistry) {
      const areaDeviceIds = new Set(
        this._deviceRegistry
          .filter((d) => d.area_id === areaId && !d.disabled_by)
          .map((d) => d.id)
      );

      for (const entry of this._entityRegistry) {
        if (entry.hidden_by || entry.disabled_by) continue;
        if (!entry.entity_id.startsWith('scene.')) continue;
        if (!(entry.area_id === areaId || (entry.device_id && areaDeviceIds.has(entry.device_id)))) continue;
        if (found.has(entry.entity_id)) continue;
        found.add(entry.entity_id);
        const state = this._hass.states[entry.entity_id];
        result.push({
          entity_id: entry.entity_id,
          name: String(state?.attributes?.friendly_name || entry.entity_id.split('.')[1] || entry.entity_id),
        });
        if (result.length >= 4) break;
      }
    }

    if (roomName && result.length < 4) {
      const roomLower = roomName.toLowerCase();

      for (const state of Object.values(this._hass.states)) {
        if (!state) continue;
        if (!state.entity_id.startsWith('scene.')) continue;
        if (found.has(state.entity_id)) continue;

        const sceneName = String(state.attributes?.friendly_name || state.entity_id.split('.')[1] || '');
        const sceneLower = sceneName.toLowerCase();
        const roomKey = roomLower.replace(/\s+/g, '_');

        if (sceneLower.includes(roomLower) || state.entity_id.toLowerCase().includes(roomKey)) {
          found.add(state.entity_id);
          result.push({ entity_id: state.entity_id, name: sceneName });
          if (result.length >= 4) break;
        }
      }
    }

    return result;
  }

  private areaNameForEntity(entityId: string): string {
    const entry = this._entityRegistry?.find((item) => item.entity_id === entityId);
    if (!entry) return '';
    const areaId = entry.area_id || this._deviceRegistry?.find((d) => d.id === entry.device_id)?.area_id || '';
    if (!areaId) return '';
    return this._areas?.find((area) => area.area_id === areaId)?.name || '';
  }

  // ─── Device list for render ─────────────────────────────

  private getRealDevicesForRender(ignoreFilter = false): RenderedDevice[] {
    if (!this._deviceRegistry || !this._entityRegistry || !this._hass) return [];

    const colors: RenderedDevice['color'][] = ['yellow', 'green', 'blue', 'purple', 'red', 'brown'];

    return this._deviceRegistry
      .filter((device) => !device.disabled_by)
      .map((device, index) => {
        const entities = this._entityRegistry
          ?.filter((entry) => entry.device_id === device.id && !entry.hidden_by && !entry.disabled_by)
          .map((entry) => entry.entity_id) || [];
        if (entities.length === 0) return undefined;

        const nonUpdateEntities = entities.filter((entityId) => !entityId.startsWith('update.') && !entityId.startsWith('device_tracker.'));
        if (nonUpdateEntities.length === 0) return undefined;
        const preferredEntity = nonUpdateEntities.find((entityId) => /^(light|switch|climate|media_player|lock|cover|fan)\./.test(entityId)) || nonUpdateEntities[0];
        if (!preferredEntity || !this._hass) return undefined;

        const stateObj = this._hass.states[preferredEntity];
        const state = stateObj?.state || 'unknown';
        const domain = preferredEntity.split('.')[0] || 'sensor';
        const icon = String(stateObj?.attributes?.icon || iconForDomain(domain));
        const name = String(stateObj?.attributes?.friendly_name || preferredEntity);
        const subtitle = this.areaNameForEntity(preferredEntity) || '';
        const detail = domain || '--';

        return {
          entityId: preferredEntity,
          name,
          subtitle,
          detail,
          state,
          icon,
          color: colors[index % colors.length]!,
        };
      })
      .filter((device): device is RenderedDevice => Boolean(device))
      .filter((d) => {
        if (ignoreFilter) return true;
        if (this._filterRoom && d.subtitle !== this._filterRoom) return false;
        if (this._filterType && d.detail !== this._filterType) return false;
        return true;
      });
  }

  private getDeviceRooms(): string[] {
    return [...new Set(this.getRealDevicesForRender(true).map((d) => d.subtitle).filter(Boolean))].sort();
  }

  private getDeviceTypes(): string[] {
    return [...new Set(this.getRealDevicesForRender(true).map((d) => d.detail))].sort();
  }

  private renderRealDeviceGroups(language: Language, translate: (key: TranslationKey) => string): TemplateResult | typeof nothing {
    const devices = this.getRealDevicesForRender();
    if (devices.length === 0) {
      return html`<div class="empty-state">${translate('noDevices')}</div>`;
    }

    const groups = new Map<string, RenderedDevice[]>();
    for (const device of devices) {
      const groupKey = this._deviceGrouping === 'domain' ? device.detail : (device.subtitle || (language === 'zh-CN' ? '其他' : 'Other'));
      const current = groups.get(groupKey) || [];
      current.push(device);
      groups.set(groupKey, current);
    }

    const skin = selectedSkin(this._config);

    return html`${Array.from(groups.entries()).map(([group, items]) => html`
      <section class="device-group">
        <div class="section-title"><h2>${group}</h2><p class="muted">${String(items.length)}</p></div>
        <div class="devices devices-page-grid">
          ${items.map((device) => {
            const stateLabel = deviceStateLabel(device.state, language);
            const active = ['on', 'playing', 'cool', 'heat', 'armed', 'locked', 'open'].includes(device.state);
            const statusClass = active ? `device-on-${device.color}` : (device.state === 'unavailable' ? 'device-unavailable' : 'device-off');
            const assetKey = assetKeyForDomain(skin, device.entityId.split('.')[0] || 'sensor');
            const canToggle = CONTROLLABLE_DOMAINS.has(device.detail);
            return html`
              <button class="device ${statusClass}" @click=${() => this.handleAction(device.entityId, canToggle ? 'toggle' : 'more-info')}>
                <div class="device-top">
                  ${this.renderImage(assetKey, device.name, 'item-img')}
                  <div class="tag-stack"><div class="status">${stateLabel}</div></div>
                </div>
                <div class="device-copy"><p class="device-name">${device.name}</p><p class="muted">${device.subtitle}</p></div>
                <div class="control-row"><span class="state-word">${device.detail}</span>${canToggle ? html`<span class="switch${active ? ' on' : ''}"></span>` : ''}</div>
              </button>
            `;
          })}
        </div>
      </section>
    `)}`;
  }

  // ─── Real scenes ────────────────────────────────────────

  private renderRealScenes(limit = 12, selectedScenes: string[] = []): TemplateResult | typeof nothing {
    if (!this._hass) return nothing;

    const scenes = Object.values(this._hass.states)
      .filter((entity): entity is HassEntity => Boolean(entity?.entity_id?.startsWith('scene.')))
      .filter((entity) => selectedScenes.length === 0 || selectedScenes.includes(entity.entity_id))
      .slice(0, limit);

    if (scenes.length === 0) return nothing;

    return html`${scenes.map((scene, index) => {
      const tones: Array<'morning' | 'night' | 'movie' | 'game'> = ['morning', 'night', 'movie', 'game'];
      const name = String(scene.attributes?.friendly_name || scene.entity_id);
      return html`
        <button class="scene ${tones[index % tones.length]}" @click=${() => this.runScene(scene.entity_id)}>
          <ha-icon icon="mdi:creation"></ha-icon>
          <strong>${name}</strong>
        </button>
      `;
    })}`;
  }

  // ─── Real automations ──────────────────────────────────

  private renderRealAutomations(language: Language): TemplateResult | typeof nothing {
    if (!this._hass) return nothing;

    const automations = Object.values(this._hass.states)
      .filter((entity): entity is HassEntity => Boolean(entity?.entity_id?.startsWith('automation.')));

    if (automations.length === 0) return nothing;

    return html`${automations.map((automation, index) => {
      const stateLabel = deviceStateLabel(automation.state, language);
      const active = automation.state === 'on';
      const tones: Array<'green' | 'blue' | 'purple' | 'yellow'> = ['green', 'blue', 'purple', 'yellow'];
      const statusClass = active ? `device-on-${tones[index % tones.length]}` : 'device-off';
      const lastTriggered = automation.attributes?.last_triggered
        ? String(automation.attributes.last_triggered)
        : (language === 'zh-CN' ? '未触发' : 'Not triggered');
      const skin = selectedSkin(this._config);
      const assetKey = assetKeyForDomain(skin, 'automation');

      return html`
        <button class="device ${statusClass}" @click=${() => this.handleAction(automation.entity_id, 'more-info')}>
          <div class="device-top">
            ${this.renderImage(assetKey, 'Automation', 'item-img')}
            <div class="tag-stack"><div class="status">${stateLabel}</div></div>
          </div>
          <div class="device-copy"><p class="device-name">${String(automation.attributes?.friendly_name || automation.entity_id)}</p><p class="muted">${lastTriggered}</p></div>
          <div class="control-row"><span class="state-word">${active ? (language === 'zh-CN' ? '已启用' : 'Enabled') : (language === 'zh-CN' ? '已停用' : 'Disabled')}</span><span class="switch${active ? ' on' : ''}"></span></div>
        </button>
      `;
    })}`;
  }

  // ─── Security ──────────────────────────────────────────

  private renderSecurityCards(language: Language): TemplateResult | typeof nothing {
    if (!this._hass) return nothing;

    const entities = Object.values(this._hass.states)
      .filter((entity): entity is HassEntity => Boolean(entity?.entity_id && /^(camera|lock|alarm_control_panel|binary_sensor)\./.test(entity.entity_id)))
      .filter((entity) => {
        if (entity.entity_id.startsWith('binary_sensor.')) {
          return /door|window|motion|contact|lock/i.test(entity.entity_id);
        }
        return true;
      })
      .slice(0, 12);

    if (entities.length === 0) return nothing;

    const cameras = entities.filter(e => e.entity_id.startsWith('camera.'));
    const others = entities.filter(e => !e.entity_id.startsWith('camera.'));

    const skin = selectedSkin(this._config);

    const cameraCards = cameras.map(entity => {
      const stateLabel = deviceStateLabel(entity.state, language);
      const stateObj = this._hass?.states?.[entity.entity_id];
      const entityPicture = String(stateObj?.attributes?.entity_picture || '');
      const accessToken = String(stateObj?.attributes?.access_token || '');
      const baseUrl = entityPicture
        || (accessToken
          ? `/api/camera_proxy/${entity.entity_id}?token=${encodeURIComponent(accessToken)}`
          : '');
      const sep = baseUrl.includes('?') ? '&' : '?';
      const snapshotUrl = baseUrl ? `${baseUrl}${sep}ts=${Date.now()}` : '';
      return html`
        <button class="camera-card" @click=${() => this.handleAction(entity.entity_id, 'more-info')}>
          <div class="camera-preview"><img alt=${String(entity.attributes?.friendly_name || entity.entity_id)} src=${snapshotUrl}></div>
          <div class="camera-meta">
            <div>
              <p class="device-name">${String(entity.attributes?.friendly_name || entity.entity_id)}</p>
              <p class="muted">${language === 'zh-CN' ? '实时快照' : 'Snapshot'}</p>
            </div>
            <div class="status">${stateLabel}</div>
          </div>
        </button>
      `;
    });

    const otherCards = others.map((entity, index) => {
      const stateLabel = deviceStateLabel(entity.state, language);
      const domain = entity.entity_id.split('.')[0] || 'sensor';
      const assetKey = assetKeyForDomain(skin, domain);
      const tones: RenderedDevice['color'][] = ['red', 'green', 'blue', 'purple', 'yellow', 'brown'];
      const statusClass = entity.state === 'unavailable' ? 'device-unavailable' : `device-on-${tones[index % tones.length]}`;
      return html`
        <button class="device ${statusClass}" @click=${() => this.handleAction(entity.entity_id, 'more-info')}>
          <div class="device-top">
            ${this.renderImage(assetKey, String(entity.attributes?.friendly_name || entity.entity_id), 'item-img')}
            <div class="tag-stack"><div class="status">${stateLabel}</div></div>
          </div>
          <div class="device-copy"><p class="device-name">${String(entity.attributes?.friendly_name || entity.entity_id)}</p><p class="muted">${domain}</p></div>
          <div class="control-row"><span class="state-word">${stateLabel}</span><span class="switch${['on', 'armed_away', 'armed_home', 'locked'].includes(entity.state) ? ' on' : ''}"></span></div>
        </button>
      `;
    });

    return html`
      ${cameraCards.length > 0 ? html`<div class="security-cameras">${cameraCards}</div>` : nothing}
      ${otherCards.length > 0 ? html`<div class="security-devices">${otherCards}</div>` : nothing}
    `;
  }

  // ─── Environment ────────────────────────────────────────

  private renderEnvironment(_language: Language): TemplateResult[] {
    const selectedMetrics = this._config?.home_selection?.environment || [];
    const configuredMetrics = this._config?.environment || [];
    const metrics = (selectedMetrics.length > 0
      ? selectedMetrics.map((entityId) => {
        const configured = configuredMetrics.find((metric) => metric.entity === entityId);
        if (configured) return configured;

        const state = this._hass?.states[entityId];
        const deviceClass = String(state?.attributes?.device_class || '').toLowerCase();
        const label = String(state?.attributes?.friendly_name || entityId);
        const unit = String(state?.attributes?.unit_of_measurement || '');
        const variant: EnvironmentMetricConfig['variant'] = deviceClass === 'temperature' ? 'temp' : (deviceClass === 'humidity' ? 'hum' : 'pm');
        const icon = variant === 'temp' ? 'mdi:thermometer' : (variant === 'hum' ? 'mdi:water-percent' : 'mdi:leaf');
        return { entity: entityId, label, unit, variant, icon };
      })
      : configuredMetrics).slice(0, this._config?.home_limits?.environment || 5);

    return metrics.map((metric) => html`
      <div class="env-row">
        <div class="dot ${metric.variant || 'temp'}"><ha-icon icon=${metric.icon || 'mdi:circle'}></ha-icon></div>
        <div class="muted">${this._hass?.states[metric.entity]?.attributes?.friendly_name || metric.label || metric.entity}</div>
        <div class="env-value">${stateValue(this._hass, metric.entity, _language) || '--'}${metric.unit || ''}</div>
      </div>
    `);
  }

  // ─── Energy bars ────────────────────────────────────────

  private renderBars(values: number[]): TemplateResult {
    if (!values.length) {
      return html`${Array.from({ length: 30 }, () => html`<span class="energy-bar energy-bar-level-0"></span>`)}`;
    }
    const max = Math.max(...values, 0.1);
    return html`${values.map((value) => {
      const level = value <= 0 ? 0 : Math.max(1, Math.min(10, Math.round((value / max) * 10)));
      return html`<span class="energy-bar energy-bar-level-${level}" title=${String(value)}></span>`;
    })}`;
  }

  // ─── Lifecycle actions ──────────────────────────────────

  protected updated(): void {
    this.applyThemeVariables();
    this.applyLayoutHeight();
    if (this._config?.fullscreen && !this._autoFullscreenDone) {
      this._autoFullscreenDone = true;
      const host = this.shadowRoot?.host as HTMLElement | undefined;
      if (host) {
        const h = Math.max(560, Math.floor(window.innerHeight));
        host.style.setProperty('--sp-runtime-height', `${h}px`);
        host.style.setProperty('--sp-runtime-min-height', `${h}px`);
      }
      toggleKiosk();
    }
  }

  private handleAction(entityId: string, action: string): void {
    if (action === 'toggle') {
      void this.toggleEntity(entityId);
    } else {
      this.moreInfo(entityId);
    }
  }

  private navigateTo(target: string): void {
    const valid: ViewName[] = ['home', 'devices', 'rooms', 'scenes', 'automations', 'security', 'energy'];
    if (valid.includes(target as ViewName)) {
      this._view = target as ViewName;
    }
  }

  private navigatePath(path: string): void {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new Event('location-changed'));
  }

  private async runScene(entityId: string): Promise<void> {
    await this._hass?.callService('scene', 'turn_on', { entity_id: entityId });
  }

  private async toggleEntity(entityId: string): Promise<void> {
    if (!this._hass) return;
    const [domain] = entityId.split('.');
    if (!domain) return;
    await this._hass.callService(domain, 'toggle', { entity_id: entityId });
  }

  private toggleKioskFullscreen(): void {
    const host = this.shadowRoot?.host as HTMLElement | undefined;
    if (document.body.classList.contains('skins-pro-kiosk')) {
      toggleKiosk();
      if (host) requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        const h = Math.max(560, Math.floor(window.innerHeight - r.top));
        host.style.setProperty('--sp-runtime-height', `${h}px`);
        host.style.setProperty('--sp-runtime-min-height', `${h}px`);
      });
    } else {
      if (host) {
        const h = Math.max(560, Math.floor(window.innerHeight));
        host.style.setProperty('--sp-runtime-height', `${h}px`);
        host.style.setProperty('--sp-runtime-min-height', `${h}px`);
      }
      toggleKiosk();
    }
  }

  private async batchControl(state: 'on' | 'off', translate: (key: TranslationKey) => string): Promise<void> {
    const devices = this.getRealDevicesForRender();
    const controllable = devices.filter((d) => CONTROLLABLE_DOMAINS.has(d.detail));
    if (controllable.length === 0) return;
    if (!confirm(translate('confirmAction'))) return;
    const service = state === 'on' ? 'turn_on' : 'turn_off';
    await Promise.all(controllable.map((d) => this._hass?.callService(d.detail, service, { entity_id: d.entityId })));
  }

  private moreInfo(entityId: string): void {
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId },
    }));
  }
}