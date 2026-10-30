import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from "three"
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config"
import { disposeObject3D } from "../core/dispose"
import { lonLatToVector3 } from "../math/geo"
import type { GlobeLayer, GlobeTheme } from "../types/layers"
import type { LocationRecord } from "../types/data"

const LOCAL_FORWARD = new Vector3(0, 0, 1)
const UNIT_SCALE = new Vector3(1, 1, 1)
const LOCAL_POSITION = new Vector3()
const LOCAL_SCALE = new Vector3()
const LOCAL_ROTATION = new Quaternion()
const LOCAL_MATRIX = new Matrix4()
const INSTANCE_MATRIX = new Matrix4()

interface MarkerEntry {
  index: number
  location: LocationRecord
  surfacePosition: Vector3
  baseMatrix: Matrix4
  baseColor: Color
  markerScale: number
  phase: number
  rotation: number
}

function setInstanceTransform(
  mesh: InstancedMesh,
  entry: MarkerEntry,
  scale: number,
  offset = 0,
  rotation = 0,
): void {
  LOCAL_POSITION.set(0, 0, offset)
  LOCAL_SCALE.setScalar(scale)
  LOCAL_ROTATION.setFromAxisAngle(LOCAL_FORWARD, rotation)
  LOCAL_MATRIX.compose(LOCAL_POSITION, LOCAL_ROTATION, LOCAL_SCALE)
  INSTANCE_MATRIX.multiplyMatrices(entry.baseMatrix, LOCAL_MATRIX)
  mesh.setMatrixAt(entry.index, INSTANCE_MATRIX)
}

function createMaterial(opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity,
    depthWrite: false,
    side: DoubleSide,
    vertexColors: true,
    blending: AdditiveBlending,
  })
}

function createMarkerEntry(
  location: LocationRecord,
  index: number,
  colors: { mint: Color; cyan: Color; amber: Color },
): MarkerEntry {
  const isHub = location.type === "hub"
  const surfacePosition = lonLatToVector3(location.coordinate, EARTH_RADIUS * 1.007)
  const orientation = new Quaternion().setFromUnitVectors(
    LOCAL_FORWARD,
    surfacePosition.clone().normalize(),
  )
  const baseMatrix = new Matrix4().compose(
    surfacePosition,
    orientation,
    UNIT_SCALE,
  )

  return {
    index,
    location,
    surfacePosition,
    baseMatrix,
    baseColor: (isHub ? colors.amber : colors.mint).clone(),
    markerScale: isHub ? 1.4 : 1,
    phase: (location.priority % 13) / 13,
    rotation: 0,
  }
}

export class MarkerLayer implements GlobeLayer {
  readonly group = new Group()
  readonly isEmpty: boolean
  private readonly entries = new Map<string, MarkerEntry>()
  private readonly interactiveObjects: import("three").Object3D[] = []
  private hoveredId: string | null = null
  private selectedId: string | null = null
  private readonly colors = {
    mint: new Color(GLOBE_COLORS.mint),
    cyan: new Color(GLOBE_COLORS.cyan),
    amber: new Color(GLOBE_COLORS.amber),
  }
  private coreMesh: InstancedMesh | null = null
  private innerRingMesh: InstancedMesh | null = null
  private pulseRingMesh: InstancedMesh | null = null
  private hitTarget: InstancedMesh | null = null

  constructor(locations: readonly LocationRecord[]) {
    this.group.name = "marker-layer"
    this.isEmpty = locations.length === 0

    if (this.isEmpty) {
      return
    }

    this.coreMesh = new InstancedMesh(
      new CircleGeometry(0.5, 24),
      createMaterial(0.96),
      locations.length,
    )
    this.innerRingMesh = new InstancedMesh(
      new RingGeometry(0.68, 0.8, 32),
      createMaterial(0.68),
      locations.length,
    )
    this.pulseRingMesh = new InstancedMesh(
      new RingGeometry(0.92, 1.02, 32),
      createMaterial(0.36),
      locations.length,
    )
    this.hitTarget = new InstancedMesh(
      new SphereGeometry(1.25, 12, 8),
      new MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
      locations.length,
    )

    this.coreMesh.name = "marker-cores"
    this.innerRingMesh.name = "marker-inner-rings"
    this.pulseRingMesh.name = "marker-pulse-rings"
    this.hitTarget.name = "marker-hit-targets"
    this.coreMesh.renderOrder = 9
    this.innerRingMesh.renderOrder = 8
    this.pulseRingMesh.renderOrder = 8
    this.coreMesh.frustumCulled = false
    this.innerRingMesh.frustumCulled = false
    this.pulseRingMesh.frustumCulled = false
    this.hitTarget.visible = false
    this.coreMesh.instanceMatrix.setUsage(DynamicDrawUsage)
    this.innerRingMesh.instanceMatrix.setUsage(DynamicDrawUsage)
    this.pulseRingMesh.instanceMatrix.setUsage(DynamicDrawUsage)
    this.hitTarget.userData.locationIds = []
    this.hitTarget.userData.surfacePositions = []

    const hitTarget = this.hitTarget
    locations.forEach((location, index) => {
      const entry = createMarkerEntry(location, index, this.colors)
      this.entries.set(location.id, entry)
      const hitUser = hitTarget.userData as {
        locationIds: string[]
        surfacePositions: Vector3[]
      }
      hitUser.locationIds.push(location.id)
      hitUser.surfacePositions.push(entry.surfacePosition)
      this.coreMesh!.setColorAt(index, entry.baseColor)
      this.innerRingMesh!.setColorAt(index, entry.baseColor)
      this.pulseRingMesh!.setColorAt(
        index,
        location.type === "hub" ? this.colors.amber : this.colors.cyan,
      )
      setInstanceTransform(this.coreMesh!, entry, entry.markerScale, 0.08)
      setInstanceTransform(this.innerRingMesh!, entry, entry.markerScale)
      setInstanceTransform(this.pulseRingMesh!, entry, entry.markerScale)
      setInstanceTransform(
        hitTarget,
        entry,
        location.type === "hub" ? 1.36 : 1,
      )
    })

    this.markMatricesDirty()
    this.markColorsDirty()
    this.interactiveObjects.push(hitTarget)
    this.group.add(
      this.coreMesh,
      this.innerRingMesh,
      this.pulseRingMesh,
      hitTarget,
    )
  }

  mount(parent: import("three").Object3D): void {
    parent.add(this.group)
  }

  getInteractiveObjects(): import("three").Object3D[] {
    return this.interactiveObjects
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  setHovered(locationId: string | null): void {
    this.hoveredId = locationId
    this.applyInteractionState()
  }

  setSelected(locationId: string | null): void {
    this.selectedId = locationId
    this.applyInteractionState()
  }

  private applyInteractionState(): void {
    if (this.isEmpty || !this.coreMesh || !this.innerRingMesh) {
      return
    }

    this.entries.forEach((entry, id) => {
      const isSelected = id === this.selectedId
      const isHovered = id === this.hoveredId
      const activeScale = isSelected ? 1.32 : isHovered ? 1.18 : 1
      const color = isSelected
        ? this.colors.amber
        : isHovered
          ? this.colors.cyan
          : entry.baseColor
      this.coreMesh!.setColorAt(entry.index, color)
      this.innerRingMesh!.setColorAt(entry.index, color)
      this.pulseRingMesh!.setColorAt(
        entry.index,
        isSelected
          ? this.colors.amber
          : isHovered
            ? this.colors.cyan
            : entry.location.type === "hub"
              ? this.colors.amber
              : this.colors.cyan,
      )
      setInstanceTransform(
        this.coreMesh!,
        entry,
        entry.markerScale * activeScale,
        0.08,
        entry.rotation,
      )
      setInstanceTransform(
        this.innerRingMesh!,
        entry,
        entry.markerScale * activeScale,
      )
    })
    this.coreMesh.instanceMatrix.needsUpdate = true
    this.innerRingMesh.instanceMatrix.needsUpdate = true
    this.markColorsDirty()
  }

  setTheme(theme: GlobeTheme): void {
    if (this.isEmpty) {
      return
    }
    this.colors.mint.setHex(theme.colors.mint)
    this.colors.cyan.setHex(theme.colors.cyan)
    this.colors.amber.setHex(theme.colors.amber)
    this.entries.forEach((entry) => {
      entry.baseColor.copy(
        entry.location.type === "hub" ? this.colors.amber : this.colors.mint,
      )
    })
    this.applyInteractionState()
  }

  update(delta: number, elapsed: number): void {
    if (
      this.isEmpty ||
      !this.coreMesh ||
      !this.pulseRingMesh
    ) {
      return
    }

    this.entries.forEach((entry, id) => {
      const pulse = (elapsed * 0.34 + entry.phase) % 1
      const active = id === this.selectedId || id === this.hoveredId
      const activeScale =
        id === this.selectedId ? 1.32 : id === this.hoveredId ? 1.18 : 1
      const pulseScale = (0.72 + pulse * (active ? 1.15 : 0.82)) * activeScale
      entry.rotation += delta * (entry.location.type === "hub" ? 0.72 : 0.28)
      setInstanceTransform(
        this.coreMesh!,
        entry,
        entry.markerScale * activeScale,
        0.08,
        entry.rotation,
      )
      setInstanceTransform(
        this.pulseRingMesh!,
        entry,
        entry.markerScale * pulseScale,
      )
    })
    this.coreMesh.instanceMatrix.needsUpdate = true
    this.pulseRingMesh.instanceMatrix.needsUpdate = true
  }

  private markMatricesDirty(): void {
    if (this.coreMesh) {
      this.coreMesh.instanceMatrix.needsUpdate = true
    }
    if (this.innerRingMesh) {
      this.innerRingMesh.instanceMatrix.needsUpdate = true
    }
    if (this.pulseRingMesh) {
      this.pulseRingMesh.instanceMatrix.needsUpdate = true
    }
    if (this.hitTarget) {
      this.hitTarget.instanceMatrix.needsUpdate = true
    }
  }

  private markColorsDirty(): void {
    if (this.coreMesh?.instanceColor) {
      this.coreMesh.instanceColor.needsUpdate = true
    }
    if (this.innerRingMesh?.instanceColor) {
      this.innerRingMesh.instanceColor.needsUpdate = true
    }
    if (this.pulseRingMesh?.instanceColor) {
      this.pulseRingMesh.instanceColor.needsUpdate = true
    }
  }

  resize(): void {}

  dispose(): void {
    this.interactiveObjects.length = 0
    this.entries.clear()
    disposeObject3D(this.group)
  }
}
