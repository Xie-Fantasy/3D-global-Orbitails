import { Vector3 } from "three"

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const EPSILON = 1e-8
const REFERENCE_UP = new Vector3(0, 1, 0)
const REFERENCE_RIGHT = new Vector3(1, 0, 0)

/**
 * Normalize longitude to the inclusive range [-180, 180].
 * @param {number} longitude Longitude in degrees.
 * @returns {number}
 */
export function normalizeLongitude(longitude) {
  if (!Number.isFinite(longitude)) {
    return Number.NaN
  }

  const normalized = ((((longitude + 180) % 360) + 360) % 360) - 180
  return Object.is(normalized, -0) ? 0 : normalized
}

/**
 * Validate a geographic coordinate in [longitude, latitude] order.
 * @param {unknown} coordinate
 * @returns {coordinate is [number, number]}
 */
export function isValidLonLat(coordinate) {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1]) &&
    coordinate[1] >= -90 &&
    coordinate[1] <= 90
  )
}

/**
 * Convert [longitude, latitude] degrees to a Three.js world position.
 * The coordinate system is right-handed with Y pointing north/up.
 * @param {[number, number]} coordinate
 * @param {number} radius World-space radius.
 * @param {number} longitudeOffset Rotation offset in degrees.
 * @returns {Vector3}
 */
export function lonLatToVector3(coordinate, radius, longitudeOffset = 0) {
  if (!isValidLonLat(coordinate)) {
    throw new TypeError(`Invalid [longitude, latitude] coordinate: ${coordinate}`)
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
    radius * sinPhi * Math.sin(theta)
  )
}

/**
 * Convert a Three.js world position back to [longitude, latitude] degrees.
 * @param {Vector3} position
 * @param {number} longitudeOffset Rotation offset in degrees.
 * @returns {[number, number]}
 */
export function vector3ToLonLat(position, longitudeOffset = 0) {
  const radius = position.length()
  if (radius < EPSILON) {
    throw new RangeError("Cannot convert the world origin to longitude/latitude")
  }

  const latitude = Math.asin(position.y / radius) * RAD_TO_DEG
  const theta = Math.atan2(position.z, -position.x) * RAD_TO_DEG
  const longitude = normalizeLongitude(theta - 180 - longitudeOffset)

  return [longitude, latitude]
}

/**
 * Robust spherical interpolation between two normalized directions.
 * Handles coincident and near-antipodal vectors without producing NaN.
 * @param {Vector3} startDirection
 * @param {Vector3} endDirection
 * @param {number} t Interpolation value in [0, 1].
 * @returns {Vector3}
 */
export function slerpUnitVectors(startDirection, endDirection, t) {
  const start = startDirection.clone().normalize()
  const end = endDirection.clone().normalize()
  const clampedT = Math.min(1, Math.max(0, t))
  const dot = Math.min(1, Math.max(-1, start.dot(end)))

  if (dot > 1 - EPSILON) {
    return start.lerp(end, clampedT).normalize()
  }

  if (dot < -1 + 1e-5) {
    const reference = Math.abs(start.dot(REFERENCE_UP)) < 0.9 ? REFERENCE_UP : REFERENCE_RIGHT
    const axis = new Vector3().crossVectors(start, reference).normalize()
    return start.applyAxisAngle(axis, Math.PI * clampedT).normalize()
  }

  const angle = Math.acos(dot)
  const sinAngle = Math.sin(angle)
  const startWeight = Math.sin((1 - clampedT) * angle) / sinAngle
  const endWeight = Math.sin(clampedT * angle) / sinAngle

  return start.multiplyScalar(startWeight).add(end.multiplyScalar(endWeight)).normalize()
}

/**
 * Return the signed visibility of a surface point from the camera.
 * Positive values face the camera; zero is the geometric horizon.
 * @param {Vector3} surfacePosition
 * @param {Vector3} cameraPosition
 * @returns {number}
 */
export function getHemisphereVisibility(surfacePosition, cameraPosition) {
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

/**
 * Return whether a surface point is on the camera-facing hemisphere.
 * @param {Vector3} surfacePosition
 * @param {Vector3} cameraPosition
 * @param {number} horizonThreshold
 * @returns {boolean}
 */
export function isPointOnVisibleHemisphere(surfacePosition, cameraPosition, horizonThreshold = 0) {
  return getHemisphereVisibility(surfacePosition, cameraPosition) > horizonThreshold
}
