export class GlobeLifecycle {
  private disposers: Array<() => void> = []
  private disposed = false

  add(disposer: () => void): () => void {
    if (typeof disposer !== "function") {
      throw new TypeError("Lifecycle disposer must be a function")
    }

    if (this.disposed) {
      disposer()
      return () => {}
    }

    this.disposers.push(disposer)
    return disposer
  }

  addEvent(
    target: EventTarget,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): () => void {
    target.addEventListener(eventName, handler, options)
    return this.add(() =>
      target.removeEventListener(eventName, handler, options),
    )
  }

  addObserver(observer: { disconnect(): void }): () => void {
    return this.add(() => observer.disconnect())
  }

  addTimeout(
    callback: () => void,
    delay: number,
  ): ReturnType<typeof globalThis.setTimeout> {
    const timeoutId = globalThis.setTimeout(callback, delay)
    this.add(() => globalThis.clearTimeout(timeoutId))
    return timeoutId
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    for (let index = this.disposers.length - 1; index >= 0; index -= 1) {
      const disposer = this.disposers[index]
      if (disposer) {
        disposer()
      }
    }
    this.disposers = []
  }
}
