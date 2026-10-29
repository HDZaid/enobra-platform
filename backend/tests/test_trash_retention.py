"""P-02: retención temporal, restauración, auditoría y ejecución programada."""
import io
from datetime import timedelta
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from persistence.catalog import DjangoProjectRepository, DjangoPropertyRepository
from persistence.models import ContenidoPagina, HistorialActividad, MensajeContacto, UsuarioRol
from persistence.support import read_data, write_data
from tests import test_admin_api as admin


class TrashRetentionTests(TestCase):
    setUpTestData = classmethod(admin.AdminAPITests.setUpTestData.__func__)
    setUp = admin.AdminAPITests.setUp
    payload = admin.AdminAPITests.payload
    create = admin.AdminAPITests.create

    def trashed(self, kind, when):
        repo = DjangoProjectRepository() if kind == "projects" else DjangoPropertyRepository()
        item = self.create(kind)
        repo.delete(item['id'], deleted_by=self.user.pk)
        obj = repo.model.objects.get(**{repo.identifier: item['id']})
        key = repo._meta_key(obj)
        extra = read_data(key)
        extra['trash']['trashed_at'] = when.isoformat() if hasattr(when, 'isoformat') else when
        write_data(key, extra, self.user.pk)
        return repo, item['id'], obj.pk, key

    def test_strictly_more_than_90_days_for_both_types(self):
        now = timezone.now()
        for kind in ('projects', 'properties'):
            for age, expected in ((timedelta(days=90), 0),
                                  (timedelta(days=90, microseconds=1), 1),
                                  (timedelta(days=89), 0)):
                with self.subTest(kind=kind, age=age):
                    repo, key, pk, meta = self.trashed(kind, now - age)
                    with patch('persistence.catalog.timezone.now', return_value=now):
                        self.assertEqual(repo.purge_expired_trash(deleted_by=self.user.pk, dry_run=False), expected)
                    self.assertEqual(repo.model.objects.filter(pk=pk).exists(), not expected)
                    self.assertEqual(ContenidoPagina.objects.filter(clave=meta).exists(), not expected)
                    if expected:
                        event = HistorialActividad.objects.get(modulo=kind, id_registro=pk, accion='ELIMINAR_PERMANENTE')
                        self.assertEqual(event.usuario_id, self.user.pk)
                        self.assertIn('90 días', event.descripcion)

    def test_invalid_naive_future_and_missing_dates_never_delete(self):
        for value in ('not-a-date', '2026-02-31T00:00:00Z', '2020-01-01T00:00:00',
                      '2020-01-01', None, 42, (timezone.now() + timedelta(days=1)).isoformat()):
            self.trashed('projects', value)
        self.assertEqual(DjangoProjectRepository().purge_expired_trash(deleted_by=self.user.pk, dry_run=False), 0)

    def test_restore_and_retrash_restart_the_period(self):
        repo, key, pk, meta = self.trashed('projects', timezone.now() - timedelta(days=100))
        repo.restore(key, restored_by=self.user.pk)
        self.assertEqual(repo.purge_expired_trash(deleted_by=self.user.pk, dry_run=False), 0)
        repo.delete(key, deleted_by=self.user.pk)
        self.assertEqual(repo.purge_expired_trash(deleted_by=self.user.pk, dry_run=False), 0)
        self.assertTrue(repo.model.objects.filter(pk=pk).exists())

    def test_rechecks_after_candidate_was_restored(self):
        repo, key, pk, meta = self.trashed('projects', timezone.now() - timedelta(days=100))
        original = repo.delete_permanently
        def restore_first(*args, **kwargs):
            repo.restore(key, restored_by=self.user.pk)
            return original(*args, **kwargs)
        with patch.object(repo, 'delete_permanently', side_effect=restore_first):
            self.assertEqual(repo.purge_expired_trash(deleted_by=self.user.pk, dry_run=False), 0)
        self.assertTrue(repo.model.objects.filter(pk=pk).exists())

    def test_published_rows_and_untrashed_drafts_are_preserved(self):
        self.create('projects', published=False)
        repo, key, pk, meta = self.trashed('projects', timezone.now() - timedelta(days=100))
        repo.model.objects.filter(pk=pk).update(publicado=True)
        self.assertEqual(repo.purge_expired_trash(deleted_by=self.user.pk, dry_run=False), 0)
        self.assertEqual(repo.model.objects.count(), 2)

    def test_audit_failure_rolls_back_data_and_metadata(self):
        repo, key, pk, meta = self.trashed('projects', timezone.now() - timedelta(days=100))
        with patch('persistence.catalog.audit', side_effect=RuntimeError('audit unavailable')):
            with self.assertRaises(RuntimeError):
                repo.purge_expired_trash(deleted_by=self.user.pk, dry_run=False)
        self.assertTrue(repo.model.objects.filter(pk=pk).exists())
        self.assertTrue(ContenidoPagina.objects.filter(clave=meta).exists())

    def test_dry_run_has_no_writes_and_execution_is_idempotent(self):
        repo, key, pk, meta = self.trashed('properties', timezone.now() - timedelta(days=100))
        previous = HistorialActividad.objects.count()
        output = io.StringIO()
        call_command('purge_expired_trash', stdout=output)
        self.assertIn('simulación', output.getvalue())
        self.assertTrue(repo.model.objects.filter(pk=pk).exists())
        self.assertEqual(HistorialActividad.objects.count(), previous)
        call_command('purge_expired_trash', execute=True, actor_id=self.user.pk, stdout=io.StringIO())
        self.assertFalse(repo.model.objects.filter(pk=pk).exists())
        count = HistorialActividad.objects.count()
        call_command('purge_expired_trash', execute=True, actor_id=self.user.pk, stdout=io.StringIO())
        self.assertEqual(HistorialActividad.objects.count(), count)

    def test_command_rejects_missing_inactive_or_unprivileged_actor(self):
        self.trashed('projects', timezone.now() - timedelta(days=100))
        for actor in (None, 999999):
            with self.assertRaises(CommandError):
                call_command('purge_expired_trash', execute=True, actor_id=actor)
        self.user.estado = 'INACTIVO'
        self.user.save(update_fields=['estado'])
        with self.assertRaises(CommandError):
            call_command('purge_expired_trash', execute=True, actor_id=self.user.pk)
        UsuarioRol.objects.filter(usuario=self.other).delete()
        with self.assertRaises(CommandError):
            call_command('purge_expired_trash', execute=True, actor_id=self.other.pk)

    def test_limit_and_relations(self):
        for _ in range(2):
            repo, key, pk, meta = self.trashed('projects', timezone.now() - timedelta(days=100))
        first = repo.model.objects.order_by('pk').first()
        message = MensajeContacto.objects.create(nombre='Prueba', correo='test@example.com', mensaje='Consulta', proyecto=first)
        self.assertTrue(first.videos.exists())
        self.assertEqual(repo.purge_expired_trash(deleted_by=self.user.pk, dry_run=False, limit=1), 1)
        message.refresh_from_db()
        self.assertIsNone(message.proyecto_id)
        self.assertEqual(repo.model.objects.count(), 1)
        with self.assertRaises(CommandError):
            call_command('purge_expired_trash', limit=0)
