# Toronto Weekend Data Collection Guide

这份文档写给负责收集数据的 LLM / 人工编辑。目标是产出一个 `toronto-weekend/data/events.md` 文件，供前端页面自动解析和渲染。

## 1. 你要做什么

1. 收集 **指定周末**（例如 `2026-08-22` 到 `2026-08-23`）发生在多伦多的活动。
2. 只收录 **这个周末特有的活动**，不要收录“随时都可以去”的常规选项（例如 High Park、St. Lawrence Market、Toronto Island 这类普通周末打卡地）。
3. 按照下方固定的 Markdown data format 写入 `data/events.md`。
4. 如果有筛选标准（例如“是否适合用户和 Coco 一起出去”），在收集时自行判断，但 **不要把这个判断条件写进页面文案**。

## 2. 数据来源

优先使用官方来源，并尽量拿到直接链接。

| 类型 | 推荐来源 | 注意事项 |
|---|---|---|
| 演唱会 / 音乐会 | Ticketmaster Canada、Fever、场馆官网 | 确认日期是本周六/周日；不要只看艺人页，要看具体场次日期 |
| 音乐剧 / 舞台剧 | Mirvish | 用 Mirvish 的 **Now On Stage / Calendar**，不要使用旧的 show page；确认当天确实有场次 |
| Museum 特展 | AGO、ROM、Aga Khan Museum、Gardiner 等官方展览页 | 只收录 **限时特展**；普通常设展不用收录；要确认展览还在展期内 |
| Festival / Fair | CNE 等官方活动页 | 确认活动覆盖本周末，并给出官方购票/活动链接 |
| Special Experience | Fever Toronto | 找出本周末仍可预订的 session；已 sold out 的活动不要作为主推荐 |
| Blue Jays | MLB 官方 Blue Jays schedule | 只收录 **在多伦多 Rogers Centre 的主场比赛**；客场不算 |
| 天气 | Open-Meteo API | 获取周六/周日最高/最低温和降水概率，填入 frontmatter |

## 3. 筛选原则

- 每条活动必须属于目标周末两天之一，或两天都包含。
- 必须明确 `Day`：Saturday / Sunday / Saturday / Sunday。
- 必须提供 `Link`，并尽量验证链接有效（HTTP 200 / 官方页面存在）。
- 演唱会只收录：
  1. 华语演唱会；
  2. 世界前 30 级别的著名歌手。
- 博物馆只收录“一年中非常值得去的限时特展”，不要无脑把所有 current exhibitions 都列出来。
- 如果某个类别没有符合条件的活动，可以不推荐该类别，不要凑数。
- 如果存在内部筛选条件（例如适合某个特定同伴），判断后保留合适活动，但不在页面中写明该条件。

## 4. 需要填入的数据格式

`data/events.md` 必须使用以下格式：

````markdown
---
title: Toronto Weekend
weekend: 2026-08-22
dates: Saturday Aug 22 – Sunday Aug 23
updated: 2026-08-22
weather_saturday: "24°C / 17°C · Light drizzle, 63% chance of rain"
weather_sunday: "20°C / 15°C · Light to moderate rain, 48% chance of rain"
source: Ticketmaster, Mirvish, Fever / Open-Meteo
---

## Section Name

### Event Title
- **Day:** Saturday
- **When:** Saturday Aug 22 · 5:30 PM
- **Where:** Venue, Address
- **Cost:** Ticket prices vary / From ~$50 / Free
- **Info:** 一两句话介绍，说明为什么值得去。
- **Tags:** concert, pop, stadium
- **Link:** [Event Name](https://example.com)
````

### 字段要求

| 字段 | 是否必须 | 说明 |
|---|---|---|
| `title` | 是 | 页面大标题 |
| `weekend` | 是 | 周末第一天的日期，ISO 格式 `YYYY-MM-DD` |
| `dates` | 是 | 人类可读的周末范围 |
| `updated` | 是 | 数据更新时间 |
| `weather_saturday` | 推荐 | 周六天气文字，用英文 |
| `weather_sunday` | 推荐 | 周日天气文字，用英文 |
| `source` | 推荐 | 数据来源列表 |
| `## Section` | 是 | 板块标题，用 `##` |
| `### Event Title` | 是 | 活动名称，用 `###` |
| `Day` | 是 | 必须是 Saturday / Sunday |
| `When` | 是 | 必须包含具体日期和时间 |
| `Where` | 推荐 | 地点 |
| `Cost` | 推荐 | 价格信息 |
| `Info` | 推荐 | 为什么值得去 / 活动亮点 |
| `Tags` | 推荐 | 逗号分隔，小写 |
| `Link` | 是 | 官方或直接购票/活动链接 |

### 注意事项

- `Day` 不要写模糊的 “weekend”，要写具体 Saturday / Sunday。
- 如果活动两天都有，写 `Saturday / Sunday`。
- `When` 里也尽量带上日期，例如 `Saturday Aug 22 · 5:30 PM`。
- 如果活动已 sold out，可以保留，但要在 `Info` 或 `Cost` 里明确说明；有可替代活动时优先放未 sold out 的。
- 板块可以按实际情况增减，但当前页面约定为：
  - `Concerts, Musicals & Arts Exhibitions`
  - `Food, Festivals & Special Experiences`
- 页面只读取 `toronto-weekend/data/events.md`，不要改文件名。

## 5. 完成后检查

- [ ] 所有日期都在目标周末内
- [ ] 每条都有 `Day` 和 `When`
- [ ] 每条都有 `Link`
- [ ] 没有收录“随时可以去”的普通周末活动
- [ ] 没有把内部筛选条件写进页面文案
- [ ] 用根目录 `python3 -m http.server 8000` 打开 `/toronto-weekend/` 检查渲染正常

## 6. 模板

可以直接复制 [`data-collection/events.template.md`](data-collection/events.template.md) 作为起点。