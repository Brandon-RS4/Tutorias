const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
//  FORMATO_ACREDITACION  (CU10)
//  * Emitido por 1 COORDINADOR_DEP_AC_PT
//  * Sustentado por 1..* ASISTENCIA
//  * Asociado a 1 TUTORADO
//  * Asociado a 1 PLAN_TUTORIA (periodo académico)
// ─────────────────────────────────────────────
const formatoAcreditacionSchema = new Schema(
  {
    fecha: {
      type: Date,
      required: [true, 'La fecha de emisión es obligatoria'],
      default: Date.now,
    },
    acreditado: {
      type: Boolean,
      required: [true, 'El estado de acreditación es obligatorio'],
    },
    // Tutorado al que se le emite la constancia
    tutorado: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El tutorado es obligatorio'],
    },
    // Coordinador que emite el formato
    coordinador_dep_ac_pt: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El coordinador departamental es obligatorio'],
    },
    // Plan de tutoría del periodo al que corresponde la acreditación
    plan_tutoria: {
      type: Schema.Types.ObjectId,
      ref: 'PlanTutoria',
      required: [true, 'El plan de tutoría es obligatorio'],
    },
    // Asistencias que sustentan la acreditación (1..*)
    asistencias: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Asistencia',
      },
    ],
    // Porcentaje de asistencia en el momento de la emisión (trazabilidad)
    porcentaje_asistencia: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    // Calificación final otorgada por el tutor (de CU08)
    calificacion_final: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    // Ruta del PDF generado en el servidor/almacenamiento
    url_documento: {
      type: String,
      trim: true,
      default: null,
    },
    observaciones: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true, collection: 'formatos_acreditacion' }
);

// Un tutorado sólo puede tener un formato de acreditación por plan/periodo
formatoAcreditacionSchema.index(
  { tutorado: 1, plan_tutoria: 1 },
  { unique: true }
);

const FormatoAcreditacion = mongoose.model(
  'FormatoAcreditacion',
  formatoAcreditacionSchema
);

module.exports = { FormatoAcreditacion };
