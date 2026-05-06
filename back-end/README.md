# Motor Advertising Backend

Backend desarrollado con Node.js y Express para gestionar las solicitudes de contacto de Motor Advertising.

## Instalación

1.  Entra en la carpeta: `cd back-end`
2.  Instala las dependencias: `npm install`
3.  Configura las variables de entorno: `cp .env.example .env` (y edita los valores).

## Desarrollo

```bash
npm run dev
```

El servidor correrá en [http://localhost:3001](http://localhost:3001).

## Despliegue en Railway

El proyecto está configurado como un monorepo donde Railway ejecuta el backend, y el backend se encarga de servir los archivos estáticos del frontend.

1. **Variables de Entorno Requeridas en Railway:**
   * `NOTIFY_TO_EMAIL`: Correo donde recibirás las notificaciones (ej. `motoradvertisingservice@gmail.com`).
   * `RESEND_API_KEY`: Llave de la API de [Resend.com](https://resend.com) (empieza con `re_...`). **Railway bloquea los puertos SMTP salientes (25, 465, 587)**, por lo que usamos la API HTTP de Resend para el envío de correos.

2. **Arquitectura y Enrutamiento:**
   * **Frontend:** Servido estáticamente usando `express.static` desde la raíz del proyecto.
   * **Catch-all SPA:** La ruta `app.get('*')` devuelve `index.html` para manejar recargas de página sin devolver errores 404.
   * **APIs:** Accesibles bajo `/api/*`. Para evitar bloqueos CORS y problemas de CSP, el frontend se comunica con el backend usando URLs relativas (ej. `fetch('/api/contact/empresa')`).
   * **Rendimiento y Seguridad:** Implementado con `compression` (Gzip/Brotli) para minificar payloads y `helmet` con políticas CSP (`Content-Security-Policy`) personalizadas que permiten cargar tipografías, iconos y videos de CDNs externos sin ser bloqueados.

## Endpoints

*   `POST /api/contact/empresa`: Envío de datos para perfil empresa.
*   `POST /api/contact/profesional`: Envío de datos para perfil trabajador/profesional.
*   `POST /api/contact/cuenta`: Envío de datos para configuración de cuenta.
*   `GET /api/ping`: Endpoint de prueba (devuelve `{"pong":true}`).
*   `GET /health`: Verificación del estado del servidor.

## Registro de Cambios (Mayo 2026)
* Migración completa de envío de correos de Nodemailer (SMTP) a la API de Resend para bypass del firewall de Railway.
* El frontend y backend operan unificados bajo el mismo servidor Express y puerto, eliminando cruces CORS y reduciendo la latencia de la aplicación.
* Los correos fallidos ya no rompen la experiencia del usuario; las excepciones de Resend se capturan silenciosamente mientras el cliente siempre recibe una confirmación exitosa (y los payloads quedan persistidos en los logs de Railway).
