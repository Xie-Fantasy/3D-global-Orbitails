import { geoContains, geoDistance, geoInterpolate } from "d3-geo"
import { feature } from "topojson-client"
import landTopology from "world-atlas/land-110m.json"
import { normalizeLongitude } from "../math/geo"
import type { LonLat } from "../types/data"

// Derive the topojson types from `feature`'s own signature instead of importing
// `topojson-specification` directly (keeps the dependency tree lean).
type FeatureTopology = Parameters<typeof feature>[0]
type FeatureObject = Parameters<typeof feature>[1]

const landTopo = landTopology as FeatureTopology
const LAND_FEATURE = feature(landTopo, landTopo.objects.land as FeatureObject)

const NEIGHBOR_OFFSETS: readonly [number, number][] = Object.freeze([
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
])

interface SeaNode {
  readonly longitudeIndex: number
  readonly latitudeIndex: number
}

interface HeapNode {
  readonly key: string
  readonly node: SeaNode
  readonly score: number
}

class MinHeap {
  private readonly items: HeapNode[] = []

  push(item: HeapNode): void {
    this.items.push(item)
    let index = this.items.length - 1
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      const parent = this.items[parentIndex]
      if (!parent || parent.score <= item.score) {
        break
      }
      this.items[index] = parent
      index = parentIndex
    }
    this.items[index] = item
  }

  pop(): HeapNode {
    const length = this.items.length
    if (length === 0) {
      throw new Error("Cannot pop from an empty heap")
    }
    if (length === 1) {
      return this.items.pop()!
    }
    const first = this.items[0]!
    const last = this.items.pop()!
    let index = 0
    while (true) {
      const leftIndex = index * 2 + 1
      const rightIndex = leftIndex + 1
      if (leftIndex >= this.items.length) {
        break
      }
      const left = this.items[leftIndex]!
      const right = this.items[rightIndex]
      const childIndex =
        right && right.score < left.score ? rightIndex : leftIndex
      const child = this.items[childIndex]!
      if (child.score >= last.score) {
        break
      }
      this.items[index] = child
      index = childIndex
    }
    this.items[index] = last
    return first
  }

  get size(): number {
    return this.items.length
  }
}

function coordinatesAreClose(
  first: LonLat,
  second: LonLat,
  epsilon = 0.25,
): boolean {
  return geoDistance(first as [number, number], second as [number, number]) <=
    (epsilon * Math.PI) / 180
}

function deduplicateCoordinates(coordinates: LonLat[]): LonLat[] {
  return coordinates.filter(
    (coordinate, index) =>
      index === 0 ||
      !coordinatesAreClose(coordinates[index - 1]!, coordinate, 0.02),
  )
}

export interface SeaRoutePlannerOptions {
  readonly stepDegrees?: number
  readonly edgeSamples?: number
  readonly maximumVisitedNodes?: number
  readonly landCache?: Map<string, boolean>
}

export class SeaRoutePlanner {
  private readonly stepDegrees: number
  private readonly edgeSamples: number
  private readonly maximumVisitedNodes: number
  private readonly longitudeCount: number
  private readonly minimumLatitude = -88
  private readonly maximumLatitude = 88
  private readonly latitudeCount: number
  private readonly waterCache = new Map<string, boolean>()
  private readonly landCache: Map<string, boolean>
  private readonly edgeCache = new Map<string, boolean>()
  private readonly routeCache = new Map<string, LonLat[]>()
  private refinementPlanner: SeaRoutePlanner | null = null

  constructor(options: SeaRoutePlannerOptions = {}) {
    this.stepDegrees = options.stepDegrees ?? 4
    this.edgeSamples = options.edgeSamples ?? 2
    this.maximumVisitedNodes = options.maximumVisitedNodes ?? 50_000
    this.longitudeCount = Math.round(360 / this.stepDegrees)
    this.latitudeCount =
      Math.round(
        (this.maximumLatitude - this.minimumLatitude) / this.stepDegrees,
      ) + 1
    this.landCache = options.landCache ?? new Map<string, boolean>()
  }

  isLand(coordinate: LonLat): boolean {
    const normalized: [number, number] = [
      normalizeLongitude(coordinate[0]),
      Math.max(-90, Math.min(90, coordinate[1])),
    ]
    const key = `${normalized[0].toFixed(3)},${normalized[1].toFixed(3)}`
    if (!this.landCache.has(key)) {
      this.landCache.set(
        key,
        geoContains(LAND_FEATURE, normalized),
      )
    }
    return this.landCache.get(key)!
  }

  isWater(coordinate: LonLat): boolean {
    return !this.isLand(coordinate)
  }

  private coordinateToNode(coordinate: LonLat): SeaNode {
    const longitudeIndex =
      Math.round(
        (normalizeLongitude(coordinate[0]) + 180) / this.stepDegrees,
      ) % this.longitudeCount
    const latitudeIndex = Math.max(
      0,
      Math.min(
        this.latitudeCount - 1,
        Math.round((coordinate[1] - this.minimumLatitude) / this.stepDegrees),
      ),
    )
    return { longitudeIndex, latitudeIndex }
  }

  private nodeToCoordinate(node: SeaNode): LonLat {
    return [
      normalizeLongitude(-180 + node.longitudeIndex * this.stepDegrees),
      this.minimumLatitude + node.latitudeIndex * this.stepDegrees,
    ]
  }

  private getNodeKey(node: SeaNode): string {
    return `${node.longitudeIndex}:${node.latitudeIndex}`
  }

  private isWaterNode(node: SeaNode): boolean {
    const key = this.getNodeKey(node)
    if (!this.waterCache.has(key)) {
      this.waterCache.set(key, this.isWater(this.nodeToCoordinate(node)))
    }
    return this.waterCache.get(key)!
  }

  private findNearestWaterNode(coordinate: LonLat): SeaNode {
    const origin = this.coordinateToNode(coordinate)
    if (this.isWaterNode(origin)) {
      return origin
    }

    for (let radius = 1; radius <= 12; radius += 1) {
      let bestNode: SeaNode | null = null
      let bestDistance = Number.POSITIVE_INFINITY
      for (let y = -radius; y <= radius; y += 1) {
        for (let x = -radius; x <= radius; x += 1) {
          if (Math.abs(x) !== radius && Math.abs(y) !== radius) {
            continue
          }
          const latitudeIndex = origin.latitudeIndex + y
          if (latitudeIndex < 0 || latitudeIndex >= this.latitudeCount) {
            continue
          }
          const node: SeaNode = {
            longitudeIndex:
              (origin.longitudeIndex + x + this.longitudeCount) %
              this.longitudeCount,
            latitudeIndex,
          }
          if (!this.isWaterNode(node)) {
            continue
          }
          const distance = geoDistance(
            coordinate as [number, number],
            this.nodeToCoordinate(node) as [number, number],
          )
          if (distance < bestDistance) {
            bestDistance = distance
            bestNode = node
          }
        }
      }
      if (bestNode) {
        return bestNode
      }
    }

    throw new Error(
      `Unable to find navigable water near [${coordinate.join(", ")}]`,
    )
  }

  private getNeighborNodes(node: SeaNode): SeaNode[] {
    return NEIGHBOR_OFFSETS.map(([longitudeOffset, latitudeOffset]) => ({
      longitudeIndex:
        (node.longitudeIndex + longitudeOffset + this.longitudeCount) %
        this.longitudeCount,
      latitudeIndex: node.latitudeIndex + latitudeOffset,
    })).filter(
      (neighbor) =>
        neighbor.latitudeIndex >= 0 &&
        neighbor.latitudeIndex < this.latitudeCount &&
        this.isWaterNode(neighbor),
    )
  }

  private isWaterSegment(
    start: LonLat,
    end: LonLat,
    sampleCount = this.edgeSamples,
  ): boolean {
    const firstKey = `${start[0].toFixed(3)},${start[1].toFixed(3)}`
    const secondKey = `${end[0].toFixed(3)},${end[1].toFixed(3)}`
    const key =
      firstKey < secondKey
        ? `${firstKey}|${secondKey}|${sampleCount}`
        : `${secondKey}|${firstKey}|${sampleCount}`
    if (this.edgeCache.has(key)) {
      return this.edgeCache.get(key)!
    }

    const interpolate = geoInterpolate(
      start as [number, number],
      end as [number, number],
    )
    let waterOnly = true
    for (let index = 0; index <= sampleCount; index += 1) {
      if (this.isLand(interpolate(index / sampleCount) as [number, number])) {
        waterOnly = false
        break
      }
    }
    this.edgeCache.set(key, waterOnly)
    return waterOnly
  }

  private findPath(startNode: SeaNode, endNode: SeaNode): LonLat[] {
    const startKey = this.getNodeKey(startNode)
    const endKey = this.getNodeKey(endNode)
    const endCoordinate = this.nodeToCoordinate(endNode)
    const open = new MinHeap()
    const cameFrom = new Map<string, string | undefined>()
    const costs = new Map<string, number>([[startKey, 0]])
    const nodes = new Map<string, SeaNode>([[startKey, startNode]])
    let visitedNodes = 0

    open.push({
      key: startKey,
      node: startNode,
      score: geoDistance(
        this.nodeToCoordinate(startNode) as [number, number],
        endCoordinate as [number, number],
      ),
    })

    while (open.size > 0 && visitedNodes < this.maximumVisitedNodes) {
      const current = open.pop()
      visitedNodes += 1
      if (current.key === endKey) {
        const path: LonLat[] = []
        let key: string | undefined = endKey
        while (key) {
          path.push(this.nodeToCoordinate(nodes.get(key)!))
          key = cameFrom.get(key)
        }
        return path.reverse()
      }

      const currentCost = costs.get(current.key)!
      const currentCoordinate = this.nodeToCoordinate(current.node)
      for (const neighbor of this.getNeighborNodes(current.node)) {
        const neighborKey = this.getNodeKey(neighbor)
        const neighborCoordinate = this.nodeToCoordinate(neighbor)
        if (
          !this.isWaterSegment(
            currentCoordinate as [number, number],
            neighborCoordinate as [number, number],
            this.edgeSamples,
          )
        ) {
          continue
        }
        const nextCost =
          currentCost +
          geoDistance(
            currentCoordinate as [number, number],
            neighborCoordinate as [number, number],
          )
        if (
          nextCost >= (costs.get(neighborKey) ?? Number.POSITIVE_INFINITY)
        ) {
          continue
        }

        costs.set(neighborKey, nextCost)
        cameFrom.set(neighborKey, current.key)
        nodes.set(neighborKey, neighbor)
        open.push({
          key: neighborKey,
          node: neighbor,
          score:
            nextCost +
            geoDistance(
              neighborCoordinate as [number, number],
              endCoordinate as [number, number],
            ),
        })
      }
    }

    throw new Error("Unable to plan a sea-only route between the requested ports")
  }

  private simplifyPath(path: LonLat[]): LonLat[] {
    if (path.length <= 2) {
      return path
    }

    const simplified: LonLat[] = [path[0]!]
    let startIndex = 0
    while (startIndex < path.length - 1) {
      let endIndex = path.length - 1
      while (
        endIndex > startIndex + 1 &&
        !this.isWaterSegment(
          path[startIndex]!,
          path[endIndex]!,
          Math.max(
            6,
            Math.ceil(
              (geoDistance(
                path[startIndex]! as [number, number],
                path[endIndex]! as [number, number],
              ) *
                180) /
                Math.PI /
                0.5,
            ),
          ),
        )
      ) {
        endIndex -= 1
      }
      simplified.push(path[endIndex]!)
      startIndex = endIndex
    }
    return simplified
  }

  private isPreciselyWaterSegment(start: LonLat, end: LonLat): boolean {
    return this.isWaterSegment(
      start,
      end,
      Math.max(
        12,
        Math.ceil(
          (geoDistance(start as [number, number], end as [number, number]) *
            180) /
            Math.PI /
            0.25,
        ),
      ),
    )
  }

  private repairUnsafeSegments(path: LonLat[]): LonLat[] {
    const repaired: LonLat[] = [path[0]!]
    for (let index = 1; index < path.length; index += 1) {
      const start = repaired.at(-1)!
      const end = path[index]!
      if (this.isPreciselyWaterSegment(start, end)) {
        repaired.push(end)
        continue
      }
      if (this.stepDegrees <= 2) {
        throw new Error("Sea route refinement still intersects land")
      }

      const refinementStep = 2
      this.refinementPlanner ??= new SeaRoutePlanner({
        stepDegrees: refinementStep,
        edgeSamples: Math.max(4, Math.ceil(refinementStep / 0.25)),
        landCache: this.landCache,
        maximumVisitedNodes: this.maximumVisitedNodes,
      })
      const detour = this.refinementPlanner.plan(start, end)
      repaired.push(...detour.slice(1))
    }
    return deduplicateCoordinates(repaired)
  }

  plan(startCoordinate: LonLat, endCoordinate: LonLat): LonLat[] {
    const cacheKey = `${startCoordinate.join(",")}|${endCoordinate.join(",")}`
    const cached = this.routeCache.get(cacheKey)
    if (cached) {
      return cached.map((coordinate) => [
        coordinate[0],
        coordinate[1],
      ]) as LonLat[]
    }

    const startNode = this.findNearestWaterNode(startCoordinate)
    const endNode = this.findNearestWaterNode(endCoordinate)
    const waterPath = this.repairUnsafeSegments(
      this.simplifyPath(this.findPath(startNode, endNode)),
    )
    const coordinates = deduplicateCoordinates([
      [startCoordinate[0], startCoordinate[1]],
      ...waterPath,
      [endCoordinate[0], endCoordinate[1]],
    ])
    this.routeCache.set(cacheKey, coordinates)
    return coordinates.map((coordinate) => [
      coordinate[0],
      coordinate[1],
    ]) as LonLat[]
  }
}

export const DEFAULT_SEA_ROUTE_PLANNER = new SeaRoutePlanner()
