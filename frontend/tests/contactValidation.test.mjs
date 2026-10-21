import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildContactPayload,
  getContactSubject,
  validateContact,
} from '../src/features/contact/services/contactValidation.js';

const valid = {
  name: 'Ana Pérez', email: 'ana@example.com', phone: '7763-2054',
  subject: 'Diseño', message: 'Quisiera hablar de mi proyecto.', website: '',
};

test('valida los cinco campos obligatorios', () => {
  const errors = validateContact({ name: '', email: '', phone: '', subject: '', message: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'message', 'name', 'phone', 'subject']);
});

test('acepta un contacto válido y normaliza teléfono de Guatemala', () => {
  assert.deepEqual(validateContact(valid), {});
  assert.equal(buildContactPayload(valid).phone, '77632054');
});

test('rechaza formatos inválidos de correo, teléfono y mensajes largos', () => {
  const errors = validateContact({ ...valid, email: 'no-correo', phone: '123', message: 'x'.repeat(2001) });
  assert.ok(errors.email);
  assert.ok(errors.phone);
  assert.ok(errors.message);
});

test('usa el asunto de la URL solo cuando está permitido', () => {
  assert.equal(getContactSubject('?asunto=Construcci%C3%B3n'), 'Construcción');
  assert.equal(getContactSubject('?asunto=Otro'), 'Otro');
  assert.equal(getContactSubject('?asunto=No%20existe'), 'Diseño');
});

test('rechaza el campo oculto cuando se llena', () => {
  assert.ok(validateContact({ ...valid, website: 'spam.test' }).website);
});


test('rechaza correos que exceden el contrato del backend', () => {
  const email = 'a'.repeat(60) + '@' + 'b'.repeat(60) + '.' + 'c'.repeat(40) + '.com';
  assert.ok(validateContact({ ...valid, email }).email);
});
