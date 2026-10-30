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
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config.js"
import { disposeObject3D } from "../core/dispose.js"
import { lonLatToVector3 } from "../math/geo.js"

const LOCAL_FORWARD = new Vector3(0, 0, 1)
const UNIT_SCALE = new Vector3(1, 1, 1)
const LOCAL_POSITION = new Vector3()
const LOCAL_SCALE = new Vector3()
const LOCAL_ROTATION = new Quaternion()
const LOCAL_MATRIX = new Matrix4()
const INSTANCE_MATRIX = new Matrix4()

function setInstanceTransform(mesh, entry, scale, offset = 0, rotation = 0) {
  LOCAL_POSITION.set(0, 0, offset)
  LOCAL_SCALE.setScalar(scale)
  LOCAL_ROTATION.setFromAxisAngle(LOCAL_FORWARD, rotation)
  LOCAL_MATRIX.compose(LOCAL_POSITION, LOCAL_ROTATION, LOCAL_SCALE)
  INSTANCE_MATRIX.multiplyMatrices(entry.baseMatrix, LOCAL_MATRIX)
  mesh.setMatrixAt(entry.index, INSTANCE_MATRIX)
}

function createMaterial(opacity) {
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

function createMarkerEntry(location, index, colors) {
  const isHub = location.type === "hub"
  const surfacePosition = lonLatToVector3(
    location.coordinate,
    EARTH_RADIUS * 1.007
  )
  const orientation = new Quaternion().setFromUnitVectors(
    LOCAL_FORWARD,
    surfacePosition.clone().normalize()
  )
  const baseMatrix = new Matrix4().compose(
    surfacePosition,
    orientation,
    UNIT_SCALE
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

export class MarkerLayer {
  constructor(locations) {
    this.group = new Group()
    this.group.name = "marker-layer"
    this.isEmpty = locations.length === 0
    this.entries = new Map()
    this.interactiveObjects = []
    this.hoveredId = null
    this.selectedId = null
    this.colors = {
      mint: new Color(GLOBE_COLORS.mint),
      cyan: new Color(GLOBE_COLORS.cyan),
      amber: new Color(GLOBE_COLORS.amber),
    }

    if (this.isEmpty) {
      return
    }

    this.coreMesh = new InstancedMesh(
      new CircleGeometry(0.5, 24),
      createMaterial(0.96),
      locations.length
    )
    this.innerRingMesh = new InstancedMesh(
      new RingGeometry(0.68, 0.8, 32),
      createMaterial(0.68),
      locations.length
    )
    this.pulseRingMesh = new InstancedMesh(
      new RingGeometry(0.92, 1.02, 32),
      createMaterial(0.36),
      locations.length
    )
    this.hitTarget = new InstancedMesh(
      new SphereGeometry(1.25, 12, 8),
      new MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
      locations.length
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

    locations.forEach((location, index) => {
      const entry = createMarkerEntry(location, index, this.colors)
      this.entries.set(location.id, entry)
      this.hitTarget.userData.locationIds.push(location.id)
      this.hitTarget.userData.surfacePositions.push(entry.surfacePosition)
      this.coreMesh.setColorAt(index, entry.baseColor)
      this.innerRingMesh.setColorAt(index, entry.baseColor)
      this.pulseRingMesh.setColorAt(
        index,
        location.type === "hub" ? this.colors.amber : this.colors.cyan
      )
      setInstanceTransform(this.coreMesh, entry, entry.markerScale, 0.08)
      setInstanceTransform(this.innerRingMesh, entry, entry.markerScale)
      setInstanceTransform(this.pulseRingMesh, entry, entry.markerScale)
      setInstanceTransform(this.hitTarget, entry, location.type === "hub" ? 1.36 : 1)
    })

    this.markMatricesDirty()
    this.markColorsDirty()
    this.interactiveObjects.push(this.hitTarget)
    this.group.add(
      this.coreMesh,
      this.innerRingMesh,
      this.pulseRingMesh,
      this.hitTarget
    )
  }

  mount(parent) {
    parent.add(this.group)
  }

  getInteractiveObjects() {
    return this.interactiveObjects
  }

  setVisible(visible) {
    this.group.visible = visible
  }

  setHovered(locationId) {
    this.hoveredId = locationId
    this.applyInteractionState()
  }

  setSelected(locationId) {
    this.selectedId = locationId
    this.applyInteractionState()
  }

  applyInteractionState() {
    if (this.isEmpty) {
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
      this.coreMesh.setColorAt(entry.index, color)
      this.innerRingMesh.setColorAt(entry.index, color)
      this.pulseRingMesh.setColorAt(
        entry.index,
        isSelected
          ? this.colors.amber
          : isHovered
            ? this.colors.cyan
            : entry.location.type === "hub"
              ? this.colors.amber
              : this.colors.cyan
      )
      setInstanceTransform(
        this.coreMesh,
        entry,
        entry.markerScale * activeScale,
        0.08,
        entry.rotation
      )
      setInstanceTransform(
        this.innerRingMesh,
        entry,
        entry.markerScale * activeScale
      )
    })
    this.coreMesh.instanceMatrix.needsUpdate = true
    this.innerRingMesh.instanceMatrix.needsUpdate = true
    this.markColorsDirty()
  }

  setTheme(theme) {
    if (this.isEmpty) {
      return
    }
    this.colors.mint.setHex(theme.colors.mint)
    this.colors.cyan.setHex(theme.colors.cyan)
    this.colors.amber.setHex(theme.colors.amber)
    this.entries.forEach((entry) => {
      entry.baseColor.copy(
        entry.location.type === "hub" ? this.colors.amber : this.colors.mint
      )
    })
    this.applyInteractionState()
  }

  update(delta, elapsed) {
    if (this.isEmpty) {
      return
    }

    this.entries.forEach((entry, id) => {
      const pulse = (elapsed * 0.34 + entry.phase) % 1
      const active = id === this.selectedId || id === this.hoveredId
      const activeScale = id === this.selectedId ? 1.32 : id === this.hoveredId ? 1.18 : 1
      const pulseScale = (0.72 + pulse * (active ? 1.15 : 0.82)) * activeScale
      entry.rotation += delta * (entry.location.type === "hub" ? 0.72 : 0.28)
      setInstanceTransform(
        this.coreMesh,
        entry,
        entry.markerScale * activeScale,
        0.08,
        entry.rotation
      )
      setInstanceTransform(
        this.pulseRingMesh,
        entry,
        entry.markerScale * pulseScale
      )
    })
    this.coreMesh.instanceMatrix.needsUpdate = true
    this.pulseRingMesh.instanceMatrix.needsUpdate = true
  }

  markMatricesDirty() {
    this.coreMesh.instanceMatrix.needsUpdate = true
    this.innerRingMesh.instanceMatrix.needsUpdate = true
    this.pulseRingMesh.instanceMatrix.needsUpdate = true
    this.hitTarget.instanceMatrix.needsUpdate = true
  }

  markColorsDirty() {
    this.coreMesh.instanceColor.needsUpdate = true
    this.innerRingMesh.instanceColor.needsUpdate = true
    this.pulseRingMesh.instanceColor.needsUpdate = true
  }

  resize() {}

  dispose() {
    this.interactiveObjects = []
    this.entries.clear()
    disposeObject3D(this.group)
  }
}
