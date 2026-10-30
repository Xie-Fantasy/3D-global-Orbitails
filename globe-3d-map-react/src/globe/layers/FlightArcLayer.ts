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
import { buildGreatCirclePoints } from "../math/curves"
import type { GlobeLayer, GlobeTheme } from "../types/layers"
import type { RouteRecord } from "../types/data"

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

  varying vec2 vUv;

  void main() {
    float head = fract(uTime * 0.17 + uPhase);
    float behindHead = fract(head - vUv.x);
    float trail = 1.0 - smoothstep(0.0, 0.23, behindHead);
    float headCore = 1.0 - smoothstep(0.0, 0.032, abs(vUv.x - head));
    float edge = sin(vUv.y * 3.14159265);
    float alpha = (0.2 + trail * 0.86 + headCore * 0.9) * edge * uIntensity;
    gl_FragColor = vec4(uColor * (0.82 + trail * 0.78 + headCore), alpha);
  }
`

interface ArcUniforms {
  [uniform: string]: { value: unknown }
  uColor: { value: Color }
  uTime: { value: number }
  uPhase: { value: number }
  uIntensity: { value: number }
}

interface ArcEntry {
  route: RouteRecord
  mesh: Mesh
  uniforms: ArcUniforms
}

function createArcEntry(route: RouteRecord, index: number): ArcEntry {
  const height = 6 + Math.min(10, route.priority * 0.075)
  const points = buildGreatCirclePoints(route.from.coordinate, route.to.coordinate, {
    radius: EARTH_RADIUS * 1.008,
    height,
    segments: 72,
  })
  const curve = new CatmullRomCurve3(points)
  const geometry = new TubeGeometry(
    curve,
    96,
    route.priority >= 84 ? 0.15 : 0.1,
    5,
    false,
  )
  const color = route.priority >= 84 ? GLOBE_COLORS.amber : GLOBE_COLORS.mint
  const uniforms: ArcUniforms = {
    uColor: { value: new Color(color) },
    uTime: { value: 0 },
    uPhase: { value: (index * 0.137) % 1 },
    uIntensity: { value: route.priority >= 84 ? 1 : 0.86 },
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  })
  const mesh = new Mesh(geometry, material)
  mesh.name = `flight-${route.id}`
  mesh.renderOrder = 6

  return { route, mesh, uniforms }
}

export class FlightArcLayer implements GlobeLayer {
  readonly group = new Group()
  readonly isEmpty: boolean
  private readonly entries: ArcEntry[]

  constructor(routes: readonly RouteRecord[]) {
    this.group.name = "flight-arc-layer"
    this.isEmpty = routes.length === 0
    this.entries = routes.map((route, index) => createArcEntry(route, index))
    this.entries.forEach((entry) => this.group.add(entry.mesh))
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
      entry.uniforms.uIntensity.value = connected
        ? entry.route.priority >= 84
          ? 1
          : 0.86
        : 0.12
    })
  }

  setTheme(theme: GlobeTheme): void {
    this.entries.forEach((entry) => {
      const color =
        entry.route.priority >= 84 ? theme.colors.amber : theme.colors.mint
      entry.uniforms.uColor.value.setHex(color)
    })
  }

  update(delta: number): void {
    this.entries.forEach((entry) => {
      entry.uniforms.uTime.value += delta
    })
  }

  resize(): void {}

  dispose(): void {
    this.entries.length = 0
    disposeObject3D(this.group)
  }
}
