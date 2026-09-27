# zqq-014 · 社交电量计 · 独处充电管理系统

纯前端社交电量追踪与独处预警系统。用户为不同社交场景（会议/聚会/一对一聊天/公开演讲/独处散步/阅读等）设置电量消耗/回血系数，系统根据当日日程自动计算"社交电量"日内消耗曲线，当电量跌破阈值时发出"需要独处充电"紧急提醒，并提供针对性的回血处方。

## 架构说明（分层架构：核心层 / 端口层 / 适配器层）

- `src/core`：领域模型（`SocialScenario`、`ScheduleEvent`、`TimelinePoint`、`BatteryAnalysisResult`）与 24 小时动态离散能量衰减与回血测算引擎。
- `src/ports`：端口层契约（`BatteryTrackerPort` 场景系数与日程跟踪端口）。
- `src/adapters`：适配器层（LocalStorage 持久化与内置 8 场景 5 典型日程数据集）。
- `src/ui`：原生 CSS 视觉呈现层，包含动态发光电池 HUD、SVG 24 小时电量消耗折线图、场景耗电滑块与日程事件管理面板。

## 本地运行

```bash
npm install
npm run dev
```

## 构建验证

```bash
npm run build
```

## Docker 容器化部署

```bash
docker compose up --build
```
访问：`http://localhost:8014`
