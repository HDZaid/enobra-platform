import io
import tempfile
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

import jwt
from PIL import Image
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.interfaces import AuthService
from apps.common.registry import resolve
from persistence.models import (Usuario, Rol, UsuarioRol, Permiso, RolPermiso,
    HistorialActividad, Proyecto, Propiedad, Noticia, ContenidoPagina,
    MensajeContacto, ConfiguracionSitio, RedSocial, CategoriaProyecto)

API = "/api/v1/"
IMAGE = "https://example.com/photo.jpg"
VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


class AdminAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.role = Rol.objects.create(nombre="Administrador")
        cls.user = Usuario.objects.create(nombre="Ingeniero", correo="admin@example.com",
            password_hash=make_password("correct-password"))
        UsuarioRol.objects.create(usuario=cls.user, rol=cls.role)
        cls.other = Usuario.objects.create(nombre="Arquitecta", correo="architect@example.com",
            password_hash=make_password("another-password"))
        UsuarioRol.objects.create(usuario=cls.other, rol=cls.role)

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.public = APIClient()
        self.tokens = self.public.post(API + "auth/login/", {
            "email": self.user.correo, "password": "correct-password"}, format="json").json()
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + self.tokens["access"])

    def payload(self, kind, **changes):
        common = {"title": "Casa de prueba", "description": "Descripción completa",
                  "demo": True, "published": True}
        if kind == "projects":
            common.update(category="Vivienda", year=2026, country="Guatemala",
                          images=[IMAGE], renders=[IMAGE], video=VIDEO)
        elif kind == "properties":
            common.update(operation="Venta", type="Casa", zone="Zona 9", location="Quetzaltenango",
                price=500000, rooms=3, baths=2, parking=1, area=150, date="2026-10-12",
                commercial="Condiciones reales", images=[IMAGE], renders=[], video=VIDEO)
        else:
            common.update(category="Eventos", date="2026-10-12", image=IMAGE)
        common.update(changes)
        return common

    def create(self, kind, **changes):
        response = self.client.post(API + kind + "/", self.payload(kind, **changes), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_login_me_refresh_and_logout(self):
        self.assertEqual(set(self.tokens), {"access", "refresh", "expires_in", "user"})
        self.assertEqual(self.tokens["user"]["role"], "Administrador")
        self.assertNotIn("password_hash", self.tokens["user"])
        self.assertEqual(self.client.get(API + "auth/me/").json()["id"], str(self.user.pk))
        renewed = self.public.post(API + "auth/refresh/", {"refresh": self.tokens["refresh"]}, format="json")
        self.assertEqual(renewed.status_code, 200)
        for _ in range(2):
            self.assertEqual(self.public.post(API + "auth/logout/", {
                "refresh": self.tokens["refresh"]}, format="json").status_code, 204)
        self.assertEqual(self.client.get(API + "auth/me/").status_code, 401)
        self.assertEqual(self.public.post(API + "auth/refresh/", {
            "refresh": self.tokens["refresh"]}, format="json").status_code, 401)

    def test_both_administrators_can_edit_shared_content(self):
        item = self.create("projects")
        tokens = self.public.post(API + "auth/login/", {
            "email": self.other.correo, "password": "another-password"}, format="json").json()
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + tokens["access"])
        response = self.client.patch(API + f"projects/{item['id']}/", {"title": "Editado"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["updated_by"], str(self.other.pk))
        self.assertTrue(HistorialActividad.objects.filter(usuario=self.other, accion="EDITAR").exists())

    def test_invalid_login_and_case_insensitive_email(self):
        for email, password in ((self.user.correo, "wrong"), ("missing@example.com", "wrong")):
            response = self.public.post(API + "auth/login/", {"email": email, "password": password}, format="json")
            self.assertEqual(response.status_code, 401)
            self.assertIn("error", response.json())
        response = self.public.post(API + "auth/login/", {
            "email": self.user.correo.upper(), "password": "correct-password"}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_disabled_user_and_role_revoke_access(self):
        Usuario.objects.filter(pk=self.user.pk).update(estado="INACTIVO")
        self.assertEqual(self.client.get(API + "auth/me/").status_code, 401)
        self.assertIsNone(resolve(AuthService).login(self.user.correo, "correct-password"))
        Usuario.objects.filter(pk=self.user.pk).update(estado="ACTIVO")
        Rol.objects.filter(pk=self.role.pk).update(estado=False)
        self.assertEqual(self.client.get(API + "auth/me/").status_code, 401)
        self.assertIsNone(resolve(AuthService).refresh(self.tokens["refresh"]))

    def test_user_without_admin_role_cannot_login(self):
        UsuarioRol.objects.filter(usuario=self.user).delete()
        self.assertIsNone(resolve(AuthService).login(self.user.correo, "correct-password"))

    def test_tokens_reject_wrong_kind_tampering_and_expiration(self):
        service = resolve(AuthService)
        self.assertIsNone(service.verify_access_token(self.tokens["refresh"]))
        self.assertIsNone(service.refresh(self.tokens["access"]))
        for token in ("invalid", self.tokens["access"] + "x"):
            self.assertIsNone(service.verify_access_token(token))
        payload = jwt.decode(self.tokens["access"], settings.SECRET_KEY, algorithms=["HS256"], audience="enobra-api")
        payload["exp"] = timezone.now() - timedelta(seconds=1)
        expired = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
        self.assertIsNone(service.verify_access_token(expired))
        payload["exp"] = timezone.now() + timedelta(seconds=60)
        payload["aud"] = "another-api"
        self.assertIsNone(service.verify_access_token(jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")))

    def test_sessions_persist_and_logout_only_revokes_selected_session(self):
        service = resolve(AuthService)
        other = service.login(self.user.correo, "correct-password")
        from persistence.accounts import DjangoAuthService
        fresh_process_service = DjangoAuthService()
        fresh_process_service.logout(self.tokens["refresh"])
        self.assertIsNone(service.verify_access_token(self.tokens["access"]))
        self.assertIsNotNone(fresh_process_service.verify_access_token(other["access"]))
        session_contents = list(ContenidoPagina.objects.filter(clave__startswith="auth.session.")
                                .values_list("contenido", flat=True))
        self.assertTrue(session_contents)
        self.assertNotIn(other["refresh"], "".join(session_contents))

    def test_malformed_authorization_is_401(self):
        for header in ("Bearer", "Basic abc", "Bearer abc def", "Bearer ÿ"):
            self.public.credentials(HTTP_AUTHORIZATION=header)
            self.assertEqual(self.public.get(API + "auth/me/").status_code, 401)

    def test_login_rate_limit(self):
        cache.clear()
        for _ in range(5):
            self.assertEqual(self.public.post(API + "auth/login/", {
                "email": self.user.correo, "password": "bad"}, format="json").status_code, 401)
        response = self.public.post(API + "auth/login/", {
            "email": self.user.correo, "password": "bad"}, format="json")
        self.assertEqual(response.status_code, 429)

    def test_catalog_crud_and_audit(self):
        for kind, model in (("projects", Proyecto), ("properties", Propiedad), ("news", Noticia)):
            with self.subTest(kind=kind):
                item = self.create(kind)
                url = API + f"{kind}/{item['id']}/"
                self.assertEqual(self.public.get(url).json()["title"], item["title"])
                self.assertEqual(self.client.get(API + kind + "/").json()["count"], 1)
                response = self.client.patch(url, {"title": "Título editado", "demo": False}, format="json")
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(response.json()["id"], item["id"])
                self.assertFalse(response.json()["demo"])
                response = self.client.put(url, self.payload(kind, title="Reemplazado"), format="json")
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(response.json()["title"], "Reemplazado")
                self.assertEqual(self.client.delete(url).status_code, 204)
                self.assertEqual(self.client.get(url).status_code, 404)
                # BE-04: proyectos conserva su fila y audita PAPELERA, igual que propiedades.
                if kind in ("properties", "projects"):
                    self.assertEqual(model.objects.count(), 1)
                    self.assertTrue(ContenidoPagina.objects.filter(clave__startswith=f"admin.{kind}.").exists())
                    expected_actions = {"CREAR", "EDITAR", "PAPELERA"}
                else:
                    self.assertEqual(model.objects.count(), 0)
                    self.assertFalse(ContenidoPagina.objects.filter(clave__startswith=f"admin.{kind}.").exists())
                    expected_actions = {"CREAR", "EDITAR", "ELIMINAR"}
                self.assertEqual(
                    set(HistorialActividad.objects.filter(modulo=kind).values_list("accion", flat=True)),
                    expected_actions,
                )

    def test_public_cannot_write_any_admin_resource(self):
        for kind in ("projects", "properties", "news"):
            item = self.create(kind)
            url = API + f"{kind}/{item['id']}/"
            self.assertEqual(self.public.post(API + kind + "/", self.payload(kind), format="json").status_code, 401)
            self.assertEqual(self.public.patch(url, {"title": "Hacked"}, format="json").status_code, 401)
            self.assertEqual(self.public.put(url, self.payload(kind), format="json").status_code, 401)
            self.assertEqual(self.public.delete(url).status_code, 401)
        for path in ("company/", "institution/"):
            self.assertEqual(self.public.put(API + path, {}, format="json").status_code, 401)
        for path in ("inquiries/", "inquiries/1/", "admin/media/missing/"):
            self.assertEqual(self.public.get(API + path).status_code, 401)
        self.assertEqual(self.public.post(API + "admin/media/", {}).status_code, 401)

    def test_drafts_hidden_from_public_but_visible_to_admins(self):
        for kind in ("projects", "properties", "news"):
            item = self.create(kind, published=False)
            url = API + f"{kind}/{item['id']}/"
            self.assertEqual(self.public.get(url).status_code, 404)
            self.assertEqual(self.public.get(API + kind + "/").json()["count"], 0)
            self.assertEqual(self.client.get(url).status_code, 200)
            self.assertEqual(self.client.get(API + kind + "/").json()["count"], 1)
        self.assertEqual(self.public.get(API + "projects/years/").json()["years"], [])
        self.assertEqual(self.public.get(API + "properties/facets/").json()["zones"], [])

    def test_slug_collisions_generate_distinct_stable_ids(self):
        for kind in ("projects", "news"):
            first, second = self.create(kind), self.create(kind)
            self.assertNotEqual(first["id"], second["id"])
            self.assertEqual(second["id"], first["id"] + "-2")

    def test_pagination_year_category_filters(self):
        self.create("projects", year=2025)
        self.create("projects", year=2026)
        self.assertEqual(self.public.get(API + "projects/years/").json()["years"], [2026, 2025])
        self.assertEqual(self.public.get(API + "projects/?year=2025").json()["count"], 1)
        response = self.public.get(API + "projects/?page_size=1&page=2").json()
        self.assertEqual(response["count"], 2)
        self.assertEqual(response["results"][0]["year"], 2025)
        self.assertEqual(self.public.get(API + "projects/?page_size=101").status_code, 400)
        self.create("news", category="Anuncios")
        self.create("news", category="Eventos")
        self.assertEqual(self.public.get(API + "news/?category=Eventos").json()["count"], 1)

    def test_property_filters_facets_and_accent_insensitive_search(self):
        first = self.create("properties", title="Residencia El Árbol", price=100)
        self.create("properties", operation="Alquiler", zone="Zona 1", price=200, date="2026-10-13")
        for query in ("q=arbol", "operation=Venta&type=Casa&zone=Zona%209&min_price=50&max_price=100",
                      f"ids={first['id']}"):
            self.assertEqual(self.public.get(API + "properties/?" + query).json()["count"], 1)
        results = self.public.get(API + "properties/?sort=price_asc").json()["results"]
        self.assertEqual([obj["price"] for obj in results], [100, 200])
        facets = self.public.get(API + "properties/facets/").json()
        self.assertEqual((facets["min_price"], facets["max_price"]), (100, 200))

    def test_invalid_catalog_data_and_partial_land_validation(self):
        for kind in ("projects", "properties", "news"):
            response = self.client.post(API + kind + "/", {}, format="json")
            self.assertEqual(response.status_code, 400)
            bad = {"image": "data:image/png;base64,abc"} if kind == "news" else {"images": []}
            response = self.client.post(API + kind + "/", self.payload(kind, **bad), format="json")
            self.assertEqual(response.status_code, 400)
        item = self.create("properties")
        response = self.client.patch(API + f"properties/{item['id']}/", {"type": "Terreno"}, format="json")
        self.assertEqual(response.status_code, 400)
        land = self.create("properties", type="Terreno", rooms=0, baths=0, parking=0)
        response = self.client.patch(API + f"properties/{land['id']}/", {"rooms": 1}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_video_youtube_validation_and_removal(self):
        item = self.create("projects")
        url = API + f"projects/{item['id']}/"
        for video in ("https://example.com/video.mp4", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
                      "http://youtu.be/dQw4w9WgXcQ", "https://youtu.be/not-valid"):
            self.assertEqual(self.client.patch(url, {"video": video}, format="json").status_code, 400)
        for video in ("https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/embed/dQw4w9WgXcQ", ""):
            response = self.client.patch(url, {"video": video}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["video"], video)
        self.assertEqual(Proyecto.objects.get(slug=item["id"]).videos.count(), 0)

    def test_atomic_rollback_when_audit_fails(self):
        with patch("persistence.catalog.audit", side_effect=RuntimeError("audit failed")):
            with self.assertRaises(RuntimeError):
                self.create("projects")
        self.assertEqual(Proyecto.objects.count(), 0)
        self.assertEqual(CategoriaProyecto.objects.count(), 0)
        self.assertFalse(ContenidoPagina.objects.filter(clave__startswith="admin.projects.").exists())

    def company_payload(self, **changes):
        data = {"name": "EnObra", "person": "Ingeniero", "address": "Quetzaltenango",
            "phones": ["7763-2054", "1234 5678"], "whatsapp": "50212345678", "email": "info@example.com",
            "instagram": "https://instagram.com/enobra", "facebook": "https://facebook.com/enobra",
            "domain": "https://example.com", "logo": IMAGE}
        data.update(changes)
        return data

    def test_company_roundtrip_social_rows_and_second_update(self):
        self.assertEqual(self.public.get(API + "company/").status_code, 200)
        response = self.client.put(API + "company/", self.company_payload(), format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["phones"], ["77632054", "12345678"])
        obj = ConfiguracionSitio.objects.get()
        RedSocial.objects.create(configuracion=obj, nombre="LinkedIn", url="https://linkedin.com")
        response = self.client.put(API + "company/", self.company_payload(instagram="", phones=[], logo=""), format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["instagram"], "")
        self.assertEqual(response.json()["logo"], "")
        self.assertEqual(ConfiguracionSitio.objects.count(), 1)
        self.assertTrue(RedSocial.objects.filter(nombre="LinkedIn").exists())
        self.assertEqual(self.public.get(API + "company/").json(), response.json())

    def test_company_rejects_unsupported_phone_count(self):
        response = self.client.put(API + "company/", self.company_payload(phones=["12345678"] * 3), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ConfiguracionSitio.objects.count(), 0)

    def test_institution_roundtrip(self):
        data = {"presentation": ["Presentación"], "signature": "Ingeniero", "role": "Director",
                "vision": "Visión", "mission": "Misión", "principles": [{"title": "Calidad", "description": "Siempre"}]}
        response = self.client.put(API + "institution/", data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.public.get(API + "institution/").json(), data)

    def contact(self):
        response = self.public.post(API + "inquiries/contact/", {"name": "Cliente", "email": "client@example.com",
            "phone": "1234-5678", "subject": "Diseño", "message": "Información", "website": ""}, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_inquiries_contact_attend_archive_and_filter(self):
        receipt = self.contact()
        url = API + f"inquiries/{receipt['id']}/"
        self.assertEqual(self.client.get(url).json()["phone"], "12345678")
        response = self.client.patch(url, {"status": "archivado"}, format="json")
        self.assertEqual(response.status_code, 400)
        for status in ("atendido", "archivado", "archivado"):
            response = self.client.patch(url, {"status": status}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], status)
        self.assertEqual(MensajeContacto.objects.get(pk=receipt["id"]).estado, "RESPONDIDO")
        self.assertEqual(self.client.get(API + "inquiries/?status=archivado").json()["count"], 1)
        self.assertEqual(self.client.get(API + "inquiries/?status=atendido").json()["count"], 0)
        self.assertEqual(self.client.get(API + "inquiries/not-a-number/").status_code, 404)

    def test_visit_requires_published_property(self):
        prop = self.create("properties", published=False)
        data = {"property_id": prop["id"], "name": "Cliente", "phone": "12345678",
                "preferred_date": timezone.localdate().isoformat()}
        self.assertEqual(self.public.post(API + "inquiries/visits/", data, format="json").status_code, 404)
        Propiedad.objects.filter(pk=prop["id"]).update(publicado=True)
        response = self.public.post(API + "inquiries/visits/", data, format="json")
        self.assertEqual(response.status_code, 201)
        detail = self.client.get(API + f"inquiries/{response.json()['id']}/").json()
        self.assertEqual(detail["kind"], "visita")
        self.assertEqual(detail["property_title"], prop["title"])

    def image_file(self, content_type="image/png", raw=None):
        output = io.BytesIO()
        Image.new("RGB", (4, 4), "red").save(output, "PNG")
        return SimpleUploadedFile("../../unsafe.png", raw if raw is not None else output.getvalue(), content_type=content_type)

    def test_media_upload_read_delete(self):
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory, MEDIA_URL="/media/"):
            response = self.client.post(API + "admin/media/", {"file": self.image_file(), "kind": "photo"}, format="multipart")
            self.assertEqual(response.status_code, 201, response.content)
            item = response.json()
            self.assertTrue(item["url"].startswith("/media/uploads/"))
            self.assertEqual(len(list(Path(directory).rglob("*.png"))), 1)
            url = API + f"admin/media/{item['id']}/"
            self.assertEqual(self.client.get(url).json(), item)
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(self.client.delete(url).status_code, 204)
            self.assertEqual(self.client.get(url).status_code, 404)
            self.assertEqual(list(Path(directory).rglob("*.png")), [])

    def test_media_rejects_fake_mismatched_and_oversized_files(self):
        for f in (self.image_file(raw=b"not-an-image"), self.image_file(content_type="image/jpeg")):
            response = self.client.post(API + "admin/media/", {"file": f}, format="multipart")
            self.assertEqual(response.status_code, 400)
        with override_settings(MEDIA_MAX_UPLOAD_BYTES=1):
            response = self.client.post(API + "admin/media/", {"file": self.image_file()}, format="multipart")
            self.assertEqual(response.status_code, 400)

    def test_missing_resources_return_404(self):
        for path in ("projects/missing/", "properties/9999/", "news/missing/", "inquiries/9999/", "admin/media/missing/"):
            self.assertEqual(self.client.get(API + path).status_code, 404)

    def test_delete_audit_identifies_current_admin(self):
        item = self.create("news")
        tokens = resolve(AuthService).login(self.other.correo, "another-password")
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + tokens["access"])
        self.assertEqual(self.client.delete(API + f"news/{item['id']}/").status_code, 204)
        self.assertEqual(HistorialActividad.objects.get(modulo="news", accion="ELIMINAR").usuario_id, self.other.pk)

    def test_non_admin_is_forbidden(self):
        from apps.accounts.interfaces import Principal
        self.public.force_authenticate(user=Principal(id=str(self.user.pk), name="Viewer", email=self.user.correo, role="viewer"))
        self.assertEqual(self.public.post(API + "projects/", self.payload("projects"), format="json").status_code, 403)
        self.assertEqual(self.public.get(API + "inquiries/").status_code, 403)

    def test_inactive_category_cannot_be_used(self):
        CategoriaProyecto.objects.create(nombre="Inactiva", estado=False)
        response = self.client.post(API + "projects/", self.payload("projects", category="Inactiva"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Proyecto.objects.exists())

    def test_cleanup_expired_sessions_preserves_content_and_active_session(self):
        from persistence.support import write_data
        write_data("auth.session." + "a" * 64, {"expires_at": (timezone.now() - timedelta(days=1)).isoformat()})
        write_data("admin.company", {"logo": IMAGE})
        call_command("cleanup_admin_sessions", stdout=io.StringIO())
        self.assertFalse(ContenidoPagina.objects.filter(clave="auth.session." + "a" * 64).exists())
        self.assertTrue(ContenidoPagina.objects.filter(clave="admin.company").exists())
        self.assertIsNotNone(resolve(AuthService).verify_access_token(self.tokens["access"]))

    def test_real_pbkdf2_password_hash(self):
        with override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.PBKDF2PasswordHasher"]):
            encoded = make_password("real-password")
            Usuario.objects.filter(pk=self.user.pk).update(password_hash=encoded)
            result = resolve(AuthService).login(self.user.correo, "real-password")
            self.assertIsNotNone(result)
            self.assertIsNone(resolve(AuthService).login(self.user.correo, "wrong-password"))

    def test_failed_media_metadata_write_removes_uploaded_file(self):
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            with patch("persistence.media.write_data", side_effect=RuntimeError("database failed")):
                with self.assertRaises(RuntimeError):
                    self.client.post(API + "admin/media/", {"file": self.image_file()}, format="multipart")
            self.assertEqual(list(Path(directory).rglob("*.png")), [])

    def test_seed_access_control_is_idempotent_and_does_not_create_users(self):
        output = io.StringIO()
        call_command("seed_access_control", stdout=output)
        call_command("seed_access_control", stdout=output)

        # BE-01: el catálogo pasó de 12 a 32 permisos; Ingeniero 32 + Arquitecta 6 + Empleado 4.
        self.assertEqual(Permiso.objects.count(), 32)
        self.assertEqual(Rol.objects.count(), 4)  # tres roles iniciales y el fixture legado
        self.assertEqual(RolPermiso.objects.count(), 42)
        self.assertEqual(Usuario.objects.count(), 2)

        roles = {role['name']: set(role['permissions']) for role in self.client.get(API + 'admin/users/roles/').json()}
        self.assertEqual(set(roles), {'Administrador', 'Arquitecto', 'Empleado'})
        self.assertIn('projects.publish', roles['Empleado'])
        self.assertNotIn('admin.all', roles['Arquitecto'])

    def test_role_and_permission_endpoints_create_read_update_and_audit(self):
        before = (Rol.objects.count(), RolPermiso.objects.count())
        for path in ('admin/roles/', 'admin/roles/1/', 'admin/permissions/'):
            for method in ('get', 'post', 'patch', 'put', 'delete'):
                self.assertEqual(getattr(self.client, method)(API + path, {}, format='json').status_code, 404)
        self.assertEqual(before, (Rol.objects.count(), RolPermiso.objects.count()))

    def _user_with_role(self, name, email, role_name, password="test-password"):
        user = Usuario.objects.create(
            nombre=name,
            correo=email,
            password_hash=make_password(password),
        )
        UsuarioRol.objects.create(usuario=user, rol=Rol.objects.get(nombre=role_name))
        return user, password

    def _client_for_role_user(self, user, password):
        client = APIClient()
        login = client.post(API + "auth/login/", {
            "email": user.correo,
            "password": password,
        }, format="json")
        self.assertEqual(login.status_code, 200, login.content)
        client.credentials(HTTP_AUTHORIZATION="Bearer " + login.json()["access"])
        return client

    def test_employee_can_manage_only_own_drafts_and_trash_them(self):
        call_command('seed_access_control', stdout=io.StringIO())
        user, password = self._user_with_role('Empleado', 'employee@example.com', 'Empleado')
        client = self._client_for_role_user(user, password)
        for kind in ('projects', 'properties', 'news'):
            item = self.create(kind)
            response = client.patch(API + f"{kind}/{item['id']}/", {'published': True}, format='json')
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(client.delete(API + f"{kind}/{item['id']}/").status_code, 403)

    def test_architect_can_restore_but_cannot_permanently_delete(self):
        call_command("seed_access_control", stdout=io.StringIO())
        architect, password = self._user_with_role(
            "Arquitecta de prueba", "architect-role@example.com", "Arquitecta"
        )
        item = self.create("properties", published=False)
        property_id = item["id"]
        self.assertEqual(self.client.delete(API + f"properties/{property_id}/").status_code, 204)

        architect_client = self._client_for_role_user(architect, password)
        trash = architect_client.get(API + "admin/properties/trash/")
        self.assertEqual(trash.status_code, 200, trash.content)
        self.assertIn(property_id, [entry["id"] for entry in trash.json()["results"]])
        self.assertEqual(
            architect_client.post(API + f"admin/properties/{property_id}/restore/").status_code,
            204,
        )

        self.assertEqual(self.client.delete(API + f"properties/{property_id}/").status_code, 204)
        self.assertEqual(
            architect_client.delete(API + f"admin/properties/{property_id}/permanent/").status_code,
            403,
        )

        published = architect_client.post(
            API + "properties/", self.payload("properties", published=True), format="json"
        )
        self.assertEqual(published.status_code, 201, published.content)
        self.assertTrue(published.json()["published"])
        self.assertEqual(
            self.client.delete(API + f"admin/properties/{property_id}/permanent/").status_code,
            204,
        )
        self.assertFalse(Propiedad.objects.filter(pk=property_id).exists())
        published_id = published.json()["id"]
        self.assertEqual(self.client.delete(API + f"properties/{published_id}/").status_code, 204)
        self.assertEqual(
            self.client.delete(API + f"admin/properties/{published_id}/permanent/").status_code,
            204,
        )

    def test_deleting_property_keeps_received_inquiry_while_moving_to_trash(self):
        prop = self.create("properties")
        response = self.public.post(API + "inquiries/visits/", {"property_id": prop["id"], "name": "Cliente",
            "phone": "12345678", "preferred_date": timezone.localdate().isoformat()}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.delete(API + f"properties/{prop['id']}/").status_code, 204)
        message = MensajeContacto.objects.get(pk=response.json()["id"])
        self.assertEqual(message.propiedad_id, prop["id"])
        self.assertTrue(Propiedad.objects.filter(pk=prop["id"], publicado=False).exists())

    def test_contact_rejects_email_longer_than_declared_model(self):
        before = MensajeContacto.objects.count()
        response = self.public.post(API + "inquiries/contact/", {
            "name": "Cliente", "email": "a" * 60 + "@" + "b" * 60 + "." + "c" * 40 + ".com",
            "phone": "55551234", "subject": "Otro", "message": "Consulta", "website": "",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "validation_error")
        self.assertIn("email", response.json()["error"]["details"])
        self.assertEqual(MensajeContacto.objects.count(), before)
