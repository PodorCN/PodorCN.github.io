# Data Collection Tools

These scripts are the **data collection side**. They generate/update the JSON files that the static `daily-scoop` page reads.

## Scripts

| Script | Purpose | Output |
| --- | --- | --- |
| `collect_rfd.py` | Fetch RedFlagDeals hot deals, filter categories/keywords, sort by heat | `daily-scoop/data/rfd-deals.json` |
| `collect_gas.py` | Maintain rolling 30-day Toronto gas price data | `daily-scoop/data/gas-prices.json` |

## Usage

```bash
# Collect latest RFD deals
python3 data-collection/collect_rfd.py

# Show current gas data
python3 data-collection/collect_gas.py

# Add today's gas price
python3 data-collection/collect_gas.py --date 2026-08-23 --price 166.5

# Force replace a date if it already exists
python3 data-collection/collect_gas.py --date 2026-08-23 --price 166.5 --overwrite
```

No `pip install` needed; both scripts use only the Python standard library.

## cron example

```cron
# Every morning update RFD and gas data, then commit/push
30 8 * * * cd /path/to/repo && python3 data-collection/collect_rfd.py && python3 data-collection/collect_gas.py --date $(date +%F) --price $(curl -s https://your-data-source/... | jq -r .price) && git add daily-scoop/data && git commit -m "daily data update" && git push
```

The exact gas price source can be anything you prefer; `collect_gas.py` just maintains the JSON format.