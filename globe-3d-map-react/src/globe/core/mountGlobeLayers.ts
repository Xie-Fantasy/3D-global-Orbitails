import type { GlobeLayer, LayerIssue } from "../types/layers"
import type { GlobeState } from "../types/state"
import type { Object3D } from "three"

type LayerEntry = readonly [string, GlobeLayer, Object3D]

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知图层错误"
}

export interface MountGlobeLayersResult {
  readonly issues: LayerIssue[]
  readonly layers: Map<string, GlobeLayer>
}

export function mountGlobeLayers(
  entries: ReadonlyArray<LayerEntry>,
  state: GlobeState,
  initialIssues: readonly LayerIssue[] = [],
): MountGlobeLayersResult {
  const layers = new Map<string, GlobeLayer>()
  const issues: LayerIssue[] = [...initialIssues]

  initialIssues.forEach((issue) => {
    const layerState = state.layers[issue.id]
    if (layerState) {
      layerState.visible = false
      layerState.status = "error"
      layerState.error = issue.message
    }
  })

  entries.forEach(([id, layer, parent]) => {
    const layerState = state.layers[id]
    if (!layerState) {
      return
    }
    try {
      layer.mount(parent)
      const isEmpty = layer.isEmpty === true
      const visible = isEmpty ? false : layerState.visible
      layer.setVisible(visible)
      layerState.visible = visible
      layerState.status = isEmpty ? "empty" : "ready"
      layerState.error = null
      layers.set(id, layer)

      if (isEmpty) {
        issues.push({
          id,
          status: "empty",
          message: "当前图层没有可显示的数据，已自动关闭。",
        })
      }
    } catch (error) {
      layer.dispose?.()
      layerState.visible = false
      layerState.status = "error"
      layerState.error = toMessage(error)
      issues.push({ id, status: "error", message: layerState.error })
    }
  })

  return { issues, layers }
}
