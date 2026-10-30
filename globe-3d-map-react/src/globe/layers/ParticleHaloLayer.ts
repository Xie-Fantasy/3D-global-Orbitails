import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Group,
  Points,
  ShaderMaterial,
  Vector3,
} from "three"
import type { Object3D } from "three"
import { GLOBE_COLORS } from "../config/globe.config"
import { disposeObject3D } from "../core/dispose"
import type { GlobeLayer, GlobeTheme, LayerResizeContext } from "../types/layers"
import type { QualityPreset } from "../config/quality.config"

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aBrightness;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.72 + sin(uTime * 0.7 + aPhase * 6.2831853) * 0.28;
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = aSize * uPixelRatio * (280.0 / max(1.0, -modelViewPosition.z));
    vAlpha = aBrightness * pulse;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;

  varying float vAlpha;

  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float core = 1.0 - smoothstep(0.08, 0.5, distanceToCenter);
    float glow = 1.0 - smoothstep(0.16, 0.5, distanceToCenter);
    float alpha = (core * 0.72 + glow * 0.28) * vAlpha * uIntensity;
    gl_FragColor = vec4(uColor * (0.72 + core * 0.58), alpha);
  }
`

interface HaloUniforms {
  [uniform: string]: { value: unknown }
  uTime: { value: number }
  uPixelRatio: { value: number }
  uColor: { value: Color }
  uIntensity: { value: number }
}

function createSeededRandom(seed = 3047): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function createHaloGeometry(particleCount: number, density = 100): BufferGeometry {
  const random = createSeededRandom()
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const phases = new Float32Array(particleCount)
  const brightness = new Float32Array(particleCount)
  const position = new Vector3()
  const ringTilts: Euler[] = [
    new Euler(0.34, -0.08, -0.22),
    new Euler(-0.2, 0.18, 0.48),
  ]

  for (let index = 0; index < particleCount; index += 1) {
    const ringIndex = index % ringTilts.length
    const angle = random() * Math.PI * 2
    const spread = 0.82 + (density / 100) * 0.4
    const radius = 58 + random() * (ringIndex === 0 ? 13 : 10) * spread
    const thickness = (random() - 0.5) * (ringIndex === 0 ? 4.2 : 2.8) * spread
    const positionIndex = index * 3
    const tilt = ringTilts[ringIndex]!

    position
      .set(Math.cos(angle) * radius, thickness, Math.sin(angle) * radius)
      .applyEuler(tilt)
    positions[positionIndex] = position.x
    positions[positionIndex + 1] = position.y
    positions[positionIndex + 2] = position.z
    sizes[index] = 0.7 + random() * (ringIndex === 0 ? 1.65 : 1.25)
    phases[index] = random()
    brightness[index] = 0.22 + random() * 0.58
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(positions, 3))
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1))
  geometry.setAttribute("aPhase", new BufferAttribute(phases, 1))
  geometry.setAttribute("aBrightness", new BufferAttribute(brightness, 1))
  return geometry
}

export class ParticleHaloLayer implements GlobeLayer {
  readonly group = new Group()
  private density = 100
  private readonly quality: QualityPreset
  private readonly reducedMotion: boolean
  private readonly uniforms: HaloUniforms
  private points: Points

  constructor(quality: QualityPreset, pixelRatio: number) {
    this.quality = quality
    this.group.name = "particle-halo-layer"
    this.reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    this.uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uColor: { value: new Color(GLOBE_COLORS.halo) },
      uIntensity: { value: quality.id === "low" ? 0.62 : 0.78 },
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
    this.points = new Points(
      createHaloGeometry(quality.haloParticleCount, this.density),
      material,
    )
    this.points.name = "particle-halo"
    this.points.renderOrder = 1
    this.group.add(this.points)
  }

  mount(parent: Object3D): void {
    parent.add(this.group)
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  setTheme(theme: GlobeTheme): void {
    this.uniforms.uColor.value.setHex(theme.colors.halo)
  }

  setDensity(value: number): void {
    this.density = Math.max(25, Math.min(250, Number(value) || 100))
    const particleCount = Math.max(
      80,
      Math.round(this.quality.haloParticleCount * (this.density / 100)),
    )
    const previousGeometry = this.points.geometry
    this.points.geometry = createHaloGeometry(particleCount, this.density)
    previousGeometry.dispose()
  }

  update(delta: number): void {
    if (this.reducedMotion) {
      return
    }

    this.uniforms.uTime.value += delta
    this.group.rotation.y += delta * (0.009 + this.density * 0.00006)
    this.group.rotation.z += delta * 0.0025
  }

  resize(context: LayerResizeContext): void {
    this.uniforms.uPixelRatio.value = context.pixelRatio
  }

  dispose(): void {
    disposeObject3D(this.group)
  }
}
