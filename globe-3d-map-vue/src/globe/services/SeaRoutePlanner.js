import { geoContains, geoDistance, geoInterpolate } from "d3-geo"
import { feature } from "topojson-client"
import landTopology from "world-atlas/land-110m.json" with { type: "json" }
import { normalizeLongitude } from "../math/geo.js"

const LAND_FEATURE = feature(landTopology, landTopology.objects.land)
const NEIGHBOR_OFFSETS = Object.freeze([
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
])

class MinHeap {
  constructor() {
    this.items = []
  }

  push(item) {
    this.items.push(item)
    let index = this.items.length - 1
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.items[parentIndex].score <= item.score) {
        break
      }
      this.items[index] = this.items[parentIndex]
      index = parentIndex
    }
    this.items[index] = item
  }

  pop() {
    if (this.items.length === 1) {
      return this.items.pop()
    }
    const first = this.items[0]
    const last = this.items.pop()
    let index = 0
    while (true) {
      const leftIndex = index * 2 + 1
      const rightIndex = leftIndex + 1
      if (leftIndex >= this.items.length) {
        break
      }
      const childIndex =
        rightIndex < this.items.length &&
        this.items[rightIndex].score < this.items[leftIndex].score
          ? rightIndex
          : leftIndex
      if (this.items[childIndex].score >= last.score) {
        break
      }
      this.items[index] = this.items[childIndex]
      index = childIndex
    }
    this.items[index] = last
    return first
  }

  get size() {
    return this.items.length
  }
}

function coordinatesAreClose(first, second, epsilon = 0.25) {
  return geoDistance(first, second) <= epsilon * Math.PI / 180
}

function deduplicateCoordinates(coordinates) {
  return coordinates.filter(
    (coordinate, index) =>
      index === 0 || !coordinatesAreClose(coordinates[index - 1], coordinate, 0.02)
  )
}

export class SeaRoutePlanner {
  constructor(options = {}) {
    this.stepDegrees = options.stepDegrees ?? 4
    this.edgeSamples = options.edgeSamples ?? 2
    this.maximumVisitedNodes = options.maximumVisitedNodes ?? 50_000
    this.longitudeCount = Math.round(360 / this.stepDegrees)
    this.minimumLatitude = -88
    this.maximumLatitude = 88
    this.latitudeCount =
      Math.round(
        (this.maximumLatitude - this.minimumLatitude) / this.stepDegrees
      ) + 1
    this.waterCache = new Map()
    this.landCache = options.landCache ?? new Map()
    this.edgeCache = new Map()
    this.routeCache = new Map()
    this.refinementPlanner = null
  }

  /**
   * Tests a longitude/latitude point against Natural Earth land polygons.
   * This is a visualization mask, not a nautical chart.
   * @param {[number, number]} coordinate [longitude, latitude] degrees.
   * @returns {boolean}
   */
  isLand(coordinate) {
    const normalized = [
      normalizeLongitude(coordinate[0]),
      Math.max(-90, Math.min(90, coordinate[1])),
    ]
    const key = `${normalized[0].toFixed(3)},${normalized[1].toFixed(3)}`
    if (!this.landCache.has(key)) {
      this.landCache.set(key, geoContains(LAND_FEATURE, normalized))
    }
    return this.landCache.get(key)
  }

  isWater(coordinate) {
    return !this.isLand(coordinate)
  }

  coordinateToNode(coordinate) {
    const longitudeIndex =
      Math.round(
        (normalizeLongitude(coordinate[0]) + 180) / this.stepDegrees
      ) % this.longitudeCount
    const latitudeIndex = Math.max(
      0,
      Math.min(
        this.latitudeCount - 1,
        Math.round(
          (coordinate[1] - this.minimumLatitude) / this.stepDegrees
        )
      )
    )
    return { longitudeIndex, latitudeIndex }
  }

  nodeToCoordinate(node) {
    return [
      normalizeLongitude(-180 + node.longitudeIndex * this.stepDegrees),
      this.minimumLatitude + node.latitudeIndex * this.stepDegrees,
    ]
  }

  getNodeKey(node) {
    return `${node.longitudeIndex}:${node.latitudeIndex}`
  }

  isWaterNode(node) {
    const key = this.getNodeKey(node)
    if (!this.waterCache.has(key)) {
      this.waterCache.set(key, this.isWater(this.nodeToCoordinate(node)))
    }
    return this.waterCache.get(key)
  }

  findNearestWaterNode(coordinate) {
    const origin = this.coordinateToNode(coordinate)
    if (this.isWaterNode(origin)) {
      return origin
    }

    for (let radius = 1; radius <= 12; radius += 1) {
      let bestNode = null
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
          const node = {
            longitudeIndex:
              (origin.longitudeIndex + x + this.longitudeCount) %
              this.longitudeCount,
            latitudeIndex,
          }
          if (!this.isWaterNode(node)) {
            continue
          }
          const distance = geoDistance(
            coordinate,
            this.nodeToCoordinate(node)
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
      `Unable to find navigable water near [${coordinate.join(", ")}]`
    )
  }

  getNeighborNodes(node) {
    return NEIGHBOR_OFFSETS.map(([longitudeOffset, latitudeOffset]) => ({
      longitudeIndex:
        (node.longitudeIndex + longitudeOffset + this.longitudeCount) %
        this.longitudeCount,
      latitudeIndex: node.latitudeIndex + latitudeOffset,
    })).filter(
      (neighbor) =>
        neighbor.latitudeIndex >= 0 &&
        neighbor.latitudeIndex < this.latitudeCount &&
        this.isWaterNode(neighbor)
    )
  }

  isWaterSegment(start, end, sampleCount = this.edgeSamples) {
    const firstKey = `${start[0].toFixed(3)},${start[1].toFixed(3)}`
    const secondKey = `${end[0].toFixed(3)},${end[1].toFixed(3)}`
    const key =
      firstKey < secondKey
        ? `${firstKey}|${secondKey}|${sampleCount}`
        : `${secondKey}|${firstKey}|${sampleCount}`
    if (this.edgeCache.has(key)) {
      return this.edgeCache.get(key)
    }

    const interpolate = geoInterpolate(start, end)
    let waterOnly = true
    for (let index = 0; index <= sampleCount; index += 1) {
      if (this.isLand(interpolate(index / sampleCount))) {
        waterOnly = false
        break
      }
    }
    this.edgeCache.set(key, waterOnly)
    return waterOnly
  }

  findPath(startNode, endNode) {
    const startKey = this.getNodeKey(startNode)
    const endKey = this.getNodeKey(endNode)
    const endCoordinate = this.nodeToCoordinate(endNode)
    const open = new MinHeap()
    const cameFrom = new Map()
    const costs = new Map([[startKey, 0]])
    const nodes = new Map([[startKey, startNode]])
    let visitedNodes = 0

    open.push({
      key: startKey,
      node: startNode,
      score: geoDistance(this.nodeToCoordinate(startNode), endCoordinate),
    })

    while (open.size > 0 && visitedNodes < this.maximumVisitedNodes) {
      const current = open.pop()
      visitedNodes += 1
      if (current.key === endKey) {
        const path = []
        let key = endKey
        while (key) {
          path.push(this.nodeToCoordinate(nodes.get(key)))
          key = cameFrom.get(key)
        }
        return path.reverse()
      }

      const currentCost = costs.get(current.key)
      const currentCoordinate = this.nodeToCoordinate(current.node)
      this.getNeighborNodes(current.node).forEach((neighbor) => {
        const neighborKey = this.getNodeKey(neighbor)
        const neighborCoordinate = this.nodeToCoordinate(neighbor)
        if (
          !this.isWaterSegment(
            currentCoordinate,
            neighborCoordinate,
            this.edgeSamples
          )
        ) {
          return
        }
        const nextCost =
          currentCost + geoDistance(currentCoordinate, neighborCoordinate)
        if (nextCost >= (costs.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
          return
        }

        costs.set(neighborKey, nextCost)
        cameFrom.set(neighborKey, current.key)
        nodes.set(neighborKey, neighbor)
        open.push({
          key: neighborKey,
          node: neighbor,
          score: nextCost + geoDistance(neighborCoordinate, endCoordinate),
        })
      })
    }

    throw new Error("Unable to plan a sea-only route between the requested ports")
  }

  simplifyPath(path) {
    if (path.length <= 2) {
      return path
    }

    const simplified = [path[0]]
    let startIndex = 0
    while (startIndex < path.length - 1) {
      let endIndex = path.length - 1
      while (
        endIndex > startIndex + 1 &&
        !this.isWaterSegment(
          path[startIndex],
          path[endIndex],
          Math.max(
            6,
            Math.ceil(
              geoDistance(path[startIndex], path[endIndex]) *
              180 /
              Math.PI /
              0.5
            )
          )
        )
      ) {
        endIndex -= 1
      }
      simplified.push(path[endIndex])
      startIndex = endIndex
    }
    return simplified
  }

  isPreciselyWaterSegment(start, end) {
    return this.isWaterSegment(
      start,
      end,
      Math.max(
        12,
        Math.ceil(
          geoDistance(start, end) * 180 / Math.PI / 0.25
        )
      )
    )
  }

  repairUnsafeSegments(path) {
    const repaired = [path[0]]
    for (let index = 1; index < path.length; index += 1) {
      const start = repaired.at(-1)
      const end = path[index]
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

  /**
   * Plans a water-only visualization route and preserves short port connectors.
   * @param {[number, number]} startCoordinate [longitude, latitude] degrees.
   * @param {[number, number]} endCoordinate [longitude, latitude] degrees.
   * @returns {Array<[number, number]>}
   */
  plan(startCoordinate, endCoordinate) {
    const cacheKey = `${startCoordinate.join(",")}|${endCoordinate.join(",")}`
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey).map((coordinate) => [...coordinate])
    }

    const startNode = this.findNearestWaterNode(startCoordinate)
    const endNode = this.findNearestWaterNode(endCoordinate)
    const waterPath = this.repairUnsafeSegments(
      this.simplifyPath(this.findPath(startNode, endNode))
    )
    const coordinates = deduplicateCoordinates([
      [...startCoordinate],
      ...waterPath,
      [...endCoordinate],
    ])
    this.routeCache.set(cacheKey, coordinates)
    return coordinates.map((coordinate) => [...coordinate])
  }
}

export const DEFAULT_SEA_ROUTE_PLANNER = new SeaRoutePlanner()
