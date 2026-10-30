# M3 运输路径与粒子光环实现记录

## 状态

- 完成日期：2026-07-26
- 里程碑：M3 运输图层与粒子光环
- 结果：通过

## 已实现

### 运输路径数据契约

- `transportRoutes.js`：
  - 5 条陆运演示路径；
  - 6 条海航演示路径；
  - 每条路径包含稳定 ID、类型、起终点、多个中间 waypoint、数值和优先级；
- `GlobeDataService`：
  - 限定 flight、land、sea 所属数据集合；
  - 校验所有 waypoint 经纬度；
  - 拒绝连续重复坐标；
  - 拒绝 flight 与 transport 之间重复的 route ID；
  - 输出 `transportRoutes`、`landRoutes` 和 `seaRoutes` 只读集合；
- 所有路径和数值均为合成演示数据，不代表真实道路、铁路、航道或运输量。

### 球面路径数学

- 新增 `buildWaypointCurvePoints`；
- 每两个 waypoint 之间使用最短大圆插值；
- 支持跨国际日期变更线；
- 陆运和海航仅通过配置改变表面外移量与弧高，不复制球面公式；
- CatmullRom 使用 centripetal 模式连接细分点，降低急转处过冲。

### `RouteLayer`

- 同一实现分别创建 land 和 sea 图层；
- 每条路径使用 TubeGeometry，避免原生 Line 宽度的跨平台差异；
- 陆运：
  - 贴近地表；
  - 翡翠绿色；
  - 更密、更快的短段流光；
- 海航：
  - 略高于地表；
  - 蓝青色；
  - 更疏、更慢的流光；
- 地球深度正确遮挡背面路径；
- 选中城市后关联路径增强，无关路径降低至低亮度；
- 图层隐藏时停止 shader 时间更新；
- `prefers-reduced-motion` 下保持静态虚线。

### `ParticleHaloLayer`

- 使用单个 Points geometry 和单个 shader material；
- 两组不同倾角、宽度和粒径的程序化粒子带；
- 使用固定随机种子，保证视觉可复现；
- 地球深度遮挡背面粒子；
- 质量档粒子数量：
  - low：420；
  - medium：900；
  - high：1500；
- low 档同时降低粒子层强度；
- 图层隐藏、页面降低动效或销毁后停止更新；
- 不使用图片、纹理或后处理 Bloom。

### 场景与 UI

- `DATA_LAYER_IDS` 新增 `landRoutes`、`seaRoutes` 和 `particleHalo`；
- 三个 M3 按钮已从 disabled 路线图状态切换为真实图层状态；
- 陆运、海航和粒子按钮使用对应设计 token 作为激活色；
- 三个 M3 图层默认开启；
- 现有广州节点选中、Esc 退出、图层开关和路由销毁流程保持不变；
- `GlobeWorld` 继续通过 selectable layer 集合广播选中状态，业务图层不互相读取内部 Mesh。

## 测试结果

### 自动化

`npm test`：

- 17 项通过；
- 7 项球面数学测试；
- 10 项数据契约测试；
- 新增覆盖：
  - 多 waypoint 连续路径；
  - 跨日期变更线；
  - 非法 waypoint；
  - 连续重复坐标；
  - route kind 集合错误；
  - flight/transport 跨集合重复 ID。

`npm run build`：

- 构建成功；
- M3 地球路由 chunk 约 717 kB，gzip 约 208 kB；
- 超过 500 kB 的既有非阻断警告仍保留，M4 统一处理拆包。

### 浏览器

- 桌面 1280×720：
  - M3 三图层默认开启；
  - 默认约 118 draw calls，满足 ≤120 目标；
  - 关闭陆运线减少 5 draw calls；
  - 关闭海航线减少 6 draw calls；
  - 关闭粒子光环减少 1 draw call；
  - 陆运、海航、飞线在颜色、贴地高度、虚线节奏和速度上可辨；
  - 背面路径与粒子被地球正确遮挡；
  - 广州选中后相关陆海路径增强，无关路径降低亮度；
- 移动端 390×844：
  - 自动使用 LOW 质量档和 420 个光环粒子；
  - 地球完整可见；
  - 9 个图层按钮均可用，热区为 `104×44` CSS px；
  - 可见标签保持在 8 个；
- 桌面和移动页面均无 console error/warning。

## 技术权衡

- 当前 11 条运输路径各自持有 geometry 和 material，以换取简单明确的独立显隐和选中联动；路径达到数十至上百条时应合并 geometry 或改为实例化 shader；
- waypoint 表达的是视觉演示路径，不做真实道路吸附、航道避障或陆海合法性校验；
- 粒子环使用一个 Points draw call，优先满足性能预算；没有增加实体圆环或 EffectComposer；
- M3 显隐仍为立即切换，避免高频切换产生 GSAP 竞争；正式演示若需要淡入淡出，可在 M4 增加可取消的统一 layer transition；
- 所有图层运行时资源均为本地程序化数据，不新增远程依赖和素材许可风险。

## 当前限制与 M4 入口

- 尚未执行路由往返 10 次的 heap/GPU 泄漏记录；
- 尚未实现运输路径批处理和路由级 tooltip；
- 尚未建立独立 E2E 测试脚本；
- 构建大包警告尚未处理；
- context restore 当前恢复既有对象，不重新创建 GPU 资源；
- M4 应重点处理稳定性、性能记录、路由往返、构建拆包、错误/空数据展示与最终交付。
