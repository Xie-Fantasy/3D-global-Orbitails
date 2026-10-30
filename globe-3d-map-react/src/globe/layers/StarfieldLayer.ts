import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
} from "three"
import type { Object3D } from "three"
import { GLOBE_COLORS } from "../config/globe.config"
import { disposeObject3D } from "../core/dispose"
import type { GlobeLayer, GlobeTheme, LayerResizeContext } from "../types/layers"
import type { QualityPreset } from "../config/quality.config"

const vertexShader = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;
  varying float vBrightness;

  void main() {
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = aSize * uPixelRatio * (260.0 / max(1.0, -modelViewPosition.z));
    vBrightness = aSize / 2.4;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vBrightness;

  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.18, 0.5, distanceToCenter);
    gl_FragColor = vec4(uColor, alpha * (0.32 + vBrightness * 0.45));
  }
`

interface StarUniforms {
  [uniform: string]: { value: unknown }
  uPixelRatio: { value: number }
  uColor: { value: Color }
}

function createSeededRandom(seed = 167): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function createStarfieldGeometry(starCount: number): {
  positions: Float32Array
  sizes: Float32Array
} {
  const random = createSeededRandom()
  const positions = new Float32Array(starCount * 3)
  const sizes = new Float32Array(starCount)

  for (let index = 0; index < starCount; index += 1) {
    const radius = 210 + random() * 390
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    const positionIndex = index * 3
    positions[positionIndex] = radius * Math.sin(phi) * Math.cos(theta)
    positions[positionIndex + 1] = radius * Math.cos(phi)
    positions[positionIndex + 2] = radius * Math.sin(phi) * Math.sin(theta)
    sizes[index] = 0.55 + random() * 1.95
  }

  return { positions, sizes }
}

export class StarfieldLayer implements GlobeLayer {
  readonly group = new Group()
  private readonly quality: QualityPreset
  private readonly reducedMotion: boolean
  private readonly uniforms: StarUniforms
  private points: Points

  constructor(quality: QualityPreset, pixelRatio: number) {
    this.quality = quality
    this.group.name = "starfield-layer"
    this.reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

    const { positions, sizes } = createStarfieldGeometry(quality.starCount)

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    geometry.setAttribute("aSize", new BufferAttribute(sizes, 1))

    this.uniforms = {
      uPixelRatio: { value: pixelRatio },
      uColor: { value: new Color(GLOBE_COLORS.star) },
    }

    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    })

    this.points = new Points(geometry, material)
    this.points.renderOrder = -10
    this.group.add(this.points)
  }

  mount(parent: Object3D): void {
    parent.add(this.group)
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  setTheme(theme: GlobeTheme): void {
    this.uniforms.uColor.value.setHex(theme.colors.star)
  }

  setDensity(value: number): void {
    const density = Math.max(25, Math.min(250, Number(value) || 100))
    const starCount = Math.max(
      120,
      Math.round(this.quality.starCount * (density / 100)),
    )
    const previousGeometry = this.points.geometry
    const { positions, sizes } = createStarfieldGeometry(starCount)
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    geometry.setAttribute("aSize", new BufferAttribute(sizes, 1))
    this.points.geometry = geometry
    previousGeometry.dispose()
  }

  update(delta: number): void {
    if (!this.reducedMotion) {
      this.group.rotation.y += delta * 0.0035
      this.group.rotation.x += delta * 0.0007
    }
  }

  resize(context: LayerResizeContext): void {
    this.uniforms.uPixelRatio.value = context.pixelRatio
  }

  dispose(): void {
    disposeObject3D(this.group)
  }
}
