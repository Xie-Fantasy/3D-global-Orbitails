import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Group,
  Mesh,
  ShaderMaterial,
  TubeGeometry,
} from "three"
import type { Object3D } from "three"
import { EARTH_RADIUS, GLOBE_COLORS } from "../config/globe.config"
import { disposeObject3D } from "../core/dispose"
import { buildWaypointCurvePoints } from "../math/curves"
import type { GlobeLayer, GlobeTheme } from "../types/layers"
import type { TransportRouteRecord } from "../types/data"

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

type RouteKindKey = "land" | "sea"

interface RouteStyle {
  readonly color: number
  readonly height: number
  readonly radius: number
  readonly glowScale: number
  readonly frequency: number
  readonly ratio: number
  readonly speed: number
  readonly intensity: number
  readonly segmentsPerLeg: number
}

interface RouteUniforms {
  [uniform: string]: { value: unknown }
  uColor: { value: Color }
  uTime: { value: number }
  uPhase: { value: number }
  uIntensity: { value: number }
  uFrequency: { value: number }
  uRatio: { value: number }
  uSpeed: { value: number }
  uKind: { value: number }
  uGlowPass: { value: number }
}

interface RouteEntry {
  route: TransportRouteRecord
  materials: ShaderMaterial[]
  uniformsList: RouteUniforms[]
  meshes: Mesh[]
}

const ROUTE_STYLES: Record<RouteKindKey, RouteStyle> = {
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
}

function createUniforms(
  style: RouteStyle,
  kind: RouteKindKey,
  index: number,
  glowPass: boolean,
): RouteUniforms {
  return {
    uColor: { value: new Color(style.color) },
    uTime: { value: 0 },
    uPhase: { value: (index * 0.173) % 1 },
    uIntensity: { value: style.intensity },
    uFrequency: { value: style.frequency },
    uRatio: { value: style.ratio },
    uSpeed: { value: style.speed },
    uKind: { value: kind === "sea" ? 1 : 0 },
    uGlowPass: { value: glowPass ? 1 : 0 },
  }
}

function createRouteEntry(
  route: TransportRouteRecord,
  index: number,
  style: RouteStyle,
): RouteEntry {
  const points = buildWaypointCurvePoints(route.coordinates, {
    radius: EARTH_RADIUS * 1.009,
    height: style.height,
    segmentsPerLeg: style.segmentsPerLeg,
  })
  const curve = new CatmullRomCurve3(points, false, "centripetal", 0.5)
  const tubularSegments = Math.min(
    280,
    Math.max(64, (route.coordinates.length - 1) * 22),
  )
  const priorityScale = 0.9 + Math.min(0.2, route.priority / 560)
  const coreUniforms = createUniforms(style, route.kind as RouteKindKey, index, false)
  const glowUniforms = createUniforms(style, route.kind as RouteKindKey, index, true)
  const coreMaterial = new ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  })
  const glowMaterial = new ShaderMaterial({
    uniforms: glowUniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  })
  const core = new Mesh(
    new TubeGeometry(
      curve,
      tubularSegments,
      style.radius * priorityScale,
      5,
      false,
    ),
    coreMaterial,
  )
  const glow = new Mesh(
    new TubeGeometry(
      curve,
      tubularSegments,
      style.radius * style.glowScale * priorityScale,
      5,
      false,
    ),
    glowMaterial,
  )
  core.name = `${route.kind}-route-core-${route.id}`
  glow.name = `${route.kind}-route-glow-${route.id}`
  core.renderOrder = 6
  glow.renderOrder = 5

  return {
    route,
    materials: [coreMaterial, glowMaterial],
    uniformsList: [coreUniforms, glowUniforms],
    meshes: [glow, core],
  }
}

export class RouteLayer implements GlobeLayer {
  readonly group = new Group()
  readonly isEmpty: boolean
  private readonly kind: RouteKindKey
  private readonly style: RouteStyle
  private readonly reducedMotion: boolean
  private readonly entries: RouteEntry[]

  constructor(routes: readonly TransportRouteRecord[], kind: RouteKindKey) {
    const style = ROUTE_STYLES[kind]
    if (!style) {
      throw new TypeError(`Unsupported transport route kind "${kind}"`)
    }

    this.kind = kind
    this.style = style
    this.group.name = `${kind}-route-layer`
    this.isEmpty = routes.length === 0
    this.reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    this.entries = routes.map((route, index) =>
      createRouteEntry(route, index, style),
    )
    this.entries.forEach((entry) => this.group.add(...entry.meshes))
  }

  mount(parent: Object3D): void {
    parent.add(this.group)
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  setSelected(locationId: string | null): void {
    this.entries.forEach((entry) => {
      const connected =
        !locationId ||
        entry.route.fromId === locationId ||
        entry.route.toId === locationId
      const base = locationId ? 1.08 : this.style.intensity
      entry.uniformsList.forEach((uniforms) => {
        uniforms.uIntensity.value = connected ? base : 0.09
      })
    })
  }

  setTheme(theme: GlobeTheme): void {
    const color = theme.colors[this.kind]
    this.entries.forEach((entry) => {
      entry.uniformsList.forEach((uniforms) => {
        uniforms.uColor.value.setHex(color)
      })
    })
  }

  update(delta: number): void {
    if (this.reducedMotion) {
      return
    }
    this.entries.forEach((entry) => {
      entry.uniformsList.forEach((uniforms) => {
        uniforms.uTime.value += delta
      })
    })
  }

  resize(): void {}

  dispose(): void {
    this.entries.length = 0
    disposeObject3D(this.group)
  }
}
