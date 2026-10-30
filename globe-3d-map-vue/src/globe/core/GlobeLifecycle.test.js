import assert from "node:assert/strict"
import test from "node:test"
import { GlobeLifecycle } from "./GlobeLifecycle.js"

class TrackedTarget {
  constructor() {
    this.listeners = new Map()
  }

  addEventListener(name, handler) {
    const handlers = this.listeners.get(name) ?? new Set()
    handlers.add(handler)
    this.listeners.set(name, handlers)
  }

  removeEventListener(name, handler) {
    this.listeners.get(name)?.delete(handler)
  }

  count(name) {
    return this.listeners.get(name)?.size ?? 0
  }
}

test("releases events, observers, and custom disposers across ten lifecycles", () => {
  const target = new TrackedTarget()
  let disconnected = 0
  let disposed = 0

  for (let index = 0; index < 10; index += 1) {
    const lifecycle = new GlobeLifecycle()
    lifecycle.addEvent(target, "resize", () => {})
    lifecycle.addObserver({ disconnect: () => disconnected += 1 })
    lifecycle.add(() => disposed += 1)
    assert.equal(target.count("resize"), 1)
    lifecycle.dispose()
    lifecycle.dispose()
    assert.equal(target.count("resize"), 0)
  }

  assert.equal(disconnected, 10)
  assert.equal(disposed, 10)
})

test("clears scheduled callbacks when disposed", async () => {
  const lifecycle = new GlobeLifecycle()
  let called = false
  lifecycle.addTimeout(() => {
    called = true
  }, 5)
  lifecycle.dispose()

  await new Promise((resolve) => setTimeout(resolve, 15))
  assert.equal(called, false)
})
