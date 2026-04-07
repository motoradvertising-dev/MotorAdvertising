                    # Guía de Configuración de Correos y Conexión

Para que el formulario de creación de cuenta envíe exitosamente los correos a **motoradvertisingservice@gmail.com**, hay dos aspectos importantes a resolver:

1. El error *"No se pudo conectar con el servidor"*.
2. La configuración del servicio de emails desde Gmail.

Aquí tienes los pasos a seguir:

## Paso 1: Actualizar el servidor (Resolver el error de conexión)
El error que ves en la pantalla ocurre porque el servidor (alojado en Railway u otro servicio) estaba bloqueando la página web por no tener el dominio configurado en su lista de **CORS** (orígenes seguros). 
**Ya he corregido esto en el código de tu archivo `back-end/src/index.js`**, agregando `https://motoradvertising.co` a la lista de orígenes permitidos.

**Lo que tú debes hacer:**
Deberás guardar los cambios locales del proyecto en Git y subirlos a tu servidor (ej: `git add .`, `git commit -m "Fix CORS"`, `git push`) para que Railway se despliegue nuevamente con la solución.

---

## Paso 2: Crear una Contraseña de Aplicación en Google
Por políticas de seguridad, Google no te permite usar tu contraseña normal de inicio de sesión para enviar correos automáticos usando Nodemailer en un backend. Debes generar una contraseña especial para aplicaciones:

1. Ve a los ajustes de tu cuenta de Google e inicia sesión con **motoradvertisingservice@gmail.com**: [Gestionar cuenta de Google](https://myaccount.google.com/)
2. Ve a la sección **Seguridad**.
3. Asegúrate de tener activada la **Verificación en 2 pasos**. Si no lo está, actívala (te pedirá tu número de celular).
4. Luego, en la misma sección de Seguridad (o usando la barra de búsqueda superior en tu cuenta de Google y buscando "Contraseñas de aplicaciones"), ve a **Contraseñas de aplicaciones** (App passwords).
5. En la lista desplegable de aplicación, elige **Otra (Nombre personalizado)**, por ejemplo "Backend Motor Advertising" y presiona en **Generar**.
6. Te aparecerá una contraseña en un cuadro amarillo de 16 caracteres (ejemplo: `abcd efgh ijkl mnop`). **Cópiala**, la necesitarás en el paso 3.

---

## Paso 3: Configurar las variables en tu servidor (Railway)
El backend que envía los correos necesita saber qué correo y contraseña usar.

Debes entrar al panel de administración donde está alojado tu backend de Node.js (según la URL en tu código, es en **Railway**).
1. En Railway, entra a tu proyecto y selecciona el servicio de backend.
2. Ve a la pestaña de **Variables** (Environment Variables).
3. Agrega las siguientes variables:

- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `465`
- `SMTP_USER` = `motoradvertisingservice@gmail.com`
- `SMTP_PASS` = *(La contraseña de 16 letras que generaste en el Paso 2 sin espacios)*
- `NOTIFY_TO_EMAIL` = `motoradvertisingservice@gmail.com` *(o a cualquier otro correo donde quieras que te lleguen las notificaciones)*

Una vez añadidas o actualizadas estas variables, Railway volverá a desplegar el servidor de forma automática. Cuando termine y hayas subido los cambios a Git del Paso 1, prueba nuevamente enviar el formulario. Todo llegará organizado a tu correo.
