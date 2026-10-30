from django.contrib.auth.hashers import make_password, is_password_usable
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.access_policy import fixed_role_name, fixed_permissions
from .accounts import DjangoAuthService
from apps.accounts.interfaces import UserRepository
from .access_control import DjangoAccessControlRepository
from .models.access import Rol, Usuario, UsuarioRol
from .models.audit import HistorialActividad
from .support import page_of


class DjangoUserRepository(UserRepository):
    @staticmethod
    def _lock_engineer_role():
        return list(Rol.objects.select_for_update().filter(estado=True).order_by('pk'))

    @staticmethod
    def _protect_last_engineer(user, roles, field):
        admin_ids = [role.pk for role in roles if fixed_role_name(role.nombre) == 'Administrador']
        if user.estado != 'ACTIVO' or not user.roles.filter(pk__in=admin_ids).exists():
            return
        if not Usuario.objects.filter(estado='ACTIVO', roles__in=admin_ids).exclude(pk=user.pk).exists():
            raise ValidationError({field: 'Debe conservarse al menos un Administrador activo.'})

    @transaction.atomic
    def update(self, user_id, data, *, actor_id):
        principal = DjangoAuthService()._principal(actor_id)
        if principal is None or not principal.has_permission('users.manage'):
            raise PermissionDenied('No puedes administrar usuarios.')
        engineer = self._lock_engineer_role()
        user = Usuario.objects.select_for_update().filter(pk=user_id).first()
        if user is None:
            return None
        if not principal.has_permission('admin.all') and any(fixed_role_name(name) == 'Administrador' for name in user.roles.values_list('nombre', flat=True)):
            raise PermissionDenied('Solo Administrador puede modificar una cuenta administradora.')
        if not is_password_usable(user.password_hash):
            raise PermissionDenied('La cuenta técnica no se administra desde el panel.')
        if data.get('active') is False:
            if str(user.pk) == str(actor_id):
                raise PermissionDenied('No puedes desactivarte a ti mismo.')
            self._protect_last_engineer(user, engineer, 'active')
        previous_name, previous_state = user.nombre, user.estado
        if 'name' in data:
            user.nombre = data['name']
        if 'active' in data:
            user.estado = 'ACTIVO' if data['active'] else 'INACTIVO'
        user.fecha_actualizacion = timezone.now()
        user.save(update_fields=['nombre', 'estado', 'fecha_actualizacion'])
        HistorialActividad.objects.create(usuario_id=actor_id, accion='EDITAR', modulo='users',
            id_registro=user.pk, nombre_registro=user.nombre,
            descripcion=f'Nombre: {previous_name} → {user.nombre}; estado: {previous_state} → {user.estado}')
        return self._serialize(user)

    @transaction.atomic
    def replace_role(self, user_id, role_id, *, actor):
        if not actor.has_permission('admin.all'):
            raise PermissionDenied('Solo Administrador puede asignar roles.')
        engineer = self._lock_engineer_role()
        user = Usuario.objects.select_for_update().filter(pk=user_id).first()
        if user is None:
            return None
        if not is_password_usable(user.password_hash):
            raise PermissionDenied('La cuenta técnica no se reasigna desde el panel.')
        if str(user.pk) == str(actor.id):
            raise PermissionDenied('No puedes cambiar tu propio rol.')
        role = Rol.objects.select_for_update().filter(pk=role_id, estado=True).first()
        if role is None:
            raise ValidationError({'role_id': 'Selecciona un rol activo existente.'})
        if not fixed_role_name(role.nombre):
            raise ValidationError({'role_id': 'Selecciona un rol predeterminado existente.'})
        permissions = set(fixed_permissions(role.nombre))
        if not actor.has_permission('admin.all') and not permissions.issubset(actor.permissions):
            raise PermissionDenied('No puedes asignar un rol con permisos que no posees.')
        if fixed_role_name(role.nombre) != 'Administrador':
            self._protect_last_engineer(user, engineer, 'role_id')
        previous_roles = ', '.join(user.roles.order_by('nombre').values_list('nombre', flat=True)) or 'Sin rol'
        UsuarioRol.objects.filter(usuario=user).exclude(rol=role).delete()
        UsuarioRol.objects.get_or_create(usuario=user, rol=role)
        user.fecha_actualizacion = timezone.now()
        user.save(update_fields=['fecha_actualizacion'])
        HistorialActividad.objects.create(usuario_id=actor.id, accion='ROL', modulo='users',
            id_registro=user.pk, nombre_registro=user.nombre,
            descripcion=f'Rol anterior: {previous_roles[:350]}; rol nuevo: {role.nombre}')
        return self._serialize(user)

    @staticmethod
    def _serialize(user):
        roles = DjangoAccessControlRepository()
        return {'id': str(user.pk), 'name': user.nombre, 'email': user.correo,
                'active': user.estado == 'ACTIVO', 'created_at': user.fecha_creacion,
                'roles': [roles._serialize_role(role) for role in user.roles.all()]}

    def list(self, *, q, page, page_size):
        rows = Usuario.objects.prefetch_related('roles__permisos').order_by('-fecha_creacion', '-pk')
        if q:
            rows = rows.filter(Q(nombre__icontains=q) | Q(correo__icontains=q))
        return page_of(rows, page, page_size, self._serialize)

    def role_options(self):
        roles = DjangoAccessControlRepository()
        options = {}
        for role in Rol.objects.filter(estado=True).order_by('pk'):
            name = fixed_role_name(role.nombre)
            if name and name not in options:
                options[name] = roles._serialize_role(role)
        return [options[name] for name in ('Administrador', 'Empleado', 'Arquitecto') if name in options]

    @transaction.atomic
    def create(self, data, *, actor_id):
        principal = DjangoAuthService()._principal(actor_id)
        if principal is None or not principal.has_permission('admin.all'):
            raise PermissionDenied('Solo Administrador puede crear usuarios.')
        role = Rol.objects.select_for_update().filter(pk=data['role_id'], estado=True).first()
        if role is None:
            raise ValidationError({'role_id': 'Selecciona un rol activo existente.'})
        if not fixed_role_name(role.nombre):
            raise ValidationError({'role_id': 'Selecciona un rol predeterminado existente.'})
        email = data['email'].strip().lower()
        if Usuario.objects.filter(correo__iexact=email).exists():
            raise ValidationError({'email': 'Ya existe un usuario con este correo.'})
        try:
            with transaction.atomic():
                user = Usuario.objects.create(nombre=data['name'], correo=email,
                    password_hash=make_password(data['password']),
                    estado='ACTIVO' if data.get('active', True) else 'INACTIVO')
        except IntegrityError:
            raise ValidationError({'email': 'No se pudo crear el usuario. Comprueba si el correo ya existe.'}) from None
        UsuarioRol.objects.create(usuario=user, rol=role)
        HistorialActividad.objects.create(usuario_id=actor_id, accion='CREAR', modulo='users',
            id_registro=user.pk, nombre_registro=user.nombre, descripcion=f'Rol asignado: {role.nombre}')
        return self._serialize(user)
