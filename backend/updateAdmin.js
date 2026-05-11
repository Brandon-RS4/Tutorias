require('dotenv').config();
const mongoose = require('mongoose');
const { Usuario } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tutorias_db';

async function updateAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    const result = await Usuario.updateOne(
      { correo: 'admin@tecnm.mx' },
      { $set: { nombre_completo: 'Admin Tutorias' } }
    );
    console.log('Admin actualizado:', result);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAdmin();
