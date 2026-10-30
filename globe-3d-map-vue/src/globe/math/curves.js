import { Vector3 } from "three"
import { lonLatToVector3, slerpUnitVectors } from "./geo.js"

/**
 * Build a raised great-circle path between two geographic coordinates.
 * @param {[number, number]} startCoordinate
 * @param {[number, number]} endCoordinate
 * @param {{radius?: number, height?: number, segments?: number, longitudeOffset?: number}} options
 * @returns {Vector3[]}
 */
export function buildGreatCirclePoints(startCoordinate, endCoordinate, options = {}) {
  const {
    radius = 50,
    height = 12,
    segments = 64,
    longitudeOffset = 0,
  } = options

  const safeSegments = Math.max(2, Math.round(segments))
  const start = lonLatToVector3(startCoordinate, 1, longitudeOffset)
  const end = lonLatToVector3(endCoordinate, 1, longitudeOffset)

  if (start.distanceToSquared(end) < 1e-12) {
    return [start.multiplyScalar(radius), end.multiplyScalar(radius)]
  }

  const points = []
  for (let index = 0; index <= safeSegments; index += 1) {
    const t = index / safeSegments
    const direction = slerpUnitVectors(start, end, t)
    const elevation = Math.sin(Math.PI * t) * height
    points.push(direction.multiplyScalar(radius + elevation))
  }

  return points
}

/**
 * Subdivide a surface segment according to its angular length.
 * @param {[number, number]} startCoordinate
 * @param {[number, number]} endCoordinate
 * @param {number} radius
 * @param {number} maxStepDegrees
 * @returns {Vector3[]}
 */
export function buildSurfaceSegment(
  startCoordinate,
  endCoordinate,
  radius,
  maxStepDegrees = 2
) {
  const start = lonLatToVector3(startCoordinate, 1)
  const end = lonLatToVector3(endCoordinate, 1)
  const angle = Math.acos(Math.min(1, Math.max(-1, start.dot(end))))
  const segmentCount = Math.max(1, Math.ceil(angle / (maxStepDegrees * Math.PI / 180)))
  const points = []

  for (let index = 0; index <= segmentCount; index += 1) {
    points.push(
      slerpUnitVectors(start, end, index / segmentCount).multiplyScalar(radius)
    )
  }

  return points
}

/**
 * Build a continuous raised spherical path through multiple coordinates.
 * Each leg follows the shortest great-circle arc.
 * @param {Array<[number, number]>} coordinates Ordered [longitude, latitude] degrees.
 * @param {{radius?: number, height?: number, segmentsPerLeg?: number, longitudeOffset?: number}} options
 * @returns {Vector3[]}
 */
export function buildWaypointCurvePoints(coordinates, options = {}) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new TypeError("A waypoint path requires at least two coordinates")
  }

  const {
    radius = 50,
    height = 1,
    segmentsPerLeg = 20,
    longitudeOffset = 0,
  } = options
  const points = []

  for (let index = 1; index < coordinates.length; index += 1) {
    const leg = buildGreatCirclePoints(coordinates[index - 1], coordinates[index], {
      radius,
      height,
      segments: segmentsPerLeg,
      longitudeOffset,
    })
    points.push(...(index === 1 ? leg : leg.slice(1)))
  }

  return points
}
