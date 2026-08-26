# Data Collection Tools

These scripts are the **data collection side**. They generate/update the JSON files that the static `daily-scoop` page reads.

## Scripts

| Script | Purpose | Output |
| --- | --- | --- |
| `collect_rfd.py` | Fetch RedFlagDeals hot deals, filter categories/keywords, sort by heat | `daily-scoop/data/rfd-deals.json` |
| `collect_gas.py` | Fetch CityNews history and next-day forecast | `daily-scoop/data/gas-prices.json`, `gas-forecast.json` |

## Usage

```bash
# Collect latest RFD deals
python3 data-collection/collect_rfd.py

# Fetch current history and the published next-day forecast
python3 data-collection/collect_gas.py --fetch

# Add today's gas price
python3 data-collection/collect_gas.py --date 2026-08-23 --price 166.5

# Force replace a date if it already exists
python3 data-collection/collect_gas.py --date 2026-08-23 --price 166.5 --overwrite
```

No `pip install` needed; both scripts use only the Python standard library. The repository workflow runs the gas collector every day at 15:30 UTC.

## Manual cron example

```cron
# Update RFD and CityNews gas data, then commit/push
30 11 * * * cd /path/to/repo && python3 data-collection/collect_rfd.py && python3 data-collection/collect_gas.py --fetch && git add daily-scoop/data && git commit -m "daily data update" && git push
```

The gas collector reads the CityNews Toronto historical table and its dedicated forecast API. It validates that the next-day forecast agrees with the latest historical price before writing either file.
