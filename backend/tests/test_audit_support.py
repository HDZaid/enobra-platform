"""INT-04/H2: las subidas de imágenes no deben registrar "None" como nombre."""
from types import SimpleNamespace

from django.test import TestCase

from persistence.models import HistorialActividad, Usuario
from persistence.support import audit


class AuditNameTests(TestCase):
    def test_object_without_title_registers_empty_name(self):
        user = Usuario.objects.create(nombre="Ana", correo="ana@example.com", password_hash="x")
        for title in (None, ""):
            audit("media", "CREAR", SimpleNamespace(pk=7, titulo=title, creado_por_id=user.pk))
        names = list(HistorialActividad.objects.filter(modulo="media").values_list("nombre_registro", flat=True))
        self.assertEqual(names, ["", ""])

    def test_title_is_kept(self):
        user = Usuario.objects.create(nombre="Ana", correo="ana@example.com", password_hash="x")
        audit("properties", "EDITAR", SimpleNamespace(pk=8, titulo="Casa Zona 10", creado_por_id=user.pk))
        self.assertEqual(HistorialActividad.objects.get(modulo="properties").nombre_registro, "Casa Zona 10")
