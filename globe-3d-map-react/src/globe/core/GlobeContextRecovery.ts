import type { GlobeLifecycle } from "./GlobeLifecycle"

export interface GlobeContextRecoveryOptions {
  readonly onLost?: () => void
  readonly onRestored?: () => void
  readonly onTimeout?: () => void
  readonly timeout?: number
}

export class GlobeContextRecovery {
  private readonly canvas: HTMLCanvasElement
  private readonly lifecycle: GlobeLifecycle
  private readonly onLost: (() => void) | undefined = undefined
  private readonly onRestored: (() => void) | undefined = undefined
  private readonly onTimeout: (() => void) | undefined = undefined
  private readonly timeout: number
  private timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null
  private awaitingRestore = false

  constructor(
    canvas: HTMLCanvasElement,
    lifecycle: GlobeLifecycle,
    options: GlobeContextRecoveryOptions = {},
  ) {
    this.canvas = canvas
    this.lifecycle = lifecycle
    this.onLost = options.onLost
    this.onRestored = options.onRestored
    this.onTimeout = options.onTimeout
    this.timeout = options.timeout ?? 8000
  }

  bind(): void {
    this.lifecycle.addEvent(
      this.canvas,
      "webglcontextlost",
      (event) => {
        event.preventDefault()
        this.awaitingRestore = true
        if (this.timeoutId !== null) {
          globalThis.clearTimeout(this.timeoutId)
        }
        this.timeoutId = this.lifecycle.addTimeout(() => {
          if (!this.awaitingRestore) {
            return
          }
          this.awaitingRestore = false
          this.timeoutId = null
          this.onTimeout?.()
        }, this.timeout)
        this.onLost?.()
      },
      false,
    )

    this.lifecycle.addEvent(
      this.canvas,
      "webglcontextrestored",
      () => {
        if (!this.awaitingRestore) {
          return
        }
        this.awaitingRestore = false
        if (this.timeoutId !== null) {
          globalThis.clearTimeout(this.timeoutId)
          this.timeoutId = null
        }
        this.onRestored?.()
      },
      false,
    )
  }

  dispose(): void {
    this.awaitingRestore = false
    if (this.timeoutId !== null) {
      globalThis.clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}
