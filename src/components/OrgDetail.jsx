import { useEffect, useRef } from 'react'
import {
  formatAddress,
  formatReportedAmount,
  has,
  shortUrlLabel,
  safeHref,
  telHref,
  text
} from '../lib/format.js'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

function Row({ label, children }) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div className="detail__row">
      <dt className="detail__label">{label}</dt>
      <dd className="detail__value">{children}</dd>
    </div>
  )
}

/** Modal detail view: focus-trapped, Escape closes, focus returns on close. */
export default function OrgDetail({ org, categoryLabels, onClose }) {
  const dialogRef = useRef(null)
  const openerRef = useRef(null)

  useEffect(() => {
    openerRef.current = document.activeElement
    const dialog = dialogRef.current
    const first = dialog?.querySelector(FOCUSABLE)
    ;(first || dialog)?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      const opener = openerRef.current
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus()
      }
    }
  }, [onClose])

  const website = safeHref(org.website)
  const email = text(org.email)
  const phone = text(org.phone)
  const tel = telHref(phone)
  const address = formatAddress(org)
  // Absent or zero means the IRS has no figure on file — show nothing at all.
  const revenue = formatReportedAmount(org.revenueAmt)
  const assets = formatReportedAmount(org.assetAmt)
  const categories = (org.categories || []).map((id) => categoryLabels.get(id) || id).filter(has)
  const irs = [text(org.nteeMajor), text(org.subsection)].filter(Boolean)
  const titleId = `detail-title-${org.id}`

  return (
    <div className="overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="detail__head">
          <div>
            <h2 className="detail__title" id={titleId}>
              {text(org.name) || 'Unnamed organization'}
            </h2>
            {has(org.aka) && <p className="detail__aka">Also known as {text(org.aka)}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close organization details"
            onClick={onClose}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="detail__body">
          {(categories.length > 0 || org.confidence === 'low') && (
            <ul className="card__tags" role="list">
              {categories.map((label) => (
                <li key={label} className="tag">
                  {label}
                </li>
              ))}
              {org.confidence === 'low' && (
                <li className="tag tag--caution">Unverified description</li>
              )}
            </ul>
          )}

          {has(org.description) && <p className="detail__description">{text(org.description)}</p>}

          <dl className="detail__rows">
            <Row label="Part of">{text(org.parentOrg) || null}</Row>
            <Row label="Address">{address || null}</Row>
            <Row label="Contact">{text(org.contact) || null}</Row>
            <Row label="Website">
              {website ? (
                <a href={website} target="_blank" rel="noopener noreferrer" title={website}>
                  {shortUrlLabel(website)}
                </a>
              ) : null}
            </Row>
            <Row label="Email">{email ? <a href={`mailto:${email}`}>{email}</a> : null}</Row>
            <Row label="Phone">{tel ? <a href={tel}>{phone}</a> : null}</Row>
            <Row label="EIN">{text(org.ein) || null}</Row>
            <Row label="IRS classification">
              {irs.length > 0 ? irs.join(' — ') : null}
            </Row>
            <Row label="NTEE code">{text(org.ntee) || null}</Row>
            <Row label="IRS ruling year">
              {typeof org.rulingYear === 'number' ? String(org.rulingYear) : text(org.rulingYear) || null}
            </Row>
            <Row label="Reported revenue">{revenue || null}</Row>
            <Row label="Reported assets">{assets || null}</Row>
            <Row label="Primary focus">{text(org.originalFocus) || null}</Row>
            <Row label="Source">
              {org.source === 'community-research' && safeHref(org.sourceUrl) ? (
                <a
                  href={safeHref(org.sourceUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={org.sourceUrl}
                >
                  {shortUrlLabel(safeHref(org.sourceUrl))}
                </a>
              ) : null}
            </Row>
          </dl>

          {org.confidence === 'low' && (
            <p className="detail__note detail__note--caution">
              <strong>The description and categories above are not verified.</strong>{' '}
              They were inferred from this organization's IRS classification code and
              name, because research turned up no other source describing its work.
              {has(org.ein)
                ? ' Everything drawn from the IRS record itself — the EIN, address and ' +
                  'any financial figures — is on file and reliable.'
                : ''}{' '}
              Contact the organization before relying on what it does.
            </p>
          )}

          {org.source === 'community-research' && (
            <p className="detail__note detail__note--muted">
              Not separately registered with the IRS, so it has no EIN or financial
              filings of its own
              {has(org.parentOrg) ? ` — it operates under ${text(org.parentOrg)}` : ''}
              . Found through research rather than the IRS dataset; check the source link
              before relying on these details.
            </p>
          )}

          {org.deductible === true && (
            <p className="detail__note">
              IRS records list this organization as eligible to receive tax-deductible
              contributions. Confirm current status with the organization before giving.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
