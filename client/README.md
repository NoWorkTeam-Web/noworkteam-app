# NO WORK TEAM · App lista para Render

Esta versión está preparada para desplegarse en **Render** con un único servicio web.

## Qué incluye
- Frontend React + Vite
- Backend Express
- Panel admin con crear, editar y borrar productos
- Subida de imágenes
- PWA instalable en iPhone
- Catálogo inicial inspirado en noworkteam.es

## Probar en local

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Desplegar en Render

### Opción rápida
1. Sube esta carpeta a un repositorio de GitHub.
2. En Render crea un **Web Service**.
3. Conecta tu repositorio.
4. Usa esta configuración:

**Build Command**
```bash
npm install && npm run build
```

**Start Command**
```bash
npm start
```

### Variables de entorno
No necesita ninguna para la prueba inicial.

### Qué hace en producción
- Render ejecuta `npm run build` y genera `client/dist`
- Express sirve la API en `/api`
- Express también sirve el frontend compilado y los archivos de `/uploads`

## Instalarla en iPhone
1. Abre la URL pública de Render en Safari.
2. Pulsa **Compartir**.
3. Pulsa **Añadir a pantalla de inicio**.

## Estructura
- `client/` → frontend
- `server/` → backend
- `server/data/products.json` → productos
- `server/uploads/` → imágenes subidas desde admin

## Nota importante
En Render, los archivos subidos y el JSON local funcionan bien para pruebas, pero no son la opción ideal para producción permanente. Para una versión final conviene mover productos e imágenes a una base de datos y a un almacenamiento externo.


## Editor visual de diseño

La app incluye un botón **Diseño** desde el que puedes cambiar sin tocar código:

- nombre de marca y tagline
- texto principal de portada
- colores principales
- fondo y color de tarjetas
- logo
- imagen principal de portada
- mensaje promocional

Los cambios se guardan en `server/data/settings.json`.
