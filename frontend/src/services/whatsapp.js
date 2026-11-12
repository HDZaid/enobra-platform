import { catalogItemPath } from './catalogItemPath.js';

const generalMessage = 'Hola, quisiera información sobre los servicios de EnObra.';

export function whatsappLink(phone, message = generalMessage) {
  const digits = phone?.replace(/\D/g, '') || '';
  if (!/^\d{8,15}$/.test(digits)) return undefined;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function catalogWhatsAppLink(phone, kind, item, origin) {
  if (!item) return undefined;
  const subject = kind === 'projects' ? 'el proyecto' : 'la propiedad';
  const url = new URL(catalogItemPath(kind, item.id), origin);
  return whatsappLink(
    phone,
    `Hola, me interesa ${subject} “${item.title}”. ¿Podría darme más información?\n\n${url.href}`,
  );
}
