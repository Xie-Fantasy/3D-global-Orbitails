import assert from "node:assert/strict"
import test from "node:test"
import { CountryService } from "./CountryService.js"

const service = new CountryService()

test("finds a country from a globe coordinate", () => {
  const country = service.findCountry([116.4, 39.9])

  assert.equal(country.name, "China")
  assert.equal(country.label, "中国")
  assert.ok(country.focusDistance >= 78)
  assert.ok(Array.isArray(country.coordinate))
  assert.ok(country.feature)
})

test("returns null when the picked coordinate is open ocean", () => {
  assert.equal(service.findCountry([-140, 0]), null)
})

test("serializes country state without retaining geometry", () => {
  const country = service.findCountry([151.2, -33.8])
  const state = service.toState(country)

  assert.equal(state.label, "澳大利亚")
  assert.equal("feature" in state, false)
})
