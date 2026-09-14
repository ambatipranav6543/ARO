"""Load the tabular source dataset into normalized `FinancialRecord`s.

The provided dataset (Kaggle: financial-statements-of-major-companies,
2009-2023) is structured/tabular rather than free-text filings, so
ingestion here is a column mapping + type coercion rather than PDF/table
extraction. The extracted-text pipeline implied by the package name is not
needed for this data source; this loader is the Day 1 ingestion milestone
for the dataset actually in use.
"""

from __future__ import annotations

import csv
from pathlib import Path

from app.schemas.financial import FinancialRecord

_COLUMN_MAP: dict[str, str] = {
    "Year": "year",
    "Company ": "company",
    "Category": "category",
    "Market Cap(in B USD)": "market_cap_b_usd",
    "Revenue": "revenue",
    "Gross Profit": "gross_profit",
    "Net Income": "net_income",
    "Earning Per Share": "earning_per_share",
    "EBITDA": "ebitda",
    "Share Holder Equity": "shareholder_equity",
    "Cash Flow from Operating": "cash_flow_operating",
    "Cash Flow from Investing": "cash_flow_investing",
    "Cash Flow from Financial Activities": "cash_flow_financing",
    "Current Ratio": "current_ratio",
    "Debt/Equity Ratio": "debt_equity_ratio",
    "ROE": "roe",
    "ROA": "roa",
    "ROI": "roi",
    "Net Profit Margin": "net_profit_margin",
    "Free Cash Flow per Share": "free_cash_flow_per_share",
    "Return on Tangible Equity": "return_on_tangible_equity",
    "Number of Employees": "number_of_employees",
    "Inflation Rate(in US)": "inflation_rate_us",
}

_INT_FIELDS = {"year", "number_of_employees"}
_STR_FIELDS = {"company", "category"}


def _coerce(field: str, raw: str) -> object | None:
    raw = raw.strip()
    if not raw:
        return None
    if field in _STR_FIELDS:
        return raw
    if field in _INT_FIELDS:
        return int(float(raw))
    return float(raw)


def load_records(csv_path: str | Path) -> list[FinancialRecord]:
    """Parse the CSV at `csv_path` into a list of `FinancialRecord`."""
    path = Path(csv_path)
    records: list[FinancialRecord] = []
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        # start=2: line 1 is the header, so line numbers match what a
        # reviewer sees when opening the file.
        for line_number, row in enumerate(reader, start=2):
            values = {
                field: _coerce(field, row[header])
                for header, field in _COLUMN_MAP.items()
                if header in row
            }
            records.append(FinancialRecord(source_row=line_number, **values))
    return records
