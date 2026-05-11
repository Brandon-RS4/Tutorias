/**
 * controllers/usuario.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU01 – Asignar usuarios al sistema          → registrarUsuario
 * CU03 – Asignar a los Tutores                → asignarTutor
 * CU04 – Asignar Tutorados a los Tutores      → asignarTutorado
 * CU11 – Consultar Tutores por carrera        → consultarTutoresPorCarrera
 * CU12 – Consultar Tutorados por Tutor        → consultarTutoradosPorTutor
 * ─────────────────────────────────────────────────────────────────
 */

const {
  Usuario,
  Tutor,
  Tutorado,
  Grupo,
  DepAcademico,
  Tecnm,
} = require('../models');

// ═══════════════════════════════════════════════════════════════
//  CU01 – Asignar usuarios al sistema
//  Actor: Jefe del Departamento de Desarrollo Académico
//  POST /api/usuarios
// ═══════════════════════════════════════════════════════════════
const registrarUsuario = async (req, res, next) => {
  try {
    const {
      nombre_completo,
      correo,
      contrasena,
      rol,
      departamento,
      activo = true,
      // Campos extra según el rol
      num_control_tutor,
      carrera,
      max_tutorados,
      num_control_tutorado,
      direccion,
    } = req.body;

    // ── Validaciones de negocio ───────────────────────────────────

    // A1. Datos incompletos
    if (!nombre_completo || !correo || !contrasena || !rol || !departamento) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: nombre_completo, correo, contrasena, rol, departamento.',
      });
    }

    // A3. Rol no seleccionado / rol inválido
    const ROLES_VALIDOS = [
      'director', 'subdirector', 'jefe_depto_academico',
      'coordinador_pt', 'coordinador_dep_ac_pt', 'tutor', 'tutorado',
    ];
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(', ')}.`,
      });
    }

    // Verificar que el departamento exista
    const dep = await DepAcademico.findById(departamento);
    if (!dep) {
      return res.status(404).json({ success: false, message: 'Departamento no encontrado.' });
    }

    // A2. Correo no institucional: validar dominio con el del TECNM del depto
    const tecnm = await Tecnm.findById(dep.tecnm);
    if (tecnm && !correo.endsWith(`@${tecnm.dominio_correo}`)) {
      return res.status(400).json({
        success: false,
        message: `El correo debe pertenecer al dominio institucional @${tecnm.dominio_correo}.`,
      });
    }

    // ── Construir payload según rol ───────────────────────────────
    const payload = { nombre_completo, correo, contrasena, departamento, activo };

    let nuevoUsuario;

    if (rol === 'tutor') {
      if (!num_control_tutor || !carrera) {
        return res.status(400).json({
          success: false,
          message: 'Para el rol tutor se requieren: num_control_tutor, carrera.',
        });
      }
      nuevoUsuario = await Tutor.create({
        ...payload,
        num_control_tutor,
        carrera,
        max_tutorados: max_tutorados || 30,
      });
    } else if (rol === 'tutorado') {
      if (!num_control_tutorado) {
        return res.status(400).json({
          success: false,
          message: 'Para el rol tutorado se requiere: num_control_tutorado.',
        });
      }
      nuevoUsuario = await Tutorado.create({
        ...payload,
        num_control_tutorado,
        direccion,
      });
    } else {
      // Roles administrativos: Director, Subdirector, JefeDepto, CoordinadorPT, CoordinadorDepAcPT
      nuevoUsuario = await Usuario.create({ ...payload, rol });
    }

    nuevoUsuario.contrasena = undefined;

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente.',
      data: { usuario: nuevoUsuario },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU03 – Asignar a los Tutores
//  Actor: Coordinadora Institucional de Tutorías
//  POST /api/usuarios/tutores/asignar
// ═══════════════════════════════════════════════════════════════
const asignarTutor = async (req, res, next) => {
  try {
    const { tutor_id, grupo_id } = req.body;

    // A1. Datos incompletos
    if (!tutor_id || !grupo_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren tutor_id y grupo_id.',
      });
    }

    // Verificar que el usuario sea tutor
    const tutor = await Tutor.findById(tutor_id);
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor no encontrado.',
      });
    }

    // A1. Docente no apto (inactivo)
    if (!tutor.activo) {
      return res.status(409).json({
        success: false,
        message: 'El tutor seleccionado no está activo.',
      });
    }

    // Verificar que el grupo exista y esté disponible
    const grupo = await Grupo.findById(grupo_id);
    if (!grupo) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    // A2. Conflicto: grupo ya tiene un tutor asignado diferente
    if (grupo.tutor && grupo.tutor.toString() !== tutor_id) {
      return res.status(409).json({
        success: false,
        message: 'El grupo ya tiene un tutor asignado. Modifique la asignación existente.',
      });
    }

    // A2. Conflicto de horario: verificar que el tutor no tenga otro grupo
    // en el mismo horario (comparación de cadena horaria)
    const grupoExistente = await Grupo.findOne({
      tutor: tutor_id,
      horario: grupo.horario,
      _id: { $ne: grupo_id },
    });
    if (grupoExistente) {
      return res.status(409).json({
        success: false,
        message: `Conflicto de horario: el tutor ya tiene el grupo '${grupoExistente.clave_grupo}' en ese horario.`,
      });
    }

    // Asignar tutor al grupo y grupo al tutor (relación bidireccional)
    grupo.tutor = tutor_id;
    await grupo.save();

    tutor.grupo = grupo_id;
    await tutor.save();

    res.status(200).json({
      success: true,
      message: 'Tutor asignado exitosamente al grupo.',
      data: {
        tutor: { _id: tutor._id, nombre_completo: tutor.nombre_completo },
        grupo: { _id: grupo._id, clave_grupo: grupo.clave_grupo, horario: grupo.horario },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU04 – Asignar Tutorados a los Tutores
//  Actor: Coordinador de Tutorías del Departamento Académico
//  POST /api/usuarios/tutorados/asignar
// ═══════════════════════════════════════════════════════════════
const asignarTutorado = async (req, res, next) => {
  try {
    const { tutorado_id, tutor_id } = req.body;

    // A2. Datos incompletos
    if (!tutorado_id || !tutor_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren tutorado_id y tutor_id.',
      });
    }

    const tutorado = await Tutorado.findById(tutorado_id);
    if (!tutorado) {
      return res.status(404).json({ success: false, message: 'Tutorado no encontrado.' });
    }

    const tutor = await Tutor.findById(tutor_id);
    if (!tutor) {
      return res.status(404).json({ success: false, message: 'Tutor no encontrado.' });
    }

    // A3. Tutor no disponible: verificar cupo máximo
    const tutoradosActuales = await Tutorado.countDocuments({ tutor: tutor_id });
    if (tutoradosActuales >= tutor.max_tutorados) {
      return res.status(409).json({
        success: false,
        message: `El tutor ha alcanzado su límite de ${tutor.max_tutorados} tutorados.`,
      });
    }

    // A3. Tutor inactivo
    if (!tutor.activo) {
      return res.status(409).json({
        success: false,
        message: 'El tutor seleccionado no está activo.',
      });
    }

    // A1. Verificar que el tutorado no esté ya asignado a otro tutor
    if (tutorado.tutor && tutorado.tutor.toString() !== tutor_id) {
      return res.status(409).json({
        success: false,
        message: 'El tutorado ya está asignado a otro tutor.',
      });
    }

    tutorado.tutor = tutor_id;
    await tutorado.save();

    res.status(200).json({
      success: true,
      message: 'Tutorado asignado exitosamente al tutor.',
      data: {
        tutorado: { _id: tutorado._id, nombre_completo: tutorado.nombre_completo, num_control_tutorado: tutorado.num_control_tutorado },
        tutor: { _id: tutor._id, nombre_completo: tutor.nombre_completo },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU11 – Consultar Tutores asignados por carrera
//  Actor: Director, Subdirector, Coordinadores, Jefe Depto.
//  GET /api/usuarios/tutores?carrera=:carrera
// ═══════════════════════════════════════════════════════════════
const consultarTutoresPorCarrera = async (req, res, next) => {
  try {
    const { carrera } = req.query;

    // A1. Sin filtro de carrera
    const filtro = { rol: 'tutor', activo: true };
    if (carrera) filtro.carrera = { $regex: carrera, $options: 'i' };

    const tutores = await Tutor.find(filtro)
      .populate('grupo', 'clave_grupo cantidad horario')
      .populate('departamento', 'nom_dep')
      .select('-contrasena')
      .lean();

    if (!tutores.length) {
      return res.status(200).json({
        success: true,
        message: 'No se encontraron tutores asignados para los criterios indicados.',
        data: { tutores: [] },
      });
    }

    // Para cada tutor, contar tutorados asignados
    const tutoresConConteo = await Promise.all(
      tutores.map(async (t) => {
        const totalTutorados = await Tutorado.countDocuments({ tutor: t._id });
        return { ...t, totalTutorados };
      })
    );

    res.status(200).json({
      success: true,
      data: { total: tutoresConConteo.length, tutores: tutoresConConteo },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU12 – Consultar Tutorados por Tutor
//  Actor: Director, Subdirector, Coordinadores, Jefe Depto.
//  GET /api/usuarios/tutores/:tutorId/tutorados
// ═══════════════════════════════════════════════════════════════
const consultarTutoradosPorTutor = async (req, res, next) => {
  try {
    const { tutorId } = req.params;

    const tutor = await Tutor.findById(tutorId)
      .populate('grupo', 'clave_grupo horario')
      .select('-contrasena')
      .lean();

    if (!tutor) {
      return res.status(404).json({ success: false, message: 'Tutor no encontrado.' });
    }

    const tutorados = await Tutorado.find({ tutor: tutorId })
      .select('-contrasena')
      .lean();

    // A1. Sin asignaciones
    if (!tutorados.length) {
      return res.status(200).json({
        success: true,
        message: 'El tutor no tiene tutorados asignados actualmente.',
        data: { tutor, tutorados: [] },
      });
    }

    res.status(200).json({
      success: true,
      data: { tutor, total: tutorados.length, tutorados },
    });
  } catch (err) {
    next(err);
  }
};

// ── Listar todos los usuarios (util para panel admin) ────────────
//  GET /api/usuarios
const listarUsuarios = async (req, res, next) => {
  try {
    const { rol, activo } = req.query;
    const filtro = {};
    if (rol) filtro.rol = rol;
    if (activo !== undefined) filtro.activo = activo === 'true';

    const usuarios = await Usuario.find(filtro)
      .populate('departamento', 'nom_dep')
      .select('-contrasena')
      .lean();

    res.status(200).json({ success: true, data: { total: usuarios.length, usuarios } });
  } catch (err) {
    next(err);
  }
};

// ── Obtener un usuario por ID ─────────────────────────────────────
//  GET /api/usuarios/:id
const obtenerUsuario = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.params.id)
      .populate('departamento', 'nom_dep')
      .select('-contrasena')
      .lean();

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    res.status(200).json({ success: true, data: { usuario } });
  } catch (err) {
    next(err);
  }
};

// ── Activar / desactivar usuario ─────────────────────────────────
//  PATCH /api/usuarios/:id/estado
const cambiarEstadoUsuario = async (req, res, next) => {
  try {
    const { activo } = req.body;
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ success: false, message: 'El campo activo debe ser booleano.' });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { activo },
      { new: true, runValidators: true }
    ).select('-contrasena');

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    res.status(200).json({
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente.`,
      data: { usuario },
    });
  } catch (err) {
    next(err);
  }
};

const asignarTutoradoATutor = async (req, res) => {
  try {
    const { tutorId, tutoradoId } = req.body;

    // 1. Agregamos al alumno al array de 'tutorados' del Tutor
    await Tutor.findByIdAndUpdate(tutorId, {
      $addToSet: { tutorados: tutoradoId }
    });

    // 2. Le ponemos al alumno quién es su tutor
    await Tutorado.findByIdAndUpdate(tutoradoId, {
      tutor_asignado: tutorId
    });

    res.status(200).json({ message: "Relación creada con éxito en la BD" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registrarUsuario,
  asignarTutor,
  asignarTutorado,
  consultarTutoresPorCarrera,
  consultarTutoradosPorTutor,
  listarUsuarios,
  obtenerUsuario,
  cambiarEstadoUsuario,
  asignarTutoradoATutor,
};
