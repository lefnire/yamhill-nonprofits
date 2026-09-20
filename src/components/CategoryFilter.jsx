import { useId, useState } from 'react'
import { formatCount } from '../lib/format.js'

const COLLAPSED_LIMIT = 12

/**
 * The primary control: a multi-select list of category toggles with live
 * counts. Selections are OR-ed by the caller.
 */
export default function CategoryFilter({ categories, counts, selected, onToggle, onClear }) {
  const [expanded, setExpanded] = useState(false)
  const groupId = useId()
  const selectedSet = new Set(selected)

  const withCounts = categories.map((category) => ({
    ...category,
    count: counts.get(category.id) || 0,
    selected: selectedSet.has(category.id)
  }))

  // Collapsed: the categories that currently match, capped. Expanded: all of
  // them, with empty ones dimmed rather than removed.
  const candidates = withCounts.filter((category) => category.count > 0 || category.selected)
  const capped = candidates.slice(0, COLLAPSED_LIMIT)
  const cappedIds = new Set(capped.map((category) => category.id))
  const collapsed = capped.concat(
    candidates.filter((category) => category.selected && !cappedIds.has(category.id))
  )
  const visible = expanded ? withCounts : collapsed
  const hiddenCount = withCounts.length - visible.length

  return (
    <section className="categories" aria-labelledby={groupId}>
      <div className="categories__head">
        <h2 className="categories__title" id={groupId}>
          Filter by category
        </h2>
        {selected.length > 0 && (
          <button type="button" className="link-button" onClick={onClear}>
            Clear categories
            <span className="visually-hidden"> ({formatCount(selected.length)} selected)</span>
          </button>
        )}
      </div>

      <ul className="chip-list" role="list">
        {visible.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              className="chip"
              data-empty={category.count === 0 && !category.selected ? 'true' : undefined}
              aria-pressed={category.selected}
              title={category.desc || undefined}
              onClick={() => onToggle(category.id)}
            >
              <span className="chip__label">{category.label}</span>
              <span className="chip__count" aria-hidden="true">
                {formatCount(category.count)}
              </span>
              <span className="visually-hidden">
                {formatCount(category.count)} matching organizations
              </span>
            </button>
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          className="link-button categories__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? 'Show fewer categories'
            : `Show all ${formatCount(withCounts.length)} categories`}
        </button>
      )}
    </section>
  )
}
