import { geoArea, geoCentroid, geoContains } from "d3-geo"
import { feature } from "topojson-client"
import countriesTopology from "world-atlas/countries-110m.json" with { type: "json" }

const COUNTRY_NAMES_ZH = Object.freeze({
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

function getFocusDistance(countryFeature) {
  const normalizedArea = Math.min(1, geoArea(countryFeature) / 0.42)
  return Math.round(92 + Math.sqrt(normalizedArea) * 42)
}

export class CountryService {
  constructor(topology = countriesTopology) {
    this.collection = feature(topology, topology.objects.countries)
  }

  findCountry(coordinate) {
    const countryFeature =
      this.collection.features.find((item) => geoContains(item, coordinate)) ?? null
    if (!countryFeature) {
      return null
    }

    const name = countryFeature.properties?.name ?? String(countryFeature.id)
    return {
      id: String(countryFeature.id),
      name,
      nameZh: COUNTRY_NAMES_ZH[name] ?? name,
      label: COUNTRY_NAMES_ZH[name] ?? name,
      coordinate: geoCentroid(countryFeature),
      focusDistance: getFocusDistance(countryFeature),
      feature: countryFeature,
    }
  }

  toState(country) {
    return country
      ? {
          id: country.id,
          name: country.name,
          nameZh: country.nameZh,
          label: country.nameZh,
          coordinate: country.coordinate,
        }
      : null
  }
}
