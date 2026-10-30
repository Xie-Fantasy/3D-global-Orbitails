import assert from "node:assert/strict"
import test from "node:test"
import { mountGlobeLayers } from "./mountGlobeLayers.js"

function createState() {
  return {
    layers: {
      ready: { visible: true, status: "idle", error: null },
      empty: { visible: true, status: "idle", error: null },
      broken: { visible: true, status: "idle", error: null },
    },
  }
}

function createLayer(options = {}) {
  return {
    group: { visible: false },
    isEmpty: options.isEmpty ?? false,
    disposed: false,
    mount() {
      if (options.mountError) {
        throw new Error(options.mountError)
      }
    },
    setVisible(visible) {
      this.group.visible = visible
    },
    dispose() {
      this.disposed = true
    },
  }
}

test("mounts ready layers and disables empty layers", () => {
  const state = createState()
  const ready = createLayer()
  const empty = createLayer({ isEmpty: true })
  const result = mountGlobeLayers(
    [
      ["ready", ready, {}],
      ["empty", empty, {}],
    ],
    state
  )

  assert.equal(state.layers.ready.status, "ready")
  assert.equal(state.layers.ready.visible, true)
  assert.equal(state.layers.empty.status, "empty")
  assert.equal(state.layers.empty.visible, false)
  assert.equal(result.layers.size, 2)
  assert.equal(result.issues[0].status, "empty")
})

test("isolates mount failures and disposes the failed layer", () => {
  const state = createState()
  const ready = createLayer()
  const broken = createLayer({ mountError: "shader compile failed" })
  const result = mountGlobeLayers(
    [
      ["ready", ready, {}],
      ["broken", broken, {}],
    ],
    state
  )

  assert.equal(result.layers.has("ready"), true)
  assert.equal(result.layers.has("broken"), false)
  assert.equal(state.layers.broken.status, "error")
  assert.equal(state.layers.broken.visible, false)
  assert.equal(broken.disposed, true)
  assert.match(result.issues[0].message, /shader compile failed/)
})
