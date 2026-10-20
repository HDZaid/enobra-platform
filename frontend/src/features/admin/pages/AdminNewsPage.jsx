import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Newspaper, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { newsService } from '../../news/services/newsService.js';
import { normalizeNews } from '../../news/services/newsMapper.js';
import { NewsImage } from '../../news/components/NewsImage.jsx';
import { AdminNewsEditor } from '../components/AdminNewsEditor.jsx';
import { readAdminCollection } from '../utils/adminData.js';
import { adminNewsImageSrc, newsCategories, removePreviewNews, upsertPreviewNews } from '../utils/newsEditor.js';

const PAGE_SIZE = 12;
const messageForError = (error, action) => error?.status === 501
  ? `Django todavía no tiene disponible la operación para ${action}.`
  : error?.status === 401 || error?.status === 403
    ? 'La sesión no tiene permisos para administrar noticias.'
    : `No se pudo ${action}. Intenta de nuevo cuando el backend esté disponible.`;

export function AdminNewsPage() {
  const { session, preview, previewNews, setPreviewNews } = useOutletContext();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [state, setState] = useState({ items: [], count: 0, loading: true, error: '' });
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Administrar noticias | EnObra';
    if (preview) return undefined;
    let active = true;
    async function load() {
      try {
        const params = { page, page_size: PAGE_SIZE };
        if (category) params.category = category;
        const response = await newsService.list(params, { token: session.access });
        const data = readAdminCollection(response);
        if (active) setState({ ...data, loading: false, error: '' });
      } catch (error) {
        if (active) setState({ items: [], count: 0, loading: false, error: messageForError(error, 'consultar noticias') });
      }
    }
    void load();
    return () => { active = false; };
  }, [page, category, refreshIndex, session, preview]);

  const allItems = preview ? previewNews : state.items.map(normalizeNews);
  const items = useMemo(() => allItems.filter((item) => {
    if (preview && category && item.category !== category) return false;
    const term = search.trim().toLocaleLowerCase('es');
    return !term || `${item.title} ${item.category} ${item.description}`.toLocaleLowerCase('es').includes(term);
  }), [allItems, category, search, preview]);
  const count = preview ? items.length : state.count;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const visibleItems = preview ? items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : items;
  const loading = !preview && state.loading;

  function reload() {
    setState((previous) => ({ ...previous, loading: true }));
    setRefreshIndex((current) => current + 1);
  }

  async function saveRemote(item, payload) {
    if (preview) return;
    if (item) await newsService.update(item.id, payload, session.access);
    else await newsService.create(payload, session.access);
    setEditing(undefined);
    setNotice(item ? 'Noticia actualizada en Django.' : 'Noticia creada en Django.');
    if (page !== 1) setPage(1);
    else reload();
  }

  function savePreview(item) {
    if (!preview) return;
    setPreviewNews((current) => upsertPreviewNews(current, item));
    setEditing(undefined);
    setNotice('Cambio aplicado solo en la vista previa. Se perderá al recargar la página.');
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleting || deletingBusy) return;
    setDeletingBusy(true);
    setNotice('');
    try {
      if (preview) {
        setPreviewNews((current) => removePreviewNews(current, deleting.id));
        setNotice('Noticia quitada de la vista previa. No se ha eliminado nada del servidor.');
        setPage(1);
      } else {
        await newsService.remove(deleting.id, session.access);
        setNotice('Noticia eliminada en Django.');
        if (page > 1 && state.items.length === 1) setPage((current) => current - 1);
        else reload();
      }
      setDeleting(null);
    } catch (error) {
      setNotice(messageForError(error, 'eliminar la noticia'));
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-[#626b79]">Contenido del sitio</p><h2 className="mt-1 font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">Noticias y eventos</h2><p className="mt-2 max-w-[640px] text-sm text-[#626b79]">Crea, edita y organiza publicaciones. Las imágenes se conectan mediante el servicio de Django, sin acoplar React al Storage.</p></div>
        <button type="button" onClick={() => { setEditing(null); setNotice(''); }} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b94308]"><Plus size={18}/> Añadir noticia</button>
      </div>
      {preview && <p role="status" className="mt-5 rounded-lg border border-[#f4cfae] bg-[#fff1e5] p-4 text-sm text-[#88420d]">Modo de prueba: puedes crear, editar y eliminar noticias ficticias en memoria. No se publicarán en el sitio y los cambios desaparecerán al recargar.</p>}
      {notice && <p role="status" className="mt-5 rounded-lg border border-[#dfe5ec] bg-white p-4 text-sm">{notice}</p>}
      <div className="mt-6 rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5ec] px-5 py-4"><div className="flex items-center gap-2"><Newspaper size={20} className="text-[#304e7d]"/><h3 className="font-semibold">Publicaciones ({loading ? '…' : count})</h3></div><div className="flex flex-wrap items-center gap-2"><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#626b79]"/><span className="sr-only">Buscar noticias</span><input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar noticia" className="w-44 rounded-lg border border-[#dfe5ec] py-2 pl-9 pr-3 text-xs sm:w-56"/></label><label><span className="sr-only">Filtrar por categoría</span><select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); if (!preview) setState((s) => ({ ...s, loading: true })); }} className="rounded-lg border border-[#dfe5ec] bg-white px-3 py-2 text-xs"><option value="">Todas las categorías</option>{newsCategories.map((value) => <option key={value}>{value}</option>)}</select></label></div></div>
        {loading ? <p role="status" className="p-6 text-sm text-[#626b79]">Cargando noticias…</p>
          : !preview && state.error ? <p role="alert" className="p-6 text-sm text-[#9c2929]">{state.error}</p>
            : visibleItems.length === 0 ? <p className="p-6 text-sm text-[#626b79]">No hay noticias que coincidan con la búsqueda.</p>
              : <div className="overflow-x-auto"><table className="min-w-[710px] w-full text-left text-sm"><thead className="bg-[#f3f6fa] text-[11px] tracking-wide text-[#626b79] uppercase"><tr><th scope="col" className="px-5 py-4">Publicación</th><th scope="col" className="px-5 py-4">Categoría</th><th scope="col" className="px-5 py-4">Fecha</th><th scope="col" className="px-5 py-4">Estado</th><th scope="col" className="px-5 py-4">Acciones</th></tr></thead><tbody>{visibleItems.map((item) => {
                const src = adminNewsImageSrc(item.image, preview);
                return <tr key={item.id} className="border-t border-[#dfe5ec]"><td className="px-5 py-4"><div className="flex items-center gap-3"><NewsImage key={src || item.id} src={src} alt={item.title} className="size-16 shrink-0 rounded-lg [&_[role=img]]:!min-h-0"/><span className="max-w-[240px] font-semibold">{item.title}</span></div></td><td className="px-5 py-4">{item.category}</td><td className="px-5 py-4">{item.date}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.demo ? 'bg-[#fff1e5] text-[#88420d]' : item.published ? 'bg-[#e6f4ec] text-[#1f7a4d]' : 'bg-[#f3f6fa] text-[#626b79]'}`}>{item.demo ? 'Ejemplo' : item.published ? 'Publicado' : 'Borrador'}</span></td><td className="px-5 py-4"><div className="flex gap-2"><button type="button" aria-label={`Editar ${item.title}`} title="Editar" onClick={() => { setEditing(item); setNotice(''); }} className="rounded-md border border-[#dfe5ec] p-2 text-[#304e7d] hover:bg-[#f3f6fa]"><Pencil size={16}/></button><button type="button" aria-label={`Eliminar ${item.title}`} title="Eliminar" onClick={() => { setDeleting(item); setNotice(''); }} className="rounded-md border border-[#dfe5ec] p-2 text-[#a62b2b] hover:bg-[#fdeaea]"><Trash2 size={16}/></button></div></td></tr>;
              })}</tbody></table></div>}
      </div>
      {!loading && !state.error && totalPages > 1 && <nav aria-label="Paginación" className="mt-5 flex items-center justify-end gap-3"><button type="button" disabled={page <= 1} onClick={() => { if (!preview) setState((s) => ({ ...s, loading: true })); setPage((p) => p - 1); }} className="rounded-lg border border-[#dfe5ec] p-2 disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={18}/></button><span className="text-sm">{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => { if (!preview) setState((s) => ({ ...s, loading: true })); setPage((p) => p + 1); }} className="rounded-lg border border-[#dfe5ec] p-2 disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={18}/></button></nav>}
      {editing !== undefined && <AdminNewsEditor key={editing?.id || 'new'} item={editing} preview={preview} token={session?.access} onClose={() => setEditing(undefined)} onSaved={savePreview} onSaveRemote={saveRemote}/>}
      {deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09172b]/70 px-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-news-title" className="w-full max-w-[430px] rounded-2xl bg-white p-6 shadow-xl"><h3 id="delete-news-title" className="text-xl font-semibold">¿Eliminar noticia?</h3><p className="mt-3 text-sm text-[#626b79]">«{deleting.title}» {preview ? 'se quitará únicamente de esta vista previa.' : 'se eliminará del sitio si Django confirma la operación.'}</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={deletingBusy} onClick={() => setDeleting(null)} className="rounded-lg border border-[#dfe5ec] px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={deletingBusy} onClick={() => { void confirmDelete(); }} className="rounded-lg bg-[#b64242] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{deletingBusy ? 'Eliminando…' : 'Sí, eliminar'}</button></div></section></div>}
    </section>
  );
}
