# Skins Pro — **下一代 Home Assistant 仪表盘**

[English Version](README.md)

**下一代 Home Assistant 仪表盘**——多皮肤、沉浸式、开箱即用。

Skins Pro 是一款社区 Lovelace 卡片，采用多皮肤架构，内置 **modern**、**AEON**、**AEON_glass**、**visionOS** 和 **minecraft** 五套精美皮肤，自带中英文双语，从 HACS 安装后无需配置即可使用。

- 从 HACS 自定义仓库添加
- 多皮肤自由切换
- 全屏 Kiosk 模式，沉浸式体验
- 构建时自动处理图片（缩放、转 JPG）
- 按房间区域展示设备
- 设备自动按 domain 匹配对应图标

> 说明 — 当前所有主题图片资源均由 AI 生成，因此部分图片中可能会出现 AI 水印或类似生成痕迹。

## 设计理念

保持简单，保持易用。

Skins Pro 的设计围绕简单和易用展开。从 HACS 安装，选择皮肤，在卡片编辑器里调整几个设置，就可以开始使用。每个功能都力求直观，让你专注于享受智能家居。

## 安装

[![Open your Home Assistant instance and add this repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=ha-china&repository=Skins-Pro&category=plugin)

点上面的按钮一键添加，或者手动操作：

1. HACS → Custom Repositories → Add `https://github.com/ha-china/Skins-Pro`, category: Dashboard
2. 安装 Skins Pro
3. 刷新 Home Assistant 前端
4. 设置 → 仪表盘 → 添加新仪表盘 → 选 "Skins Pro"

![New Dashboard](screenshots/add_dashboard.png)

![Settings](screenshots/settings.png)

## 内置皮肤

| 皮肤 | 风格 | 特点 |
|---|---|---|
| **modern**（默认） | 白色玻璃 | 毛玻璃效果，高分辨率图片，温润蓝白配色 |
| **AEON** | 暗色奢华 | 深邃黑底，蓝色辉光，毛玻璃卡片，影院级阴影 |
| **visionOS** | 毛玻璃 | Apple VisionOS 灵感，纯平玻璃，白色文字，沉浸式模糊 |
| **minecraft** | Minecraft 主题 | 深色纹理背景，暖色调，Steve 头像 |

在卡片编辑器的「皮肤 / Skin」字段切换。

## 预览

| modern | AEON | visionOS | minecraft |
|---|---|---|---|
| ![modern](screenshots/modern.png) | ![AEON](screenshots/AEON.png) | ![visionOS](screenshots/visionOS.png) | ![minecraft](screenshots/minecraft.png) |

![Advanced Feature](screenshots/Advanced_Feature.png)

### 皮肤切换演示

<video src="https://github.com/ha-china/Skins-Pro/raw/master/screenshots/skin.mp4" controls width="100%" preload="metadata"></video>
[⬇ Download MP4](screenshots/skin.mp4)

## 功能

- ☀️ 天气与问候
- 💬 信息展示
- 📱 设备控制面板（按房间或按类型）
- 🚪 房间快照
- 🎬 场景按钮
- 🤖 自动化页面
- ⚡ 能源面板（含昨日对比）
- 🛡️ 安全页面 — 摄像头、门锁、安防面板（自动检测，点击可布撤防）
- 🎵 媒体播放器卡片 — 专辑封面、播放控制、音量条
- 📷 首页摄像头实时快照
- 🌡️ 环境传感器展示
- 🌐 中英文双语自动切换
- ↔️ 全屏 Kiosk 模式
- 🖼️ 使用 HA 区域图片作为房间背景
- 🎨 自定义背景图片上传
- 📱 移动端自适应布局
- 🎭 多皮肤架构 — 5 款内置皮肤

首次添加时会自动扫描你的 Home Assistant，按区域和设备类型组织页面。

## 皮肤开发

皮肤是一个文件夹放在 `skins-pro/<皮肤名>/` 下，包含图片、CSS 和文本配置。`npm run build` 会自动发现、处理图片并生成代码。

### 目录结构

```
skins-pro/
  your-skin-name/
    theme.css               # 样式（必须）
    strings.json            # 皮肤文本 + icon_map（可选）
    avatar.jpg              # 头像，建议 ≥ 300×300
    background.jpg          # 主区域背景，建议宽 ≥ 2560px
    decoration.jpg          # 侧边装饰图，建议宽 ≥ 800px
    base-texture.jpg        # 背景纹理，建议宽 ≥ 2560px
    stage-*.jpg             # 阶段/过渡图，建议宽 ≥ 2560px
    room-*.jpg              # 房间图，建议宽 ≥ 1200px
    icon-*.jpg              # 设备图标，建议最长边 ≥ 300px
```

### 构建时图片处理

| 文件名 | 建议源尺寸 | 说明 |
|---|---|---|
| `room-*` | 宽 ≥ 1200px | 保持比例，缩放至 1200px |
| `icon-*` | 最长边 ≥ 300px | 保持比例，缩放至 300px |
| `avatar.*` | 最长边 ≥ 300px | 保持比例，缩放至 300px |
| `decoration.*` | 宽 ≥ 800px | 保持比例，缩放至 800px |
| `background.*`, `base-*`, `stage-*` | 宽 ≥ 2560px | 保持比例，缩放至 2560px |
| 其他 | 宽 ≥ 1200px | 保持比例，缩放至 1200px |

源文件支持 PNG / JPG / BMP / WebP，一律输出 JPG，不大于原图。

### theme.css

所有样式通过 `:host` 上的 CSS 变量自定义。每个皮肤独立的 `theme.css` 文件。参考 `skins-pro/modern/theme.css` 查看所有变量。

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

`icon_map` 定义实体域→图标图片的映射，未覆盖的域自动 fallback。

> **最佳参考** — 创建新皮肤时请以 [`skins-pro/visionOS/`](skins-pro/visionOS/) 为起点，它拥有最完整的 `icon_map`、`theme.css` 和图标资源。

## 开发

```bash
git clone https://github.com/ha-china/Skins-Pro.git
cd Skins-Pro
npm install
npm run build       # 构建
npm run watch       # 开发模式自动构建
npm run type-check  # TypeScript 类型检查
```

构建产物在 `dist/`：

- `dist/skins-pro.js` — 核心 JS
- `dist/<skin-name>/` — 各皮肤素材和 CSS

### 在 HA 中测试

1. `npm run build`
2. 将 `dist/` 复制到 HA 的 `www/community/skins-pro/`
3. 硬刷新浏览器（Ctrl+Shift+R）

## 贡献主题

欢迎提交你的皮肤到 Skins Pro！需满足以下要求：

1. 在 `skins-pro/<皮肤名>/` 下创建皮肤目录
2. 提供 `theme.css`（全部样式通过 CSS 变量定义）
3. 提供 `strings.json`（含标题、问候语、`icon_map`）
4. 提供至少 `avatar.jpg`、`background.jpg`、`decoration.jpg` 三张图片
5. 在 `screenshots/` 添加一张 <皮肤名>.png 预览图（.png, 1920×1080 为宜）
6. PR 提交到本仓库

构建时会自动处理图片，无需手动压缩。

## 致谢

- 架构启发自 [dwains-dashboard-next](https://github.com/dwainscheeren/dwains-dashboard-next)
- 设计启发自 [html-card-pro Discussions](https://github.com/ha-china/html-card-pro/discussions/11)
- 全屏模式启发自 [kiosk-mode](https://github.com/NemesisRE/kiosk-mode)
- 核心渲染框架 Lit
- 图片处理 sharp
- 零运行时依赖，保持精简