import { useEffect, useState } from 'react';
import { Mail, MessageSquareText } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { inquiriesService } from '../services/inquiriesService.js';
import { inquiryStatuses, readAdminCollection, validInquiryStatus } from '../utils/adminData.js';

export function AdminInboxPage() {
  const { session, preview } = useOutletContext();
  const [data, setData] = useState({ items: [], loading: true, error: '' });
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Solicitudes recibidas | EnObra';
    if (preview) return;
    let active = true;
    async function load() {
      try {
        const response = await inquiriesService.list({ page: 1, page_size: 100 }, session.access);
        if (active) setData({ items: readAdminCollection(response).items, loading: false, error: '' });
      } catch (error) {
        if (active) setData({ items: [], loading: false, error: error?.status === 501
          ? 'La bandeja de solicitudes aún no tiene persistencia configurada en Django.'
          : error?.status === 401 || error?.status === 403 ? 'No tienes permisos para consultar los mensajes.'
            : 'No se pudieron consultar los mensajes.' });
      }
    }
    void load();
    return () => { active = false; };
  }, [session, preview]);

  async function changeStatus(id, status) {
    if (preview || savingId || !validInquiryStatus(status)) return;
    setSavingId(id);
    setNotice('');
    try {
      const updated = await inquiriesService.updateStatus(id, status, session.access);
      setData((previous) => ({ ...previous, items: previous.items.map((item) => item.id === id ? updated : item) }));
      setNotice('Estado actualizado correctamente.');
    } catch (error) {
      setNotice(error?.status === 501 ? 'La actualización aún no está implementada en el backend.' : 'No se pudo actualizar el estado. Intenta otra vez.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <p className="text-sm text-[#626b79]">Comunicación</p>
      <h2 className="mt-1 font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">Solicitudes recibidas</h2>
      <p className="mt-2 text-sm text-[#626b79]">Consultas enviadas desde Contacto y solicitudes de visitas a propiedades.</p>
      {notice && <p role="status" className="mt-5 rounded-lg border border-[#dfe5ec] bg-white p-3 text-sm">{notice}</p>}
      {preview ? <div className="mt-7 rounded-xl bg-white px-6 py-12 text-center shadow-sm"><Mail size={35} className="mx-auto mb-4 text-[#626b79]"/><p className="font-semibold">Bandeja de demostración</p><p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-[#626b79]">Los mensajes se mostrarán aquí después de iniciar sesión con Django y conectar el almacenamiento. Esta vista previa no contiene solicitudes reales.</p></div>
        : data.loading ? <p role="status" className="mt-6 text-sm text-[#626b79]">Cargando solicitudes…</p>
          : data.error ? <p role="alert" className="mt-6 rounded-lg bg-[#fdeaea] p-4 text-sm text-[#9c2929]">{data.error}</p>
            : data.items.length === 0 ? <p className="mt-6 rounded-xl bg-white p-8 text-sm text-[#626b79]">No hay solicitudes registradas.</p>
              : <div className="mt-7 space-y-4">{data.items.map((item) => <article key={item.id} className="rounded-xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start gap-3"><span className="rounded-full bg-[#f3f6fa] p-3 text-[#304e7d]"><MessageSquareText size={19}/></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{item.name}</h3><p className="text-xs text-[#626b79]">{item.kind === 'visita' ? 'Solicitud de visita' : 'Contacto'} · {item.created_at ? new Date(item.created_at).toLocaleDateString('es-GT') : 'Fecha sin registrar'}</p></div><label className="text-xs text-[#626b79]">Estado <select value={item.status} disabled={savingId === item.id} onChange={(e) => { void changeStatus(item.id, e.target.value); }} className="ml-2 rounded-md border border-[#dfe5ec] bg-white px-3 py-2 text-sm text-[#12233f]">{Object.entries(inquiryStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><p className="mt-4 whitespace-pre-line rounded-lg bg-[#f3f6fa] p-4 text-sm leading-relaxed">{item.message || item.property_title || 'Solicitud sin mensaje adicional.'}</p><div className="mt-4 flex flex-wrap gap-4 text-xs text-[#626b79]">{item.subject && <span>Asunto: {item.subject}</span>}{item.email && <a className="text-[#b94308] hover:underline" href={`mailto:${item.email}`}>{item.email}</a>}{item.phone && <span>Teléfono: {item.phone}</span>}</div></article>)}</div>}
    </section>
  );
}
