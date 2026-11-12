export function catalogItemPath(kind, id) {
  const section = kind === 'projects' ? 'proyectos' : 'bienes-raices';
  return `/${section}/${encodeURIComponent(id)}`;
}
