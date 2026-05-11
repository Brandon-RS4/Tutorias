const mongoose = require('mongoose');
const { Schema } = mongoose;

const sesionSchema = new Schema(
    {
        no_sesion: {
            type: Number,
            required: [true, 'El número de sesión es obligatorio'],
        },
        fecha: {
            type: Date,
            required: [true, 'La fecha de la sesión es obligatoria'],
        },
        hora: {
            type: String,
            required: [true, 'La hora de la sesión es obligatoria'],
        },
        grupo: {
            type: Schema.Types.ObjectId,
            ref: 'Grupo',
            required: [true, 'El grupo es obligatorio para crear la sesión'],
        }
    },
    { timestamps: true, collection: 'sesiones' }
);

module.exports = mongoose.model('Sesion', sesionSchema);