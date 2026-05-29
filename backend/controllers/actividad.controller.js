/**
 * controllers/actividad.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU09 – Modificar actividades propuestas para las sesiones
 * ─────────────────────────────────────────────────────────────────
 */

const { supabase } = require('../config/supabase');

// ═══════════════════════════════════════════════════════════════
//  Listar sesiones del tutor con sus actividades asociadas
//  GET /api/actividades/mis-sesiones
//  Paso 2 del flujo: sistema despliega lista de sesiones programadas
// ═══════════════════════════════════════════════════════════════
const listarSesionesConActividades = async (req, res, next) => {
  try {
    const tutor_id = req.usuario.id;

    // 1. Obtener grupos del tutor
    const { data: grupos, error: errGrupos } = await supabase
      .from('grupos')
      .select('id, clave_grupo, horario, plan_tutoria_id')
      .eq('tutor_id', tutor_id);

    if (errGrupos) return res.status(400).json({ success: false, message: errGrupos.message });

    if (!grupos || grupos.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tienes grupos asignados.',
        data: { sesiones: [] },
      });
    }

    const grupoIds = grupos.map(g => g.id);

    // 2. Obtener sesiones de esos grupos (solo las editables: programada o reprogramada)
    const { data: sesiones, error: errSes } = await supabase
      .from('sesiones')
      .select(`
        id,
        no_sesion,
        fecha,
        hora,
        estado,
        observaciones,
        grupo_id,
        plan_tutoria_id,
        grupos(id, clave_grupo, horario),
        planes_tutoria(id, nombre, semestre, estado)
      `)
      .in('grupo_id', grupoIds)
      .order('fecha', { ascending: true });

    if (errSes) return res.status(400).json({ success: false, message: errSes.message });

    if (!sesiones || sesiones.length === 0) {
      return res.status(200).json({ success: true, data: { sesiones: [] } });
    }

    // 3. Para cada sesión, obtener sus actividades via sesion_actividades
    const sesionIds = sesiones.map(s => s.id);
    const { data: sesionActvs } = await supabase
      .from('sesion_actividades')
      .select(`
        sesion_id,
        actividades:actividad_id(
          id,
          no_actividad,
          nombre,
          instrucciones,
          fecha_realizacion,
          activa
        )
      `)
      .in('sesion_id', sesionIds);

    // Agrupar actividades por sesión
    const actividadesMap = {};
    (sesionActvs || []).forEach(sa => {
      if (!actividadesMap[sa.sesion_id]) actividadesMap[sa.sesion_id] = [];
      if (sa.actividades) actividadesMap[sa.sesion_id].push(sa.actividades);
    });

    // 4. También incluir actividades del plan directamente (si no están en sesion_actividades)
    //    Hay planes donde las actividades se asocian al plan, no por join intermedio
    const planIds = [...new Set(sesiones.map(s => s.plan_tutoria_id).filter(Boolean))];
    let actividadesPorPlan = {};
    if (planIds.length > 0) {
      const { data: actsDelPlan } = await supabase
        .from('actividades')
        .select('id, no_actividad, nombre, instrucciones, fecha_realizacion, activa, plan_tutoria_id')
        .in('plan_tutoria_id', planIds)
        .eq('activa', true)
        .order('no_actividad', { ascending: true });

      (actsDelPlan || []).forEach(a => {
        if (!actividadesPorPlan[a.plan_tutoria_id]) actividadesPorPlan[a.plan_tutoria_id] = [];
        actividadesPorPlan[a.plan_tutoria_id].push(a);
      });
    }

    // 5. Construir respuesta final
    const resultado = sesiones.map(s => {
      const actividadesDeSesion = actividadesMap[s.id] || [];
      const actividadesDelPlan  = actividadesPorPlan[s.plan_tutoria_id] || [];

      // Combinar: actividades vinculadas a la sesión + del plan (dando prioridad a la sesión por no_actividad)
      const actsSesionMap = new Map();
      actividadesDeSesion.forEach(a => actsSesionMap.set(a.no_actividad, a));

      actividadesDelPlan.forEach(a => {
        if (!actsSesionMap.has(a.no_actividad)) {
          actsSesionMap.set(a.no_actividad, a);
        }
      });
      const todasLasActividades = Array.from(actsSesionMap.values()).sort((a, b) => a.no_actividad - b.no_actividad);

      return {
        ...s,
        actividades: todasLasActividades,
        editable: !['cancelada', 'realizada'].includes(s.estado) && s.planes_tutoria?.estado === 'activo',
      };
    });

    res.status(200).json({
      success: true,
      data: { total: resultado.length, sesiones: resultado },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Obtener actividades de una sesión específica
//  GET /api/actividades/sesiones/:sesionId
//  Paso 4 del flujo: sistema presenta catálogo de actividades
// ═══════════════════════════════════════════════════════════════
const obtenerActividadesDeSesion = async (req, res, next) => {
  try {
    const { sesionId } = req.params;
    const tutor_id = req.usuario.id;

    // Verificar sesión y que pertenezca al tutor
    const { data: sesion, error: sesionError } = await supabase
      .from('sesiones')
      .select(`
        id, no_sesion, fecha, hora, estado, observaciones,
        grupos(id, clave_grupo, tutor_id),
        planes_tutoria(id, nombre, semestre, estado)
      `)
      .eq('id', sesionId)
      .single();

    if (sesionError || !sesion) {
      return res.status(404).json({ success: false, message: 'Sesión no encontrada.' });
    }

    // Verificar que el tutor sea dueño del grupo (si no es admin)
    if (req.usuario.rol === 'Tutor' && sesion.grupos?.tutor_id !== tutor_id) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a esta sesión.' });
    }

    // A3 – Sesión no editable
    const editable = !['cancelada', 'realizada'].includes(sesion.estado) && sesion.planes_tutoria?.estado === 'activo';

    // Actividades del plan de la sesión
    const { data: actividades, error: errActs } = await supabase
      .from('actividades')
      .select('id, no_actividad, nombre, instrucciones, fecha_realizacion, activa, plan_tutoria_id')
      .eq('plan_tutoria_id', sesion.planes_tutoria?.id || '')
      .order('no_actividad', { ascending: true });

    if (errActs) return res.status(400).json({ success: false, message: errActs.message });

    // Actividades de la sesión (personalizadas)
    const { data: sesionActvs } = await supabase
      .from('sesion_actividades')
      .select('actividades(id, no_actividad, nombre, instrucciones, fecha_realizacion, activa)')
      .eq('sesion_id', sesionId);

    const actividadesDeSesion = (sesionActvs || []).map(sa => sa.actividades).filter(Boolean);

    // Combinar dando prioridad a las personalizadas por no_actividad
    const actsSesionMap = new Map();
    actividadesDeSesion.forEach(a => actsSesionMap.set(a.no_actividad, a));

    actividades.forEach(a => {
      if (!actsSesionMap.has(a.no_actividad)) {
        actsSesionMap.set(a.no_actividad, a);
      }
    });

    const todasLasActividades = Array.from(actsSesionMap.values()).sort((a, b) => a.no_actividad - b.no_actividad);

    // A1 – Sin actividades
    if (todasLasActividades.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Esta sesión no cuenta con actividades asociadas.',
        data: { sesion, actividades: [], editable },
      });
    }

    res.status(200).json({
      success: true,
      data: { sesion, actividades: todasLasActividades, editable },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU09 – Modificar actividad de una sesión
//  Actor: Tutor
//  PUT /api/actividades/sesiones/:sesionId/actividad/:actividadId
// ═══════════════════════════════════════════════════════════════
const modificarActividadSesion = async (req, res, next) => {
  try {
    const { sesionId, actividadId } = req.params;
    const tutor_id = req.usuario.id;
    const { nombre, instrucciones, fecha_realizacion } = req.body;

    // A2 – Datos inválidos: ningún campo a actualizar
    if (!nombre && !instrucciones && !fecha_realizacion) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar al menos un campo a actualizar: nombre, instrucciones o fecha_realizacion.',
      });
    }

    // Verificar sesión con PAT y grupo
    const { data: sesion, error: sesionError } = await supabase
      .from('sesiones')
      .select(`
        id, estado, grupo_id,
        grupos(tutor_id),
        planes_tutoria(id, estado)
      `)
      .eq('id', sesionId)
      .single();

    if (sesionError || !sesion) {
      return res.status(404).json({ success: false, message: 'Sesión no encontrada.' });
    }

    // Verificar que el tutor sea dueño
    if (req.usuario.rol === 'Tutor' && sesion.grupos?.tutor_id !== tutor_id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para modificar actividades de esta sesión.' });
    }

    // A3 – Sesión no editable
    if (!sesion.planes_tutoria || sesion.planes_tutoria.estado !== 'activo') {
      return res.status(409).json({
        success: false,
        message: 'La sesión no pertenece a un PAT activo. No se pueden modificar sus actividades.',
      });
    }

    if (['cancelada', 'realizada'].includes(sesion.estado)) {
      return res.status(409).json({
        success: false,
        message: `A3: La sesión está en estado "${sesion.estado}" y no permite modificaciones.`,
      });
    }

    // Verificar que la actividad exista
    const { data: actividadExistente, error: actividadError } = await supabase
      .from('actividades')
      .select('id, nombre, instrucciones, fecha_realizacion, plan_tutoria_id, no_actividad')
      .eq('id', actividadId)
      .single();

    if (actividadError || !actividadExistente) {
      return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });
    }

    // A2 – Validación de campos
    if (nombre !== undefined && nombre.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'El nombre de la actividad debe tener al menos 3 caracteres.' });
    }

    // Si es una actividad global (plan_tutoria_id no es nulo), NO la sobreescribimos.
    // Creamos una copia personalizada para esta sesión.
    if (actividadExistente.plan_tutoria_id !== null) {
      const { data: nuevaActividad, error: insertError } = await supabase
        .from('actividades')
        .insert([{
          no_actividad: actividadExistente.no_actividad,
          nombre: nombre !== undefined ? nombre.trim() : actividadExistente.nombre,
          instrucciones: instrucciones !== undefined ? instrucciones.trim() : actividadExistente.instrucciones,
          fecha_realizacion: fecha_realizacion !== undefined ? fecha_realizacion : actividadExistente.fecha_realizacion,
          plan_tutoria_id: null,
          activa: true
        }])
        .select()
        .single();
      
      if (insertError) return res.status(400).json({ success: false, message: insertError.message });

      // Vincularla a la sesión
      const { error: linkError } = await supabase
        .from('sesion_actividades')
        .insert([{ sesion_id: sesionId, actividad_id: nuevaActividad.id }]);

      if (linkError) return res.status(400).json({ success: false, message: linkError.message });

      return res.status(200).json({
        success: true,
        message: `Actividad "${nuevaActividad.nombre}" personalizada para esta sesión exitosamente.`,
        data: { actividad: nuevaActividad, sesion_id: sesionId },
      });
    }

    // Construir objeto de actualización con solo los campos enviados (para actividad ya personalizada)
    const updates = {};
    if (nombre !== undefined)             updates.nombre = nombre.trim();
    if (instrucciones !== undefined)      updates.instrucciones = instrucciones.trim();
    if (fecha_realizacion !== undefined)  updates.fecha_realizacion = fecha_realizacion;

    const { data: actividad, error: updateError } = await supabase
      .from('actividades')
      .update(updates)
      .eq('id', actividadId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    res.status(200).json({
      success: true,
      message: `Actividad "${actividad.nombre}" actualizada exitosamente.`,
      data: { actividad, sesion_id: sesionId },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listarSesionesConActividades,
  obtenerActividadesDeSesion,
  modificarActividadSesion,
};
