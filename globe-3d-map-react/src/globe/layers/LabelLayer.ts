import { Group, Vector3 } from "three"
import type { Object3D } from "three"
import { EARTH_RADIUS } from "../config/globe.config"
import { getHemisphereVisibility, lonLatToVector3 } from "../math/geo"
import type { GlobeLayer, GlobeLocale, LayerUpdateContext } from "../types/layers"
import type { LocationRecord } from "../types/data"

interface Rectangle {
  left: number
  right: number
  top: number
  bottom: number
}

function rectanglesOverlap(first: Rectangle, second: Rectangle, padding = 5): boolean {
  return !(
    first.right + padding < second.left ||
    first.left > second.right + padding ||
    first.bottom + padding < second.top ||
    first.top > second.bottom + padding
  )
}

interface LabelEntry {
  location: LocationRecord
  element: HTMLElement
  nameElement: HTMLElement
  valueElement: HTMLElement
  worldPosition: Vector3
  projected: Vector3
  width: number
  height: number
}

function createLabelEntry(location: LocationRecord): LabelEntry {
  const element = document.createElement("div")
  element.className = "globe-label"
  element.dataset.locationId = location.id
  element.innerHTML = `
    <span class="globe-label__dot" aria-hidden="true"></span>
    <span class="globe-label__name"></span>
    <small></small>
  `
  const nameElement = element.querySelector<HTMLElement>(".globe-label__name")!
  const valueElement = element.querySelector<HTMLElement>("small")!
  nameElement.textContent = location.name
  valueElement.textContent = String(location.value)

  if (location.type === "hub") {
    element.classList.add("is-hub")
  }

  return {
    location,
    element,
    nameElement,
    valueElement,
    worldPosition: lonLatToVector3(location.coordinate, EARTH_RADIUS * 1.035),
    projected: new Vector3(),
    width: Math.max(64, 34 + location.name.length * 14),
    height: 28,
  }
}

export class LabelLayer implements GlobeLayer {
  readonly group = new Group()
  readonly isEmpty: boolean
  private readonly container: HTMLElement
  private readonly root: HTMLElement
  private readonly entries: LabelEntry[]
  private selectedId: string | null = null
  private hoveredId: string | null = null

  constructor(locations: readonly LocationRecord[], container: HTMLElement) {
    this.container = container
    this.group.name = "label-layer-anchor"
    this.root = document.createElement("div")
    this.root.className = "globe-label-layer"
    this.root.setAttribute("aria-hidden", "true")
    this.isEmpty = locations.length === 0
    this.entries = locations
      .slice()
      .sort((first, second) => second.priority - first.priority)
      .map(createLabelEntry)
    this.entries.forEach((entry) => this.root.appendChild(entry.element))
  }

  mount(parent: Object3D): void {
    parent.add(this.group)
    this.container.appendChild(this.root)
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
    this.root.hidden = !visible
  }

  setHovered(locationId: string | null): void {
    this.hoveredId = locationId
    this.applyInteractionState()
  }

  setSelected(locationId: string | null): void {
    this.selectedId = locationId
    this.applyInteractionState()
  }

  setLocale(locale: GlobeLocale): void {
    this.entries.forEach((entry) => {
      entry.nameElement.textContent =
        locale === "zh" ? entry.location.nameZh : entry.location.name
    })
  }

  private applyInteractionState(): void {
    this.entries.forEach((entry) => {
      entry.element.classList.toggle(
        "is-selected",
        entry.location.id === this.selectedId,
      )
      entry.element.classList.toggle(
        "is-hovered",
        entry.location.id === this.hoveredId,
      )
    })
  }

  update(_delta: number, _elapsed: number, context: LayerUpdateContext): void {
    const { camera, size } = context
    const occupied: Rectangle[] = []

    this.entries.forEach((entry) => {
      const isActive =
        entry.location.id === this.selectedId ||
        entry.location.id === this.hoveredId
      const hemisphereVisibility = getHemisphereVisibility(
        entry.worldPosition,
        camera.position,
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
      const rect: Rectangle = {
        left: x - entry.width / 2,
        right: x + entry.width / 2,
        top: y - entry.height / 2,
        bottom: y + entry.height / 2,
      }
      const isOverlapping =
        !isActive && occupied.some((item) => rectanglesOverlap(rect, item))

      entry.element.hidden = isOverlapping
      if (!isOverlapping) {
        const horizonOpacity = Math.min(
          1,
          Math.max(0, (hemisphereVisibility + 0.015) / 0.15),
        )
        entry.element.style.opacity = String(horizonOpacity)
        entry.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
        occupied.push(rect)
      }
    })
  }

  resize(): void {}

  dispose(): void {
    this.entries.length = 0
    this.group.removeFromParent()
    this.root.remove()
  }
}
