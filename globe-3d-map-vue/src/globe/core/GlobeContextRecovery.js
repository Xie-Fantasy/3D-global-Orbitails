export class GlobeContextRecovery {
  constructor(canvas, lifecycle, options = {}) {
    this.canvas = canvas
    this.lifecycle = lifecycle
    this.onLost = options.onLost
    this.onRestored = options.onRestored
    this.onTimeout = options.onTimeout
    this.timeout = options.timeout ?? 8000
    this.timeoutId = null
    this.awaitingRestore = false
  }

  bind() {
    this.lifecycle.addEvent(this.canvas, "webglcontextlost", (event) => {
      event.preventDefault()
      this.awaitingRestore = true
      globalThis.clearTimeout(this.timeoutId)
      this.timeoutId = this.lifecycle.addTimeout(() => {
        if (!this.awaitingRestore) {
          return
        }
        this.awaitingRestore = false
        this.timeoutId = null
        this.onTimeout?.()
      }, this.timeout)
      this.onLost?.()
    })

    this.lifecycle.addEvent(this.canvas, "webglcontextrestored", () => {
      if (!this.awaitingRestore) {
        return
      }
      this.awaitingRestore = false
      globalThis.clearTimeout(this.timeoutId)
      this.timeoutId = null
      this.onRestored?.()
    })
  }

  dispose() {
    this.awaitingRestore = false
    globalThis.clearTimeout(this.timeoutId)
    this.timeoutId = null
  }
}
