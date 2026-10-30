# M6 Loading、国家聚焦与昼夜贴图

## 1. 交付范围

M6 完成四项增量：

1. 打开项目后显示全屏 Loading，直到两张地球贴图完成解码；
2. Loading 离场后执行约 4.1 秒的平滑地球入场；
3. 点击国家聚焦，选中国界多层发光，再次点击同一国家退出并恢复巡航；
4. 提供无贴图、白天、夜晚三种地表模式。

## 2. 状态与时序

```text
idle
  → loading（贴图并行读取/解码，0～100%）
  → entering（RAF 已启动，镜头与地球组合入场）
  → ready（UI 淡入，可完整交互）
  → recovering / fatal-error（沿用 M4 WebGL 恢复链）
```

`GlobeWorld.load()` 是异步入口。只有资源加载成功后才创建 `EarthLayer`，
避免先显示纯色球再闪成贴图。Loading 至少展示约 900 ms，快缓存环境中仍能
识别系统状态；进度节点由真实贴图解码完成事件驱动。减少动态效果偏好下跳过长入场。

## 3. 国家拾取与聚焦

1. Raycaster 先命中城市实例，命中时保留节点聚焦；
2. 未命中节点时与地球 Mesh 求交；
3. 世界交点转换到地球局部坐标，再反算 `[longitude, latitude]`；
4. `CountryService` 使用 `d3.geoContains` 查找 `world-atlas` 国家多边形；
5. 使用 `geoCentroid` 作为镜头方向，并按球面面积计算聚焦距离；
6. `BoundaryLayer` 叠加 12 px 呼吸柔光、3.2 px 实体轮廓和 5.2 px
   流动亮段；亮段通过 `dashOffset` 每帧推进；
7. 再次点击同一国家清理临时线段，解除相机锁并立即恢复自动旋转。

国家边界数据是 110m 低分辨率 Natural Earth 数据，适合展示级拾取，不适合
领土判定、法律边界或小岛精确命中。点击公海不改变当前选中状态；Esc 清除焦点。

## 4. 地表纹理与夜景增强

- `GlobeAssetService` 使用 Vite 本地 URL 加载 4096×2048 昼夜 JPEG；
- 纹理设置为 sRGB，并启用 mipmap 与线性过滤；
- `EarthLayer` 仅保留一套 SphereGeometry/ShaderMaterial；
- `uTextureMix` 控制程序化模式与照片纹理混合，`uNightMix` 控制昼夜；
- 夜景对暗部做 gamma 提升，增加冷色环境底光，并单独提取暖色城市灯光；
- 夜景贴图权重由 0.82 提升到 0.96，经纬网权重降到白天的 30%；
- 指数缓动使切换无闪白、无材质重建和无额外 draw call。

贴图来源、哈希和 NASA 使用说明见
[`04-third-party-assets.md`](./04-third-party-assets.md)。

## 5. 边界情况与权衡

- 资源失败：进入现有 fatal-error，不进入半初始化场景。
- 组件卸载：异步完成后检查 `disposed`，并释放刚加载纹理。
- 连续聚焦：新镜头终止旧 tween；仅保留一套国家焦点 geometry。
- 大国/小国：聚焦距离按面积开方映射；微型国家受 110m 数据限制。
- 贴图关闭：不销毁纹理，重新打开可立即平滑切换；代价是仍占 GPU 内存。
- 夜晚是静态全球夜景，不包含动态晨昏线。
- 屏幕空间宽线缩放时保持像素宽度，视觉稳定；代价是国家聚焦增加 3 个
  draw calls，相比管道几何显著减少顶点和小岛处的粗细畸变。

## 6. 验收记录

- `npm test`：35/35 通过；
- `npm run build`：通过；
- 生产产物包含两张 4096×2048 JPEG，总计约 2.18 MB；
- 真实浏览器验证 Loading、三种贴图切换、纯夜景可读性、伊朗/美国聚焦和
  二次点击退出；
- 默认约 51 draw calls，国家聚焦约 54 draw calls。
