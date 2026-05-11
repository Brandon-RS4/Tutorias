const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
//  ACTIVIDADES  (composición dentro de PLAN_TUTORIA)
//  Se embebe como subdocumento Y existe como colección
//  independiente para poder referenciarla desde EVIDENCIA.
// ─────────────────────────────────────────────
const actividadesSchema = new Schema(
  {
    // Número secuencial de actividad dentro del plan
    no_actividad: {
      type: Number,
      required: [true, 'El número de actividad es obligatorio'],
      min: 1,
    },
    instrucciones: {
      type: String,
      required: [true, 'Las instrucciones de la actividad son obligatorias'],
      trim: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre de la actividad es obligatorio'],
      trim: true,
    },
    fecha_realizacion: {
      type: Date,
      required: [true, 'La fecha de realización es obligatoria'],
    },
    // Relación inversa: a qué plan pertenece esta actividad
    plan_tutoria: {
      type: Schema.Types.ObjectId,
      ref: 'PlanTutoria',
      required: true,
    },
    activa: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: 'actividades' }
);

// ─────────────────────────────────────────────
//  PLAN_TUTORIA  (PAT – Programa Anual de Tutorías)
//  * opera en 1 DEP_ACADEMICO
//  * es generado por 1 COORDINADOR_PT
//  * contiene 1..* ACTIVIDADES (composición → ref array)
// ─────────────────────────────────────────────
const ESTADOS_PLAN = ['activo', 'cerrado', 'en_revision', 'cancelado'];

const planTutoriaSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del plan es obligatorio'],
      trim: true,
    },
    semestre: {
      type: String,
      required: [true, 'El semestre es obligatorio'],
      trim: true,
      // Ejemplo: "2025-A", "2025-B"
    },
    fecha_ini: {
      type: Date,
      required: [true, 'La fecha de inicio es obligatoria'],
    },
    fecha_fin: {
      type: Date,
      required: [true, 'La fecha de fin es obligatoria'],
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_PLAN,
        message: `El estado debe ser uno de: ${ESTADOS_PLAN.join(', ')}`,
      },
      default: 'activo',
    },
    // Relación: opera en un departamento académico
    departamento: {
      type: Schema.Types.ObjectId,
      ref: 'DepAcademico',
      required: [true, 'El departamento es obligatorio'],
    },
    // Relación: generado por un CoordinadorPT
    coordinador_pt: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El coordinador PT es obligatorio'],
    },
    // Composición 1..* (las actividades viven en su propia colección,
    // pero se listan aquí para navegación rápida)
    actividades: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Actividad',
      },
    ],
  },
  { timestamps: true, collection: 'planes_tutoria' }
);

// Validación: fecha_fin > fecha_ini
planTutoriaSchema.pre('save', async function () {
  if (this.fecha_fin <= this.fecha_ini) {
    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
  }
});

const PlanTutoria = mongoose.model('PlanTutoria', planTutoriaSchema);
const Actividad = mongoose.model('Actividad', actividadesSchema);

module.exports = { PlanTutoria, Actividad };
