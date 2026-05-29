# Guía de Arquitectura y Evaluación: Proyecto Gestión de Tutorías

Este documento está diseñado para explicar detalladamente cómo está estructurado el proyecto "Gestión de Tutorías". Te servirá de guía para presentar y defender tu proyecto ante el profesor, garantizando que cubres cada punto de la rúbrica de evaluación.

---

## 1. Hoja de Presentación (Plantilla Sugerida)
> **Nota para el equipo:** Coloquen esta información en la primera página de su reporte o presentación física.
*   **Institución:** (Nombre de tu escuela/universidad)
*   **Materia:** (Nombre de la materia)
*   **Actividad:** Proyecto Final - Sistema de Gestión de Tutorías
*   **Integrantes del equipo:**
    *   (Nombre Completo Integrante 1)
    *   (Nombre Completo Integrante 2)
    *   (Nombre Completo Integrante 3)
*   **Fecha de Entrega:** (Fecha)

---

## 2. ¿En qué está hecho? (Tecnologías y Stack)

El proyecto fue desarrollado utilizando el **Stack MERN**, uno de los estándares más modernos y robustos en la industria del desarrollo web actual.

*   **Frontend (La interfaz gráfica):**
    *   **React:** Librería principal de JavaScript para construir la interfaz de usuario.
    *   **Vite:** Herramienta de construcción (Bundler) ultrarrápida que reemplaza a Create-React-App.
    *   **Tailwind CSS:** Framework de estilos utilitarios utilizado para un diseño limpio, moderno y responsivo.
    *   **Axios / React Router:** Para consumo de la API y manejo de la navegación entre páginas.
*   **Backend (El servidor y la API):**
    *   **Node.js:** Entorno de ejecución para correr JavaScript del lado del servidor.
    *   **Express.js:** Framework minimalista para manejar las rutas HTTP de la API REST.
*   **Base de Datos:**
    *   **MongoDB:** Base de datos NoSQL.
    *   **Mongoose:** ODM (Object Data Modeling) utilizado para definir los esquemas, validaciones y relaciones entre colecciones (Usuarios, Grupos, Planes de Tutoría).

---

## 3. Estructura del Proyecto (Carpetas y Archivos)

El proyecto está dividido en componentes modulares. Al abrir la carpeta principal, esto es lo que significa cada cosa:

### 📁 `backend/` (Lógica del Servidor)
Contiene todo el código de la API REST y las reglas de negocio del sistema.
*   **`controllers/`**: Aquí está "el cerebro" del proyecto. Contiene las funciones que procesan los datos, calculan las asistencias, validan requisitos y ejecutan los **12 casos de uso**.
*   **`routes/`**: Define los Endpoints (URLs) de la API (ej. `GET /api/usuarios`). Conecta las peticiones web con su controlador correspondiente.
*   **`models/`**: Define la estructura de la base de datos (cómo se guardan las Evidencias, Grupos, Usuarios, etc.).
*   **`middlewares/`**: Funciones intermediarias de seguridad. Aquí se valida que los tokens JWT sean correctos y se procesa la subida de archivos (PDFs) usando **Multer**.
*   **`.env`**: Archivo crítico de **Seguridad**. Almacena secretos como la contraseña de la Base de Datos (`MONGO_URI`), y la clave de encriptación (`JWT_SECRET`). Este archivo nunca se sube a repositorios públicos.
*   **`server.js` / `app.js`**: Archivos donde se levanta y se configura el servidor web de Express.
*   **`package.json`**: Lista todas las librerías instaladas en el backend (ej. `bcryptjs`, `jsonwebtoken`).

### 📁 `frontend/` (Interfaz Web)
*   **`src/`**: Todo el código fuente de las pantallas que ve el usuario. Contiene componentes de React, estilos y lógica visual.
*   **`package.json`**: Define los scripts para correr la app en modo desarrollador (`npm run dev`) o compilarla para producción (`npm run build`).

### 📁 `uploads/`
*   Carpeta del servidor donde se guardan físicamente los archivos (evidencias PDF) que suben los alumnos.

### 📄 `README.md`
*   El manual técnico principal del repositorio. Contiene instrucciones precisas para que cualquier desarrollador (o el maestro) pueda clonar el proyecto, instalar dependencias y ejecutarlo en su computadora.

---

## 4. Dónde están los 12 Casos de Uso (Para el Maestro)

Para demostrar dónde se implementó la lógica documentada previamente, puedes indicarle al profesor que toda esta programación reside en la carpeta `backend/controllers/`. Cada caso de uso (CU) está debidamente comentado en el código fuente:

1.  **CU01 - Asignar (registrar) usuarios al sistema**: `backend/controllers/usuario.controller.js` (Función `registrarUsuario`)
2.  **CU02 - Asignar actividades del Programa de Tutorías**: `backend/controllers/tutoria.controller.js` (Función `registrarActividad`)
3.  **CU03 - Asignar a los Tutores**: `backend/controllers/usuario.controller.js` (Función `asignarTutor`)
4.  **CU04 - Asignar Tutorados a los Tutores**: `backend/controllers/usuario.controller.js` (Función `asignarTutorado`)
5.  **CU05 - Capturar Asistencias**: `backend/controllers/tutoria.controller.js` (Función `capturarAsistencias`)
6.  **CU06 - Evaluar y registrar evidencias**: `backend/controllers/evidencia.controller.js` (Función `evaluarEvidencia`)
7.  **CU07 - Subir evidencias**: `backend/controllers/evidencia.controller.js` (Función `subirEvidencia`)
8.  **CU08 - Evaluar tutorados (evaluación final)**: `backend/controllers/evidencia.controller.js` (Función `evaluarTutoradoFinal`)
9.  **CU09 - Modificar actividades propuestas para las sesiones**: `backend/controllers/tutoria.controller.js` (Función `modificarActividadSesion`)
10. **CU10 - Generar formato de acreditación**: `backend/controllers/tutoria.controller.js` (Función `generarFormatoAcreditacion`)
11. **CU11 - Consultar Tutores por carrera**: `backend/controllers/usuario.controller.js` (Función `consultarTutoresPorCarrera`)
12. **CU12 - Consultar Tutorados por Tutor**: `backend/controllers/usuario.controller.js` (Función `consultarTutoradosPorTutor`)

---

## 5. Defensa contra la Rúbrica de Evaluación

Cuando el maestro revise el proyecto, utiliza los siguientes argumentos técnicos correspondientes a su rúbrica:

*   **1. Funcionamiento / API (10 puntos):**
    *   *Qué decir:* "El sistema expone una API REST completamente funcional. Cada Endpoint responde con su correspondiente Código de Estado HTTP (ej. `201 Created` para crear usuarios, `200 OK` para consultas exitosas, `400/401/404` para manejo correcto de errores y excepciones)."
*   **2. CRUD y Datos (10 puntos):**
    *   *Qué decir:* "El sistema no es estático, maneja el flujo de datos (CRUD) al 100%. Por ejemplo: **Crear** (registrar evidencias, cuentas), **Leer** (historial de tutorías, lista de usuarios), **Actualizar** (evaluar evidencias, modificar planes) y **Borrar** a través del flujo de negocio."
*   **3. Calidad de Código (10 puntos):**
    *   *Qué decir:* "Empleamos el patrón de diseño Arquitectura MVC (Modelo-Vista-Controlador). El código no está todo revuelto; las rutas están separadas de la lógica (controladores) y de la estructura de base de datos (modelos). Además, el código está en español y claramente comentado indicando el número de CU."
*   **4. Base de Datos (10 puntos):**
    *   *Qué decir:* "Usamos MongoDB. El diseño es eficiente porque usamos un modelo relacional dentro de una base NoSQL mediante el uso de referencias `ObjectId` (población / `.populate()`), conectando eficientemente a Usuarios con sus Grupos y Evidencias sin duplicar información."
*   **5. Seguridad y Validación (10 puntos):**
    *   *Qué decir:* "Esta fue una prioridad. Las contraseñas están encriptadas con `bcryptjs`, de forma que ni el administrador de la BD puede leerlas. Las sesiones se manejan mediante **JWT (JSON Web Tokens)**, lo que protege las rutas para que un alumno no pueda evaluar a otro alumno. Además, los secretos se manejan de manera oculta utilizando el archivo de variables de entorno `.env`."
*   **6. Documentación (6 puntos):**
    *   *Qué decir:* "Entregamos un archivo `README.md` exhaustivo que detalla paso a paso la instalación, clonación, instalación de dependencias e inicio del proyecto para que cualquier desarrollador pueda montarlo en su entorno local sin errores."
