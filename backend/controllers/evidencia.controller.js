/**
 * controllers/evidencia.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU06 – Evaluar y registrar evidencias  → evaluarEvidencia
 * CU07 – Subir evidencias               → subirEvidencia
 *                                       → listarActividadesDelTutorado
 *                                       → listarMisEvidencias
 * ─────────────────────────────────────────────────────────────────
 */

const { supabase } = require('../config/supabase');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════
//  CU07 – Listar actividades disponibles para el tutorado
//  GET /api/evidencias/mis-actividades
//  Retorna las actividades de los planes activos del grupo del tutorado
// ═══════════════════════════════════════════════════════════════
const listarActividadesDelTutorado = async (req, res, next) => {
  try {
    const tutoradoUserId = req.usuario.id;

    // 1. Obtener el registro de tutorado (para el tutorado_id de la tabla tutorados)
    const { data: tutorado, error: errTutorado } = await supabase
      .from('tutorados')
      .select('usuario_id, tutor_id')
      .eq('usuario_id', tutoradoUserId)
      .single();

    if (errTutorado || !tutorado) {
      return res.status(404).json({ success: false, message: 'No se encontró tu perfil de tutorado.' });
    }

    // 2. Obtener el grupo al que pertenece
    const { data: grupoTutorado } = await supabase
      .from('grupo_tutorados')
      .select('grupo_id')
      .eq('tutorado_id', tutoradoUserId)
      .limit(1);

    const grupoId = grupoTutorado?.[0]?.grupo_id || null;

    // 3. Obtener plan(es) activo(s) y sesiones del grupo. Si tiene grupo, usar el plan de ese grupo.
    let planIds = [];
    let sesionesIds = [];
    let planTutoriaObj = null;

    if (grupoId) {
      const { data: grupo } = await supabase
        .from('grupos')
        .select(`
          plan_tutoria_id,
          sesiones(id),
          planes_tutoria(id, nombre, semestre, estado)
        `)
        .eq('id', grupoId)
        .single();
        
      if (grupo) {
        planIds = [grupo.plan_tutoria_id];
        sesionesIds = (grupo.sesiones || []).map(s => s.id);
        planTutoriaObj = grupo.planes_tutoria;
      }
    }

    // Si el tutorado no está en ningún grupo, no debe ver actividades.
    if (planIds.length === 0) {
      return res.status(200).json({ success: true, data: { actividades: [], mensaje: 'No estás asignado a ningún grupo activo de tutorías.' } });
    }

    const todosLosIds = planIds;

    // 4. Obtener actividades activas de esos planes (globales)
    const { data: actividadesDelPlan, error: errActs } = await supabase
      .from('actividades')
      .select(`
        id,
        no_actividad,
        nombre,
        instrucciones,
        fecha_realizacion,
        plan_tutoria_id,
        activa,
        planes_tutoria(id, nombre, semestre, estado)
      `)
      .in('plan_tutoria_id', todosLosIds)
      .eq('activa', true);

    if (errActs) return res.status(400).json({ success: false, message: errActs.message });

    // 4.5 Obtener actividades personalizadas para el grupo del tutorado
    let actividadesPersonalizadas = [];
    if (sesionesIds.length > 0) {
      const { data: sesionActvs } = await supabase
        .from('sesion_actividades')
        .select(`
          actividades(id, no_actividad, nombre, instrucciones, fecha_realizacion, plan_tutoria_id, activa)
        `)
        .in('sesion_id', sesionesIds);
        
      actividadesPersonalizadas = (sesionActvs || []).map(sa => sa.actividades).filter(Boolean).filter(a => a.activa);
    }

    // Combinar priorizando las personalizadas por no_actividad
    const actsMap = new Map();
    actividadesPersonalizadas.forEach(a => {
      // Como son personalizadas (plan_tutoria_id = null), le inyectamos la info del plan
      a.planes_tutoria = planTutoriaObj;
      actsMap.set(a.no_actividad, a);
    });

    (actividadesDelPlan || []).forEach(a => {
      if (!actsMap.has(a.no_actividad)) {
        actsMap.set(a.no_actividad, a);
      }
    });

    const actividades = Array.from(actsMap.values()).sort((a, b) => a.no_actividad - b.no_actividad);

    // 5. Para cada actividad, ver si el tutorado ya subió evidencia
    const actividadIds = (actividades || []).map(a => a.id);
    let evidenciasMap = {};
    if (actividadIds.length > 0) {
      const { data: evidencias } = await supabase
        .from('evidencias')
        .select('actividad_id, estado, id, fecha_carga')
        .eq('tutorado_id', tutoradoUserId)
        .in('actividad_id', actividadIds);

      (evidencias || []).forEach(e => {
        evidenciasMap[e.actividad_id] = { estado: e.estado, evidencia_id: e.id, fecha_carga: e.fecha_carga };
      });
    }

    const resultado = (actividades || []).map(a => ({
      ...a,
      evidencia_entregada: evidenciasMap[a.id] || null,
    }));

    res.status(200).json({ success: true, data: { total: resultado.length, actividades: resultado } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU07 – Listar evidencias del propio tutorado
//  GET /api/evidencias/mis-evidencias
// ═══════════════════════════════════════════════════════════════
const listarMisEvidencias = async (req, res, next) => {
  try {
    const tutoradoUserId = req.usuario.id;

    const { data: evidencias, error } = await supabase
      .from('evidencias')
      .select(`
        id,
        archivo_url,
        estado,
        calificacion,
        observaciones_tutor,
        fecha_carga,
        fecha_evaluacion,
        actividades(id, nombre, no_actividad, planes_tutoria(nombre, semestre))
      `)
      .eq('tutorado_id', tutoradoUserId)
      .order('fecha_carga', { ascending: false });

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.status(200).json({ success: true, data: { total: evidencias.length, evidencias } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU07 – Subir evidencias
//  Actor: Tutorado
//  POST /api/evidencias/subir  (multipart/form-data con campo "archivo")
// ═══════════════════════════════════════════════════════════════
const subirEvidencia = async (req, res, next) => {
  try {
    // tutorado_id viene del JWT, NO del body (seguridad)
    const tutorado_id = req.usuario.id;
    const { actividad_id } = req.body;

    if (!actividad_id) {
      return res.status(400).json({
        success: false,
        message: 'El campo actividad_id es obligatorio.',
      });
    }

    // A1 – Formato no soportado y A2 – Tamaño excedido:
    // son manejados por upload.middleware antes de llegar aquí.
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debe adjuntar un archivo.',
      });
    }

    // Verificar que el tutorado exista
    const { data: tutorado, error: errTutorado } = await supabase
      .from('tutorados')
      .select('usuario_id')
      .eq('usuario_id', tutorado_id)
      .single();

    if (errTutorado || !tutorado) {
      return res.status(404).json({ success: false, message: 'No se encontró tu perfil de tutorado.' });
    }

    // A3 – Verificar actividad activa y PAT activo
    const { data: actividad, error: actividadError } = await supabase
      .from('actividades')
      .select('id, nombre, activa, plan_tutoria_id, planes_tutoria(estado)')
      .eq('id', actividad_id)
      .single();

    if (actividadError || !actividad) {
      return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });
    }

    // Si es actividad global, validamos que su plan esté activo
    if (actividad.plan_tutoria_id !== null) {
      if (!actividad.planes_tutoria || actividad.planes_tutoria.estado !== 'activo') {
        return res.status(409).json({ success: false, message: 'La actividad no pertenece a un PAT activo. No se puede subir la evidencia.' });
      }
    }

    if (!actividad.activa) {
      return res.status(409).json({ success: false, message: 'Esta actividad no está habilitada para recibir evidencias.' });
    }

    // Paso 8 y 9: Almacenar evidencia con fecha_carga (columna default de BD) y tutorado_id
    const { data: evidencia, error: evidenciaError } = await supabase
      .from('evidencias')
      .insert([{
        actividad_id,
        tutorado_id,
        archivo_url: req.file.path,
        estado: 'entregado',  // Paso 11: estado → Entregado
      }])
      .select()
      .single();

    if (evidenciaError) {
      return res.status(400).json({ success: false, message: evidenciaError.message });
    }

    // Paso 10: Acuse de recibo con datos completos
    res.status(201).json({
      success: true,
      message: `¡Evidencia para "${actividad.nombre}" subida exitosamente!`,
      data: {
        evidencia,
        acuse: {
          actividad: actividad.nombre,
          archivo: req.file.originalname,
          tamanio_kb: Math.round(req.file.size / 1024),
          fecha_carga: new Date().toISOString(),
          estado: 'entregado',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU06 – Evaluar y registrar evidencias
//  Actor: Tutor
//  PATCH /api/evidencias/:id/evaluar
// ═══════════════════════════════════════════════════════════════
const evaluarEvidencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resultado, calificacion, observaciones } = req.body;
    const evaluado_por = req.usuario.id; // Paso 9: usuario responsable del JWT

    if (!resultado) {
      return res.status(400).json({
        success: false,
        message: 'El campo resultado es obligatorio.',
      });
    }

    if (!['aprobada', 'rechazada'].includes(resultado)) {
      return res.status(400).json({
        success: false,
        message: 'El resultado debe ser "aprobada" o "rechazada".',
      });
    }

    const { data: evidencia, error: errorEvidencia } = await supabase
      .from('evidencias')
      .select(`
        *,
        actividades(id, nombre, activa, plan_tutoria_id, planes_tutoria(estado)),
        tutorados(
          usuario_id,
          usuarios!inner(nombre_completo, correo)
        )
      `)
      .eq('id', id)
      .single();

    if (errorEvidencia || !evidencia) {
      return res.status(404).json({ success: false, message: 'Evidencia no encontrada.' });
    }

    // A3 – PAT inactivo (si es global)
    if (evidencia.actividades?.plan_tutoria_id !== null) {
      if (!evidencia.actividades?.planes_tutoria || evidencia.actividades.planes_tutoria.estado !== 'activo') {
        return res.status(409).json({ success: false, message: 'La evidencia no pertenece a un PAT activo. No se puede evaluar.' });
      }
    }

    // A1 – Archivo inaccesible
    if (evidencia.archivo_url && !fs.existsSync(evidencia.archivo_url)) {
      return res.status(410).json({ success: false, message: 'El archivo no puede visualizarse o descargarse. Solicite una nueva carga al tutorado.' });
    }

    // Mapeo: 'aprobada' → 'evaluado' | 'rechazada' → 'pendiente_reenvio' (A2 – flujo alterno CU06)
    const nuevoEstado = resultado === 'aprobada' ? 'evaluado' : 'pendiente_reenvio';

    const { data: updated, error: updateError } = await supabase
      .from('evidencias')
      .update({
        estado: nuevoEstado,
        evaluado_por,                           // Paso 9: responsable
        calificacion: calificacion || null,
        observaciones_tutor: observaciones || '',
        fecha_evaluacion: new Date().toISOString() // Paso 9: fecha y hora
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    const tutoradoNombre = evidencia.tutorados?.usuarios?.nombre_completo || 'Tutorado';
    const tutoradoCorreo = evidencia.tutorados?.usuarios?.correo || '';

    res.status(200).json({
      success: true,
      message: `Evidencia ${resultado === 'aprobada' ? 'aprobada' : 'rechazada'} exitosamente.${resultado === 'rechazada' ? ' El tutorado podrá realizar un nuevo envío.' : ''}`,
      data: {
        evidencia: updated,
        notificacion: {
          tutorado: tutoradoNombre,
          correo: tutoradoCorreo,
          resultado: nuevoEstado,
        }
      },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Listar evidencias (Tutor: solo sus tutorados; Admin: todas)
//  GET /api/evidencias?estado=&tutorado_id=&actividad_id=
// ═══════════════════════════════════════════════════════════════
const listarEvidencias = async (req, res, next) => {
  try {
    const { tutorado_id, estado, actividad_id } = req.query;
    const usuarioRol = req.usuario.rol;
    const usuarioId  = req.usuario.id;

    let query = supabase.from('evidencias').select(`
      id,
      archivo_url,
      estado,
      calificacion,
      observaciones_tutor,
      fecha_carga,
      fecha_evaluacion,
      tutorado_id,
      actividad_id,
      evaluado_por,
      tutorados(
        usuario_id,
        num_control_tutorado,
        tutor_id,
        usuarios!inner(nombre_completo, correo)
      ),
      actividades(
        id,
        nombre,
        plan_tutoria_id,
        planes_tutoria(nombre, semestre, estado)
      )
    `);

    if (tutorado_id)  query = query.eq('tutorado_id', tutorado_id);
    if (estado)       query = query.eq('estado', estado);
    if (actividad_id) query = query.eq('actividad_id', actividad_id);

    query = query.order('fecha_carga', { ascending: false });

    const { data: evidencias, error } = await query;

    if (error) return res.status(400).json({ success: false, message: error.message });

    let resultado = evidencias || [];

    // Si es Tutor, filtrar solo las de sus tutorados
    if (usuarioRol === 'Tutor') {
      // Obtenemos los grupos del tutor
      const { data: grupos } = await supabase.from('grupos').select('id').eq('tutor_id', usuarioId);
      const gruposIds = (grupos || []).map(g => g.id);
      
      let tutoradosDelTutor = [];
      if (gruposIds.length > 0) {
        const { data: gt } = await supabase.from('grupo_tutorados').select('tutorado_id').in('grupo_id', gruposIds);
        tutoradosDelTutor = (gt || []).map(x => x.tutorado_id);
      }

      resultado = resultado.filter(e => 
        e.tutorados?.tutor_id === usuarioId || tutoradosDelTutor.includes(e.tutorado_id)
      );
    }

    res.status(200).json({ success: true, data: { total: resultado.length, evidencias: resultado } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Obtener una evidencia por ID
//  GET /api/evidencias/:id
// ═══════════════════════════════════════════════════════════════
const obtenerEvidencia = async (req, res, next) => {
  try {
    const { data: evidencia, error } = await supabase
      .from('evidencias')
      .select(`
        *,
        tutorados(
          usuario_id,
          num_control_tutorado,
          usuarios!inner(nombre_completo, correo)
        ),
        actividades(
          id,
          nombre,
          instrucciones,
          planes_tutoria(nombre, semestre, estado)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !evidencia) return res.status(404).json({ success: false, message: 'Evidencia no encontrada.' });

    res.status(200).json({ success: true, data: { evidencia } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listarActividadesDelTutorado,
  listarMisEvidencias,
  subirEvidencia,
  evaluarEvidencia,
  listarEvidencias,
  obtenerEvidencia,
};
