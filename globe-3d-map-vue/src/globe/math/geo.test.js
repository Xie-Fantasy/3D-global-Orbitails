import assert from "node:assert/strict"
import test from "node:test"
import { Vector3 } from "three"
import {
  getHemisphereVisibility,
  isPointOnVisibleHemisphere,
  lonLatToVector3,
  normalizeLongitude,
  slerpUnitVectors,
  vector3ToLonLat,
} from "./geo.js"
import { buildGreatCirclePoints, buildWaypointCurvePoints } from "./curves.js"

const almostEqual = (actual, expected, epsilon = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≉ ${expected}`)
}

test("normalizeLongitude wraps values into [-180, 180]", () => {
  assert.equal(normalizeLongitude(190), -170)
  assert.equal(normalizeLongitude(-190), 170)
  assert.equal(normalizeLongitude(720), 0)
})

test("lonLatToVector3 preserves the configured radius", () => {
  const coordinates = [
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
  const original = [113.2644, 23.1291]
  const result = vector3ToLonLat(lonLatToVector3(original, 50))
  almostEqual(result[0], original[0])
  almostEqual(result[1], original[1])
})

test("slerpUnitVectors remains finite for antipodal vectors", () => {
  const midpoint = slerpUnitVectors(new Vector3(1, 0, 0), new Vector3(-1, 0, 0), 0.5)
  almostEqual(midpoint.length(), 1)
  assert.ok(Number.isFinite(midpoint.x))
  assert.ok(Number.isFinite(midpoint.y))
  assert.ok(Number.isFinite(midpoint.z))
})

test("great-circle points keep endpoints on the surface and raise the midpoint", () => {
  const radius = 50
  const height = 12
  const points = buildGreatCirclePoints([170, 20], [-170, 25], {
    radius,
    height,
    segments: 32,
  })

  almostEqual(points[0].length(), radius)
  almostEqual(points.at(-1).length(), radius)
  almostEqual(points[16].length(), radius + height)
})

test("visible hemisphere test rejects the back of the globe", () => {
  const camera = new Vector3(150, 0, 0)
  const front = new Vector3(50, 0, 0)
  const back = new Vector3(-50, 0, 0)
  assert.equal(isPointOnVisibleHemisphere(front, camera), true)
  assert.equal(isPointOnVisibleHemisphere(back, camera), false)
  assert.ok(getHemisphereVisibility(front, camera) > 0)
  assert.ok(getHemisphereVisibility(back, camera) < 0)
})

test("waypoint paths remain continuous across the date line", () => {
  const radius = 50
  const points = buildWaypointCurvePoints(
    [
      [160, 20],
      [179, 24],
      [-160, 28],
    ],
    {
      radius,
      height: 1.5,
      segmentsPerLeg: 12,
    }
  )

  almostEqual(points[0].length(), radius)
  almostEqual(points.at(-1).length(), radius)
  assert.equal(points.length, 25)
  assert.ok(points.every((point) => Number.isFinite(point.length())))
})
