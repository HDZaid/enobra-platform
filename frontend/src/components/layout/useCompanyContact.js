import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { catalogWhatsAppLink } from '../../services/whatsapp.js';

export function useCompanyContact(kind, item) {
  const { company, setCatalogContact } = useOutletContext();
  const origin = window.location.origin;

  useEffect(() => {
    if (!item) return;
    setCatalogContact({ kind, item });
    return () => setCatalogContact(null);
  }, [kind, item, setCatalogContact]);

  return (entry) => catalogWhatsAppLink(company.whatsapp, kind, entry, origin);
}
