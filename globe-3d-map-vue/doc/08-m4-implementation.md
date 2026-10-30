# M4 稳定性、性能与交付记录

## 1. 交付结论

- 日期：2026-07-26；
- 里程碑：M4 稳定性、性能与发布候选；
- 结果：M1～M4 计划范围已实现，当前可作为无贴图 3D 地球的发布候选基线；
- 相邻 `../china-3d-map1` 仅作只读参考，本阶段未修改该项目；
- 本阶段未增加图片、贴图、模型或远程运行时资源。

## 2. 稳定性实现

### 2.1 局部图层隔离

- `createGlobeLayers` 对每个图层单独构造，单层构造失败不会扩大为整页失败；
- `mountGlobeLayers` 统一处理挂载、显隐、空数据和释放；
- 图层状态统一为 `idle / ready / empty / error`；
- 空数据层自动关闭，工具栏显示 `EMPTY`，并由 `GlobeLayerNotice` 汇总提示；
- 挂载失败层会立即 `dispose()`，工具栏显示 `ERROR`，其余基础层和数据层继续运行；
- `MarkerLayer`、`LabelLayer`、`BarLayer`、`FlightArcLayer`、`RouteLayer` 均声明空数据状态。

可用以下 QA 地址复核空数据：

```text
/?scenario=empty
```

### 2.2 WebGL 恢复

- WebGL context lost 后调用 `preventDefault()`，暂停帧循环并进入 `recovering`；
- 页面显示“图形上下文恢复中”，不会立即要求刷新；
- 8 秒内恢复时重置 renderer state、尺寸与 Clock delta，再回到 `ready`；
- 超时后才进入 `fatal-error`，保留“重试”入口；
- `GlobeContextRecovery` 与状态转移已使用独立单元测试覆盖。

### 2.3 页面与资源生命周期

- `GlobeLifecycle` 统一释放事件、Observer、超时器和自定义 disposer；
- `LabelLayer` 的 DOM 根节点改在 `mount()` 阶段插入，在 `dispose()` 中移除；
- 页面卸载释放 RAF、GSAP、交互服务、相机控制器、所有图层、render lists 和 renderer；
- 路由视图以 `route.fullPath` 为 key，同一路由的质量/场景参数变化会完整重建运行时；
- 后台页继续使用 `visibilitychange` 暂停更新，恢复时丢弃异常大的首帧 delta。

本阶段没有网络 fetch 或异步资源队列，因此没有创建无实际用途的
`AbortController`；未来引入远程数据或贴图时，必须由资源服务创建并交给
`GlobeLifecycle` 释放。

## 3. 性能优化

### 3.1 Marker 实例化

M3 的每个节点分别创建中心点、内圈和脉冲圈。M4 改为三组
`InstancedMesh`：

- 中心点共用一次 draw call；
- 内圈共用一次 draw call；
- 脉冲圈共用一次 draw call；
- 拾取体也改为单个不可见 `InstancedMesh`；
- `instanceId` 通过 `locationIds` 和 `surfacePositions` 映射回业务节点；
- 颜色、选中缩放、悬停和逐节点脉冲矩阵仍可独立更新。

默认场景 draw calls 从 M3 的约 118 降为 39，下降约 67%。

### 3.2 运行时诊断

`GlobeDiagnostics` 每秒提供：

- FPS 与平均帧耗时；
- draw calls、triangles、points、lines；
- geometry、texture 数量；
- 可见/总图层数；
- 城市和路线数量；
- 相机经纬度；
- 浏览器支持时的 JS heap。

标题区显示质量档、FPS 和 draw calls；完整数字以 `data-*` 属性附在
`.globe-runtime` 上，便于只读自动化采集，不向 Vue 暴露 Three.js 对象。

### 3.3 三档质量实测

环境：Codex 内置 Chromium、生产预览、1280×720 桌面和 390×844 移动视口。

| 质量档 | Draw calls | Triangles | Geometries | Textures |
|---|---:|---:|---:|---:|
| low | 39 | 39,984 | 36 | 0 |
| medium | 39 | 49,104 | 36 | 0 |
| high | 39 | 67,344 | 36 | 0 |

桌面 medium 在浏览器前台连续采样中记录到 82～112 FPS，常见值约
91～104 FPS。内置浏览器在工具调用结束后会把页面标记为
`document.visibilityState = "hidden"`，项目按设计暂停 RAF，因此其移动端
隐藏页返回的 20 FPS 不是有效的稳态性能成绩。移动低档的结构指标为
39 draw calls / 39,984 triangles，真实手机 ≥30 FPS 仍需在目标设备补测。

## 4. 构建结果

Vite 8 `rolldownOptions.output.codeSplitting.groups` 将生产依赖拆分为：

- Vue / Vue Router；
- Three.js（按 420 kB 分组上限继续拆分）；
- GSAP；
- d3-geo / topojson-client / world-atlas；
- GlobeView 业务代码。

最终主要产物：

| Chunk | 未压缩 | gzip |
|---|---:|---:|
| 最大 Three.js chunk | 474.41 kB | 118.99 kB |
| Geo 数据与解析 | 110.54 kB | 40.93 kB |
| Vue 运行时 | 91.99 kB | 35.45 kB |
| GSAP | 69.55 kB | 27.28 kB |
| GlobeView | 59.83 kB | 18.67 kB |

直接运行 Vite 构建无大包警告。通过 `npm` 执行时，用户级 npm 配置会提示
`sass_binary_site` 和 `canvas_binary_host_mirror` 将在未来版本停止支持；
这两个提示来自机器级 npm 配置，不来自项目源码或构建配置。

## 5. 自动化与浏览器验收

### 5.1 自动化测试

`npm test`：25 项全部通过，新增覆盖：

- FPS 与 renderer/data/layer 指标采样；
- WebGL lost → restored；
- WebGL 恢复超时；
- 空图层自动关闭；
- 图层挂载失败隔离并释放；
- 10 轮 lifecycle 事件、Observer 和 disposer 对称释放；
- dispose 后定时器不再回调。

### 5.2 浏览器验收

- 桌面 1280×720：地球在线、9 个按钮状态正确、无局部错误提示；
- 粒子、陆运、海航同时关闭后 draw calls 从 39 降为 27，恢复后回到 39；
- 全球、中国、广东三个视角按钮状态正确；
- 广州实例化拾取成功，tooltip 进入 `selected`，Esc 可取消选中；
- 移动 390×844：文档宽度 390 px，无横向页面溢出；
- 移动工具按钮 104×44 px，满足 44 px 触控高度；
- 移动工具栏固定在底部，预设固定在顶部；
- 空数据场景保持 `ORBIT ONLINE`，5 个可切换数据按钮显示 `EMPTY`，
  散点空状态由降级提示表达；
- 根入口与 `/three-3d-globe` 交替重建 10 次，每轮均为 1 个 canvas、
  1 个 label root、17 个 label、0 个 fatal error；
- 应用控制台没有 error 或 warning。

浏览器插件自身的 Statsig 网络超时不属于被测页面日志，未计入应用问题。

## 6. 当前限制与后续建议

- 真实移动设备的持续 FPS、温升和功耗仍需补测；
- WebGL 恢复状态机已有单测，仍建议在目标 GPU/浏览器上执行真实
  `WEBGL_lose_context` 恢复测试；
- 当前路线仍是一条路线一个 Tube draw call；路线数量超过约 100 后应升级为
  合并 BufferGeometry 或单批次 shader；
- 目前没有正式 Playwright E2E 工程，浏览器验收由 Codex 内置浏览器执行；
- 没有地球纹理、云层、Bloom、真实业务接口和行政区下钻；
- npm 用户级废弃配置应由本机维护者清理，项目不修改用户主目录配置。

当前未发现 P0 阻断问题。真实移动设备 FPS 和跨浏览器 WebGL 恢复列为发布前
P1 验证项。
