# Data pipeline

`src/data/nonprofits.json` — the file the app actually reads — is generated.
Do not hand-edit it. Run the three scripts below to rebuild it.

```bash
pip install openpyxl
python scripts/00_extract_xlsx.py     # workbook  -> data/raw/*.json
python scripts/01_merge_sources.py    # raw       -> data/master.json
python scripts/02_assemble_dataset.py # master + research -> src/data/nonprofits.json
python scripts/03_merge_additions.py  # + data/additions   -> same file, in place
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
unique IRS-registered organizations keyed by EIN, and enriches each one from the BMF with its
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
under both Faith & Religion and Basic Needs & Food. 295 of 697 organizations
carry more than one category. 35 of the 36 are in use; nothing landed in
"Other / Uncategorized".

## Coverage and the unregistered layer

The directory is **complete for IRS-registered organizations** in the ten Yamhill
County ZIP codes (97101, 97111, 97114, 97115, 97127, 97128, 97132, 97148, 97378,
97396). Checked directly: of every row in the Oregon Business Master File extract
carrying one of those ZIPs, exactly one is absent, and that one is a Portland
organization with a mismatched ZIP.

What a Business Master File structurally cannot contain is the layer of civic life
that never files for its own exemption:

1. **Fiscally sponsored projects** operating under a parent's EIN — Make Music
   McMinnville and five sibling programs run under the Arts Alliance of Yamhill
   County.
2. **Unincorporated volunteer groups** — writers' workshops, trail friends groups,
   church food pantries and clothing closets.
3. **Local chapters** whose parent files nationally — Scouting units, NAMI, the
   Salvation Army corps, a Native Plant Society chapter.
4. **Organizations formed after the snapshot** — e.g. Yamhill Conservation Trust,
   a land trust formed in late 2024.

`data/additions/*.json` holds 36 such organizations, found by eight parallel
research agents working by domain against `GAP_INSTRUCTIONS.md` and deduplicated
against the existing names. `scripts/03_merge_additions.py` folds them in.

Every one carries `source: "community-research"`, a `sourceUrl` citing the page
that substantiates it, and `parentOrg` where it operates under someone else. They
have **no EIN and no IRS financial data**, and the app says so on the record rather
than leaving the gap unexplained. Their evidence URLs were re-checked after the
fact; all resolve.

These are a judgment call worth knowing about: a directory of *registered
nonprofits* would exclude a church food pantry or a studio tour. This one includes
them, because someone looking for help or for somewhere to volunteer cares what
exists, not how it is incorporated.

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
| `high` | 342 | Verified against the organization's own web presence |
| `medium` | 245 | Corroborated but not fully confirmed |
| `low` | 110 | Grounded only in the IRS NTEE code and legal name |

**The session's web-search budget was exhausted partway through** (a 200-query
cap). Batches 16–23 fell back to classifying from IRS NTEE codes, subsections,
and names. NTEE is an objective IRS classification, so the categories remain
defensible, but descriptions for those records are deliberately thin and
conservative rather than invented, and their websites are more often `null`.
The `low`-confidence records are the ones worth a second research pass.

Descriptions are generated summaries, not the organizations' own words. 477 of
697 have a verified website; the rest genuinely have no findable web presence.
Directory-aggregator links (GuideStar, Cause IQ, ProPublica) were rejected
rather than used as a stand-in. Nothing here is authoritative — verify with the
organization before donating or making contact.
