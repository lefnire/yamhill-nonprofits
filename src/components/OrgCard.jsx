import { memo } from 'react'
import { has, safeHref, shortUrlLabel, telHref, text, truncate } from '../lib/format.js'

function CategoryChips({ ids, labels }) {
  const named = (ids || []).map((id) => labels.get(id) || id).filter(has)
  if (named.length === 0) return null
  return (
    <ul className="card__tags" role="list">
      {named.map((label) => (
        <li key={label} className="tag">
          {label}
        </li>
      ))}
    </ul>
  )
}

function OrgCard({ org, categoryLabels, onOpen }) {
  const website = safeHref(org.website)
  const email = text(org.email)
  const phone = text(org.phone)
  const tel = telHref(phone)
  const city = text(org.city)
  const aka = text(org.aka)
  const parentOrg = text(org.parentOrg)
  const description = text(org.description)

  // Clicks on the card open the detail view, except on nested links/buttons.
  function handleCardClick(event) {
    if (event.target.closest('a, button')) return
    onOpen(org)
  }

  return (
    <article className="card" onClick={handleCardClick}>
      <h3 className="card__title">
        <button type="button" className="card__title-button" onClick={() => onOpen(org)}>
          {text(org.name) || 'Unnamed organization'}
        </button>
      </h3>

      {aka && <p className="card__aka">Also known as {aka}</p>}

      {parentOrg && <p className="card__aka">A program of {parentOrg}</p>}

      <CategoryChips ids={org.categories} labels={categoryLabels} />

      {description && <p className="card__description">{description}</p>}

      <div className="card__meta">
        <p className={city ? 'card__city' : 'card__city card__city--unknown'}>
          {city || 'City not listed'}
        </p>
        <ul className="card__links" role="list">
          {website && (
            <li className="card__link">
              <a href={website} target="_blank" rel="noopener noreferrer" title={website}>
                {shortUrlLabel(website)}
              </a>
            </li>
          )}
          {email && (
            <li className="card__link">
              <a href={`mailto:${email}`} title={email}>
                {truncate(email, 38)}
              </a>
            </li>
          )}
          {tel && (
            <li className="card__link">
              <a href={tel}>{phone}</a>
            </li>
          )}
        </ul>
      </div>

    </article>
  )
}

export default memo(OrgCard)
