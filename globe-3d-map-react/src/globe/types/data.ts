export type LonLat = readonly [longitude: number, latitude: number]

export type GlobeLocale = "en" | "zh"

export type LocationType = "hub" | "city" | "port"

export type RouteKind = "flight" | "land" | "sea"

export type RouteRoutingMode = "manual" | "auto-sea"

export interface LocationRecord {
  readonly id: string
  readonly name: string
  readonly nameZh: string
  readonly country: string
  readonly countryZh: string
  readonly coordinate: LonLat
  readonly type: LocationType
  readonly value: number
  readonly priority: number
}

export interface RouteRecord {
  readonly id: string
  readonly kind: RouteKind
  readonly fromId: string
  readonly toId: string
  readonly value: number
  readonly priority: number
  readonly from: LocationRecord
  readonly to: LocationRecord
}

export interface TransportRouteRecord extends RouteRecord {
  readonly routing: RouteRoutingMode
  readonly waypoints: readonly LonLat[]
  readonly coordinates: readonly LonLat[]
}

export interface GlobeDataSnapshot {
  readonly locations: readonly LocationRecord[]
  readonly flightRoutes: readonly RouteRecord[]
  readonly transportRoutes: readonly TransportRouteRecord[]
  readonly landRoutes: readonly TransportRouteRecord[]
  readonly seaRoutes: readonly TransportRouteRecord[]
}

export interface CountryRecord {
  readonly id: string
  readonly name: string
  readonly nameZh: string
  readonly label: string
  readonly coordinate: LonLat
  readonly focusDistance: number
}

// ----- Raw input contracts (consumed by GlobeDataService, pre-normalization) -----

export interface RawLocation {
  readonly id: string
  readonly name: string
  readonly nameZh?: string
  readonly country: string
  readonly countryZh?: string
  readonly coordinate: LonLat
  readonly type?: LocationType
  readonly value?: number
  readonly priority?: number
}

export interface RawRoute {
  readonly id: string
  readonly kind: RouteKind
  readonly fromId: string
  readonly toId: string
  readonly value?: number
  readonly priority?: number
  readonly waypoints?: readonly LonLat[]
  readonly routing?: RouteRoutingMode
}

export interface GlobeDataInput {
  readonly locations?: readonly RawLocation[]
  readonly flightRoutes?: readonly RawRoute[]
  readonly transportRoutes?: readonly RawRoute[]
}
