"""INT-04: matriz de permisos por rol contra una API EnObra en ejecución.

Uso (solo contra una base desechable de desarrollo: crea propiedades, proyectos,
noticias, roles e imágenes de prueba y no los limpia todos):

    pip install requests pillow
    set QA_PASSWORD=... (o export QA_PASSWORD=...)
    python scripts/matriz_roles.py http://127.0.0.1:8000/api/v1/ resultado.json

Requiere cuatro cuentas activas con la misma contraseña: Ingeniero, Arquitecta y dos
Empleado. Los correos se cambian con QA_INGENIERO, QA_ARQUITECTA, QA_EMPLEADO y
QA_EMPLEADO2. Ver docs/INT-04-matriz-roles.md.
"""
import io, json, os, sys, datetime
import requests
from PIL import Image

API = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000/api/v1/"
PWD = os.environ.get("QA_PASSWORD") or sys.exit("Define QA_PASSWORD con la contraseña de las cuentas de prueba.")
ROWS = []

def png():
    b = io.BytesIO(); Image.new("RGB", (64, 64), (200, 90, 30)).save(b, "PNG"); return b.getvalue()

class C:
    def __init__(self, email):
        r = requests.post(API + "auth/login/", json={"email": email, "password": PWD}); r.raise_for_status()
        d = r.json(); self.h = {"Authorization": f"Bearer {d['access']}"}; self.user = d["user"]; self.refresh = d["refresh"]
    def __getattr__(self, m):
        return lambda path, **kw: requests.request(m.upper(), API + path, headers=self.h, **kw)

def check(role, area, action, expected, resp):
    ok = resp.status_code in (expected if isinstance(expected, tuple) else (expected,))
    ROWS.append(dict(role=role, area=area, action=action, expected=expected, got=resp.status_code, ok=ok,
                     detail="" if ok else resp.text[:200]))
    return resp

def prop(title, published, image):
    return dict(title=title, operation="Venta", type="Casa", zone="Zona 10", location="Colonia QA", price=950000,
                rooms=3, baths=2, parking=1, area=180, date=str(datetime.date.today()), description="QA INT-04",
                commercial="Contado", images=[image], renders=[], video="", demo=False, published=published)

ing, arq, emp, emp2 = (C(os.environ.get(k, d)) for k, d in (("QA_INGENIERO", "ingeniero@qa.local"), ("QA_ARQUITECTA", "arquitecta@qa.local"),
                                                     ("QA_EMPLEADO", "empleado@qa.local"), ("QA_EMPLEADO2", "empleado2@qa.local")))
users = {"Ingeniero": ing, "Arquitecta": arq, "Empleado": emp}
anon = requests

# Sesión y permisos efectivos
for role, c in users.items():
    check(role, "Sesión", "GET /auth/me/", 200, c.get("auth/me/"))

# Subir imágenes
img = {}
for role, c in users.items():
    r = check(role, "Subir", "POST /admin/media/ (foto)", 201, c.post("admin/media/", files={"file": ("qa.png", png(), "image/png")}, data={"kind": "photo"}))
    img[role] = r.json().get("url") if r.status_code == 201 else "https://example.com/qa.jpg"
check("Sin sesión", "Subir", "POST /admin/media/", 401, anon.post(API + "admin/media/", files={"file": ("qa.png", png(), "image/png")}, data={"kind": "photo"}))

# Crear
ids = {}
for role, c in users.items():
    r = check(role, "Crear", "POST /properties/ borrador", 201, c.post("properties/", json=prop(f"QA borrador {role}", False, img[role])))
    ids[role] = r.json().get("id")
    exp = 403 if role == "Empleado" else 201
    r = check(role, "Publicar", "POST /properties/ publicada", exp, c.post("properties/", json=prop(f"QA publicada {role}", True, img[role])))
    if r.status_code == 201: ids[role + "_pub"] = r.json()["id"]
r = emp2.post("properties/", json=prop("QA borrador Empleado 2", False, img["Empleado"])); ids["emp2"] = r.json()["id"]

# Visibilidad de borradores
check("Sin sesión", "Ver", "GET borrador ajeno sin token", 404, anon.get(API + f"properties/{ids['Empleado']}/"))
lst = emp.get("properties/?page_size=100").json()["results"]
seen = {x["id"] for x in lst if not x["published"]}
ROWS.append(dict(role="Empleado", area="Ver", action="Listado: solo sus borradores", expected="solo propios", got=sorted(seen),
                 ok=seen == {ids["Empleado"]}, detail=""))
check("Empleado", "Ver", "GET borrador de otro empleado", (403, 404), emp.get(f"properties/{ids['emp2']}/"))
check("Arquitecta", "Ver", "GET borrador de un empleado", 200, arq.get(f"properties/{ids['Empleado']}/"))

# Editar
for role, c in users.items():
    check(role, "Editar", "PATCH borrador propio", 200, c.patch(f"properties/{ids[role]}/", json={"title": f"QA editado {role}"}))
check("Empleado", "Editar", "PATCH borrador de otro empleado", (403, 404), emp.patch(f"properties/{ids['emp2']}/", json={"title": "x"}))
check("Empleado", "Editar", "PATCH publicada de la Arquitecta", (403, 404), emp.patch(f"properties/{ids['Arquitecta_pub']}/", json={"title": "x"}))
check("Arquitecta", "Editar", "PATCH borrador de un empleado", 200, arq.patch(f"properties/{ids['emp2']}/", json={"title": "QA editado por Arquitecta"}))
check("Ingeniero", "Editar", "PATCH publicada de la Arquitecta", 200, ing.patch(f"properties/{ids['Arquitecta_pub']}/", json={"title": "QA editado por Ingeniero"}))

# Publicar / retirar
check("Empleado", "Publicar", "PATCH published=true en su borrador", 403, emp.patch(f"properties/{ids['Empleado']}/", json={"published": True}))
check("Arquitecta", "Publicar", "PATCH published=true en borrador ajeno", 200, arq.patch(f"properties/{ids['emp2']}/", json={"published": True}))
check("Arquitecta", "Publicar", "PATCH published=false (retirar)", 200, arq.patch(f"properties/{ids['emp2']}/", json={"published": False}))
check("Ingeniero", "Publicar", "PATCH published=true", 200, ing.patch(f"properties/{ids['Ingeniero']}/", json={"published": True}))

# Papelera
check("Empleado", "Papelera", "DELETE publicada ajena", (403, 404), emp.delete(f"properties/{ids['Arquitecta_pub']}/"))
check("Empleado", "Papelera", "DELETE borrador de otro empleado", (403, 404), emp.delete(f"properties/{ids['emp2']}/"))
for role, c in users.items():
    check(role, "Papelera", "DELETE borrador propio → papelera", 204, c.delete(f"properties/{ids[role]}/"))
check("Arquitecta", "Papelera", "DELETE publicada propia → papelera", 204, arq.delete(f"properties/{ids['Arquitecta_pub']}/"))
for role, c in users.items():
    r = check(role, "Papelera", "GET /admin/trash/?type=properties", 200, c.get("admin/trash/?type=properties"))
    if r.status_code == 200:
        body = r.json(); items = body.get("results", body if isinstance(body, list) else [])
        titles = sorted(i.get("title", "?") for i in items)
        ROWS.append(dict(role=role, area="Papelera", action="Contenido visible en papelera", expected="Empleado: solo lo suyo", got=titles,
                         ok=(role != "Empleado" or all("Empleado" in t for t in titles)), detail=""))

# Restaurar y eliminar definitivamente
check("Empleado", "Restaurar", "POST restore (su borrador)", 403, emp.post(f"admin/properties/{ids['Empleado']}/restore/"))
check("Arquitecta", "Restaurar", "POST restore (borrador de empleado)", 204, arq.post(f"admin/properties/{ids['Empleado']}/restore/"))
check("Ingeniero", "Restaurar", "POST restore (publicada de Arquitecta)", 204, ing.post(f"admin/properties/{ids['Arquitecta_pub']}/restore/"))
r = arq.get(f"properties/{ids['Arquitecta_pub']}/")
ROWS.append(dict(role="Ingeniero", area="Restaurar", action="Restaurar conserva el estado previo (publicada)", expected=True,
                 got=r.json().get("published"), ok=r.json().get("published") is True, detail=""))
check("Arquitecta", "Eliminar definitivo", "DELETE /permanent/", 403, arq.delete(f"admin/properties/{ids['Arquitecta']}/permanent/"))
check("Empleado", "Eliminar definitivo", "DELETE /permanent/", 403, emp.delete(f"admin/properties/{ids['Arquitecta']}/permanent/"))
check("Ingeniero", "Eliminar definitivo", "DELETE /permanent/ (en papelera)", 204, ing.delete(f"admin/properties/{ids['Arquitecta']}/permanent/"))

# Historial
for role, c in users.items():
    exp = 200 if role == "Ingeniero" else 403
    check(role, "Historial", "GET /admin/audit/", exp, c.get("admin/audit/"))
    check(role, "Historial", "GET /admin/audit/export/", exp, c.get("admin/audit/export/"))

# Roles y usuarios
for role, c in users.items():
    exp = 200 if role == "Ingeniero" else 403
    check(role, "Roles", "GET /admin/roles/", exp, c.get("admin/roles/"))
    check(role, "Roles", "POST /admin/roles/", 201 if role == "Ingeniero" else 403,
          c.post("admin/roles/", json={"name": f"QA rol {role}", "description": "INT-04", "permissions": ["properties.create"]}))
    check(role, "Usuarios", "GET /admin/users/", exp, c.get("admin/users/"))

# Otros módulos
for role, c in users.items():
    exp = 201 if role == "Ingeniero" else 403
    check(role, "Proyectos", "POST /projects/", exp, c.post("projects/", json=dict(title=f"QA proyecto {role}", category="Vivienda", country="Guatemala", year=2026,
          description="QA", images=[img[role]], renders=[], video="", demo=False, published=False)))
    check(role, "Noticias", "POST /news/", exp, c.post("news/", json=dict(title=f"QA noticia {role}", category="Anuncios", date=str(datetime.date.today()),
          description="QA", image=img[role], demo=False, published=False)))

# Sesión: logout revoca
r = check("Empleado", "Sesión", "POST /auth/logout/", 204, emp.post("auth/logout/", json={"refresh": emp.refresh}))
check("Empleado", "Sesión", "Access tras logout", 401, emp.get("auth/me/"))

with open(sys.argv[2] if len(sys.argv) > 2 else "matrix.json", "w", encoding="utf-8") as output:
    json.dump(ROWS, output, ensure_ascii=False, indent=1, default=str)
fails = [r for r in ROWS if not r["ok"]]
print(f"{len(ROWS)} comprobaciones, {len(ROWS)-len(fails)} OK, {len(fails)} fallos")
for f in fails: print("FALLO", f)
sys.exit(1 if fails else 0)
