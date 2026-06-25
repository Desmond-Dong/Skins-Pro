# Skins Pro

Skins Pro is a simplified Home Assistant Community Dashboard plugin, forked and rebuilt from [dwains-dashboard-next](https://github.com/dwainscheeren/dwains-dashboard-next).

It keeps the convenient "Add dashboard" flow from Community dashboards, but removes the old complex strategy system, blueprint management, editor dialogs, and extra frontend features. The new focus is a single Minecraft-style dashboard experience with:

- direct add from Home Assistant Community dashboards
- no runtime dependencies
- Chinese and English support
- replaceable resource packs for visuals and style
- automated GitHub Actions build and release pipeline
- all assets bundled in `dist/` for one-click HACS installation

## Credits

- **Original Project**: [dwains-dashboard-next](https://github.com/dwainscheeren/dwains-dashboard-next) — this project is a simplified rewrite that takes inspiration from its architecture and removes the complex legacy subsystems.
- **Initial Assets & Design**: [html-card-pro Discussions](https://github.com/ha-china/html-card-pro/discussions/11) — the initial Minecraft-style skin assets and visual design concept were sourced from this community showcase.

## What Changed from the Original

- Removed complex dashboard generation logic
- Removed blueprint, replacement, settings, and editor subsystems
- Replaced the old architecture with one minimal dashboard strategy
- Replaced the old UI with a skin-switchable dashboard card
- Added bilingual text handling: Chinese and English
- Added resource pack support through asset path and theme tokens

## Installation

1. Open HACS in Home Assistant.
2. Add this repository as a custom repository.
3. Select the repository type `Dashboard`.
4. Install `Skins Pro`.
5. Reload Home Assistant frontend resources if prompted.
6. Go to `Settings -> Dashboards -> Add dashboard`.
7. Select `Skins Pro` from Community dashboards.

## Default Behavior

After adding the dashboard, it creates one dashboard view with one custom card:

```yaml
type: custom:skins-pro-card
```

The card contains built-in defaults for:

- weather
- quote
- device shortcuts
- room snapshots
- scene buttons
- energy block
- bilingual labels

When the dashboard is added from Community dashboards, the strategy now tries to auto-detect common Home Assistant entities and writes a usable default card config for you.

If the mapping is not ideal, you can open the card editor in the UI and adjust it there without editing YAML.

If your entity IDs match the defaults closely, it works with minimal editing. If not, you can edit the card config in the dashboard UI and remap the entities.

## Resource Packs

Resource packs let you change the visual style without changing code.

By default, the repository ships with bundled skins under:

```text
/hacsfiles/<repository>/skins-pro/{skin}/
```

The auto-detection logic resolves assets from `import.meta.url`, so in most cases you do not need to set `resource_pack.base_path` manually. After installation via HACS, the path resolves automatically.

You can still use `resource_pack.base_path` to point to your own asset directory, and optionally override file names in `resource_pack.assets` or CSS tokens in `resource_pack.theme`.

Bundled skins:

```text
skins-pro/
  default/
    base-texture.jpg
    stage-background.jpg
    avatar-steve.jpg
    decor-wolf-lantern.jpg
    icon-light.jpg
    icon-ac.jpg
    icon-speaker.jpg
    icon-lock.jpg
    icon-garden-light.jpg
    room-living.jpg
    room-bedroom.jpg
    room-kitchen.jpg
    room-garden.jpg
    theme.css
  minecraft/
    base-texture.jpg
    stage-background.jpg
    avatar-steve.jpg
    decor-wolf-lantern.jpg
    icon-light.jpg
    icon-ac.jpg
    icon-speaker.jpg
    icon-lock.jpg
    icon-garden-light.jpg
    room-living.jpg
    room-bedroom.jpg
    room-kitchen.jpg
    room-garden.jpg
    theme.css
```

Example card config:

```yaml
type: custom:skins-pro-card
language: auto
resource_pack:
  base_path: __AUTO__
  theme:
    --mc-sidebar-width: 190px
    --mc-app-padding: 18px
    --mc-stage-radius: 32px
    --mc-glass-bg: rgba(32,14,3,.92)
    --mc-panel-bg: rgba(245,240,230,.95)
devices:
  - entity: light.living_room_lights
    name_zh: 客厅灯光
    name_en: Living lights
    area_zh: 客厅
    area_en: Living room
    image: light
    action: toggle
    color: yellow
  - entity: climate.living_room_ac
    name_zh: 空调
    name_en: Air conditioner
    area_zh: 客厅
    area_en: Living room
    image: climate
    action: more-info
    color: blue
    temperature_entity: sensor.living_room_temperature
rooms:
  - name_zh: 客厅
    name_en: Living room
    image: room_living
    info_entity: sensor.living_room_summary
    target: /lovelace/living-room
scenes:
  - entity: scene.good_night
    name_zh: 晚安
    name_en: Night
    subtitle_zh: 晚安场景
    subtitle_en: Good night
    icon: mdi:weather-night
    tone: night
    confirm: true
```

## Language

Set `language` to one of these values:

- `auto`: follow Home Assistant language
- `zh-CN`: force Chinese
- `en`: force English

For most labels, you can define both `*_zh` and `*_en` fields.

## No-YAML Workflow

The intended flow is now:

1. Add `Skins Pro` from Community dashboards.
2. Let the built-in strategy auto-detect common entities.
3. If needed, open the card editor and fix weather, quote, energy, and resource pack path visually.

You do not need to manually paste a full Lovelace YAML template anymore.

## Community Dashboard Strategy

This project still registers itself as a dashboard strategy so it can be added directly from Community dashboards.

Registered strategy types:

- `skins-pro`

Registered card types:

- `skins-pro-card`

## Development

```bash
npm install
npm run type-check
npm run build
```

Build output:

```text
dist/skins-pro.js
```

## Notes

- This project is a complete rewrite and fork of [dwains-dashboard-next](https://github.com/dwainscheeren/dwains-dashboard-next). It has its own independent Git history and release cycle.
- The project no longer depends on `lit`, `memoize-one`, or other runtime packages.
- The current implementation is intentionally minimal and opinionated.
- If needed, more visual packs can be added later without bringing back the old complex settings architecture.
