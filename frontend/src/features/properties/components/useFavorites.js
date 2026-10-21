import { useState } from 'react';

const storageKey = 'enobra-favorites';
export function useFavorites() {
  const [ids, setIds] = useState(() => {
    try {
      const values = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(values)
        ? [...new Set(values.filter((id) => Number.isSafeInteger(id) && id > 0))]
        : [];
    } catch {
      return [];
    }
  });
  const [message, setMessage] = useState('');
  function toggle(id) {
    const next = ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
    setIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setMessage('Favoritos actualizados.');
    } catch {
      setMessage('Favoritos actualizados solo durante esta sesión.');
    }
  }
  return { ids, toggle, message };
}
