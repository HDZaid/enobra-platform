import { companyService } from '../../../components/layout/services/companyService.js';
import { useCatalogResource } from '../../projects/components/useCatalogResource.js';

const loadCompany = (_key, options) => companyService.get(options);
export function useCompanyContact() {
  const resource = useCatalogResource(loadCompany, 'company');
  const phone = resource.data?.whatsapp.replace(/[^\d]/g, '') || '';
  return (title) =>
    /^\d{8,15}$/.test(phone)
      ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, quisiera consultar sobre ${title}`)}`
      : undefined;
}
