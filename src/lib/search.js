// Search + filter + sort pipeline. Pure functions so the UI can memoize them.

import { has } from './format.js'

/**
 * Lowercase, strip diacritics and punctuation, collapse whitespace.
 * "St. Paul's — Newberg" -> "st pauls newberg"
 */
export function normalize(value) {
  if (!has(value)) return ''
  return String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Build a one-time haystack per organization (name, aka, description, city). */
export function buildIndex(organizations) {
  const index = new Map()
  for (const org of organizations) {
    index.set(
      org.id,
      normalize([org.name, org.aka, org.description, org.city].filter(has).join(' '))
    )
  }
  return index
}

export const SORTS = [
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'revenue', label: 'Largest revenue first' }
]

export const DEFAULT_SORT = 'name'

function matchesQuery(haystack, terms) {
  for (const term of terms) {
    if (!haystack.includes(term)) return false
  }
  return true
}

export function queryTerms(query) {
  const normalized = normalize(query)
  return normalized ? normalized.split(' ') : []
}

/** Filter by search text and city only — the base set for category counts. */
export function applyBaseFilters(organizations, index, terms, city) {
  if (terms.length === 0 && !city) return organizations
  return organizations.filter((org) => {
    if (city && org.city !== city) return false
    if (terms.length > 0 && !matchesQuery(index.get(org.id) || '', terms)) return false
    return true
  })
}

/** Categories are OR-ed: an org matches if it has any selected category. */
export function applyCategoryFilter(organizations, selected) {
  if (selected.length === 0) return organizations
  const wanted = new Set(selected)
  return organizations.filter((org) =>
    Array.isArray(org.categories) && org.categories.some((c) => wanted.has(c))
  )
}

export function countByCategory(organizations) {
  const counts = new Map()
  for (const org of organizations) {
    if (!Array.isArray(org.categories)) continue
    for (const id of org.categories) {
      counts.set(id, (counts.get(id) || 0) + 1)
    }
  }
  return counts
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

export function sortOrganizations(organizations, sort) {
  const sorted = organizations.slice()
  if (sort === 'revenue') {
    sorted.sort((a, b) => {
      const av = typeof a.revenueAmt === 'number' ? a.revenueAmt : -1
      const bv = typeof b.revenueAmt === 'number' ? b.revenueAmt : -1
      if (av !== bv) return bv - av
      return collator.compare(a.name || '', b.name || '')
    })
  } else {
    sorted.sort((a, b) => collator.compare(a.name || '', b.name || ''))
  }
  return sorted
}
