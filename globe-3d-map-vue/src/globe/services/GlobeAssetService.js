import {
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  TextureLoader,
} from "three"

const ASSET_URLS = Object.freeze({
  day: new URL("../../assets/textures/earth-day.jpg", import.meta.url).href,
  night: new URL("../../assets/textures/earth-night.jpg", import.meta.url).href,
})

function loadTexture(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject)
  })
}

export class GlobeAssetService {
  constructor(options = {}) {
    this.loader = options.loader ?? new TextureLoader()
    this.minimumDuration = options.minimumDuration ?? 900
    this.wait =
      options.wait ??
      ((duration) => new Promise((resolve) => window.setTimeout(resolve, duration)))
    this.textures = null
  }

  async load(onProgress = () => {}) {
    const startedAt = Date.now()
    let completed = 0
    onProgress(0.08, "loadingDay")

    const loadEntry = async (id, url) => {
      const texture = await loadTexture(this.loader, url)
      texture.colorSpace = SRGBColorSpace
      texture.minFilter = LinearMipmapLinearFilter
      texture.magFilter = LinearFilter
      texture.anisotropy = 4
      texture.needsUpdate = true
      completed += 1
      onProgress(
        completed === 1 ? 0.52 : 0.9,
        completed === 1 ? "loadingNight" : "loadingScene"
      )
      return [id, texture]
    }

    const entries = await Promise.all(
      Object.entries(ASSET_URLS).map(([id, url]) => loadEntry(id, url))
    )
    const elapsed = Date.now() - startedAt
    if (elapsed < this.minimumDuration) {
      await this.wait(this.minimumDuration - elapsed)
    }

    this.textures = Object.fromEntries(entries)
    onProgress(1, "loadingReady")
    return { textures: this.textures }
  }

  dispose() {
    Object.values(this.textures ?? {}).forEach((texture) => texture.dispose())
    this.textures = null
  }
}

export { ASSET_URLS }
