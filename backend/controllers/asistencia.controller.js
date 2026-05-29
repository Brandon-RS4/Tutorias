/**
 * controllers/asistencia.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU05 – Capturar Asistencias
 * ─────────────────────────────────────────────────────────────────
 */

const { supabase } = require('../config/supabase');

// ═══════════════════════════════════════════════════════════════
//  Crear Sesión
//  POST /api/asistencias/sesiones
// ═══════════════════════════════════════════════════════════════
const crearSesion = async (req, res, next) => {
  try {
    const { no_sesion, fecha, hora, grupo_id, plan_tutoria_id, observaciones } = req.body;

    if (!no_sesion || !fecha || !hora || !grupo_id || !plan_tutoria_id) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: no_sesion, fecha, hora, grupo_id, plan_tutoria_id.',
      });
    }

    // Verificar que el plan esté activo
    const { data: plan } = await supabase
      .from('planes_tutoria')
      .select('estado')
      .eq('id', plan_tutoria_id)
      .single();

    if (!plan || plan.estado !== 'activo') {
      return res.status(409).json({ success: false, message: 'El plan de tutoría no está activo.' });
    }

    const { data: sesion, error } = await supabase
      .from('sesiones')
      .insert([{ no_sesion, fecha, hora, grupo_id, plan_tutoria_id, observaciones: observaciones || null }])
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.status(201).json({ success: true, message: 'Sesión creada exitosamente.', data: { sesion } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Listar sesiones del tutor (por su usuario_id)
//  GET /api/asistencias/mis-sesiones?tutor_id=:id
// ═══════════════════════════════════════════════════════════════
const listarSesionesDelTutor = async (req, res, next) => {
  try {
    const { tutor_id } = req.query;
    const rol = req.usuario ? req.usuario.rol : null;

    if (rol === 'Tutor') {
      if (!tutor_id) {
        return res.status(400).json({ success: false, message: 'Se requiere tutor_id.' });
      }

      // Obtener grupos del tutor
      const { data: grupos } = await supabase
        .from('grupos')
        .select('id, clave_grupo, horario, plan_tutoria_id')
        .eq('tutor_id', tutor_id);

      if (!grupos || grupos.length === 0) {
        return res.status(200).json({ success: true, data: { sesiones: [] } });
      }

      const grupoIds = grupos.map(g => g.id);

      const { data: sesiones, error } = await supabase
        .from('sesiones')
        .select(`
          *,
          grupos(id, clave_grupo, horario),
          planes_tutoria(nombre, semestre, estado)
        `)
        .in('grupo_id', grupoIds)
        .order('fecha', { ascending: false });

      if (error) return res.status(400).json({ success: false, message: error.message });

      return res.status(200).json({ success: true, data: { total: sesiones.length, sesiones } });
    } else {
      // Para Administrador / Coordinador: Mostrar todas las sesiones
      const { data: sesiones, error } = await supabase
        .from('sesiones')
        .select(`
          *,
          grupos(id, clave_grupo, horario),
          planes_tutoria(nombre, semestre, estado)
        `)
        .order('fecha', { ascending: false });

      if (error) return res.status(400).json({ success: false, message: error.message });

      return res.status(200).json({ success: true, data: { total: sesiones.length, sesiones } });
    }
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Obtener alumnos de una sesión con su asistencia registrada
//  GET /api/asistencias/sesiones/:sesionId/alumnos
// ═══════════════════════════════════════════════════════════════
const obtenerAlumnosDeSesion = async (req, res, next) => {
  try {
    const { sesionId } = req.params;

    const { data: sesion, error: errorSesion } = await supabase
      .from('sesiones')
      .select('*, grupos(id, clave_grupo, tutor_id)')
      .eq('id', sesionId)
      .single();

    if (errorSesion || !sesion) {
      return res.status(404).json({ success: false, message: 'Sesión no encontrada.' });
    }

    // Tutorados del grupo
    const { data: tutoradosGrupo } = await supabase
      .from('grupo_tutorados')
      .select(`
        tutorado_id,
        tutorados:tutorado_id(
          usuario_id,
          num_control_tutorado,
          usuarios!inner(nombre_completo, correo)
        )
      `)
      .eq('grupo_id', sesion.grupo_id);

    // Asistencias ya registradas para esta sesión
    const { data: asistenciasRegistradas } = await supabase
      .from('asistencias')
      .select('tutorado_id, asistio')
      .eq('sesion_id', sesionId);

    const asistenciaMap = {};
    (asistenciasRegistradas || []).forEach(a => { asistenciaMap[a.tutorado_id] = a.asistio; });

    const alumnos = (tutoradosGrupo || []).map(gt => ({
      tutorado_id: gt.tutorado_id,
      num_control: gt.tutorados?.num_control_tutorado || '',
      nombre_completo: gt.tutorados?.usuarios?.nombre_completo || '',
      correo: gt.tutorados?.usuarios?.correo || '',
      asistio: asistenciaMap[gt.tutorado_id] ?? null,
    }));

    res.status(200).json({ success: true, data: { sesion, alumnos } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU05 – Capturar Asistencias
//  POST /api/asistencias/sesiones/:sesionId
// ═══════════════════════════════════════════════════════════════
const capturarAsistencias = async (req, res, next) => {
  try {
    const { sesionId } = req.params;
    const { asistencias, tutor_id } = req.body;

    if (!asistencias || !Array.isArray(asistencias) || asistencias.length === 0 || !tutor_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un arreglo "asistencias" y el tutor_id.',
      });
    }

    // Verificar sesión y PAT
    const { data: sesion, error: errorSesion } = await supabase
      .from('sesiones')
      .select('*, planes_tutoria(estado), grupos(tutor_id)')
      .eq('id', sesionId)
      .single();

    if (errorSesion || !sesion) {
      return res.status(404).json({ success: false, message: 'Sesión no encontrada.' });
    }

    if (sesion.estado === 'cancelada') {
      return res.status(409).json({ success: false, message: 'No se puede registrar asistencia en una sesión cancelada.' });
    }

    if (!sesion.planes_tutoria || sesion.planes_tutoria.estado !== 'activo') {
      return res.status(409).json({ success: false, message: 'La sesión no pertenece a un PAT activo.' });
    }

    if (sesion.grupos.tutor_id !== tutor_id) {
      return res.status(403).json({ success: false, message: 'Solo el tutor asignado al grupo puede capturar asistencias.' });
    }

    // Insertar o actualizar (Upsert)
    const registros = asistencias.map(({ tutorado_id, asistencia }) => ({
      sesion_id: sesionId,
      tutorado_id,
      asistio: asistencia
    }));

    const { error: upsertError } = await supabase
      .from('asistencias')
      .upsert(registros, { onConflict: 'sesion_id,tutorado_id' });

    if (upsertError) {
      return res.status(400).json({ success: false, message: upsertError.message });
    }

    if (sesion.estado === 'programada') {
      await supabase.from('sesiones').update({ estado: 'realizada' }).eq('id', sesionId);
    }

    res.status(200).json({
      success: true,
      message: 'Asistencias capturadas exitosamente.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  crearSesion,
  listarSesionesDelTutor,
  obtenerAlumnosDeSesion,
  capturarAsistencias,
};

