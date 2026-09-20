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
  "count": 697,
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
    },
    {
      // A community-researched record: no IRS registration of its own.
      "id": "add:makemusicmcminnville",
      "name": "Make Music McMinnville",
      "description": "…",
      "categories": ["arts"],
      "city": "McMinnville", "state": "OR",
      "website": "https://aaycor.org/make-music-mcminnville",
      "parentOrg": "Arts Alliance of Yamhill County",
      "sourceUrl": "https://www.orartswatch.org/…",
      "source": "community-research",
      "confidence": "high"
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

Records with `source: "community-research"` came from research rather than the IRS
dataset, so they have no `ein` and no IRS fields. The detail view states that
plainly and links `sourceUrl`, rather than leaving the reader to wonder why the
financials are missing. `parentOrg`, where present, names the fiscal sponsor or
parent body and is surfaced on the card as "A program of …".

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

### GitHub Pages (automatic)

`.github/workflows/deploy.yml` builds the site and publishes it on every push to
`main`. It also exposes `workflow_dispatch`, so a deploy can be re-run by hand from
the Actions tab without pushing a commit.

**Pages Source must be set to GitHub Actions** — Settings -> Pages -> Build and
deployment -> Source. This is the one step the workflow cannot do for itself.

Getting this wrong fails quietly rather than loudly. On the default setting,
"Deploy from a branch", GitHub runs its own builder over the repository root in
parallel with this workflow. Both report success, but the branch builder usually
finishes last and wins, and what it publishes is the repository's root
`index.html` -- the Vite *source* template, whose only script tag points at
`/src/main.jsx`. That file does not exist in a built site, so the deployed page
loads, renders nothing, and reports no error. A blank page with two green
checkmarks is the signature of this setting.

Once Source is GitHub Actions, the extra "pages build and deployment" runs stop
appearing and the site lands at `https://<user>.github.io/<repo>/`.

**Do not re-run an old "pages build and deployment" run.** Those entries stay in
the Actions tab as history from the branch-based era, and re-running one executes
the old branch build and republishes the repository root over the top of the real
deployment -- blanking the site again even though Source is now set correctly. To
redeploy, run the **Deploy to GitHub Pages** workflow instead, or push to `main`.

### Anywhere else

`vite.config.js` sets `base: './'`, so the built `dist/` is position-independent: it
works at a domain root, under a project subpath such as
`https://<user>.github.io/yamhill-nonprofits/`, or in any nested folder. Build, then
publish the contents of `dist/` to any static host. There is no server, no API, and
no runtime configuration.

`public/.nojekyll` is copied into `dist/` so GitHub Pages serves the build verbatim
instead of running it through Jekyll.

### Custom domain

The site serves at **yamhillcountynonprofits.com**, declared by `public/CNAME`,
which Vite copies into every build.

**`public/CNAME` is the source of truth, not the Pages settings page.** Under
Actions publishing, GitHub serves the domain named by the deployed artifact, and
setting a domain in the UI does not reliably write the file back to the repository
— when this domain was added there, no `CNAME` commit appeared, which is why the
file is committed here instead. Keeping it in the artifact means a deploy can never
silently drop the domain.

So: **to change or remove the domain, edit or delete `public/CNAME` and push.**
Changing it only in Settings will be undone by the next deploy.

DNS for the apex is four `A` records pointing at GitHub's Pages addresses
(`185.199.108-111.153`). There is no `www` record; adding one would need a `CNAME`
record for `www` pointing at `<user>.github.io`.

One quirk worth knowing: after a domain change, GitHub's CDN can keep serving a
cached 404 for `/` for up to ten minutes even though `/index.html` already works.
Re-running the deploy workflow purges it; so does waiting.

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
