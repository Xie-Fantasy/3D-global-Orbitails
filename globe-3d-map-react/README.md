# 3D-global-Orbitails · React + TypeScript

Interactive Three.js globe for digital twins, geographic data visualization, and large-screen dashboards. This is the **React 19 + Vite + TypeScript** implementation.

[Project overview / screenshots / GIF](../README.md) · [中文介绍](../README.zh-CN.md) · [1080p 60fps video](../docs/media/orbitails-showcase-1080p60.mp4) · [Integration guide](../docs/INTEGRATION.md) · [Vue version](../globe-3d-map-vue/)

## Run

Use Node.js 22.12+ and npm. From this directory:

```bash
npm ci
npm run dev
```

## Verify and build

```bash
npm test
npm run typecheck
npm run lint -- src
npm run build
npm run preview
```

Start in `src/app/GlobePage.tsx`, `src/hooks/useGlobeWorld.ts`, and `src/globe/core/GlobeWorld.ts`. Replace the records in `src/globe/data/` to supply your own network. This is a source integration project, not an independently published npm package.

The root [MIT license](../LICENSE) covers project code. Retain [third-party notices](../THIRD_PARTY_NOTICES.md), including NASA imagery attribution.
