# NO WORK TEAM · app moderna + Stripe test + base móvil

Esta versión incluye:

- catálogo importado desde páginas públicas de noworkteam.es
- varias fotos reales de producto enlazadas desde la web pública
- editor visual dentro de la app
- panel admin para crear / editar / borrar productos
- checkout con Stripe en modo prueba
- PWA instalable
- configuración base de Capacitor para iPhone y Android

## Desarrollo

```bash
npm install
npm run dev
```

## Producción / Render

```bash
npm install
npm run build
npm start
```

En Render:

- Build Command: `npm install && npm run build`
- Start Command: `npm start`

## Variables de entorno para Stripe test

Crea estas variables en Render o en tu entorno local:

```bash
STRIPE_SECRET_KEY=sk_test_xxx
PUBLIC_BASE_URL=https://tu-app.onrender.com
```

Si `STRIPE_SECRET_KEY` no existe, el botón de pagar mostrará un mensaje indicando que falta activar Stripe test.

## App iPhone / Android con Capacitor

Instala dependencias:

```bash
npm install
```

Sincroniza web + móvil:

```bash
npm run mobile:build
```

Abrir iOS:

```bash
npm run mobile:ios
```

Abrir Android:

```bash
npm run mobile:android
```

> Para publicar en App Store / Google Play necesitarás tus cuentas de desarrollador, certificados y firma final de la app.

## Notas sobre la importación

La importación incluida es una base inicial preparada a partir de contenido público verificable. Para una sincronización completa y fiable de todo el catálogo, lo ideal es conectar CSV, base de datos o API propia.

deploy update