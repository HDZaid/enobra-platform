export function PendingPage({ title, owner }) {
  return (
    <main className="setup-page">
      <p className="setup-page__eyebrow">EnObra · Configuración inicial</p>
      <h1>{title}</h1>
      <p>Ruta preparada. La interfaz definitiva se migrará desde el mockup autorizado.</p>
      {owner ? <p className="setup-page__meta">Módulo asignado a: {owner}</p> : null}
    </main>
  );
}
