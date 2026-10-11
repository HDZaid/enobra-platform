import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { NewsCard } from '../components/NewsCard.jsx';
import { loadNewsPage } from '../services/publicNewsSource.js';
import '../styles/news-fonts.css';

const PAGE_SIZE = 12;
const container = 'mx-auto w-[calc(100%-40px)] max-w-[1240px] md:w-[calc(100%-64px)] xl:w-[calc(100%-96px)]';

export function NewsPage() {
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get('page'));
  const currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [state, setState] = useState({ page: null, items: [], count: 0, preview: false, error: '' });

  useEffect(() => {
    document.title = 'Noticias y eventos | EnObra';
    const controller = new AbortController();
    loadNewsPage({ page: currentPage, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ ...data, error: '' });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ page: currentPage, items: [], count: 0, preview: false,
            error: 'No se pudieron consultar las noticias. Intenta nuevamente.' });
        }
      });
    return () => controller.abort();
  }, [currentPage]);

  const loading = state.page !== currentPage;
  const pages = Math.max(1, Math.ceil(state.count / PAGE_SIZE));
  const changePage = (page) => setParams(page === 1 ? {} : { page: String(page) });

  return (
    <main id="main" className="min-h-[70vh] bg-white font-['Inter',Arial,sans-serif] text-[#12233f]">
      <section className="relative overflow-hidden border-b border-[#dfe5ec] bg-[#f6f5f2] py-12 md:py-[70px] lg:pb-[88px]">
        <div className={`${container} relative z-10`}>
          <Link to="/" className="text-[13px] text-[#626b79] hover:text-[#b94308] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff6a1f]">
            Inicio / NOTICIAS Y EVENTOS
          </Link>
          <p className="mt-7 mb-[18px] text-xs font-bold tracking-[0.19em] text-[#b94308]">NOTICIAS Y EVENTOS</p>
          <h1 className="max-w-[950px] font-['Outfit',Arial,sans-serif] text-[clamp(37px,7vw,70px)] leading-[1.01] font-bold tracking-[-0.052em]">
            Un espacio para<br />las novedades.
          </h1>
          <p className="mt-[22px] max-w-[650px] leading-[1.8] text-[#626b79]">
            Anuncios, nuevos proyectos y eventos comerciales.
          </p>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -top-1/3 -right-[10%] h-[170%] w-1/2 -skew-x-12 border-l border-[#12233f]/10" />
      </section>

      <section className={`${container} py-15 md:py-18 lg:py-24`} aria-label="Publicaciones">
        {state.preview && !loading && (
          <p role="status" className="mb-6 text-[13px] leading-relaxed text-[#626b79]">
            Publicaciones demostrativas. Los anuncios reales se incorporarán al recibir la información del cliente.
          </p>
        )}
        {loading ? (
          <p role="status" aria-live="polite" className="text-[#626b79]">Cargando noticias…</p>
        ) : state.error ? (
          <p role="alert" className="text-[#a22a20]">{state.error}</p>
        ) : state.items.length === 0 ? (
          <p className="text-[#626b79]">No hay publicaciones por el momento.</p>
        ) : (
          <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-2">
            {state.items.map((entry) => <NewsCard key={entry.id} item={entry} />)}
          </div>
        )}
        {!loading && !state.error && pages > 1 && (
          <nav className="mt-9 flex flex-wrap items-center justify-center gap-4" aria-label="Paginación de noticias">
            <button type="button" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}
              className="inline-flex cursor-pointer items-center gap-2 border border-[#dfe5ec] px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#ff6a1f]">
              <ChevronLeft size={16} aria-hidden="true" /> Anterior
            </button>
            <span className="text-sm text-[#626b79]">Página {currentPage} de {pages}</span>
            <button type="button" disabled={currentPage >= pages} onClick={() => changePage(currentPage + 1)}
              className="inline-flex cursor-pointer items-center gap-2 border border-[#dfe5ec] px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#ff6a1f]">
              Siguiente <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
