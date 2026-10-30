import { Raycaster, Vector2 } from "three"
import {
  isPointOnVisibleHemisphere,
  vector3ToLonLat,
} from "../math/geo.js"

export class GlobeInteractionService {
  constructor(canvas, camera, interactiveObjects, options = {}) {
    this.canvas = canvas
    this.camera = camera
    this.interactiveObjects = interactiveObjects
    this.onHover = options.onHover
    this.onSelect = options.onSelect
    this.onSurfaceSelect = options.onSurfaceSelect
    this.onEscape = options.onEscape
    this.surfaceObject = options.surfaceObject
    this.enabled = true
    this.markersEnabled = true
    this.raycaster = new Raycaster()
    this.pointer = new Vector2()
    this.pendingPointer = { x: 0, y: 0 }
    this.pointerDown = null
    this.hoverFrameId = null
    this.hoveredId = null

    this.handlePointerMove = (event) => {
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

    this.handlePointerDown = (event) => {
      if (!this.enabled) {
        return
      }
      this.pointerDown = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    }

    this.handlePointerUp = (event) => {
      const start = this.pointerDown
      this.pointerDown = null
      if (!this.enabled || !start || start.pointerId !== event.pointerId) {
        return
      }

      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y)
      if (distance <= 6) {
        const locationId = this.pickLocation(event.clientX, event.clientY)
        if (locationId) {
          this.onSelect?.(locationId)
          return
        }
        this.onSurfaceSelect?.(
          this.pickSurfaceCoordinate(event.clientX, event.clientY)
        )
      }
    }

    this.handlePointerCancel = () => {
      this.pointerDown = null
    }

    this.handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (this.onEscape) {
          this.onEscape()
        } else {
          this.onSelect?.(null)
        }
      }
    }

    canvas.addEventListener("pointermove", this.handlePointerMove, { passive: true })
    canvas.addEventListener("pointerleave", this.handlePointerLeave)
    canvas.addEventListener("pointerdown", this.handlePointerDown, { passive: true })
    canvas.addEventListener("pointerup", this.handlePointerUp, { passive: true })
    canvas.addEventListener("pointercancel", this.handlePointerCancel)
    window.addEventListener("keydown", this.handleKeyDown)
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled)
    if (!this.enabled) {
      this.setHovered(null)
    }
  }

  setMarkersEnabled(enabled) {
    this.markersEnabled = Boolean(enabled)
    if (!this.markersEnabled) {
      this.setHovered(null)
    }
  }

  updateHover(clientX, clientY) {
    this.setHovered(this.pickLocation(clientX, clientY))
  }

  updateRay(clientX, clientY) {
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
      -((clientY - bounds.top) / bounds.height) * 2 + 1
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    return true
  }

  pickLocation(clientX, clientY) {
    if (!this.markersEnabled || !this.updateRay(clientX, clientY)) {
      return null
    }

    const intersections = this.raycaster.intersectObjects(this.interactiveObjects, false)
    const visibleIntersection = intersections.find((intersection) => {
      const surfacePosition =
        intersection.object.userData.surfacePositions?.[intersection.instanceId] ??
        intersection.object.userData.surfacePosition
      return (
        surfacePosition &&
        isPointOnVisibleHemisphere(surfacePosition, this.camera.position, -0.02)
      )
    })
    if (!visibleIntersection) {
      return null
    }

    return (
      visibleIntersection.object.userData.locationIds?.[
        visibleIntersection.instanceId
      ] ??
      visibleIntersection.object.userData.locationId ??
      null
    )
  }

  pickSurfaceCoordinate(clientX, clientY) {
    if (!this.surfaceObject || !this.updateRay(clientX, clientY)) {
      return null
    }

    const intersection = this.raycaster.intersectObject(this.surfaceObject, false)[0]
    if (!intersection) {
      return null
    }

    const localPoint = this.surfaceObject.worldToLocal(intersection.point.clone())
    return vector3ToLonLat(localPoint)
  }

  setHovered(locationId) {
    if (locationId === this.hoveredId) {
      return
    }

    this.hoveredId = locationId
    this.canvas.classList.toggle("is-marker-hovered", Boolean(locationId))
    this.onHover?.(locationId)
  }

  dispose() {
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
