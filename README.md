# POMPY — Lencería y Sex Shop

Tienda online de lencería y sex-shop con catálogo dinámico y panel de
administración. Desplegada en **Vercel** con almacenamiento de datos en
**GitHub** (archivos JSON + imágenes).

🔗 **Producción:** [pompyshop.vercel.app](https://pompyshop.vercel.app)

---

## ✨ Características

- **Catálogo público** con filtros por categoría, disponibilidad, búsqueda y
  ordenamiento (precio, nombre).
- **Productos destacados** con carrusel de arrastre horizontal.
- **Vista individual de producto** con galería de imágenes y consulta por
  WhatsApp.
- **Panel de administración** (`/admin.html`) con:
  - Autenticación con contraseña + sesión cookie segura.
  - CRUD completo de productos (crear, editar, eliminar).
  - Gestión de banners.
  - Subida y gestión de imágenes.
- **Almacenamiento sin base de datos**: los datos del catálogo se guardan en
  archivos JSON dentro del repositorio mediante la GitHub Contents API.
- **PWA** con favicons y `site.webmanifest`.

---

## 🛠️ Stack tecnológico

| Capa           | Tecnología                              |
|----------------|-----------------------------------------|
| Frontend       | HTML, CSS, JavaScript (vanilla, ES modules) |
| Backend        | Vercel Serverless Functions (Node.js)   |
| Base de datos  | GitHub (JSON en el repositorio)          |
| Autenticación  | Sesión cookie `HttpOnly` + `crypto`  |
| Hosting        | Vercel                                  |

---

## 📁 Estructura del proyecto

```
pompy/
├── api/
│   ├── crud.js              → Endpoint serverless (POST: AUTH, SESSION, LOGOUT, GET, PUT)
│   └── lib/
│       ├── auth.js          → Sesiones, cookies, comparación segura de contraseñas
│       └── github.js        → Proxy a GitHub Contents API (GET/PUT archivos)
├── data/
│   ├── productos.json       → Catálogo de productos (fuente de datos principal)
│   ├── banners.json         → Banners del home
│   ├── productos1.json      → Backup
│   └── productos2.json      → Backup
├── public/
│   ├── index.html           → Catálogo público
│   ├── admin.html           → Panel de administración
│   ├── producto.html        → Vista individual de producto
│   ├── css/
│   │   ├── index.css
│   │   └── admin.css
│   ├── js/
│   │   ├── api.js           → Cliente HTTP de la API (fetch con timeout)
│   │   ├── index.js         → Lógica del catálogo público
│   │   ├── productos.js     → Lógica de productos (admin)
│   │   ├── productos-persistencia.js → Carga/guardado desde la API
│   │   ├── productos-imagenes.js
│   │   ├── ui.js            → Renderizado de tabla y formulario (admin)
│   │   ├── banners.js       → Gestión de banners
│   │   ├── admin.js         → Controlador del panel
│   │   ├── admin-auth.js    → Autenticación del panel
│   │   ├── admin-banners.js
│   │   ├── admin-imagenes.js
│   │   ├── admin-navegacion.js
│   │   └── imageOptimizer.js
│   ├── imagenes/            → Imágenes de productos (274 archivos)
│   └── favicon*             → Favicons y manifest PWA
└── .gitignore
```

---

## 🚀 Puesta en marcha

### Prerrequisitos

- Node.js 18+
- Cuenta de Vercel
- Token de GitHub con acceso al repositorio

### Variables de entorno (Vercel)

Configura las siguientes variables en el panel de Vercel:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxx        # Token de GitHub (PAT)
GITHUB_REPO=brianmateocabrera/pompy   # Owner/repo del repositorio
ADMIN_PASSWORD=tu_contraseña_secreta  # Contraseña del panel de admin
```

> ⚠️ **Nunca commitear el archivo `.env`**. El `.gitignore` ya lo excluye.

### Desarrollo local

```bash
# Instalar Vercel CLI (si no está instalado)
npm i -g vercel

# Clonar el repositorio
git clone https://github.com/brianmateocabrera/pompy.git
cd pompy

# Configurar variables de entorno locales
# Crear .env o configurarlas con vercel env pull

# Iniciar servidor de desarrollo
npm run dev
```

### Despliegue

```bash
npm run deploy
```

---

## 🔒 Seguridad

- **Autenticación**: comparación de contraseñas con `crypto.timingSafeEqual`
  (resistente a timing attacks).
- **Sesiones**: token aleatorio de 32 bytes (`crypto.randomBytes`) con
  expiración de 8 horas.
- **Cookies**: `HttpOnly`, `Secure`, `SameSite=Strict`.
- **Validación de rutas**: solo se permite escribir en
  `data/productos.json`, `data/banners.json` y `public/imagenes/`.
- **Escapado HTML** en todo el contenido dinámico del frontend (anti XSS).

---

## 📦 Endpoints de la API

### `POST /api/crud`

Todos los requests usan `POST` con un campo `action` en el body:

| Action     | Descripción                          | Requiere sesión |
|------------|--------------------------------------|-----------------|
| `AUTH`    | Autenticar con contraseña            | No              |
| `SESSION` | Verificar si la sesión es válida     | No              |
| `LOGOUT`  | Cerrar sesión                        | No              |
| `GET`     | Obtener un archivo del repo          | No              |
| `PUT`     | Crear o actualizar un archivo        | Sí              |

---

## 📝 Licencia

**Propietaria — Todos los derechos reservados.**

Ver [LICENSE](LICENSE).

Copyright (c) 2026 Brian Cabrera.
