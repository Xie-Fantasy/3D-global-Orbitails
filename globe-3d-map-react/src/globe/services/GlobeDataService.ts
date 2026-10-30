import type {
  GlobeDataInput,
  GlobeDataSnapshot,
  LocationRecord,
  LocationType,
  LonLat,
  RawLocation,
  RawRoute,
  RouteKind,
  RouteRecord,
  RouteRoutingMode,
  TransportRouteRecord,
} from "../types/data"
import { isValidLonLat, normalizeLongitude } from "../math/geo"
import { DEFAULT_SEA_ROUTE_PLANNER } from "./SeaRoutePlanner"

const LOCATION_TYPES: ReadonlySet<string> = new Set(["hub", "city", "port"])
const ROUTE_KINDS: ReadonlySet<string> = new Set(["flight", "land", "sea"])
const FLIGHT_KINDS: ReadonlySet<string> = new Set(["flight"])
const TRANSPORT_KINDS: ReadonlySet<string> = new Set(["land", "sea"])

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string`)
  }
  return value.trim()
}

function requireFiniteNumber(
  value: unknown,
  fieldName: string,
  minimum = 0,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum
  ) {
    throw new TypeError(`${fieldName} must be a finite number >= ${minimum}`)
  }
  return value
}

function normalizeLocation(location: unknown): LocationRecord {
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw new TypeError("Location must be an object")
  }
  const record = location as Record<string, unknown>
  const id = requireNonEmptyString(record.id, "Location id")

  if (!isValidLonLat(record.coordinate)) {
    throw new TypeError(
      `Location "${id}" has an invalid [longitude, latitude] coordinate`,
    )
  }
  const coordinate = record.coordinate

  const typeRaw = record.type ?? "city"
  const type = requireNonEmptyString(typeRaw, `Location "${id}" type`)
  if (!LOCATION_TYPES.has(type)) {
    throw new TypeError(`Location "${id}" has unsupported type "${type}"`)
  }

  const coordinateTuple: LonLat = [
    normalizeLongitude(coordinate[0]),
    coordinate[1],
  ]

  return Object.freeze({
    id,
    name: requireNonEmptyString(record.name, `Location "${id}" name`),
    nameZh: requireNonEmptyString(
      record.nameZh ?? record.name,
      `Location "${id}" Chinese name`,
    ),
    country: requireNonEmptyString(record.country, `Location "${id}" country`),
    countryZh: requireNonEmptyString(
      record.countryZh ?? record.country,
      `Location "${id}" Chinese country`,
    ),
    coordinate: Object.freeze(coordinateTuple),
    type: type as LocationType,
    value: requireFiniteNumber(record.value ?? 0, `Location "${id}" value`),
    priority: requireFiniteNumber(
      record.priority ?? 0,
      `Location "${id}" priority`,
    ),
  })
}

function normalizeRoute(
  route: unknown,
  locationById: Map<string, LocationRecord>,
  allowedKinds: ReadonlySet<string>,
): RouteRecord {
  if (!route || typeof route !== "object" || Array.isArray(route)) {
    throw new TypeError("Route must be an object")
  }
  const record = route as Record<string, unknown>
  const id = requireNonEmptyString(record.id, "Route id")
  const fromId = requireNonEmptyString(record.fromId, `Route "${id}" fromId`)
  const toId = requireNonEmptyString(record.toId, `Route "${id}" toId`)
  const kind = requireNonEmptyString(record.kind, `Route "${id}" kind`)

  if (!ROUTE_KINDS.has(kind) || !allowedKinds.has(kind)) {
    throw new TypeError(`Route "${id}" has unsupported kind "${kind}"`)
  }
  if (fromId === toId) {
    throw new TypeError(`Route "${id}" must connect two different locations`)
  }
  const from = locationById.get(fromId)
  const to = locationById.get(toId)
  if (!from || !to) {
    throw new TypeError(`Route "${id}" references a missing endpoint`)
  }

  return Object.freeze({
    id,
    kind: kind as RouteKind,
    fromId,
    toId,
    value: requireFiniteNumber(record.value ?? 0, `Route "${id}" value`),
    priority: requireFiniteNumber(
      record.priority ?? 0,
      `Route "${id}" priority`,
    ),
    from,
    to,
  })
}

function coordinatesAreEqual(
  first: LonLat,
  second: LonLat,
  epsilon = 1e-10,
): boolean {
  return (
    Math.abs(first[0] - second[0]) <= epsilon &&
    Math.abs(first[1] - second[1]) <= epsilon
  )
}

function normalizeTransportRoute(
  route: unknown,
  locationById: Map<string, LocationRecord>,
): TransportRouteRecord {
  const normalizedRoute = normalizeRoute(route, locationById, TRANSPORT_KINDS)
  const record = route as Record<string, unknown>
  const waypointsRaw = record.waypoints ?? []
  if (!Array.isArray(waypointsRaw)) {
    throw new TypeError(
      `Route "${normalizedRoute.id}" waypoints must be an array`,
    )
  }

  const normalizedWaypoints: LonLat[] = waypointsRaw.map((coordinate, index) => {
    if (!isValidLonLat(coordinate)) {
      throw new TypeError(
        `Route "${normalizedRoute.id}" waypoint ${index} has an invalid coordinate`,
      )
    }
    return Object.freeze([
      normalizeLongitude(coordinate[0]),
      coordinate[1],
    ]) as LonLat
  })

  const manualCoordinates: LonLat[] = [
    normalizedRoute.from.coordinate,
    ...normalizedWaypoints,
    normalizedRoute.to.coordinate,
  ]

  for (let index = 1; index < manualCoordinates.length; index += 1) {
    if (
      coordinatesAreEqual(
        manualCoordinates[index - 1]!,
        manualCoordinates[index]!,
      )
    ) {
      throw new TypeError(
        `Route "${normalizedRoute.id}" has consecutive duplicate coordinates`,
      )
    }
  }

  const routingRaw =
    record.routing ??
    (normalizedRoute.kind === "sea" ? "auto-sea" : "manual")
  const routing = requireNonEmptyString(
    routingRaw,
    `Route "${normalizedRoute.id}" routing`,
  )
  if (!["manual", "auto-sea"].includes(routing)) {
    throw new TypeError(
      `Route "${normalizedRoute.id}" has unsupported routing "${routing}"`,
    )
  }
  if (routing === "auto-sea" && normalizedRoute.kind !== "sea") {
    throw new TypeError(
      `Route "${normalizedRoute.id}" can only use auto-sea routing when kind is sea`,
    )
  }

  const coordinates: LonLat[] =
    routing === "auto-sea"
      ? DEFAULT_SEA_ROUTE_PLANNER.plan(
          normalizedRoute.from.coordinate,
          normalizedRoute.to.coordinate,
        )
      : manualCoordinates

  return Object.freeze({
    ...normalizedRoute,
    routing: routing as RouteRoutingMode,
    waypoints: Object.freeze(normalizedWaypoints),
    coordinates: Object.freeze(
      coordinates.map((coordinate) => Object.freeze(coordinate) as LonLat),
    ),
  })
}

function assertUniqueIds(
  items: readonly { readonly id: string }[],
  itemName: string,
): void {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new TypeError(`Duplicate ${itemName} id "${item.id}"`)
    }
    ids.add(item.id)
  }
}

export class GlobeDataService {
  readonly locations: readonly LocationRecord[]
  readonly locationById: Map<string, LocationRecord>
  readonly flightRoutes: readonly RouteRecord[]
  readonly transportRoutes: readonly TransportRouteRecord[]
  readonly landRoutes: readonly TransportRouteRecord[]
  readonly seaRoutes: readonly TransportRouteRecord[]

  constructor(input: GlobeDataInput = {}) {
    const rawLocations: readonly RawLocation[] = input.locations ?? []
    const rawFlightRoutes: readonly RawRoute[] = input.flightRoutes ?? []
    const rawTransportRoutes: readonly RawRoute[] = input.transportRoutes ?? []

    const normalizedLocations = rawLocations.map(normalizeLocation)
    assertUniqueIds(normalizedLocations, "location")
    this.locations = Object.freeze(normalizedLocations)
    this.locationById = new Map(
      this.locations.map((location) => [location.id, location]),
    )

    const normalizedFlightRoutes = rawFlightRoutes.map((route) =>
      normalizeRoute(route, this.locationById, FLIGHT_KINDS),
    )
    const normalizedTransportRoutes = rawTransportRoutes.map((route) =>
      normalizeTransportRoute(route, this.locationById),
    )
    assertUniqueIds(
      [...normalizedFlightRoutes, ...normalizedTransportRoutes],
      "route",
    )

    this.flightRoutes = Object.freeze(normalizedFlightRoutes)
    this.transportRoutes = Object.freeze(normalizedTransportRoutes)
    this.landRoutes = Object.freeze(
      normalizedTransportRoutes.filter((route) => route.kind === "land"),
    )
    this.seaRoutes = Object.freeze(
      normalizedTransportRoutes.filter((route) => route.kind === "sea"),
    )
  }

  getLocation(id: string): LocationRecord | null {
    return this.locationById.get(id) ?? null
  }

  getSnapshot(): GlobeDataSnapshot {
    return Object.freeze({
      locations: this.locations,
      flightRoutes: this.flightRoutes,
      transportRoutes: this.transportRoutes,
      landRoutes: this.landRoutes,
      seaRoutes: this.seaRoutes,
    })
  }
}
