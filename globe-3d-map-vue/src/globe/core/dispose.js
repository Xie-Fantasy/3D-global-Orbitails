export function disposeMaterial(material) {
  if (!material) {
    return
  }

  const materials = Array.isArray(material) ? material : [material]
  materials.forEach((item) => {
    Object.values(item).forEach((value) => {
      if (value?.isTexture) {
        value.dispose()
      }
    })
    item.dispose()
  })
}

export function disposeObject3D(object) {
  object.traverse((child) => {
    child.geometry?.dispose()
    disposeMaterial(child.material)
  })
  object.removeFromParent()
}

