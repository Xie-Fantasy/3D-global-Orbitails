import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Group,
  Mesh,
  ShaderMaterial,
  TubeGeometry,
} from "three"
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config.js"
import { disposeObject3D } from "../core/dispose.js"
import { buildWaypointCurvePoints } from "../math/curves.js"

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPhase;
  uniform float uIntensity;
  uniform float uFrequency;
  uniform float uRatio;
  uniform float uSpeed;
  uniform float uKind;
  uniform float uGlowPass;

  varying vec2 vUv;

  float circularDistance(float first, float second) {
    float distanceValue = abs(first - second);
    return min(distanceValue, 1.0 - distanceValue);
  }

  void main() {
    float cycle = fract(vUv.x * uFrequency - uTime * uSpeed + uPhase);
    float dash = 1.0 - smoothstep(uRatio, uRatio + 0.085, cycle);
    float head = 1.0 - smoothstep(0.0, 0.045, circularDistance(cycle, 0.045));
    float secondary = 1.0 - smoothstep(
      0.0,
      0.065,
      circularDistance(fract(cycle + 0.5), 0.04)
    );
    float circumference = sin(vUv.y * 3.14159265);
    float landSignal = dash * 0.72 + head * 1.35;
    float seaSignal = 0.18 + dash * 0.34 + head * 1.28 + secondary * 0.58;
    float signal = mix(landSignal, seaSignal, uKind);
    float coreAlpha = (0.055 + signal) * circumference * uIntensity;
    float glowAlpha = (0.018 + signal * 0.2) * circumference * uIntensity;
    float alpha = mix(coreAlpha, glowAlpha, uGlowPass);
    vec3 color = uColor * (0.72 + signal * mix(0.86, 0.48, uGlowPass));
    gl_FragColor = vec4(color, alpha);
  }
`

const ROUTE_STYLES = Object.freeze({
  land: {
    color: GLOBE_COLORS.land,
    height: 0.24,
    radius: 0.035,
    glowScale: 2.7,
    frequency: 42,
    ratio: 0.2,
    speed: 0.58,
    intensity: 0.82,
    segmentsPerLeg: 12,
  },
  sea: {
    color: GLOBE_COLORS.sea,
    height: 0.38,
    radius: 0.043,
    glowScale: 3.15,
    frequency: 21,
    ratio: 0.32,
    speed: 0.24,
    intensity: 0.9,
    segmentsPerLeg: 10,
  },
})

function createMaterial(style, kind, index, glowPass) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(style.color) },
      uTime: { value: 0 },
      uPhase: { value: (index * 0.173) % 1 },
      uIntensity: { value: style.intensity },
      uFrequency: { value: style.frequency },
      uRatio: { value: style.ratio },
      uSpeed: { value: style.speed },
      uKind: { value: kind === "sea" ? 1 : 0 },
      uGlowPass: { value: glowPass ? 1 : 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  })
}

function createRouteEntry(route, index, style) {
  const points = buildWaypointCurvePoints(route.coordinates, {
    radius: EARTH_RADIUS * 1.009,
    height: style.height,
    segmentsPerLeg: style.segmentsPerLeg,
  })
  const curve = new CatmullRomCurve3(points, false, "centripetal", 0.5)
  const tubularSegments = Math.min(
    280,
    Math.max(64, (route.coordinates.length - 1) * 22)
  )
  const priorityScale = 0.9 + Math.min(0.2, route.priority / 560)
  const coreMaterial = createMaterial(style, route.kind, index, false)
  const glowMaterial = createMaterial(style, route.kind, index, true)
  const core = new Mesh(
    new TubeGeometry(
      curve,
      tubularSegments,
      style.radius * priorityScale,
      5,
      false
    ),
    coreMaterial
  )
  const glow = new Mesh(
    new TubeGeometry(
      curve,
      tubularSegments,
      style.radius * style.glowScale * priorityScale,
      5,
      false
    ),
    glowMaterial
  )
  core.name = `${route.kind}-route-core-${route.id}`
  glow.name = `${route.kind}-route-glow-${route.id}`
  core.renderOrder = 6
  glow.renderOrder = 5

  return {
    route,
    materials: [coreMaterial, glowMaterial],
    meshes: [glow, core],
  }
}

export class RouteLayer {
  constructor(routes, kind) {
    if (!ROUTE_STYLES[kind]) {
      throw new TypeError(`Unsupported transport route kind "${kind}"`)
    }

    this.kind = kind
    this.group = new Group()
    this.group.name = `${kind}-route-layer`
    this.isEmpty = routes.length === 0
    this.reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    this.style = ROUTE_STYLES[kind]
    this.entries = routes.map((route, index) =>
      createRouteEntry(route, index, this.style)
    )
    this.selectedLocationId = null
    this.entries.forEach((entry) => this.group.add(...entry.meshes))
  }

  mount(parent) {
    parent.add(this.group)
  }

  setVisible(visible) {
    this.group.visible = visible
  }

  setSelected(locationId) {
    this.selectedLocationId = locationId
    this.entries.forEach((entry) => {
      const connected =
        !locationId ||
        entry.route.fromId === locationId ||
        entry.route.toId === locationId
      entry.materials.forEach((material) => {
        material.uniforms.uIntensity.value = connected
          ? locationId
            ? 1.08
            : this.style.intensity
          : 0.09
      })
    })
  }

  setTheme(theme) {
    const color = theme.colors[this.kind]
    this.entries.forEach((entry) => {
      entry.materials.forEach((material) => {
        material.uniforms.uColor.value.setHex(color)
      })
    })
  }

  update(delta) {
    if (this.reducedMotion) {
      return
    }
    this.entries.forEach((entry) => {
      entry.materials.forEach((material) => {
        material.uniforms.uTime.value += delta
      })
    })
  }

  resize() {}

  dispose() {
    this.entries = []
    disposeObject3D(this.group)
  }
}
