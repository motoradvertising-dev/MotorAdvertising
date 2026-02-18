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

1.  Sube tu repositorio a GitHub.
2.  En Railway, crea un nuevo proyecto desde el repo de GitHub.
3.  Configuración de Railway:
    *   **Root Directory**: `back-end`
    *   **Start command**: `npm start`
    *   **Build command**: `npm install`
4.  Añade las variables de entorno de `.env.example` en la pestaña **Variables** de Railway.

## Endpoints

*   `POST /api/contact/empresa`: Envío de datos para perfil empresa.
*   `POST /api/contact/profesional`: Envío de datos para perfil trabajador/profesional.
*   `GET /health`: Verificación del estado del servidor.
