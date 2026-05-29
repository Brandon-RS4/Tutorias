require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, correo, rol');

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(data);
  }
}

main();
