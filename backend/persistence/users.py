from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from apps.accounts.interfaces import UserRepository
from .access_control import DjangoAccessControlRepository
from .models.access import Rol, Usuario, UsuarioRol
from .models.audit import HistorialActividad
from .support import page_of


class DjangoUserRepository(UserRepository):
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
        return [roles._serialize_role(role) for role in Rol.objects.filter(estado=True).order_by('nombre')]

    @transaction.atomic
    def create(self, data, *, actor_id):
        role = Rol.objects.select_for_update().filter(pk=data['role_id'], estado=True).first()
        if role is None:
            raise ValidationError({'role_id': 'Selecciona un rol activo existente.'})
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
