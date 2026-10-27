import { validInquiryStatus } from './adminData.js';

export const INBOX_PAGE_SIZE = 12;

// Datos explícitamente ficticios, exclusivos de import.meta.env.DEV.
// Nunca se envían a la API, ni se almacenan en localStorage.
export const demoInquiries = Object.freeze([
  { id: 'demo-contacto-01', kind: 'contacto', status: 'nuevo', name: 'Contacto de referencia 01', email: 'referencia01@example.com', phone: '55550001', subject: 'Diseño', message: 'Quisiera recibir información sobre los servicios de diseño y planificación.', property_id: null, property_title: null, preferred_date: null, created_at: '2026-10-18T09:20:00-06:00', updated_at: '2026-10-18T09:20:00-06:00', updated_by: null },
  { id: 'demo-visita-02', kind: 'visita', status: 'nuevo', name: 'Visita de referencia 02', email: '', phone: '55550002', subject: '', message: 'Solicitud de visita', property_id: 101, property_title: 'Propiedad de demostración A', preferred_date: '2026-11-03', created_at: '2026-10-17T14:15:00-06:00', updated_at: '2026-10-17T14:15:00-06:00', updated_by: null },
  { id: 'demo-contacto-03', kind: 'contacto', status: 'atendido', name: 'Contacto de referencia 03', email: 'referencia03@example.com', phone: '55550003', subject: 'Construcción', message: 'Solicito orientación sobre un proyecto de construcción.', property_id: null, property_title: null, preferred_date: null, created_at: '2026-10-15T11:10:00-06:00', updated_at: '2026-10-16T08:00:00-06:00', updated_by: 'admin-demo' },
  { id: 'demo-contacto-04', kind: 'contacto', status: 'archivado', name: 'Contacto de referencia 04', email: 'referencia04@example.com', phone: '55550004', subject: 'Otro', message: 'Consulta de demostración ya finalizada.', property_id: null, property_title: null, preferred_date: null, created_at: '2026-10-12T10:00:00-06:00', updated_at: '2026-10-14T12:00:00-06:00', updated_by: 'admin-demo' },
  { id: 'demo-visita-05', kind: 'visita', status: 'atendido', name: 'Visita de referencia 05', email: '', phone: '55550005', subject: '', message: 'Solicitud de visita', property_id: 102, property_title: 'Propiedad de demostración B', preferred_date: '2026-11-05', created_at: '2026-10-16T16:00:00-06:00', updated_at: '2026-10-17T10:00:00-06:00', updated_by: 'admin-demo' },
  { id: 'demo-contacto-06', kind: 'contacto', status: 'nuevo', name: 'Contacto de referencia 06', email: 'referencia06@example.com', phone: '55550006', subject: 'Bienes raíces', message: 'Me gustaría saber qué opciones están disponibles.', property_id: null, property_title: null, preferred_date: null, created_at: '2026-10-19T08:45:00-06:00', updated_at: '2026-10-19T08:45:00-06:00', updated_by: null },
]);

export function normalizeInquiry(item) {
  if (!item || typeof item !== 'object' || item.id == null || !String(item.id) ||
      typeof item.name !== 'string' || !item.name.trim() ||
      !['contacto', 'visita'].includes(item.kind) || !validInquiryStatus(item.status)) {
    throw new TypeError('La solicitud no cumple el contrato de Django.');
  }
  const nullableText = (value) => value == null ? '' : String(value);
  return {
    id: String(item.id), kind: item.kind, status: item.status, name: item.name,
    email: nullableText(item.email), phone: nullableText(item.phone),
    subject: nullableText(item.subject), message: nullableText(item.message),
    property_id: item.property_id ?? null, property_title: nullableText(item.property_title),
    preferred_date: nullableText(item.preferred_date),
    created_at: nullableText(item.created_at), updated_at: nullableText(item.updated_at),
    updated_by: nullableText(item.updated_by),
  };
}

export function nextInquiryStatus(status) {
  if (status === 'nuevo') return 'atendido';
  if (status === 'atendido') return 'archivado';
  return null;
}

export function advancePreviewInquiry(items, id) {
  const current = items.find((item) => item.id === id);
  const next = current && nextInquiryStatus(current.status);
  if (!next) throw new TypeError('La solicitud no permite avanzar al siguiente estado.');
  return items.map((item) => item.id === id ? { ...item, status: next, updated_by: 'admin-demo' } : item);
}

function fold(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

export function filterInquiries(items, { kind = '', status = '', query = '' } = {}) {
  const term = fold(query.trim());
  return items.filter((item) => {
    if (kind && item.kind !== kind) return false;
    if (status && item.status !== status) return false;
    if (!term) return true;
    return fold([item.name, item.email, item.phone, item.subject, item.message, item.property_title].join(' ')).includes(term);
  });
}

export function paginateInquiries(items, page, pageSize = INBOX_PAGE_SIZE) {
  const safePage = Math.max(1, Number.isInteger(page) ? page : 1);
  return items.slice((safePage - 1) * pageSize, safePage * pageSize);
}

export function formatInquiryDate(value, dateOnly = false) {
  if (!value) return 'Sin registrar';
  const date = dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no válida';
  return new Intl.DateTimeFormat('es-GT', dateOnly ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
