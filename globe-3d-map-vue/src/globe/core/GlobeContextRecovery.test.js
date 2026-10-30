import assert from "node:assert/strict"
import test from "node:test"
import { GlobeContextRecovery } from "./GlobeContextRecovery.js"
import { GlobeLifecycle } from "./GlobeLifecycle.js"

class EventTargetStub {
  constructor() {
    this.listeners = new Map()
  }

  addEventListener(name, handler) {
    this.listeners.set(name, handler)
  }

  removeEventListener(name) {
    this.listeners.delete(name)
  }

  emit(name, event = {}) {
    this.listeners.get(name)?.(event)
  }
}

test("enters recovery and resumes when WebGL context returns", () => {
  const canvas = new EventTargetStub()
  const lifecycle = new GlobeLifecycle()
  const events = []
  let prevented = false
  const recovery = new GlobeContextRecovery(canvas, lifecycle, {
    onLost: () => events.push("lost"),
    onRestored: () => events.push("restored"),
  })
  recovery.bind()

  canvas.emit("webglcontextlost", {
    preventDefault: () => {
      prevented = true
    },
  })
  canvas.emit("webglcontextrestored")

  assert.equal(prevented, true)
  assert.deepEqual(events, ["lost", "restored"])
  assert.equal(recovery.awaitingRestore, false)
  lifecycle.dispose()
})

test("promotes an unrestored context to timeout", async () => {
  const canvas = new EventTargetStub()
  const lifecycle = new GlobeLifecycle()
  let timedOut = false
  const recovery = new GlobeContextRecovery(canvas, lifecycle, {
    timeout: 5,
    onTimeout: () => {
      timedOut = true
    },
  })
  recovery.bind()
  canvas.emit("webglcontextlost", { preventDefault: () => {} })

  await new Promise((resolve) => setTimeout(resolve, 15))
  assert.equal(timedOut, true)
  assert.equal(recovery.awaitingRestore, false)
  lifecycle.dispose()
})
