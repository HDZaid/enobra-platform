import { Link } from 'react-router-dom';
import { mediaUrl } from '../ui/resourceValidation.js';

export function Brand({ company, footer = false }) {
  return (
    <Link
      to="/"
      className={`brand${footer ? ' footer-brand' : ''}`}
      aria-label="EnObra, inicio"
      viewTransition
    >
      {company.logo ? (
        <img className="official-logo" src={mediaUrl(company.logo)} alt={company.name} />
      ) : (
        <>
          {!footer && (
            <svg className="brand-icon" viewBox="0 0 50 54" aria-hidden="true">
              <path
                d="M3 49V21L19 11v38M24 49V4l20 12v33M10 26v17M32 17v26"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
              />
              <path d="M0 51h50M19 11V2" stroke="#FF6A1F" strokeWidth="4" />
            </svg>
          )}
          <span>
            <small>CONSTRUYE</small>
            <strong>
              En<span>Obra</span>
            </strong>
            <em>Más que una construcción, un hogar</em>
          </span>
        </>
      )}
    </Link>
  );
}
