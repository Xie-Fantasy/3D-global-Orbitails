import assert from "node:assert/strict"
import test from "node:test"
import { geoInterpolate } from "d3-geo"
import { SeaRoutePlanner } from "./SeaRoutePlanner.js"

const planner = new SeaRoutePlanner()

test("classifies representative land and water coordinates", () => {
  assert.equal(planner.isLand([135, -25]), true)
  assert.equal(planner.isLand([120, -18]), false)
  assert.equal(planner.isWater([80, -20]), true)
})

test("plans Singapore to Sydney around Australia", () => {
  const route = planner.plan([103.8198, 1.3521], [151.2093, -33.8688])

  assert.ok(route.length >= 4)
  assert.deepEqual(route[0], [103.8198, 1.3521])
  assert.deepEqual(route.at(-1), [151.2093, -33.8688])

  for (let index = 2; index < route.length - 1; index += 1) {
    const interpolate = geoInterpolate(route[index - 1], route[index])
    for (let sample = 0; sample <= 12; sample += 1) {
      assert.equal(
        planner.isLand(interpolate(sample / 12)),
        false,
        `segment ${index - 1} crosses land`
      )
    }
  }
})

test("reuses a cached route without sharing mutable coordinates", () => {
  const first = planner.plan([113.2644, 23.1291], [103.8198, 1.3521])
  const second = planner.plan([113.2644, 23.1291], [103.8198, 1.3521])

  assert.deepEqual(second, first)
  assert.notEqual(second, first)
  assert.notEqual(second[0], first[0])
})
