// Shareable filter state in the query string, via the History API.
// Keys: q (search), cats (comma-separated ids), city, sort.

import { DEFAULT_SORT } from './search.js'

export function readStateFromUrl() {
  if (typeof window === 'undefined') {
    return { query: '', categories: [], city: '', sort: DEFAULT_SORT }
  }
  const params = new URLSearchParams(window.location.search)
  const cats = (params.get('cats') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    query: params.get('q') || '',
    categories: cats,
    city: params.get('city') || '',
    sort: params.get('sort') === 'revenue' ? 'revenue' : DEFAULT_SORT
  }
}

export function writeStateToUrl({ query, categories, city, sort }) {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (categories.length > 0) params.set('cats', categories.join(','))
  if (city) params.set('city', city)
  if (sort && sort !== DEFAULT_SORT) params.set('sort', sort)
  const search = params.toString()
  const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', next)
}
