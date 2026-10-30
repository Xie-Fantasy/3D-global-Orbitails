# globe-3d-map

独立的 Vue 3 + Vite 3D 地球项目。相邻 `../china-3d-map1` 是代码与素材参考工程，不是本项目的运行时依赖。

## 技术选择

- Vue 3 + Vite；
- JavaScript：便于直接复用参考工程的 Three.js 效果代码；
- Three.js 0.155.0：与参考工程保持一致，降低 shader 和扩展模块兼容风险；
- GSAP、d3-geo、three.interactive、Vue Router、Sass。

球面数学和数据契约稳定后，可再评估渐进迁移 TypeScript。

## 当前进度

M1～M6 已完成，当前版本包含：

- 程序化球体，以及可切换的 4K 白天/夜晚地表贴图；
- 世界国界、经纬网、大气 Fresnel 辉光和星空；
- 鼠标/触控旋转、缩放、阻尼和慢速巡航；
- 全球、中国、广东视角预设；
- 桌面与移动端自适应相机；
- 图层显隐、运行状态、错误和销毁路径；
- 球面坐标、大圆插值与球背判断单元测试；
- 17 个本地演示节点与 16 条广州枢纽航线；
- 球面标点、扩散环、背面隐藏标签与优先级避让；
- 大圆飞线、亮头/渐隐尾和相关航线高亮；
- 沿球面法线生长的柱状图；
- 节点 hover、点击聚焦、Esc 退出和信息面板；
- 5 条多 waypoint 陆运路径与 6 条海航路径；
- 单 draw call、质量档感知的倾斜粒子光环；
- 运输路径与节点选中联动；
- 390×844 移动布局和 44px 触控热区。
- 海运路线基于低分辨率陆地掩膜自动避陆；
- 大气辉光动画开关与翡翠、深海、星云、琥珀四套主题；
- 首屏资源 Loading、约 4.1 秒缓动入场和动效减弱兼容；
- 点击国家聚焦、选中国界流动辉光、再次点击退出并恢复巡航；
- 无贴图 / 白天 / 夜晚三态本地切换，运行期无需联网；
- WebGL 恢复、运行诊断和生产拆包。

当前自动化基线为 35 项单元测试全部通过，生产构建成功。贴图来源和
NASA 署名见 [`doc/04-third-party-assets.md`](./doc/04-third-party-assets.md)。

## 开发

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

页面入口：

- `/`
- `/three-3d-globe`

## 文档

- [`AGENTS.md`](./AGENTS.md)：开发约束与模块边界；
- [`design.md`](./design.md)：视觉与交互设计；
- [`doc/README.md`](./doc/README.md)：需求、架构和排期导航。
