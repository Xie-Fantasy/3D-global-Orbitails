# 3D-global-Orbitails React 复刻规范

本文档是 `globe-3d-map-react` 的唯一开发约束文档，描述如何将相邻的 Vue 版本 `../globe-3d-map-vue` 复刻为 React + Vite + TypeScript 版本。

本文档只规定复刻工作，不要求修改 Vue 版本。React 版本必须保持独立目录、独立依赖和独立构建产物；Vue 版本是行为与视觉的参考实现，不是可以直接复制粘贴的 React 代码来源。

> **强制约束（避免遗忘）**：参考实现目录 `globe-3d-map-vue` 的代码**禁止修改、禁止写入、禁止删除**，只允许读取与对照其行为/视觉。所有复刻改动只发生在 `globe-3d-map-react` 之内。该目录原名 `globe-3d-map`（本文档早期路径引用 `../globe-3d-map` 即指此项目），现已重命名为 `globe-3d-map-vue`；两个名字指向同一项目，均受本约束保护。

## 1. 产品目标与不可变要求

项目名称和页面标题固定为：

```text
3D-global-Orbitails / 瑠璃色の地球
```

复刻结果必须保留以下能力：

- 程序化 3D 地球、绿色大气辉光、深空星群、粒子光环。
- 地表边界、节点、节点标签、柱状图、飞线、陆运线、海运线。
- 海运路线自动绕开陆地；跨日期变更线的路径必须走最短弧或显式配置长弧。
- 鼠标拖拽旋转、滚轮平滑缩放、触摸旋转/缩放、节点和国家拾取。
- 缩放时朝鼠标指向的地球表面区域产生轻微镜头绕转；不能退化为只修改相机距离。
- 滚轮缩放使用目标距离、阻尼和鼠标地表锚点，不得每次滚轮事件创建互相竞争的无限 GSAP 动画。
- 主题切换、地球贴图切换、图层显隐、自动旋转、重置视图、粒子/星群密度调节。
- 中英文切换，默认英文；语言切换控件的文案始终为英文 `LANGUAGE`。
- 国家、城市、港口名称在中英文之间一致切换，不能出现同一页面中英混用。
- 删除 Vue 版本中的全球/中国/广东视角预设模块，不在 React 版本恢复该模块。
- 粒子光环和深空星群密度范围为 25–250，100 为原始默认视觉密度。
- Loading、空数据、局部图层失败、WebGL 上下文丢失/恢复和致命错误都有明确 UI 状态。
- 页面默认语言为英文；页面标题可以同时包含英文产品名和日文副标题。

当前 Vue 版本中带有乱码的终端显示不代表最终页面文案。React 版本必须使用 UTF-8 文件，并直接写入正确的中英文和日文文本。

## 2. 技术基线

### 2.1 必须使用

- React 19。
- Vite 8。
- TypeScript，所有新业务代码使用 `.ts` 或 `.tsx`。
- Three.js 0.155.x 或与 Vue 版本兼容的锁定版本。
- GSAP 3.x：用于进入动画、聚焦动画和非连续时间线；滚轮实时缩放优先使用逐帧阻尼。
- `d3-geo`：经纬度、国家命中和地理计算。
- `topojson-client`、`world-atlas`：国家边界数据。
- React DOM 的 `createRoot` 入口。

### 2.2 推荐增加

如果当前脚手架没有测试依赖，应增加 Vitest 或继续使用 Node test runner。数学函数、数据校验、路径规划、状态机、生命周期和关键交互必须有自动化测试。

不得因为复刻方便而引入 Cesium、Mapbox、ECharts、DataV 或第二套 3D 渲染器。Three.js 是唯一的场景渲染层。

## 3. 目录结构

最终目录应接近以下结构：

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ routes.tsx
│  └─ app.css
├─ components/
│  └─ globe-ui/
│     ├─ LanguageSwitcher.tsx
│     ├─ ThemeSwitcher.tsx
│     ├─ TextureSwitcher.tsx
│     ├─ EffectToolbar.tsx
│     ├─ GlobeControls.tsx
│     ├─ VisualControls.tsx
│     ├─ GlobeTooltip.tsx
│     ├─ GlobeLoading.tsx
│     ├─ GlobeLayerNotice.tsx
│     └─ GlobeError.tsx
├─ globe/
│  ├─ core/
│  │  ├─ GlobeWorld.ts
│  │  ├─ GlobeCameraController.ts
│  │  ├─ GlobeLifecycle.ts
│  │  ├─ GlobeContextRecovery.ts
│  │  ├─ GlobeDiagnostics.ts
│  │  ├─ GlobeQuality.ts
│  │  ├─ createGlobeState.ts
│  │  ├─ createGlobeLayers.ts
│  │  ├─ mountGlobeLayers.ts
│  │  └─ dispose.ts
│  ├─ layers/
│  │  ├─ EarthLayer.ts
│  │  ├─ AtmosphereLayer.ts
│  │  ├─ BoundaryLayer.ts
│  │  ├─ MarkerLayer.ts
│  │  ├─ LabelLayer.ts
│  │  ├─ BarLayer.ts
│  │  ├─ FlightArcLayer.ts
│  │  ├─ RouteLayer.ts
│  │  ├─ ParticleHaloLayer.ts
│  │  └─ StarfieldLayer.ts
│  ├─ services/
│  │  ├─ GlobeAssetService.ts
│  │  ├─ GlobeDataService.ts
│  │  ├─ GlobeInteractionService.ts
│  │  ├─ CountryService.ts
│  │  └─ SeaRoutePlanner.ts
│  ├─ math/
│  │  ├─ geo.ts
│  │  └─ curves.ts
│  ├─ config/
│  │  ├─ globe.config.ts
│  │  └─ quality.config.ts
│  ├─ data/
│  │  ├─ locations.ts
│  │  ├─ flightRoutes.ts
│  │  └─ transportRoutes.ts
│  └─ types/
│     ├─ data.ts
│     ├─ layers.ts
│     └─ state.ts
├─ hooks/
│  ├─ useGlobeWorld.ts
│  ├─ useGlobeState.ts
│  └─ usePrefersReducedMotion.ts
├─ i18n/
│  └─ globe.ts
├─ styles/
│  ├─ tokens.css
│  └─ globe.css
└─ main.tsx
```

React 组件只负责 DOM、可访问性、用户意图和展示状态；`globe/` 负责 Three.js 对象、坐标、数据和生命周期。React 组件不得遍历 Three.js `scene`、直接修改 layer 内部材质，或在 JSX 中创建 Three.js 对象。

## 4. Vue 到 React 的映射

| Vue 版本 | React 版本要求 |
|---|---|
| `GlobeView.vue` | `GlobePage.tsx` + `useGlobeWorld` |
| `reactive(sceneState)` | `GlobeState` 外部快照 + `useSyncExternalStore` 或明确的 reducer |
| `onMounted` / `onBeforeUnmount` | `useEffect`，必须返回完整 dispose 函数 |
| `computed` | `useMemo`，只用于纯派生值 |
| `watch` | 明确的 `useEffect`，必须写依赖数组和取消逻辑 |
| `$emit` | Props 回调，如 `onSelect`, `onToggle` |
| Vue template | JSX；动态文本必须来自 typed i18n |
| Vue `ref` | DOM 用 `useRef<HTMLCanvasElement | null>`；可变 Three 对象也用 ref，但不作为渲染状态 |
| Vue scoped/Sass 样式 | 全局命名空间 CSS 或 CSS Modules，禁止依赖组件挂载顺序 |
| `GlobeBreadcrumb.vue` | 不迁移，视角预设模块已删除 |

## 5. TypeScript 强制规范

### 5.1 编译器约束

`tsconfig.app.json` 必须开启或保持：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noEmit": true
  }
}
```

### 5.2 禁止事项

- 禁止在业务代码中使用 `any`、`@ts-ignore`、`@ts-nocheck`。
- 禁止把 `as any` 当作 Three.js 类型问题的解决方案。
- 禁止通过数组下标作为节点、路线或交互身份；所有数据项必须有稳定的 `id`。
- 禁止在 render 函数中创建 `Vector3`、`Color`、材质、几何体、纹理或 DOM 节点。
- 禁止把 Three.js 的可变对象放入 React state；放入 `useRef`，只有可序列化的展示快照进入 state/store。
- 禁止在 `useEffect` 中遗漏 cleanup，尤其是 RAF、ResizeObserver、事件监听、GSAP tween、纹理和 WebGL 上下文事件。
- 禁止使用 `console.log` 作为最终调试方案；如需日志必须有明确诊断开关。
- 禁止在数据层、渲染层和 UI 层重复实现经纬度转换。

### 5.3 类型契约

所有外部数据先经过 `GlobeDataService` 归一化。推荐契约：

```ts
export type LonLat = readonly [longitude: number, latitude: number]
export type GlobeLocale = "en" | "zh"
export type LocationType = "hub" | "city" | "port"
export type RouteKind = "flight" | "land" | "sea"

export interface LocationRecord {
  readonly id: string
  readonly name: string
  readonly nameZh: string
  readonly country: string
  readonly countryZh: string
  readonly coordinate: LonLat
  readonly type: LocationType
  readonly value: number
  readonly priority: number
}
```

坐标统一使用 `[longitude, latitude]`，单位为度，longitude 必须归一化到 `[-180, 180]`。Three.js 世界坐标只能由 `globe/math/geo.ts` 生成。

## 6. React 场景生命周期

### 6.1 `useGlobeWorld` 责任

`useGlobeWorld` 必须：

1. 接收 `HTMLCanvasElement`、初始主题、质量档、数据覆盖和状态回调。
2. 只在 canvas 与容器真实存在时创建 `GlobeWorld`。
3. 处理异步 `load()` 的取消：组件卸载后，异步结果不得继续写入 React state。
4. 在 cleanup 中按顺序停止 RAF、移除观察器和事件、销毁交互服务、销毁所有 layer、释放材质/几何体/纹理、释放 renderer。
5. React StrictMode 开发模式下重复挂载/卸载不得导致 canvas、RAF、事件、CSS3D 标签或 GPU 内存增长。
6. 对 WebGL context lost/restored 提供状态快照，不直接强制刷新页面。

### 6.2 状态边界

Three.js 内部状态包括 camera、scene、renderer、layers、materials 和 uniforms；不得暴露给 JSX。React 只订阅以下可序列化状态：

- `phase`: `idle | loading | entering | ready | recovering | fatal-error | disposed`
- `theme`, `locale`, `texture.mode`, `texture.status`
- 图层的 `visible/status/error`
- `autoRotate`, `interacting`, `densities`
- `hoveredLocationId`, `selectedLocationId`, `selectedCountry`, `activeLocation`
- `loading.progress/message`, `error`
- 诊断信息：FPS、frame time、draw calls、triangles、geometries、textures、heap memory

状态更新必须是不可变快照。不得把 Three.js 对象、国家 geometry 或 Material 放入快照。

## 7. Three.js 图层规范

每个 layer 实现相同的 TypeScript 接口：

```ts
export interface GlobeLayer {
  readonly group: THREE.Group
  mount(parent: THREE.Object3D): void
  setData?(data: unknown): void
  setVisible(visible: boolean): void
  setTheme?(theme: GlobeTheme): void
  setLocale?(locale: GlobeLocale): void
  update(delta: number, elapsed: number, context: LayerUpdateContext): void
  resize(size: GlobeSize): void
  dispose(): void
}
```

规则：

- layer 只能操作自己的 Group 和资源。
- `dispose()` 必须可重复调用且幂等。
- 共享纹理必须由资源服务统一管理，不能被多个 layer 各自释放。
- Marker、粒子等重复对象优先使用 `InstancedMesh` 或 `Points`。
- 不可见 layer 必须停止无意义的 shader/uniform/CPU 更新。
- 标签必须做地球背面判断、视锥判断和重叠裁剪；数量增加后必须有可见数量上限或 LOD。
- FlightArc、Route 不得为每帧数据创建几何体；路径几何体只在数据变化时重建。
- `prefers-reduced-motion` 必须同时作用于飞线、陆海路线、粒子光环、星群、国家高亮和镜头动画。

## 8. 相机与缩放实现细节

相机控制器必须保留现有行为：

- 左键/单指旋转。
- 双指或滚轮缩放。
- 右键/指定手势平移（如果保留平移，必须限制 target，避免地球离开视口）。
- 最小、最大距离必须由配置统一提供。
- 任何交互开始时暂停自动旋转；空闲后按配置延迟恢复。

滚轮缩放必须遵循以下流程：

1. 使用 `clientX/clientY` 转为 NDC。
2. 用相机 Raycaster 与半径为 `EARTH_RADIUS` 的球体求交，得到鼠标指向的地表锚点。
3. 根据 `deltaY` 更新目标距离，使用指数映射并限制在 min/max distance。
4. 根据锚点方向更新目标相机方向；放大时方向跟随更明显，缩小时只保留轻微反馈。
5. 在 RAF 中用指数阻尼同时追随距离和方向。
6. 滚动停止后方向强度衰减到零；不能持续把镜头拉向旧锚点。
7. 清理时移除 wheel listener 和延迟 timer。

GSAP 可以用于 intro、focus、preset 等有限时长的相机时间线，但不得为每个 wheel 事件创建未取消的 tween。若使用 GSAP，必须保存 tween 引用，在新的交互或 dispose 时 `kill()`。

## 9. 国际化规范

`src/i18n/globe.ts` 必须导出：

```ts
export type GlobeLocale = "en" | "zh"
export type GlobeMessageKey = ...
export function t(locale: GlobeLocale, key: GlobeMessageKey): string
```

要求：

- 默认 locale 为 `en`。
- 所有可见 UI 文案必须通过 typed key 获取，不允许在 JSX 中散落中文或英文 value。
- `LANGUAGE` 是唯一强制保持英文的语言控件标签。
- 主题、贴图、图层、状态、tooltip、loading、error、无数据提示都必须有中英文值。
- 业务数据同时保存 `name/nameZh`、`country/countryZh`，不要运行时翻译专有名词。
- 国家服务返回稳定的英文 `name` 和中文 `nameZh`；为兼容旧调用可以保留 `label`，但 UI 不得依赖含糊的 `label` 字段。
- 切换语言只更新 UI 快照和标签文本，不得重新创建 Three.js 场景。

## 10. 样式与页面组成

React 版本要复刻 Vue 版本的布局、颜色、间距、字体和响应式断点。颜色和间距优先来自 `styles/tokens.css`，组件中不得散落十六进制颜色和魔法数字。

页面必须包含：

- 3D canvas 舞台。
- 运行状态与性能摘要。
- 主题切换。
- 地球贴图切换。
- 场景图层与数据图层工具栏。
- 自动旋转和重置视图。
- 粒子光环/深空星群密度滑杆。
- 固定英文标签的 `LANGUAGE` 中英文切换。
- 操作提示、坐标显示、国家聚焦提示、节点 tooltip。
- Loading、局部图层提示和错误重试。

不要把已删除的全球/中国/广东预设视角区域迁移到 React 页面。不要为了复刻而保留 Vue 特有的 `GlobeBreadcrumb` 组件。

## 11. 推荐实施阶段

### M0：脚手架与依赖

- 确认 `react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react` 已可用。
- 增加并锁定 Three.js、GSAP、d3-geo、topojson-client、world-atlas。
- 开启严格 TypeScript；移除模板中的 React/Vite 示例内容。
- 设置页面 title 为 `3D-global-Orbitails / 瑠璃色の地球`。

### M1：类型、数学和数据服务

- 迁移 `geo.js`、`curves.js` 为 `.ts`。
- 先迁移数据契约和 `GlobeDataService`，补齐坐标、id、路线端点、重复 id、非法坐标测试。
- 迁移 `CountryService` 和 `SeaRoutePlanner`，确认国家拾取和自动海运路线测试通过。

### M2：Three.js 核心与资源

- 迁移 `GlobeLifecycle`、`GlobeQuality`、`GlobeDiagnostics`、`GlobeContextRecovery`、`dispose`。
- 迁移 `GlobeAssetService`，保留本地贴图和进度回调。
- 迁移 `GlobeCameraController`，先完成基础拖拽，再完成鼠标地表锚点缩放。
- 迁移 `GlobeWorld`、layer 工厂和 layer mount 流程。

### M3：所有视觉图层

- 按 Earth → Atmosphere → Boundary → routes/arcs → markers/bars → labels → starfield/halo 的顺序迁移。
- 每完成一个 layer，补充 setVisible、setTheme、setLocale、resize、dispose 行为。
- 先保证默认场景稳定，再加入主题和密度更新。

### M4：React 页面和 hooks

- 实现 `useGlobeWorld`，处理 StrictMode 和卸载竞态。
- 实现 `GlobePage.tsx`，只把序列化状态传给 UI 组件。
- 将 Vue `$emit` 改为明确的 callback props。
- 使用 `useMemo` 生成图层定义和主题选项，禁止每次 render 创建 Three.js 对象。

### M5：国际化、交互和响应式

- 接入 `t()` 和 `LanguageSwitcher`。
- 验证默认英文、中文切换、国家名统一、LANGUAGE 固定英文。
- 验证小屏幕、触摸、键盘 Escape、Tab、Enter/Space、reduced-motion。

### M6：验收和性能

- 运行构建、类型检查、lint、单元测试。
- 使用真实浏览器测试缩放锚点、拖拽、国家拾取、语言切换、图层开关。
- 检查重复进入页面 10 次后 canvas、RAF、事件监听和 GPU 资源不增长。
- 记录默认场景 FPS、draw calls、三角形数和首屏加载时间。

## 12. 性能预算

默认验收设备为 1920×1080、DPR 1–2 的独立浏览器窗口：

- 桌面稳定运行目标 ≥55 FPS，移动端目标 ≥30 FPS。
- 默认场景 draw calls ≤120。
- 默认 CSS/DOM 标签建议 ≤40 个；超过后必须使用 LOD 或聚合。
- 默认飞线建议 ≤100 条；超过后合并几何或使用实例化/Shader 方案。
- renderer pixel ratio 上限为 2，低质量档为 1。
- 不可见图层不得继续做动画更新。
- resize、pointermove、标签投影和碰撞检测必须节流或合并到 RAF。
- 低质量档自动减少球体分段、星群数量、粒子数量、路径采样和标签数量。

## 13. 验收清单

### 功能

- [ ] 页面标题正确：`3D-global-Orbitails / 瑠璃色の地球`。
- [ ] 默认打开页面为英文。
- [ ] `LANGUAGE` 标签在中英文状态下均保持英文。
- [ ] 中文状态下所有节点和国家显示中文；英文状态下全部显示英文。
- [ ] 预设视角模块不存在。
- [ ] 密度滑杆范围为 25–250，默认值为 100。
- [ ] 滚轮缩放会朝鼠标地表位置轻微转入，并具有阻尼。
- [ ] 连续滚轮、反向滚轮和触摸缩放不会产生跳变或相机失控。
- [ ] 拖拽旋转、自动旋转、重置、节点拾取、国家拾取正常。

### 工程

- [ ] `npm run build` 通过。
- [ ] `npm run lint` 通过。
- [ ] `npm run typecheck` 通过，不存在 `any` 或 ts-ignore。
- [ ] 数学、数据、路线、国家服务和生命周期测试通过。
- [ ] React StrictMode 下没有重复 RAF、监听器或 WebGL 实例。
- [ ] 页面卸载后没有未处理 Promise、活动 tween、timer 或 GPU 资源泄漏。
- [ ] 没有依赖在线图片或运行时第三方地图服务才能启动。

## 14. 变更纪律

- 一次提交只处理一个清晰主题，例如“迁移相机控制器”或“迁移图层 UI”。
- 不要修改 `globe-3d-map-vue`（参考实现）：它只可读取，不可写入或删除；如需修复 Vue 参考实现，先单独记录原因，并在 `globe-3d-map-react` 内做等效修复，不要回头改 Vue 项目。
- 新增 API 必须先更新类型和测试，再接入 UI。
- 不确定的视觉差异要在浏览器中验证，不能凭截图猜测 Three.js 世界坐标。
- 任何资源、监听器、RAF、Observer、timer、GSAP tween 的创建都必须有对称清理。
- 交付前在本文件的验收清单中逐项确认，不得以“能启动”代替完整复刻。
