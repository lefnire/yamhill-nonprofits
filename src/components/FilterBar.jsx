import { useId } from 'react'
import { SORTS } from '../lib/search.js'

/** Search box, city dropdown and sort control. */
export default function FilterBar({
  query,
  onQueryChange,
  city,
  cities,
  onCityChange,
  sort,
  onSortChange
}) {
  const searchId = useId()
  const cityId = useId()
  const sortId = useId()

  return (
    <div className="filters">
      <div className="field field--search">
        <label className="field__label" htmlFor={searchId}>
          Search
        </label>
        <div className="search-input">
          <input
            id={searchId}
            className="input"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Name, keyword, or city"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="search-input__clear"
              aria-label="Clear search text"
              onClick={() => onQueryChange('')}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          )}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={cityId}>
          City
        </label>
        <select
          id={cityId}
          className="input select"
          value={city}
          onChange={(event) => onCityChange(event.target.value)}
        >
          <option value="">All cities</option>
          {cities.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={sortId}>
          Sort
        </label>
        <select
          id={sortId}
          className="input select"
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {SORTS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
