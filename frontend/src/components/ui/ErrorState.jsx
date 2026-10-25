// <ErrorState error={error} onRetry={reload} action="consultar proyectos" />
import { Link } from 'react-router-dom';
import { routePaths } from '../../app/routePaths.js';
import { describeApiError } from './apiErrors.js';
import { LoadingButton } from './LoadingButton.jsx';

export function ErrorState({ error, onRetry, action }) {
  return <div role="alert" className="space-y-3 rounded-lg border border-[#f1cccc] bg-[#fff4f4] p-5 text-sm text-[#a62b2b]">
    <p>{describeApiError(error, { action })}</p>
    <div className="flex flex-wrap items-center gap-4">
      {Number(error?.status) === 401 && <Link to={routePaths.adminLogin} className="font-semibold underline">Iniciar sesión</Link>}
      {onRetry && <LoadingButton onClick={onRetry} variant="outline">Reintentar</LoadingButton>}
    </div>
  </div>;
}
