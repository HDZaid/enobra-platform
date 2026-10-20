from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.company.interfaces import CompanyRepository, InstitutionRepository
from .models.content import ConfiguracionSitio, RedSocial, ContenidoPagina
from .support import read_data, write_data, audit


class DjangoCompanyRepository(CompanyRepository):
    fields = {"name": "nombre_empresa", "person": "responsable", "address": "direccion",
              "whatsapp": "whatsapp", "email": "correo", "domain": "dominio"}

    def get(self):
        obj = ConfiguracionSitio.objects.order_by("pk").first()
        result = {api: (getattr(obj, field, None) or "") for api, field in self.fields.items()}
        result["phones"] = [x for x in (getattr(obj, "telefono", None), getattr(obj, "telefono_adicional", None)) if x]
        socials = {normalized_name.casefold(): url for normalized_name, url in
            (obj.redes_sociales.filter(visible=True).values_list("nombre", "url") if obj else [])}
        result.update(instagram=socials.get("instagram", ""), facebook=socials.get("facebook", ""),
                      logo=read_data("admin.company").get("logo", ""))
        return result

    @transaction.atomic
    def update(self, data, *, updated_by):
        if len(data["phones"]) > 2:
            raise ValidationError({"phones": "Se admiten dos teléfonos, como en el panel."})
        if len(data["person"]) > 150 or len(data["email"]) > 150:
            raise ValidationError("Responsable y correo admiten hasta 150 caracteres.")
        # La clave única serializa también el primer guardado simultáneo de ambos perfiles.
        metadata, _ = ContenidoPagina.objects.get_or_create(clave="admin.company",
            defaults={"contenido": "{}", "visible": False})
        ContenidoPagina.objects.select_for_update().get(pk=metadata.pk)
        obj = ConfiguracionSitio.objects.select_for_update().order_by("pk").first()
        obj = obj or ConfiguracionSitio()
        for api, field in self.fields.items():
            setattr(obj, field, data[api])
        phones = data["phones"] + ["", ""]
        obj.telefono, obj.telefono_adicional = phones[:2]
        obj.actualizado_por_id, obj.fecha_actualizacion = updated_by, timezone.now()
        obj.save()
        for name in ("instagram", "facebook"):
            # Respetar redes adicionales existentes que no aparecen en este mockup.
            existing = obj.redes_sociales.filter(nombre__iexact=name).first()
            if existing:
                existing.url, existing.visible = data[name], bool(data[name])
                existing.fecha_actualizacion = timezone.now()
                existing.save()
            elif data[name]:
                RedSocial.objects.create(configuracion=obj, nombre=name, url=data[name])
        write_data("admin.company", {"logo": data["logo"]}, updated_by)
        audit("company", "EDITAR", obj, updated_by)
        return self.get()


class DjangoInstitutionRepository(InstitutionRepository):
    def get(self):
        return read_data("admin.institution", {"presentation": [], "signature": "", "role": "",
            "vision": "", "mission": "", "principles": []})

    @transaction.atomic
    def update(self, data, *, updated_by):
        write_data("admin.institution", data, updated_by)
        obj = ContenidoPagina.objects.get(clave="admin.institution")
        audit("institution", "EDITAR", obj, updated_by)
        return self.get()
