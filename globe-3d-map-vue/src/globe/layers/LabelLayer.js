import { Group, Vector3 } from "three"
import { EARTH_RADIUS } from "../config/globe.config.js"
import { getHemisphereVisibility, lonLatToVector3 } from "../math/geo.js"

function rectanglesOverlap(first, second, padding = 5) {
  return !(
    first.right + padding < second.left ||
    first.left > second.right + padding ||
    first.bottom + padding < second.top ||
    first.top > second.bottom + padding
  )
}

function createLabelEntry(location) {
  const element = document.createElement("div")
  element.className = "globe-label"
  element.dataset.locationId = location.id
  element.innerHTML = `
    <span class="globe-label__dot" aria-hidden="true"></span>
    <span class="globe-label__name"></span>
    <small></small>
  `
  element.querySelector(".globe-label__name").textContent = location.name
  element.querySelector("small").textContent = String(location.value)

  if (location.type === "hub") {
    element.classList.add("is-hub")
  }

  return {
    location,
    element,
    worldPosition: lonLatToVector3(location.coordinate, EARTH_RADIUS * 1.035),
    projected: new Vector3(),
    width: Math.max(64, 34 + location.name.length * 14),
    height: 28,
  }
}

export class LabelLayer {
  constructor(locations, container) {
    this.group = new Group()
    this.group.name = "label-layer-anchor"
    this.container = container
    this.root = document.createElement("div")
    this.root.className = "globe-label-layer"
    this.root.setAttribute("aria-hidden", "true")
    this.isEmpty = locations.length === 0
    this.entries = locations
      .slice()
      .sort((first, second) => second.priority - first.priority)
      .map(createLabelEntry)
    this.selectedId = null
    this.hoveredId = null
    this.locale = "en"

    this.entries.forEach((entry) => this.root.appendChild(entry.element))
  }

  mount(parent) {
    parent.add(this.group)
    this.container.appendChild(this.root)
  }

  setVisible(visible) {
    this.group.visible = visible
    this.root.hidden = !visible
  }

  setHovered(locationId) {
    this.hoveredId = locationId
    this.applyInteractionState()
  }

  setSelected(locationId) {
    this.selectedId = locationId
    this.applyInteractionState()
  }

  setLocale(locale) {
    this.locale = locale === "zh" ? "zh" : "en"
    this.entries.forEach((entry) => {
      entry.element.querySelector(".globe-label__name").textContent =
        this.locale === "zh" ? entry.location.nameZh : entry.location.name
    })
  }

  applyInteractionState() {
    this.entries.forEach((entry) => {
      entry.element.classList.toggle("is-selected", entry.location.id === this.selectedId)
      entry.element.classList.toggle("is-hovered", entry.location.id === this.hoveredId)
    })
  }

  update(delta, elapsed, context) {
    if (!context?.camera || !context?.size) {
      return
    }

    const { camera, size } = context
    const occupied = []

    this.entries.forEach((entry) => {
      const isActive =
        entry.location.id === this.selectedId ||
        entry.location.id === this.hoveredId
      const hemisphereVisibility = getHemisphereVisibility(
        entry.worldPosition,
        camera.position
      )
      const isFrontFacing = hemisphereVisibility > -0.015

      entry.projected.copy(entry.worldPosition).project(camera)
      const inFrustum =
        entry.projected.z >= -1 &&
        entry.projected.z <= 1 &&
        Math.abs(entry.projected.x) <= 1.04 &&
        Math.abs(entry.projected.y) <= 1.04

      if (!isFrontFacing || !inFrustum) {
        entry.element.hidden = true
        return
      }

      const x = (entry.projected.x * 0.5 + 0.5) * size.width
      const y = (-entry.projected.y * 0.5 + 0.5) * size.height
      const rect = {
        left: x - entry.width / 2,
        right: x + entry.width / 2,
        top: y - entry.height / 2,
        bottom: y + entry.height / 2,
      }
      const isOverlapping = !isActive && occupied.some((item) => rectanglesOverlap(rect, item))

      entry.element.hidden = isOverlapping
      if (!isOverlapping) {
        const horizonOpacity = Math.min(
          1,
          Math.max(0, (hemisphereVisibility + 0.015) / 0.15)
        )
        entry.element.style.opacity = String(horizonOpacity)
        entry.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
        occupied.push(rect)
      }
    })
  }

  resize() {}

  dispose() {
    this.entries = []
    this.group.removeFromParent()
    this.root.remove()
  }
}
