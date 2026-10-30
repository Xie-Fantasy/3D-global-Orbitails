export class GlobeLifecycle {
  constructor() {
    this.disposers = []
    this.disposed = false
  }

  add(disposer) {
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

  addEvent(target, eventName, handler, options) {
    target.addEventListener(eventName, handler, options)
    return this.add(() => target.removeEventListener(eventName, handler, options))
  }

  addObserver(observer) {
    return this.add(() => observer.disconnect())
  }

  addTimeout(callback, delay) {
    const timeoutId = globalThis.setTimeout(callback, delay)
    this.add(() => globalThis.clearTimeout(timeoutId))
    return timeoutId
  }

  dispose() {
    if (this.disposed) {
      return
    }

    this.disposed = true
    for (let index = this.disposers.length - 1; index >= 0; index -= 1) {
      this.disposers[index]()
    }
    this.disposers = []
  }
}
