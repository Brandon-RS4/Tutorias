require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Usuario, Tutor } = require('./models/Usuario.model');

const seedDB = async () => {
    try {
        // Conexión a tu MongoDB (usa la variable de tu .env)
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Conectado a MongoDB para la siembra de datos...");

        const { Tecnm, DepAcademico } = require('./models/Institucion.model');

        // Limpiamos la colección para no duplicar
        await Usuario.deleteMany({});
        await DepAcademico.deleteMany({});
        await Tecnm.deleteMany({});
        console.log("Colección de usuarios e instituciones limpiada.");

        // Creamos la institución
        const tecnm = await Tecnm.create({
            nombre_campus: 'TecNM Campus Culiacán',
            clave_institucional: '12345',
            direccion: 'Conocido',
            dominio_correo: 'tecnm.mx'
        });

        // Creamos un departamento académico
        const dep = await DepAcademico.create({
            nom_dep: 'Desarrollo Académico',
            tecnm: tecnm._id
        });

        // Creamos un Administrador (Jefe de Desarrollo Académico)
        // Según tu CU01, este es el que puede asignar usuarios
        await Usuario.create({
            nombre_completo: 'Admin Tutorias',
            correo: 'admin@tecnm.mx',
            contrasena: '123456',
            rol: 'director', // Corregido el nombre del discriminador
            departamento: dep._id,
            activo: true
        });

        // Creamos un Tutor de prueba
        await Tutor.create({
            nombre_completo: 'Profesor Tutor de Prueba',
            correo: 'tutor@tecnm.mx',
            contrasena: '123456',
            rol: 'tutor', // Corregido el nombre del discriminador
            carrera: 'Ingeniería de Software',
            max_tutorados: 30,
            departamento: dep._id,
            num_control_tutor: 'T-123456',
            activo: true
        });

        console.log("✅ Datos creados con éxito.");
        console.log("Admin: admin@tecnm.mx | 123456");
        console.log("Tutor: tutor@tecnm.mx | 123456");

        process.exit();
    } catch (error) {
        console.error("Error en el seed:", error);
        process.exit(1);
    }
};

seedDB();