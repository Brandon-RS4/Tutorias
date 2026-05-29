require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const correo = 'admin@culiacan.tecnm.mx';
  const contrasena = '123456';

  console.log(`Buscando usuario con correo: ${correo}`);
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('correo', correo)
    .single();

  if (error || !usuario) {
    console.error('No se encontró el usuario en Supabase o hubo error:', error?.message || 'Usuario nulo');
    return;
  }

  console.log('Usuario encontrado:', usuario.correo);
  console.log('Hash en BD:', usuario.contrasena);

  const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);
  console.log('¿La contraseña coincide?', isMatch);
}

main();
