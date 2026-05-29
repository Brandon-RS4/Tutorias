# Sistema de Gestión de Tutorías

Este es el repositorio completo del **Sistema de Gestión de Tutorías**, una aplicación web diseñada para administrar los planes de tutoría, asignación de tutores y tutorados, registro de asistencias, subida y evaluación de evidencias, y generación de reportes de acreditación.

El sistema se divide en dos partes principales:
- **Backend**: API RESTful construida con Node.js, Express y MongoDB.
- **Frontend**: Aplicación SPA construida con React, Vite y TailwindCSS.

---

## 🛠 Requisitos Previos

Para ejecutar este proyecto en tu computadora o en otro equipo, asegúrate de tener instalado:

1. **[Node.js](https://nodejs.org/es/)** (v18 o superior). Verifica tu versión con `node -v` y `npm -v`.
2. **[MongoDB](https://www.mongodb.com/)** local o una cuenta en **MongoDB Atlas** (para base de datos en la nube).
3. **Git** (opcional, para clonar el repositorio).

---

## 🚀 Guía de Instalación y Uso

A continuación, los pasos para ejecutar el proyecto desde cero en cualquier computadora.

### 1. Clonar / Copiar el Repositorio
Si recibiste este proyecto en un archivo ZIP, descomprímelo. Si lo vas a clonar desde Git, ejecuta:
```bash
git clone <url-del-repositorio>
cd gestion-tutorias
```

### 2. Configuración del Backend

Abre una terminal y navega a la carpeta del backend:
```bash
cd backend
```

**Instala las dependencias:**
```bash
npm install
```

**Configura las variables de entorno:**
Dentro de la carpeta `backend/`, busca o crea un archivo llamado `.env` y añade la siguiente configuración base:

```env
PORT=5000
NODE_ENV=development
# URI de conexión a MongoDB. Cambia por la tuya si usas MongoDB Atlas o Local.
MONGO_URI=mongodb+srv://<usuario>:<password>@cluster0.mongodb.net/tutorias_db?retryWrites=true&w=majority
JWT_SECRET=SECRETO_TUTORIAS_2026
JWT_EXPIRES_IN=8h
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE_MB=10
UMBRAL_ASISTENCIA_PCT=80
```

> **Nota:** La carpeta `uploads/` se creará automáticamente para guardar las evidencias en la raíz del proyecto.

**Ejecuta el servidor Backend:**
```bash
# Modo desarrollo (se reinicia automáticamente con los cambios)
npm run dev

# O si solo quieres iniciarlo de forma normal
npm start
```
*Si todo está correcto, verás un mensaje indicando: "Servidor corriendo en puerto 5000" y "Conectado a MongoDB".*

### 3. Configuración del Frontend

Abre **otra terminal** (no cierres la del backend) y navega a la carpeta del frontend:
```bash
cd frontend
```

**Instala las dependencias:**
```bash
npm install
```

**Configura la API (opcional):**
Por defecto, el frontend se comunica con el backend en `http://localhost:5000/api`. Si cambiaste el puerto del backend, ajusta la URL en el archivo `frontend/src/api/axios.js`.

**Ejecuta el servidor Frontend:**
```bash
npm run dev
```
*Esto iniciará Vite en `http://localhost:5173`. Abre este enlace en tu navegador para ver la aplicación.*

---

## 📚 Documentación de la API (Backend)

Todas las rutas del backend tienen como prefijo `/api`. A continuación, un resumen de los endpoints disponibles:

### 🔐 Autenticación (`/api/auth`)
- `POST /login` : Inicia sesión. Retorna un JWT y datos del usuario.
- `GET /me` : (Requiere Token) Obtiene el perfil del usuario autenticado.
- `POST /logout` : Cierra sesión.

### 👥 Usuarios (`/api/usuarios`)
*(Requieren autenticación y en su mayoría permisos administrativos)*
- `POST /` : Registra un nuevo usuario (Jefe, Director, etc.).
- `GET /` : Lista todos los usuarios.
- `GET /:id` : Obtiene el detalle de un usuario por su ID.
- `PATCH /:id/estado` : Activa o desactiva a un usuario.
- `POST /tutores/asignar` : Asigna un tutor a un grupo.
- `GET /tutores` : Obtiene los tutores filtrados (ej. por carrera).
- `POST /tutorados/asignar` : Asigna un tutorado a un tutor específico.
- `GET /tutores/:tutorId/tutorados` : Obtiene los tutorados de un tutor.

### 📅 Tutorías (Planes, Grupos y Sesiones) (`/api/tutorias`)
- `POST /planes` : Crea un nuevo plan de tutorías.
- `GET /planes` : Lista los planes existentes.
- `POST /planes/:planId/actividades` : Añade una actividad al plan.
- `POST /grupos` : Crea un nuevo grupo de tutoría.
- `GET /grupos` : Lista los grupos.
- `POST /grupos/:grupoId/sesiones` : Crea una nueva sesión para un grupo.
- `GET /grupos/:grupoId/sesiones` : Obtiene las sesiones de un grupo.
- `POST /sesiones/:sesionId/asistencias` : Captura o actualiza asistencias de una sesión.
- `PUT /sesiones/:sesionId/actividades/:actividadId` : Modifica una actividad agendada.
- `POST /acreditacion/:tutoradoId/plan/:planId` : Genera el formato de acreditación final.
- `GET /acreditacion/:formatoId` : Obtiene el reporte de acreditación generado.

### 📂 Evidencias (`/api/evidencias`)
- `POST /subir` : (Tutorado) Sube un archivo como evidencia. (Usa `multipart/form-data` con campo `archivo`).
- `GET /` : Lista evidencias filtrables.
- `GET /:id` : Obtiene los detalles de una evidencia.
- `PATCH /:id/evaluar` : (Tutor) Evalúa una evidencia asignándole calificación/estado y retroalimentación.
- `GET /tutorados/:tutoradoId` : Ve el historial de evidencias enviadas por un tutorado.
- `POST /tutorados/:tutoradoId/eval-final` : Realiza la evaluación global final del tutorado.

---

## 🛠 Consideraciones Técnicas Adicionales

1. **Subida de Archivos:** Las evidencias se guardan localmente en la carpeta `/uploads` ubicada un nivel arriba de `/backend`. Esta ruta se expone estáticamente por Express, permitiendo la descarga de los documentos.
2. **Roles de Usuario:** El sistema implementa una protección basada en roles (`TUTOR`, `TUTORADO`, `JEFE_DEPTO`, `COORDINADOR_PT`, `COORDINADOR_DEP`, `DIRECTOR`, `SUBDIRECTOR`). Los endpoints verifican el JWT y validan que el rol del usuario tenga permiso para esa acción.
3. **CORS:** El backend está configurado para aceptar peticiones desde `http://localhost:5173`. Si el frontend se despliega en otra URL, es obligatorio cambiar la variable `CLIENT_URL` en el archivo `.env` del backend.

¡Con esto estás listo para trabajar o continuar el desarrollo del Sistema de Gestión de Tutorías!
