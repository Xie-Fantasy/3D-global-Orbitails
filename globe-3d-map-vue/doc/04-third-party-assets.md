# 第三方数据与许可

## M1 使用项

| 名称 | 版本 | 用途 | 许可 | 运行时远程请求 |
|---|---:|---|---|---|
| `world-atlas` | 2.0.2 | 110m 世界国界 TopoJSON | ISC | 否 |
| `topojson-client` | 3.1.0 | 将 TopoJSON 转换为边界线 | ISC | 否 |

`world-atlas` 数据来源于 Natural Earth，经预处理后随 npm 包安装。当前实现通过 Vite 打包本地数据，不调用第三方在线地图接口。

## M2 演示数据

- `src/globe/data/locations.js` 中的城市经纬度用于界面演示；
- `value`、`priority` 和航线关系是项目内合成数据，不代表真实业务统计；
- M2 未从参考工程复制图片、贴图、图标或运输路径素材；
- 运行时不请求在线地图、航班或物流数据。

## M3 演示数据与程序化素材

- `src/globe/data/transportRoutes.js` 的陆运/海航 waypoint 为项目内编写的视觉演示数据；
- 这些路径不代表真实道路、铁路、港口航道或商业运输关系；
- `ParticleHaloLayer` 全部粒子位置、大小和亮度由固定随机种子程序化生成；
- M3 未新增图片、贴图、模型、在线 GIS 服务或参考工程素材复制项。

## M4 稳定性与性能

- M4 仅调整本项目代码、测试和构建分组；
- Marker 实例化、运行时诊断、错误状态和 WebGL 恢复均为项目内实现；
- 未新增图片、贴图、模型、字体、在线接口或第三方数据；
- `../china-3d-map1` 未产生复制或修改项。

## M5 海陆掩膜与视觉升级

- `SeaRoutePlanner` 复用已安装的 `world-atlas/land-110m.json` 作为
  Natural Earth 低分辨率陆地掩膜，没有新增在线 GIS 请求；
- M3 的陆运 waypoint 仍为项目内演示数据；M5 的海航 waypoint 改为运行时
  自动生成，同样不代表真实港口航道；
- 辉光、路线柔光和四套配色全部由 shader、配置和 CSS 令牌生成；
- 未新增图片、地球贴图、模型、字体或参考工程素材复制项。

## 项目内复用规则

后续若从 `../china-3d-map1` 复制贴图、图标或代码，需要在本文件增加：

- 原始相对路径；
- 复制后的相对路径；
- 版权/许可确认人；
- 是否做过修改；
- 首次引入版本或日期。

## M6 地球昼夜贴图

| 本地文件 | 下载镜像（固定版本） | 尺寸 | SHA-256 |
|---|---|---:|---|
| `src/assets/textures/earth-day.jpg` | `three-globe@2.45.2/example/img/earth-blue-marble.jpg` | 4096×2048 | `228DEBA2E4B600146BDCB6CFA359B8EAD6AACC2B1C13550A29CD82824CFA1C01` |
| `src/assets/textures/earth-night.jpg` | `three-globe@2.45.2/example/img/earth-night.jpg` | 4096×2048 | `355AB23DD1323315B393D7B91DD2D7EE223A1CBAABA2B48DC72BA90D371CED24` |

- 下载镜像：jsDelivr 上固定版本 `three-globe@2.45.2` 的示例资源；运行期
  不访问该 CDN。
- 图像内容来源：NASA Blue Marble / Black Marble 全球影像。
- 上游资料：`https://svs.gsfc.nasa.gov/30763`、
  `https://svs.gsfc.nasa.gov/30876`。
- 使用依据：NASA Images and Media Guidelines。NASA 内容通常不受美国
  版权保护，但必须署名且不得暗示 NASA 背书。
- 本项目可见控件标注 `EARTH SURFACE · NASA`；本地文件级记录见
  `src/assets/textures/README.md`。
- 首次引入：M6，2026-07-26；未修改原始 JPEG 像素，仅在 shader 中采样、
  主题混色和运行时平滑切换。
