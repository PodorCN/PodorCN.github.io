# Daily Scoop 数据收集说明

这个页面是纯静态 HTML，展示的数据完全来自 `daily-scoop/data/` 下的 JSON 文件。  
数据收集由独立脚本完成，HTML/JS 只负责读取和渲染。

## 数据文件

### 1. `data/gas-prices.json`

多伦多每日油价历史，格式：

```json
[
  { "date": "2026-07-25", "price": 175.7 },
  { "date": "2026-07-26", "price": 173.9 }
]
```

- `date`：`YYYY-MM-DD`
- `price`：Toronto regular gas 价格，单位是 **CAD cents per litre**
- 页面会读取这个数组，画走势图，并根据最近 7 天趋势预测第二天油价

维护脚本：

```bash
python3 data-collection/collect_gas.py --date 2026-08-23 --price 166.5
```

脚本会自动保留最近 30 天。

### 2. `data/rfd-deals.json`

RedFlagDeals 筛选后的 deal 列表，格式：

```json
[
  {
    "title": "Google Pixel 10 128G - Lemongrass $400 off",
    "href": "https://forums.redflagdeals.com/...",
    "dealer": "Best Buy",
    "date": "2026-08-21T07:15:16+00:00",
    "votes": 73,
    "posts": 97,
    "giftCard": false,
    "heat": 73
  }
]
```

- `title`：deal 标题
- `href`：完整链接
- `dealer`：商店/Dealer
- `date`：发布时间 ISO 8601
- `votes`：点赞数
- `posts`：回复数
- `giftCard`：是否命中 gift card / giftcard
- `heat`：热度，`heat = votes + (giftCard ? 50 : 0)`

页面读取后会再次按 `heat` 降序排列，并最多显示前 12 条。

维护脚本：

```bash
python3 data-collection/collect_rfd.py
```

## RFD 筛选规则（已内置在工具里）

保留类目：

```
Computers & Electronics
Home & Garden
Apparel
Beauty & Wellness
Financial Services
Groceries
Automotive
Restaurants
Sports & Fitness
Small Business
Entertainment
```

排除类目：

```
Travel
Kids & Babies
```

排除关键词（标题）：

```
home depot
tv / television / oled
ymmv
beer
```

也排除 dealer 名称含 `beer` 的帖子。

特殊加权：

```
gift card / giftcard  ->  heat + 50
```

排序与数量：

```
只看最近 7 天
按 heat 降序
最多保留 12 条
```

## HTML 如何配合

1. cron / 后台脚本运行 `data-collection/` 里的工具。
2. 脚本更新 `daily-scoop/data/gas-prices.json` 和 `daily-scoop/data/rfd-deals.json`。
3. 将更新后的 JSON commit 并 push 到 GitHub。
4. GitHub Pages 上的 `daily-scoop/script.js` 会读取这些 JSON，自动渲染最新走势图、预测和 deal 列表。

## 本地预览

```bash
python3 -m http.server 8000
```

打开：

```
http://localhost:8000/daily-scoop/
```