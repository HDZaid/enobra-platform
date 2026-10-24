"""BE-02: ResourcePermission aplicado a todos los módulos (matriz rol × endpoint y roles finos)."""
import io
import tempfile

from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils.text import slugify
from rest_framework.test import APIClient

from persistence.models import Permiso, Propiedad, Proyecto, Rol, RolPermiso, Usuario, UsuarioRol
from tests import test_admin_api as admin_tests

API = admin_tests.API
PASSWORD = "Matriz!Robusto2026"
ROLES = ("Ingeniero", "Arquitecta", "Empleado")
payload = admin_tests.AdminAPITests.payload
image_file = admin_tests.AdminAPITests.image_file
company_payload = admin_tests.AdminAPITests.company_payload
INSTITUTION = {"presentation": ["Presentación"], "signature": "Ingeniero", "role": "Director",
               "vision": "Visión", "mission": "Misión", "principles": [{"title": "Calidad", "description": "Siempre"}]}


class PermissionTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_access_control", stdout=io.StringIO())
        cls.people = {name: cls.make_user(Rol.objects.get(nombre=name), name) for name in ROLES}

    @staticmethod
    def make_user(role, name):
        slug = slugify(name).replace('-', '')
        user = Usuario.objects.create(nombre=name, correo=f"{slug}@example.com",
                                      password_hash=make_password(PASSWORD))
        UsuarioRol.objects.create(usuario=user, rol=role)
        return user

    def setUp(self):
        cache.clear()
        media = tempfile.TemporaryDirectory()
        self.addCleanup(media.cleanup)
        override = override_settings(MEDIA_ROOT=media.name, MEDIA_URL="/media/")
        override.enable()
        self.addCleanup(override.disable)
        self.anonymous = APIClient()

    def login(self, user):
        client = APIClient()
        response = client.post(API + "auth/login/", {"email": user.correo, "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        client.credentials(HTTP_AUTHORIZATION="Bearer " + response.json()["access"])
        return client

    def role_client(self, name, *permissions):
        """Cliente autenticado con un rol personalizado que solo tiene `permissions`."""
        role = Rol.objects.create(nombre=name)
        for permission in permissions:
            RolPermiso.objects.create(rol=role, permiso=Permiso.objects.get(nombre=permission))
        user = self.make_user(role, name)
        return self.login(user), user

    def create(self, client, kind, **changes):
        response = client.post(API + kind + "/", payload(None, kind, **changes), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()


class RoleEndpointMatrixTests(PermissionTestCase):
    """Ingeniero, Arquitecta, Empleado y anónimo contra cada endpoint protegido."""

    def setUp(self):
        super().setUp()
        self.clients = {name: self.login(user) for name, user in self.people.items()}
        self.clients[None] = self.anonymous
        self.admin = self.clients["Ingeniero"]

    # Cada fila: nombre -> (construir la petición, roles permitidos con su código de éxito).
    # Todo rol que no esté en `allowed` debe recibir 403 y el anónimo 401.
    def matrix(self):
        admin = self.admin
        project = lambda: self.create(admin, "projects")["id"]  # noqa: E731
        news = lambda: self.create(admin, "news")["id"]  # noqa: E731
        inquiry = lambda: admin_tests.AdminAPITests.contact(  # noqa: E731
            type("T", (), {"public": APIClient(), "assertEqual": self.assertEqual})())["id"]

        def media():
            response = admin.post(API + "admin/media/", {"file": image_file(None), "kind": "photo"}, format="multipart")
            self.assertEqual(response.status_code, 201, response.content)
            return response.json()["id"]

        everyone = {"Ingeniero": 201, "Arquitecta": 201, "Empleado": 201}
        return {
            "POST /projects/": (lambda: ("post", "projects/", payload(None, "projects"), "json"), {"Ingeniero": 201}),
            "PATCH /projects/{id}/": (lambda: ("patch", f"projects/{project()}/", {"title": "Editado"}, "json"), {"Ingeniero": 200}),
            "DELETE /projects/{id}/": (lambda: ("delete", f"projects/{project()}/", None, "json"), {"Ingeniero": 204}),
            "POST /news/": (lambda: ("post", "news/", payload(None, "news"), "json"), {"Ingeniero": 201}),
            "PATCH /news/{id}/": (lambda: ("patch", f"news/{news()}/", {"title": "Editada"}, "json"), {"Ingeniero": 200}),
            "DELETE /news/{id}/": (lambda: ("delete", f"news/{news()}/", None, "json"), {"Ingeniero": 204}),
            "GET /inquiries/": (lambda: ("get", "inquiries/", None, "json"), {"Ingeniero": 200}),
            "GET /inquiries/{id}/": (lambda: ("get", f"inquiries/{inquiry()}/", None, "json"), {"Ingeniero": 200}),
            "PATCH /inquiries/{id}/": (lambda: ("patch", f"inquiries/{inquiry()}/", {"status": "atendido"}, "json"), {"Ingeniero": 200}),
            "POST /admin/media/": (lambda: ("post", "admin/media/", {"file": image_file(None), "kind": "photo"}, "multipart"), everyone),
            "GET /admin/media/{id}/": (lambda: ("get", f"admin/media/{media()}/", None, "json"),
                                       {"Ingeniero": 200, "Arquitecta": 200, "Empleado": 200}),
            "DELETE /admin/media/{id}/": (lambda: ("delete", f"admin/media/{media()}/", None, "json"), {"Ingeniero": 204}),
            "PUT /company/": (lambda: ("put", "company/", company_payload(None), "json"), {"Ingeniero": 200}),
            "PUT /institution/": (lambda: ("put", "institution/", INSTITUTION, "json"), {"Ingeniero": 200}),
            "GET /admin/users/": (lambda: ("get", "admin/users/", None, "json"), {"Ingeniero": 200}),
            "GET /admin/users/roles/": (lambda: ("get", "admin/users/roles/", None, "json"), {"Ingeniero": 200}),
            "GET /admin/roles/": (lambda: ("get", "admin/roles/", None, "json"), {"Ingeniero": 200}),
            "GET /admin/permissions/": (lambda: ("get", "admin/permissions/", None, "json"), {"Ingeniero": 200}),
            # Propiedades no cambia: Empleado crea borradores; Arquitecta puede enviar a papelera cualquiera.
            "POST /properties/": (lambda: ("post", "properties/", payload(None, "properties", published=False), "json"), everyone),
            "DELETE /properties/{id}/": (lambda: ("delete", f"properties/{self.create(admin, 'properties')['id']}/", None, "json"),
                                         {"Ingeniero": 204, "Arquitecta": 204}),
        }

    def test_role_by_endpoint_matrix(self):
        for endpoint, (build, allowed) in self.matrix().items():
            for role in (*ROLES, None):
                with self.subTest(endpoint=endpoint, role=role or "anónimo"):
                    method, path, body, fmt = build()
                    client = self.clients[role]
                    response = getattr(client, method)(API + path) if body is None else \
                        getattr(client, method)(API + path, body, format=fmt)
                    expected = allowed.get(role, 401 if role is None else 403)
                    self.assertEqual(response.status_code, expected, response.content)
                    if expected == 403:
                        self.assertEqual(response.json()["error"]["code"], "permission_denied")
                    if expected == 401:
                        self.assertEqual(response.json()["error"]["code"], "not_authenticated")

    def test_architect_and_employee_can_now_upload_media_but_not_manage_other_modules(self):
        for role in ("Arquitecta", "Empleado"):
            client = self.clients[role]
            self.assertEqual(client.post(API + "admin/media/", {"file": image_file(None)}, format="multipart").status_code, 201)
            self.assertEqual(client.get(API + "inquiries/").status_code, 403)
            self.assertEqual(client.get(API + "admin/users/").status_code, 403)
            self.assertEqual(client.post(API + "projects/", payload(None, "projects"), format="json").status_code, 403)

    def test_public_reads_stay_public(self):
        for path in ("projects/", "projects/years/", "news/", "properties/", "company/", "institution/", "services/"):
            with self.subTest(path=path):
                self.assertEqual(self.anonymous.get(API + path).status_code, 200 if path != "services/" else 501)


class GranularPermissionTests(PermissionTestCase):
    """Roles personalizados: cada permiso abre exactamente lo que dice."""

    def setUp(self):
        super().setUp()
        self.admin = self.login(self.people["Ingeniero"])

    def test_inquiries_read_lists_but_cannot_change_and_manage_can_do_both(self):
        receipt = admin_tests.AdminAPITests.contact(type("T", (), {
            "public": APIClient(), "assertEqual": self.assertEqual})())
        url = API + f"inquiries/{receipt['id']}/"
        reader, _ = self.role_client("Lector de mensajes", "inquiries.read")
        self.assertEqual(reader.get(API + "inquiries/").status_code, 200)
        self.assertEqual(reader.get(url).status_code, 200)
        self.assertEqual(reader.patch(url, {"status": "atendido"}, format="json").status_code, 403)
        manager, _ = self.role_client("Gestor de mensajes", "inquiries.manage")
        self.assertEqual(manager.get(API + "inquiries/").status_code, 200)
        self.assertEqual(manager.patch(url, {"status": "atendido"}, format="json").status_code, 200)

    def test_users_and_roles_read_cannot_modify(self):
        reader, _ = self.role_client("Auditor de accesos", "users.read", "roles.read")
        for path in ("admin/users/", "admin/users/roles/", "admin/roles/", "admin/permissions/"):
            self.assertEqual(reader.get(API + path).status_code, 200, path)
        self.assertEqual(reader.post(API + "admin/roles/", {"name": "X", "permissions": []}, format="json").status_code, 403)
        self.assertEqual(reader.post(API + "admin/users/", {}, format="json").status_code, 403)

    def test_media_upload_and_delete_are_independent(self):
        uploader, _ = self.role_client("Subidor", "media.upload")
        saved = uploader.post(API + "admin/media/", {"file": image_file(None)}, format="multipart")
        self.assertEqual(saved.status_code, 201)
        url = API + f"admin/media/{saved.json()['id']}/"
        self.assertEqual(uploader.get(url).status_code, 200)
        self.assertEqual(uploader.delete(url).status_code, 403)
        eraser, _ = self.role_client("Borrador", "media.delete")
        self.assertEqual(eraser.get(url).status_code, 403)
        self.assertEqual(eraser.post(API + "admin/media/", {"file": image_file(None)}, format="multipart").status_code, 403)
        self.assertEqual(eraser.delete(url).status_code, 204)

    def test_company_edit_is_required_to_write_and_reading_stays_public(self):
        editor, _ = self.role_client("Editor de empresa", "company.edit")
        self.assertEqual(editor.put(API + "company/", company_payload(None), format="json").status_code, 200)
        self.assertEqual(editor.put(API + "institution/", INSTITUTION, format="json").status_code, 200)
        other, _ = self.role_client("Otro", "news.create")
        self.assertEqual(other.put(API + "company/", company_payload(None), format="json").status_code, 403)
        self.assertEqual(other.get(API + "company/").status_code, 200)

    # --- Proyectos -----------------------------------------------------------------------

    def test_projects_without_publish_only_save_drafts(self):
        creator, _ = self.role_client("Creador de proyectos", "projects.create")
        body = {k: v for k, v in payload(None, "projects").items() if k != "published"}
        draft = creator.post(API + "projects/", body, format="json")
        self.assertEqual(draft.status_code, 201, draft.content)
        self.assertFalse(draft.json()["published"])
        forbidden = creator.post(API + "projects/", payload(None, "projects", published=True), format="json")
        self.assertEqual(forbidden.status_code, 403)
        publisher, _ = self.role_client("Publicador de proyectos", "projects.create", "projects.publish")
        self.assertTrue(self.create(publisher, "projects")["published"])

    def test_projects_edit_own_only_touches_own_drafts(self):
        editor, user = self.role_client("Editor propio", "projects.create", "projects.edit.own")
        own = editor.post(API + "projects/", {k: v for k, v in payload(None, "projects").items() if k != "published"}, format="json").json()
        self.assertEqual(editor.patch(API + f"projects/{own['id']}/", {"title": "Mío"}, format="json").status_code, 200)
        foreign = self.create(self.admin, "projects", published=False)
        self.assertEqual(editor.patch(API + f"projects/{foreign['id']}/", {"title": "Ajeno"}, format="json").status_code, 403)
        Proyecto.objects.filter(slug=own["id"]).update(publicado=True)  # ya no es borrador
        self.assertEqual(editor.patch(API + f"projects/{own['id']}/", {"title": "Tarde"}, format="json").status_code, 403)

    def test_projects_edit_any_without_publish_cannot_publish_and_saves_draft(self):
        editor, _ = self.role_client("Editor de proyectos", "projects.edit.any")
        project = self.create(self.admin, "projects", published=False)
        url = API + f"projects/{project['id']}/"
        self.assertEqual(editor.patch(url, {"published": True}, format="json").status_code, 403)
        response = editor.patch(url, {"title": "Corregido"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["published"])

    def test_projects_trash_own_versus_any(self):
        own_trasher, _ = self.role_client("Papelera propia", "projects.create", "projects.trash.own")
        own = own_trasher.post(API + "projects/", {k: v for k, v in payload(None, "projects").items() if k != "published"}, format="json").json()
        foreign = self.create(self.admin, "projects", published=False)
        self.assertEqual(own_trasher.delete(API + f"projects/{foreign['id']}/").status_code, 403)
        self.assertEqual(own_trasher.delete(API + f"projects/{own['id']}/").status_code, 204)
        any_trasher, _ = self.role_client("Papelera total", "projects.trash.any")
        self.assertEqual(any_trasher.delete(API + f"projects/{foreign['id']}/").status_code, 204)

    def test_project_drafts_are_visible_only_to_editors(self):
        draft = self.create(self.admin, "projects", published=False)
        url = API + f"projects/{draft['id']}/"
        self.assertEqual(self.anonymous.get(url).status_code, 404)
        self.assertEqual(self.anonymous.get(API + "projects/").json()["count"], 0)
        editor, _ = self.role_client("Ve borradores", "projects.edit.any")
        self.assertEqual(editor.get(url).status_code, 200)
        self.assertEqual(editor.get(API + "projects/").json()["count"], 1)
        creator, _ = self.role_client("Solo crea", "projects.create")
        self.assertEqual(creator.get(url).status_code, 404)
        owner, user = self.role_client("Dueño", "projects.edit.own")
        Proyecto.objects.filter(slug=draft["id"]).update(creado_por_id=user.pk)
        self.assertEqual(owner.get(url).status_code, 200)

    # --- Noticias ------------------------------------------------------------------------

    def test_news_create_without_publish_saves_drafts(self):
        creator, _ = self.role_client("Redactor", "news.create")
        body = {k: v for k, v in payload(None, "news").items() if k != "published"}
        response = creator.post(API + "news/", body, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json()["published"])
        self.assertEqual(creator.post(API + "news/", payload(None, "news", published=True), format="json").status_code, 403)
        publisher, _ = self.role_client("Redactor jefe", "news.create", "news.publish")
        self.assertTrue(self.create(publisher, "news")["published"])

    def test_news_edit_without_publish_cannot_change_published(self):
        editor, _ = self.role_client("Editor de noticias", "news.edit")
        item = self.create(self.admin, "news", published=True)
        url = API + f"news/{item['id']}/"
        self.assertEqual(editor.patch(url, {"published": False}, format="json").status_code, 403)
        self.assertEqual(editor.patch(url, {"published": True}, format="json").status_code, 200)  # sin cambio real
        response = editor.patch(url, {"title": "Corregida"}, format="json")
        self.assertEqual((response.status_code, response.json()["published"]), (200, True))
        body = {k: v for k, v in payload(None, "news", title="Reemplazo").items() if k != "published"}
        response = editor.put(url, body, format="json")  # el valor por defecto no debe publicar ni retirar
        self.assertEqual((response.status_code, response.json()["published"]), (200, True))
        draft = self.create(self.admin, "news", published=False)
        body = {k: v for k, v in payload(None, "news").items() if k != "published"}
        response = editor.put(API + f"news/{draft['id']}/", body, format="json")
        self.assertEqual((response.status_code, response.json()["published"]), (200, False))

    def test_news_publish_allows_changing_the_state(self):
        publisher, _ = self.role_client("Publicador de noticias", "news.edit", "news.publish")
        item = self.create(self.admin, "news", published=False)
        response = publisher.patch(API + f"news/{item['id']}/", {"published": True}, format="json")
        self.assertEqual((response.status_code, response.json()["published"]), (200, True))

    def test_news_delete_is_independent_from_edit_and_drafts_are_hidden_from_the_public(self):
        eraser, _ = self.role_client("Elimina noticias", "news.delete")
        item = self.create(self.admin, "news", published=False)
        url = API + f"news/{item['id']}/"
        self.assertEqual(eraser.patch(url, {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(self.anonymous.get(url).status_code, 404)
        editor, _ = self.role_client("Ve borradores de noticias", "news.edit")
        self.assertEqual(editor.get(url).status_code, 200)
        self.assertEqual(eraser.delete(url).status_code, 204)

    # --- Método sin mapa -------------------------------------------------------------------

    def test_options_follows_the_get_rule(self):
        self.assertEqual(self.anonymous.options(API + "admin/media/1/").status_code, 401)
        self.assertEqual(self.anonymous.options(API + "projects/").status_code, 200)
