import assert from "node:assert/strict"
import test from "node:test"
import { GlobeDataService } from "./GlobeDataService.js"

const locations = [
  {
    id: "gz",
    name: "广州",
    country: "中国",
    coordinate: [473.2644, 23.1291],
    type: "hub",
    value: 100,
    priority: 10,
  },
  {
    id: "sin",
    name: "新加坡",
    country: "新加坡",
    coordinate: [103.8198, 1.3521],
    type: "port",
    value: 80,
    priority: 8,
  },
]

test("normalizes longitudes and resolves route endpoint records", () => {
  const service = new GlobeDataService({
    locations,
    flightRoutes: [
      {
        id: "gz-sin",
        kind: "flight",
        fromId: "gz",
        toId: "sin",
        value: 88,
        priority: 9,
      },
    ],
  })

  assert.ok(Math.abs(service.getLocation("gz").coordinate[0] - 113.2644) < 1e-10)
  assert.equal(service.getLocation("gz").coordinate[1], 23.1291)
  assert.equal(service.flightRoutes[0].from.name, "广州")
  assert.equal(service.flightRoutes[0].to.name, "新加坡")
})

test("rejects duplicate location ids", () => {
  assert.throws(
    () => new GlobeDataService({ locations: [locations[0], locations[0]] }),
    /Duplicate location id/
  )
})

test("rejects invalid coordinates", () => {
  assert.throws(
    () =>
      new GlobeDataService({
        locations: [{ ...locations[0], coordinate: [113, 91] }],
      }),
    /invalid.*coordinate/
  )
})

test("rejects routes with missing endpoints", () => {
  assert.throws(
    () =>
      new GlobeDataService({
        locations,
        flightRoutes: [
          {
            id: "gz-missing",
            kind: "flight",
            fromId: "gz",
            toId: "missing",
          },
        ],
      }),
    /missing endpoint/
  )
})

test("rejects zero-length routes", () => {
  assert.throws(
    () =>
      new GlobeDataService({
        locations,
        flightRoutes: [
          {
            id: "gz-gz",
            kind: "flight",
            fromId: "gz",
            toId: "gz",
          },
        ],
      }),
    /two different locations/
  )
})

test("normalizes transport waypoints and separates route kinds", () => {
  const service = new GlobeDataService({
    locations,
    transportRoutes: [
      {
        id: "land-gz-sin",
        kind: "land",
        fromId: "gz",
        toId: "sin",
        waypoints: [[460, 12]],
        value: 50,
        priority: 4,
      },
      {
        id: "sea-gz-sin",
        kind: "sea",
        fromId: "gz",
        toId: "sin",
        waypoints: [],
        value: 80,
        priority: 8,
      },
    ],
  })

  assert.equal(service.landRoutes.length, 1)
  assert.equal(service.seaRoutes.length, 1)
  assert.deepEqual(service.landRoutes[0].waypoints[0], [100, 12])
  assert.equal(service.landRoutes[0].coordinates.length, 3)
})

test("rejects invalid transport waypoints", () => {
  assert.throws(
    () =>
      new GlobeDataService({
        locations,
        transportRoutes: [
          {
            id: "sea-invalid",
            kind: "sea",
            fromId: "gz",
            toId: "sin",
            waypoints: [[100, 95]],
          },
        ],
      }),
    /waypoint 0.*invalid coordinate/
  )
})

test("rejects consecutive duplicate transport coordinates", () => {
  assert.throws(
    () =>
      new GlobeDataService({
        locations,
        transportRoutes: [
          {
            id: "land-duplicate",
            kind: "land",
            fromId: "gz",
            toId: "sin",
            waypoints: [[473.2644, 23.1291]],
          },
        ],
      }),
    /consecutive duplicate coordinates/
  )
})

test("rejects route kinds in the wrong collection", () => {
  assert.throws(
    () =>
      new GlobeDataService({
        locations,
        flightRoutes: [
          {
            id: "land-in-flight",
            kind: "land",
            fromId: "gz",
            toId: "sin",
          },
        ],
      }),
    /unsupported kind/
  )
})

test("rejects duplicate ids across flight and transport routes", () => {
  assert.throws(
    () =>
      new GlobeDataService({
        locations,
        flightRoutes: [
          {
            id: "shared-route",
            kind: "flight",
            fromId: "gz",
            toId: "sin",
          },
        ],
        transportRoutes: [
          {
            id: "shared-route",
            kind: "sea",
            fromId: "gz",
            toId: "sin",
          },
        ],
      }),
    /Duplicate route id/
  )
})
