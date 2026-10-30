# 3D-global-Orbitails · Vue

面向数字孪生、地理数据可视化与可视化大屏的 Three.js 交互式地球。这是 **Vue 3 + Vite** 版本，3D 核心以 JavaScript 为主，UI / 配置部分使用 TypeScript。

[项目介绍 / 截图 / GIF](../README.zh-CN.md) · [English](../README.md) · [1080p 60fps 演示视频](../docs/media/orbitails-showcase-1080p60.mp4) · [接入指南](../docs/INTEGRATION.md) · [React + TypeScript 版本](../globe-3d-map-react/)

## 启动

使用 Node.js 22.12+ 与 npm，在此目录执行：

```bash
npm ci
npm run dev
```

页面入口为 `/`，另提供 `/three-3d-globe`。部署后者时需要设置 SPA 回退。

## 验证与构建

```bash
npm test
npm run typecheck
npm run build
npm run preview
```

从 `src/views/globe/GlobeView.vue` 与 `src/globe/core/GlobeWorld.js` 开始阅读，在 `src/globe/data/` 替换业务节点和路线。根目录 README 描述当前公开功能；`doc/` 中的里程碑记录保留了早期开发过程，部分旧说明已被后续实现替代。

项目代码采用根目录的 [MIT 许可证](../LICENSE)。第三方资源遵循[各自条款](../THIRD_PARTY_NOTICES.md)，保留 NASA 影像署名。
