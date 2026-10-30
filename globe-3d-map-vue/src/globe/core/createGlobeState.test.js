import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_TEXTURE_MODE,
  DEFAULT_THEME_ID,
  EFFECT_IDS,
} from "../config/globe.config.js"
import { createGlobeState } from "./createGlobeState.js"

test("creates a theme-aware atmosphere motion state", () => {
  const state = createGlobeState("medium")

  assert.equal(state.theme, DEFAULT_THEME_ID)
  assert.deepEqual(state.effects[EFFECT_IDS.atmosphereMotion], {
    enabled: true,
    status: "idle",
    error: null,
  })
  assert.deepEqual(state.loading, {
    progress: 0,
    message: "loading",
  })
  assert.deepEqual(state.texture, {
    mode: DEFAULT_TEXTURE_MODE,
    status: "idle",
    error: null,
  })
  assert.equal(state.selectedCountry, null)
})
