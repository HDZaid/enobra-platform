import { ArchOrnament } from '../../../components/ui/ColonialOrnaments.jsx';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CatalogPage as MotionPage } from '../../projects/components/CatalogPage.jsx';
import { CatalogStatus, Pagination } from '../../projects/components/CatalogStatus.jsx';
import { useCatalogResource } from '../../projects/components/useCatalogResource.js';
import { propertiesService } from '../services/propertiesService.js';
import {
  operations,
  propertyTypes,
  propertyQuery,
  readFilters,
  validateFilters,
} from '../services/propertyFilters.js';
import { PropertyCard } from '../components/PropertyCard.jsx';
import { useFavorites } from '../components/useFavorites.js';
import { useCompanyContact } from '../components/useCompanyContact.js';
import '../../projects/styles/catalog.css';

const loadProperties = (key, options) => {
  const { query, invalid, emptyFavorites } = JSON.parse(key);
  if (invalid || emptyFavorites)
    return Promise.resolve({ count: 0, page: 1, page_size: 12, results: [] });
  return propertiesService.list(query, options);
};
const loadFacets = (_key, options) => propertiesService.facets(options);

function PropertyFilters({ values, zones, onApply, onReset, onShare }) {
  const [draft, setDraft] = useState(values);
  const [errors, setErrors] = useState(validateFilters(values));
  const set = (name, value) => setDraft((previous) => ({ ...previous, [name]: value }));
  function submit(event) {
    event.preventDefault();
    const invalid = validateFilters(draft);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      event.currentTarget.querySelector(`[name="${Object.keys(invalid)[0]}"]`)?.focus();
      return;
    }
    onApply(draft);
  }
  return (
    <details className="geo-filters" open>
      <summary>Buscar y filtrar propiedades</summary>
      <form onSubmit={submit} noValidate>
        <div className="geo-filter-grid">
          <label>
            Buscar
            <input
              type="search"
              name="q"
              placeholder="Nombre o ubicación…"
              value={draft.q}
              onChange={(e) => set('q', e.target.value)}
            />
          </label>
          <label>
            Tipo
            <select value={draft.type} onChange={(e) => set('type', e.target.value)}>
              <option value="">Todos los tipos</option>
              {propertyTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Zona
            <select value={draft.zone} onChange={(e) => set('zone', e.target.value)}>
              <option value="">Todas las zonas</option>
              {[...new Set([...zones, ...(draft.zone ? [draft.zone] : [])])].map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
          </label>
          {['min_price', 'max_price'].map((name, i) => (
            <label key={name}>
              {i ? 'Precio máximo (Q)' : 'Precio mínimo (Q)'}
              <input
                name={name}
                type="number"
                min="0"
                step="1"
                placeholder={i ? 'Hasta' : 'Desde'}
                value={draft[name]}
                onChange={(e) => set(name, e.target.value)}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={errors[name] ? `${name}-error` : undefined}
              />
              <span className="geo-field-error" id={`${name}-error`}>
                {errors[name]}
              </span>
            </label>
          ))}
          <label>
            Ordenar por
            <select value={draft.sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="recent">Más recientes</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
            </select>
          </label>
        </div>
        <div className="geo-filter-actions">
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setDraft(readFilters(new URLSearchParams()));
              setErrors({});
              onReset();
            }}
          >
            Limpiar filtros
          </button>
          <button type="button" className="text-link" onClick={onShare}>
            Copiar enlace de búsqueda ↗
          </button>
          <button className="button primary" type="submit">
            Buscar propiedades →
          </button>
        </div>
      </form>
    </details>
  );
}

export function PropertiesPage() {
  const [params, setParams] = useSearchParams();
  const values = readFilters(params);
  const favorites = useFavorites();
  const contactUrl = useCompanyContact();
  const facets = useCatalogResource(loadFacets, 'facets');
  const invalid = Object.keys(validateFilters(values)).length > 0;
  const emptyFavorites = values.favorites && !favorites.ids.length;
  const resource = useCatalogResource(
    loadProperties,
    JSON.stringify({ query: propertyQuery(values, favorites.ids), invalid, emptyFavorites }),
  );
  const [share, setShare] = useState('');
  function update(changes) {
    const next = { ...values, ...changes };
    const query = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (
        value !== '' &&
        value !== false &&
        !(key === 'page' && value === 1) &&
        !(key === 'sort' && value === 'recent')
      )
        query.set(key, String(value));
    });
    setParams(query);
    setShare('');
  }
  async function copySearch() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShare('Enlace copiado.');
    } catch {
      setShare(window.location.href);
    }
  }
  return (
    <MotionPage title="Bienes raíces">
      <div className="geo-catalog">
        <section className="page-intro enobra-intro">
          <div className="container enobra-intro-copy">
            <Link className="breadcrumb" to="/">
              Inicio / Bienes raíces
            </Link>
            <h1>
              Encuentra el espacio ideal
              <br />
              para tu próximo capítulo.
            </h1>
            <p>
              Compra, venta y alquiler. Un catálogo independiente para encontrar tu próxima
              propiedad.
            </p>
          </div>
          <ArchOrnament />
        </section>
        <section className="section container">
          <div className="geo-filter-top">
            <div className="geo-tabs" role="group" aria-label="Operación">
              {['', ...operations].map((operation) => (
                <button
                  key={operation}
                  aria-pressed={values.operation === operation}
                  onClick={() => update({ operation, page: 1 })}
                >
                  {operation || 'Todas'}
                </button>
              ))}
            </div>
            <label className="geo-favorites-check">
              <input
                type="checkbox"
                checked={values.favorites}
                onChange={(e) => update({ favorites: e.target.checked, page: 1 })}
              />{' '}
              Solo favoritos <span>{favorites.ids.length}</span>
            </label>
          </div>
          <PropertyFilters
            key={params.toString()}
            values={values}
            zones={facets.data?.zones || []}
            onApply={(draft) => update({ ...draft, page: 1 })}
            onReset={() => {
              setParams({});
              setShare('');
            }}
            onShare={copySearch}
          />
          {facets.status === 'error' && (
            <p className="small muted">
              No pudimos cargar las zonas.{' '}
              <button className="text-link" onClick={facets.retry}>
                Reintentar
              </button>
            </p>
          )}
          <p className="small geo-share" role="status">
            {share || favorites.message}
          </p>
          {invalid ? (
            <div className="geo-status" role="alert">
              <h2>Revisa el rango de precios</h2>
              <p>Corrige los filtros para consultar las propiedades.</p>
            </div>
          ) : (
            <>
              <CatalogStatus resource={resource} />
              {resource.status === 'ready' && (
                <>
                  <p className="geo-result-count" role="status">
                    Mostrando {resource.data.results.length} de {resource.data.count} propiedades
                  </p>
                  {resource.data.results.length ? (
                    <div className="geo-properties-grid">
                      {resource.data.results.map((property) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                          contactUrl={contactUrl(property.title)}
                          favorite={favorites.ids.includes(property.id)}
                          onFavorite={() => favorites.toggle(property.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="geo-status">
                      <h2>
                        {emptyFavorites
                          ? 'Aún no tienes favoritos.'
                          : 'No encontramos coincidencias.'}
                      </h2>
                      <p>
                        {emptyFavorites
                          ? 'Guarda las propiedades que te interesen con el corazón de cada tarjeta.'
                          : 'Prueba otra zona o amplía el rango de precio.'}
                      </p>
                      <button className="button primary" onClick={() => setParams({})}>
                        Mostrar todas las propiedades
                      </button>
                    </div>
                  )}
                  <Pagination data={resource.data} onPage={(page) => update({ page })} />
                </>
              )}
            </>
          )}
          <div className="geo-catalog-end">
            <button className="text-link" onClick={() => setParams({})}>
              Ver todas las propiedades →
            </button>
          </div>
          <div className="geo-cta">
            <div>
              <p className="eyebrow">EL SIGUIENTE PASO EMPIEZA AQUÍ</p>
              <h3>
                ¿Quieres vender o alquilar tu propiedad?
                <br />
                <span>Te asesoramos.</span>
              </h3>
            </div>
            <Link className="button primary" to="/contacto?asunto=Bienes%20ra%C3%ADces">
              Contáctanos →
            </Link>
          </div>
        </section>
      </div>
    </MotionPage>
  );
}
