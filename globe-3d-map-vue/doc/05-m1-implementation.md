# M1 基础地球实现记录

## 状态

- 完成日期：2026-07-26
- 里程碑：M1 基础地球 MVP
- 结果：通过

## 已实现

- Vue Router 根入口与 `/three-3d-globe` 别名；
- `GlobeWorld` 场景编排；
- `GlobeLifecycle` 对称清理；
- `GlobeCameraController`：
  - OrbitControls；
  - 阻尼；
  - 5 秒后恢复慢速巡航；
  - 全球、中国、广东球面预设动画；
  - 移动端宽高比距离补偿；
- `EarthLayer`：
  - 无贴图程序化球体；
  - 经纬网；
  - 扫描线；
  - 明暗和边缘层次；
- `AtmosphereLayer`：
  - 内外双层 Fresnel；
  - 加色混合；
- `BoundaryLayer`：
  - 本地 `world-atlas` 110m 世界边界；
  - 球面细分；
  - 单一 LineSegments draw call；
- `StarfieldLayer`：
  - 固定随机种子；
  - 高/中/低质量数量；
  - 降低动效时停止旋转；
- M1 图层控制、状态、视角预设和响应式 UI；
- WebGL context lost、页面隐藏、resize 和销毁处理；
- 第三方数据许可记录。

## 测试结果

### 自动化

`npm test`：

- 6 项通过；
- 覆盖经度归一、经纬度球面转换、逆转换、对跖点插值、大圆弧高度和球背可见性。

`npm run build`：

- 构建成功；
- M1 地球路由 chunk 约 669 kB，gzip 约 194 kB；
- 存在超过 500 kB 的非阻断警告，M2 前后需要评估 Three.js、世界数据和业务图层拆包。

### 浏览器

- WebGL shader 编译成功，无页面 error/warning；
- 世界边界、大气、星空开关可重复切换；
- 全球预设稳定到 `[104, 24]`；
- 中国预设稳定到 `[104, 35]`；
- 广东预设稳定到 `[113.2644, 23.1291]`；
- 修复了 OrbitControls 阻尼残量干扰预设相机的问题；
- 390×844 移动视口下地球完整可见，工具栏切换为底部横向布局；
- `/three-3d-globe` 可直接访问。

## 当前限制

- 尚未实现业务标点、标签、柱状图、飞线、陆运、海航和粒子光环；
- 首版世界边界是 110m 视觉精度，不用于测绘；
- 无地表纹理、云层和昼夜；
- 当前无 lint、组件测试与 E2E 测试；
- M1 大包警告尚未消除。

## M2 入口条件

- 坐标转换必须继续复用 `src/globe/math/geo.js`；
- 飞线复用 `buildGreatCirclePoints` 或同一球面插值；
- 标点和柱体沿球面法线放置；
- 标签必须增加球背隐藏；
- 新图层实现统一 `mount/setVisible/update/resize/dispose` 接口；
- 不把业务数据写入 `GlobeWorld`。

