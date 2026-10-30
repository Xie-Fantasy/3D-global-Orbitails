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
import type { Feature } from "geojson"
import countriesTopology from "world-atlas/countries-110m.json"
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config"
import { disposeObject3D } from "../core/dispose"
import { buildSurfaceSegment } from "../math/curves"
import type { GlobeLayer, GlobeTheme, LayerResizeContext } from "../types/layers"
import type { LonLat } from "../types/data"

type Topology = Parameters<typeof mesh>[0]
type GeometryObject = Parameters<typeof mesh>[1]
type CountriesTopology = Topology & {
  objects: { countries: GeometryObject }
}

const topology = countriesTopology as unknown as CountriesTopology

function getCountryRings(countryFeature: Feature | null | undefined): number[][][] {
  const geometry = countryFeature?.geometry
  if (!geometry) {
    return []
  }
  if (geometry.type === "Polygon") {
    return geometry.coordinates as number[][][]
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).flat()
  }
  return []
}

function createSelectedPositions(countryFeature: Feature): number[] {
  const positions: number[] = []
  const rings = getCountryRings(countryFeature)
  const radius = EARTH_RADIUS * 1.009

    rings.forEach((ring) => {
    for (let index = 1; index < ring.length; index += 1) {
      const start = ring[index - 1] as unknown as LonLat
      const end = ring[index] as unknown as LonLat
      const points = buildSurfaceSegment(start, end, radius, 1.4)
      for (
        let pointIndex = 1;
        pointIndex < points.length;
        pointIndex += 1
      ) {
        positions.push(
          ...points[pointIndex - 1]!.toArray(),
          ...points[pointIndex]!.toArray(),
        )
      }
    }
  })
  return positions
}

function createFocusMaterial(options: Record<string, unknown>): LineMaterial {
  return new LineMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    worldUnits: false,
    ...options,
  })
}

interface SelectedMaterials {
  halo: LineMaterial
  core: LineMaterial
  tracer: LineMaterial
}

export class BoundaryLayer implements GlobeLayer {
  readonly group = new Group()
  private readonly lines: LineSegments
  private selectedGroup: Group | null = null
  private selectedGeometry: LineSegmentsGeometry | null = null
  private selectedMaterials: SelectedMaterials | null = null
  private selectedElapsed = 0
  private size: LayerResizeContext = { width: 1, height: 1, pixelRatio: 1 }

  constructor() {
    this.group.name = "boundary-layer"

    const worldMesh = mesh(topology, topology.objects.countries)
    const positions: number[] = []
    const radius = EARTH_RADIUS * 1.0035

    worldMesh.coordinates.forEach((line: number[][]) => {
      for (let index = 1; index < line.length; index += 1) {
        const start = line[index - 1] as unknown as LonLat
        const end = line[index] as unknown as LonLat
        const points = buildSurfaceSegment(start, end, radius, 2.5)
        for (
          let pointIndex = 1;
          pointIndex < points.length;
          pointIndex += 1
        ) {
          positions.push(
            ...points[pointIndex - 1]!.toArray(),
            ...points[pointIndex]!.toArray(),
          )
        }
      }
    })

    const geometry = new BufferGeometry()
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    )

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
  }

  mount(parent: import("three").Object3D): void {
    parent.add(this.group)
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  setTheme(theme: GlobeTheme): void {
    ;(this.lines.material as LineBasicMaterial).color.setHex(
      theme.colors.boundary,
    )
    this.selectedMaterials?.halo.color.setHex(theme.colors.mint)
    this.selectedMaterials?.core.color.setHex(theme.colors.boundary)
    this.selectedMaterials?.tracer.color.setHex(theme.colors.cyan)
  }

  setSelectedCountry(countryFeature: Feature | null): void {
    if (this.selectedGroup) {
      this.group.remove(this.selectedGroup)
      this.selectedGeometry?.dispose()
      if (this.selectedMaterials) {
        Object.values(this.selectedMaterials).forEach((material) =>
          material.dispose(),
        )
      }
      this.selectedGroup = null
      this.selectedGeometry = null
      this.selectedMaterials = null
    }

    ;(this.lines.material as LineBasicMaterial).opacity = countryFeature
      ? 0.28
      : 0.58
    if (!countryFeature) {
      return
    }

    this.selectedGeometry = new LineSegmentsGeometry()
    this.selectedGeometry.setPositions(
      createSelectedPositions(countryFeature),
    )
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
    Object.entries(this.selectedMaterials).forEach(
      ([name, material], index) => {
        const line = new LineSegments2(this.selectedGeometry!, material)
        line.name = `selected-country-${name}`
        line.renderOrder = 8 + index
        line.computeLineDistances()
        this.selectedGroup!.add(line)
      },
    )
    this.selectedElapsed = 0
    this.group.add(this.selectedGroup)
  }

  update(delta: number): void {
    if (!this.selectedMaterials) {
      return
    }
    this.selectedElapsed += delta
    this.selectedMaterials.tracer.dashOffset -= delta * 5.2
    this.selectedMaterials.halo.opacity =
      0.13 + Math.sin(this.selectedElapsed * 2.4) * 0.045
  }

  resize(size: LayerResizeContext): void {
    this.size = size
    Object.values(this.selectedMaterials ?? {}).forEach((material) => {
      material.resolution.set(size.width, size.height)
    })
  }

  dispose(): void {
    disposeObject3D(this.group)
  }
}
