import { geoArea, geoCentroid, geoContains } from "d3-geo"
import { feature } from "topojson-client"
import type { Feature, FeatureCollection } from "geojson"
import countriesTopology from "world-atlas/countries-110m.json"
import type { CountryRecord, LonLat } from "../types/data"

// Derive the topojson types from `feature`'s own signature instead of importing
// `topojson-specification` directly (keeps the dependency tree lean).
type FeatureTopology = Parameters<typeof feature>[0]
type FeatureObject = Parameters<typeof feature>[1]

const COUNTRY_NAMES_ZH: Record<string, string> = Object.freeze({
  Australia: "澳大利亚",
  Brazil: "巴西",
  Canada: "加拿大",
  China: "中国",
  France: "法国",
  Germany: "德国",
  India: "印度",
  Indonesia: "印度尼西亚",
  Japan: "日本",
  "S. Korea": "韩国",
  Russia: "俄罗斯",
  Singapore: "新加坡",
  "South Africa": "南非",
  "United Kingdom": "英国",
  "United States of America": "美国",
})

interface ResolvedCountry {
  readonly id: string
  readonly name: string
  readonly nameZh: string
  readonly label: string
  readonly coordinate: LonLat
  readonly focusDistance: number
  readonly feature: Feature
}

function getFocusDistance(countryFeature: Feature): number {
  const normalizedArea = Math.min(1, geoArea(countryFeature) / 0.42)
  return Math.round(92 + Math.sqrt(normalizedArea) * 42)
}

function toPosition(value: unknown): [number, number] {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [value[0], value[1]]
  }
  return [0, 0]
}

export class CountryService {
  private readonly collection: FeatureCollection

  constructor(topology: unknown = countriesTopology) {
    const topo = topology as FeatureTopology
    this.collection = feature(
      topo,
      topo.objects.countries as FeatureObject,
    ) as FeatureCollection
  }

  findCountry(coordinate: LonLat): ResolvedCountry | null {
    const featureItem =
      this.collection.features.find((item) =>
        geoContains(item, coordinate as [number, number]),
      ) ?? null
    if (!featureItem) {
      return null
    }

    const name =
      (featureItem.properties?.name as string | undefined) ??
      String(featureItem.id)
    const nameZh = COUNTRY_NAMES_ZH[name] ?? name

    return {
      id: String(featureItem.id),
      name,
      nameZh,
      label: nameZh,
      coordinate: toPosition(geoCentroid(featureItem)),
      focusDistance: getFocusDistance(featureItem),
      feature: featureItem,
    }
  }

  toState(country: ResolvedCountry | null): CountryRecord | null {
    return country
      ? {
          id: country.id,
          name: country.name,
          nameZh: country.nameZh,
          label: country.label,
          coordinate: country.coordinate,
          focusDistance: country.focusDistance,
        }
      : null
  }
}
