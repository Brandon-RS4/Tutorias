require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tutorias_db';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`✅  MongoDB conectado: ${MONGO_URI}`);
    app.listen(PORT, () => {
      console.log(`🚀  Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌  Error al conectar MongoDB:', err.message);
    process.exit(1);
  });
