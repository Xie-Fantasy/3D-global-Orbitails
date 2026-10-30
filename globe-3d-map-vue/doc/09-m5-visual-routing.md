# M5 海路规划与视觉系统升级记录

## 1. 交付结论

- 里程碑：M5 海运绕陆、辉光动画、多主题和运输线路视觉升级；
- 日期：2026-07-26；
- 状态：已实现并通过自动化、生产构建与真实浏览器验收；
- 原则：继续保持无地球贴图、纯前端可运行，不修改
  `../china-3d-map1`。

## 2. 海运线为什么曾穿过澳大利亚

旧实现只知道起点、终点和少量人工 waypoint。渲染层把相邻坐标用球面最短弧
连接，但球面最短弧并不知道哪里是陆地。因此“新加坡 → 悉尼”只要中间点不够
合理，就会按几何最短方向穿过澳大利亚。

换句话说：

- Three.js 负责画线；
- 球面插值负责让线贴合地球；
- 两者都不天然具备“海”和“陆”的语义；
- 要绕陆，必须额外提供海陆数据并执行路径搜索。

## 3. 自动海路方案

`SeaRoutePlanner` 使用 `world-atlas/land-110m.json` 的 Natural Earth
陆地多边形作为可通行性掩膜：

1. TopoJSON 转为 GeoJSON land feature；
2. `geoContains` 判断经纬度是否落在陆地；
3. 全球建立 4° 球面网格，只保留水域节点；
4. 起终点吸附到最近水域网格节点；
5. A* 按球面距离搜索水域路径，并在 ±180° 经线处循环；
6. 对网格边采样，拒绝穿陆连接；
7. 对结果做视线简化，减少不必要的折点；
8. 用 0.25° 采样复核长线段；不安全的局部以 2° 网格重新规划；
9. 最终保留港口到近岸水域的短连接，再交给 `RouteLayer` 生成球面曲线。

默认 6 条海航演示线已改为 `routing: "auto-sea"`，不再依赖人工 waypoint。
“新加坡 → 悉尼”单元测试会逐段抽样，确认主路径绕开澳大利亚。

### 3.1 为什么选择前端球面 A*

- 当前只有少量演示路线，启动时规划约数秒以内，结果可缓存；
- 不需要新增在线 GIS 服务或后端；
- 与现有经纬度、球面大圆数学保持同一坐标体系；
- 路径会随端点变化自动重算，不再逐条手工修澳大利亚等个案。

### 3.2 边界与风险

这是“视觉避陆”，不是可用于船舶驾驶的航海导航：

- 110m 数据分辨率较低，小岛、礁石、港池和狭窄水道可能被简化；
- 未计算水深、禁航区、运河通行、海流、天气、吃水和航运规则；
- 港口坐标通常位于陆地或岸线上，因此允许一小段港口—近岸连接；
- 4° 主网格偏重性能，极窄海峡可能选择更宽的外海绕行；
- 路线数量达到数百条时，应将结果离线预计算或迁移到后端 GIS 服务。

真实业务升级应使用高分辨率海岸线、栅格通行成本或专业航线服务，并将结果
作为经过审核的业务数据下发。

## 4. 大气辉光动画

`AtmosphereLayer` 现在包含三层：

- 内层 FrontSide Fresnel：补充球面正面薄辉光；
- 外层 BackSide Fresnel：形成清晰轮廓光；
- 贴球扫描层：用纬向光幕、细列脉冲和低速 sweep 模拟参考图中的动态光带。

`辉光动画` 是独立效果开关。关闭后：

- 静态 Fresnel 大气仍保留；
- 呼吸脉冲停止；
- 扫描光幕平滑淡出；
- 不会错误地关闭整个大气图层。

系统检测到 `prefers-reduced-motion: reduce` 时，不启用持续辉光动画。

## 5. 多配色系统

`globe.config.js` 和 `tokens.css` 使用同名语义色，提供：

| ID | 名称 | 方向 |
|---|---|---|
| `emerald` | 翡翠绿 | 当前默认绿色态势主题 |
| `azure` | 深海蓝 | 对应参考图五的蓝色地球方向 |
| `violet` | 星云紫 | 紫色科幻数据主题 |
| `solar` | 琥珀金 | 暖金色指挥/能源主题 |

`ThemeSwitcher` 只发出主题意图；`GlobeWorld.setTheme()` 统一更新场景背景并向
支持 `setTheme()` 的图层广播，Vue UI 不直接修改 Mesh。球体、边界、大气、
星空、粒子、飞线、标点、柱体、陆运和海运材质均同步换色。

## 6. 运输线样式升级

陆运和海运继续共用 `RouteLayer`，但各自有独立参数：

- 每条线由细亮核心和宽柔光外轨两次 pass 构成；
- 陆运贴地更近，使用短、密、快速的运输脉冲；
- 海运为蓝青色较连续光迹，使用较慢的双移动光头；
- Tube 半径、外发光倍率、频率、占空比、速度和抬升量均由 kind 配置；
- 选中节点时相关路线升亮，其余路线降低到 9% 强度；
- `prefers-reduced-motion` 下保持静态轨迹。

双 pass 使默认 draw calls 从 M4 的约 39 增加到约 51，仍显著低于 120 的预算。

## 7. 文件影响

- `src/globe/services/SeaRoutePlanner.js`
- `src/globe/services/GlobeDataService.js`
- `src/globe/data/transportRoutes.js`
- `src/globe/layers/AtmosphereLayer.js`
- `src/globe/layers/RouteLayer.js`
- 其余支持 `setTheme()` 的 Globe layers
- `src/globe/config/globe.config.js`
- `src/globe/core/createGlobeState.js`
- `src/globe/core/GlobeWorld.js`
- `src/components/globe-ui/ThemeSwitcher.vue`
- `src/views/globe/GlobeView.vue`
- `src/styles/tokens.css`
- `src/views/globe/globe.scss`

## 8. 验收记录

- `npm test`：31 项通过；
- `npm run build`：成功；
- 最大生产 chunk：474.41 kB，gzip 118.99 kB；
- 真实浏览器：页面控制台无 error；
- 默认 medium 场景：约 51 draw calls；
- 主题：深海蓝切换后 DOM 状态与 WebGL 画面同步；
- 辉光：ON → OFF 状态与可访问属性同步；
- 390×844：页面尺寸等于视口尺寸，无页面溢出；
- `GlobeWorld.js`：392 行，仍低于建议上限。
