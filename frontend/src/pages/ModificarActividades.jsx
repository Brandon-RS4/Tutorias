import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import {
    Calendar, ChevronRight, ArrowLeft, RefreshCw,
    Pencil, CheckCircle2, XCircle, AlertCircle,
    BookOpen, FileText, Clock, Lock, Save,
    ClipboardList, Layers
} from 'lucide-react';

// ── Utilidades ─────────────────────────────────────────────────
function fmtFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
}

const ESTADO_SESION = {
    programada:    { label: 'Programada',   cls: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Clock },
    realizada:     { label: 'Realizada',    cls: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    cancelada:     { label: 'Cancelada',    cls: 'bg-red-100 text-red-700 border-red-200',       icon: XCircle },
    reprogramada:  { label: 'Reprogramada', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: RefreshCw },
};

function EstadoBadge({ estado }) {
    const cfg = ESTADO_SESION[estado] || ESTADO_SESION.programada;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
            <Icon size={11} /> {cfg.label}
        </span>
    );
}

// ── Vista 1: Lista de sesiones ─────────────────────────────────
function ListaSesiones({ sesiones, onSeleccionar, cargando, onRecargar }) {
    const editables = sesiones.filter(s => s.editable).length;

    if (cargando) return (
        <div className="text-center py-16">
            <RefreshCw className="mx-auto text-gray-300 animate-spin mb-3" size={36} />
            <p className="text-gray-400 text-sm">Cargando sesiones…</p>
        </div>
    );

    if (sesiones.length === 0) return (
        <div className="text-center py-16">
            <Calendar className="mx-auto text-gray-200 mb-3" size={52} />
            <p className="text-gray-500 font-medium">No tienes sesiones registradas</p>
            <p className="text-gray-400 text-xs mt-1">Las sesiones se crean desde el módulo de Capturar Asistencias.</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-[#0B2B54]/5 border border-[#0B2B54]/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-[#0B2B54]">{sesiones.length}</p>
                    <p className="text-xs text-gray-500">Total sesiones</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{editables}</p>
                    <p className="text-xs text-green-600">Editables</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-500">{sesiones.length - editables}</p>
                    <p className="text-xs text-gray-400">No editables</p>
                </div>
            </div>

            {sesiones.map(sesion => (
                <div
                    key={sesion.id}
                    onClick={() => sesion.editable && onSeleccionar(sesion)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all
                        ${sesion.editable
                            ? 'border-gray-100 hover:border-[#0B2B54]/30 hover:shadow-md cursor-pointer group'
                            : 'border-gray-100 bg-gray-50/50 cursor-not-allowed opacity-60'
                        }`}
                >
                    <div className="flex items-center gap-4 min-w-0">
                        {/* Número de sesión */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm
                            ${sesion.editable ? 'bg-[#0B2B54] text-white group-hover:bg-[#0f3d75]' : 'bg-gray-300 text-gray-500'}`}>
                            S{sesion.no_sesion}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 text-sm">
                                    Sesión {sesion.no_sesion}
                                </p>
                                <EstadoBadge estado={sesion.estado} />
                                {!sesion.editable && (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                        <Lock size={10} /> Bloqueada
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                <Calendar size={10} className="inline mr-1" />
                                {fmtFecha(sesion.fecha)} · {sesion.hora?.substring(0, 5)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                <Layers size={10} className="inline mr-1" />
                                {sesion.grupos?.clave_grupo} ·{' '}
                                <span className={sesion.planes_tutoria?.estado === 'activo' ? 'text-green-600 font-medium' : 'text-red-500'}>
                                    PAT: {sesion.planes_tutoria?.nombre}
                                </span>
                            </p>
                            {sesion.actividades?.length > 0 && (
                                <p className="text-xs text-blue-600 mt-0.5">
                                    <BookOpen size={10} className="inline mr-1" />
                                    {sesion.actividades.length} actividad{sesion.actividades.length > 1 ? 'es' : ''} asociada{sesion.actividades.length > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {sesion.editable ? (
                            <>
                                <span className="text-xs text-[#0B2B54] font-semibold bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                                    <Pencil size={11} /> Editar
                                </span>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-[#0B2B54] transition-colors" />
                            </>
                        ) : (
                            <Lock size={15} className="text-gray-300" />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Vista 2: Lista de actividades de la sesión ─────────────────
function ListaActividades({ sesion, actividades, onEditar, onVolver }) {
    if (!sesion) return null;

    return (
        <div className="space-y-5">
            {/* Sesión seleccionada */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-2">Sesión seleccionada</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 className="font-bold text-gray-900 text-base">
                            Sesión {sesion.no_sesion} — {sesion.grupos?.clave_grupo}
                        </h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                            <Calendar size={12} className="inline mr-1" />
                            {fmtFecha(sesion.fecha)} · {sesion.hora?.substring(0, 5)}
                        </p>
                        <p className="text-sm text-gray-500">
                            PAT: {sesion.planes_tutoria?.nombre} · {sesion.planes_tutoria?.semestre}
                        </p>
                    </div>
                    <EstadoBadge estado={sesion.estado} />
                </div>
            </div>

            {/* A1 – Sin actividades */}
            {actividades.length === 0 ? (
                <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
                    <FileText className="mx-auto text-gray-200 mb-3" size={48} />
                    <p className="text-gray-500 font-medium">Sin actividades asociadas</p>
                    <p className="text-gray-400 text-xs mt-1">Esta sesión no cuenta con actividades registradas en el PAT.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {actividades.map(act => (
                        <div
                            key={act.id}
                            onClick={() => onEditar(act)}
                            className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-[#0B2B54]/30 hover:shadow-md cursor-pointer group transition-all bg-white"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-[#0B2B54] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:bg-[#0f3d75] transition-colors">
                                    #{act.no_actividad}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{act.nombre}</p>
                                    {act.instrucciones && (
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{act.instrucciones}</p>
                                    )}
                                    {act.fecha_realizacion && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            <Calendar size={10} className="inline mr-1" />
                                            {fmtFecha(act.fecha_realizacion)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <span className="text-xs text-[#0B2B54] bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                                    <Pencil size={11} /> Modificar
                                </span>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-[#0B2B54] transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Vista 3: Formulario de edición ─────────────────────────────
function FormularioEdicion({ sesion, actividad, onGuardar, onVolver, enviando }) {
    const [nombre,           setNombre]       = useState(actividad?.nombre || '');
    const [instrucciones,    setInstruc]      = useState(actividad?.instrucciones || '');
    const [fechaRealizacion, setFecha]        = useState(
        actividad?.fecha_realizacion ? actividad.fecha_realizacion.split('T')[0] : ''
    );
    const [errores,          setErrores]      = useState({});

    const validar = () => {
        const e = {};
        if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
        else if (nombre.trim().length < 3) e.nombre = 'El nombre debe tener al menos 3 caracteres.';
        return e;
    };

    const handleGuardar = async () => {
        const e = validar();
        if (Object.keys(e).length > 0) { setErrores(e); return; }

        const payload = {};
        if (nombre !== actividad?.nombre)                   payload.nombre = nombre.trim();
        if (instrucciones !== actividad?.instrucciones)     payload.instrucciones = instrucciones.trim();
        if (fechaRealizacion && fechaRealizacion !== (actividad?.fecha_realizacion || '').split('T')[0])
            payload.fecha_realizacion = fechaRealizacion;

        if (Object.keys(payload).length === 0) {
            Swal.fire({ icon: 'info', title: 'Sin cambios', text: 'No realizaste ningún cambio en la actividad.', confirmButtonColor: '#0B2B54' });
            return;
        }

        await onGuardar(payload);
    };

    const campoClase = (campo) =>
        `w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 transition-colors ${
            errores[campo]
                ? 'border-red-400 bg-red-50 focus:ring-red-300'
                : 'border-gray-300 focus:ring-[#0B2B54]'
        }`;

    return (
        <div className="space-y-5">
            {/* Contexto */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Editando actividad</p>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0B2B54] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        #{actividad?.no_actividad}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 text-sm">{actividad?.nombre}</p>
                        <p className="text-xs text-gray-400">
                            Sesión {sesion?.no_sesion} · {sesion?.grupos?.clave_grupo}
                        </p>
                    </div>
                </div>
            </div>

            {/* Formulario */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <ClipboardList size={14} />
                    Campos Editables
                </h4>

                <div className="space-y-5">
                    {/* Nombre */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                            Nombre de la actividad <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={e => { setNombre(e.target.value); setErrores(prev => ({ ...prev, nombre: '' })); }}
                            className={campoClase('nombre')}
                            placeholder="Ej. Taller de orientación vocacional"
                        />
                        {errores.nombre && <p className="text-xs text-red-500 mt-1">{errores.nombre}</p>}
                    </div>

                    {/* Instrucciones / Descripción */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                            Descripción / Instrucciones
                            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                        </label>
                        <textarea
                            rows={4}
                            value={instrucciones}
                            onChange={e => setInstruc(e.target.value)}
                            placeholder="Detalla los objetivos, criterios o pasos de la actividad…"
                            className={campoClase('instrucciones') + ' resize-none'}
                        />
                    </div>

                    {/* Fecha de realización */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                            Fecha de realización
                            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                        </label>
                        <input
                            type="date"
                            value={fechaRealizacion}
                            onChange={e => setFecha(e.target.value)}
                            className={campoClase('fecha')}
                        />
                    </div>
                </div>
            </div>

            {/* Botón guardar */}
            <button
                onClick={handleGuardar}
                disabled={enviando}
                className="w-full flex items-center justify-center gap-2 bg-[#0B2B54] hover:bg-[#0f3d75] text-white py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {enviando
                    ? <><RefreshCw size={16} className="animate-spin" /> Guardando cambios…</>
                    : <><Save size={16} /> Confirmar y Guardar Cambios</>}
            </button>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  Componente principal
// ══════════════════════════════════════════════════════════════
export default function ModificarActividades() {
    const { user } = useAuth();

    // Vista: 'sesiones' | 'actividades' | 'editar'
    const [vista,        setVista]    = useState('sesiones');
    const [sesiones,     setSesiones] = useState([]);
    const [cargando,     setCargando] = useState(false);

    // Selecciones
    const [sesionSel,    setSesionSel]   = useState(null);
    const [actividades,  setActividades] = useState([]);
    const [actSel,       setActSel]      = useState(null);
    const [cargandoActs, setCargActs]    = useState(false);

    // Envío
    const [enviando, setEnviando] = useState(false);

    // ── Carga inicial de sesiones ──────────────────────────────
    const cargarSesiones = useCallback(async () => {
        if (!user) return;
        setCargando(true);
        try {
            const res = await api.get('/actividades/mis-sesiones');
            setSesiones(res.data.data.sesiones || []);
        } catch (err) {
            console.error('Error cargando sesiones:', err);
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudieron cargar las sesiones.', confirmButtonColor: '#0B2B54' });
        } finally {
            setCargando(false);
        }
    }, [user]);

    useEffect(() => { cargarSesiones(); }, [cargarSesiones]);

    // ── Seleccionar sesión → cargar actividades ────────────────
    const handleSeleccionarSesion = async (sesion) => {
        setSesionSel(sesion);
        setCargActs(true);
        setVista('actividades');
        try {
            const res = await api.get(`/actividades/sesiones/${sesion.id}`);
            setActividades(res.data.data.actividades || []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudieron cargar las actividades.', confirmButtonColor: '#0B2B54' });
            setVista('sesiones');
        } finally {
            setCargActs(false);
        }
    };

    // ── Seleccionar actividad → formulario de edición ──────────
    const handleEditarActividad = (act) => {
        setActSel(act);
        setVista('editar');
    };

    // ── Guardar cambios ────────────────────────────────────────
    const handleGuardar = async (payload) => {
        const confirm = await Swal.fire({
            title: '¿Confirmar cambios?',
            html: `
                <div class="text-sm text-left text-gray-600 space-y-1">
                    <p><strong>Actividad:</strong> ${actSel.nombre}</p>
                    ${payload.nombre ? `<p><strong>Nuevo nombre:</strong> ${payload.nombre}</p>` : ''}
                    ${payload.instrucciones ? `<p><strong>Instrucciones:</strong> actualizadas</p>` : ''}
                    ${payload.fecha_realizacion ? `<p><strong>Nueva fecha:</strong> ${payload.fecha_realizacion}</p>` : ''}
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0B2B54',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, guardar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirm.isConfirmed) return;

        setEnviando(true);
        try {
            const res = await api.put(`/actividades/sesiones/${sesionSel.id}/actividad/${actSel.id}`, payload);

            await Swal.fire({
                title: '✅ Actividad actualizada',
                text: res.data.message,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
            });

            // Volver a la lista de actividades y refrescar
            setVista('actividades');
            const res2 = await api.get(`/actividades/sesiones/${sesionSel.id}`);
            setActividades(res2.data.data.actividades || []);

        } catch (err) {
            const msg = err.response?.data?.message || 'Error al guardar los cambios.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0B2B54' });
        } finally {
            setEnviando(false);
        }
    };

    // ── Navegación ─────────────────────────────────────────────
    const volver = () => {
        if (vista === 'editar')      { setVista('actividades'); setActSel(null); }
        else if (vista === 'actividades') { setVista('sesiones'); setSesionSel(null); setActividades([]); }
    };

    // ─────────────────────────────────────────────────────────────
    //  RENDER
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-6">

            {/* Header con breadcrumb */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                            <span
                                onClick={() => { setVista('sesiones'); setSesionSel(null); setActividades([]); setActSel(null); }}
                                className={`cursor-pointer hover:text-[#0B2B54] transition-colors ${vista === 'sesiones' ? 'text-[#0B2B54] font-semibold' : ''}`}
                            >
                                Sesiones
                            </span>
                            {sesionSel && (
                                <>
                                    <ChevronRight size={12} />
                                    <span
                                        onClick={() => { if (vista === 'editar') { setVista('actividades'); setActSel(null); } }}
                                        className={`cursor-pointer hover:text-[#0B2B54] transition-colors ${vista === 'actividades' ? 'text-[#0B2B54] font-semibold' : ''}`}
                                    >
                                        Sesión {sesionSel.no_sesion}
                                    </span>
                                </>
                            )}
                            {actSel && (
                                <>
                                    <ChevronRight size={12} />
                                    <span className="text-[#0B2B54] font-semibold truncate max-w-[180px]">
                                        {actSel.nombre}
                                    </span>
                                </>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-[#0B2B54]">Modificar Actividades</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {vista === 'sesiones'    && 'Selecciona una sesión para ver sus actividades'}
                            {vista === 'actividades' && 'Selecciona la actividad que deseas modificar'}
                            {vista === 'editar'      && 'Modifica los campos y confirma los cambios'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {vista !== 'sesiones' && (
                            <button
                                onClick={volver}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0B2B54] bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors font-medium"
                            >
                                <ArrowLeft size={14} /> Volver
                            </button>
                        )}
                        {vista === 'sesiones' && (
                            <button
                                onClick={cargarSesiones}
                                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                            >
                                <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
                                Actualizar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                {vista === 'sesiones' && (
                    <ListaSesiones
                        sesiones={sesiones}
                        onSeleccionar={handleSeleccionarSesion}
                        cargando={cargando}
                        onRecargar={cargarSesiones}
                    />
                )}

                {vista === 'actividades' && (
                    cargandoActs ? (
                        <div className="text-center py-16">
                            <RefreshCw className="mx-auto text-gray-300 animate-spin mb-3" size={36} />
                            <p className="text-gray-400 text-sm">Cargando actividades de la sesión…</p>
                        </div>
                    ) : (
                        <ListaActividades
                            sesion={sesionSel}
                            actividades={actividades}
                            onEditar={handleEditarActividad}
                            onVolver={volver}
                        />
                    )
                )}

                {vista === 'editar' && actSel && (
                    <FormularioEdicion
                        sesion={sesionSel}
                        actividad={actSel}
                        onGuardar={handleGuardar}
                        onVolver={volver}
                        enviando={enviando}
                    />
                )}
            </div>
        </div>
    );
}
