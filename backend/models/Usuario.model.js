const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
//  ESQUEMA BASE: USUARIO  (discriminator key = "rol")
//  Todas las subclases heredan estos campos.
// ─────────────────────────────────────────────
const usuarioSchema = new Schema(
  {
    nombre_completo: {
      type: String,
      required: [true, 'El nombre completo es obligatorio'],
      trim: true,
    },
    correo: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Formato de correo inválido'],
    },
    contrasena: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 6,
      select: false, // nunca se devuelve en queries por defecto
    },
    // departamento al que pertenece el usuario
    departamento: {
      type: Schema.Types.ObjectId,
      ref: 'DepAcademico',
      required: [true, 'El departamento es obligatorio'],
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    // "rol" es la discriminator key: guarda el nombre del subtipo en la colección
    discriminatorKey: 'rol',
    collection: 'usuarios',
  }
);

// ── Hash de contraseña antes de guardar ──────
usuarioSchema.pre('save', async function () {
  if (!this.isModified('contrasena')) return;
  this.contrasena = await bcrypt.hash(this.contrasena, 12);
});

// ── Método de instancia: comparar contraseña ─
usuarioSchema.methods.compararContrasena = async function (candidata) {
  return bcrypt.compare(candidata, this.contrasena);
};

const Usuario = mongoose.model('Usuario', usuarioSchema);

// ═══════════════════════════════════════════════════════════════
//  DISCRIMINADORES  (una colección, múltiples "tipos" de usuario)
// ═══════════════════════════════════════════════════════════════

// ── 1. DIRECTOR ──────────────────────────────
const Director = Usuario.discriminator(
  'director',
  new Schema({}, { _id: false })
);

// ── 2. SUBDIRECTOR ───────────────────────────
const Subdirector = Usuario.discriminator(
  'subdirector',
  new Schema({}, { _id: false })
);

// ── 3. JEFE_DEPTO_ACADEMICO ──────────────────
const JefeDeptoAcademico = Usuario.discriminator(
  'jefe_depto_academico',
  new Schema({}, { _id: false })
);

// ── 4. COORDINADOR_PT (Institucional) ────────
const CoordinadorPT = Usuario.discriminator(
  'coordinador_pt',
  new Schema({}, { _id: false })
);

// ── 5. COORDINADOR_DEP_AC_PT (Departamental) ─
const CoordinadorDepAcPT = Usuario.discriminator(
  'coordinador_dep_ac_pt',
  new Schema({}, { _id: false })
);

// ── 6. TUTOR ─────────────────────────────────
const Tutor = Usuario.discriminator(
  'tutor',
  new Schema(
    {
      num_control_tutor: {
        type: String,
        required: [true, 'El número de control del tutor es obligatorio'],
        unique: true,
        trim: true,
      },
      carrera: {
        type: String,
        required: [true, 'La carrera es obligatoria'],
        trim: true,
      },
      max_tutorados: {
        type: Number,
        required: true,
        default: 30,
        min: 1,
      },
      // Un tutor tiene exactamente un grupo asignado (1–1)
      grupo: {
        type: Schema.Types.ObjectId,
        ref: 'Grupo',
        default: null,
      },
    },
    { _id: false }
  )
);

// ── 7. TUTORADO ──────────────────────────────
const Tutorado = Usuario.discriminator(
  'tutorado',
  new Schema(
    {
      num_control_tutorado: {
        type: String,
        required: [true, 'El número de control del tutorado es obligatorio'],
        unique: true,
        trim: true,
      },
      direccion: {
        type: String,
        trim: true,
      },
      // Tutor que asesora a este tutorado (N tutorados → 1 tutor)
      tutor: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario', // referencia al discriminador Tutor
        default: null,
      },
    },
    { _id: false }
  )
);

module.exports = {
  Usuario,
  Director,
  Subdirector,
  JefeDeptoAcademico,
  CoordinadorPT,
  CoordinadorDepAcPT,
  Tutor,
  Tutorado,
};
