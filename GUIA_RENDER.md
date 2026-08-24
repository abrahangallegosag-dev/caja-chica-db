# Guía: desplegar Caja Chica en Render con PostgreSQL

## QUÉ ARCHIVOS SUBIR A GITHUB (todos estos, tal cual)

```
cajachica-db/
├── server.js            ← backend
├── package.json         ← dependencias
├── package-lock.json    ← (si está)
├── .gitignore
├── db/
│   ├── schema.sql       ← tablas + códigos iniciales
│   └── init.js          ← script para crear las tablas
└── public/
    └── index.html       ← la app (Versión 3.1)
```

NO subas: la carpeta `node_modules` (se instala sola en Render) ni ninguna
carpeta rara tipo `{public,db}` si aparece (bórrala, fue un error de copiado).

Similar a como desplegaste el gestor de tareas. Pasos:

## 1. Crear la base de datos PostgreSQL en Render
1. Entra a https://dashboard.render.com
2. New → **PostgreSQL**
3. Nombre: `cajachica-db` · Plan: **Free**
4. Create Database.
5. Cuando esté lista, copia el **Internal Database URL** (empieza con `postgres://...`).

## 2. Subir el código a GitHub
1. Crea un repo nuevo (ej: `caja-chica-db`).
2. Sube todos estos archivos (server.js, package.json, /db, /public).

## 3. Crear el Web Service en Render
1. New → **Web Service** → conecta el repo de GitHub.
2. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - Plan: **Free**
3. En **Environment** agrega la variable:
   - `DATABASE_URL` = (el Internal Database URL que copiaste en el paso 1)
4. Create Web Service.

## 4. Inicializar las tablas (una sola vez)
Cuando el servicio esté desplegado, abre la pestaña **Shell** en Render y ejecuta:
```
npm run initdb
```
Esto crea las tablas y carga los códigos iniciales (ADM000, OP000, SO000, ISLA).
Verás: "Base de datos inicializada correctamente."

## 5. Listo
Abre la URL del servicio. La app carga los catálogos desde la base de datos.

---

## Notas
- **Persistencia:** a diferencia del `data.json`, aquí las facturas y el historial
  se guardan en PostgreSQL y NO se borran cuando el servicio se duerme.
- **El servicio Free se duerme** tras 15 min de inactividad; la primera carga tras
  dormir tarda ~30 seg en despertar. La base de datos siempre conserva los datos.
- **Agregar códigos nuevos:** desde la app (una vez conectemos el frontend) o
  directamente por SQL en la Shell de Render.
- **Cambiar los códigos iniciales:** edita `db/schema.sql` antes del paso 4, o
  agrégalos luego desde la app.
