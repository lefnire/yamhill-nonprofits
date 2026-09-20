import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import data from './data/nonprofits.json'
import CategoryFilter from './components/CategoryFilter.jsx'
import FilterBar from './components/FilterBar.jsx'
import OrgCard from './components/OrgCard.jsx'
import OrgDetail from './components/OrgDetail.jsx'
import { formatCount, has, text } from './lib/format.js'
import {
  applyBaseFilters,
  applyCategoryFilter,
  buildIndex,
  countByCategory,
  queryTerms,
  sortOrganizations
} from './lib/search.js'
import { readStateFromUrl, writeStateToUrl } from './lib/urlState.js'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 200

const ALL_ORGS = Array.isArray(data.organizations) ? data.organizations : []
const ALL_CATEGORIES = Array.isArray(data.categories) ? data.categories : []

// Categories present in the data but missing from the taxonomy still get a chip.
const KNOWN_IDS = new Set(ALL_CATEGORIES.map((category) => category.id))
const EXTRA_IDS = Array.from(
  new Set(
    ALL_ORGS.flatMap((org) => (Array.isArray(org.categories) ? org.categories : [])).filter(
      (id) => has(id) && !KNOWN_IDS.has(id)
    )
  )
)
const CATEGORIES = ALL_CATEGORIES.concat(EXTRA_IDS.map((id) => ({ id, label: id, desc: '' })))

const CATEGORY_LABELS = new Map(CATEGORIES.map((category) => [category.id, category.label || category.id]))

const CITIES = Array.from(new Set(ALL_ORGS.map((org) => text(org.city)).filter(Boolean))).sort(
  (a, b) => a.localeCompare(b)
)

export default function App() {
  const initial = useRef(readStateFromUrl()).current

  const [query, setQuery] = useState(initial.query)
  const [debouncedQuery, setDebouncedQuery] = useState(initial.query)
  const [selectedCategories, setSelectedCategories] = useState(() =>
    initial.categories.filter((id) => CATEGORY_LABELS.has(id))
  )
  const [city, setCity] = useState(() => (CITIES.includes(initial.city) ? initial.city : ''))
  const [sort, setSort] = useState(initial.sort)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [activeOrg, setActiveOrg] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    writeStateToUrl({ query: debouncedQuery, categories: selectedCategories, city, sort })
  }, [debouncedQuery, selectedCategories, city, sort])

  const index = useMemo(() => buildIndex(ALL_ORGS), [])
  const terms = useMemo(() => queryTerms(debouncedQuery), [debouncedQuery])

  // Search + city first: category counts describe what each chip would add.
  const baseResults = useMemo(
    () => applyBaseFilters(ALL_ORGS, index, terms, city),
    [index, terms, city]
  )
  const counts = useMemo(() => countByCategory(baseResults), [baseResults])
  const results = useMemo(
    () => sortOrganizations(applyCategoryFilter(baseResults, selectedCategories), sort),
    [baseResults, selectedCategories, sort]
  )

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [debouncedQuery, selectedCategories, city, sort])

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  )

  const toggleCategory = useCallback((id) => {
    setSelectedCategories((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : current.concat(id)
    )
  }, [])

  const clearCategories = useCallback(() => setSelectedCategories([]), [])

  const resetAll = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    setSelectedCategories([])
    setCity('')
  }, [])

  const openOrg = useCallback((org) => setActiveOrg(org), [])
  const closeOrg = useCallback(() => setActiveOrg(null), [])

  const filtersActive =
    debouncedQuery.trim() !== '' || selectedCategories.length > 0 || city !== ''
  const total = ALL_ORGS.length
  const summary = `Showing ${formatCount(results.length)} of ${formatCount(total)} organizations`
  const generatedAt = text(data.generatedAt)

  return (
    <div className="page">
      <a className="skip-link" href="#results">
        Skip to results
      </a>

      <header className="site-header">
        <div className="container">
          <p className="site-header__eyebrow">Yamhill County, Oregon</p>
          <h1 className="site-header__title">Nonprofit Directory</h1>
          <p className="site-header__lede">
            {formatCount(total)} nonprofit organizations based in Yamhill County. Search by
            name or keyword, filter by what they do, and find how to reach them.
          </p>
        </div>
      </header>

      <main className="container">
        <div className="controls">
          <CategoryFilter
            categories={CATEGORIES}
            counts={counts}
            selected={selectedCategories}
            onToggle={toggleCategory}
            onClear={clearCategories}
          />
          <FilterBar
            query={query}
            onQueryChange={setQuery}
            city={city}
            cities={CITIES}
            onCityChange={setCity}
            sort={sort}
            onSortChange={setSort}
          />
        </div>

        <div className="results-bar">
          <p className="results-bar__count">{summary}</p>
          {filtersActive && (
            <button type="button" className="link-button" onClick={resetAll}>
              Reset all filters
            </button>
          )}
        </div>

        <p className="visually-hidden" role="status" aria-live="polite">
          {summary}
        </p>

        <div id="results" tabIndex={-1}>
          {results.length === 0 ? (
            <div className="empty">
              <h2 className="empty__title">No organizations match these filters</h2>
              <p className="empty__body">
                Try removing a category, choosing All cities, or searching for a broader term.
              </p>
              {filtersActive && (
                <button type="button" className="button" onClick={resetAll}>
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <ul className="card-grid" role="list">
              {visibleResults.map((org) => (
                <li key={org.id}>
                  <OrgCard org={org} categoryLabels={CATEGORY_LABELS} onOpen={openOrg} />
                </li>
              ))}
            </ul>
          )}

          {visibleResults.length < results.length && (
            <div className="more">
              <button
                type="button"
                className="button"
                onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}
              >
                Show more organizations
              </button>
              <p className="more__note">
                Showing {formatCount(visibleResults.length)} of {formatCount(results.length)}{' '}
                matches
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Compiled from an IRS Business Master File extract for Oregon and a hand-compiled
            Yamhill County list. Details such as revenue and IRS classification come from public
            filings and may be out of date{generatedAt ? `; data prepared ${generatedAt}` : ''}.
            Contact an organization directly to confirm its work and status.
          </p>
        </div>
      </footer>

      {activeOrg && (
        <OrgDetail org={activeOrg} categoryLabels={CATEGORY_LABELS} onClose={closeOrg} />
      )}
    </div>
  )
}
