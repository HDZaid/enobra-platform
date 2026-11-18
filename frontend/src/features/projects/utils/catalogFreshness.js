// Qué tan confirmados están los datos que muestra un catálogo (ver useCatalogResource):
//   'fresh'       respuesta actual de la API.
//   'confirming'  datos guardados (caché o copia estática) mientras responde la API.
//   'unconfirmed' la API falló y se conservaron los datos guardados.
export function catalogFreshness(resource) {
  if (resource?.status !== 'ready' || !resource.stale) return 'fresh';
  return resource.refreshError ? 'unconfirmed' : 'confirming';
}

export const freshnessMessages = {
  confirming: 'Confirmando disponibilidad con el servidor…',
  unconfirmed:
    'No pudimos confirmar la disponibilidad. Mostramos la última información guardada.',
};
