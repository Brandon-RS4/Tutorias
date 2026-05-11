/**
 * controllers/evidencia.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU06 – Evaluar y registrar evidencias  → evaluarEvidencia
 * CU07 – Subir evidencias               → subirEvidencia
 * CU08 – Evaluar tutorados (final)      → evaluarTutoradoFinal
 * ─────────────────────────────────────────────────────────────────
 */

const path     = require('path');
const {
  Evidencia,
  Actividad,
  Sesion,
  PlanTutoria,
  Tutorado,
  Asistencia,
  FormatoAcreditacion,
  Grupo,
} = require('../models');

// ═══════════════════════════════════════════════════════════════
//  CU07 – Subir evidencias
//  Actor: Tutorado
//  POST /api/evidencias/subir
//  (Multer ya procesó el archivo en req.file)
// ═══════════════════════════════════════════════════════════════
const subirEvidencia = async (req, res, next) => {
  try {
    const { actividad_id, sesion_id, no_evidencia } = req.body;

    // A1. Formato no soportado → Multer ya rechazó el archivo antes de llegar aquí
    // A2. Tamaño excedido       → Multer ya bloqueó antes de llegar aquí

    // A1. Datos incompletos
    if (!actividad_id || !no_evidencia) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: actividad_id, no_evidencia.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debe adjuntar un archivo.',
      });
    }

    // Verificar que la actividad exista y esté activa
    const actividad = await Actividad.findById(actividad_id).populate('plan_tutoria', 'estado fecha_fin');
    if (!actividad) {
      return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });
    }

    // A3. PAT inexistente o inactivo
    if (!actividad.plan_tutoria || actividad.plan_tutoria.estado !== 'activo') {
      return res.status(409).json({
        success: false,
        message: 'La actividad no pertenece a un PAT activo.',
      });
    }

    if (!actividad.activa) {
      return res.status(409).json({
        success: false,
        message: 'La actividad no está habilitada para recibir evidencias.',
      });
    }

    // Si se proporciona sesion_id, validar que exista
    if (sesion_id) {
      const sesion = await Sesion.findById(sesion_id);
      if (!sesion) {
        return res.status(404).json({ success: false, message: 'Sesión no encontrada.' });
      }
    }

    const evidencia = await Evidencia.create({
      no_evidencia : parseInt(no_evidencia, 10),
      tutorado     : req.usuario._id,
      actividad    : actividad_id,
      sesion       : sesion_id || null,
      archivo: {
        nombre_original : req.file.originalname,
        url             : req.file.path,
        mime_type       : req.file.mimetype,
        tamanio_bytes   : req.file.size,
        fecha_carga     : new Date(),
      },
      estado: 'pendiente',
    });

    res.status(201).json({
      success : true,
      message : 'Evidencia subida exitosamente. Estado: pendiente de revisión.',
      data    : { evidencia },
    });
  } catch (err) {
    next(err);
  }
};

// ── Listar evidencias (con filtros) ──────────────────────────────
//  GET /api/evidencias
//  Filtros disponibles: ?tutorado_id= &sesion_id= &estado= &actividad_id=
const listarEvidencias = async (req, res, next) => {
  try {
    const { tutorado_id, sesion_id, estado, actividad_id } = req.query;
    const filtro = {};

    // Si quien consulta es un tutorado, solo ve las suyas
    if (req.usuario.rol === 'tutorado') {
      filtro.tutorado = req.usuario._id;
    } else if (tutorado_id) {
      filtro.tutorado = tutorado_id;
    }

    if (sesion_id)    filtro.sesion    = sesion_id;
    if (estado)       filtro.estado    = estado;
    if (actividad_id) filtro.actividad = actividad_id;

    const evidencias = await Evidencia.find(filtro)
      .populate('tutorado',  'nombre_completo num_control_tutorado')
      .populate('actividad', 'nombre no_actividad')
      .populate('sesion',    'no_sesion fecha')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data   : { total: evidencias.length, evidencias },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
//  Obtener evidencia por ID (descarga/visualización)
//  GET /api/evidencias/:id
// ─────────────────────────────────────────────────────────────────
const obtenerEvidencia = async (req, res, next) => {
  try {
    const evidencia = await Evidencia.findById(req.params.id)
      .populate('tutorado',  'nombre_completo')
      .populate('actividad', 'nombre instrucciones')
      .populate('sesion',    'no_sesion fecha')
      .lean();

    if (!evidencia) {
      return res.status(404).json({ success: false, message: 'Evidencia no encontrada.' });
    }

    // A1. Archivo inaccesible
    const fs = require('fs');
    if (evidencia.archivo?.url && !fs.existsSync(evidencia.archivo.url)) {
      return res.status(410).json({
        success: false,
        message: 'El archivo no está disponible. Solicite al tutorado una nueva carga.',
      });
    }

    res.status(200).json({ success: true, data: { evidencia } });
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

    // A2. Datos incompletos
    if (!resultado) {
      return res.status(400).json({
        success: false,
        message: 'El campo "resultado" es obligatorio (aprobada | rechazada).',
      });
    }
    if (!['aprobada', 'rechazada'].includes(resultado)) {
      return res.status(400).json({
        success: false,
        message: 'El resultado debe ser "aprobada" o "rechazada".',
      });
    }

    const evidencia = await Evidencia.findById(id)
      .populate('actividad', 'plan_tutoria activa')
      .populate({ path: 'actividad', populate: { path: 'plan_tutoria', select: 'estado' } });

    if (!evidencia) {
      return res.status(404).json({ success: false, message: 'Evidencia no encontrada.' });
    }

    // A3. Evidencia no válida para evaluación
    if (
      !evidencia.actividad?.plan_tutoria ||
      evidencia.actividad.plan_tutoria.estado !== 'activo'
    ) {
      return res.status(409).json({
        success: false,
        message: 'La evidencia no está asociada a un PAT activo.',
      });
    }

    if (!evidencia.actividad?.activa) {
      return res.status(409).json({
        success: false,
        message: 'La actividad asociada no está vigente.',
      });
    }

    // A1. Archivo inaccesible (verificar existencia)
    const fs = require('fs');
    if (evidencia.archivo?.url && !fs.existsSync(evidencia.archivo.url)) {
      return res.status(410).json({
        success: false,
        message: 'El archivo no está disponible. Solicite al tutorado un nuevo envío.',
      });
    }

    // Actualizar evaluación
    evidencia.estado                          = resultado === 'aprobada' ? 'evaluada' : 'rechazada';
    evidencia.evaluacion.tutor                = req.usuario._id;
    evidencia.evaluacion.resultado            = resultado;
    evidencia.evaluacion.calificacion         = calificacion ?? null;
    evidencia.evaluacion.observaciones        = observaciones || '';
    evidencia.evaluacion.fecha_evaluacion     = new Date();

    await evidencia.save();

    // A2. Reenvío: si se rechazó, cambiar estado para permitir reenvío
    if (resultado === 'rechazada') {
      evidencia.estado = 'reenvio';
      await evidencia.save();
    }

    res.status(200).json({
      success : true,
      message : `Evidencia ${resultado} exitosamente.`,
      data    : { evidencia },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU08 – Evaluar tutorados (evaluación final del ciclo)
//  Actor: Tutor
//  POST /api/evidencias/tutorados/:tutoradoId/evaluacion-final
// ═══════════════════════════════════════════════════════════════
const evaluarTutoradoFinal = async (req, res, next) => {
  try {
    const { tutoradoId } = req.params;
    const { calificacion_final, observaciones, plan_id } = req.body;

    // A1. Datos incompletos
    if (calificacion_final === undefined || calificacion_final === null || !plan_id) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: calificacion_final, plan_id.',
      });
    }

    if (typeof calificacion_final !== 'number' || calificacion_final < 0 || calificacion_final > 100) {
      return res.status(400).json({
        success: false,
        message: 'La calificación final debe ser un número entre 0 y 100.',
      });
    }

    // Verificar que el tutorado pertenece al grupo del tutor
    const tutorado = await Tutorado.findById(tutoradoId);
    if (!tutorado) {
      return res.status(404).json({ success: false, message: 'Tutorado no encontrado.' });
    }

    if (tutorado.tutor.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo el tutor asignado puede evaluar a este tutorado.',
      });
    }

    // A2. Evidencias pendientes: todas deben estar evaluadas
    const evidenciasPendientes = await Evidencia.countDocuments({
      tutorado : tutoradoId,
      estado   : { $in: ['pendiente', 'reenvio'] },
    });

    if (evidenciasPendientes > 0) {
      return res.status(409).json({
        success: false,
        message: `Existen ${evidenciasPendientes} evidencias sin evaluar. Complete la revisión antes de cerrar la evaluación.`,
      });
    }

    // Buscar o crear el formato de acreditación para actualizar la calificación
    // (el formato puede no existir aún si el coordinador no lo ha generado)
    let formato = await FormatoAcreditacion.findOne({
      tutorado    : tutoradoId,
      plan_tutoria: plan_id,
    });

    if (formato) {
      // Actualizar calificación en el formato existente
      formato.calificacion_final = calificacion_final;
      formato.observaciones      = observaciones || formato.observaciones;
      await formato.save();
    }

    // A3. Error de persistencia → manejado por el catch global

    // Construir resumen del expediente del tutorado
    const totalEvidencias  = await Evidencia.countDocuments({ tutorado: tutoradoId });
    const evidenciasEval   = await Evidencia.countDocuments({ tutorado: tutoradoId, estado: 'evaluada' });

    res.status(200).json({
      success : true,
      message : 'Evaluación final registrada exitosamente.',
      data    : {
        tutorado: {
          _id             : tutorado._id,
          nombre_completo : tutorado.nombre_completo,
          num_control     : tutorado.num_control_tutorado,
        },
        evaluacion: {
          calificacion_final,
          observaciones : observaciones || '',
          evidencias    : { total: totalEvidencias, evaluadas: evidenciasEval },
        },
        formato_acreditacion: formato || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Historial de evidencias de un tutorado ───────────────────────
//  GET /api/evidencias/tutorados/:tutoradoId
const historialEvidenciasTutorado = async (req, res, next) => {
  try {
    const { tutoradoId } = req.params;

    const evidencias = await Evidencia.find({ tutorado: tutoradoId })
      .populate('actividad', 'nombre no_actividad instrucciones')
      .populate('sesion',    'no_sesion fecha')
      .populate('evaluacion.tutor', 'nombre_completo')
      .sort({ createdAt: 1 })
      .lean();

    const resumen = {
      total     : evidencias.length,
      evaluadas : evidencias.filter((e) => e.estado === 'evaluada').length,
      rechazadas: evidencias.filter((e) => e.estado === 'rechazada').length,
      pendientes: evidencias.filter((e) => ['pendiente', 'reenvio'].includes(e.estado)).length,
    };

    res.status(200).json({
      success : true,
      data    : { resumen, evidencias },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  subirEvidencia,
  listarEvidencias,
  obtenerEvidencia,
  evaluarEvidencia,
  evaluarTutoradoFinal,
  historialEvidenciasTutorado,
};
