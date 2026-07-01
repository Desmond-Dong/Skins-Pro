# Skins Pro — **Next-Gen Home Assistant Dashboard**

**Next-Gen Home Assistant Dashboard** — Multi-skin, immersive, plug-and-play.  
**下一代 Home Assistant 仪表盘**——多皮肤、沉浸式、开箱即用。

Skins Pro is a community Lovelace card with a multi-skin architecture featuring **modern**, **AEON**, **AEON_glass**, **visionOS**, and **minecraft** skins. Bilingual (CN/EN) — install from HACS and it just works.  
Skins Pro 是一款社区 Lovelace 卡片，采用多皮肤架构，内置 **modern**、**AEON**、**AEON_glass**、**visionOS** 和 **minecraft** 五套精美皮肤，自带中英文双语，从 HACS 安装后无需配置即可使用。

- Add via HACS custom repository<br>从 HACS 自定义仓库添加
- Switch between skins freely<br>多皮肤自由切换
- Fullscreen Kiosk mode for immersive experience<br>全屏 Kiosk 模式，沉浸式体验
- Auto image processing on build (resize, JPG convert)<br>构建时自动处理图片（缩放、转 JPG）
- Area-based room display<br>按房间区域展示设备
- Auto icon matching by entity domain<br>设备自动按 domain 匹配对应图标

> Note<br>说明<br>All current theme image assets are AI-generated, so some images may contain AI watermarks or similar generation artifacts.<br>当前所有主题图片资源均由 AI 生成，因此部分图片中可能会出现 AI 水印或类似生成痕迹。

## Philosophy / 设计理念

Keep it simple, keep it easy.  

Skins Pro is built around simplicity and ease of use. Install from HACS, pick a skin, adjust a few settings in the card editor, and you're done. Every feature is designed to be intuitive, so you can focus on enjoying your smart home.

保持简单，保持易用。

Skins Pro 的设计围绕简单和易用展开。从 HACS 安装，选择皮肤，在卡片编辑器里调整几个设置，就可以开始使用。每个功能都力求直观，让你专注于享受智能家居。

## Installation / 安装

[![Open your Home Assistant instance and add this repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=ha-china&repository=Skins-Pro&category=plugin)

Click the button above, or manually:  
点上面的按钮一键添加，或者手动操作：

1. HACS → Custom Repositories → Add `https://github.com/ha-china/Skins-Pro`, category: Dashboard
2. Install Skins Pro<br>安装 Skins Pro
3. Refresh Home Assistant frontend<br>刷新 Home Assistant 前端
4. Settings → Dashboards → Add Dashboard → Select "Skins Pro"<br>设置 → 仪表盘 → 添加新仪表盘 → 选 "Skins Pro"

## Built-in Skins / 内置皮肤

| Skin<br>皮肤 | Style<br>风格 | Features<br>特点 |
|---|---|---|
| **modern**（default<br>默认） | White glassmorphism<br>白色玻璃 | Frosted glass, high-res images, clean blue-white palette<br>毛玻璃效果，高分辨率图片，温润蓝白配色 |
| **AEON** | Dark luxury<br>暗色奢华 | Deep blacks, blue glow, glassmorphism, cinematic shadows<br>深邃黑底，蓝色辉光，毛玻璃卡片，影院级阴影 |
| **visionOS** | Frosted glass<br>毛玻璃 | Apple VisionOS-inspired, flat glass, white text, immersive blur<br>Apple VisionOS 灵感，纯平玻璃，白色文字，沉浸式模糊 |
| **minecraft** | Minecraft theme<br>Minecraft 主题 | Dark textured background, warm tones, Steve avatar<br>深色纹理背景，暖色调，Steve 头像 |

Switch via the "Skin" field in the card editor.<br>在卡片编辑器的「皮肤 / Skin」字段切换。

## Preview / 预览

| modern | AEON | visionOS | minecraft |
|---|---|---|---|---|
| ![modern](screenshots/modern.png) | ![AEON](screenshots/AEON.png) | ![visionOS](screenshots/visionOS.png) | ![minecraft](screenshots/minecraft.png) |

![Advanced Feature](screenshots/advanced_feature.png)

### Skin Switching Demo / 皮肤切换演示

<video src="https://github.com/ha-china/Skins-Pro/raw/master/screenshots/skin.mp4" controls width="100%" preload="metadata"></video>
[⬇ Download MP4](screenshots/skin.mp4)

## Features / 功能

- ☀️ Weather & greeting<br>天气与问候
- 💬 Info display<br>信息展示
- 📱 Device controls (by area or by type)<br>设备控制面板（按房间或按类型）
- 🚪 Room snapshots<br>房间快照
- 🎬 Scene buttons<br>场景按钮
- ⚡ Energy usage today (with vs yesterday)<br>今日用电（含昨日对比）
- 🛡️ Security page (cameras, locks, arming)<br>安全页面（摄像头、门锁、布撤防）
- 🌐 Auto CN/EN language switching<br>中英文自动切换
- ↔️ Kiosk mode<br>全屏 Kiosk 模式
- 🖼️ Use HA area pictures as room backgrounds<br>使用 HA 区域图片作为房间背景

On first add, it automatically scans your Home Assistant and organizes content by area and device type.  
首次添加时会自动扫描你的 Home Assistant，按区域和设备类型组织页面。

## Skin Development / 皮肤开发

A skin is a folder under `skins-pro/<skin-name>/` containing images, CSS, and strings. `npm run build` auto-discovers, processes images, and generates code.  
皮肤是一个文件夹放在 `skins-pro/<皮肤名>/` 下，包含图片、CSS 和文本配置。`npm run build` 会自动发现、处理图片并生成代码。

### Directory Structure / 目录结构

```
skins-pro/
  your-skin-name/
    theme.css               # Styles (required)<br>样式（必须）
    strings.json            # Strings + icon_map (optional)<br>皮肤文本 + icon_map（可选）
    avatar.jpg              # Avatar, recommended ≥ 300×300<br>头像，建议 ≥ 300×300
    background.jpg          # Background, recommended width ≥ 2560px<br>主区域背景，建议宽 ≥ 2560px
    decoration.jpg          # Side decoration, recommended width ≥ 800px<br>侧边装饰图，建议宽 ≥ 800px
    base-texture.jpg        # Base texture, recommended width ≥ 2560px<br>背景纹理，建议宽 ≥ 2560px
    stage-*.jpg             # Stage image, recommended width ≥ 2560px<br>阶段/过渡图，建议宽 ≥ 2560px
    room-*.jpg              # Room image, recommended width ≥ 1200px<br>房间图，建议宽 ≥ 1200px
    icon-*.jpg              # Device icon, recommended longest edge ≥ 300px<br>设备图标，建议最长边 ≥ 300px
```

### Image Processing on Build / 构建时图片处理

| Pattern<br>文件名 | Recommended source<br>建议源尺寸 | Notes<br>说明 |
|---|---|---|
| `room-*` | width ≥ 1200px<br>宽 ≥ 1200px | Maintain ratio, downscale to 1200px<br>保持比例，缩放至 1200px |
| `icon-*` | longest edge ≥ 300px<br>最长边 ≥ 300px | Maintain ratio, downscale to 300px<br>保持比例，缩放至 300px |
| `avatar.*` | longest edge ≥ 300px<br>最长边 ≥ 300px | Maintain ratio, downscale to 300px<br>保持比例，缩放至 300px |
| `decoration.*` | width ≥ 800px<br>宽 ≥ 800px | Maintain ratio, downscale to 800px<br>保持比例，缩放至 800px |
| `background.*`, `base-*`, `stage-*` | width ≥ 2560px<br>宽 ≥ 2560px | Maintain ratio, downscale to 2560px<br>保持比例，缩放至 2560px |
| others<br>其他 | width ≥ 1200px<br>宽 ≥ 1200px | Maintain ratio, downscale to 1200px<br>保持比例，缩放至 1200px |

Supports PNG / JPG / BMP / WebP input, outputs JPG. Never upscales.<br>源文件支持 PNG / JPG / BMP / WebP，一律输出 JPG，不大于原图。

### theme.css

All styles are customized via CSS variables on `:host`. Each skin has its own `theme.css`. See `skins-pro/modern/theme.css` for the full variable list.<br>所有样式通过 `:host` 上的 CSS 变量自定义。每个皮肤独立的 `theme.css` 文件。参考 `skins-pro/modern/theme.css` 查看所有变量。

### strings.json + icon_map

```json
{
  "title_zh": "欢迎回来！",
  "title_en": "Welcome back!",
  "icon_map": {
    "light": "light",
    "switch": "switch",
    "climate": "climate",
    "media_player": "speaker",
    "lock": "lock"
  }
}
```

Maps entity domains to icon image filenames. Unmapped domains fall back automatically.<br>`icon_map` 定义实体域→图标图片的映射，未覆盖的域自动 fallback。

> **Best reference / 最佳参考** — Use [`skins-pro/visionOS/`](skins-pro/visionOS/) as the starting point when creating a new skin. It has the most complete `icon_map`, `theme.css`, and icon assets.<br>创建新皮肤时请以 [`skins-pro/visionOS/`](skins-pro/visionOS/) 为起点，它拥有最完整的 `icon_map`、`theme.css` 和图标资源。

## Development / 开发

```bash
git clone https://github.com/ha-china/Skins-Pro.git
cd Skins-Pro
npm install
npm run build       # Build<br>构建
npm run watch       # Watch mode<br>开发模式自动构建
npm run type-check  # Type check<br>TypeScript 类型检查
```

Build output: `dist/`<br>构建产物在 `dist/`：

- `dist/skins-pro.js` — Core JS bundle<br>核心 JS
- `dist/<skin-name>/` — Per-skin assets and CSS<br>各皮肤素材和 CSS

### Testing in HA / 在 HA 中测试

1. `npm run build`
2. Copy `dist/` to HA's `www/community/skins-pro/`<br>将 `dist/` 复制到 HA 的 `www/community/skins-pro/`
3. Hard refresh (Ctrl+Shift+R)<br>硬刷新浏览器（Ctrl+Shift+R）

## Contributing a Skin / 贡献主题

We welcome skin contributions! Requirements:  
欢迎提交你的皮肤到 Skins Pro！需满足以下要求：

1. Create a folder under `skins-pro/<skin-name>/`<br>在 `skins-pro/<皮肤名>/` 下创建皮肤目录
2. Provide `theme.css` (all styles via CSS variables)<br>提供 `theme.css`（全部样式通过 CSS 变量定义）
3. Provide `strings.json` with greeting text and `icon_map`<br>提供 `strings.json`（含标题、问候语、`icon_map`）
4. Provide at least avatar, background, and decoration images<br>提供至少 `avatar.jpg`、`background.jpg`、`decoration.jpg` 三张图片
5. Add a `<skin-name>.png` screenshot in `screenshots/` (.png, 1920×1080 recommended)<br>在 `screenshots/` 添加一张 <皮肤名>.png 预览图（.png, 1920×1080 为宜）
6. Submit a PR to this repo<br>PR 提交到本仓库

Images are auto-processed on build — no manual optimization needed.<br>构建时会自动处理图片，无需手动压缩。

## Credits / 致谢

- Architecture inspired by [dwains-dashboard-next](https://github.com/dwainscheeren/dwains-dashboard-next)<br>架构启发自 dwains-dashboard-next
- Design inspired by [html-card-pro Discussions](https://github.com/ha-china/html-card-pro/discussions/11)<br>设计启发自 html-card-pro
- Kiosk mode inspired by [kiosk-mode](https://github.com/NemesisRE/kiosk-mode)<br>全屏模式启发自 kiosk-mode
- Core rendering by [Lit](https://lit.dev/)<br>核心渲染框架 Lit
- Image processing by [sharp](https://sharp.pixelplumbing.com/)<br>图片处理 sharp
- Zero runtime dependencies, lean and fast<br>零运行时依赖，保持精简
