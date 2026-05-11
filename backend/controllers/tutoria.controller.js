/**
 * controllers/tutoria.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU02 – Asignar actividades del Programa de Tutorías → registrarActividad
 * CU05 – Capturar Asistencias                         → capturarAsistencias
 * CU09 – Modificar actividades de sesión              → modificarActividadSesion
 * CU10 – Generar formato de acreditación              → generarFormatoAcreditacion
 * ─────────────────────────────────────────────────────────────────
 */

const {
  PlanTutoria,
  Actividad,
  Grupo,
  Sesion,
  Asistencia,
  Tutorado,
  FormatoAcreditacion,
  Evidencia,
} = require('../models');

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

    const plan = await PlanTutoria.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan de tutoría no encontrado.' });
    }

    // A2. Validar que el plan esté activo (periodo académico vigente)
    if (plan.estado !== 'activo') {
      return res.status(409).json({
        success: false,
        message: `El plan de tutoría no está activo. Estado actual: '${plan.estado}'.`,
      });
    }

    // A2. Validar que la fecha ingresada corresponda al periodo académico vigente
    const fechaRealizacionDate = new Date(fecha_realizacion);
    if (fechaRealizacionDate < plan.fecha_ini || fechaRealizacionDate > plan.fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de realización ingresada está fuera del periodo académico del plan.',
      });
    }

    // Crear la actividad
    const actividad = await Actividad.create({
      no_actividad,
      nombre,
      instrucciones,
      fecha_realizacion,
      plan_tutoria: planId,
    });

    // Agregar referencia al plan (composición)
    plan.actividades.push(actividad._id);
    await plan.save();

    res.status(201).json({
      success : true,
      message : 'Actividad registrada exitosamente.',
      data    : { actividad },
    });
  } catch (err) {
    next(err);
  }
};

// ── Crear un Plan de Tutoría ──────────────────────────────────────
//  POST /api/tutorias/planes
const crearPlanTutoria = async (req, res, next) => {
  try {
    const { nombre, semestre, fecha_ini, fecha_fin, departamento } = req.body;

    if (!nombre || !semestre || !fecha_ini || !fecha_fin || !departamento) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: nombre, semestre, fecha_ini, fecha_fin, departamento.',
      });
    }

    const plan = await PlanTutoria.create({
      nombre,
      semestre,
      fecha_ini,
      fecha_fin,
      departamento,
      coordinador_pt: req.usuario._id,
      estado: 'activo',
    });

    res.status(201).json({ success: true, message: 'Plan de tutoría creado.', data: { plan } });
  } catch (err) {
    next(err);
  }
};

// ── Listar planes de tutoría ──────────────────────────────────────
//  GET /api/tutorias/planes
const listarPlanes = async (req, res, next) => {
  try {
    const { departamento, estado } = req.query;
    const filtro = {};
    if (departamento) filtro.departamento = departamento;
    if (estado)       filtro.estado       = estado;

    const planes = await PlanTutoria.find(filtro)
      .populate('departamento', 'nom_dep')
      .populate('coordinador_pt', 'nombre_completo')
      .lean();

    res.status(200).json({ success: true, data: { total: planes.length, planes } });
  } catch (err) {
    next(err);
  }
};

// ── Crear grupo (necesario para CU03) ────────────────────────────
//  POST /api/tutorias/grupos
const crearGrupo = async (req, res, next) => {
  try {
    const { clave_grupo, horario, plan_tutoria } = req.body;

    if (!clave_grupo || !horario || !plan_tutoria) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: clave_grupo, horario, plan_tutoria.',
      });
    }

    // El tutor se asignará en CU03; aquí el grupo nace sin tutor
    const grupo = await Grupo.create({
      clave_grupo,
      horario,
      plan_tutoria,
      cantidad: 0,
    });

    res.status(201).json({ success: true, message: 'Grupo creado.', data: { grupo } });
  } catch (err) {
    next(err);
  }
};

// ── Listar Grupos ─────────────────────────────────────────────────
//  GET /api/tutorias/grupos
const listarGrupos = async (req, res, next) => {
  try {
    const { plan_tutoria } = req.query;
    const filtro = {};
    if (plan_tutoria) filtro.plan_tutoria = plan_tutoria;

    const grupos = await Grupo.find(filtro)
      .populate('plan_tutoria', 'nombre semestre')
      .populate('tutor', 'nombre_completo correo')
      .lean();

    res.status(200).json({ success: true, data: { total: grupos.length, grupos } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU05 – Capturar Asistencias
//  Actor: Tutor
//  POST /api/tutorias/sesiones/:sesionId/asistencias
// ═══════════════════════════════════════════════════════════════
const capturarAsistencias = async (req, res, next) => {
  try {
    const { sesionId } = req.params;
    // asistencias: [{ tutorado_id, asistencia: true/false, observacion }]
    const { asistencias } = req.body;

    if (!asistencias || !Array.isArray(asistencias) || asistencias.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un arreglo "asistencias" con al menos un registro.',
      });
    }

    const sesion = await Sesion.findById(sesionId).populate('plan_tutoria', 'estado');
    if (!sesion) {
      return res.status(404).json({ success: false, message: 'Sesión no encontrada.' });
    }

    // A1. Sesión cancelada
    if (sesion.estado === 'cancelada') {
      return res.status(409).json({
        success: false,
        message: 'No se puede registrar asistencia en una sesión cancelada.',
      });
    }

    // A2. Sesión no pertenece a un PAT activo
    if (!sesion.plan_tutoria || sesion.plan_tutoria.estado !== 'activo') {
      return res.status(409).json({
        success: false,
        message: 'La sesión no pertenece a un PAT activo.',
      });
    }

    // Verificar que quien captura es el tutor dueño del grupo
    const grupo = await Grupo.findById(sesion.grupo);
    if (!grupo || grupo.tutor.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo el tutor asignado al grupo puede capturar asistencias.',
      });
    }

    // Insertar o actualizar registros de asistencia (upsert)
    const operaciones = asistencias.map(({ tutorado_id, asistencia, observacion }) => ({
      updateOne: {
        filter: { tutorado: tutorado_id, sesion: sesionId },
        update: {
          $set: {
            asistencia,
            observacion: observacion || '',
            tutor: req.usuario._id,
          },
        },
        upsert: true,
      },
    }));

    await Asistencia.bulkWrite(operaciones);

    // Calcular porcentaje de asistencia por tutorado (todas las sesiones del grupo)
    const totalSesiones = await Sesion.countDocuments({
      grupo: sesion.grupo,
      estado: { $ne: 'cancelada' },
    });

    const resumen = await Promise.all(
      asistencias.map(async ({ tutorado_id }) => {
        const presencias = await Asistencia.countDocuments({
          tutorado: tutorado_id,
          sesion: { $in: await Sesion.find({ grupo: sesion.grupo }).distinct('_id') },
          asistencia: true,
        });
        const porcentaje = totalSesiones > 0
          ? Math.round((presencias / totalSesiones) * 100)
          : 0;
        return { tutorado_id, porcentaje_asistencia: porcentaje };
      })
    );

    // Marcar sesión como realizada si estaba programada
    if (sesion.estado === 'programada') {
      sesion.estado = 'realizada';
      await sesion.save();
    }

    res.status(200).json({
      success : true,
      message : 'Asistencias capturadas exitosamente.',
      data    : { sesion_id: sesionId, resumen_asistencia: resumen },
    });
  } catch (err) {
    next(err);
  }
};

// ── Listar sesiones de un grupo ───────────────────────────────────
//  GET /api/tutorias/grupos/:grupoId/sesiones
const listarSesionesPorGrupo = async (req, res, next) => {
  try {
    const sesiones = await Sesion.find({ grupo: req.params.grupoId })
      .populate('actividades', 'nombre no_actividad')
      .sort({ no_sesion: 1 })
      .lean();

    res.status(200).json({ success: true, data: { total: sesiones.length, sesiones } });
  } catch (err) {
    next(err);
  }
};

// ── Crear sesión ──────────────────────────────────────────────────
//  POST /api/tutorias/grupos/:grupoId/sesiones
const crearSesion = async (req, res, next) => {
  try {
    const { no_sesion, fecha, hora, actividades, observaciones } = req.body;
    const { grupoId } = req.params;

    if (!no_sesion || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: no_sesion, fecha, hora.',
      });
    }

    const grupo = await Grupo.findById(grupoId);
    if (!grupo) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    const sesion = await Sesion.create({
      no_sesion,
      fecha,
      hora,
      grupo : grupoId,
      plan_tutoria: grupo.plan_tutoria,
      actividades : actividades || [],
      observaciones,
    });

    res.status(201).json({ success: true, message: 'Sesión creada.', data: { sesion } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU09 – Modificar actividades propuestas para las sesiones
//  Actor: Tutor
//  PUT /api/tutorias/sesiones/:sesionId/actividades/:actividadId
// ═══════════════════════════════════════════════════════════════
const modificarActividadSesion = async (req, res, next) => {
  try {
    const { sesionId, actividadId } = req.params;
    const { nombre, instrucciones } = req.body;

    const sesion = await Sesion.findById(sesionId).populate('plan_tutoria', 'estado');
    if (!sesion) {
      return res.status(404).json({ success: false, message: 'Sesión no encontrada.' });
    }

    // A2. PAT no activo
    if (!sesion.plan_tutoria || sesion.plan_tutoria.estado !== 'activo') {
      return res.status(409).json({
        success: false,
        message: 'La sesión no pertenece a un PAT activo.',
      });
    }

    // A3. Sesión no editable (cerrada/cancelada/realizada)
    if (['cancelada', 'realizada'].includes(sesion.estado)) {
      return res.status(409).json({
        success: false,
        message: `No se puede modificar una sesión en estado '${sesion.estado}'.`,
      });
    }

    // A1. Verificar que la actividad esté asociada a la sesión
    if (!sesion.actividades.map(String).includes(actividadId)) {
      return res.status(404).json({
        success: false,
        message: 'La actividad no está asociada a esta sesión.',
      });
    }

    // A2. Datos inválidos
    if (!nombre && !instrucciones) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un campo a modificar: nombre o instrucciones.',
      });
    }

    const camposActualizar = {};
    if (nombre)        camposActualizar.nombre        = nombre;
    if (instrucciones) camposActualizar.instrucciones = instrucciones;

    const actividad = await Actividad.findByIdAndUpdate(
      actividadId,
      { $set: camposActualizar },
      { new: true, runValidators: true }
    );

    if (!actividad) {
      return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });
    }

    res.status(200).json({
      success : true,
      message : 'Actividad actualizada exitosamente.',
      data    : { actividad },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU10 – Generar formato de acreditación
//  Actor: Coordinador Departamental
//  POST /api/tutorias/acreditacion/:tutoradoId/plan/:planId
// ═══════════════════════════════════════════════════════════════
const generarFormatoAcreditacion = async (req, res, next) => {
  try {
    const { tutoradoId, planId } = req.params;

    const tutorado = await Tutorado.findById(tutoradoId);
    if (!tutorado) {
      return res.status(404).json({ success: false, message: 'Tutorado no encontrado.' });
    }

    const plan = await PlanTutoria.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan de tutoría no encontrado.' });
    }

    // ── Calcular asistencia ───────────────────────────────────────
    // Obtener todas las sesiones del tutor del tutorado en ese plan
    const tutor = tutorado.tutor;
    const grupo = await Grupo.findOne({ tutor, plan_tutoria: planId });

    if (!grupo) {
      return res.status(409).json({
        success: false,
        message: 'No se encontró grupo asociado al tutorado en este plan.',
      });
    }

    const sesionesDelGrupo = await Sesion.find({
      grupo: grupo._id,
      estado: { $ne: 'cancelada' },
    }).select('_id');

    const idsSesiones = sesionesDelGrupo.map((s) => s._id);
    const totalSesiones = idsSesiones.length;

    const asistenciasPresente = await Asistencia.find({
      tutorado: tutoradoId,
      sesion  : { $in: idsSesiones },
      asistencia: true,
    });

    const porcentaje = totalSesiones > 0
      ? Math.round((asistenciasPresente.length / totalSesiones) * 100)
      : 0;

    // Umbral de asistencia mínima configurable (default 80%)
    const UMBRAL_ASISTENCIA = parseInt(process.env.UMBRAL_ASISTENCIA_PCT || '80', 10);

    // ── Validar evidencias: deben estar todas evaluadas ───────────
    const evidenciasPendientes = await Evidencia.countDocuments({
      tutorado: tutoradoId,
      estado  : { $in: ['pendiente', 'reenvio'] },
    });

    // A1. Alumno no acreditado
    if (porcentaje < UMBRAL_ASISTENCIA || evidenciasPendientes > 0) {
      return res.status(409).json({
        success: false,
        message: 'El alumno no cumple los requisitos de acreditación.',
        data   : {
          porcentaje_asistencia : porcentaje,
          umbral_requerido      : UMBRAL_ASISTENCIA,
          evidencias_pendientes : evidenciasPendientes,
        },
      });
    }

    // Obtener calificación final del expediente del tutorado
    const formatoExistente = await FormatoAcreditacion.findOne({
      tutorado    : tutoradoId,
      plan_tutoria: planId,
    });
    if (formatoExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una constancia de acreditación para este tutorado en este periodo.',
        data   : { formato: formatoExistente },
      });
    }

    // Crear el formato de acreditación
    const formato = await FormatoAcreditacion.create({
      fecha                   : new Date(),
      acreditado              : true,
      tutorado                : tutoradoId,
      coordinador_dep_ac_pt   : req.usuario._id,
      plan_tutoria            : planId,
      asistencias             : asistenciasPresente.map((a) => a._id),
      porcentaje_asistencia   : porcentaje,
    });

    res.status(201).json({
      success : true,
      message : 'Formato de acreditación generado exitosamente.',
      data    : {
        formato,
        tutorado: {
          _id             : tutorado._id,
          nombre_completo : tutorado.nombre_completo,
          num_control     : tutorado.num_control_tutorado,
        },
        resumen: { porcentaje_asistencia: porcentaje, evidencias_pendientes: evidenciasPendientes },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Obtener un formato de acreditación ───────────────────────────
//  GET /api/tutorias/acreditacion/:formatoId
const obtenerFormatoAcreditacion = async (req, res, next) => {
  try {
    const formato = await FormatoAcreditacion.findById(req.params.formatoId)
      .populate('tutorado', 'nombre_completo num_control_tutorado')
      .populate('coordinador_dep_ac_pt', 'nombre_completo')
      .populate('plan_tutoria', 'nombre semestre')
      .lean();

    if (!formato) {
      return res.status(404).json({ success: false, message: 'Formato no encontrado.' });
    }

    res.status(200).json({ success: true, data: { formato } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registrarActividad,
  crearPlanTutoria,
  listarPlanes,
  crearGrupo,
  listarGrupos,
  capturarAsistencias,
  listarSesionesPorGrupo,
  crearSesion,
  modificarActividadSesion,
  generarFormatoAcreditacion,
  obtenerFormatoAcreditacion,
};
