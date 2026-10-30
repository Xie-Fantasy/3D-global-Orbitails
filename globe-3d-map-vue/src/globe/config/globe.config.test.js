import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_THEME_ID,
  GLOBE_THEMES,
  resolveGlobeTheme,
} from "./globe.config.js"

test("resolves every configured globe theme", () => {
  Object.values(GLOBE_THEMES).forEach((theme) => {
    assert.equal(resolveGlobeTheme(theme.id), theme)
    assert.ok(Number.isInteger(theme.colors.background))
    assert.ok(Number.isInteger(theme.colors.mint))
  })
})

test("falls back to the default theme for an unknown id", () => {
  assert.equal(resolveGlobeTheme("unknown"), GLOBE_THEMES[DEFAULT_THEME_ID])
})
