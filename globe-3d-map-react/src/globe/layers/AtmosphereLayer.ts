import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from "three"
import type { Object3D } from "three"
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config"
import { disposeObject3D } from "../core/dispose"
import type { GlobeLayer, GlobeTheme } from "../types/layers"

const glowVertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const glowFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uMotion;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(
      1.0 - abs(dot(normalize(vWorldNormal), viewDirection)),
      uPower
    );
    float pulse = mix(1.0, 0.88 + sin(uTime * 1.05) * 0.12, uMotion);
    gl_FragColor = vec4(uColor, fresnel * uIntensity * pulse);
  }
`

const bandVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const bandFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uMotion;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 1.7);
    float latitude = abs(vUv.y - 0.48);
    float curtain = 1.0 - smoothstep(0.08, 0.37, latitude);
    float fineColumns = pow(0.5 + 0.5 * sin(vUv.x * 720.0), 8.0);
    float movingGate = 0.48 + 0.52 * sin(vUv.x * 26.0 - uTime * 1.45);
    float sweep = pow(
      max(0.0, 0.5 + 0.5 * cos(vUv.x * 6.2831853 - uTime * 0.34)),
      5.0
    );
    float alpha = curtain * (
      0.025 +
      fineColumns * movingGate * 0.075 +
      sweep * 0.12 +
      rim * 0.14
    ) * uMotion;
    gl_FragColor = vec4(uColor * (0.72 + sweep * 0.72), alpha);
  }
`

interface GlowUniforms {
  [uniform: string]: { value: unknown }
  uColor: { value: Color }
  uPower: { value: number }
  uIntensity: { value: number }
  uTime: { value: number }
  uMotion: { value: number }
}

interface BandUniforms {
  [uniform: string]: { value: unknown }
  uColor: { value: Color }
  uTime: { value: number }
  uMotion: { value: number }
}

function createGlowMaterial(
  side: typeof FrontSide | typeof BackSide,
  power: number,
  intensity: number,
): { material: ShaderMaterial; uniforms: GlowUniforms } {
  const uniforms: GlowUniforms = {
    uColor: { value: new Color(GLOBE_COLORS.mint) },
    uPower: { value: power },
    uIntensity: { value: intensity },
    uTime: { value: 0 },
    uMotion: { value: 1 },
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    side,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  })
  return { material, uniforms }
}

function createBandMaterial(): {
  material: ShaderMaterial
  uniforms: BandUniforms
} {
  const uniforms: BandUniforms = {
    uColor: { value: new Color(GLOBE_COLORS.halo) },
    uTime: { value: 0 },
    uMotion: { value: 1 },
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: bandVertexShader,
    fragmentShader: bandFragmentShader,
    side: FrontSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  })
  return { material, uniforms }
}

export class AtmosphereLayer implements GlobeLayer {
  readonly group = new Group()
  private readonly reducedMotion: boolean
  private animationEnabled: boolean
  private motionMix: number
  private readonly glowUniforms: GlowUniforms[]
  private readonly bandUniforms: BandUniforms
  private readonly innerGlow: Mesh
  private readonly outerGlow: Mesh
  private readonly motionBand: Mesh

  constructor(quality: { sphereSegments: readonly [number, number] }) {
    this.group.name = "atmosphere-layer"
    this.reducedMotion =
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) ??
      false
    this.animationEnabled = !this.reducedMotion
    this.motionMix = this.animationEnabled ? 1 : 0
    const [widthSegments, heightSegments] = quality.sphereSegments

    const inner = createGlowMaterial(FrontSide, 2.6, 0.4)
    const outer = createGlowMaterial(BackSide, 2.1, 0.92)
    const band = createBandMaterial()
    this.glowUniforms = [inner.uniforms, outer.uniforms]
    this.bandUniforms = band.uniforms

    this.innerGlow = new Mesh(
      new SphereGeometry(EARTH_RADIUS * 1.009, widthSegments, heightSegments),
      inner.material,
    )
    this.outerGlow = new Mesh(
      new SphereGeometry(EARTH_RADIUS * 1.075, widthSegments, heightSegments),
      outer.material,
    )
    this.motionBand = new Mesh(
      new SphereGeometry(EARTH_RADIUS * 1.013, widthSegments, heightSegments),
      band.material,
    )
    this.innerGlow.renderOrder = 3
    this.outerGlow.renderOrder = 4
    this.motionBand.renderOrder = 4
    this.group.add(this.innerGlow, this.outerGlow, this.motionBand)
    this.setAnimationEnabled(this.animationEnabled)
  }

  mount(parent: Object3D): void {
    parent.add(this.group)
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  setAnimationEnabled(enabled: boolean): boolean {
    this.animationEnabled = Boolean(enabled) && !this.reducedMotion
    return this.animationEnabled
  }

  setTheme(theme: GlobeTheme): void {
    this.glowUniforms.forEach((uniforms) => {
      uniforms.uColor.value.setHex(theme.colors.mint)
    })
    this.bandUniforms.uColor.value.setHex(theme.colors.halo)
  }

  update(delta: number): void {
    const target = this.animationEnabled ? 1 : 0
    this.motionMix += (target - this.motionMix) * Math.min(1, delta * 6)
    const advance = this.animationEnabled || this.motionMix > 0.002
    this.glowUniforms.forEach((uniforms) => {
      if (advance) {
        uniforms.uTime.value += delta
      }
      uniforms.uMotion.value = this.motionMix
    })
    if (advance) {
      this.bandUniforms.uTime.value += delta
    }
    this.bandUniforms.uMotion.value = this.motionMix
  }

  resize(): void {}

  dispose(): void {
    disposeObject3D(this.group)
  }
}
