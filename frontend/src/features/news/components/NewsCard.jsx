import { ArrowRight, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '../../../app/routePaths.js';
import { newsImageUrl } from '../services/newsMapper.js';

export function NewsCard({ item }) {
  const href = routePaths.newsDetail.replace(':slug', encodeURIComponent(item.id));
  const image = newsImageUrl(item.image);
  const summary = item.description.length > 115
    ? `${item.description.slice(0, 115)}…`
    : item.description;

  return (
    <Link
      to={href}
      className="group block overflow-hidden border border-[#dfe5ec] bg-white text-[#12233f] transition-transform duration-300 hover:-translate-y-1 focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#ff6a1f]"
    >
      {image ? (
        <img className="aspect-[2/1] w-full object-cover" src={image} alt={item.title} loading="lazy" />
      ) : (
        <div className="flex aspect-[2/1] items-center justify-center bg-[#f3f6fa] text-[#626b79]" aria-hidden="true">
          <ImageIcon className="h-9 w-9" strokeWidth={1.5} />
        </div>
      )}
      <div className="p-6 sm:p-8">
        <p className="mb-4 text-xs font-bold tracking-[0.19em] text-[#b94308] uppercase">
          {item.category}{item.demo ? ' · EJEMPLO' : ''}
        </p>
        <h2 className="font-['Outfit',Arial,sans-serif] text-[25px] leading-[1.16] font-semibold tracking-[-0.035em]">
          {item.title}
        </h2>
        <p className="mt-4 leading-[1.8] text-[#626b79]">{summary}</p>
        <span className="mt-5 inline-flex items-center gap-3 text-sm font-bold text-[#b94308]">
          Leer más <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
