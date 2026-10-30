# 地球贴图来源

本目录保存 M6 使用的两张 4K、2:1 等距圆柱投影地球贴图。

| 文件 | 用途 | 分辨率 | SHA-256 |
| --- | --- | --- | --- |
| `earth-day.jpg` | 白天地表 | 4096 × 2048 | `228DEBA2E4B600146BDCB6CFA359B8EAD6AACC2B1C13550A29CD82824CFA1C01` |
| `earth-night.jpg` | 夜间灯光 | 4096 × 2048 | `355AB23DD1323315B393D7B91DD2D7EE223A1CBAABA2B48DC72BA90D371CED24` |

下载地址使用固定版本的 `three-globe@2.45.2` jsDelivr 镜像：

- `https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/earth-blue-marble.jpg`
- `https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/earth-night.jpg`

图像内容源自 NASA 的 Blue Marble 与 Black Marble 数据。项目展示时应保留
“Earth imagery: NASA”署名，不得暗示 NASA 对本项目或产品背书。上游资料与使用规则：

- Blue Marble: `https://svs.gsfc.nasa.gov/30763`
- Black Marble: `https://svs.gsfc.nasa.gov/30876`
- NASA media usage: `https://www.nasa.gov/nasa-brand-center/images-and-media/`

贴图在构建时作为本地静态资源打包，运行期不依赖第三方网络。
