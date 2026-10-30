import assert from "node:assert/strict"
import test from "node:test"
import { GlobeDiagnostics } from "./GlobeDiagnostics.js"
import { lonLatToVector3 } from "../math/geo.js"

test("reports stable frame, renderer, layer, and data metrics", () => {
  const diagnostics = new GlobeDiagnostics("medium")
  for (let index = 0; index < 60; index += 1) {
    diagnostics.recordFrame(1 / 60)
  }

  const layers = new Map([
    ["visible", { group: { visible: true } }],
    ["hidden", { group: { visible: false } }],
  ])
  const result = diagnostics.snapshot({
    camera: { position: lonLatToVector3([113.2644, 23.1291], 120) },
    dataService: {
      locations: [{}, {}],
      flightRoutes: [{}],
      landRoutes: [{}, {}],
      seaRoutes: [{}],
    },
    layers,
    renderer: {
      info: {
        render: { calls: 18, triangles: 2048, points: 900, lines: 3 },
        memory: { geometries: 12, textures: 2 },
      },
    },
  })

  assert.equal(result.quality, "medium")
  assert.equal(result.fps, 60)
  assert.equal(result.frameTime, 16.7)
  assert.equal(result.drawCalls, 18)
  assert.equal(result.triangles, 2048)
  assert.equal(result.visibleLayers, 1)
  assert.equal(result.totalLayers, 2)
  assert.equal(result.locationCount, 2)
  assert.equal(result.routeCount, 4)
  assert.ok(Math.abs(result.cameraCoordinate[0] - 113.2644) < 1e-6)
})

test("ignores invalid samples and keeps the last measured fps", () => {
  const diagnostics = new GlobeDiagnostics("low")
  diagnostics.recordFrame(Number.NaN)
  diagnostics.recordFrame(0)
  diagnostics.recordFrame(1 / 30)

  assert.equal(diagnostics.snapshot().fps, 30)
  assert.equal(diagnostics.snapshot().fps, 30)
})
