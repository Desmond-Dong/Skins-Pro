# Skins Pro

[![Open your Home Assistant instance and add this repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Desmond-Dong&repository=Skins-Pro&category=plugin)

给你的 Home Assistant 换上 Minecraft 风格的主页吧！

Skins Pro 是一款社区仪表盘卡片，把整个界面变成了 MC 风格的启动器。自带中英文双语，还支持换皮肤——装上就能用，不用折腾。

- 从 Community dashboards 直接添加，开箱即用
- 内置两套皮肤（默认 & Minecraft），也可以自己换
- 首次添加会自动帮你匹配家里的设备
- HACS 安装一次搞定

## Credits

- [dwains-dashboard-next](https://github.com/dwainscheeren/dwains-dashboard-next) — 架构灵感来源
- [html-card-pro Discussions](https://github.com/ha-china/html-card-pro/discussions/11) — 最初的皮肤素材和视觉设计

## 安装

[![Open your Home Assistant instance and add this repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Desmond-Dong&repository=Skins-Pro&category=plugin)

点上面的按钮一键添加，或者手动操作：

1. HACS → 自定义仓库 → 添加 `https://github.com/Desmond-Dong/Skins-Pro`，类型选 Dashboard
2. 安装 Skins Pro
3. 刷新 Home Assistant 前端
4. 设置 → 仪表盘 → 添加仪表盘 → 选 Skins Pro

## 功能

添加后会自动创建一个带 Skins Pro 卡片的仪表盘，内置以下板块：

- ☀️ 天气
- 💬 语录展示
- 📱 快捷设备控制
- 🚪 房间快照
- 🎬 场景按钮
- ⚡ 今日用电
- 🌐 中英文自动切换

首次添加时会自动扫描你的 Home Assistant，尽量匹配已有的实体。如果匹配得不够准，直接在卡片编辑界面改就行。

## 换皮肤

内置了两套皮肤（default / minecraft），装完就能切换。你也可以换成自己的素材。

## 语言

支持跟随系统语言或手动切换中/英文。每个标签都可以分别配中文和英文。

## 说明

- 这个项目是从 [dwains-dashboard-next](https://github.com/dwainscheeren/dwains-dashboard-next) 重写的独立分支。
- 没有运行时依赖，保持精简。
