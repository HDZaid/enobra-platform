import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { loadNewsDetail } from '../services/publicNewsSource.js';
import { newsImageUrl } from '../services/newsMapper.js';
import { StatusDrawing } from '../../../components/ui/ColonialOrnaments.jsx';
import { NewsImage } from '../components/NewsImage.jsx';
import { formatNewsDate } from '../utils/newsDate.js';
import '../styles/news-fonts.css';

export function NewsDetailPage() {
  const { slug } = useParams();
  const [retryIndex, setRetryIndex] = useState(0);
  const [state, setState] = useState({ slug: null, item: null, preview: false, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    document.title = 'Noticia | EnObra';
    loadNewsDetail(slug, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ slug, ...data, error: '' });
        if (data.item) document.title = `${data.item.title} | EnObra`;
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ slug, item: null, preview: false,
          error: error?.status === 404 ? '' : 'No se pudo consultar esta publicación.' });
      });
    return () => controller.abort();
  }, [slug, retryIndex]);

  const loading = state.slug !== slug;
  const image = state.item ? newsImageUrl(state.item.image) : '';

  return (
    <div className="min-h-[70vh] bg-white font-['Inter',Arial,sans-serif] text-[#12233f]">
      <article className="mx-auto w-[calc(100%-40px)] max-w-[1240px] py-15 md:w-[calc(100%-64px)] md:py-[70px] xl:w-[calc(100%-96px)] xl:py-24">
        <Link to="/noticias" className="mb-10 inline-flex items-center gap-2 text-[13px] text-[#626b79] hover:text-[#b94308] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff6a1f]">
          <ArrowLeft size={17} aria-hidden="true" /> Noticias y eventos
        </Link>
        {loading ? (
          <p role="status" aria-live="polite">Cargando publicación…</p>
        ) : state.error ? (
          <div role="alert" className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border border-[#f0b8b8] bg-[#fff7f7] p-5 text-sm text-[#a22a20]"><StatusDrawing variant="error" className="text-[#12233f]" /><div><p>{state.error}</p><button type="button" onClick={() => { setState((current) => ({ ...current, slug: null })); setRetryIndex((current) => current + 1); }} className="mt-3 border border-[#a22a20] px-4 py-2 font-semibold">Volver a intentar</button></div></div>
        ) : !state.item ? (
          <>
            <StatusDrawing variant="notfound" className="mb-6 text-[#12233f]" />
            <h1 className="font-['Montserrat',Arial,sans-serif] text-4xl font-bold">Publicación no encontrada</h1>
            <Link to="/noticias" className="mt-6 inline-flex items-center gap-2 font-bold text-[#b94308]">
              Ver noticias <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            {state.preview && (
              <p role="status" className="mb-5 text-[13px] text-[#626b79]">Publicación de demostración. El contenido real está pendiente.</p>
            )}
            <p className="mb-4 text-xs font-bold tracking-[0.19em] text-[#b94308] uppercase">
              {state.item.category} · {formatNewsDate(state.item.date)}{state.item.demo ? ' · REFERENCIA' : ''}
            </p>
            <h1 className="max-w-[950px] font-['Montserrat',Arial,sans-serif] text-[clamp(36px,5vw,64px)] leading-[1.1] font-bold tracking-[-0.02em]">
              {state.item.title}
            </h1>
            <NewsImage
              key={image || state.item.id}
              src={image}
              alt={state.item.title}
              className="my-9 aspect-[2/1] max-h-[550px] w-full"
            />
            <p className="max-w-[850px] leading-[1.9] whitespace-pre-line text-[#626b79]">{state.item.description}</p>
          </>
        )}
      </article>
    </div>
  );
}
