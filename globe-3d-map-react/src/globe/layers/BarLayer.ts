import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from "three"
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config"
import { disposeObject3D } from "../core/dispose"
import { lonLatToVector3 } from "../math/geo"
import type { GlobeLayer, GlobeTheme } from "../types/layers"
import type { LocationRecord } from "../types/data"

const LOCAL_UP = new Vector3(0, 1, 0)

interface BarEntry {
  location: LocationRecord
  mesh: Mesh
  baseOpacity: number
}

export class BarLayer implements GlobeLayer {
  readonly group = new Group()
  readonly isEmpty: boolean
  private readonly entries = new Map<string, BarEntry>()
  private selectedId: string | null = null
  private readonly colors = {
    mint: new Color(GLOBE_COLORS.mint),
    amber: new Color(GLOBE_COLORS.amber),
  }

  constructor(locations: readonly LocationRecord[]) {
    this.group.name = "bar-layer"
    this.isEmpty = locations.length === 0
    this.group.visible = false

    const maximum = Math.max(1, ...locations.map((location) => location.value))

    locations.forEach((location) => {
      const normalized = location.value / maximum
      const height = 4 + normalized * 13
      const radius = location.type === "hub" ? 0.62 : 0.42
      const geometry = new CylinderGeometry(radius * 0.72, radius, height, 8, 1)
      geometry.translate(0, height / 2, 0)

      const material = new MeshBasicMaterial({
        color:
          location.type === "hub" ? this.colors.amber : this.colors.mint,
        transparent: true,
        opacity: location.type === "hub" ? 0.96 : 0.78,
        depthWrite: false,
        blending: AdditiveBlending,
      })
      const mesh = new Mesh(geometry, material)
      const position = lonLatToVector3(location.coordinate, EARTH_RADIUS * 1.006)
      const normal = position.clone().normalize()

      mesh.name = `bar-${location.id}`
      mesh.position.copy(position)
      mesh.quaternion.copy(new Quaternion().setFromUnitVectors(LOCAL_UP, normal))
      mesh.renderOrder = 7
      this.group.add(mesh)
      this.entries.set(location.id, { location, mesh, baseOpacity: material.opacity })
    })
  }

  mount(parent: import("three").Object3D): void {
    parent.add(this.group)
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  setSelected(locationId: string | null): void {
    this.selectedId = locationId
    this.entries.forEach((entry, id) => {
      const isSelected = id === locationId
      const material = entry.mesh.material as MeshBasicMaterial
      material.color.copy(
        isSelected || entry.location.type === "hub"
          ? this.colors.amber
          : this.colors.mint,
      )
      material.opacity = isSelected ? 1 : entry.baseOpacity
      entry.mesh.scale.set(
        isSelected ? 1.3 : 1,
        isSelected ? 1.08 : 1,
        isSelected ? 1.3 : 1,
      )
    })
  }

  setTheme(theme: GlobeTheme): void {
    this.colors.mint.setHex(theme.colors.mint)
    this.colors.amber.setHex(theme.colors.amber)
    this.setSelected(this.selectedId)
  }

  update(_delta: number, elapsed: number): void {
    if (this.selectedId) {
      const entry = this.entries.get(this.selectedId)
      if (entry) {
        ;(entry.mesh.material as MeshBasicMaterial).opacity =
          0.84 + Math.sin(elapsed * 3.2) * 0.16
      }
    }
  }

  resize(): void {}

  dispose(): void {
    this.entries.clear()
    disposeObject3D(this.group)
  }
}
