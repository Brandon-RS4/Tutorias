require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Generando hash real de 123456...');
  const hash = await bcrypt.hash('123456', 12);
  console.log('Hash generado. Intentando insertar el usuario Administrador...');
  
  const { data, error } = await supabase
    .from('usuarios')
    .upsert([
      {
        nombre_completo: 'Administrador del Sistema',
        correo: 'admin@culiacan.tecnm.mx',
        contrasena: hash,
        rol: 'Administrador',
        primer_inicio_sesion: true
      }
    ], { onConflict: 'correo' })
    .select();

  if (error) {
    console.error('Error insertando el administrador:', error.message);
  } else {
    console.log('✅ Administrador insertado/actualizado exitosamente con el correo admin@culiacan.tecnm.mx');
    console.log(data);
  }
}

main();
