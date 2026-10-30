import { Raycaster, Vector2, Vector3, type Camera, type Object3D } from "three"
import { isPointOnVisibleHemisphere, vector3ToLonLat } from "../math/geo"
import type { LonLat } from "../types/data"

export interface GlobeInteractionServiceOptions {
  readonly onHover?: (locationId: string | null) => void
  readonly onSelect?: (locationId: string | null) => void
  readonly onSurfaceSelect?: (coordinate: LonLat | null) => void
  readonly onEscape?: () => void
  readonly surfaceObject?: Object3D | null
}

export class GlobeInteractionService {
  private readonly canvas: HTMLCanvasElement
  private readonly camera: Camera
  private interactiveObjects: Object3D[]
  private readonly onHover:
    | ((locationId: string | null) => void)
    | undefined = undefined
  private readonly onSelect:
    | ((locationId: string | null) => void)
    | undefined = undefined
  private readonly onSurfaceSelect:
    | ((coordinate: LonLat | null) => void)
    | undefined = undefined
  private readonly onEscape: (() => void) | undefined = undefined
  private surfaceObject: Object3D | null
  private enabled = true
  private markersEnabled = true
  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly pendingPointer = { x: 0, y: 0 }
  private pointerDown: {
    readonly pointerId: number
    readonly x: number
    readonly y: number
  } | null = null
  private hoverFrameId: number | null = null
  private hoveredId: string | null = null

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    interactiveObjects: Object3D[],
    options: GlobeInteractionServiceOptions = {},
  ) {
    this.canvas = canvas
    this.camera = camera
    this.interactiveObjects = interactiveObjects
    this.onHover = options.onHover
    this.onSelect = options.onSelect
    this.onSurfaceSelect = options.onSurfaceSelect
    this.onEscape = options.onEscape
    this.surfaceObject = options.surfaceObject ?? null

    this.handlePointerMove = (event: PointerEvent) => {
      if (!this.enabled) {
        return
      }
      this.pendingPointer.x = event.clientX
      this.pendingPointer.y = event.clientY
      if (this.hoverFrameId === null) {
        this.hoverFrameId = window.requestAnimationFrame(() => {
          this.hoverFrameId = null
          this.updateHover(this.pendingPointer.x, this.pendingPointer.y)
        })
      }
    }

    this.handlePointerLeave = () => {
      this.pointerDown = null
      this.setHovered(null)
    }

    this.handlePointerDown = (event: PointerEvent) => {
      if (!this.enabled) {
        return
      }
      this.pointerDown = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    }

    this.handlePointerUp = (event: PointerEvent) => {
      const start = this.pointerDown
      this.pointerDown = null
      if (!this.enabled || !start || start.pointerId !== event.pointerId) {
        return
      }

      const distance = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y,
      )
      if (distance <= 6) {
        const locationId = this.pickLocation(event.clientX, event.clientY)
        if (locationId) {
          this.onSelect?.(locationId)
          return
        }
        this.onSurfaceSelect?.(
          this.pickSurfaceCoordinate(event.clientX, event.clientY),
        )
      }
    }

    this.handlePointerCancel = () => {
      this.pointerDown = null
    }

    this.handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (this.onEscape) {
          this.onEscape()
        } else {
          this.onSelect?.(null)
        }
      }
    }

    canvas.addEventListener("pointermove", this.handlePointerMove, {
      passive: true,
    })
    canvas.addEventListener("pointerleave", this.handlePointerLeave)
    canvas.addEventListener("pointerdown", this.handlePointerDown, {
      passive: true,
    })
    canvas.addEventListener("pointerup", this.handlePointerUp, {
      passive: true,
    })
    canvas.addEventListener("pointercancel", this.handlePointerCancel)
    window.addEventListener("keydown", this.handleKeyDown)
  }

  private handlePointerMove: (event: PointerEvent) => void = () => {}
  private handlePointerLeave: () => void = () => {}
  private handlePointerDown: (event: PointerEvent) => void = () => {}
  private handlePointerUp: (event: PointerEvent) => void = () => {}
  private handlePointerCancel: () => void = () => {}
  private handleKeyDown: (event: KeyboardEvent) => void = () => {}

  setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled)
    if (!this.enabled) {
      this.setHovered(null)
    }
  }

  setMarkersEnabled(enabled: boolean): void {
    this.markersEnabled = Boolean(enabled)
    if (!this.markersEnabled) {
      this.setHovered(null)
    }
  }

  private updateHover(clientX: number, clientY: number): void {
    this.setHovered(this.pickLocation(clientX, clientY))
  }

  private updateRay(clientX: number, clientY: number): boolean {
    const bounds = this.canvas.getBoundingClientRect()
    if (
      bounds.width <= 0 ||
      bounds.height <= 0 ||
      clientX < bounds.left ||
      clientX > bounds.right ||
      clientY < bounds.top ||
      clientY > bounds.bottom
    ) {
      return false
    }

    this.pointer.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    return true
  }

  private pickLocation(clientX: number, clientY: number): string | null {
    if (!this.markersEnabled || !this.updateRay(clientX, clientY)) {
      return null
    }

    const intersections = this.raycaster.intersectObjects(
      this.interactiveObjects,
      false,
    )
    const visibleIntersection = intersections.find((intersection) => {
      const object = intersection.object
      const userData = object.userData as {
        surfacePositions?: readonly VectorLike[]
        surfacePosition?: VectorLike
        locationIds?: readonly (string | null)[]
        locationId?: string | null
      }
      const surfacePosition =
        (intersection.instanceId !== undefined &&
          userData.surfacePositions?.[intersection.instanceId]) ||
        userData.surfacePosition
      return (
        surfacePosition !== undefined &&
        isPointOnVisibleHemisphere(
          surfacePosition as unknown as Vector3,
          this.camera.position,
          -0.02,
        )
      )
    })
    if (!visibleIntersection) {
      return null
    }

    const object = visibleIntersection.object
    const userData = object.userData as {
      locationIds?: readonly (string | null)[]
      locationId?: string | null
    }
    return (
      (visibleIntersection.instanceId !== undefined &&
        userData.locationIds?.[visibleIntersection.instanceId]) ||
      userData.locationId ||
      null
    )
  }

  private pickSurfaceCoordinate(
    clientX: number,
    clientY: number,
  ): LonLat | null {
    if (!this.surfaceObject || !this.updateRay(clientX, clientY)) {
      return null
    }

    const intersection = this.raycaster.intersectObject(
      this.surfaceObject,
      false,
    )[0]
    if (!intersection) {
      return null
    }

    const localPoint = this.surfaceObject.worldToLocal(
      intersection.point.clone(),
    )
    return vector3ToLonLat(localPoint)
  }

  private setHovered(locationId: string | null): void {
    if (locationId === this.hoveredId) {
      return
    }

    this.hoveredId = locationId
    this.canvas.classList.toggle(
      "is-marker-hovered",
      Boolean(locationId),
    )
    this.onHover?.(locationId)
  }

  clearHover(): void {
    this.setHovered(null)
  }

  dispose(): void {
    if (this.hoverFrameId !== null) {
      window.cancelAnimationFrame(this.hoverFrameId)
    }
    this.canvas.removeEventListener("pointermove", this.handlePointerMove)
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave)
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown)
    this.canvas.removeEventListener("pointerup", this.handlePointerUp)
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel)
    window.removeEventListener("keydown", this.handleKeyDown)
    this.canvas.classList.remove("is-marker-hovered")
    this.interactiveObjects = []
    this.surfaceObject = null
  }
}

interface VectorLike {
  x: number
  y: number
  z: number
}
