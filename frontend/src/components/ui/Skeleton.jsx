// <Skeleton className="h-4 w-32" />; <TableSkeleton rows={6} columns={4} />
// <CardSkeleton count={3} />; <FormSkeleton fields={6} />
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-[#dfe5ec] motion-reduce:animate-none ${className}`} />;
}

export function TableSkeleton({ rows = 6, columns = 4 }) {
  return <div role="status" aria-busy="true" className="overflow-x-auto">
    <span className="sr-only">Cargando tabla…</span>
    <table aria-hidden="true" className="w-full"><tbody>
      {Array.from({ length: rows }, (_, row) => <tr key={row} className="border-b border-[#dfe5ec]">
        {Array.from({ length: columns }, (_, column) => <td key={column} className="p-4"><Skeleton className="h-4 w-full min-w-16" /></td>)}
      </tr>)}
    </tbody></table>
  </div>;
}

export function CardSkeleton({ count = 3 }) {
  return <div role="status" aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <span className="sr-only">Cargando tarjetas…</span>
    {Array.from({ length: count }, (_, index) => <div key={index} aria-hidden="true" className="space-y-4 rounded-xl border border-[#dfe5ec] p-4">
      <Skeleton className="aspect-video w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" />
    </div>)}
  </div>;
}

export function FormSkeleton({ fields = 6 }) {
  return <div role="status" aria-busy="true" className="space-y-5">
    <span className="sr-only">Cargando formulario…</span>
    {Array.from({ length: fields }, (_, index) => <div key={index} aria-hidden="true" className="space-y-2">
      <Skeleton className="h-4 w-32" /><Skeleton className="h-11 w-full" />
    </div>)}
  </div>;
}
