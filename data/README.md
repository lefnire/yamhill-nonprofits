# Data pipeline

`src/data/nonprofits.json` — the file the app actually reads — is generated.
Do not hand-edit it. Run the three scripts below to rebuild it.

```bash
pip install openpyxl
python scripts/00_extract_xlsx.py     # workbook  -> data/raw/*.json
python scripts/01_merge_sources.py    # raw       -> data/master.json
python scripts/02_assemble_dataset.py # master + research -> src/data/nonprofits.json
```

The pipeline is deterministic: the same inputs produce a byte-identical
`nonprofits.json`.

## Sources

`data/source/Yamhill_County_Non-Profits.xlsx` has three sheets:

| Sheet | Rows | What it is |
|---|---|---|
| `Yamhill County Non-Profit Conta` | 635 | Hand-compiled directory with the original `Focus` column |
| `eo_or` | 26,107 | IRS Business Master File extract, all Oregon exempt orgs |
| `Yamhill County List` | 666 | Two tables stacked: 7 hand-written entries, then a BMF-derived county list |

`00_extract_xlsx.py` splits these out. `01_merge_sources.py` merges them into 663
unique organizations keyed by EIN, and enriches each one from the BMF with its
NTEE code, 501(c) subsection, IRS ruling year, and reported revenue and assets.

## Why the source data needed work

The `Focus` column was the spreadsheet's only real filter, and it had **172
distinct values across 635 rows** — over 100 of them used exactly once
("Cycling / peace advocacy", "Widow support", "Historic fire apparatus
preservation"). One cell contained a four-sentence paragraph. As a filter
control it was unusable, and the labels were themselves guesswork: a school PTA
was filed under "Animal welfare", an adoption home-study agency under
"homeschooling", a spay/neuter clinic under emergency rescue.

Other problems the pipeline corrects: IRS legal names stored in all-caps; the
`Website` column often holding a scraped page title ("Home | Dayton FFA Alumni")
instead of a URL, and occasionally a URL belonging to an entirely different
organization; `AKA` holding stray numeric codes (`4911.0`) or IRS group-number
prefixes; and BMF revenue of `0`, which means *not reported* rather than zero
and so is dropped rather than displayed as `$0`.

## Categories

`data/taxonomy.json` defines 36 categories replacing the 172 focus strings.
Organizations get **1–3** of them, so a church running a food pantry is findable
under both Faith & Religion and Basic Needs & Food. 283 of 663 organizations
carry more than one category. 35 of the 36 are in use; nothing landed in
"Other / Uncategorized".

## The research pass

`data/research/batch*.json` holds the per-organization output: display name,
categories, a short description, and a verified website. It was produced by 24
parallel Claude agents following `data/RESEARCH_INSTRUCTIONS.md`, each handling
28 records — triaging the self-evident ones from name and NTEE code, then web
searching the ambiguous remainder.

These files are committed so the dataset can be rebuilt without re-running the
research. To redo it, delete them and re-run the agents against the instructions.

## Confidence and known limits

Every organization carries a `confidence` field:

| | |
|---|---|
| `high` | 324 | Verified against the organization's own web presence |
| `medium` | 230 | Corroborated but not fully confirmed |
| `low` | 109 | Grounded only in the IRS NTEE code and legal name |

**The session's web-search budget was exhausted partway through** (a 200-query
cap). Batches 16–23 fell back to classifying from IRS NTEE codes, subsections,
and names. NTEE is an objective IRS classification, so the categories remain
defensible, but descriptions for those records are deliberately thin and
conservative rather than invented, and their websites are more often `null`.
The `low`-confidence records are the ones worth a second research pass.

Descriptions are generated summaries, not the organizations' own words. 457 of
663 have a verified website; the rest genuinely have no findable web presence.
Directory-aggregator links (GuideStar, Cause IQ, ProPublica) were rejected
rather than used as a stand-in. Nothing here is authoritative — verify with the
organization before donating or making contact.
