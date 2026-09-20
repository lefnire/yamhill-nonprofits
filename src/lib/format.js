// Small helpers for rendering values that may be null, undefined or empty.

/** True when a value is worth rendering at all. */
export function has(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** Trimmed string, or '' when the value is missing. */
export function text(value) {
  return has(value) ? String(value).trim() : ''
}

/** Join only the parts that exist, so no dangling separators appear. */
export function joinParts(parts, separator = ' • ') {
  return parts.filter(has).map((p) => String(p).trim()).join(separator)
}

/** "$1,234" — whole dollars. Returns '' for anything non-numeric. */
export function formatCurrency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  })
}

/** Digits-only phone links; display text is left as authored. */
export function telHref(phone) {
  const digits = text(phone).replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : ''
}

/** Strip the protocol and trailing slash for a calmer link label. */
export function prettyUrl(url) {
  const raw = text(url)
  if (!raw) return ''
  return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

/**
 * A short display label for a URL: host plus a trimmed first path segment.
 * The href always keeps the full address; only the visible text is shortened.
 */
export function shortUrlLabel(url, max = 38) {
  const pretty = prettyUrl(url)
  if (!pretty) return ''
  if (pretty.length <= max) return pretty
  const slash = pretty.indexOf('/')
  const host = slash === -1 ? pretty : pretty.slice(0, slash)
  if (slash === -1 || host.length >= max - 2) return `${truncate(host, max)}`
  const rest = pretty.slice(slash)
  return `${host}${truncate(rest, max - host.length)}`
}

/** Clip a string to max characters, ending with an ellipsis. */
export function truncate(value, max) {
  const raw = text(value)
  if (raw.length <= max) return raw
  return `${raw.slice(0, Math.max(1, max - 1)).trimEnd()}\u2026`
}

/**
 * IRS figures: absent means "not reported", which is not the same as zero.
 * Only render a figure that is present and greater than zero.
 */
export function formatReportedAmount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return ''
  return formatCurrency(value)
}

/** Ensure a website value is an absolute http(s) URL we can safely link to. */
export function safeHref(url) {
  const raw = text(url)
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`
  return ''
}

/** "123 Main St, McMinnville, OR 97128" from whatever pieces exist. */
export function formatAddress(org) {
  const cityLine = joinParts(
    [joinParts([org.city, org.state], ', '), org.zip],
    ' '
  )
  return joinParts([org.address, cityLine], ', ')
}

export function formatCount(n) {
  return n.toLocaleString('en-US')
}
