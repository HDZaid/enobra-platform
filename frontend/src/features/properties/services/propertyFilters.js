export const operations = ['Venta', 'Alquiler'];
export const propertyTypes = ['Casa', 'Apartamento', 'Terreno', 'Local'];
export const sorts = ['recent', 'price_asc', 'price_desc'];

export function readFilters(params) {
  const read = (key) => params.get(key) || '';
  return {
    operation: operations.includes(read('operation')) ? read('operation') : '',
    type: propertyTypes.includes(read('type')) ? read('type') : '',
    zone: read('zone'),
    q: read('q'),
    min_price: read('min_price'),
    max_price: read('max_price'),
    sort: sorts.includes(read('sort')) ? read('sort') : 'recent',
    page: /^\d+$/.test(read('page')) && Number(read('page')) > 0 ? Number(read('page')) : 1,
    favorites: read('favorites') === 'true',
  };
}

export function validateFilters(values) {
  const errors = {};
  for (const field of ['min_price', 'max_price']) {
    if (
      values[field] !== '' &&
      (!/^\d+$/.test(String(values[field])) || !Number.isSafeInteger(Number(values[field])))
    )
      errors[field] = 'Ingresa un precio entero mayor o igual a cero.';
  }
  if (
    !Object.keys(errors).length &&
    values.min_price !== '' &&
    values.max_price !== '' &&
    Number(values.min_price) > Number(values.max_price)
  )
    errors.max_price = 'El precio máximo debe ser mayor o igual al mínimo.';
  return errors;
}

export function propertyQuery(values, favorites = []) {
  const result = {};
  for (const key of ['operation', 'type', 'zone', 'q', 'min_price', 'max_price', 'sort', 'page']) {
    if (values[key] !== '' && values[key] !== undefined) result[key] = values[key];
  }
  if (values.favorites) result.ids = favorites.join(',');
  return result;
}
