import { Link } from 'react-router-dom';
import { MotionPage } from '../../../components/ui/MotionPage.jsx';
import { StatusDrawing } from '../../../components/ui/ColonialOrnaments.jsx';
import { routePaths } from '../../../app/routePaths.js';

export function NotFoundPage() {
  return (
    <MotionPage title="Página no encontrada">
      <section className="page-intro enobra-intro not-found">
        <div className="container enobra-intro-copy">
          <StatusDrawing variant="notfound" className="not-found-drawing" />
          <h1>No encontramos esta página.</h1>
          <p>El enlace está roto o la página cambió de lugar. Revisa la dirección o sigue desde aquí.</p>
          <div className="not-found-actions">
            <Link className="button primary" to={routePaths.home}>
              Ir al inicio
            </Link>
            <Link className="text-link" to={routePaths.contact}>
              Escríbenos
            </Link>
          </div>
        </div>
      </section>
    </MotionPage>
  );
}
