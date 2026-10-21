"""Diagnóstico legible de fallos de conexión a PostgreSQL (Supabase).

Traduce los errores de psycopg/Django a un mensaje en español que indica en qué
paso se detuvo el arranque, a qué servidor se intentó conectar y qué revisar.
Nunca muestra la contraseña de DATABASE_URL.
"""
import re
from urllib.parse import quote
from pathlib import Path

from django.conf import settings

SUPABASE_POOLER = re.compile(r"^aws-\d+-(?P<region>[a-z]+-[a-z]+-\d+)\.pooler\.supabase\.com$")
SUPABASE_DIRECT = re.compile(r"^db\.(?P<ref>[a-z0-9]+)\.supabase\.co$")


def database_target(alias="default", config=None):
    """Datos de conexión sin contraseña, tal como Django los usará."""
    config = settings.DATABASES.get(alias) or {} if config is None else config
    host = str(config.get("HOST") or "")
    user = str(config.get("USER") or "")
    target = {
        "configured": bool(config.get("ENGINE")) and "dummy" not in str(config.get("ENGINE")),
        "engine": str(config.get("ENGINE") or ""),
        "host": host,
        "port": str(config.get("PORT") or "5432"),
        "user": user,
        "name": str(config.get("NAME") or ""),
        "source": getattr(settings, "DATABASE_URL_SOURCE", "desconocido"),
        "project_ref": "",
        "region": "",
        "pooler": "",
    }
    pooler = SUPABASE_POOLER.match(host)
    direct = SUPABASE_DIRECT.match(host)
    if pooler:
        target["region"] = pooler.group("region")
        target["pooler"] = "Session pooler" if target["port"] == "5432" else "Transaction pooler"
        if "." in user:
            target["project_ref"] = user.split(".", 1)[1]
    elif direct:
        target["project_ref"] = direct.group("ref")
        target["pooler"] = "Conexión directa"
    return target


def describe_target(target):
    if not target["configured"]:
        return "sin base de datos configurada"
    text = f"{target['host']}:{target['port']} / base '{target['name']}' / usuario '{target['user']}'"
    if target["project_ref"]:
        extra = f"proyecto Supabase '{target['project_ref']}'"
        if target["region"]:
            extra += f", región {target['region']}"
        text += f" ({extra}, {target['pooler']})"
    return text


def _other_env_hint(target):
    """Avisa si otro .env del repositorio apunta a una base distinta (Django solo lee backend/.env)."""
    root_env = Path(settings.BASE_DIR).parent / ".env"
    if not root_env.is_file():
        return []
    try:
        content = root_env.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []
    match = re.search(r"^\s*DATABASE_URL\s*=\s*(\S+)", content, re.M)
    if not match:
        return []
    url = match.group(1)
    other = re.match(r"^[a-z+]+://(?P<user>[^:@/]+)(?::[^@]*)?@(?P<host>[^:/]+)", url)
    if not other:
        return []
    other_user, other_host = other.group("user"), other.group("host")
    if other_user == target["user"] and other_host == target["host"]:
        return []
    other_ref = other_user.split(".", 1)[1] if "." in other_user else other_user
    return [
        f"Ojo: el archivo {root_env} define otra base (usuario '{other_user}', proyecto '{other_ref}', "
        f"host {other_host}).",
        "Django NO lee ese archivo: solo usa backend/.env. Si esa es la base correcta del equipo, "
        "copia su DATABASE_URL a backend/.env.",
    ]


def _causes(message, target):
    """Devuelve (título, pasos sugeridos) según el texto del error."""
    lowered = message.lower()
    ref = target["project_ref"] or "<proyecto>"
    host = target["host"] or "<host>"

    if not target["configured"]:
        return "DATABASE_URL no está definida.", [
            "Crea backend/.env a partir de backend/.env.example (Copy-Item .env.example .env).",
            "Completa DATABASE_URL con la cadena de Supabase → Connect → Session pooler.",
        ]
    if "tenant" in lowered and "not found" in lowered:
        return f"El pooler de Supabase ({host}) no reconoce el proyecto '{ref}'.", [
            f"El identificador del proyecto en el usuario 'postgres.{ref}' puede estar mal escrito.",
            f"El host del pooler puede no corresponder a la región del proyecto "
            f"(se usó la región '{target['region'] or '?'}'; los proyectos nuevos usan hosts como aws-1-<región>).",
            "El proyecto pudo haberse pausado o eliminado: revísalo en https://supabase.com/dashboard.",
            "Solución: en Supabase abre el proyecto → botón Connect → 'Session pooler' y copia la cadena "
            "completa (usuario y host juntos) en DATABASE_URL de backend/.env.",
        ]
    if "password authentication failed" in lowered or "authentication failed" in lowered:
        return "El servidor de base de datos rechazó la contraseña del usuario.", [
            "Revisa la contraseña de la base (Supabase → Project Settings → Database → Reset password).",
            "Si la contraseña tiene caracteres como @ : / # ? %, escríbelos codificados en la URL "
            "(@ = %40, : = %3A, / = %2F, # = %23, ? = %3F, % = %25).",
        ]
    if "circuit breaker" in lowered or "too many authentication errors" in lowered:
        return "Supabase bloqueó temporalmente los intentos por demasiados errores de autenticación.", [
            "Espera unos minutos, corrige usuario/contraseña y vuelve a intentar.",
        ]
    if any(text in lowered for text in (
        "getaddrinfo failed", "could not translate host name", "name or service not known",
        "nodename nor servname", "no such host is known", "temporary failure in name resolution",
    )):
        return f"No se pudo resolver el nombre del servidor '{host}'.", [
            "Comprueba tu conexión a internet.",
            "Revisa que el host de DATABASE_URL esté bien escrito.",
        ]
    if "timeout" in lowered or "timed out" in lowered:
        return f"El servidor {host}:{target['port']} no respondió a tiempo.", [
            "La red puede estar bloqueando el puerto (frecuente en redes universitarias o de empresa).",
            "Prueba con otra red (por ejemplo, datos del celular) o con el puerto 6543 del Transaction pooler.",
        ]
    if "connection refused" in lowered:
        return f"El servidor {host}:{target['port']} rechazó la conexión.", [
            "Revisa el host y el puerto de DATABASE_URL.",
            "Si es una base local, verifica que PostgreSQL esté encendido.",
        ]
    if re.search(r'database ".*" does not exist', lowered):
        return f"La base '{target['name']}' no existe en ese servidor.", [
            "En Supabase el nombre de la base es 'postgres' (la parte final de DATABASE_URL).",
        ]
    if "max client" in lowered or "too many clients" in lowered or "remaining connection slots" in lowered:
        return "La base alcanzó el máximo de conexiones simultáneas.", [
            "Cierra otros servidores o scripts conectados y vuelve a intentar.",
        ]
    if "ssl" in lowered:
        return "Falló la negociación SSL con el servidor.", [
            "Supabase requiere SSL; no agregues sslmode=disable a DATABASE_URL.",
        ]
    return "Error de conexión no reconocido.", [
        "Lee el detalle técnico de abajo y revisa DATABASE_URL en backend/.env.",
    ]


def _redact_credentials(message):
    # Errors can echo complete DSNs. Never forward URL userinfo or password fields.
    message = re.sub(r"(?i)\b(?:postgres(?:ql)?(?:\+\w+)?|https?)://[^\s]+",
                     "[URL de conexión omitida]", message)
    message = re.sub(r"(?i)\b(password|passwd|pwd)\s*=\s*(?:'[^']*'|\"[^\"]*\"|[^\s,;]+)",
                     r"\1=[omitida]", message)
    for config in settings.DATABASES.values():
        password = str(config.get("PASSWORD") or "")
        if password:
            for value in sorted({password, quote(password, safe="")}, key=len, reverse=True):
                message = message.replace(value, "[omitida]")
    return message


def database_error_report(exc, *, stage, target=None):
    """Texto completo para imprimir en consola cuando falla la base de datos."""
    target = target or database_target()
    message = _redact_credentials(str(exc).strip())
    title, steps = _causes(message, target)
    first_line = next((line.strip() for line in message.splitlines() if line.strip()), type(exc).__name__)
    bar = "=" * 78
    lines = [
        "",
        bar,
        "[EnObra] NO SE PUDO CONECTAR A LA BASE DE DATOS",
        bar,
        f"Paso en el que se detuvo : {stage}",
        f"Qué falló               : {title}",
        f"Destino de la conexión  : {describe_target(target)}",
        f"DATABASE_URL leída de   : {target['source']}",
        "",
        "Qué revisar:",
        *[f"  {index}. {step}" for index, step in enumerate(steps, 1)],
    ]
    hint = _other_env_hint(target) if target["configured"] else []
    if hint:
        lines += ["", *hint]
    lines += [
        "",
        f"Detalle técnico ({type(exc).__name__}): {first_line}",
        "Para probar solo la conexión: python manage.py check_database",
        bar,
        "",
    ]
    return "\n".join(lines)
