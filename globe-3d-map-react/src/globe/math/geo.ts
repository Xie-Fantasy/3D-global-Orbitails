import { Vector3 } from "three"
import type { LonLat } from "../types/data"

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const EPSILON = 1e-8
const REFERENCE_UP = new Vector3(0, 1, 0)
const REFERENCE_RIGHT = new Vector3(1, 0, 0)

export function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) {
    return Number.NaN
  }
  const normalized = ((((longitude + 180) % 360) + 360) % 360) - 180
  return Object.is(normalized, -0) ? 0 : normalized
}

export function isValidLonLat(coordinate: unknown): coordinate is LonLat {
  if (!Array.isArray(coordinate)) {
    return false
  }
  if (coordinate.length < 2) {
    return false
  }
  const first: unknown = coordinate[0]
  const second: unknown = coordinate[1]
  return (
    typeof first === "number" &&
    Number.isFinite(first) &&
    typeof second === "number" &&
    Number.isFinite(second) &&
    second >= -90 &&
    second <= 90
  )
}

export function lonLatToVector3(
  coordinate: LonLat,
  radius: number,
  longitudeOffset = 0,
): Vector3 {
  if (!isValidLonLat(coordinate)) {
    throw new TypeError(
      `Invalid [longitude, latitude] coordinate: ${JSON.stringify(coordinate)}`,
    )
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError(`Radius must be a positive finite number: ${radius}`)
  }

  const longitude = normalizeLongitude(coordinate[0])
  const latitude = coordinate[1]
  const phi = (90 - latitude) * DEG_TO_RAD
  const theta = (longitude + 180 + longitudeOffset) * DEG_TO_RAD
  const sinPhi = Math.sin(phi)

  return new Vector3(
    -radius * sinPhi * Math.cos(theta),
    radius * Math.cos(phi),
    radius * sinPhi * Math.sin(theta),
  )
}

export function vector3ToLonLat(position: Vector3, longitudeOffset = 0): LonLat {
  const radius = position.length()
  if (radius < EPSILON) {
    throw new RangeError("Cannot convert the world origin to longitude/latitude")
  }

  const latitude = Math.asin(position.y / radius) * RAD_TO_DEG
  const theta = Math.atan2(position.z, -position.x) * RAD_TO_DEG
  const longitude = normalizeLongitude(theta - 180 - longitudeOffset)

  return [longitude, latitude]
}

export function slerpUnitVectors(
  startDirection: Vector3,
  endDirection: Vector3,
  t: number,
): Vector3 {
  const start = startDirection.clone().normalize()
  const end = endDirection.clone().normalize()
  const clampedT = Math.min(1, Math.max(0, t))
  const dot = Math.min(1, Math.max(-1, start.dot(end)))

  if (dot > 1 - EPSILON) {
    return start.lerp(end, clampedT).normalize()
  }

  if (dot < -1 + 1e-5) {
    const reference =
      Math.abs(start.dot(REFERENCE_UP)) < 0.9 ? REFERENCE_UP : REFERENCE_RIGHT
    const axis = new Vector3().crossVectors(start, reference).normalize()
    return start.applyAxisAngle(axis, Math.PI * clampedT).normalize()
  }

  const angle = Math.acos(dot)
  const sinAngle = Math.sin(angle)
  const startWeight = Math.sin((1 - clampedT) * angle) / sinAngle
  const endWeight = Math.sin(clampedT * angle) / sinAngle

  return start
    .multiplyScalar(startWeight)
    .add(end.multiplyScalar(endWeight))
    .normalize()
}

export function getHemisphereVisibility(
  surfacePosition: Vector3,
  cameraPosition: Vector3,
): number {
  const surfaceLength = surfacePosition.length()
  const toCameraDistance = cameraPosition.distanceTo(surfacePosition)
  if (surfaceLength < EPSILON || toCameraDistance < EPSILON) {
    return -1
  }

  return (
    (surfacePosition.dot(cameraPosition) - surfaceLength * surfaceLength) /
    (surfaceLength * toCameraDistance)
  )
}

export function isPointOnVisibleHemisphere(
  surfacePosition: Vector3,
  cameraPosition: Vector3,
  horizonThreshold = 0,
): boolean {
  return getHemisphereVisibility(surfacePosition, cameraPosition) > horizonThreshold
}
