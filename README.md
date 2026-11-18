# INTI FINANZAS · guía de lanzamiento

Aplicación web de control de ventas, gastos, deudas e impuestos (Perú) con cuentas de usuario.
**Arquitectura:** sitio estático (HTML/JS, sin servidor propio) + Supabase (PostgreSQL, login y seguridad por usuario).
Los datos de cada usuario se guardan en tu base de datos en línea y solo él puede leerlos (RLS).

```
index.html              página de inicio (SEO, una sola llamada a la acción, WhatsApp)
app.html + app.js       la aplicación (login, panel, registro, importación, deudas, impuestos)
config.js               URL y clave pública de Supabase  ← lo editas tú
terminos.html · privacidad.html · cookies.html   borradores legales con {{campos}} por completar
404.html · robots.txt · sitemap.xml · favicon.svg
_headers                seguridad HTTP (CSP, HSTS...) para Cloudflare Pages / Netlify
supabase/schema.sql     tablas, seguridad, validaciones, parámetros de impuestos
supabase/functions/pago-webhook/   activa el plan Pro cuando tu pasarela confirma un cobro
tests/app.test.js       pruebas (node tests/app.test.js)   ·   tests/loadtest.k6.js   prueba de carga
```

## Pasos (en este orden)

### 1. Crear la base de datos en línea
1. Entra a https://supabase.com, crea una cuenta y un proyecto nuevo. Región: la más cercana a tus usuarios (por ejemplo São Paulo).
2. **SQL Editor → New query →** pega todo `supabase/schema.sql` → **Run**. Es seguro repetirlo.
3. Verifica en **Table Editor** que existen: `movimientos`, `deudas`, `deuda_marcas`, `ajustes`, `perfiles`, `parametros`, `parametros_tributarios`, y que todas muestran RLS activado.

### 2. Configurar el login (Authentication)
- **URL Configuration:** *Site URL* = `https://tu-dominio.com`; *Redirect URLs* = `https://tu-dominio.com/app.html` y `http://localhost:8080/app.html`.
- **Providers → Email:** activa *Confirm email* y sube la longitud mínima de contraseña a 8 o más (idealmente exige letras y números). Si tu plan lo permite, activa la protección contra contraseñas filtradas.
- **Rate Limits:** déjalos activos (limitan intentos de acceso y envío de correos).
- **Correos reales:** el correo integrado de Supabase es solo para pruebas y tiene un límite muy bajo. Configura **SMTP propio** (Resend, Brevo, Amazon SES...) en *Authentication → SMTP* y traduce las plantillas (confirmación, recuperación) en *Email Templates*.

### 3. Conectar la app
Edita `config.js` con tu **Project URL** y la clave **anon public** (*Project Settings → API*).
Nunca pongas la clave `service_role` en el sitio.

Prueba en tu computadora:
```
python3 -m http.server 8080      # y abre http://localhost:8080/app.html
```
Crea una cuenta, confirma el correo, entra, completa Ajustes y registra una venta.

### 4. Publicar el sitio
1. Sube la carpeta a un repositorio de GitHub.
2. **Cloudflare Pages** (o Netlify): conecta el repositorio, *build command* vacío, directorio de salida `/` (raíz). Ya incluye CDN mundial y HTTPS.
3. Compra tu dominio y apúntalo al hosting (HTTPS se activa solo).
4. Reemplaza `TU-DOMINIO.com` en `index.html`, `sitemap.xml` y `robots.txt`. Envía el sitemap a Google Search Console.
5. Comprueba tus cabeceras en https://securityheaders.com (`_headers` ya trae CSP, HSTS, X-Frame-Options...). En Vercel necesitas pasar `_headers` a `vercel.json`.

### 5. Velocidad y menos dependencias (recomendado)
Descarga las librerías con versión fija y sírvelas desde tu propio dominio:
```
mkdir vendor
curl -o vendor/chart.umd.min.js    https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js
curl -o vendor/supabase.js         https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js
```
Cambia los `<script src>` de `app.html` a `vendor/...` y quita `https://cdn.jsdelivr.net` del `script-src` en `_headers`.
Lo mismo con la tipografía JetBrains Mono si quieres no depender de Google Fonts.

### 6. Legal (Perú)
- Completa los `{{campos}}` de `terminos.html`, `privacidad.html` y `cookies.html` y **haz que un abogado los revise** (Ley N.° 29733 de Protección de Datos Personales y su reglamento: consentimiento, derechos ARCO, flujo transfronterizo, y si debes inscribir el banco de datos ante la autoridad).
- Libro de Reclamaciones virtual si cobras por el servicio.
- Si agregas analítica con cookies, pide consentimiento antes de activarla (opciones sin cookies: Cloudflare Web Analytics, Plausible).
- Cambia el número de WhatsApp en `index.html`.

### 7. Cobros del plan Pro
1. Abre cuenta en una pasarela peruana (Culqi, Niubiz, Mercado Pago, etc.) y crea el enlace o checkout del plan.
2. Despliega la función: `supabase functions deploy pago-webhook --no-verify-jwt` y `supabase secrets set WEBHOOK_SECRET=...`.
3. **Adapta `pago-webhook/index.ts` a la firma oficial de tu pasarela** (el ejemplo solo valida una clave compartida y NO es suficiente para producción).
4. Pon el enlace de pago en `PAGO_URL` de `config.js`. La app envía `?ref=<id de usuario>` para que el webhook sepa a quién activar.
5. Programa el vencimiento diario: activa `pg_cron` y ejecuta la línea comentada al final de `schema.sql`.
6. Opcional: limita el plan gratuito con `update parametros set valor='200' where clave='limite_free_mensual';` (0 = sin límite).

### 8. Parámetros de impuestos (una vez al año)
Cuando SUNAT publique el cronograma y el MEF fije la UIT:
```sql
insert into public.parametros_tributarios (anio, uit, cronograma, nota)
values (2027, 5600, '["2|15,16,...","3|...", ... 12 textos ...]'::jsonb, 'UIT y cronograma 2027');
```
Formato de cada texto: `mes_de_pago|día para dígitos 0,1,2-3,4-5,6-7,8-9,BC`. Todos los usuarios lo reciben sin tocar el código.
(Los valores de ejemplo para 2027 de las pruebas NO son oficiales.)

### 9. Respaldos
- Activa los respaldos automáticos de Supabase (planes de pago) y haz además un volcado propio semanal: `pg_dump "postgresql://..." > respaldo.sql`. **Prueba restaurarlo** al menos una vez.
- El usuario puede descargar sus datos desde Ajustes (JSON).

### 10. Prueba de carga antes de abrir al público
```
k6 run -e SITE=https://tu-dominio.com -e SB=https://xxxx.supabase.co -e KEY=<anon> -e TOKEN=<jwt de un usuario de prueba> tests/loadtest.k6.js
```
Meta: errores < 1 % y p95 < 800 ms con 200 usuarios simultáneos. Hazla solo contra tu propio proyecto.
Invita primero a 10–20 usuarios reales.

### 11. Operación
- Revisa semanalmente *Reports* de Supabase (CPU, conexiones, almacenamiento) y los registros de errores.
- Sube de plan cuando el uso lo pida; no antes. El índice `(user_id, fecha_emision)` y la carga por ventana de 14 meses mantienen las consultas rápidas.
- Opcional: Sentry para errores del navegador.

## Seguridad: qué ya está resuelto y qué falta
**Resuelto:** contraseñas manejadas por Supabase Auth (no por esta app) · aislamiento por usuario con RLS · el plan no se puede modificar desde el navegador · validaciones y cálculo de IGV/detracción en el servidor · límite de intentos de acceso en la pantalla (5 intentos → 30 s) · exportar y eliminar cuenta · todo el texto del usuario se escapa antes de mostrarse · cabeceras de seguridad con CSP estricta en `script-src` (sin `'unsafe-inline'`, sin `onclick` en HTML) · protección contra inyección de fórmulas en exportación CSV.
**Pendiente / mejoras:** verificar la firma real de tu pasarela en `pago-webhook` · completar campos y revisión legal · prueba de penetración antes de escalar · ejecutar `supabase/schema.sql` en tu proyecto de Supabase.

## Lo que cubren las pruebas (`node tests/app.test.js`)
25 comprobaciones con una base de datos simulada: acceso y bloqueo por intentos, carga con paginación de 1,000 en 1,000, registro con factura y detracción, rechazo de factura sin RUC, alerta NRUS, deudas, ajustes, importación de tu CSV actual, límite de 2 MB y eliminación de cuenta.
