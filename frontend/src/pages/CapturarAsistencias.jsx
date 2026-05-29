import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { Calendar, ClipboardList, CheckCircle2, XCircle, Clock, PlusCircle, Users } from 'lucide-react';

const ESTADO_BADGE = {
    programada:   { label: 'Programada',  cls: 'bg-blue-100 text-blue-700' },
    realizada:    { label: 'Realizada',   cls: 'bg-green-100 text-green-700' },
    cancelada:    { label: 'Cancelada',   cls: 'bg-red-100 text-red-700' },
    reprogramada: { label: 'Reprogramada', cls: 'bg-yellow-100 text-yellow-700' },
};

export default function CapturarAsistencias() {
    const { user } = useAuth();

    // ── Vistas ───────────────────────────────────────────────────
    const [vista, setVista] = useState('lista'); // 'lista' | 'captura' | 'nueva'

    // ── Lista de sesiones ─────────────────────────────────────────
    const [sesiones, setSesiones] = useState([]);
    const [sesionActiva, setSesionActiva] = useState(null);

    // ── Datos para captura de asistencia ──────────────────────────
    const [alumnos, setAlumnos] = useState([]);
    const [asistencias, setAsistencias] = useState({});
    const [cargandoAlumnos, setCargandoAlumnos] = useState(false);

    // ── Formulario nueva sesión ───────────────────────────────────
    const [grupos, setGrupos] = useState([]);
    const [planes, setPlanes] = useState([]);
    const [nuevaSesion, setNuevaSesion] = useState({
        no_sesion: '',
        fecha: new Date().toISOString().split('T')[0],
        hora: '10:00',
        grupo_id: '',
        plan_tutoria_id: '',
        observaciones: '',
    });

    // ── Carga inicial ─────────────────────────────────────────────
    const cargarSesiones = async () => {
        if (!user) return;
        try {
            const endpoint = user.rol === 'Tutor' 
                ? `/asistencias/mis-sesiones?tutor_id=${user.id}`
                : `/asistencias/mis-sesiones`;
            const res = await api.get(endpoint);
            setSesiones(res.data.data.sesiones || []);
        } catch (err) {
            console.error('Error cargando sesiones:', err);
        }
    };

    const cargarGruposYPlanes = async () => {
        if (!user) return;
        try {
            const [resGrupos, resPlanes] = await Promise.all([
                api.get('/tutorias/grupos'),
                api.get('/tutorias/planes'),
            ]);
            // Filtrar solo grupos del tutor si el rol es Tutor
            const todosGrupos = resGrupos.data.data.grupos || [];
            const misGrupos = user.rol === 'Tutor'
                ? todosGrupos.filter(g => g.tutor_id === user.id)
                : todosGrupos;
            setGrupos(misGrupos);
            setPlanes(resPlanes.data.data.planes || []);
        } catch (err) {
            console.error('Error cargando grupos/planes:', err);
        }
    };

    useEffect(() => {
        if (user) {
            cargarSesiones();
            cargarGruposYPlanes();
        }
    }, [user]);

    // ── Abrir sesión para capturar asistencia ──────────────────────
    const abrirCaptura = async (sesion) => {
        if (sesion.estado === 'cancelada') {
            Swal.fire({ title: 'Sesión cancelada', text: 'No puedes registrar asistencia en una sesión cancelada.', icon: 'warning', confirmButtonColor: '#0B2B54' });
            return;
        }
        setSesionActiva(sesion);
        setCargandoAlumnos(true);
        setVista('captura');
        try {
            const res = await api.get(`/asistencias/sesiones/${sesion.id}/alumnos`);
            const alumnosData = res.data.data.alumnos || [];
            setAlumnos(alumnosData);
            // Pre-llenar con asistencia ya guardada, o null si no hay
            const mapa = {};
            alumnosData.forEach(a => { mapa[a.tutorado_id] = a.asistio; });
            setAsistencias(mapa);
        } catch (err) {
            Swal.fire({ title: 'Error', text: err.response?.data?.message || 'No se pudo cargar la lista de alumnos.', icon: 'error', confirmButtonColor: '#0B2B54' });
            setVista('lista');
        } finally {
            setCargandoAlumnos(false);
        }
    };

    // ── Marcar todos ──────────────────────────────────────────────
    const marcarTodos = (valor) => {
        const nuevo = {};
        alumnos.forEach(a => { nuevo[a.tutorado_id] = valor; });
        setAsistencias(nuevo);
    };

    // ── Imprimir Comprobante ──────────────────────────────────────
    const imprimirComprobante = (sesion, total, presentes, ausentes) => {
        const contenido = `
            <html>
            <head>
                <title>Comprobante de Captura de Asistencias</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #0B2B54; padding-bottom: 20px; margin-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: bold; color: #0B2B54; }
                    .info { margin-bottom: 30px; font-size: 14px; }
                    .info p { margin: 5px 0; }
                    .stats { display: flex; justify-content: space-around; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
                    .stat-box { text-align: center; }
                    .stat-value { font-size: 28px; font-weight: bold; color: #0B2B54; }
                    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #777; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">Sistema de Gestión de Tutorías</div>
                    <h2>Comprobante de Captura de Asistencia</h2>
                </div>
                <div class="info">
                    <p><strong>Grupo:</strong> ${sesion.grupos?.clave_grupo || 'N/A'}</p>
                    <p><strong>Número de Sesión:</strong> ${sesion.no_sesion}</p>
                    <p><strong>Fecha y Hora:</strong> ${sesion.fecha} - ${sesion.hora}</p>
                    <p><strong>Tutor / Registrado por:</strong> ${user.nombre_completo}</p>
                </div>
                <div class="stats">
                    <div class="stat-box">
                        <div class="stat-value">${total}</div>
                        <div>Total de Alumnos</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value" style="color: #16a34a">${presentes}</div>
                        <div>Presentes</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value" style="color: #dc2626">${ausentes}</div>
                        <div>Ausentes</div>
                    </div>
                </div>
                <div class="footer">
                    Documento generado electrónicamente el ${new Date().toLocaleString('es-MX')}
                </div>
            </body>
            </html>
        `;
        const ventana = window.open('', '_blank');
        if (ventana) {
            ventana.document.write(contenido);
            ventana.document.close();
            setTimeout(() => {
                ventana.print();
            }, 500);
        }
    };

    // ── Guardar asistencias ───────────────────────────────────────
    const handleGuardar = async () => {
        const payload = alumnos.map(a => ({
            tutorado_id: a.tutorado_id,
            asistencia: asistencias[a.tutorado_id] ?? false,
        }));

        if (payload.some(p => p.asistencia === null || p.asistencia === undefined)) {
            // Tratar null como false (ausente)
        }

        try {
            await api.post(`/asistencias/sesiones/${sesionActiva.id}`, {
                asistencias: payload,
                tutor_id: user.id,
            });

            // Resumen
            const presentes = payload.filter(p => p.asistencia).length;
            const total = payload.length;
            const ausentes = total - presentes;
            const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;

            const res = await Swal.fire({
                title: '✅ Asistencias Guardadas',
                html: `
                    <div class="text-center mb-4">
                        <p class="text-2xl font-bold text-green-600 mb-1">${presentes}/${total}</p>
                        <p class="text-gray-600 text-sm">alumnos presentes (${pct}% de asistencia)</p>
                    </div>
                `,
                icon: 'success',
                showCancelButton: true,
                confirmButtonColor: '#0B2B54',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Imprimir Comprobante',
                cancelButtonText: 'Cerrar',
            });

            if (res.isConfirmed) {
                imprimirComprobante(sesionActiva, total, presentes, ausentes);
            }

            setVista('lista');
            cargarSesiones();
        } catch (err) {
            Swal.fire({ title: 'Error', text: err.response?.data?.message || 'No se pudo guardar las asistencias.', icon: 'error', confirmButtonColor: '#0B2B54' });
        }
    };

    // ── Crear nueva sesión ────────────────────────────────────────
    const handleCrearSesion = async (e) => {
        e.preventDefault();
        try {
            await api.post('/asistencias/sesiones', nuevaSesion);
            Swal.fire({ title: '¡Sesión Creada!', text: 'La sesión fue programada correctamente.', icon: 'success', timer: 1800, showConfirmButton: false });
            setNuevaSesion({ no_sesion: '', fecha: new Date().toISOString().split('T')[0], hora: '10:00', grupo_id: '', plan_tutoria_id: '', observaciones: '' });
            setVista('lista');
            cargarSesiones();
        } catch (err) {
            Swal.fire({ title: 'Error', text: err.response?.data?.message || 'No se pudo crear la sesión.', icon: 'error', confirmButtonColor: '#0B2B54' });
        }
    };

    // ── Helpers ───────────────────────────────────────────────────
    const generarHoras = () => {
        const h = [];
        for (let i = 7; i <= 20; i++) h.push(`${String(i).padStart(2, '0')}:00`);
        return h;
    };

    const presentes = alumnos.filter(a => asistencias[a.tutorado_id] === true).length;
    const ausentes  = alumnos.filter(a => asistencias[a.tutorado_id] === false).length;
    const sinMarcar = alumnos.length - presentes - ausentes;

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-6">

            {/* ── Header con tabs ────────────────────────────────── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-[#0B2B54]">CU05: Capturar Asistencias</h3>
                    <button
                        onClick={() => setVista(vista === 'nueva' ? 'lista' : 'nueva')}
                        className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                    >
                        <PlusCircle size={16} />
                        {vista === 'nueva' ? 'Ver Mis Sesiones' : 'Nueva Sesión'}
                    </button>
                </div>

                {/* ── NUEVA SESIÓN ────────────────────────────────── */}
                {vista === 'nueva' && (
                    <form onSubmit={handleCrearSesion} className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-5">
                        <div className="md:col-span-2">
                            <h4 className="text-sm font-bold text-gray-800 border-b pb-2 mb-1">Programar Nueva Sesión</h4>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Número de Sesión <span className="text-red-500">*</span></label>
                            <input type="number" min="1" required
                                value={nuevaSesion.no_sesion}
                                onChange={e => setNuevaSesion({ ...nuevaSesion, no_sesion: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                                placeholder="Ej. 1"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Grupo <span className="text-red-500">*</span></label>
                            <select required
                                value={nuevaSesion.grupo_id}
                                onChange={e => setNuevaSesion({ ...nuevaSesion, grupo_id: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            >
                                <option value="" disabled>Selecciona tu grupo</option>
                                {grupos.map(g => <option key={g.id} value={g.id}>{g.clave_grupo} — {g.horario}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Plan de Tutoría (PAT) <span className="text-red-500">*</span></label>
                            <select required
                                value={nuevaSesion.plan_tutoria_id}
                                onChange={e => setNuevaSesion({ ...nuevaSesion, plan_tutoria_id: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            >
                                <option value="" disabled>Selecciona el PAT</option>
                                {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.semestre})</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Fecha <span className="text-red-500">*</span></label>
                            <input type="date" required
                                value={nuevaSesion.fecha}
                                onChange={e => setNuevaSesion({ ...nuevaSesion, fecha: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Hora <span className="text-red-500">*</span></label>
                            <select required
                                value={nuevaSesion.hora}
                                onChange={e => setNuevaSesion({ ...nuevaSesion, hora: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            >
                                {generarHoras().map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Observaciones (opcional)</label>
                            <textarea rows={2}
                                value={nuevaSesion.observaciones}
                                onChange={e => setNuevaSesion({ ...nuevaSesion, observaciones: e.target.value })}
                                placeholder="Notas sobre la sesión..."
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm resize-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <button type="submit"
                                className="w-full bg-[#0B2B54] text-white py-3 rounded-lg hover:bg-[#0f3d75] transition-colors font-medium shadow-md"
                            >
                                Programar Sesión
                            </button>
                        </div>
                    </form>
                )}

                {/* ── LISTA DE SESIONES ───────────────────────────── */}
                {vista === 'lista' && (
                    <div>
                        {sesiones.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                <Calendar className="mx-auto mb-3 text-gray-300" size={40} />
                                <p className="text-sm">No tienes sesiones programadas.</p>
                                <p className="text-xs text-gray-400 mt-1">Crea una nueva sesión para empezar a capturar asistencias.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 mt-4">
                                {sesiones.map(s => {
                                    const est = ESTADO_BADGE[s.estado] || ESTADO_BADGE.programada;
                                    return (
                                        <div key={s.id}
                                            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#0B2B54] hover:shadow-sm transition-all cursor-pointer"
                                            onClick={() => abrirCaptura(s)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#0B2B54] text-white rounded-lg w-10 h-10 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                    #{s.no_sesion}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">
                                                        {s.grupos?.clave_grupo || 'Grupo'} — Sesión {s.no_sesion}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        <Calendar size={11} className="inline mr-1" />
                                                        {new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                        {' · '}
                                                        <Clock size={11} className="inline mr-1" />
                                                        {s.hora}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{s.planes_tutoria?.nombre} ({s.planes_tutoria?.semestre})</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${est.cls}`}>{est.label}</span>
                                                {s.estado !== 'cancelada' && (
                                                    <button className="text-xs text-[#0B2B54] hover:underline font-medium" onClick={(e) => { e.stopPropagation(); abrirCaptura(s); }}>
                                                        {s.estado === 'realizada' ? 'Ver / Editar' : 'Capturar'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── CAPTURA DE ASISTENCIA ───────────────────────── */}
                {vista === 'captura' && sesionActiva && (
                    <div className="border-t pt-5 mt-2">
                        {/* Info sesión */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">
                                    {sesionActiva.grupos?.clave_grupo} — Sesión #{sesionActiva.no_sesion}
                                </h4>
                                <p className="text-xs text-gray-500">
                                    {new Date(sesionActiva.fecha + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    {' · '}{sesionActiva.hora}
                                </p>
                            </div>
                            <button onClick={() => setVista('lista')} className="text-sm text-gray-500 hover:text-gray-700 underline">
                                ← Volver
                            </button>
                        </div>

                        {cargandoAlumnos ? (
                            <p className="text-center text-gray-400 py-8 text-sm">Cargando lista de alumnos...</p>
                        ) : alumnos.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="mx-auto text-gray-300 mb-2" size={36} />
                                <p className="text-gray-500 text-sm">No hay alumnos inscritos en este grupo aún.</p>
                            </div>
                        ) : (
                            <>
                                {/* Contador en tiempo real */}
                                <div className="flex gap-4 mb-4 text-xs">
                                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium">
                                        <CheckCircle2 size={13} /> {presentes} presentes
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full font-medium">
                                        <XCircle size={13} /> {ausentes} ausentes
                                    </div>
                                    {sinMarcar > 0 && (
                                        <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-medium">
                                            <Clock size={13} /> {sinMarcar} sin marcar
                                        </div>
                                    )}
                                </div>

                                {/* Accesos rápidos */}
                                <div className="flex gap-2 mb-4">
                                    <button type="button" onClick={() => marcarTodos(true)}
                                        className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors font-medium">
                                        ✓ Marcar todos presentes
                                    </button>
                                    <button type="button" onClick={() => marcarTodos(false)}
                                        className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors font-medium">
                                        ✗ Marcar todos ausentes
                                    </button>
                                </div>

                                {/* Lista de alumnos */}
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {alumnos.map(alumno => {
                                        const valor = asistencias[alumno.tutorado_id];
                                        return (
                                            <div key={alumno.tutorado_id}
                                                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                                    valor === true  ? 'border-green-300 bg-green-50' :
                                                    valor === false ? 'border-red-200 bg-red-50' :
                                                    'border-gray-200 bg-white'
                                                }`}
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{alumno.nombre_completo}</p>
                                                    <p className="text-xs text-gray-400">{alumno.num_control} · {alumno.correo}</p>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAsistencias(prev => ({ ...prev, [alumno.tutorado_id]: true }))}
                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                            valor === true ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                                                        }`}
                                                    >
                                                        <CheckCircle2 size={13} /> P
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAsistencias(prev => ({ ...prev, [alumno.tutorado_id]: false }))}
                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                            valor === false ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                                                        }`}
                                                    >
                                                        <XCircle size={13} /> A
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Botón guardar */}
                                <div className="mt-5 pt-4 border-t">
                                    <button
                                        onClick={handleGuardar}
                                        className="w-full flex items-center justify-center gap-2 bg-[#0B2B54] text-white py-3 rounded-lg hover:bg-[#0f3d75] transition-colors font-medium shadow-md"
                                    >
                                        <ClipboardList size={18} />
                                        Guardar Registro de Asistencia
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
