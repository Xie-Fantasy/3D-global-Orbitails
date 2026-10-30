# 3D 地球项目文档

## 文档导航

| 文档 | 内容 |
|---|---|
| [`../AGENTS.md`](../AGENTS.md) | 仓库开发约束、模块边界、复用和完成定义 |
| [`../design.md`](../design.md) | 视觉风格、布局、组件、交互和动效规范 |
| [`01-requirements.md`](./01-requirements.md) | 需求范围、用户场景、功能、边界和验收标准 |
| [`02-architecture.md`](./02-architecture.md) | 现状分析、目标架构、球面数学、数据流和风险 |
| [`03-development-plan.md`](./03-development-plan.md) | 分阶段任务、工期、依赖、验收和缓冲计划 |
| [`04-third-party-assets.md`](./04-third-party-assets.md) | 第三方数据、素材来源与许可记录 |
| [`05-m1-implementation.md`](./05-m1-implementation.md) | M1 基础地球实现范围、测试结果和已知限制 |
| [`06-m2-implementation.md`](./06-m2-implementation.md) | M2 标点、标签、飞线、柱状图、交互与验收记录 |
| [`07-m3-implementation.md`](./07-m3-implementation.md) | M3 陆运、海航、粒子光环、性能预算与验收记录 |
| [`08-m4-implementation.md`](./08-m4-implementation.md) | M4 稳定性、实例化优化、性能报告与发布候选验收 |
| [`09-m5-visual-routing.md`](./09-m5-visual-routing.md) | M5 海运绕陆、辉光动画、多主题、路线视觉与验收记录 |
| [`10-m6-loading-focus-textures.md`](./10-m6-loading-focus-textures.md) | M6 Loading、长入场、国家聚焦和昼夜贴图实现记录 |

## 当前结论

- 相邻 `../china-3d-map1` 可作为 3D 运行时、代码与素材参考，但不能直接把平面地图类改成球体。
- 地球保持“程序化球体 + GeoJSON 边界”基线，并可叠加本地 4K 昼夜贴图。
- 地球与中国地图是两个独立项目；新项目不得反向依赖中国地图的构建入口。
- 飞线、路径、柱体、标点、标签都必须基于统一经纬度到球面坐标服务。
- M1～M6 已完成，当前基线支持自动海路、多主题、资源 Loading、国家聚焦和昼夜贴图。

## 文档状态

- 版本：v0.6
- 日期：2026-07-26
- 状态：M6 交互与地表升级基线
- 待确认：真实业务数据、国家级业务下钻和最终部署方式
