const { supabase } = require('./config/supabase');

async function check() {
  console.log('--- USUARIOS ---');
  const { data: users } = await supabase.from('usuarios').select('id, nombre_completo, correo, rol');
  console.log(users);

  console.log('--- TUTORES ---');
  const { data: tutores } = await supabase.from('tutores').select('*');
  console.log(tutores);

  console.log('--- GRUPOS ---');
  const { data: grupos } = await supabase.from('grupos').select('*');
  console.log(grupos);
  
  console.log('--- TUTORADOS ---');
  const { data: tutorados } = await supabase.from('tutorados').select('*');
  console.log(tutorados);

  console.log('--- GRUPO TUTORADOS ---');
  const { data: gt } = await supabase.from('grupo_tutorados').select('*');
  console.log(gt);
}

check().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
