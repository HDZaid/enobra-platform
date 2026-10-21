export function ServiceIndex({ services }) {
  if (services.length === 0) return null;

  return (
    <nav className="service-index-nav" aria-label="Índice de servicios">
      <div className="container">
        {services.map((service, index) => (
          <a key={service.id} href={`#${encodeURIComponent(service.id)}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {service.id === 'administracion' ? 'Administración' : service.title}
          </a>
        ))}
      </div>
    </nav>
  );
}
