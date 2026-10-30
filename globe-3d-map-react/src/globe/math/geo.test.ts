import { describe, test, expect } from "vitest"
import { Vector3 } from "three"
import type { LonLat } from "../types/data"
import {
  getHemisphereVisibility,
  isPointOnVisibleHemisphere,
  lonLatToVector3,
  normalizeLongitude,
  slerpUnitVectors,
  vector3ToLonLat,
} from "./geo"
import { buildGreatCirclePoints, buildWaypointCurvePoints } from "./curves"

const almostEqual = (actual: number, expected: number, epsilon = 1e-6) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(epsilon)
}

describe("geo math", () => {
  test("normalizeLongitude wraps values into [-180, 180]", () => {
    expect(normalizeLongitude(190)).toBe(-170)
    expect(normalizeLongitude(-190)).toBe(170)
    expect(normalizeLongitude(720)).toBe(0)
  })

  test("lonLatToVector3 preserves the configured radius", () => {
    const coordinates: LonLat[] = [
      [0, 0],
      [90, 0],
      [0, 90],
      [113.2644, 23.1291],
    ]
    coordinates.forEach((coordinate) => {
      almostEqual(lonLatToVector3(coordinate, 50).length(), 50)
    })
  })

  test("longitude/latitude round-trip is stable", () => {
    const original: LonLat = [113.2644, 23.1291]
    const result = vector3ToLonLat(lonLatToVector3(original, 50))
    almostEqual(result[0], original[0])
    almostEqual(result[1], original[1])
  })

  test("slerpUnitVectors remains finite for antipodal vectors", () => {
    const midpoint = slerpUnitVectors(
      new Vector3(1, 0, 0),
      new Vector3(-1, 0, 0),
      0.5,
    )
    almostEqual(midpoint.length(), 1)
    expect(Number.isFinite(midpoint.x)).toBe(true)
    expect(Number.isFinite(midpoint.y)).toBe(true)
    expect(Number.isFinite(midpoint.z)).toBe(true)
  })

  test("great-circle points keep endpoints on the surface and raise the midpoint", () => {
    const radius = 50
    const height = 12
    const points = buildGreatCirclePoints([170, 20] as LonLat, [-170, 25] as LonLat, {
      radius,
      height,
      segments: 32,
    })
    almostEqual(points[0]!.length(), radius)
    almostEqual(points[points.length - 1]!.length(), radius)
    almostEqual(points[16]!.length(), radius + height)
  })

  test("visible hemisphere test rejects the back of the globe", () => {
    const camera = new Vector3(150, 0, 0)
    const front = new Vector3(50, 0, 0)
    const back = new Vector3(-50, 0, 0)
    expect(isPointOnVisibleHemisphere(front, camera)).toBe(true)
    expect(isPointOnVisibleHemisphere(back, camera)).toBe(false)
    expect(getHemisphereVisibility(front, camera)).toBeGreaterThan(0)
    expect(getHemisphereVisibility(back, camera)).toBeLessThan(0)
  })

  test("waypoint paths remain continuous across the date line", () => {
    const radius = 50
    const points = buildWaypointCurvePoints(
      [
        [160, 20],
        [179, 24],
        [-160, 28],
      ] as LonLat[],
      { radius, height: 1.5, segmentsPerLeg: 12 },
    )
    almostEqual(points[0]!.length(), radius)
    almostEqual(points[points.length - 1]!.length(), radius)
    expect(points.length).toBe(25)
    expect(
      points.every((point) => Number.isFinite(point.length())),
    ).toBe(true)
  })
})
