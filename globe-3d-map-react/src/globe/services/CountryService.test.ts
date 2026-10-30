import { describe, test, expect } from "vitest"
import { CountryService } from "./CountryService"

const service = new CountryService()

describe("CountryService", () => {
  test("finds a country from a globe coordinate", () => {
    const country = service.findCountry([116.4, 39.9])
    expect(country).not.toBeNull()
    expect(country!.name).toBe("China")
    expect(country!.label).toBe("中国")
    expect(country!.focusDistance).toBeGreaterThanOrEqual(78)
    expect(Array.isArray(country!.coordinate)).toBe(true)
    expect(country!.feature).toBeTruthy()
  })

  test("returns null when the picked coordinate is open ocean", () => {
    expect(service.findCountry([-140, 0])).toBeNull()
  })

  test("serializes country state without retaining geometry", () => {
    const country = service.findCountry([151.2, -33.8])
    const state = service.toState(country)
    expect(state!.label).toBe("澳大利亚")
    expect("feature" in state!).toBe(false)
  })
})
