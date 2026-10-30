# AGENTS.md

## 1. 文档目的

本文件约束本仓库后续由开发者或自动化代理执行的设计、编码、测试与交付行为。本仓库是独立的 3D 地球项目；相邻目录 `../china-3d-map1` 仅作为已授权的代码与素材参考源，不在其中继续叠加地球功能。

详细视觉规范见 [`design.md`](./design.md)，需求、架构与排期见 [`doc/`](./doc/)。

## 2. 已验证基线

- 项目目录：`D:/desktop/3d-earth/globe-3d-map`。
- 创建方式：官方 `create-vite@9.1.1`，Vue JavaScript 模板。
- 当前版本：Vue 3.5.40、Vite 8.1.5、`@vitejs/plugin-vue` 6.0.8。
- 为复用参考工程能力而锁定：
  - Three.js 0.155.0；
  - GSAP 3.15.0；
  - d3-geo 3.1.1；
  - three.interactive 1.8.0；
  - Vue Router 4.6.4；
  - Sass 1.102.0。
- 当前入口：`src/main.js` → `src/App.vue` → Vue Router → `GlobeView.vue`，根路由和 `/three-3d-globe` 均可进入地球。
- 2026-07-26 本地验证：M1～M6 已完成，`npm test` 35 项通过，Vite
  生产构建成功；4K 昼夜贴图开启时默认场景约 51 draw calls。
- 生产构建已按 Vue、Three.js、GSAP、Geo 和 GlobeView 拆包；本地贴图产物
  约 2.18 MB，运行期不依赖第三方图片服务器。
- 本仓库已有 Node Test Runner 单元测试；当前仍无 lint、format、TypeScript 或 Git 元数据。
- 参考工程 `../china-3d-map1` 已验证包含：
  - `src/mini3d/`：场景、相机、渲染器、资源、时间、标签、飞线、路径与粒子；
  - `src/views/map-animate/map.js`：中国地图场景和效果编排；
  - 中国省级/轮廓 GeoJSON 与运输路径演示数据。

## 3. 开发目标与非目标

### 3.1 当前目标

新增独立的 3D 地球页面，首版不依赖地球纹理贴图，至少支持：

- 程序化球体、绿色大气辉光、星空与粒子光环；
- 地理点、标签、柱状图；
- 球面飞线；
- 陆运线与海航线；
- 海运线基于陆地掩膜自动绕陆；
- 可开关的大气辉光动画和四套语义配色；
- 资源解码完成前的全屏 Loading 与平滑长入场；
- 关闭/白天/夜晚三种地表模式；
- 点击国家聚焦、选中国界动态辉光与二次点击退出；
- 功能显隐开关；
- 鼠标/触控旋转、缩放、悬停、点击聚焦；
- 完整加载、空数据、错误、降级和销毁流程。

### 3.2 当前非目标

- 不复刻参考项目的受版权保护源码、商标、水印或未知商业素材；
- 不接入真实业务后台、在线 GIS 服务或行政区下钻接口；
- M6 昼夜切换是两张静态贴图切换，不模拟太阳方位、云层气象或地形高程；
- 不为“代码复用”而把平面墨卡托算法硬套到球面；
- 不修改或删除相邻的 `../china-3d-map1` 参考项目。

## 4. 事实、推断与配置

代码和文档必须区分三类信息：

- `observed`：能由现有源码或参考图直接确认；
- `assumed`：为实现而采用、可被产品调整的默认值；
- `configured`：应由数据或配置文件控制，禁止散落硬编码。

参考图只能证明静态画面，不足以证明按钮默认状态、点击逻辑、动画时长或数据含义。此类内容必须按“设计推断”处理。

## 5. 技术栈决策

### 5.1 延续使用

- Vue 3：页面与 UI 状态；
- Vite：开发和生产构建；
- Three.js：WebGL 场景、几何体、材质、光照和拾取；
- GSAP：镜头、入场和 UI 编排动画；
- Sass/CSS：界面与 CSS 标签；
- GeoJSON：国界/海岸线和业务地理数据。

### 5.2 首版不新增

- 不引入 ECharts/Mapbox/Cesium：当前效果更适合直接控制 Three.js，新增大型渲染框架会造成双渲染器、坐标和生命周期冲突；
- 不引入通用 UI 组件库：页面 UI 仅为少量控制条、标签、提示与加载态，优先建立本项目轻量组件与设计令牌；
- 不引入全局状态库：场景内状态先用 Vue composable/store 对象管理；跨多个业务页后再评估 Pinia。

### 5.3 可选升级

- 本项目首版使用 JavaScript，优先复用参考工程代码；球面数学和数据契约稳定后再评估渐进迁移 TypeScript；
- 若标签数量超过约 100 或需要严格遮挡，优先转为精灵图集/SDF 文本，而不是继续堆叠 CSS3D DOM；
- 若后处理成为正式需求，再增加 EffectComposer/Bloom；首版用材质辉光控制成本。

## 6. 目标目录结构

新增代码遵循以下结构。只把参考工程中真正通用的模块复制并重构到本项目。

```text
src/
├─ views/
│  └─ globe/
│     ├─ GlobeView.vue             # 页面壳与 UI
│     ├─ globe.scss
│     └─ index.js
├─ globe/
│  ├─ core/
│  │  ├─ GlobeWorld.js             # 场景编排，禁止堆积具体几何算法
│  │  ├─ GlobeCameraController.js
│  │  ├─ GlobeContextRecovery.js
│  │  ├─ GlobeDiagnostics.js
│  │  ├─ GlobeLifecycle.js
│  │  ├─ GlobeQuality.js
│  │  └─ mountGlobeLayers.js
│  ├─ layers/
│  │  ├─ EarthLayer.js
│  │  ├─ AtmosphereLayer.js
│  │  ├─ BoundaryLayer.js
│  │  ├─ MarkerLayer.js
│  │  ├─ BarLayer.js
│  │  ├─ FlightArcLayer.js
│  │  ├─ RouteLayer.js
│  │  ├─ LabelLayer.js
│  │  ├─ ParticleHaloLayer.js
│  │  └─ StarfieldLayer.js
│  ├─ services/
│  │  ├─ GlobeAssetService.js
│  │  ├─ CountryService.js
│  │  ├─ GlobeDataService.js
│  │  └─ GlobeInteractionService.js
│  ├─ math/
│  │  ├─ geo.js                    # 经纬度/球面坐标/可见性
│  │  └─ curves.js                 # 大圆弧与抬升曲线
│  ├─ config/
│  │  ├─ globe.config.js
│  │  └─ quality.config.js
│  ├─ data/
│  │  ├─ locations.js
│  │  ├─ flightRoutes.js
│  │  └─ transportRoutes.js
│  └─ shaders/
│     ├─ earth/
│     ├─ atmosphere/
│     └─ arc/
├─ components/
│  └─ globe-ui/
│     ├─ EffectToolbar.vue
│     ├─ GlobeBreadcrumb.vue
│     ├─ GlobeTooltip.vue
│     ├─ GlobeLoading.vue
│     ├─ TextureSwitcher.vue
│     ├─ GlobeLayerNotice.vue
│     └─ GlobeError.vue
└─ styles/
   ├─ tokens.css
   └─ globe.css
```

## 7. 模块边界

### 7.1 `mini3d`

从 `../china-3d-map1/src/mini3d` 选择性复制后，只放与业务无关的运行时能力。允许复用/改进：

- renderer、camera 基础封装；
- Time、Sizes、EventEmitter；
- Resource；
- 通用粒子、标签、曲线组件。

禁止写入“广州”“航线”“国家”等业务字段或地球特有配置。

### 7.2 `globe/core`

负责组装、状态流转、生命周期与质量档位，不直接生成每一种业务 Mesh。`GlobeWorld` 单文件建议不超过 400 行。

### 7.3 `globe/layers`

每一层拥有自己的 Group、创建/更新/显隐/销毁逻辑。层之间不直接访问彼此的内部 Mesh，只通过事件或 `GlobeWorld` 协调。

统一接口：

```js
class GlobeLayer {
  mount(parent) {}
  setData(data) {}
  setVisible(visible) {}
  update(delta, elapsed) {}
  resize(size) {}
  dispose() {}
}
```

### 7.4 `globe/math`

是所有球面功能的唯一坐标真相源。任何层不得复制经纬度转换公式。

### 7.5 Vue UI

只管理展示状态、用户意图与可访问性；不得直接遍历 Three.js scene 或修改 layer 内部材质。通过明确的控制器 API，例如 `world.setLayerVisible(id, value)`。

## 8. 坐标与数据规范

- 经纬度统一为 `[longitude, latitude]`，单位为度；
- Three.js 世界坐标使用右手系，Y 轴向上；
- 地球半径由单一配置 `EARTH_RADIUS` 提供，默认建议 `50`；
- 球面法线是经纬度位置向量的归一化结果；
- 标记、柱体和标签通过法线外移，禁止使用固定世界轴高度；
- 航线使用球面插值或归一化中点曲线，禁止把经纬度先做墨卡托再弯曲；
- 经度必须归一到 `[-180, 180]`，跨日期变更线的路径必须走最短弧或显式配置长弧；
- 数据项必须有稳定 `id`，不得使用数组下标作为交互身份；
- UI 展示文案与数据字段分离，单位必须在 schema 中明确。

推荐数据契约：

```js
{
  id: "gz-sin",
  kind: "flight",
  from: { id: "gz", name: "广州", coord: [113.2644, 23.1291] },
  to: { id: "sin", name: "新加坡", coord: [103.8198, 1.3521] },
  value: 120,
  color: "#78ffd6",
  enabled: true
}
```

## 9. 复用规则

### 9.1 可以直接复用

- `EventEmitter` 的事件思想；
- `Resource` 的统一加载入口；
- `Time` 的单一帧循环；
- `Label3d` 的 DOM 标签实现方式（需增加遮挡与清理）；
- GSAP 时间线组织入场动画；
- `Particles`、`FlyLine`、`PathLine` 的 API 思想和材质策略；
- 参考工程中已有且许可明确的光圈、飞线、点精灵等素材；复制后必须保留来源记录。

### 9.2 需要改造后复用

- `Sizes`：保存具名 resize handler，并在 destroy 中移除；
- `Resource`：处理取消、失败、超时、重复资源与释放；
- `Label3d`：增加球背隐藏、视锥裁剪、重叠控制和批量更新；
- `FlyLine`/`PathLine`：替换平面投影，支持球面大圆路径；
- `Particles`：实例级材质与 geometry，确保 dispose；
- `Renderer`：显式设置色彩空间、透明背景和质量档位。

### 9.3 不直接复用

- `ExtrudeMap` 的平面 Shape/ExtrudeGeometry；
- d3 `geoMercator` 的平面坐标；
- 固定 `rotateX(-Math.PI / 2)` 的场景对齐；
- 平面 Reflector 倒影；
- 以 `z` 为统一高度方向的 hover/柱体/标签移动；
- `map.js` 中对具体 Group 属性的直接 UI 控制。

## 10. 交互规范

- 桌面端：
  - 左键拖拽旋转；
  - 滚轮缩放，限定最小/最大距离；
  - 悬停标记或可交互区域时高亮并显示 tooltip；
  - 点击标记将镜头平滑聚焦，第二次点击或 Esc 取消；
  - 点击球面国家后聚焦其几何中心并高亮国界；再次点击同一国家立即退出并恢复自动旋转；
  - 进入手动操作时暂停自动旋转，空闲后可恢复。
- 触控端：
  - 单指旋转；
  - 双指缩放；
  - 首次点击选中，避免依赖 hover；
  - 控件点击热区不小于 44×44 CSS px。
- 图层开关必须幂等，可快速连点，不得重复创建 Mesh 或事件监听；
- 被隐藏图层应停止无意义动画或 shader 更新；
- UI 状态必须能从场景真实状态恢复，禁止只切按钮 class；
- 加载中不可触发依赖未加载资源的操作；
- 键盘支持 Tab 聚焦工具按钮、Enter/Space 切换、Esc 退出聚焦。

## 11. 视觉与样式系统

- 视觉基调：黑色宇宙背景、深墨绿色球体、青绿色大气边缘、少量黄色高优先级航线；
- 不照搬参考图中的水印、平台标识或不可确认来源纹理；
- CSS 颜色、间距、字体、边框、动效时长必须来自 `src/styles/tokens.css`；
- Three.js 色值来自 `globe.config.js`，命名与 CSS token 对齐；
- 禁止在组件中散落十六进制色值和魔法数字；
- UI 采用轻量自建组件，不引入通用 UI 库；
- 中文字体优先使用系统无衬线栈，数字使用等宽特性；
- 标签默认为暗色半透明底、1 px 青绿边、轻微外发光；
- 黄色仅用于主枢纽、选中态或最高优先级，不作为常规装饰色。

## 12. 性能预算

默认验收设备按 1920×1080、设备像素比 1～2 的中端集显/独显浏览器评估：

- 首屏可交互目标：本地资源 3 秒内，生产网络另行测量；
- 稳态目标：桌面 ≥ 55 FPS，移动端 ≥ 30 FPS；
- draw calls 目标：默认场景 ≤ 120；
- 同屏 CSS3D 标签建议 ≤ 40；
- 默认飞线建议 ≤ 100；超过后使用合并几何/实例化/着色器批处理；
- renderer pixel ratio 上限默认 2，低质量档降到 1；
- 不可见或关闭图层停止 CPU 更新；
- resize、pointermove 与标签遮挡计算需要节流；
- 不得在每帧创建 Vector3、Material、Texture 或 DOM 节点。

## 13. 边界情况

至少覆盖：

- 空数组、缺少坐标、非法经纬度、重复 id；
- 起终点相同、接近对跖点、跨国际日期变更线；
- 标签在球背、地平线边缘、视锥外或互相重叠；
- 浏览器窗口极窄、超宽屏、高 DPI、页面隐藏/恢复；
- WebGL 不可用、上下文丢失与恢复；
- 资源 404、JSON 解析失败、部分图层失败；
- 快速切换图层、快速切换路由、动画未完成即销毁；
- 低性能设备、`prefers-reduced-motion`；
- 鼠标按下后移出 canvas，确保交互锁能释放；
- 触摸滚动与地球旋转冲突；
- 异步请求在组件卸载后返回。

## 14. 生命周期与资源释放

每个 `addEventListener`、Time 订阅、GSAP tween、InteractionManager 注册、geometry、material、texture、render target、CSS3D DOM 都必须有对称清理。

禁止依赖全场景 `traverse` 作为唯一回收手段。每层 `dispose()` 自己拥有并释放资源；共享资源由资源服务引用计数或统一释放。

路由切换验收应重复进入/离开地球页至少 10 次，确认：

- canvas/CSS3D 容器数量不增长；
- RAF 不重复；
- resize/pointer 监听不增长；
- GPU memory 和 JS heap 无持续阶梯增长；
- 控制器和动画不再更新已销毁对象。

## 15. 开发规范

- 默认使用 2 空格缩进、双引号、无分号，延续现有风格；
- 类与 Vue 组件使用 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE；
- 图层类以 `Layer` 结尾；服务类以 `Service` 结尾；
- 公共函数写 JSDoc，必须说明坐标系、单位和返回值；
- 一次提交只处理一个清晰主题；不要顺手修改相邻参考工程；
- 禁止保留调试 `console.log`；
- 禁止静默吞掉 Promise 错误；
- DOM 模板中的动态文本不得直接拼接不可信 HTML；
- 外部资源必须记录来源、许可证、版本和本地备份策略；
- 不把在线 DataV 地址作为生产运行时唯一依赖；
- 新代码不得导入未声明依赖；不要复制参考工程中未使用且引用 `yuka` 的遗留文件。

## 16. 测试与验收

最低验证命令：

```bash
npm install
npm run dev
npm run build
```

建议补充脚本：

```json
{
  "lint": "eslint .",
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

测试层次：

- 单元：经纬度转换、球面可见性、弧线生成、数据校验；
- 组件：工具栏状态、键盘操作、加载/错误态；
- 集成：图层切换不重复创建、路由销毁、资源失败；
- 视觉：1920×1080、1366×768、移动竖屏截图；
- 性能：默认/高/低质量档的 FPS、draw calls、内存；
- 手工：鼠标、触控、Esc、页面隐藏恢复、WebGL 降级。

## 17. 完成定义

一个功能只有同时满足以下条件才算完成：

- 符合 `doc/01-requirements.md` 的验收标准；
- 使用统一球面坐标与数据 schema；
- 有加载、空、错误和销毁路径；
- 图层开关与交互状态可恢复；
- `npm run build` 成功且无新增未解释警告；
- 关键数学与状态逻辑有测试；
- 相关文档、配置和素材许可证记录已更新；
- 未修改或破坏相邻的 `../china-3d-map1` 项目。
