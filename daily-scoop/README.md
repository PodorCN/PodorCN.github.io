# Daily Scoop 每日精选

这个 subpage 展示：

1. **多伦多油价走势 + 预测**：使用保存在 `data/gas-prices.json` 里最近一个月的 Toronto regular gas 每日均价（CAD c/L）画成走势图，并根据最近几天趋势预测第二天油价。
2. **RedFlagDeals 热门 deal**：读取 `data/rfd-deals.json`，按 heat 排序，最多显示 12 条。

## 数据来源

- Gas: `data/gas-prices.json`
  - 数据来自 GasBuddy / CTV Toronto gas price 的月度价格图，提取后存进 git。
  - 后续可以更新这个 JSON 文件来维护“滚动一个月”的数据。
- Deals: `data/rfd-deals.json`
  - 数据由独立 cron job 更新：抓取 RFD、按保留类目过滤、排除 `home depot / tv / oled / ymmv / beer`、给 gift card +50 heat、按 heat 排序后写入 JSON。
  - 前端只负责读取并展示，最多显示 12 条。
  - 如果 JSON 读取失败，会使用脚本内置 fallback 快照。

## 架构说明

- 这是纯静态 GitHub Pages 网站。
- 数据收集和网页展示分离：
  - cron job / 后台脚本负责更新 `data/gas-prices.json` 和 `data/rfd-deals.json`
  - HTML/JS 只读取这些 JSON 文件渲染，不需要后端服务
- 每次 cron 更新数据并 push 到 GitHub 后，静态页面刷新即可看到最新数据。
- 数据收集工具在 `data-collection/`，详细说明见 `DATA_COLLECTION.md`。

## 本地预览

在项目根目录运行：

```bash
python3 -m http.server 8000
```

然后打开 `http://localhost:8000/daily-scoop/`。
