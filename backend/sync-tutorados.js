const { supabase } = require('./config/supabase');

async function syncTutorados() {
  console.log('Iniciando sincronización de tutorados con sus grupos...');

  // 1. Obtener todos los tutorados que tienen un tutor_id asignado
  const { data: tutorados, error: errTutorados } = await supabase
    .from('tutorados')
    .select('usuario_id, tutor_id')
    .not('tutor_id', 'is', null);

  if (errTutorados) {
    console.error('Error al obtener tutorados:', errTutorados);
    return;
  }

  let count = 0;

  for (const tutorado of tutorados) {
    // 2. Obtener el grupo de este tutor (el primer grupo si tiene varios)
    const { data: grupos, error: errGrupos } = await supabase
      .from('grupos')
      .select('id')
      .eq('tutor_id', tutorado.tutor_id)
      .limit(1);

    if (errGrupos || !grupos || grupos.length === 0) continue;

    const grupoId = grupos[0].id;

    // 3. Verificar si ya está en grupo_tutorados
    const { data: yaEnGrupo } = await supabase
      .from('grupo_tutorados')
      .select('grupo_id')
      .eq('tutorado_id', tutorado.usuario_id)
      .eq('grupo_id', grupoId)
      .single();

    if (!yaEnGrupo) {
      // 4. Insertar si no está
      await supabase
        .from('grupo_tutorados')
        .insert([{ grupo_id: grupoId, tutorado_id: tutorado.usuario_id }]);
      count++;
      console.log(`Tutorado ${tutorado.usuario_id} sincronizado al grupo ${grupoId}`);
    }
  }

  console.log(`Sincronización completada. Se sincronizaron ${count} tutorados.`);
}

syncTutorados();
