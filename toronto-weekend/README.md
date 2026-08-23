# Toronto Weekend 周末多伦多

这个 subpage 用来记录多伦多周末活动。数据放在 `data/events.md`，页面加载后会自动 parse 并渲染成不同板块。

## 怎么更新

每天/每周末上传一个新的 `data/events.md` 覆盖旧文件即可。如果你想留档，也可以额外保存成 `data/2026-08-22.md` 之类的名字，但当前页面只读取 `data/events.md`（这是有意保持简单的约定）。

## Markdown 数据格式

```md
---
title: Toronto Weekend
dates: Saturday Aug 22 – Sunday Aug 23
updated: 2026-08-22
weather_saturday: "24°C / 17°C · Light drizzle, 63% chance of rain"
weather_sunday: "20°C / 15°C · Light to moderate rain, 48% chance of rain"
---

## 板块名称（例如 Music & Nightlife）

### 活动名称
- **Day:** Saturday / Sunday
- **When:** 8:00 PM
- **Where:** 地点
- **Cost:** 免费 / $20
- **Info:** 一两句介绍
- **Tags:** 标签1, 标签2
- **Link:** [网站名称](https://example.com)
```

- `##` 是板块，`###` 是具体活动。
- `Day` 可选，用来做 Saturday/Sunday 过滤。
- 字段顺序随意，`When` / `Where` / `Cost` / `Info` / `Link` / `Tags` 都会被识别。
- `weather_saturday` / `weather_sunday` 会显示在页面顶部，请用英文描述天气。
- 也可以不用字段，直接在活动下面写普通段落/列表，页面会合并成描述。

## 本地预览

在项目根目录运行：

```bash
python3 -m http.server 8000
```

然后打开 `http://localhost:8000/toronto-weekend/`。