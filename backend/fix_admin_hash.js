require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const hash = await bcrypt.hash('123456', 12);
  const { data, error } = await supabase
    .from('usuarios')
    .update({ contrasena: hash })
    .eq('correo', 'admin@culiacan.tecnm.mx')
    .select();

  if (error) {
    console.error('Error actualizando la contraseña:', error.message);
  } else {
    console.log('✅ Contraseña actualizada a 123456 con el hash correcto para admin@culiacan.tecnm.mx');
    console.log(data);
  }
}

main();
