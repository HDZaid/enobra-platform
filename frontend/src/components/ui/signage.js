import { useLocation } from 'react-router-dom';
import { routePaths } from '../../app/routePaths.js';

// Bienes raíces keeps its original states; the drawn signage applies elsewhere.
export function useSignage() {
  const { pathname } = useLocation();
  return !pathname.startsWith(routePaths.properties);
}
