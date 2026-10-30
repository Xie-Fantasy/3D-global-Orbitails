import { describe, test, expect } from "vitest"
import { geoInterpolate } from "d3-geo"
import { SeaRoutePlanner } from "./SeaRoutePlanner"
import type { LonLat } from "../types/data"

const planner = new SeaRoutePlanner()

describe("SeaRoutePlanner", () => {
  test("classifies representative land and water coordinates", () => {
    expect(planner.isLand([135, -25] as [number, number])).toBe(true)
    expect(planner.isLand([120, -18] as [number, number])).toBe(false)
    expect(planner.isWater([80, -20] as [number, number])).toBe(true)
  })

  test("plans Singapore to Sydney around Australia", () => {
    const route = planner.plan(
      [103.8198, 1.3521] as LonLat,
      [151.2093, -33.8688] as LonLat,
    )

    expect(route.length).toBeGreaterThanOrEqual(4)
    expect(route[0]).toEqual([103.8198, 1.3521])
    expect(route[route.length - 1]).toEqual([151.2093, -33.8688])

    for (let index = 2; index < route.length - 1; index += 1) {
      const interpolate = geoInterpolate(
        route[index - 1]! as [number, number],
        route[index]! as [number, number],
      )
      for (let sample = 0; sample <= 12; sample += 1) {
        expect(
          planner.isLand(interpolate(sample / 12) as [number, number]),
        ).toBe(false)
      }
    }
  })

  test("reuses a cached route without sharing mutable coordinates", () => {
    const first = planner.plan(
      [113.2644, 23.1291] as LonLat,
      [103.8198, 1.3521] as LonLat,
    )
    const second = planner.plan(
      [113.2644, 23.1291] as LonLat,
      [103.8198, 1.3521] as LonLat,
    )

    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(second[0]).not.toBe(first[0])
  })
})
