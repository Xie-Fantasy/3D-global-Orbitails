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
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config.js"
import { disposeObject3D } from "../core/dispose.js"
import { lonLatToVector3 } from "../math/geo.js"

const LOCAL_UP = new Vector3(0, 1, 0)

export class BarLayer {
  constructor(locations) {
    this.group = new Group()
    this.group.name = "bar-layer"
    this.isEmpty = locations.length === 0
    this.entries = new Map()
    this.selectedId = null
    this.colors = {
      mint: new Color(GLOBE_COLORS.mint),
      amber: new Color(GLOBE_COLORS.amber),
    }
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

  mount(parent) {
    parent.add(this.group)
  }

  setVisible(visible) {
    this.group.visible = visible
  }

  setSelected(locationId) {
    this.selectedId = locationId
    this.entries.forEach((entry, id) => {
      const isSelected = id === locationId
      entry.mesh.material.color.copy(
        isSelected || entry.location.type === "hub"
          ? this.colors.amber
          : this.colors.mint
      )
      entry.mesh.material.opacity = isSelected ? 1 : entry.baseOpacity
      entry.mesh.scale.set(isSelected ? 1.3 : 1, isSelected ? 1.08 : 1, isSelected ? 1.3 : 1)
    })
  }

  setTheme(theme) {
    this.colors.mint.setHex(theme.colors.mint)
    this.colors.amber.setHex(theme.colors.amber)
    this.setSelected(this.selectedId)
  }

  update(delta, elapsed) {
    if (this.selectedId) {
      const entry = this.entries.get(this.selectedId)
      if (entry) {
        entry.mesh.material.opacity = 0.84 + Math.sin(elapsed * 3.2) * 0.16
      }
    }
  }

  resize() {}

  dispose() {
    this.entries.clear()
    disposeObject3D(this.group)
  }
}
