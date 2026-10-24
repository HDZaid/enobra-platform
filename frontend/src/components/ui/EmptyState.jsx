// <EmptyState icon={Folder} title="Aún no hay proyectos" description="Crea el primero." action={{ label: 'Nuevo proyecto', onClick }} />
import { LoadingButton } from './LoadingButton.jsx';

export function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
    {Icon && <Icon size={36} aria-hidden="true" className="text-[#626b79]" />}
    <h3 className="font-semibold text-[#12233f]">{title}</h3>
    {description && <p className="max-w-md text-sm text-[#626b79]">{description}</p>}
    {action && <LoadingButton onClick={action.onClick} variant="outline">{action.label}</LoadingButton>}
  </div>;
}
