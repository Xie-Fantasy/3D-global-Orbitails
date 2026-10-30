# Integrating 3D-global-Orbitails

[English overview](../README.md) · [中文介绍](../README.zh-CN.md)

Both implementations are standalone Vite applications. Reuse their page components or adapt the globe core inside your application. There is no published `3d-global-orbitails` npm dependency at this stage.

## Start with the right files

| Purpose | Vue | React |
| --- | --- | --- |
| Page composition | `src/views/globe/GlobeView.vue` | `src/app/GlobePage.tsx` |
| Scene controller | `src/globe/core/GlobeWorld.js` | `src/globe/core/GlobeWorld.ts` |
| React lifecycle adapter | — | `src/hooks/useGlobeWorld.ts` |
| Input records | `src/globe/data/*.js` | `src/globe/data/*.ts` |
| Geographic conversion | `src/globe/math/geo.js` | `src/globe/math/geo.ts` |
| Colors / camera settings | `src/globe/config/globe.config.js` | `src/globe/config/globe.config.ts` |
| Translations | `src/i18n/globe.ts` | `src/i18n/globe.ts` |

The two scene cores have similar responsibilities but are separate source implementations. The React version includes typed input/state contracts; the Vue core remains primarily JavaScript.

## React: mount a canvas with custom data

This example belongs **inside the React project**, where its imports resolve. Use the existing application's styles for the full dashboard UI, or size your own scene container explicitly:

```tsx
import { useGlobeWorld } from "./hooks/useGlobeWorld"
import type { GlobeWorldOptions } from "./globe/core/GlobeWorld"

const options: GlobeWorldOptions = {
  theme: "emerald",
  quality: "medium",
  locations: [
    {
      id: "guangzhou", name: "Guangzhou", nameZh: "广州",
      country: "China", countryZh: "中国",
      coordinate: [113.2644, 23.1291],
      type: "hub", value: 320, priority: 100,
    },
    {
      id: "singapore", name: "Singapore", nameZh: "新加坡",
      country: "Singapore", countryZh: "新加坡",
      coordinate: [103.8198, 1.3521],
      type: "port", value: 196, priority: 90,
    },
  ],
  flightRoutes: [
    {
      id: "gz-sg", kind: "flight",
      fromId: "guangzhou", toId: "singapore",
      value: 120, priority: 90,
    },
  ],
  transportRoutes: [],
}

export function NetworkGlobe() {
  const { canvasRef, controls } = useGlobeWorld(options)

  return (
    <section style={{ position: "relative", width: "100%", height: "80vh" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <button
        style={{ position: "absolute", top: 16, left: 16 }}
        onClick={() => controls.resetView()}
      >Reset view</button>
    </section>
  )
}
```

Options are captured when the hook mounts. Updating the options object later does not replace the live dataset. Provide all three data arrays when replacing the demo network, so default routes do not reference missing demo endpoints. Adapt the existing source to support your own runtime updates if needed.

## Vue: use the existing lifecycle boundary

Start with `src/views/globe/GlobeView.vue`: it owns the canvas and creates/disposes `GlobeWorld`. Replace the `locations`, `flightRoutes`, and `transportRoutes` inputs passed to its constructor, or edit the demo records in `src/globe/data/`.

Use `onMounted` for creation and `onBeforeUnmount` for disposal. If you create a wrapper component, preserve the parent container's explicit width/height, loading handling, and cleanup. The root README is the current public feature guide; older milestone documents in the Vue folder describe earlier iterations.

## Data rules

- Coordinates are `[longitude, latitude]`, in degrees.
- A node needs a stable, unique `id`, display `name`, `country`, and valid coordinates.
- For bilingual data, also provide `nameZh` and `countryZh`.
- Node `type` is `hub`, `city`, or `port`; `value` and `priority` are non-negative finite numbers.
- A route needs an `id`, `kind`, `fromId`, and `toId`. Endpoints must exist and must differ.
- `kind` is `flight`, `land`, or `sea`. Flight routes belong in `flightRoutes`; land/sea routes belong in `transportRoutes`.
- Transport routes can include intermediate `waypoints`. `routing: "auto-sea"` is for sea routes and uses the local low-resolution land mask.

The sample nodes, priorities, volumes, and transport paths are presentation data, not live operational records. The sea planner does not account for traffic restrictions, bathymetry, vessel class, weather, or port procedures.

## Scene controls

These methods are available on the scene controller; React exposes them through `controls`:

```ts
controls.setTheme("azure")
controls.setCustomAccentColor("#63f5cb")
controls.setTextureMode("night") // "off" | "day" | "night"
controls.setLocale("zh")        // "en" | "zh"
controls.setLayerVisible("flightArcs", false)
controls.setVisualDensity("halo", 180)
controls.setVisualDensity("starfield", 180)
controls.setAutoRotate(false)
controls.selectLocation("guangzhou")
controls.clearSelection()
controls.resetView()
```

Use the `BASE_LAYER_IDS`, `DATA_LAYER_IDS`, and `EFFECT_IDS` constants instead of repeating strings in production code. Consult each implementation's controller signatures for return values and optional parameters.

## Lifecycle and performance

- One mounted globe should own one renderer and one animation loop.
- Dispose the world when its container unmounts. The React hook already owns this boundary.
- Do not create Three.js geometry/materials during React rendering.
- Start with the provided data scale; measure on the actual kiosk/dashboard hardware before increasing nodes, paths, labels, and pixel ratio.
- The quality presets set initial resource budgets; they are not a continuous FPS-based adaptation system.
- Avoid using screenshots' FPS numbers as benchmarks. Browser, GPU, resolution, and scene density all change the result.

## Deployment

Run `npm run build` in the chosen implementation and host its `dist/` directory. Configure Vite `base` for a non-root URL. Vue Router's `/three-3d-globe` path needs an SPA fallback. Keep NASA attribution with redistributed imagery; see the repository's third-party notices.
