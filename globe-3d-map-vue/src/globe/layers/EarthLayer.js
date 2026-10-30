import {
  Color,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from "three"
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config.js"
import { disposeObject3D } from "../core/dispose.js"

const vertexShader = /* glsl */ `
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

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSurfaceDeep;
  uniform vec3 uSurfaceMid;
  uniform vec3 uMint;
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform float uTextureMix;
  uniform float uNightMix;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 lightDirection = normalize(vec3(-0.45, 0.72, -0.28));

    float diffuse = max(dot(normal, lightDirection), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);

    float longitudeGrid = 1.0 - smoothstep(
      0.0,
      0.085,
      abs(sin(vUv.x * 3.14159265 * 36.0))
    );
    float latitudeGrid = 1.0 - smoothstep(
      0.0,
      0.07,
      abs(sin(vUv.y * 3.14159265 * 18.0))
    );
    float grid = max(longitudeGrid, latitudeGrid) * 0.13;

    float scanWave = sin((vWorldPosition.y * 0.42) - (uTime * 0.32));
    float scan = smoothstep(0.92, 1.0, scanWave) * 0.055;
    float polarGlow = pow(abs(normal.y), 5.0) * 0.14;

    vec3 baseColor = mix(uSurfaceDeep, uSurfaceMid, 0.18 + diffuse * 0.78);
    baseColor += uMint * (rim * 0.22 + grid + scan + polarGlow);
    vec3 dayColor = texture2D(uDayMap, vUv).rgb;
    vec3 nightSource = texture2D(uNightMap, vUv).rgb;
    float nightWarmth = max(nightSource.r - nightSource.b * 0.22, 0.0);
    float cityLights = smoothstep(0.035, 0.42, nightWarmth);
    vec3 nightColor = pow(max(nightSource, vec3(0.0)), vec3(0.48)) * 1.52;
    nightColor += vec3(1.0, 0.58, 0.2) * cityLights * 0.82;
    nightColor += vec3(0.018, 0.06, 0.095) * (0.7 + diffuse * 0.3);
    vec3 textureColor = mix(dayColor, nightColor, uNightMix);
    float textureLight = max(max(textureColor.r, textureColor.g), textureColor.b);
    textureColor = mix(textureColor * 0.72, textureColor, diffuse * 0.42 + 0.58);
    textureColor += uMint * textureLight * rim * 0.12;
    float textureStrength = mix(0.82, 0.96, uNightMix);
    float gridStrength = mix(1.0, 0.3, uNightMix);
    baseColor = mix(baseColor, textureColor, uTextureMix * textureStrength);
    baseColor += uMint * (
      grid * gridStrength * (0.45 + uTextureMix * 0.2) +
      rim * 0.12
    );

    gl_FragColor = vec4(baseColor, 1.0);
  }
`

export class EarthLayer {
  constructor(quality, textures) {
    this.group = new Group()
    this.group.name = "earth-layer"
    this.uniforms = {
      uTime: { value: 0 },
      uSurfaceDeep: { value: new Color(GLOBE_COLORS.surfaceDeep) },
      uSurfaceMid: { value: new Color(GLOBE_COLORS.surfaceMid) },
      uMint: { value: new Color(GLOBE_COLORS.mint) },
      uDayMap: { value: textures.day },
      uNightMap: { value: textures.night },
      uTextureMix: { value: 1 },
      uNightMix: { value: 0 },
    }
    this.textureTargets = { mix: 1, night: 0 }

    const [widthSegments, heightSegments] = quality.sphereSegments
    const geometry = new SphereGeometry(EARTH_RADIUS, widthSegments, heightSegments)
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
    })

    this.mesh = new Mesh(geometry, material)
    this.mesh.name = "earth-surface"
    this.mesh.renderOrder = 0
    this.group.add(this.mesh)
  }

  mount(parent) {
    parent.add(this.group)
  }

  setVisible(visible) {
    this.group.visible = visible
  }

  setTheme(theme) {
    this.uniforms.uSurfaceDeep.value.setHex(theme.colors.surfaceDeep)
    this.uniforms.uSurfaceMid.value.setHex(theme.colors.surfaceMid)
    this.uniforms.uMint.value.setHex(theme.colors.mint)
  }

  getInteractiveObject() {
    return this.mesh
  }

  setTextureMode(mode) {
    this.textureTargets.mix = mode === "off" ? 0 : 1
    this.textureTargets.night = mode === "night" ? 1 : 0
  }

  update(delta) {
    this.uniforms.uTime.value += delta
    const blend = 1 - Math.exp(-delta * 4.5)
    this.uniforms.uTextureMix.value +=
      (this.textureTargets.mix - this.uniforms.uTextureMix.value) * blend
    this.uniforms.uNightMix.value +=
      (this.textureTargets.night - this.uniforms.uNightMix.value) * blend
  }

  resize() {}

  dispose() {
    disposeObject3D(this.group)
  }
}
