import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
} from "three"
import { GLOBE_COLORS } from "../config/globe.config.js"
import { disposeObject3D } from "../core/dispose.js"

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

function createSeededRandom(seed = 167) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

export class StarfieldLayer {
  constructor(quality, pixelRatio) {
    this.quality = quality
    this.density = 100
    this.group = new Group()
    this.group.name = "starfield-layer"
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

    const { positions, sizes } = createStarfieldGeometry(quality.starCount)

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    geometry.setAttribute("aSize", new BufferAttribute(sizes, 1))

    this.material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: pixelRatio },
        uColor: { value: new Color(GLOBE_COLORS.star) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    })

    this.points = new Points(geometry, this.material)
    this.points.renderOrder = -10
    this.group.add(this.points)
  }

  mount(parent) {
    parent.add(this.group)
  }

  setVisible(visible) {
    this.group.visible = visible
  }

  setTheme(theme) {
    this.material.uniforms.uColor.value.setHex(theme.colors.star)
  }

  setDensity(value) {
    this.density = Math.max(25, Math.min(250, Number(value) || 100))
    const starCount = Math.max(
      120,
      Math.round(this.quality.starCount * (this.density / 100))
    )
    const previousGeometry = this.points.geometry
    const { positions, sizes } = createStarfieldGeometry(starCount)
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    geometry.setAttribute("aSize", new BufferAttribute(sizes, 1))
    this.points.geometry = geometry
    previousGeometry.dispose()
  }

  update(delta) {
    if (!this.reducedMotion) {
      this.group.rotation.y += delta * 0.0035
      this.group.rotation.x += delta * 0.0007
    }
  }

  resize({ pixelRatio }) {
    this.material.uniforms.uPixelRatio.value = pixelRatio
  }

  dispose() {
    disposeObject3D(this.group)
  }
}

function createStarfieldGeometry(starCount) {
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
