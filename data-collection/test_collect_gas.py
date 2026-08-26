import os
import sys
import unittest
from datetime import date


sys.path.insert(0, os.path.dirname(__file__))
import collect_gas  # noqa: E402


class CollectGasTests(unittest.TestCase):
    def test_parse_historical_prices(self):
        html = """
        <table><caption>Other</caption><tr><td>ignore</td></tr></table>
        <table class="page-table-body">
          <caption>Historical Values</caption>
          <tr><th>Date</th><th>Change</th><th>Price</th></tr>
          <tr>
            <td>August 26, 2026</td>
            <td>-2 <span>cent(s)</span></td>
            <td>174.9 <span>cent(s)/litre</span></td>
          </tr>
        </table>
        """

        self.assertEqual(
            collect_gas.parse_historical_prices(html),
            [{"date": "2026-08-26", "price": 174.9}],
        )

    def test_parse_forecast(self):
        payload = {
            "gas_prices": [
                {
                    "latest_date": "Aug 27, 2026",
                    "latest_change": "pricedown",
                    "latest_change_value": "1",
                    "latest_new_total": "173.9",
                    "page_url": collect_gas.CITYNEWS_PAGE_URL.rstrip("/"),
                }
            ]
        }

        forecast = collect_gas.parse_forecast(payload)

        self.assertEqual(forecast["date"], "2026-08-27")
        self.assertEqual(forecast["price"], 173.9)
        self.assertEqual(forecast["change"], -1.0)

    def test_fresh_values_replace_existing_date(self):
        values = [
            {"date": "2026-08-26", "price": 170.0},
            {"date": "2026-08-26", "price": 174.9},
            {"date": "2026-08-25", "price": 176.9},
        ]

        cleaned = collect_gas.trim_to_rolling_month(values, today=date(2026, 8, 26))

        self.assertEqual(
            cleaned,
            [
                {"date": "2026-08-25", "price": 176.9},
                {"date": "2026-08-26", "price": 174.9},
            ],
        )


if __name__ == "__main__":
    unittest.main()
