# EnObra — Contacto (primera implementación)

Ruta pública: `/contacto` (admite `?asunto=Construcci%C3%B3n` para preseleccionar un servicio).

- Se respeta el contenido y la estructura de `contacto.html` del mockup `MockUp---enObra`, rama `servicios-actualizados`.
- Tailwind CSS 4 y Lucide React. CSS adicional limitado a cargar las fuentes.
- Formulario accesible con validación previa y errores por campo.
- Envía JSON mediante el servicio existente: `POST /api/v1/inquiries/contact/`.
- Campos enviados: `name`, `email`, `phone`, `subject`, `message`, `website` (honeypot vacío).
- La respuesta `501 not_implemented` **no** se considera envío exitoso; no se almacenan mensajes en `localStorage`.
- Teléfonos, dirección y contacto institucional se tomaron del mockup; el correo aún no está confirmado.
- No implementa el Header/Footer, que corresponden al layout compartido de Leo.

## Pruebas manuales

1. `npm --prefix frontend run lint`
2. `npm --prefix frontend run test`
3. `npm --prefix frontend run build`
4. `npm --prefix frontend run dev`; abrir `http://localhost:5173/contacto`.
5. Probar envío sin completar campos (validaciones), teléfono con 8 dígitos y asunto desde URL.
6. Con Django iniciado, comprobar que el servidor puede responder `501`; la interfaz debe mostrar que **no se envió**.
7. Cuando se conecte la persistencia, comprobar un `201` real para mostrar confirmación de recepción.

No subir ni fusionar hasta revisar los cambios en la rama `feature/news-admin-contact`.
