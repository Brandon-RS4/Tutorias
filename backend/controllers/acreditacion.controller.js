/**
 * controllers/acreditacion.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU10 – Generar formato de acreditación
 * ─────────────────────────────────────────────────────────────────
 */

const { supabase } = require('../config/supabase');

// ═══════════════════════════════════════════════════════════════
//  Obtener grupos del coordinador (Paso 2)
//  GET /api/acreditacion/grupos
// ═══════════════════════════════════════════════════════════════
const obtenerGruposParaAcreditacion = async (req, res, next) => {
  try {
    // Obtenemos todos los grupos con sus planes (el coordinador ve todos)
    const { data: grupos, error } = await supabase
      .from('grupos')
      .select(`
        id,
        clave_grupo,
        horario,
        tutor_id,
        tutores(usuarios(nombre_completo)),
        planes_tutoria!inner(id, nombre, semestre, estado)
      `)
      .order('clave_grupo', { ascending: true });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const gruposMapeados = (grupos || []).map(g => ({
      id: g.id,
      clave_grupo: g.clave_grupo,
      horario: g.horario,
      tutor_id: g.tutor_id,
      usuarios: {
        nombre_completo: g.tutores?.usuarios?.nombre_completo || 'Sin tutor asignado'
      },
      planes_tutoria: g.planes_tutoria
    }));

    res.status(200).json({
      success: true,
      data: { grupos: gruposMapeados }
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  Obtener tutorados de un grupo y su estado de acreditación
//  GET /api/acreditacion/grupos/:grupoId/tutorados
// ═══════════════════════════════════════════════════════════════
const obtenerTutoradosParaConstancia = async (req, res, next) => {
  try {
    const { grupoId } = req.params;

    // 1. Verificar grupo y obtener plan
    const { data: grupo, error: errorGrupo } = await supabase
      .from('grupos')
      .select('id, plan_tutoria_id, planes_tutoria(semestre)')
      .eq('id', grupoId)
      .single();

    if (errorGrupo || !grupo) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    // 2. Obtener tutorados del grupo
    const { data: tutoradosGrupo, error: errorTutorados } = await supabase
      .from('grupo_tutorados')
      .select(`
        tutorado_id,
        tutorados:tutorado_id(
          usuario_id,
          num_control_tutorado,
          usuarios(nombre_completo, correo)
        )
      `)
      .eq('grupo_id', grupoId);

    if (errorTutorados) {
      return res.status(400).json({ success: false, message: errorTutorados.message });
    }

    if (!tutoradosGrupo || tutoradosGrupo.length === 0) {
      return res.status(200).json({ success: true, data: { tutorados: [] } });
    }

    const tutoradosIds = tutoradosGrupo.map(gt => gt.tutorado_id);

    // 3. Obtener evaluaciones finales del plan actual
    const { data: evaluaciones } = await supabase
      .from('evaluaciones_finales')
      .select('*')
      .in('tutorado_id', tutoradosIds)
      .eq('plan_tutoria_id', grupo.plan_tutoria_id);

    const evalMap = {};
    (evaluaciones || []).forEach(e => { evalMap[e.tutorado_id] = e; });

    // 4. Obtener si ya existe constancia (para A3 / status visual)
    const { data: formatos } = await supabase
      .from('formatos_acreditacion')
      .select('tutorado_id, url_documento, creado_en')
      .in('tutorado_id', tutoradosIds)
      .eq('plan_tutoria_id', grupo.plan_tutoria_id);

    const formatosMap = {};
    (formatos || []).forEach(f => { formatosMap[f.tutorado_id] = f; });

    // 5. Mapear respuesta
    const resultado = tutoradosGrupo.map(gt => {
      const t = gt.tutorados;
      const evaluacion = evalMap[gt.tutorado_id];
      const constancia = formatosMap[gt.tutorado_id];

      return {
        id: t.usuario_id,
        num_control: t.num_control_tutorado,
        nombre: t.usuarios?.nombre_completo,
        correo: t.usuarios?.correo,
        evaluado: !!evaluacion,
        acreditado: evaluacion?.acreditado || false,
        calificacion: evaluacion?.calificacion_final || null,
        observaciones: evaluacion?.observaciones || null,
        constancia_generada: !!constancia,
        constancia_url: constancia?.url_documento || null,
        fecha_constancia: constancia?.creado_en || null,
        semestre_plan: grupo.planes_tutoria?.semestre || ''
      };
    });

    res.status(200).json({
      success: true,
      data: {
        tutorados: resultado,
        total: resultado.length
      }
    });

  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU10 – Generar formato de acreditación
//  POST /api/acreditacion/:tutoradoId/plan/:planId
// ═══════════════════════════════════════════════════════════════
const generarFormatoAcreditacion = async (req, res, next) => {
  try {
    const { tutoradoId, planId } = req.params;
    const emisor_id = req.usuario.id; // Obtenemos del token

    // 1. Verificar si existe evaluación aprobatoria (A1 / A2)
    const { data: evaluacion, error: errorEval } = await supabase
      .from('evaluaciones_finales')
      .select('acreditado, calificacion_final')
      .eq('tutorado_id', tutoradoId)
      .eq('plan_tutoria_id', planId)
      .single();

    if (errorEval || !evaluacion) {
      return res.status(409).json({
        success: false,
        message: 'Datos incompletos: El alumno no ha sido evaluado en este plan.'
      });
    }

    if (!evaluacion.acreditado) {
      return res.status(409).json({
        success: false,
        message: 'Alumno no acreditado: No cumple con los requisitos para generar la constancia.'
      });
    }

    // 2. Verificar si ya existe formato
    const { data: formatoExistente } = await supabase
      .from('formatos_acreditacion')
      .select('id, url_documento')
      .eq('tutorado_id', tutoradoId)
      .eq('plan_tutoria_id', planId)
      .single();

    if (formatoExistente) {
      return res.status(200).json({
        success: true,
        message: 'La constancia ya existía y ha sido recuperada.',
        data: { formato: formatoExistente }
      });
    }

    // 3. Generar registro de constancia
    // Nota: Como generamos el PDF en el cliente (jsPDF), en un sistema real
    // el backend generaría el PDF aquí, lo subiría a Storage, y guardaría la URL.
    // Para cumplir el CU, guardaremos el registro simbólico.
    const url_documento = `/constancias/${tutoradoId}_${planId}.pdf`;

    const { data: formato, error: formatoError } = await supabase
      .from('formatos_acreditacion')
      .insert([{
        tutorado_id: tutoradoId,
        plan_tutoria_id: planId,
        emitido_por: emisor_id,
        url_documento
      }])
      .select()
      .single();

    if (formatoError) {
      return res.status(400).json({ success: false, message: formatoError.message });
    }

    res.status(201).json({
      success: true,
      message: 'Registro de acreditación almacenado exitosamente.',
      data: { formato }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  obtenerGruposParaAcreditacion,
  obtenerTutoradosParaConstancia,
  generarFormatoAcreditacion,
};
