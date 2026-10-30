import { Vector3 } from "three"
import type { LonLat } from "../types/data"
import { lonLatToVector3, slerpUnitVectors } from "./geo"

export interface CurveOptions {
  readonly radius?: number
  readonly height?: number
  readonly segments?: number
  readonly segmentsPerLeg?: number
  readonly longitudeOffset?: number
}

export function buildGreatCirclePoints(
  startCoordinate: LonLat,
  endCoordinate: LonLat,
  options: CurveOptions = {},
): Vector3[] {
  const radius = options.radius ?? 50
  const height = options.height ?? 12
  const segments = options.segments ?? 64
  const longitudeOffset = options.longitudeOffset ?? 0

  const safeSegments = Math.max(2, Math.round(segments))
  const start = lonLatToVector3(startCoordinate, 1, longitudeOffset)
  const end = lonLatToVector3(endCoordinate, 1, longitudeOffset)

  if (start.distanceToSquared(end) < 1e-12) {
    return [start.multiplyScalar(radius), end.multiplyScalar(radius)]
  }

  const points: Vector3[] = []
  for (let index = 0; index <= safeSegments; index += 1) {
    const t = index / safeSegments
    const direction = slerpUnitVectors(start, end, t)
    const elevation = Math.sin(Math.PI * t) * height
    points.push(direction.multiplyScalar(radius + elevation))
  }

  return points
}

export function buildSurfaceSegment(
  startCoordinate: LonLat,
  endCoordinate: LonLat,
  radius: number,
  maxStepDegrees = 2,
): Vector3[] {
  const start = lonLatToVector3(startCoordinate, 1)
  const end = lonLatToVector3(endCoordinate, 1)
  const angle = Math.acos(Math.min(1, Math.max(-1, start.dot(end))))
  const segmentCount = Math.max(
    1,
    Math.ceil(angle / ((maxStepDegrees * Math.PI) / 180)),
  )
  const points: Vector3[] = []

  for (let index = 0; index <= segmentCount; index += 1) {
    points.push(
      slerpUnitVectors(start, end, index / segmentCount).multiplyScalar(radius),
    )
  }

  return points
}

export function buildWaypointCurvePoints(
  coordinates: readonly LonLat[],
  options: CurveOptions = {},
): Vector3[] {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new TypeError("A waypoint path requires at least two coordinates")
  }

  const radius = options.radius ?? 50
  const height = options.height ?? 1
  const segmentsPerLeg = options.segmentsPerLeg ?? 20
  const longitudeOffset = options.longitudeOffset ?? 0
  const points: Vector3[] = []

  for (let index = 1; index < coordinates.length; index += 1) {
    const leg = buildGreatCirclePoints(
      coordinates[index - 1]!,
      coordinates[index]!,
      { radius, height, segments: segmentsPerLeg, longitudeOffset },
    )
    points.push(...(index === 1 ? leg : leg.slice(1)))
  }

  return points
}
