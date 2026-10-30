import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
} from "three"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js"
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js"
import { mesh } from "topojson-client"
import countriesTopology from "world-atlas/countries-110m.json" with { type: "json" }
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config.js"
import { disposeObject3D } from "../core/dispose.js"
import { buildSurfaceSegment } from "../math/curves.js"

function getCountryRings(countryFeature) {
  const coordinates = countryFeature?.geometry?.coordinates ?? []
  if (countryFeature?.geometry?.type === "Polygon") {
    return coordinates
  }
  if (countryFeature?.geometry?.type === "MultiPolygon") {
    return coordinates.flat()
  }
  return []
}

function createSelectedPositions(countryFeature) {
  const positions = []
  const rings = getCountryRings(countryFeature)
  const radius = EARTH_RADIUS * 1.009

  rings.forEach((ring) => {
    for (let index = 1; index < ring.length; index += 1) {
      const points = buildSurfaceSegment(ring[index - 1], ring[index], radius, 1.4)
      for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
        positions.push(
          ...points[pointIndex - 1].toArray(),
          ...points[pointIndex].toArray()
        )
      }
    }
  })
  return positions
}

function createFocusMaterial(options) {
  return new LineMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    worldUnits: false,
    ...options,
  })
}

export class BoundaryLayer {
  constructor() {
    this.group = new Group()
    this.group.name = "boundary-layer"

    const worldMesh = mesh(countriesTopology, countriesTopology.objects.countries)
    const positions = []
    const radius = EARTH_RADIUS * 1.0035

    worldMesh.coordinates.forEach((line) => {
      for (let index = 1; index < line.length; index += 1) {
        const points = buildSurfaceSegment(line[index - 1], line[index], radius, 2.5)
        for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
          positions.push(...points[pointIndex - 1].toArray(), ...points[pointIndex].toArray())
        }
      }
    })

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3))

    const material = new LineBasicMaterial({
      color: GLOBE_COLORS.boundary,
      transparent: true,
      opacity: 0.58,
      blending: AdditiveBlending,
      depthWrite: false,
    })

    this.lines = new LineSegments(geometry, material)
    this.lines.renderOrder = 2
    this.group.add(this.lines)
    this.selectedGroup = null
    this.selectedGeometry = null
    this.selectedMaterials = null
    this.selectedElapsed = 0
    this.size = { width: 1, height: 1 }
  }

  mount(parent) {
    parent.add(this.group)
  }

  setVisible(visible) {
    this.group.visible = visible
  }

  setTheme(theme) {
    this.lines.material.color.setHex(theme.colors.boundary)
    this.selectedMaterials?.halo.color.setHex(theme.colors.mint)
    this.selectedMaterials?.core.color.setHex(theme.colors.boundary)
    this.selectedMaterials?.tracer.color.setHex(theme.colors.cyan)
  }

  setSelectedCountry(countryFeature) {
    if (this.selectedGroup) {
      this.group.remove(this.selectedGroup)
      this.selectedGeometry.dispose()
      Object.values(this.selectedMaterials).forEach((material) => material.dispose())
      this.selectedGroup = null
      this.selectedGeometry = null
      this.selectedMaterials = null
    }

    this.lines.material.opacity = countryFeature ? 0.28 : 0.58
    if (!countryFeature) {
      return
    }

    this.selectedGeometry = new LineSegmentsGeometry()
    this.selectedGeometry.setPositions(createSelectedPositions(countryFeature))
    this.selectedMaterials = {
      halo: createFocusMaterial({
        color: GLOBE_COLORS.mint,
        linewidth: 12,
        opacity: 0.14,
      }),
      core: createFocusMaterial({
        color: GLOBE_COLORS.boundary,
        linewidth: 3.2,
        opacity: 0.96,
      }),
      tracer: createFocusMaterial({
        color: GLOBE_COLORS.cyan,
        linewidth: 5.2,
        opacity: 0.96,
        dashed: true,
        dashSize: 1.1,
        gapSize: 8.5,
      }),
    }
    this.selectedGroup = new Group()
    this.selectedGroup.name = "selected-country-focus"
    Object.values(this.selectedMaterials).forEach((material) => {
      material.resolution.set(this.size.width, this.size.height)
    })
    Object.entries(this.selectedMaterials).forEach(([name, material], index) => {
      const line = new LineSegments2(this.selectedGeometry, material)
      line.name = `selected-country-${name}`
      line.renderOrder = 8 + index
      line.computeLineDistances()
      this.selectedGroup.add(line)
    })
    this.selectedElapsed = 0
    this.group.add(this.selectedGroup)
  }

  update(delta) {
    if (!this.selectedMaterials) {
      return
    }
    this.selectedElapsed += delta
    this.selectedMaterials.tracer.dashOffset -= delta * 5.2
    this.selectedMaterials.halo.opacity =
      0.13 + Math.sin(this.selectedElapsed * 2.4) * 0.045
  }

  resize(size) {
    this.size = size
    Object.values(this.selectedMaterials ?? {}).forEach((material) => {
      material.resolution.set(size.width, size.height)
    })
  }

  dispose() {
    disposeObject3D(this.group)
  }
}
