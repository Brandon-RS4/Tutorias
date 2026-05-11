const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
//  GRUPO  (1 TUTOR → 1 GRUPO → * SESION)
// ─────────────────────────────────────────────
const grupoSchema = new Schema(
  {
    clave_grupo: {
      type: String,
      required: [true, 'La clave del grupo es obligatoria'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    cantidad: {
      type: Number,
      default: 0,
    },
    horario: {
      type: String,
      required: [true, 'El horario es obligatorio'],
    },
    tutor: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      // No es obligatorio al crear el grupo porque se asigna después en CU03
    },
    tutorados: [{
      type: Schema.Types.ObjectId,
      ref: 'Usuario'
    }],
    plan_tutoria: {
      type: Schema.Types.ObjectId,
      ref: 'PlanTutoria',
      required: [true, 'El plan de tutoría es obligatorio'],
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: 'grupos' }
);

// ─────────────────────────────────────────────
//  SESION  (1 GRUPO → * SESION)
// ─────────────────────────────────────────────
const ESTADOS_SESION = ['programada', 'realizada', 'cancelada', 'reprogramada'];

const sesionSchema = new Schema(
  {
    no_sesion: {
      type: Number,
      required: [true, 'El número de sesión es obligatorio'],
      min: 1,
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha de la sesión es obligatoria'],
    },
    hora: {
      type: String,
      required: [true, 'La hora de la sesión es obligatoria'],
      trim: true,
      match: [/^\d{2}:\d{2}$/, 'La hora debe tener formato HH:MM'],
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_SESION,
        message: `El estado debe ser uno de: ${ESTADOS_SESION.join(', ')}`,
      },
      default: 'programada',
    },
    grupo: {
      type: Schema.Types.ObjectId,
      ref: 'Grupo',
      required: [true, 'El grupo es obligatorio'],
    },
    plan_tutoria: {
      type: Schema.Types.ObjectId,
      ref: 'PlanTutoria',
      required: [true, 'El plan de tutoría es obligatorio'],
    },
    actividades: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Actividad',
      },
    ],
    observaciones: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true, collection: 'sesiones' }
);

sesionSchema.index({ grupo: 1, no_sesion: 1 }, { unique: true });

const Grupo = mongoose.model('Grupo', grupoSchema);
const Sesion = mongoose.model('Sesion', sesionSchema);

module.exports = { Grupo, Sesion };
