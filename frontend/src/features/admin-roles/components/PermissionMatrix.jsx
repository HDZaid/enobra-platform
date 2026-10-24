import { groupPermissions, setPermissionGroup } from '../utils/roles.js';

export function PermissionMatrix({ catalog, selected, disabled, onChange, error }) {
  const selectedNames = new Set(selected);
  return <section aria-labelledby="permission-matrix-title" aria-describedby={error ? 'role-permissions-error' : undefined}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 id="permission-matrix-title" className="text-lg font-semibold">Permisos del rol</h3>
      <p className="text-sm text-[#626b79]">{selectedNames.size} seleccionados</p>
    </div>
    <p className="mt-2 text-sm text-[#626b79]">Elige las acciones que este rol puede realizar en cada módulo.</p>
    {error && <p id="role-permissions-error" role="alert" className="mt-3 text-sm text-[#a62b2b]">{error}</p>}
    {catalog.length === 0 && <p className="mt-4 rounded-lg bg-[#f3f6fa] p-4 text-sm">No hay permisos disponibles en el catálogo.</p>}
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      {groupPermissions(catalog).map((group) => <fieldset key={group.key} disabled={disabled} className="min-w-0 rounded-xl border border-[#dfe5ec] bg-white p-4 disabled:opacity-75">
        <legend className="px-2 text-sm font-semibold text-[#304e7d]">{group.label}</legend>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[#626b79]">{group.items.filter((item) => selectedNames.has(item.name)).length} de {group.items.length}</span>
          <div className="flex gap-3"><button type="button" onClick={() => onChange(setPermissionGroup(selected, group, true))} className="font-semibold text-[#304e7d] underline disabled:cursor-not-allowed">Seleccionar grupo</button>
            <button type="button" onClick={() => onChange(setPermissionGroup(selected, group, false))} className="text-[#626b79] underline disabled:cursor-not-allowed">Limpiar grupo</button></div>
        </div>
        {group.key === 'admin' && <p className="mb-3 rounded-lg border border-[#f4cfae] bg-[#fff1e5] p-3 text-xs leading-relaxed text-[#88420d]">Acceso total permite realizar todas las acciones administrativas. Asígnalo únicamente a quien deba administrar toda la plataforma.</p>}
        <div className="space-y-1">{group.items.map((item) => <label key={item.name} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-[#f3f6fa]">
          <input type="checkbox" checked={selectedNames.has(item.name)} onChange={(event) => onChange(setPermissionGroup(selected, { items: [item] }, event.target.checked))}
            className="mt-1 size-4 shrink-0 accent-[#304e7d]"/>
          <span className="min-w-0"><span className="block break-words text-sm font-medium">{item.description || item.name}</span>
            {item.description && <span className="mt-1 block break-all font-mono text-[11px] text-[#626b79]">{item.name}</span>}</span>
        </label>)}</div>
      </fieldset>)}
    </div>
  </section>;
}
