const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
//  TECNM  (institución raíz, singleton en BD)
// ─────────────────────────────────────────────
const tecnmSchema = new Schema(
  {
    nombre_campus: {
      type: String,
      required: [true, 'El nombre del campus es obligatorio'],
      trim: true,
    },
    clave_institucional: {
      type: String,
      required: [true, 'La clave institucional es obligatoria'],
      unique: true,
      trim: true,
    },
    direccion: {
      type: String,
      required: [true, 'La dirección es obligatoria'],
      trim: true,
    },
    // dominio institucional para validar correos (ej. "culiacan.tecnm.mx")
    dominio_correo: {
      type: String,
      required: [true, 'El dominio de correo institucional es obligatorio'],
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true, collection: 'tecnm' }
);

// ─────────────────────────────────────────────
//  DEP_ACADEMICO  (1 TECNM → 1..* DEP_ACADEMICO)
// ─────────────────────────────────────────────
const depAcademicoSchema = new Schema(
  {
    nom_dep: {
      type: String,
      required: [true, 'El nombre del departamento es obligatorio'],
      trim: true,
    },
    estado_dep: {
      type: Boolean,
      default: true,
    },
    // Relación con la institución padre
    tecnm: {
      type: Schema.Types.ObjectId,
      ref: 'Tecnm',
      required: [true, 'El campus TECNM es obligatorio'],
    },
  },
  { timestamps: true, collection: 'dep_academicos' }
);

const Tecnm = mongoose.model('Tecnm', tecnmSchema);
const DepAcademico = mongoose.model('DepAcademico', depAcademicoSchema);

module.exports = { Tecnm, DepAcademico };
