-- Supabase Schema para Gestión de Tutorías

-- 1. ENUMS
CREATE TYPE rol_usuario AS ENUM (
  'Administrador',
  'Director',
  'Subdirector',
  'Tutor',
  'Tutorado',
  'Jefe_Departamento_Academico',
  'Coordinador_Institucional_PT',
  'Coordinador_Departamento_Academico',
  'Jefe_Departamento_Desarrollo_Academico'
);

CREATE TYPE estado_plan AS ENUM ('activo', 'cerrado', 'en_revision', 'cancelado');
CREATE TYPE estado_sesion AS ENUM ('programada', 'realizada', 'cancelada', 'reprogramada');
CREATE TYPE estado_evidencia AS ENUM ('entregado', 'evaluado', 'rechazado', 'pendiente_reenvio');

-- 2. TABLAS INDEPENDIENTES
CREATE TABLE departamentos_academicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  estado BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USUARIOS (Base)
CREATE TABLE usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo VARCHAR(255) NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  rol rol_usuario NOT NULL,
  departamento_id UUID REFERENCES departamentos_academicos(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  primer_inicio_sesion BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. INFO ESPECÍFICA DE TUTORES Y TUTORADOS
CREATE TABLE tutores (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  num_control_tutor VARCHAR(50) UNIQUE NOT NULL,
  carrera VARCHAR(100) NOT NULL,
  max_tutorados INTEGER DEFAULT 30
);

CREATE TABLE tutorados (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  num_control_tutorado VARCHAR(50) UNIQUE NOT NULL,
  direccion TEXT,
  tutor_id UUID REFERENCES tutores(usuario_id) ON DELETE SET NULL
);

-- 5. PLAN DE TUTORÍA Y ACTIVIDADES
CREATE TABLE planes_tutoria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  semestre VARCHAR(50) NOT NULL,
  fecha_ini DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado estado_plan DEFAULT 'activo',
  departamento_id UUID REFERENCES departamentos_academicos(id) ON DELETE CASCADE,
  coordinador_pt_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE actividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no_actividad INTEGER NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  instrucciones TEXT NOT NULL,
  fecha_realizacion DATE NOT NULL,
  plan_tutoria_id UUID REFERENCES planes_tutoria(id) ON DELETE CASCADE,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. GRUPOS Y ASIGNACIÓN DE ALUMNOS
CREATE TABLE grupos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave_grupo VARCHAR(50) UNIQUE NOT NULL,
  cantidad INTEGER DEFAULT 0,
  horario VARCHAR(100) NOT NULL,
  tutor_id UUID REFERENCES tutores(usuario_id) ON DELETE SET NULL,
  plan_tutoria_id UUID REFERENCES planes_tutoria(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE grupo_tutorados (
  grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
  tutorado_id UUID REFERENCES tutorados(usuario_id) ON DELETE CASCADE,
  PRIMARY KEY (grupo_id, tutorado_id)
);

-- 7. SESIONES Y ASISTENCIA
CREATE TABLE sesiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no_sesion INTEGER NOT NULL,
  fecha DATE NOT NULL,
  hora VARCHAR(5) NOT NULL, -- Ej: '14:00'
  estado estado_sesion DEFAULT 'programada',
  grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
  plan_tutoria_id UUID REFERENCES planes_tutoria(id) ON DELETE CASCADE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (grupo_id, no_sesion)
);

CREATE TABLE sesion_actividades (
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  actividad_id UUID REFERENCES actividades(id) ON DELETE CASCADE,
  PRIMARY KEY (sesion_id, actividad_id)
);

CREATE TABLE asistencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  tutorado_id UUID REFERENCES tutorados(usuario_id) ON DELETE CASCADE,
  asistio BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sesion_id, tutorado_id)
);

-- 8. EVIDENCIAS Y EVALUACIÓN
CREATE TABLE evidencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actividad_id UUID REFERENCES actividades(id) ON DELETE CASCADE,
  tutorado_id UUID REFERENCES tutorados(usuario_id) ON DELETE CASCADE,
  archivo_url TEXT NOT NULL,
  estado estado_evidencia DEFAULT 'entregado',
  calificacion NUMERIC(5,2),
  observaciones_tutor TEXT,
  fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evaluado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_evaluacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE evaluaciones_finales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutorado_id UUID REFERENCES tutorados(usuario_id) ON DELETE CASCADE,
  plan_tutoria_id UUID REFERENCES planes_tutoria(id) ON DELETE CASCADE,
  calificacion_final NUMERIC(5,2) NOT NULL,
  observaciones TEXT,
  acreditado BOOLEAN DEFAULT false,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tutorado_id, plan_tutoria_id)
);

CREATE TABLE formatos_acreditacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutorado_id UUID REFERENCES tutorados(usuario_id) ON DELETE CASCADE,
  plan_tutoria_id UUID REFERENCES planes_tutoria(id) ON DELETE CASCADE,
  url_documento TEXT NOT NULL,
  fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  emitido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. USUARIO ADMINISTRADOR POR DEFECTO
-- Contraseña por defecto: 123456 (hash de bcrypt: $2a$12$R9h/cIPz0gi.URNNX3x2AedRmUwr.EaXWJ02D4a1pA7.X0MvW/iC2)
INSERT INTO usuarios (nombre_completo, correo, contrasena, rol, primer_inicio_sesion)
VALUES ('Administrador del Sistema', 'admin@tutorias.edu.mx', '$2a$12$R9h/cIPz0gi.URNNX3x2AedRmUwr.EaXWJ02D4a1pA7.X0MvW/iC2', 'Administrador', true)
ON CONFLICT (correo) DO NOTHING;
