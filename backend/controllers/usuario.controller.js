/**
 * controllers/usuario.controller.js
 * ─────────────────────────────────────────────────────────────────
 * CU01 – Asignar usuarios al sistema          → registrarUsuario
 * CU11 – Consultar Tutores por carrera        → consultarTutoresPorCarrera
 * CU12 – Consultar Tutorados por Tutor        → consultarTutoradosPorTutor
 * ─────────────────────────────────────────────────────────────────
 */

const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');

// ═══════════════════════════════════════════════════════════════
//  CU01 – Asignar usuarios al sistema
//  Actor: Jefe del Departamento de Desarrollo Académico
//  POST /api/usuarios
// ═══════════════════════════════════════════════════════════════
const registrarUsuario = async (req, res, next) => {
  try {
    let {
      nombre_completo,
      correo,
      rol,
      departamento_id,
      activo = true,
      // Campos extra según el rol
      num_control_tutor,
      carrera,
      max_tutorados,
      num_control_tutorado,
      direccion,
    } = req.body;

    // ── Normalización de rol ──
    if (rol) {
      const lowercase = rol.toLowerCase();
      if (lowercase === 'administrador') rol = 'Administrador';
      else if (lowercase === 'director') rol = 'Director';
      else if (lowercase === 'subdirector') rol = 'Subdirector';
      else if (lowercase === 'tutor') rol = 'Tutor';
      else if (lowercase === 'tutorado') rol = 'Tutorado';
      else if (lowercase === 'jefe_depto_academico' || lowercase === 'jefe_departamento_academico') rol = 'Jefe_Departamento_Academico';
      else if (lowercase === 'coordinador_pt' || lowercase === 'coordinador_institucional_pt') rol = 'Coordinador_Institucional_PT';
      else if (lowercase === 'coordinador_dep_ac_pt' || lowercase === 'coordinador_departamento_academico') rol = 'Coordinador_Departamento_Academico';
      else if (lowercase === 'jefe_departamento_desarrollo_academico') rol = 'Jefe_Departamento_Desarrollo_Academico';
    }

    // ── Validaciones de jerarquía de creación de roles ──
    const creadorRol = req.usuario?.rol;

    if (creadorRol === 'Administrador' || creadorRol === 'Director') {
      // El administrador tiene permiso absoluto para crear cualquier rol.
    } else if (creadorRol === 'Jefe_Departamento_Desarrollo_Academico') {
      if (rol === 'Administrador' || rol === 'Jefe_Departamento_Desarrollo_Academico') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear un Administrador o un Jefe de Departamento de Desarrollo Académico.',
        });
      }
    } else if (creadorRol === 'Coordinador_Institucional_PT') {
      if (rol !== 'Tutor') {
        return res.status(403).json({ success: false, message: 'El Coordinador Institucional solo puede capturar Tutores.' });
      }
    } else if (creadorRol === 'Coordinador_Departamento_Academico') {
      if (rol !== 'Tutorado') {
        return res.status(403).json({ success: false, message: 'El Coordinador del Departamento Académico solo puede capturar Tutorados.' });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear usuarios.',
      });
    }

    // ── Validaciones de negocio ───────────────────────────────────
    const deptoId = departamento_id || req.body.departamento;

    // A1. Datos incompletos
    if (!nombre_completo || !correo || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: nombre_completo, correo, rol.',
      });
    }

    if (!correo.endsWith('@culiacan.tecnm.mx')) {
      return res.status(400).json({
        success: false,
        message: 'El correo debe pertenecer al dominio institucional (@culiacan.tecnm.mx).',
      });
    }

    // A3. Rol no seleccionado / rol inválido
    const ROLES_VALIDOS = [
      'Administrador', 'Director', 'Subdirector', 'Tutor', 'Tutorado',
      'Jefe_Departamento_Academico', 'Coordinador_Institucional_PT',
      'Coordinador_Departamento_Academico', 'Jefe_Departamento_Desarrollo_Academico'
    ];
    
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: `Rol inválido. Debe ser uno de: ${ROLES_VALIDOS.join(', ')}.`,
      });
    }

    // ── Validaciones específicas de rol antes de crear el usuario ──
    if (rol === 'Tutor') {
      if (!num_control_tutor || !carrera) {
        return res.status(400).json({ success: false, message: 'Para el rol tutor se requieren: num_control_tutor, carrera.' });
      }
      if (!/^\d{8}$/.test(num_control_tutor)) {
        return res.status(400).json({ success: false, message: 'El número de control del tutor debe tener exactamente 8 números.' });
      }
      
      const { data: tutorExistente } = await supabase
        .from('tutores')
        .select('usuario_id')
        .eq('num_control_tutor', num_control_tutor)
        .single();
        
      if (tutorExistente) {
        return res.status(400).json({ success: false, message: 'El número de control del tutor ya está registrado en el sistema.' });
      }
    } else if (rol === 'Tutorado') {
      if (!num_control_tutorado) {
        return res.status(400).json({ success: false, message: 'Para el rol tutorado se requiere: num_control_tutorado.' });
      }
      if (!/^\d{8}$/.test(num_control_tutorado)) {
        return res.status(400).json({ success: false, message: 'El número de control del tutorado debe tener exactamente 8 números.' });
      }

      const { data: tutoradoExistente } = await supabase
        .from('tutorados')
        .select('usuario_id')
        .eq('num_control_tutorado', num_control_tutorado)
        .single();
        
      if (tutoradoExistente) {
        return res.status(400).json({ success: false, message: 'El número de control del tutorado ya está registrado en el sistema.' });
      }
    }

    // Hashear contraseña por defecto
    const hashedPassword = await bcrypt.hash('123456', 12);

    // Insertar en tabla usuarios
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert([{
        nombre_completo,
        correo,
        contrasena: hashedPassword,
        rol,
        departamento_id: deptoId || null,
        activo
      }])
      .select()
      .single();

    if (usuarioError) {
      return res.status(400).json({ success: false, message: usuarioError.message });
    }

    // Insertar en tabla específica según rol
    if (rol === 'Tutor') {
      const { error: tutorError } = await supabase
        .from('tutores')
        .insert([{
          usuario_id: usuarioData.id,
          num_control_tutor,
          carrera,
          max_tutorados: max_tutorados || 30
        }]);
        
      if (tutorError) {
        await supabase.from('usuarios').delete().eq('id', usuarioData.id);
        return res.status(400).json({ success: false, message: tutorError.message });
      }
    } else if (rol === 'Tutorado') {
      const { error: tutoradoError } = await supabase
        .from('tutorados')
        .insert([{
          usuario_id: usuarioData.id,
          num_control_tutorado,
          direccion
        }]);

      if (tutoradoError) {
        await supabase.from('usuarios').delete().eq('id', usuarioData.id);
        return res.status(400).json({ success: false, message: tutoradoError.message });
      }
    }

    delete usuarioData.contrasena;

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente.',
      data: { usuario: usuarioData },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU11 – Consultar Tutores asignados por carrera
//  GET /api/usuarios/tutores?carrera=:carrera
// ═══════════════════════════════════════════════════════════════
const consultarTutoresPorCarrera = async (req, res, next) => {
  try {
    const { carrera } = req.query;

    let query = supabase
      .from('tutores')
      .select(`
        *,
        usuarios!inner(id, nombre_completo, correo, activo, departamento_id),
        grupos(id, clave_grupo, cantidad, horario),
        tutorados(count)
      `);

    if (carrera) {
      query = query.ilike('carrera', `%${carrera}%`);
    }

    query = query.eq('usuarios.activo', true);

    const { data: tutores, error } = await query;

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (!tutores || tutores.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No se encontraron tutores asignados para los criterios indicados.',
        data: { tutores: [] },
      });
    }

    // Mapear resultado para que coincida con lo esperado
    const tutoresMapeados = tutores.map(t => ({
      _id: t.usuarios.id,
      nombre_completo: t.usuarios.nombre_completo,
      correo: t.usuarios.correo,
      activo: t.usuarios.activo,
      num_control_tutor: t.num_control_tutor,
      carrera: t.carrera,
      max_tutorados: t.max_tutorados,
      grupo: t.grupos.length > 0 ? t.grupos[0] : null,
      totalTutorados: t.tutorados[0].count
    }));

    res.status(200).json({
      success: true,
      data: { total: tutoresMapeados.length, tutores: tutoresMapeados },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════
//  CU12 – Consultar Tutorados por Tutor
//  GET /api/usuarios/tutores/:tutorId/tutorados
// ═══════════════════════════════════════════════════════════════
const consultarTutoradosPorTutor = async (req, res, next) => {
  try {
    const { tutorId } = req.params;

    // Obtener información del tutor
    const { data: tutor, error: errorTutor } = await supabase
      .from('tutores')
      .select(`
        *,
        usuarios!inner(nombre_completo, correo, activo),
        grupos(id, clave_grupo, horario)
      `)
      .eq('usuario_id', tutorId)
      .single();

    if (errorTutor || !tutor) {
      return res.status(404).json({ success: false, message: 'Tutor no encontrado.' });
    }

    // Obtener tutorados
    const { data: tutorados, error: errorTutorados } = await supabase
      .from('tutorados')
      .select(`
        *,
        usuarios!inner(nombre_completo, correo, activo)
      `)
      .eq('tutor_id', tutorId);

    if (errorTutorados) {
      return res.status(400).json({ success: false, message: errorTutorados.message });
    }

    // Mapear resultados
    const tutorInfo = {
      _id: tutor.usuario_id,
      nombre_completo: tutor.usuarios.nombre_completo,
      correo: tutor.usuarios.correo,
      num_control_tutor: tutor.num_control_tutor,
      carrera: tutor.carrera,
      grupo: tutor.grupos.length > 0 ? tutor.grupos[0] : null
    };

    // Obtener asistencias para calcular porcentaje
    const tutoradoIds = tutorados.map(t => t.usuario_id);
    let asistenciaMap = {};
    let evaluacionesMap = {};
    let evidenciasMap = {};

    if (tutoradoIds.length > 0) {
      // Asistencias
      const { data: asistencias } = await supabase
        .from('asistencias')
        .select('tutorado_id, asistio')
        .in('tutorado_id', tutoradoIds);

      (asistencias || []).forEach(a => {
        if (!asistenciaMap[a.tutorado_id]) asistenciaMap[a.tutorado_id] = { total: 0, presentes: 0 };
        asistenciaMap[a.tutorado_id].total++;
        if (a.asistio) asistenciaMap[a.tutorado_id].presentes++;
      });

      // Evaluaciones Finales
      const { data: evaluaciones } = await supabase
        .from('evaluaciones_finales')
        .select('tutorado_id, calificacion_final, acreditado')
        .in('tutorado_id', tutoradoIds);
      
      (evaluaciones || []).forEach(e => {
        evaluacionesMap[e.tutorado_id] = e;
      });

      // Evidencias (Entregadas / Total)
      // O solo las entregadas, pero para simplicidad mostramos cuántas tienen registradas
      const { data: evidencias } = await supabase
        .from('evidencias')
        .select('tutorado_id, estado')
        .in('tutorado_id', tutoradoIds);

      (evidencias || []).forEach(ev => {
        if (!evidenciasMap[ev.tutorado_id]) evidenciasMap[ev.tutorado_id] = { entregadas: 0, total: 0 };
        evidenciasMap[ev.tutorado_id].total++;
        if (ev.estado === 'evaluado' || ev.estado === 'entregado') {
          evidenciasMap[ev.tutorado_id].entregadas++;
        }
      });
    }

    const tutoradosInfo = tutorados.map(t => {
      const stats = asistenciaMap[t.usuario_id] || { total: 0, presentes: 0 };
      const pct = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0;
      const evaluacion = evaluacionesMap[t.usuario_id] || null;
      const evStats = evidenciasMap[t.usuario_id] || { entregadas: 0, total: 0 };

      return {
        _id: t.usuario_id,
        nombre_completo: t.usuarios.nombre_completo,
        correo: t.usuarios.correo,
        num_control_tutorado: t.num_control_tutorado,
        direccion: t.direccion,
        porcentaje_asistencia: pct,
        evaluacion: evaluacion ? {
          calificacion: evaluacion.calificacion_final,
          acreditado: evaluacion.acreditado
        } : null,
        evidencias: {
          entregadas: evStats.entregadas,
          total: evStats.total
        }
      };
    });

    if (!tutoradosInfo.length) {
      return res.status(200).json({
        success: true,
        message: 'El tutor no tiene tutorados asignados actualmente.',
        data: { tutor: tutorInfo, tutorados: [] },
      });
    }

    res.status(200).json({
      success: true,
      data: { tutor: tutorInfo, total: tutoradosInfo.length, tutorados: tutoradosInfo },
    });
  } catch (err) {
    next(err);
  }
};

// ── Listar todos los usuarios ─────────────────────────────────────
const listarUsuarios = async (req, res, next) => {
  try {
    const { rol, activo } = req.query;
    
    let query = supabase
      .from('usuarios')
      .select('id, nombre_completo, correo, rol, activo, departamento_id, tutores(num_control_tutor, carrera, max_tutorados), tutorados(num_control_tutorado, direccion)');

    if (rol) {
      const lowercase = rol.toLowerCase();
      let normalizedRol = rol;
      if (lowercase === 'administrador') normalizedRol = 'Administrador';
      else if (lowercase === 'director') normalizedRol = 'Director';
      else if (lowercase === 'subdirector') normalizedRol = 'Subdirector';
      else if (lowercase === 'tutor') normalizedRol = 'Tutor';
      else if (lowercase === 'tutorado') normalizedRol = 'Tutorado';
      else if (lowercase === 'jefe_depto_academico' || lowercase === 'jefe_departamento_academico') normalizedRol = 'Jefe_Departamento_Academico';
      else if (lowercase === 'coordinador_pt' || lowercase === 'coordinador_institucional_pt') normalizedRol = 'Coordinador_Institucional_PT';
      else if (lowercase === 'coordinador_dep_ac_pt' || lowercase === 'coordinador_departamento_academico') normalizedRol = 'Coordinador_Departamento_Academico';
      else if (lowercase === 'jefe_departamento_desarrollo_academico') normalizedRol = 'Jefe_Departamento_Desarrollo_Academico';
      
      query = query.eq('rol', normalizedRol);
    }
    if (activo !== undefined) query = query.eq('activo', activo === 'true');

    const { data: usuarios, error } = await query;

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({ success: true, data: { total: usuarios.length, usuarios } });
  } catch (err) {
    next(err);
  }
};

// ── Obtener un usuario por ID ─────────────────────────────────────
const obtenerUsuario = async (req, res, next) => {
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, correo, rol, activo, departamento_id')
      .eq('id', req.params.id)
      .single();

    if (error || !usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    res.status(200).json({ success: true, data: { usuario } });
  } catch (err) {
    next(err);
  }
};

// ── Activar / desactivar usuario ─────────────────────────────────
const cambiarEstadoUsuario = async (req, res, next) => {
  try {
    const { activo } = req.body;
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ success: false, message: 'El campo activo debe ser booleano.' });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .update({ activo })
      .eq('id', req.params.id)
      .select('id, nombre_completo, correo, rol, activo')
      .single();

    if (error || !usuario) {
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

// ── Listar tutorados con su tutor asignado ────────────────────────
const listarTutorados = async (req, res, next) => {
  try {
    const { data: tutorados, error } = await supabase
      .from('tutorados')
      .select(`
        usuario_id,
        num_control_tutorado,
        direccion,
        tutor_id,
        usuarios!inner(id, nombre_completo, correo, activo),
        tutores:tutor_id(
          usuario_id,
          carrera,
          usuarios!inner(nombre_completo)
        )
      `);

    if (error) return res.status(400).json({ success: false, message: error.message });

    const mapeados = (tutorados || []).map(t => ({
      id: t.usuarios.id,
      nombre_completo: t.usuarios.nombre_completo,
      correo: t.usuarios.correo,
      activo: t.usuarios.activo,
      num_control_tutorado: t.num_control_tutorado,
      direccion: t.direccion,
      tutor: t.tutores
        ? {
            id: t.tutor_id,
            nombre_completo: t.tutores.usuarios?.nombre_completo || null,
            carrera: t.tutores.carrera || null,
          }
        : null,
    }));

    res.status(200).json({ success: true, data: { total: mapeados.length, tutorados: mapeados } });
  } catch (err) {
    next(err);
  }
};

// ── Actualizar usuario ───────────────────────────────────────────
const actualizarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre_completo, correo, num_control_tutor, carrera, max_tutorados, num_control_tutorado, direccion } = req.body;

    const { data: usuario, error: errorUsuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', id)
      .single();

    if (errorUsuario || !usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    const updates = {};
    if (nombre_completo) updates.nombre_completo = nombre_completo;
    if (correo) updates.correo = correo;

    if (Object.keys(updates).length > 0) {
      await supabase.from('usuarios').update(updates).eq('id', id);
    }

    if (usuario.rol === 'Tutor') {
      const tutorUpdates = {};
      if (num_control_tutor) tutorUpdates.num_control_tutor = num_control_tutor;
      if (carrera) tutorUpdates.carrera = carrera;
      if (max_tutorados) tutorUpdates.max_tutorados = max_tutorados;
      
      if (Object.keys(tutorUpdates).length > 0) {
        await supabase.from('tutores').update(tutorUpdates).eq('usuario_id', id);
      }
    } else if (usuario.rol === 'Tutorado') {
      const tutoradoUpdates = {};
      if (num_control_tutorado) tutoradoUpdates.num_control_tutorado = num_control_tutorado;
      if (direccion !== undefined) tutoradoUpdates.direccion = direccion;

      if (Object.keys(tutoradoUpdates).length > 0) {
        await supabase.from('tutorados').update(tutoradoUpdates).eq('usuario_id', id);
      }
    }

    res.status(200).json({ success: true, message: 'Usuario actualizado correctamente.' });
  } catch (err) {
    next(err);
  }
};

// ── Eliminar usuario ─────────────────────────────────────────────
const eliminarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Hard delete
    await supabase.from('tutores').delete().eq('usuario_id', id);
    await supabase.from('tutorados').delete().eq('usuario_id', id);
    
    const { error } = await supabase.from('usuarios').delete().eq('id', id);

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.status(200).json({ success: true, message: 'Usuario eliminado correctamente.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registrarUsuario,
  consultarTutoresPorCarrera,
  consultarTutoradosPorTutor,
  listarTutorados,
  listarUsuarios,
  obtenerUsuario,
  cambiarEstadoUsuario,
  actualizarUsuario,
  eliminarUsuario,
};

