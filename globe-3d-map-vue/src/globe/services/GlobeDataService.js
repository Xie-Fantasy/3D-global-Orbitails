import { isValidLonLat, normalizeLongitude } from "../math/geo.js"
import { DEFAULT_SEA_ROUTE_PLANNER } from "./SeaRoutePlanner.js"

const LOCATION_TYPES = new Set(["hub", "city", "port"])
const ROUTE_KINDS = new Set(["flight", "land", "sea"])
const FLIGHT_KINDS = new Set(["flight"])
const TRANSPORT_KINDS = new Set(["land", "sea"])

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string`)
  }
  return value.trim()
}

function requireFiniteNumber(value, fieldName, minimum = 0) {
  if (!Number.isFinite(value) || value < minimum) {
    throw new TypeError(`${fieldName} must be a finite number >= ${minimum}`)
  }
  return value
}

function normalizeLocation(location) {
  if (!location || typeof location !== "object") {
    throw new TypeError("Location must be an object")
  }

  const id = requireNonEmptyString(location.id, "Location id")
  if (!isValidLonLat(location.coordinate)) {
    throw new TypeError(`Location "${id}" has an invalid [longitude, latitude] coordinate`)
  }

  const type = requireNonEmptyString(location.type ?? "city", `Location "${id}" type`)
  if (!LOCATION_TYPES.has(type)) {
    throw new TypeError(`Location "${id}" has unsupported type "${type}"`)
  }

  return Object.freeze({
    id,
    name: requireNonEmptyString(location.name, `Location "${id}" name`),
    nameZh: requireNonEmptyString(location.nameZh ?? location.name, `Location "${id}" Chinese name`),
    country: requireNonEmptyString(location.country, `Location "${id}" country`),
    countryZh: requireNonEmptyString(location.countryZh ?? location.country, `Location "${id}" Chinese country`),
    coordinate: Object.freeze([
      normalizeLongitude(location.coordinate[0]),
      location.coordinate[1],
    ]),
    type,
    value: requireFiniteNumber(location.value ?? 0, `Location "${id}" value`),
    priority: requireFiniteNumber(location.priority ?? 0, `Location "${id}" priority`),
  })
}

function normalizeRoute(route, locationById, allowedKinds = ROUTE_KINDS) {
  if (!route || typeof route !== "object") {
    throw new TypeError("Route must be an object")
  }

  const id = requireNonEmptyString(route.id, "Route id")
  const fromId = requireNonEmptyString(route.fromId, `Route "${id}" fromId`)
  const toId = requireNonEmptyString(route.toId, `Route "${id}" toId`)
  const kind = requireNonEmptyString(route.kind, `Route "${id}" kind`)

  if (!ROUTE_KINDS.has(kind) || !allowedKinds.has(kind)) {
    throw new TypeError(`Route "${id}" has unsupported kind "${kind}"`)
  }
  if (fromId === toId) {
    throw new TypeError(`Route "${id}" must connect two different locations`)
  }
  if (!locationById.has(fromId) || !locationById.has(toId)) {
    throw new TypeError(`Route "${id}" references a missing endpoint`)
  }

  return Object.freeze({
    id,
    kind,
    fromId,
    toId,
    value: requireFiniteNumber(route.value ?? 0, `Route "${id}" value`),
    priority: requireFiniteNumber(route.priority ?? 0, `Route "${id}" priority`),
    from: locationById.get(fromId),
    to: locationById.get(toId),
  })
}

function coordinatesAreEqual(first, second, epsilon = 1e-10) {
  return (
    Math.abs(first[0] - second[0]) <= epsilon &&
    Math.abs(first[1] - second[1]) <= epsilon
  )
}

function normalizeTransportRoute(route, locationById) {
  const normalizedRoute = normalizeRoute(route, locationById, TRANSPORT_KINDS)
  const waypoints = route.waypoints ?? []
  if (!Array.isArray(waypoints)) {
    throw new TypeError(`Route "${normalizedRoute.id}" waypoints must be an array`)
  }

  const normalizedWaypoints = waypoints.map((coordinate, index) => {
    if (!isValidLonLat(coordinate)) {
      throw new TypeError(
        `Route "${normalizedRoute.id}" waypoint ${index} has an invalid coordinate`
      )
    }
    return Object.freeze([normalizeLongitude(coordinate[0]), coordinate[1]])
  })
  const manualCoordinates = [
    normalizedRoute.from.coordinate,
    ...normalizedWaypoints,
    normalizedRoute.to.coordinate,
  ]

  for (let index = 1; index < manualCoordinates.length; index += 1) {
    if (coordinatesAreEqual(manualCoordinates[index - 1], manualCoordinates[index])) {
      throw new TypeError(
        `Route "${normalizedRoute.id}" has consecutive duplicate coordinates`
      )
    }
  }

  const routing =
    route.routing ?? (normalizedRoute.kind === "sea" ? "auto-sea" : "manual")
  if (!["manual", "auto-sea"].includes(routing)) {
    throw new TypeError(
      `Route "${normalizedRoute.id}" has unsupported routing "${routing}"`
    )
  }
  if (routing === "auto-sea" && normalizedRoute.kind !== "sea") {
    throw new TypeError(
      `Route "${normalizedRoute.id}" can only use auto-sea routing when kind is sea`
    )
  }

  const coordinates =
    routing === "auto-sea"
      ? DEFAULT_SEA_ROUTE_PLANNER.plan(
          normalizedRoute.from.coordinate,
          normalizedRoute.to.coordinate
        )
      : manualCoordinates

  return Object.freeze({
    ...normalizedRoute,
    routing,
    waypoints: Object.freeze(
      coordinates.slice(1, -1).map((coordinate) => Object.freeze(coordinate))
    ),
    coordinates: Object.freeze(
      coordinates.map((coordinate) => Object.freeze(coordinate))
    ),
  })
}

function assertUniqueIds(items, itemName) {
  const ids = new Set()
  items.forEach((item) => {
    if (ids.has(item.id)) {
      throw new TypeError(`Duplicate ${itemName} id "${item.id}"`)
    }
    ids.add(item.id)
  })
}

export class GlobeDataService {
  constructor({ locations = [], flightRoutes = [], transportRoutes = [] } = {}) {
    const normalizedLocations = locations.map(normalizeLocation)
    assertUniqueIds(normalizedLocations, "location")

    this.locations = Object.freeze(normalizedLocations)
    this.locationById = new Map(this.locations.map((location) => [location.id, location]))

    const normalizedFlightRoutes = flightRoutes.map((route) =>
      normalizeRoute(route, this.locationById, FLIGHT_KINDS)
    )
    const normalizedTransportRoutes = transportRoutes.map((route) =>
      normalizeTransportRoute(route, this.locationById)
    )
    assertUniqueIds(
      [...normalizedFlightRoutes, ...normalizedTransportRoutes],
      "route"
    )
    this.flightRoutes = Object.freeze(normalizedFlightRoutes)
    this.transportRoutes = Object.freeze(normalizedTransportRoutes)
    this.landRoutes = Object.freeze(
      normalizedTransportRoutes.filter((route) => route.kind === "land")
    )
    this.seaRoutes = Object.freeze(
      normalizedTransportRoutes.filter((route) => route.kind === "sea")
    )
  }

  getLocation(id) {
    return this.locationById.get(id) ?? null
  }

  getSnapshot() {
    return Object.freeze({
      locations: this.locations,
      flightRoutes: this.flightRoutes,
      transportRoutes: this.transportRoutes,
      landRoutes: this.landRoutes,
      seaRoutes: this.seaRoutes,
    })
  }
}
