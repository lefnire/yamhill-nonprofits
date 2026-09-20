#!/usr/bin/env python3
"""Step 1 of 3. Extract the three sheets of the source workbook into raw JSON.

The workbook is messy by nature: sheet 3 is two different tables stacked on top
of each other, and sheet 2 is a full IRS Business Master File extract for Oregon
(~26k rows) used only to enrich the Yamhill County records.

Usage:  python scripts/00_extract_xlsx.py
Needs:  pip install openpyxl
"""
import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "Yamhill_County_Non-Profits.xlsx"
RAW = ROOT / "data" / "raw"

SHEETS = {
    "Yamhill County Non-Profit Conta": ("sheet1.json", 12),
    "eo_or": ("eo_or.json", 28),
    "Yamhill County List": ("sheet3.json", 9),
}


def dump(ws, ncols):
    rows, it = [], ws.iter_rows(values_only=True)
    header = list(next(it))[:ncols]
    for row in it:
        rec = {header[i]: row[i] for i in range(ncols)}
        if any(v is not None for v in rec.values()):
            rows.append(rec)
    return rows


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.load_workbook(SRC, data_only=True)
    for sheet, (out, ncols) in SHEETS.items():
        rows = dump(wb[sheet], ncols)
        (RAW / out).write_text(json.dumps(rows, default=str))
        print(f"{sheet:34s} -> data/raw/{out:14s} {len(rows):6d} rows")


if __name__ == "__main__":
    main()
