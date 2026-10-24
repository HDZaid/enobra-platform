export function AdminPlaceholderPage({ owner }) {
  return (
    <section className="rounded-2xl bg-white p-8 shadow-sm" aria-labelledby="placeholder-title">
      <h2 id="placeholder-title" className="text-xl font-semibold">En construcción</h2>
      <p className="mt-3 text-sm text-[#626b79]">Responsable: {owner}. Esta pantalla todavía no permite realizar operaciones.</p>
    </section>
  );
}
