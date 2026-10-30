function toMessage(error) {
  return error instanceof Error ? error.message : "未知图层错误"
}

export function mountGlobeLayers(entries, state, initialIssues = []) {
  const layers = new Map()
  const issues = [...initialIssues]

  initialIssues.forEach((issue) => {
    const layerState = state.layers[issue.id]
    layerState.visible = false
    layerState.status = "error"
    layerState.error = issue.message
  })

  entries.forEach(([id, layer, parent]) => {
    const layerState = state.layers[id]
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
