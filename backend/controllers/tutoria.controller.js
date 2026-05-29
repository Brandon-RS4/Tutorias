/**
 * controllers/tutoria.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU02 – Asignar actividades del Programa de Tutorías → registrarActividad
 * CU03 – Asignar a los Tutores                        → asignarTutor
 * CU04 – Asignar Tutorados a los Tutores              → asignarTutorado
 * ─────────────────────────────────────────────────────────────────
 */

const { supabase } = require('../config/supabase');

// ═══════════════════════════════════════════════════════════════
//  CU02 – Asignar actividades del Programa de Tutorías
//  Actor: Coordinador Institucional de Tutorías
//  POST /api/tutorias/planes/:planId/actividades
// ═══════════════════════════════════════════════════════════════
const registrarActividad = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { nombre, instrucciones, no_actividad, fecha_realizacion } = req.body;

    // A1. Datos incompletos
    if (!nombre || !instrucciones || !no_actividad || !fecha_realizacion) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: nombre, instrucciones, no_actividad, fecha_realizacion.',
      });
    }

    const { data: plan, error: planError } = await supabase
      .from('planes_tutoria')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ success: false, message: 'Plan de tutoría no encontrado.' });
    }

    // A2. Validar que el plan esté activo
    if (plan.estado !== 'activo') {
      return res.status(409).json({
        success: false,
        message: `El plan de tutoría no está activo. Estado actual: '${plan.estado}'.`,
      });
    }

    // A2. Validar que la fecha ingresada corresponda al periodo académico vigente
    const fechaRealizacionDate = new Date(fecha_realizacion);
    const fechaIni = new Date(plan.fecha_ini);
    const fechaFin = new Date(plan.fecha_fin);

    if (fechaRealizacionDate < fechaIni || fechaRealizacionDate > fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de realización ingresada está fuera del periodo académico del plan.',
      });
    }

    // Crear la actividad
    const { data: actividad, error: actividadError } = await supabase
      .from('actividades')
      .insert([{
        no_actividad,
        nombre,
        instrucciones,
        fecha_realizacion,
        plan_tutoria_id: planId
      }])
      .select()
      .single();

    if (actividadError) {
      return res.status(400).json({ success: false, message: actividadError.message });
    }

    res.status(201).json({
      success: true,
      message: 'Actividad registrada exitosamente.',
      data: { actividad },
    });
  } catch (err) {
    next(err);
  }
};

// ── Listar Actividades de un Plan ──────────────────────────────────
const listarActividadesPorPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;

    const { data: actividades, error } = await supabase
      .from('actividades')
      .select('*')
      .eq('plan_tutoria_id', planId)
      .order('no_actividad', { ascending: true });

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.status(200).json({ success: true, data: { total: actividades.length, actividades } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU03 – Asignar a los Tutores
//  Actor: Coordinador Institucional de Tutorías
//  POST /api/tutorias/tutores/asignar
// ═══════════════════════════════════════════════════════════════
const asignarTutor = async (req, res, next) => {
  try {
    const { tutor_id, grupo_id } = req.body;

    if (!tutor_id || !grupo_id) {
      return res.status(400).json({ success: false, message: 'Se requieren tutor_id y grupo_id.' });
    }

    // Verificar tutor
    const { data: tutor, error: tutorError } = await supabase
      .from('tutores')
      .select('*, usuarios!inner(activo)')
      .eq('usuario_id', tutor_id)
      .single();

    if (tutorError || !tutor) {
      return res.status(404).json({ success: false, message: 'Tutor no encontrado.' });
    }

    if (!tutor.usuarios.activo) {
      return res.status(409).json({ success: false, message: 'El tutor seleccionado no está activo.' });
    }

    // Verificar grupo
    const { data: grupo, error: grupoError } = await supabase
      .from('grupos')
      .select('*')
      .eq('id', grupo_id)
      .single();

    if (grupoError || !grupo) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    // Conflicto: grupo ya tiene tutor diferente
    if (grupo.tutor_id && grupo.tutor_id !== tutor_id) {
      return res.status(409).json({ success: false, message: 'El grupo ya tiene un tutor asignado.' });
    }

    // Conflicto de horario
    const { data: grupoExistente } = await supabase
      .from('grupos')
      .select('clave_grupo')
      .eq('tutor_id', tutor_id)
      .eq('horario', grupo.horario)
      .neq('id', grupo_id)
      .single();

    if (grupoExistente) {
      return res.status(409).json({ success: false, message: `Conflicto de horario con el grupo ${grupoExistente.clave_grupo}.` });
    }

    // Asignar
    const { error: updateError } = await supabase
      .from('grupos')
      .update({ tutor_id })
      .eq('id', grupo_id);

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    res.status(200).json({ success: true, message: 'Tutor asignado exitosamente al grupo.' });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU04 – Asignar Tutorados a los Tutores
//  POST /api/tutorias/tutorados/asignar
// ═══════════════════════════════════════════════════════════════
const asignarTutorado = async (req, res, next) => {
  try {
    const { tutorado_id, tutor_id } = req.body;

    if (!tutorado_id || !tutor_id) {
      return res.status(400).json({ success: false, message: 'Se requieren tutorado_id y tutor_id.' });
    }

    // Verificar tutorado
    const { data: tutorado, error: tutoradoError } = await supabase
      .from('tutorados')
      .select('*')
      .eq('usuario_id', tutorado_id)
      .single();

    if (tutoradoError || !tutorado) {
      return res.status(404).json({ success: false, message: 'Tutorado no encontrado.' });
    }

    // Verificar tutor
    const { data: tutor, error: tutorError } = await supabase
      .from('tutores')
      .select('*, usuarios!inner(activo)')
      .eq('usuario_id', tutor_id)
      .single();

    if (tutorError || !tutor) {
      return res.status(404).json({ success: false, message: 'Tutor no encontrado.' });
    }

    if (!tutor.usuarios.activo) {
      return res.status(409).json({ success: false, message: 'El tutor seleccionado no está activo.' });
    }

    // Límite de tutorados
    const { count } = await supabase
      .from('tutorados')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', tutor_id);

    if (count >= tutor.max_tutorados) {
      return res.status(409).json({ success: false, message: `El tutor alcanzó el límite de ${tutor.max_tutorados} tutorados.` });
    }

    // Ya asignado a otro
    if (tutorado.tutor_id && tutorado.tutor_id !== tutor_id) {
      return res.status(409).json({ success: false, message: 'El tutorado ya está asignado a otro tutor.' });
    }

    // Asignar
    const { error: updateError } = await supabase
      .from('tutorados')
      .update({ tutor_id })
      .eq('usuario_id', tutorado_id);

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    // Opcionalmente agregarlo al grupo si existe uno
    const { data: grupos } = await supabase
      .from('grupos')
      .select('id')
      .eq('tutor_id', tutor_id)
      .limit(1);

    if (grupos && grupos.length > 0) {
      await supabase
        .from('grupo_tutorados')
        .insert([{ grupo_id: grupos[0].id, tutorado_id }]);
    }

    res.status(200).json({ success: true, message: 'Tutorado asignado exitosamente al tutor.' });
  } catch (err) {
    next(err);
  }
};

// ── Crear un Plan de Tutoría ──────────────────────────────────────
const crearPlanTutoria = async (req, res, next) => {
  try {
    const { nombre, semestre, fecha_ini, fecha_fin, coordinador_pt_id } = req.body;
    const deptoId = req.body.departamento_id || req.body.departamento || null;

    if (!nombre || !semestre || !fecha_ini || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: nombre, semestre, fecha_ini, fecha_fin.',
      });
    }

    const { data: plan, error } = await supabase
      .from('planes_tutoria')
      .insert([{
        nombre,
        semestre,
        fecha_ini,
        fecha_fin,
        departamento_id: deptoId,
        coordinador_pt_id,
        estado: 'activo',
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.status(201).json({ success: true, message: 'Plan de tutoría creado.', data: { plan } });
  } catch (err) {
    next(err);
  }
};

// ── Listar planes de tutoría ──────────────────────────────────────
const listarPlanes = async (req, res, next) => {
  try {
    const { departamento_id, estado } = req.query;
    
    let query = supabase.from('planes_tutoria').select(`
      *,
      departamentos_academicos(nombre),
      usuarios(nombre_completo)
    `);

    if (departamento_id) query = query.eq('departamento_id', departamento_id);
    if (estado) query = query.eq('estado', estado);

    const { data: planes, error } = await query;

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.status(200).json({ success: true, data: { total: planes.length, planes } });
  } catch (err) {
    next(err);
  }
};

// ── Crear grupo ───────────────────────────────────────────────────
const crearGrupo = async (req, res, next) => {
  try {
    const { clave_grupo, horario, plan_tutoria_id } = req.body;

    if (!clave_grupo || !horario || !plan_tutoria_id) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: clave_grupo, horario, plan_tutoria_id.',
      });
    }

    const { data: grupo, error } = await supabase
      .from('grupos')
      .insert([{ clave_grupo, horario, plan_tutoria_id, cantidad: 0 }])
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.status(201).json({ success: true, message: 'Grupo creado.', data: { grupo } });
  } catch (err) {
    next(err);
  }
};

// ── Listar Grupos ─────────────────────────────────────────────────
const listarGrupos = async (req, res, next) => {
  try {
    const { plan_tutoria_id } = req.query;
    let query = supabase.from('grupos').select(`
      *,
      planes_tutoria(nombre, semestre),
      tutores(usuarios(nombre_completo, correo))
    `);

    if (plan_tutoria_id) query = query.eq('plan_tutoria_id', plan_tutoria_id);

    const { data: grupos, error } = await query;

    if (error) return res.status(400).json({ success: false, message: error.message });

    const gruposMapeados = (grupos || []).map(g => {
      let tutorObj = null;
      if (g.tutores && g.tutores.usuarios) {
        tutorObj = {
          nombre_completo: g.tutores.usuarios.nombre_completo,
          correo: g.tutores.usuarios.correo
        };
      }
      const { tutores, ...grupoRest } = g;
      return {
        ...grupoRest,
        tutor_id: g.tutor_id,   // asegurar que tutor_id esté presente
        tutor: tutorObj
      };
    });

    res.status(200).json({ success: true, data: { total: gruposMapeados.length, grupos: gruposMapeados } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registrarActividad,
  asignarTutor,
  asignarTutorado,
  crearPlanTutoria,
  listarPlanes,
  crearGrupo,
  listarGrupos,
  listarActividadesPorPlan,
};
