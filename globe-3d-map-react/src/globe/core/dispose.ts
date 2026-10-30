import type { Material, Mesh, Object3D, Texture } from "three"

export function disposeMaterial(
  material: Material | readonly Material[] | null | undefined,
): void {
  if (!material) {
    return
  }
  const materials = Array.isArray(material) ? material : [material]
  for (const item of materials) {
    const values = Object.values(item) as unknown[]
    for (const value of values) {
      if (value && typeof value === "object" && "isTexture" in value) {
        const texture = value as Partial<Texture>
        texture.dispose?.()
      }
    }
    item.dispose()
  }
}

export function disposeObject3D(object: Object3D): void {
  object.traverse((child) => {
    const mesh = child as Mesh
    mesh.geometry?.dispose()
    if (mesh.material) {
      disposeMaterial(mesh.material)
    }
  })
  object.removeFromParent()
}
