import { describe, test, expect } from "vitest"
import type { RawLocation } from "../types/data"
import { GlobeDataService } from "./GlobeDataService"

const locations: RawLocation[] = [
  {
    id: "gz",
    name: "广州",
    country: "中国",
    coordinate: [473.2644, 23.1291] as [number, number],
    type: "hub",
    value: 100,
    priority: 10,
  },
  {
    id: "sin",
    name: "新加坡",
    country: "新加坡",
    coordinate: [103.8198, 1.3521] as [number, number],
    type: "port",
    value: 80,
    priority: 8,
  },
]

describe("GlobeDataService", () => {
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

    expect(
      Math.abs(service.getLocation("gz")!.coordinate[0] - 113.2644),
    ).toBeLessThan(1e-10)
    expect(service.getLocation("gz")!.coordinate[1]).toBe(23.1291)
    expect(service.flightRoutes[0]!.from.name).toBe("广州")
    expect(service.flightRoutes[0]!.to.name).toBe("新加坡")
  })

  test("rejects duplicate location ids", () => {
    expect(
      () => new GlobeDataService({ locations: [locations[0]!, locations[0]!] }),
    ).toThrow(/Duplicate location id/)
  })

  test("rejects invalid coordinates", () => {
    expect(
      () =>
        new GlobeDataService({
          locations: [{ ...locations[0]!, coordinate: [113, 91] }],
        }),
    ).toThrow(/invalid.*coordinate/)
  })

  test("rejects routes with missing endpoints", () => {
    expect(
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
    ).toThrow(/missing endpoint/)
  })

  test("rejects zero-length routes", () => {
    expect(
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
    ).toThrow(/two different locations/)
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
          waypoints: [[460, 12] as [number, number]],
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

    expect(service.landRoutes.length).toBe(1)
    expect(service.seaRoutes.length).toBe(1)
    expect(service.landRoutes[0]!.waypoints[0]!).toEqual([100, 12])
    expect(service.landRoutes[0]!.coordinates.length).toBe(3)
  })

  test("rejects invalid transport waypoints", () => {
    expect(
      () =>
        new GlobeDataService({
          locations,
          transportRoutes: [
            {
              id: "sea-invalid",
              kind: "sea",
              fromId: "gz",
              toId: "sin",
              waypoints: [[100, 95] as [number, number]],
            },
          ],
        }),
    ).toThrow(/waypoint 0.*invalid coordinate/)
  })

  test("rejects consecutive duplicate transport coordinates", () => {
    expect(
      () =>
        new GlobeDataService({
          locations,
          transportRoutes: [
            {
              id: "land-duplicate",
              kind: "land",
              fromId: "gz",
              toId: "sin",
              waypoints: [[473.2644, 23.1291] as [number, number]],
            },
          ],
        }),
    ).toThrow(/consecutive duplicate coordinates/)
  })

  test("rejects route kinds in the wrong collection", () => {
    expect(
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
    ).toThrow(/unsupported kind/)
  })

  test("rejects duplicate ids across flight and transport routes", () => {
    expect(
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
    ).toThrow(/Duplicate route id/)
  })
})
