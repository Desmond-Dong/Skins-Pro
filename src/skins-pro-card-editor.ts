import { SKINS } from './skins.generated';

type HassEntity = {
  entity_id: string;
  state: string;
  attributes?: Record<string, any>;
};

type HomeAssistant = {
  states: Record<string, HassEntity | undefined>;
  localize?: (key: string, ...args: any[]) => string;
  auth?: { data?: { access_token?: string } };
};

type DashboardConfig = Record<string, any>;

const fire = (el: HTMLElement, config: DashboardConfig) => {
  el.dispatchEvent(new CustomEvent('config-changed', {
    bubbles: true,
    composed: true,
    detail: { config },
  }));
};

const clone = (obj: any) => JSON.parse(JSON.stringify(obj));

const ENTITY_PICKER_TAG = 'ha-entity-picker';
const CONTROLLABLE_DOMAINS = ['light', 'switch', 'fan', 'cover', 'lock', 'climate', 'media_player', 'vacuum', 'humidifier', 'water_heater', 'valve', 'siren', 'automation', 'group', 'input_boolean'];

export class SkinsProCardEditor extends HTMLElement {
  private _config: DashboardConfig = { type: 'custom:skins-pro-card' };
  private _hass?: HomeAssistant;
  private _areas: Array<{area_id: string; name: string}> = [];
  private _areasLoaded = false;

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  public setConfig(config: DashboardConfig): void {
    const next = { type: 'custom:skins-pro-card', ...config };
    if (JSON.stringify(next) === JSON.stringify(this._config)) return;
    this._config = next;
    this.render();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this.shadowRoot) {
      this.shadowRoot.querySelectorAll(ENTITY_PICKER_TAG).forEach((el: any) => {
        el.hass = hass;
      });
    }
    this._loadAreas();
  }

  private async _loadAreas(): Promise<void> {
    if (this._areasLoaded || !this._hass) return;
    try {
      const conn = (this._hass as any).connection;
      if (!conn?.sendMessagePromise) return;
      const areas: Array<{area_id: string; name: string}> = await conn.sendMessagePromise({ type: 'config/area_registry/list' });
      if (Array.isArray(areas)) {
        this._areas = areas;
        this._areasLoaded = true;
        this.render();
      }
    } catch { /* area registry not available */ }
  }

  private themeCssUrl(): string {
    const skin = this._config.resource_pack?.skin || 'modern';
    try {
      return new URL(`${skin}/theme.css`, import.meta.url).toString();
    } catch {
      return `/local/community/skins-pro/${skin}/theme.css`;
    }
  }

  private setField(path: string, value: any): void {
    const next = clone(this._config);
    const parts = path.split('.');
    let cur: Record<string, any> = next;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const p = parts[i];
      if (!p) return;
      cur[p] = cur[p] || {};
      cur = cur[p] as Record<string, any>;
    }
    const last = parts[parts.length - 1];
    if (last) cur[last] = value;
    this._config = next;
    fire(this, this._config);
  }

  private setListItem(path: string, index: number, value: string): void {
    const next = clone(this._config);
    const parts = path.split('.');
    let cur: Record<string, any> = next;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const p = parts[i];
      if (!p) return;
      cur[p] = cur[p] || {};
      cur = cur[p] as Record<string, any>;
    }
    const last = parts[parts.length - 1];
    if (!last) return;
    const arr: string[] = cur[last] || [];
    if (value) {
      arr[index] = value;
      cur[last] = arr;
      this._config = next;
      fire(this, this._config);
      return;
    }
    arr.splice(index, 1);
    cur[last] = arr;
    this._config = next;
    fire(this, this._config);
    this.render();
  }

  private addListItem(path: string, max?: number): void {
    const next = clone(this._config);
    const parts = path.split('.');
    let cur: Record<string, any> = next;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const p = parts[i];
      if (!p) return;
      cur[p] = cur[p] || {};
      cur = cur[p] as Record<string, any>;
    }
    const last = parts[parts.length - 1];
    if (!last) return;
    const arr: string[] = cur[last] || [];
    if (max !== undefined && arr.length >= max) return;
    arr.push('');
    cur[last] = arr;
    this._config = next;
    fire(this, this._config);
    this.render();
  }

  private entityPicker(label: string, path: string, value: string, domains?: string[]): string {
    const filter = domains?.length ? ` include-domains='${JSON.stringify(domains)}'` : '';
    return `
      <label>
        <span>${label}</span>
        <${ENTITY_PICKER_TAG} data-path="${path}"${filter} .hass="${this._hass ? 'this._hass' : ''}" value="${value || ''}"></${ENTITY_PICKER_TAG}>
      </label>
    `;
  }

  private listPicker(label: string, path: string, values: string[], domains?: string[], max?: number): string {
    const filter = domains?.length ? ` include-domains='${JSON.stringify(domains)}'` : '';
    const arr = Array.isArray(values) ? values : [];
    const rows = (arr.length > 0 ? arr : ['']).map((val, i) => `
      <div class="selector-row">
        <${ENTITY_PICKER_TAG} data-list-path="${path}" data-list-index="${i}"${filter} value="${val || ''}"></${ENTITY_PICKER_TAG}>
        <button class="sp-del" data-del-path="${path}" data-del-index="${i}">✕</button>
      </div>
    `).join('');
    const addBtn = arr.length >= (max ?? Infinity) ? '' : `<button class="sp-add" data-add-path="${path}" data-add-max="${max ?? ''}">+</button>`;
    return `
      <label>
        <span>${label}</span>
        <div class="sp-list">${rows}</div>
        ${addBtn}
      </label>
    `;
  }

  private areaPicker(values: string[], max?: number): string {
    if (!this._areasLoaded || this._areas.length === 0) {
      return `<p class="muted">Loading areas...</p>`;
    }
    const arr = Array.isArray(values) ? values : [];
    const rows = (arr.length > 0 ? arr : ['']).map((val, i) => `
      <div class="selector-row">
        <select data-area-path="home_selection.rooms" data-area-index="${i}">
          <option value="">—</option>
          ${this._areas.map(a => `<option value="${a.area_id}"${a.area_id === val ? ' selected' : ''}>${a.name}</option>`).join('')}
        </select>
        <button class="sp-del" data-del-area-path="home_selection.rooms" data-del-area-index="${i}">✕</button>
      </div>
    `).join('');
    const addBtn = arr.length >= (max ?? Infinity) ? '' : `<button class="sp-add" data-add-area-path="home_selection.rooms" data-add-max="${max ?? ''}">+</button>`;
    return `
      <div class="sp-list">${rows}</div>
      ${addBtn}
    `;
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const c = this._config || {};
    const hs = c.home_selection || {};
    const hl = c.home_limits || {};

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${this.themeCssUrl()}">
      <div class="sp-wrap">
        <div class="sp-card">
          <h3>皮肤 / Skin</h3>
          <div class="sp-card-row">
            <label class="sp-field">
              <span>Skin</span>
              <select data-text-path="resource_pack.skin">
                ${SKINS.map((s: string) => `<option value="${s}"${s === (c.resource_pack?.skin || 'modern') ? ' selected' : ''}>${s}</option>`).join('')}
              </select>
            </label>
            ${this.entityPicker('Weather', 'weather.entity', c.weather?.entity || hs.weather_entity || '', ['weather'])}
            ${this.entityPicker('信息展示 / Info', 'info.entity', c.info?.entity || '', ['input_text', 'sensor'])}
            <label class="sp-field">
              <span>全屏</span>
              <input type="checkbox" data-path="fullscreen"${c.fullscreen ? ' checked' : ''}>
            </label>
          </div>
        </div>

        <div class="sp-card">
          <h3>能源 / Energy</h3>
          ${this.entityPicker('Energy Entity', 'energy.entity', c.energy?.entity || hs.energy_entity || '', ['sensor'])}
        </div>

        <div class="sp-row">
          <div class="sp-card">
            <h3>首页设备 / Home Devices</h3>
            ${this.listPicker('Devices', 'home_selection.devices', hs.devices || [], CONTROLLABLE_DOMAINS, hl.devices || 5)}
          </div>
          <div class="sp-card">
            <h3>首页房间 / Home Rooms</h3>
            ${this.areaPicker(hs.rooms || [], hl.rooms || 4)}
          </div>
        </div>

        <div class="sp-row">
          <div class="sp-card">
            <h3>首页场景 / Home Scenes</h3>
            ${this.listPicker('Scenes', 'home_selection.scenes', hs.scenes || [], ['scene'], hl.scenes || 6)}
          </div>
          <div class="sp-card">
            <h3>首页环境 / Home Environment</h3>
            ${this.listPicker('Environment', 'home_selection.environment', hs.environment || [], ['sensor'], hl.environment || 5)}
          </div>
        </div>
      </div>
    `;

    // Wire entity pickers
    this.shadowRoot.querySelectorAll(ENTITY_PICKER_TAG).forEach((el: any) => {
      if (this._hass) el.hass = this._hass;
      el.addEventListener('value-changed', (ev: CustomEvent) => {
        const path = el.dataset.path || el.dataset.listPath;
        if (!path) return;
        if (el.dataset.listIndex !== undefined) {
          this.setListItem(path, Number(el.dataset.listIndex), ev.detail.value);
        } else {
          this.setField(path, ev.detail.value);
        }
      });
    });

    // Wire area selects
    this.shadowRoot.querySelectorAll<HTMLSelectElement>('select[data-area-path]').forEach((el) => {
      el.addEventListener('change', () => {
        const path = el.dataset.areaPath;
        if (!path || el.dataset.areaIndex === undefined) return;
        this.setListItem(path, Number(el.dataset.areaIndex), el.value);
      });
    });

    // Text inputs - skip re-render for selects to avoid closing the dropdown
    this.shadowRoot.querySelectorAll<HTMLInputElement>('input[data-text-path], select[data-text-path]').forEach((el) => {
      el.addEventListener('change', () => {
        const path = el.dataset.textPath || '';
        const value: any = el.value;
        if (path === 'resource_pack.skin') {
          const next = clone(this._config);
          next.resource_pack = next.resource_pack || {};
          next.resource_pack.skin = value;
          next.resource_pack.base_path = '__AUTO__';
          this._config = next;
          fire(this, this._config);
          return;
        }
        this.setField(path, value);
      });
    });

    // Checkbox inputs
    this.shadowRoot.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-path]').forEach((el) => {
      el.addEventListener('change', () => {
        this.setField(el.dataset.path || '', el.checked);
      });
    });

    // Add/Remove list items (entity picker lists)
    this.shadowRoot.querySelectorAll<HTMLElement>('[data-add-path]').forEach((btn) => {
      btn.addEventListener('click', () => this.addListItem(btn.dataset.addPath || '', Number(btn.dataset.addMax) || undefined));
    });
    this.shadowRoot.querySelectorAll<HTMLElement>('[data-del-path]').forEach((btn) => {
      btn.addEventListener('click', () => this.setListItem(btn.dataset.delPath || '', Number(btn.dataset.delIndex), ''));
    });

    // Add/Remove area rows
    this.shadowRoot.querySelectorAll<HTMLElement>('[data-add-area-path]').forEach((btn) => {
      btn.addEventListener('click', () => this.addListItem(btn.dataset.addAreaPath || '', Number(btn.dataset.addMax) || undefined));
    });
    this.shadowRoot.querySelectorAll<HTMLElement>('[data-del-area-path]').forEach((btn) => {
      btn.addEventListener('click', () => this.setListItem(btn.dataset.delAreaPath || '', Number(btn.dataset.delAreaIndex), ''));
    });
  }
}

if (!customElements.get('skins-pro-card-editor')) {
  customElements.define('skins-pro-card-editor', SkinsProCardEditor);
}
