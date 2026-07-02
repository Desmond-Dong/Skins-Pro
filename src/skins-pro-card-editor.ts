import { SKINS } from './skins.generated';
import { STRINGS } from './i18n.generated';
import type { AreaRegistryEntry, HomeAssistant, TranslationKey, NavItemConfig } from './types';
import { DEFAULT_NAV } from './constants';
import { normalizeLanguage } from './utils';

type DashboardConfigRecord = Record<string, any>;

const fire = (el: HTMLElement, config: DashboardConfigRecord) => {
  el.dispatchEvent(new CustomEvent('config-changed', {
    bubbles: true,
    composed: true,
    detail: { config },
  }));
};

const deepClone = <T,>(obj: T): T => {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj)) as T;
  }
};

const ENTITY_PICKER_TAG = 'ha-entity-picker';
const CONTROLLABLE_DOMAINS = ['light', 'switch', 'fan', 'cover', 'lock', 'climate', 'media_player', 'vacuum', 'humidifier', 'water_heater', 'valve', 'siren', 'automation', 'group', 'input_boolean'];

export class SkinsProCardEditor extends HTMLElement {
  private _config: DashboardConfigRecord = { type: 'custom:skins-pro-card' };
  private _hass?: HomeAssistant;
  private _areas: AreaRegistryEntry[] = [];
  private _areasLoaded = false;
  private _navDialogOpen = false;

  public constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  public setConfig(config: DashboardConfigRecord): void {
    const next = { type: 'custom:skins-pro-card', ...config };
    if (JSON.stringify(next) === JSON.stringify(this._config)) return;
    this._config = next;
    this.render();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this.shadowRoot) {
      this.shadowRoot.querySelectorAll(ENTITY_PICKER_TAG).forEach((el: any) => {
        if (el) el.hass = hass;
      });
    }
    void this._loadAreas();
  }

  private async _loadAreas(): Promise<void> {
    if (this._areasLoaded || !this._hass) return;
    try {
      const conn = (this._hass as any).connection;
      if (!conn?.sendMessagePromise) return;
      const areas: AreaRegistryEntry[] = await conn.sendMessagePromise({ type: 'config/area_registry/list' });
      if (Array.isArray(areas)) {
        this._areas = areas;
        this._areasLoaded = true;
        this.render();
      }
    } catch { /* area registry not available */ }
  }

  private _loc(key: TranslationKey): string {
    const lang = normalizeLanguage(this._hass?.language);
    return STRINGS[lang][key];
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
    const next = deepClone(this._config);
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
    this.render();
  }

  private setListItem(path: string, index: number, value: string): void {
    const next = deepClone(this._config);
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
    const next = deepClone(this._config);
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
        <${ENTITY_PICKER_TAG} data-path="${path}"${filter} value="${value || ''}"></${ENTITY_PICKER_TAG}>
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

  private _navItemChecked(key: string): boolean {
    const navItems: NavItemConfig[] = this._config?.nav ?? [];
    const item = navItems.find(n => n.key === key);
    return item ? item.enabled !== false : true;
  }

  private _renderNavDialog(): string {
    const lang = normalizeLanguage(this._hass?.language);
    return `
      <div class="nav-overlay" data-nav-overlay>
        <div class="nav-dialog">
          <h3>${this._loc('editorNavigation')}</h3>
          ${DEFAULT_NAV.map(item => `
            <label class="nav-dialog-item">
              <span>${STRINGS[lang][(item.key || 'home') as TranslationKey] || item.key}</span>
              <input type="checkbox" data-nav-key="${item.key}" ${this._navItemChecked(item.key || '') ? 'checked' : ''}>
            </label>
          `).join('')}
          <div class="nav-dialog-actions">
            <button class="nav-cancel" data-nav-cancel>Cancel</button>
            <button class="nav-save" data-nav-save>Save</button>
          </div>
        </div>
      </div>
    `;
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const c = this._config || {};
    const hs = c.home_selection || {};
    const hl = c.home_limits || {};

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${this.themeCssUrl()}">
      <style>.bg-preview{max-width:120px;max-height:60px;border-radius:6px;display:block;flex-shrink:0}.sp-card input[type=checkbox]{width:auto;min-height:auto;margin:0}.sp-card label:has(input[type=checkbox]){display:flex;align-items:center;gap:8px}.sp-btn-configure{cursor:pointer}.nav-overlay{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.5);display:${this._navDialogOpen ? 'flex' : 'none'};align-items:center;justify-content:center}.nav-dialog{background:var(--sp-card-bg,var(--sp-panel-bg,var(--glass-regular,var(--ha-card-background,#fff))));border-radius:var(--sp-radius-lg);padding:var(--sp-space-xl);min-width:280px;max-width:380px;box-shadow:var(--sp-shadow-card);border:var(--sp-border-width,1px) solid var(--sp-border-device,var(--sp-border-glass,var(--divider-color,rgba(0,0,0,0.12))));backdrop-filter:var(--sp-blur-lg,none);-webkit-backdrop-filter:var(--sp-blur-lg,none)}.nav-dialog h3{margin:0 0 var(--sp-space-md);font-size:var(--sp-font-md);font-weight:700;color:var(--sp-text-main,var(--sp-text-primary,inherit))}.nav-dialog-item{display:flex;align-items:center;gap:var(--sp-space-sm);padding:var(--sp-space-2xs) 0}.nav-dialog-item span{font-size:var(--sp-font-xs);color:var(--sp-text-main,var(--sp-text-primary,inherit))}.nav-dialog-item input[type=checkbox]{width:auto;min-height:auto;margin:0;margin-left:auto;accent-color:var(--sp-accent)}.nav-dialog-actions{display:flex;gap:var(--sp-space-sm);justify-content:flex-end;margin-top:var(--sp-space-lg)}.nav-dialog-actions button{min-height:38px;border:0;border-radius:var(--sp-radius-sm,8px);padding:0 var(--sp-space-lg);cursor:pointer;font:inherit;font-weight:600;font-size:var(--sp-font-xs);white-space:nowrap}.nav-dialog-actions .nav-cancel{background:var(--sp-device-bg,rgba(128,128,128,0.1));color:var(--sp-text-main,var(--sp-text-primary,inherit));border:var(--sp-border-width,1px) solid var(--sp-border-muted,var(--sp-border-glass,transparent))}.nav-dialog-actions .nav-cancel:hover{filter:brightness(0.96)}.nav-dialog-actions .nav-save{background:var(--sp-accent);color:var(--sp-text-on-accent,#fff)}.nav-dialog-actions .nav-save:hover{filter:brightness(1.08)}</style>
      <div class="sp-wrap">
        <div class="sp-card">
          <h3>${this._loc('editorSkin')}</h3>
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
            <label class="sp-field" style="flex:1;min-width:140px">
              <span>Skin</span>
              <select data-text-path="resource_pack.skin">
                ${(SKINS as readonly string[]).map((s: string) => `<option value="${s}"${s === (c.resource_pack?.skin || 'modern') ? ' selected' : ''}>${s}</option>`).join('')}
              </select>
            </label>
            <label class="sp-field" style="min-width:120px;display:grid;justify-items:center;align-content:center">
              <span>${this._loc('editorUseAreaPictures')}</span>
              <input type="checkbox" data-path="use_area_pictures"${c.use_area_pictures ? ' checked' : ''} style="width:18px;height:18px;margin:0">
            </label>
            <label class="sp-field" style="min-width:80px;display:grid;justify-items:center;align-content:center">
              <span>${this._loc('editorFullscreen')}</span>
              <input type="checkbox" data-path="fullscreen"${c.fullscreen ? ' checked' : ''} style="width:18px;height:18px;margin:0">
            </label>
          </div>
          <div class="sp-row" style="grid-template-columns:1fr 1fr;gap:12px">
            <label class="sp-field">
              <span>Background</span>
              <div style="display:flex;flex-wrap:nowrap;align-items:center;gap:8px">
                <input type="file" accept="image/*" data-bg-upload style="flex:1;min-width:0">
                ${c.background_image ? `<img class="bg-preview" src="${c.background_image}"><button class="sp-del" data-bg-clear>✕</button>` : ''}
                ${!c.background_image ? '' : ''}
              </div>
            </label>
            <label class="sp-field">
              <span>${this._loc('editorNavigation')}</span>
              <button class="sp-btn-configure" data-nav-configure>${this._loc('editorNavigationConfigure')}</button>
            </label>
          </div>
        </div>

        <div class="sp-row">
          <div class="sp-card">${this.entityPicker('Weather', 'weather.entity', c.weather?.entity || hs.weather_entity || '', ['weather'])}</div>
          <div class="sp-card">${this.entityPicker(this._loc('editorInfo'), 'info.entity', c.info?.entity || '', ['input_text', 'sensor'])}</div>
        </div>

        <div class="sp-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="sp-card">
            <h3>${this._loc('editorEnergy')}</h3>
            ${this.entityPicker('Energy Entity', 'energy.entity', c.energy?.entity || hs.energy_entity || '', ['sensor'])}
          </div>
          <div class="sp-card">
            <h3>${this._loc('editorMediaPlayer')}</h3>
            ${this.entityPicker('Media Player', 'media_player.entity', c.media_player?.entity || '', ['media_player'])}
          </div>
          <div class="sp-card">
            <h3>${this._loc('editorCamera')}</h3>
            ${this.entityPicker('Camera', 'camera.entity', c.camera?.entity || '', ['camera'])}
          </div>
        </div>

        <div class="sp-row">
          <div class="sp-card">
            <h3>${this._loc('editorHomeDevices')}</h3>
            ${this.listPicker('Devices', 'home_selection.devices', hs.devices || [], CONTROLLABLE_DOMAINS, hl.devices || 5)}
          </div>
          <div class="sp-card">
            <h3>${this._loc('editorHomeRooms')}</h3>
            ${this.areaPicker(hs.rooms || [], hl.rooms || 4)}
          </div>
        </div>

        <div class="sp-row">
          <div class="sp-card">
            <h3>${this._loc('editorHomeScenes')}</h3>
            ${this.listPicker('Scenes', 'home_selection.scenes', hs.scenes || [], ['scene'], hl.scenes || 6)}
          </div>
          <div class="sp-card">
            <h3>${this._loc('editorHomeEnv')}</h3>
            ${this.listPicker('Environment', 'home_selection.environment', hs.environment || [], ['sensor'], hl.environment || 5)}
          </div>
        </div>

        ${this._renderNavDialog()}
      </div>
    `;

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

    this.shadowRoot.querySelectorAll<HTMLSelectElement>('select[data-area-path]').forEach((el) => {
      el.addEventListener('change', () => {
        const path = el.dataset.areaPath;
        if (!path || el.dataset.areaIndex === undefined) return;
        this.setListItem(path, Number(el.dataset.areaIndex), el.value);
      });
    });

    this.shadowRoot.querySelectorAll<HTMLInputElement>('input[data-text-path], select[data-text-path]').forEach((el) => {
      el.addEventListener('change', () => {
        const path = el.getAttribute('data-text-path') || '';
        const value: any = el.value;
        if (path === 'resource_pack.skin') {
          const next = deepClone(this._config);
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

    this.shadowRoot.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-path]').forEach((el) => {
      el.addEventListener('change', () => {
        this.setField(el.getAttribute('data-path') || '', el.checked);
      });
    });

    this.shadowRoot.querySelectorAll<HTMLElement>('[data-add-path]').forEach((btn) => {
      btn.addEventListener('click', () => this.addListItem(btn.getAttribute('data-add-path') || '', Number(btn.getAttribute('data-add-max')) || undefined));
    });
    this.shadowRoot.querySelectorAll<HTMLElement>('[data-del-path]').forEach((btn) => {
      btn.addEventListener('click', () => this.setListItem(btn.getAttribute('data-del-path') || '', Number(btn.getAttribute('data-del-index')), ''));
    });

    this.shadowRoot.querySelectorAll<HTMLElement>('[data-add-area-path]').forEach((btn) => {
      btn.addEventListener('click', () => this.addListItem(btn.getAttribute('data-add-area-path') || '', Number(btn.getAttribute('data-add-max')) || undefined));
    });
    this.shadowRoot.querySelectorAll<HTMLElement>('[data-del-area-path]').forEach((btn) => {
      btn.addEventListener('click', () => this.setListItem(btn.getAttribute('data-del-area-path') || '', Number(btn.getAttribute('data-del-area-index')), ''));
    });

    const uploadInput = this.shadowRoot.querySelector<HTMLInputElement>('input[data-bg-upload]');
    if (uploadInput) {
      uploadInput.addEventListener('change', async () => {
        const file = uploadInput.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
          const resp = await fetch('/api/image/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this._hass?.auth?.data?.access_token || ''}` },
            body: formData,
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const item = await resp.json();
          if (item?.id) {
            this.setField('background_image', `/api/image/serve/${item.id}/original`);
            return;
          }
          throw new Error('No id in response');
        } catch {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            if (dataUrl) this.setField('background_image', dataUrl);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const clearBtn = this.shadowRoot.querySelector<HTMLElement>('[data-bg-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.setField('background_image', ''));
    }

    const configureBtn = this.shadowRoot.querySelector<HTMLElement>('[data-nav-configure]');
    if (configureBtn) {
      configureBtn.addEventListener('click', () => {
        this._navDialogOpen = true;
        this.render();
      });
    }

    const overlay = this.shadowRoot.querySelector<HTMLElement>('[data-nav-overlay]');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this._navDialogOpen = false;
          this.render();
        }
      });
    }

    const cancelBtn = this.shadowRoot.querySelector<HTMLElement>('[data-nav-cancel]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this._navDialogOpen = false;
        this.render();
      });
    }

    const saveBtn = this.shadowRoot.querySelector<HTMLElement>('[data-nav-save]');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const checkboxes = this.shadowRoot?.querySelectorAll<HTMLInputElement>('[data-nav-key]');
        if (!checkboxes) return;
        const existingNav: NavItemConfig[] = this._config?.nav ?? [];
        const dialogNav: NavItemConfig[] = [];
        let allEnabled = true;
        checkboxes.forEach(cb => {
          const key = cb.getAttribute('data-nav-key') || '';
          const checked = cb.checked;
          if (!checked) allEnabled = false;
          const existingItem = existingNav.find(n => n.key === key);
          const defaultItem = DEFAULT_NAV.find(d => d.key === key);
          dialogNav.push({ key, icon: existingItem?.icon || defaultItem?.icon, ...(checked ? {} : { enabled: false }) });
        });
        const customNav = existingNav.filter(n => !DEFAULT_NAV.some(d => d.key === n.key));
        const mergedNav = [...dialogNav, ...customNav];
        if (allEnabled && customNav.length === 0) {
          this.setField('nav', undefined);
        } else {
          this.setField('nav', mergedNav);
        }
        this._navDialogOpen = false;
      });
    }
  }
}

if (!customElements.get('skins-pro-card-editor')) {
  customElements.define('skins-pro-card-editor', SkinsProCardEditor);
}