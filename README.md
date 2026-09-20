# Yamhill County Nonprofit Directory

A searchable, frontend-only directory of nonprofit organizations based in Yamhill
County, Oregon. It is a single-page React app with no backend and no API calls:
the entire dataset ships as a static JSON file, so the built site can be hosted on
GitHub Pages or any static host.

## What it does

- **Filter by category** — multi-select chips with live counts; selecting several
  categories shows organizations in any of them.
- **Search** — debounced, case- and punctuation-insensitive matching across name,
  alternate name, description, and city.
- **Filter by city** — McMinnville, Newberg, Sheridan, Carlton, Dayton, Yamhill,
  Amity, Willamina, Dundee, Lafayette (the list is derived from the data).
- **Sort** — name A–Z (default) or largest reported revenue first.
- **Detail view** — a focus-trapped modal with the full address, contact person,
  EIN, IRS classification, ruling year, reported revenue and assets, and a
  tax-deductibility note where IRS records indicate one.
- **Shareable filters** — the current search, categories, city and sort are kept in
  the URL query string (`?q=&cats=&city=&sort=`), so a filtered view can be linked.

Results render 50 at a time with a "Show more" control, light and dark themes follow
`prefers-color-scheme`, and the layout is mobile-first down to 360px.

## Data

`src/data/nonprofits.json` is the only data source. It was assembled from:

1. An **IRS Business Master File** extract for Oregon (`eo_or`), filtered to
   organizations with Yamhill County mailing addresses. This supplies EIN, address,
   NTEE code and major group, subsection/deductibility codes, ruling year, and the
   revenue and asset amounts the IRS has on file.
2. A **hand-compiled list of Yamhill County organizations**, which supplies websites,
   contact people, email addresses and phone numbers, plus organizations the BMF
   extract missed.

The two sources were merged on EIN (falling back to normalized name), de-duplicated,
cleaned, and assigned one to three categories from a 36-entry local taxonomy
(`data/taxonomy.json`; 35 of the 36 are in use). Every record carries a `confidence`
value reflecting how certain the merge and categorization are. Figures come from
public filings and can be several years old.

### Shape

```jsonc
{
  "generatedAt": "2026-09-20",
  "count": 663,
  "categories": [{ "id": "animals", "label": "Animals & Pets", "desc": "…" }],
  "organizations": [
    {
      "id": "851370457",
      "name": "Example Organization",
      "aka": null,
      "description": "…",
      "categories": ["civic"],
      "city": "Newberg", "state": "OR", "zip": "97132", "address": "200 E 2nd St",
      "website": null, "email": null, "phone": null, "contact": null,
      "ein": "851370457", "ntee": "X20", "nteeMajor": "Religion-Related",
      "subsection": "501(c)(3) charitable", "rulingYear": 2023,
      "revenueAmt": 96653, "assetAmt": 45790, "deductible": true,
      "originalFocus": "…", "confidence": "medium"
    }
  ]
}
```

Only `id`, `name`, `categories` and `state` are relied on; every other field may be
`null` or absent and the UI omits it rather than rendering a blank label. An absent
`revenueAmt` or `assetAmt` means the IRS has no figure on file, not zero, so those
rows are left out of the detail view entirely rather than shown as `$0`. Categories
found on an organization but missing from the `categories` array still get a chip,
so the taxonomy and the records can drift without breaking the page.

### Regenerating the data

The data file is generated, not hand-edited. The pipeline and its inputs live in
`data/`, and `data/README.md` documents them in full, including how the categories
were assigned and where the dataset's known weak spots are. In short:

```bash
pip install openpyxl
python scripts/00_extract_xlsx.py     # workbook -> data/raw/*.json
python scripts/01_merge_sources.py    # raw -> data/master.json
python scripts/02_assemble_dataset.py # master + data/research -> src/data/nonprofits.json
```

The run is deterministic: the same inputs produce a byte-identical
`src/data/nonprofits.json`. No app code needs to change as long as the shape holds —
nothing in the UI hardcodes organization ids, category ids, or city names.

## Running it

```bash
npm install     # install dependencies
npm run dev     # start the Vite dev server (http://localhost:5173)
npm run build   # production build into dist/
npm run preview # serve the production build locally
```

## Deploying

`vite.config.js` sets `base: './'`, so `dist/` works both at a domain root and under a
project subpath such as `https://<user>.github.io/yamhill-nonprofits/`. Build, then
publish the contents of `dist/`.

## Project layout

```
index.html
vite.config.js
data/                    source workbook, IRS extract, taxonomy, research output
scripts/                 the three-step pipeline that regenerates the dataset
src/
  main.jsx               app entry
  App.jsx                state, filter pipeline, layout
  styles.css             all styles; theming via CSS custom properties
  data/nonprofits.json   the dataset
  components/
    CategoryFilter.jsx   multi-select category chips with counts
    FilterBar.jsx        search, city and sort controls
    OrgCard.jsx          result card
    OrgDetail.jsx        detail modal
  lib/
    format.js            null-safe value formatting
    search.js            normalize, filter, count, sort
    urlState.js          query-string read/write
```

## Accessibility notes

Filters are ordinary buttons and selects, operable by keyboard with visible focus
rings. Result counts are announced through an `aria-live` region. The detail modal
uses `role="dialog"`/`aria-modal`, traps Tab, closes on Escape or backdrop click, and
returns focus to the control that opened it. Icon-only controls carry `aria-label`s,
and external links use `target="_blank"` with `rel="noopener noreferrer"`.
