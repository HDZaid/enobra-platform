import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchReference } from './data/searchReference.js';
import { reference } from '../../features/services/data/reference.js';
import { servicesService } from '../../features/services/services/servicesService.js';
import { useReferenceResource } from '../ui/useReferenceResource.js';
import './SearchDialog.css';

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function SearchDialog({ onClose }) {
  const dialog = useRef(null);
  const [query, setQuery] = useState('');
  const services = useReferenceResource(servicesService.list, reference);
  useEffect(() => {
    const previous = document.activeElement;
    const node = dialog.current;
    node.showModal();
    node.querySelector('input')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const groups = [
    ['Servicios', services.data, (item) => `/servicios#${encodeURIComponent(item.id)}`],
    ['Proyectos', searchReference.projects, (item) => `/proyectos/${encodeURIComponent(item.id)}`],
    ['Propiedades', searchReference.properties, (item) => `/bienes-raices/${item.id}`],
    ['Noticias', searchReference.news, (item) => `/noticias/${encodeURIComponent(item.id)}`],
  ].map(([title, items, url]) => ({
    title,
    url,
    items: items.filter((item) =>
      normalize(`${item.title} ${item.type || ''} ${item.zone || ''} ${item.short || ''}`).includes(
        normalize(query),
      ),
    ),
  }));
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  return (
    <dialog
      ref={dialog}
      id="modal"
      className="search-dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== dialog.current) return;
        const rect = dialog.current.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <button className="icon-button modal-close" aria-label="Cerrar ventana" onClick={onClose}>
        ×
      </button>
      <div className="modal-body">
        <p className="eyebrow">EXPLORA ENOBRA</p>
        <h2 id="modal-title">¿Qué estás buscando?</h2>
        <p className="search-intro">Encuentra el espacio o la solución para tu próximo proyecto.</p>
        <label>
          Buscar
          <input
            type="search"
            placeholder="Proyectos, propiedades, servicios…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="search-count" role="status">{count ? `${count} ${count === 1 ? 'resultado' : 'resultados'}` : 'Sin coincidencias. Prueba con otra palabra.'}</p>

        <p className="small muted">Proyectos, propiedades y noticias de referencia.</p>
        <div className="search-results">
          {groups
            .filter((group) => group.items.length)
            .map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>
                {group.items.map((item) => (
                  <Link
                    className="search-result"
                    key={item.id}
                    to={group.url(item)}
                    onClick={onClose}
                  >
                    <span>{item.title}</span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </section>
            ))}
        </div>
      </div>
    </dialog>
  );
}
