const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
//  ASISTENCIA
//  * Capturada por 1 TUTOR  (CU05)
//  * Demostrada por 1 TUTORADO
//  * Vinculada a 1 SESION (contexto temporal)
//  * 1..* ASISTENCIA sustenta 1 FORMATO_ACREDITACION
// ─────────────────────────────────────────────
const asistenciaSchema = new Schema(
  {
    asistencia: {
      type: Boolean,
      required: [true, 'El valor de asistencia es obligatorio'],
    },
    tutorado: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El tutorado es obligatorio'],
    },
    sesion: {
      type: Schema.Types.ObjectId,
      ref: 'Sesion',
      required: [true, 'La sesión es obligatoria'],
    },
    observacion: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true, collection: 'asistencias' }
);

asistenciaSchema.index({ tutorado: 1, sesion: 1 }, { unique: true });

const Asistencia = mongoose.model('Asistencia', asistenciaSchema);

module.exports = { Asistencia };
