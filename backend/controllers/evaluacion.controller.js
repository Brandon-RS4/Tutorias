/**
 * controllers/evaluacion.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU08 – Evaluar tutorados (evaluación final del ciclo)
 * ─────────────────────────────────────────────────────────────────
 */

const { supabase } = require('../config/supabase');

// ═══════════════════════════════════════════════════════════════
//  Listar tutorados del tutor con su estado de evaluación
//  GET /api/evaluaciones/mis-tutorados
//  Retorna lista de tutorados con sus evaluaciones previas si existen
// ═══════════════════════════════════════════════════════════════
const listarTutoradosParaEvaluar = async (req, res, next) => {
  try {
    const tutor_id = req.usuario.id;

    // 1. Obtener los tutorados del tutor
    const { data: tutorados, error: errTutorados } = await supabase
      .from('tutorados')
      .select(`
        usuario_id,
        num_control_tutorado,
        direccion,
        usuarios!inner(id, nombre_completo, correo, activo)
      `)
      .eq('tutor_id', tutor_id);

    if (errTutorados) {
      return res.status(400).json({ success: false, message: errTutorados.message });
    }

    if (!tutorados || tutorados.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tienes tutorados asignados actualmente.',
        data: { tutorados: [] },
      });
    }

    const tutoradoIds = tutorados.map(t => t.usuario_id);

    // 2. Obtener planes activos para saber a cuál plan aplica la evaluación
    const { data: planesActivos } = await supabase
      .from('planes_tutoria')
      .select('id, nombre, semestre')
      .eq('estado', 'activo');

    // 3. Evaluaciones finales ya registradas para estos tutorados
    let evalMap = {};
    if (tutoradoIds.length > 0) {
      const { data: evaluaciones } = await supabase
        .from('evaluaciones_finales')
        .select('tutorado_id, plan_tutoria_id, calificacion_final, observaciones, acreditado')
        .in('tutorado_id', tutoradoIds);

      (evaluaciones || []).forEach(e => {
        evalMap[`${e.tutorado_id}_${e.plan_tutoria_id}`] = e;
      });
    }

    // 4. Porcentaje de asistencia de cada tutorado
    let asistenciaMap = {};
    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('tutorado_id, asistio')
      .in('tutorado_id', tutoradoIds);

    (asistencias || []).forEach(a => {
      if (!asistenciaMap[a.tutorado_id]) asistenciaMap[a.tutorado_id] = { total: 0, presentes: 0 };
      asistenciaMap[a.tutorado_id].total++;
      if (a.asistio) asistenciaMap[a.tutorado_id].presentes++;
    });

    // 5. Evidencias pendientes por tutorado
    let evidenciasMap = {};
    const { data: evidenciasPend } = await supabase
      .from('evidencias')
      .select('tutorado_id, estado')
      .in('tutorado_id', tutoradoIds)
      .in('estado', ['entregado', 'pendiente_reenvio']);

    (evidenciasPend || []).forEach(e => {
      evidenciasMap[e.tutorado_id] = (evidenciasMap[e.tutorado_id] || 0) + 1;
    });

    // 6. Construir la respuesta
    const resultado = tutorados.map(t => {
      const stats = asistenciaMap[t.usuario_id] || { total: 0, presentes: 0 };
      const pctAsistencia = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;

      // Evaluciones por plan
      const evaluacionesPorPlan = (planesActivos || []).map(plan => ({
        plan_id: plan.id,
        plan_nombre: plan.nombre,
        plan_semestre: plan.semestre,
        evaluacion: evalMap[`${t.usuario_id}_${plan.id}`] || null,
      }));

      return {
        _id: t.usuario_id,
        nombre_completo: t.usuarios.nombre_completo,
        correo: t.usuarios.correo,
        num_control_tutorado: t.num_control_tutorado,
        porcentaje_asistencia: pctAsistencia,
        evidencias_pendientes: evidenciasMap[t.usuario_id] || 0,
        evaluaciones_por_plan: evaluacionesPorPlan,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        total: resultado.length,
        tutorados: resultado,
        planes_activos: planesActivos || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU08 – Registrar evaluación final de un tutorado
//  Actor: Tutor
//  POST /api/evaluaciones/tutorados/:tutoradoId
// ═══════════════════════════════════════════════════════════════
const evaluarTutoradoFinal = async (req, res, next) => {
  try {
    const { tutoradoId } = req.params;
    const tutor_id = req.usuario.id; // Del JWT — no del body
    const { calificacion_final, observaciones, plan_id } = req.body;

    // Validaciones de campos obligatorios
    if (calificacion_final === undefined || calificacion_final === null || !plan_id) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: calificacion_final, plan_id.',
      });
    }

    const cal = parseFloat(calificacion_final);
    if (isNaN(cal) || cal < 0 || cal > 4) {
      return res.status(400).json({
        success: false,
        message: 'La calificación debe ser un número entre 0 y 4.',
      });
    }

    // Verificar que el tutorado exista y pertenezca al tutor (validación flujo principal)
    const { data: tutorado, error: errorTutorado } = await supabase
      .from('tutorados')
      .select(`
        tutor_id,
        usuarios!inner(nombre_completo, correo)
      `)
      .eq('usuario_id', tutoradoId)
      .single();

    if (errorTutorado || !tutorado) {
      return res.status(404).json({ success: false, message: 'Tutorado no encontrado.' });
    }

    if (tutorado.tutor_id !== tutor_id) {
      return res.status(403).json({
        success: false,
        message: 'Solo el tutor asignado puede evaluar a este tutorado.',
      });
    }

    // Verificar que el PAT existe y está activo
    const { data: plan } = await supabase
      .from('planes_tutoria')
      .select('estado, nombre, semestre')
      .eq('id', plan_id)
      .single();

    if (!plan || plan.estado !== 'activo') {
      return res.status(409).json({
        success: false,
        message: 'El Plan de Tutoría indicado no está activo.',
      });
    }

    // A2 – Evidencias pendientes: el spec exige que el 100% estén evaluadas antes del cierre
    const { data: evidenciasPend, error: errEv } = await supabase
      .from('evidencias')
      .select('id, actividades(nombre)')
      .eq('tutorado_id', tutoradoId)
      .in('estado', ['entregado', 'pendiente_reenvio']);

    if (!errEv && evidenciasPend && evidenciasPend.length > 0) {
      const actividades = evidenciasPend
        .map(e => e.actividades?.nombre)
        .filter(Boolean)
        .join(', ');
      return res.status(409).json({
        success: false,
        code: 'EVIDENCIAS_PENDIENTES',
        message: `No se puede cerrar la evaluación: existen ${evidenciasPend.length} evidencia(s) sin evaluar (${actividades}). Evalúa todas las evidencias antes de registrar la calificación final.`,
        data: { evidencias_pendientes: evidenciasPend.length },
      });
    }

    // Determinar acreditado (≥ 2 = acreditado por defecto)
    const acreditado = cal >= 2;

    // Insertar o actualizar evaluación final (upsert por tutorado+plan)
    const { data: evaluacion, error: evalError } = await supabase
      .from('evaluaciones_finales')
      .upsert({
        tutorado_id: tutoradoId,
        plan_tutoria_id: plan_id,
        calificacion_final: cal,
        observaciones: observaciones || null,
        acreditado,
        creado_por: tutor_id,
      }, { onConflict: 'tutorado_id,plan_tutoria_id' })
      .select()
      .single();

    if (evalError) {
      return res.status(400).json({ success: false, message: evalError.message });
    }

    res.status(200).json({
      success: true,
      message: `Evaluación registrada exitosamente. ${tutorado.usuarios.nombre_completo} ${acreditado ? 'acreditó' : 'no acreditó'} el programa.`,
      data: {
        evaluacion,
        tutorado: {
          nombre_completo: tutorado.usuarios.nombre_completo,
          correo: tutorado.usuarios.correo,
        },
        plan: {
          nombre: plan.nombre,
          semestre: plan.semestre,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Obtener evaluaciones de un tutorado específico
//  GET /api/evaluaciones/tutorados/:tutoradoId
// ═══════════════════════════════════════════════════════════════
const obtenerEvaluacionesTutorado = async (req, res, next) => {
  try {
    const { tutoradoId } = req.params;

    const { data: evaluaciones, error } = await supabase
      .from('evaluaciones_finales')
      .select(`
        *,
        planes_tutoria(nombre, semestre, estado)
      `)
      .eq('tutorado_id', tutoradoId);

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.status(200).json({ success: true, data: { evaluaciones } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listarTutoradosParaEvaluar,
  evaluarTutoradoFinal,
  obtenerEvaluacionesTutorado,
};
