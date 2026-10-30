import assert from "node:assert/strict"
import test from "node:test"
import { GlobeAssetService } from "./GlobeAssetService.js"

test("loads and configures both local earth textures", async () => {
  const loadedUrls = []
  const disposed = []
  const progress = []
  const loader = {
    load(url, onLoad) {
      loadedUrls.push(url)
      queueMicrotask(() =>
        onLoad({
          dispose: () => disposed.push(url),
        })
      )
    },
  }
  const service = new GlobeAssetService({
    loader,
    minimumDuration: 0,
  })

  const assets = await service.load((value) => progress.push(value))

  assert.equal(loadedUrls.length, 2)
  assert.ok(assets.textures.day)
  assert.ok(assets.textures.night)
  assert.equal(progress.at(-1), 1)
  assert.equal(assets.textures.day.anisotropy, 4)

  service.dispose()
  assert.equal(disposed.length, 2)
})
