const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
//  EVIDENCIA
//  * Es subida por 1 TUTORADO
//  * Está generada por 1 ACTIVIDAD
//  * Puede estar anexada a 1 SESION (agregación opcional)
//  * Es evaluada por el TUTOR (CU06)
// ─────────────────────────────────────────────
const ESTADOS_EVIDENCIA = [
  'pendiente',
  'evaluada',
  'rechazada',
  'reenvio',
];

const evidenciaSchema = new Schema(
  {
    no_evidencia: { type: Number, required: true },
    tutorado: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    actividad: {
      type: Schema.Types.ObjectId,
      ref: 'Actividad',
      required: true,
    },
    sesion: {
      type: Schema.Types.ObjectId,
      ref: 'Sesion',
      default: null,
    },
    archivo: {
      nombre_original: String,
      url: String,
      fecha_carga: { type: Date, default: Date.now },
    },
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'rechazada'],
      default: 'pendiente',
    },
    evaluacion: {
      tutor: { type: Schema.Types.ObjectId, ref: 'Usuario' },
      observaciones: String,
      fecha_evaluacion: Date,
    }
  },
  { timestamps: true, collection: 'evidencias' }
);

evidenciaSchema.index({ tutorado: 1, actividad: 1 });
evidenciaSchema.index({ sesion: 1, estado: 1 });

const Evidencia = mongoose.model('Evidencia', evidenciaSchema);

module.exports = { Evidencia };
