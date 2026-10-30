<div align="center">

# 3D-global-Orbitails · 瑠璃色の地球

### 让数据流动，让全球业务连接可见。

**面向数字孪生、数据可视化与可视化大屏的 Three.js 交互式 3D 地球组件工程。**

Vue 3 + Vite · React 19 + Vite + TypeScript

[English](README.md) · [快速开始](#快速开始) · [接入指南](docs/INTEGRATION.md) · [参与贡献](CONTRIBUTING.md)

[![3D-global-Orbitails 1080p 功能展示 GIF](docs/media/orbitails-showcase-1080p.gif)](docs/media/orbitails-showcase-1080p60.mp4)

**[观看 / 下载 1080p · 60fps 演示视频](docs/media/orbitails-showcase-1080p60.mp4)** · [录制与剪辑说明](docs/media/README.md)

</div>

## 从一组经纬度，到一个有生命力的全球视图

当你的业务分布在不同城市、国家和地区，一张表能告诉你“在哪里”，一个交互式地球则能让人直观看见“如何连接”。

3D-global-Orbitails 将地球贴图、大气辉光、全球节点、飞线、陆海运输路径、标签、柱状图和粒子效果组合成一套可运行、可阅读、可扩展的前端工程。它适合作为数字孪生平台的全球总览、物流调度中心的核心视图，也适合作为指挥中心、数据驾驶舱和展厅大屏的空间展示组件。

**你可以直接选择 Vue 或 React 版本，替换演示数据，接入自己的业务页面。** 当前交付形式是源码组件工程，尚未发布独立 npm 包；实时数据后台、业务告警和建筑级孪生需要由应用接入。

## 实际运行效果

新增 **35 秒、1920×1080 / 60fps MP4 演示视频**，紧凑展示鼠标锚点缩放、柱状图与路线图层、四套主题、地表模式、粒子密度、中英文切换、节点 / 国家聚焦、拖拽，以及 React / Vue 两个版本。README 中的 **1080p GIF** 将同一演示压缩为约 21 秒、10fps 循环播放；完整画质请观看 MP4。

**原始录屏已保留**：`media/recordings/orbitails-master-take02-1080p60.mkv`，52 秒、1080p / 60fps。原片体积较大，仅在本地保留并排除 Git；精剪 MP4、GIF、字幕与复现步骤位于 [`docs/media/`](docs/media/)。

以下图片均为仓库中程序在浏览器中的真实运行截图，分辨率为 1920 × 1080。

| React · 白天地表 | React · 夜间灯光 |
| :---: | :---: |
| ![React 白天地球](docs/images/react-day.png) | ![React 夜间地球](docs/images/react-night.png) |

![Vue 版本运行截图](docs/images/vue-day.png)

地球影像来源：NASA。图中的指标为合成数据，航线用于视觉演示。

## 为什么选择 3D-global-Orbitails

- **贴合数字孪生与大屏表达。** 围绕全球节点和业务连接组织视觉层次，用于设施分布、跨区域运营和运输网络展示。
- **Vue / React 双版本。** Vue 3 单文件组件与 React 19 + TypeScript 分别实现，便于按团队技术栈选择和二次开发。
- **多图层按需组合。** 世界边界、散点、标签、柱状图、飞线、陆运线、海航线分别控制。
- **有方向感的平滑缩放。** 滚轮控制距离的同时，镜头向鼠标指向的地表区域轻微转入，搭配阻尼与聚焦动画。
- **航线具有地理语境。** 大圆飞线与基于本地陆地掩膜的海运避陆规划；海运路径是近似可视化结果。
- **适配大屏视觉风格。** 四套主题、自定义主色、白天 / 夜间 / 网格地表，以及可调节的星群和粒子光环。
- **无需地图 API Key。** 地球贴图与地理数据随项目打包，本地场景运行不依赖付费地图接口或在线影像 CDN。
- **便于二次开发的架构。** 场景编排、图层、相机、数据服务、球面数学与资源生命周期分离。

## 适合哪些场景

| 应用方向 | 可用方式 |
| --- | --- |
| 数字孪生平台 | 展示全球站点、工厂、设施及其连接 |
| 智慧物流 / 供应链大屏 | 组合航空、陆运、海运与港口节点 |
| IoT / 运维驾驶舱 | 展示设备站点、区域指标和业务分布 |
| 指挥中心 / 数据可视化大屏 | 作为全屏地理场景，组合自己的图表与业务面板 |
| 科技展厅 / 项目展示 | 使用主题、镜头和粒子效果组织演示 |

## 两个版本如何选择

| 项目 | Vue 版本 | React 版本 |
| --- | --- | --- |
| 目录 | [`globe-3d-map-vue`](globe-3d-map-vue/) | [`globe-3d-map-react`](globe-3d-map-react/) |
| 页面层 | Vue 3 单文件组件 | React 19 组件与 Hooks |
| 3D 核心 | 以 JavaScript 为主，UI / 配置部分使用 TS | TypeScript |
| 构建 | Vite | Vite |
| 测试 | Node test runner | Vitest |
| 页面入口 | `src/views/globe/GlobeView.vue` | `src/app/GlobePage.tsx` |

两个版本都包含地球场景、路线、主题、贴图、节点交互和语言切换，采用独立依赖和构建流程，并非同一个 npm 包的两层封装。部分界面布局与异常提示的实现不同。界面提供英文与中文控制，默认英文。

## 快速开始

准备 **Node.js 22.12+**、npm 与启用 WebGL 的浏览器。

```bash
git clone https://github.com/Xie-Fantasy/3D-global-Orbitails.git
cd 3D-global-Orbitails
```

启动 React 版本：

```bash
cd globe-3d-map-react
npm ci
npm run dev
```

或者从仓库根目录启动 Vue 版本：

```bash
cd globe-3d-map-vue
npm ci
npm run dev
```

打开 Vite 输出的本地地址。安装与运行命令都在所选版本目录执行，根目录没有 npm workspace。

在对应目录构建与预览：

```bash
npm run build
npm run preview
```

构建结果位于各自的 `dist/`。部署到子路径时需要设置 Vite `base`；Vue 额外提供 `/three-3d-globe` 路由，静态服务器需要设置 SPA 回退。

## 接入自己的业务

1. 替换 `src/globe/data/` 下的节点、航空路线和运输路线数据。
2. 在 `src/globe/config/` 调整主题、镜头和质量配置。
3. 将页面组件放入自己的大屏布局，或用 `GlobeWorld` 在独立容器挂载场景。
4. 通过业务适配层接入数据源和信息面板。

坐标统一使用 **`[经度, 纬度]`**，单位为度。节点与路线需要稳定的 `id`，路线端点引用节点 ID。

详见 [接入指南](docs/INTEGRATION.md)，包含 React 类型示例、数据结构、控制 API 和销毁约定。当前没有开箱即用的流式增量更新接口。

## 验证与已知范围

两个版本均可在各自目录运行：

```bash
npm test
npm run typecheck
npm run build
```

React 另提供 `npm run lint`。首次发布核验中，Vue 35 项单元测试、React 23 项单元测试通过；这些测试不能代替完整浏览器验收或业务生产验证。帧率取决于硬件、分辨率和数据规模，不承诺所有设备都达到固定 FPS。

项目当前聚焦全球尺度的展示：国界使用低分辨率 Natural Earth 数据，不用于权威边界认定；演示指标和陆海路线不代表真实运营记录；不内置地形引擎、建筑级孪生或导航服务。

后续可贡献的方向包括独立组件包、业务数据适配、时间轴回放、移动对象、标签聚合，以及双版本界面一致性改进。这些方向尚未全部实现。

## 一起完善它

欢迎通过 [Issues](https://github.com/Xie-Fantasy/3D-global-Orbitails/issues) 分享数字孪生、可视化大屏和物流展示中的使用需求。清晰的复现步骤、场景截图、性能记录和接入案例，都能帮助项目变得更好。提交 PR 前请阅读 [贡献指南](CONTRIBUTING.md)。

如果 3D-global-Orbitails 帮你节省了搭建地球场景的时间，欢迎点一个 Star，让更多做可视化的开发者发现它。

## 许可证与致谢

项目代码采用 [MIT License](LICENSE)，允许在保留版权与许可声明的条件下使用、修改和商用。第三方资源遵循各自条款，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。

感谢 Three.js、GSAP、Vue、React、Vite、d3-geo、TopoJSON、world-atlas，以及 NASA Blue Marble / Black Marble 地球影像。项目不代表 NASA 背书。
