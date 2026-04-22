# NASA-Punk: Observatory

> 基于 flowersauce/NASA-Punk_Observatory 的改进版本

![Offline Ready](https://img.shields.io/badge/Offline-Ready-success?style=flat-square&logo=rss)
![WebGL](https://img.shields.io/badge/Render-WebGL-blueviolet?style=flat-square&logo=webgl)
![Three.js](https://img.shields.io/badge/Core-Three.js-black?style=flat-square&logo=three.js)
![Procedural](https://img.shields.io/badge/Assets-Procedural_Generation-orange?style=flat-square&logo=codio)
![Textureless](https://img.shields.io/badge/Resources-Textureless-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

## 项目简介

本项目为 `ZZY-STACK` 版本的 `NASA-Punk: Observatory`，基于开源项目 `flowersauce/NASA-Punk_Observatory` 深度改造与优化。

原项目的 NASA-Punk 风格与 WebGL 可视化框架为基础，本版本重点增强了“数据映射与星球粒子细化”的表现，侧重中国航天各类真实数据与星球粒子生成的可视化表达。

## 主要改进点

- 基于中国航天数据构建星球粒子可视化：每个星球均采用对应数据映射粒子数量与视觉表现。  
- 地球粒子细化升级至百万级：地球表面粒子数提升到百万级，表现更细腻、视觉更真实。  
- 星球轮廓与结构细致度增强：各星球的边缘、光晕、环带和卫星布置都经过定制优化。  
- 初始化延迟与异步生成：通过延迟启动与分批生成提升加载体验，避免一次性渲染卡顿。  
- 过渡动画与闪屏优化：优化页面切换逻辑，修复过渡白屏/闪屏问题，使导航更平滑。  
- 现代 NASA 风格配色：为过渡层与 UI 调整配色，兼顾视觉统一性与识别度。  

## 项目特点

- 纯静态网站：`HTML + CSS + JavaScript`，无需构建工具即可预览。  
- WebGL 渲染：使用 `Three.js` 承载星球与粒子效果。  
- 程序化粒子与地形：基于 `simplex-noise` 生成背景、光效、星球表面与粒子分布。  
- 支持单页面与多入口：可从 `index.html` 进入系统，也可直接打开每个星球对应页面。  
- 适合本地展示与静态发布：可用于个人主页演示、GitHub Pages 或动态壁纸展示。  

## 运行方式

### 方式一：直接浏览器打开

直接用现代浏览器打开根目录下的 `index.html`。如果只想查看单个星球，可直接打开 `earth.html`、`mars.html`、`saturn.html` 等页面。

### 方式二：本地服务器预览

- Python 3：
  ```bash
  python -m http.server 8000
  ```
- Node.js：
  ```bash
  npx serve .
  ```
然后在浏览器中打开 `http://localhost:8000`。

### 方式三：GitHub Pages

将仓库推送到 GitHub 后，可直接启用 GitHub Pages，选择 `main` 或 `root` 目录即可发布静态站点。

## 目录结构

```text
NASA-Punk_Observatory/
├─ index.html                # 首页入口
├─ earth.html ... sun.html   # 各星球页面
├─ styles/                   # 样式文件
├─ scripts/                  # 共享脚本、页面逻辑与数据映射
├─ docs/                     # 维护与说明文档
├─ LICENSE                  # MIT 许可证
├─ readme.md                # 本说明文档
└─ README.en.md             # 英文说明
```

## 数据可视化说明

本项目将中国航天数据与星球视觉结合：

- 火星：以天问一号科学数据量驱动粒子数与场景变化。  
- 木星：以深空探测累计里程映射粒子规模与视觉效果。  
- 土星：以探月采样数据驱动星环粒子分布。  
- 天王星 / 海王星：以航天器数与产业规模映射星云、粒子与轨道。  
- 太阳 / 水星 / 金星 / 地球：根据对应主题数据定制粒子生成规则和视觉节奏。

## 视觉与性能优化

- 地球粒子达到百万级别，表现更加细腻、粒子层次更丰富。  
- 采用延迟加载与异步生成策略，避免首屏渲染卡顿。  
- 修复页面切换闪屏，保证过渡顺滑。  
- 保留原始 NASA-Punk 风格，同时增强中国航天数据视觉表达。  

## 致谢与许可

本项目基于 `flowersauce/NASA-Punk_Observatory` 开源项目改造，并在此基础上添加大量可视化与交互优化。  

- 原项目作者：`flowersauce`  
- 本项目作者：`ZZY-STACK`  

许可证：本项目使用 MIT 许可证，详见 [LICENSE](LICENSE)。如果你使用或修改本项目，请保留原作者和本项目作者声明。

---

如果希望，我还可以继续帮你补一个 `README.en.md` 的中文翻译版本。