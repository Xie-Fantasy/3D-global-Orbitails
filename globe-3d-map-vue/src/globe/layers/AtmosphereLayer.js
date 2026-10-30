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
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config.js"
import { disposeObject3D } from "../core/dispose.js"

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

function createGlowMaterial(side, power, intensity) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(GLOBE_COLORS.mint) },
      uPower: { value: power },
      uIntensity: { value: intensity },
      uTime: { value: 0 },
      uMotion: { value: 1 },
    },
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    side,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  })
}

function createBandMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(GLOBE_COLORS.halo) },
      uTime: { value: 0 },
      uMotion: { value: 1 },
    },
    vertexShader: bandVertexShader,
    fragmentShader: bandFragmentShader,
    side: FrontSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  })
}

export class AtmosphereLayer {
  constructor(quality) {
    this.group = new Group()
    this.group.name = "atmosphere-layer"
    this.reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    this.animationEnabled = !this.reducedMotion
    this.motionMix = this.animationEnabled ? 1 : 0
    const [widthSegments, heightSegments] = quality.sphereSegments

    const innerMaterial = createGlowMaterial(FrontSide, 2.6, 0.4)
    const outerMaterial = createGlowMaterial(BackSide, 2.1, 0.92)
    const bandMaterial = createBandMaterial()
    this.materials = [innerMaterial, outerMaterial, bandMaterial]

    this.innerGlow = new Mesh(
      new SphereGeometry(EARTH_RADIUS * 1.009, widthSegments, heightSegments),
      innerMaterial
    )
    this.outerGlow = new Mesh(
      new SphereGeometry(EARTH_RADIUS * 1.075, widthSegments, heightSegments),
      outerMaterial
    )
    this.motionBand = new Mesh(
      new SphereGeometry(EARTH_RADIUS * 1.013, widthSegments, heightSegments),
      bandMaterial
    )
    this.innerGlow.renderOrder = 3
    this.outerGlow.renderOrder = 4
    this.motionBand.renderOrder = 4
    this.group.add(this.innerGlow, this.outerGlow, this.motionBand)
    this.setAnimationEnabled(this.animationEnabled)
  }

  mount(parent) {
    parent.add(this.group)
  }

  setVisible(visible) {
    this.group.visible = visible
  }

  setAnimationEnabled(enabled) {
    this.animationEnabled = Boolean(enabled) && !this.reducedMotion
    return this.animationEnabled
  }

  setTheme(theme) {
    this.materials.slice(0, 2).forEach((material) => {
      material.uniforms.uColor.value.setHex(theme.colors.mint)
    })
    this.materials[2].uniforms.uColor.value.setHex(theme.colors.halo)
  }

  update(delta) {
    const target = this.animationEnabled ? 1 : 0
    this.motionMix += (target - this.motionMix) * Math.min(1, delta * 6)
    this.materials.forEach((material) => {
      if (this.animationEnabled || this.motionMix > 0.002) {
        material.uniforms.uTime.value += delta
      }
      material.uniforms.uMotion.value = this.motionMix
    })
  }

  resize() {}

  dispose() {
    disposeObject3D(this.group)
  }
}
