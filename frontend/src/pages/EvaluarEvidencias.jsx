import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import {
    FileText, Search, Filter, Eye, CheckCircle2, XCircle,
    Clock, AlertCircle, Download, Star, ChevronRight,
    ArrowLeft, User, Calendar, BookOpen, RefreshCw
} from 'lucide-react';

// ── Configuración de estados de evidencia ──────────────────────
const ESTADO_CONFIG = {
    entregado:        { label: 'Pendiente',         cls: 'bg-amber-100 text-amber-700 border-amber-200',   icon: Clock },
    evaluado:         { label: 'Evaluada',           cls: 'bg-green-100 text-green-700 border-green-200',   icon: CheckCircle2 },
    rechazado:        { label: 'Rechazada',          cls: 'bg-red-100 text-red-700 border-red-200',         icon: XCircle },
    pendiente_reenvio:{ label: 'Pend. Reenvío',      cls: 'bg-orange-100 text-orange-700 border-orange-200',icon: AlertCircle },
};

const EXTENSION_ICON = {
    pdf:  '📄',
    png:  '🖼️',
    jpg:  '🖼️',
    jpeg: '🖼️',
    docx: '📝',
    pptx: '📊',
};

function getExtension(url = '') {
    return url.split('.').pop()?.toLowerCase() || '';
}

function getFileIcon(url) {
    return EXTENSION_ICON[getExtension(url)] || '📎';
}

function formatFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Chip de estado ─────────────────────────────────────────────
function EstadoBadge({ estado }) {
    const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.entregado;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
            <Icon size={11} />
            {cfg.label}
        </span>
    );
}

// ── Tarjeta de evidencia en lista ──────────────────────────────
function EvidenciaCard({ evidencia, onClick }) {
    const alumno = evidencia.tutorados?.usuarios?.nombre_completo || 'Alumno';
    const ctrl   = evidencia.tutorados?.num_control_tutorado || '';
    const act    = evidencia.actividades?.nombre || '—';
    const pat    = evidencia.actividades?.planes_tutoria?.nombre || '';
    const esPendiente = evidencia.estado === 'entregado';

    return (
        <div
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer group
                ${esPendiente
                    ? 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-md'
                    : 'border-gray-100 bg-white hover:border-[#0B2B54]/30 hover:shadow-sm'}`}
            onClick={() => onClick(evidencia)}
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={`text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg
                    ${esPendiente ? 'bg-amber-100' : 'bg-gray-100'}`}>
                    {getFileIcon(evidencia.archivo_url)}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{alumno}</p>
                    {ctrl && <p className="text-xs text-gray-400">Ctrl: {ctrl}</p>}
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                        <BookOpen size={10} className="inline mr-1" />{act}
                        {pat && <span className="text-gray-400"> · {pat}</span>}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <div className="text-right hidden sm:block">
                    <EstadoBadge estado={evidencia.estado} />
                    <p className="text-xs text-gray-400 mt-1">
                        <Calendar size={10} className="inline mr-1" />
                        {formatFecha(evidencia.fecha_carga)}
                    </p>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#0B2B54] transition-colors" />
            </div>
        </div>
    );
}

// ── Componente principal ────────────────────────────────────────
export default function EvaluarEvidencias() {
    const { user } = useAuth();

    const [vista, setVista]           = useState('lista');   // 'lista' | 'detalle'
    const [evidencias, setEvidencias] = useState([]);
    const [cargando, setCargando]     = useState(false);
    const [seleccionada, setSeleccionada] = useState(null);

    // Filtros
    const [filtroEstado,    setFiltroEstado]    = useState('');
    const [filtroBusqueda,  setFiltroBusqueda]  = useState('');

    // Formulario de evaluación
    const [resultado,      setResultado]      = useState('');
    const [calificacion,   setCalificacion]   = useState('');
    const [observaciones,  setObservaciones]  = useState('');
    const [enviando,       setEnviando]       = useState(false);

    // ── Carga de evidencias ────────────────────────────────────
    const cargarEvidencias = useCallback(async () => {
        if (!user) return;
        setCargando(true);
        try {
            const params = new URLSearchParams();
            if (filtroEstado) params.set('estado', filtroEstado);
            const res = await api.get(`/evidencias?${params.toString()}`);
            setEvidencias(res.data.data.evidencias || []);
        } catch (err) {
            console.error('Error cargando evidencias:', err);
        } finally {
            setCargando(false);
        }
    }, [user, filtroEstado]);

    useEffect(() => {
        if (user) cargarEvidencias();
    }, [cargarEvidencias]);

    // ── Filtrado local por búsqueda ────────────────────────────
    const evidenciasFiltradas = evidencias.filter(e => {
        if (!filtroBusqueda) return true;
        const q = filtroBusqueda.toLowerCase();
        const alumno = e.tutorados?.usuarios?.nombre_completo?.toLowerCase() || '';
        const ctrl   = e.tutorados?.num_control_tutorado?.toLowerCase() || '';
        const act    = e.actividades?.nombre?.toLowerCase() || '';
        return alumno.includes(q) || ctrl.includes(q) || act.includes(q);
    });

    const pendientes  = evidencias.filter(e => e.estado === 'entregado').length;
    const evaluadas   = evidencias.filter(e => e.estado === 'evaluado').length;
    const rechazadas  = evidencias.filter(e => e.estado === 'pendiente_reenvio').length;

    // ── Abrir detalle ──────────────────────────────────────────
    const abrirDetalle = (ev) => {
        setSeleccionada(ev);
        setResultado('');
        setCalificacion('');
        setObservaciones(ev.observaciones_tutor || '');
        setVista('detalle');
    };

    // ── Ver / descargar archivo ────────────────────────────────
    const verArchivo = (evidencia) => {
        if (!evidencia.archivo_url) {
            Swal.fire({ icon: 'warning', title: 'Sin archivo', text: 'Esta evidencia no tiene un archivo adjunto.', confirmButtonColor: '#0B2B54' });
            return;
        }
        // El backend sirve los archivos en /uploads/...
        const filename = evidencia.archivo_url.split(/[\\/]/).pop();
        const uploadsUrl = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5000/uploads';
        const url = `${uploadsUrl}/${filename}`;
        window.open(url, '_blank');
    };

    // ── Enviar evaluación ──────────────────────────────────────
    const handleEvaluar = async () => {
        if (!resultado) {
            Swal.fire({ icon: 'warning', title: 'Resultado requerido', text: 'Debes indicar si la evidencia es aprobada o rechazada.', confirmButtonColor: '#0B2B54' });
            return;
        }

        const confirm = await Swal.fire({
            title: resultado === 'aprobada' ? '✅ Aprobar Evidencia' : '❌ Rechazar Evidencia',
            html: `
                <div class="text-sm text-gray-600 text-left space-y-1">
                    <p><strong>Alumno:</strong> ${seleccionada.tutorados?.usuarios?.nombre_completo || '—'}</p>
                    <p><strong>Actividad:</strong> ${seleccionada.actividades?.nombre || '—'}</p>
                    <p><strong>Resultado:</strong> ${resultado === 'aprobada' ? '<span style="color:#16a34a">Aprobada</span>' : '<span style="color:#dc2626">Rechazada — se habilitará reenvío</span>'}</p>
                    ${calificacion ? `<p><strong>Calificación:</strong> ${calificacion}</p>` : ''}
                </div>
            `,
            icon: resultado === 'aprobada' ? 'success' : 'warning',
            showCancelButton: true,
            confirmButtonColor: resultado === 'aprobada' ? '#16a34a' : '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirm.isConfirmed) return;

        setEnviando(true);
        try {
            const res = await api.patch(`/evidencias/${seleccionada.id}/evaluar`, {
                resultado,
                calificacion: calificacion ? parseFloat(calificacion) : undefined,
                observaciones,
            });

            await Swal.fire({
                title: '¡Evaluación Registrada!',
                html: `
                    <div class="text-sm text-gray-600">
                        <p>${res.data.message}</p>
                        ${res.data.data?.notificacion?.tutorado
                            ? `<p class="mt-2 text-xs text-gray-400">Notificado: ${res.data.data.notificacion.tutorado}</p>`
                            : ''}
                    </div>
                `,
                icon: 'success',
                timer: 2500,
                showConfirmButton: false,
            });

            setVista('lista');
            cargarEvidencias();
        } catch (err) {
            const msg = err.response?.data?.message || 'No se pudo registrar la evaluación.';
            // A1 – Archivo inaccesible
            if (err.response?.status === 410) {
                Swal.fire({ icon: 'error', title: 'Archivo inaccesible', text: msg, confirmButtonColor: '#0B2B54' });
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0B2B54' });
            }
        } finally {
            setEnviando(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    //  RENDER – VISTA LISTA
    // ─────────────────────────────────────────────────────────────
    if (vista === 'lista') {
        return (
            <div className="max-w-4xl mx-auto pb-10 space-y-6">

                {/* Header */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#0B2B54]">CU06: Gestión de Evidencias</h3>
                            <p className="text-sm text-gray-500 mt-1">Revisa y evalúa las evidencias entregadas por tus tutorados</p>
                        </div>
                        <button
                            onClick={cargarEvidencias}
                            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 px-3 rounded-lg transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-amber-700">{pendientes}</p>
                            <p className="text-xs text-amber-600 mt-0.5">Pendientes</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-green-700">{evaluadas}</p>
                            <p className="text-xs text-green-600 mt-0.5">Aprobadas</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-orange-700">{rechazadas}</p>
                            <p className="text-xs text-orange-600 mt-0.5">Con Reenvío</p>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por alumno, num. control o actividad…"
                            value={filtroBusqueda}
                            onChange={e => setFiltroBusqueda(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0B2B54]"
                        />
                    </div>
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filtroEstado}
                            onChange={e => setFiltroEstado(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0B2B54] bg-white"
                        >
                            <option value="">Todos los estados</option>
                            <option value="entregado">Pendientes</option>
                            <option value="evaluado">Aprobadas</option>
                            <option value="pendiente_reenvio">Pend. Reenvío</option>
                        </select>
                    </div>
                </div>

                {/* Lista de evidencias */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    {cargando ? (
                        <div className="text-center py-10">
                            <RefreshCw className="mx-auto text-gray-300 mb-3 animate-spin" size={36} />
                            <p className="text-gray-400 text-sm">Cargando evidencias…</p>
                        </div>
                    ) : evidenciasFiltradas.length === 0 ? (
                        <div className="text-center py-10">
                            <FileText className="mx-auto text-gray-200 mb-3" size={48} />
                            <p className="text-gray-500 font-medium">No hay evidencias{filtroEstado || filtroBusqueda ? ' con estos filtros' : ' por revisar'}</p>
                            <p className="text-gray-400 text-xs mt-1">
                                {!filtroEstado && !filtroBusqueda ? 'Las evidencias que suban tus tutorados aparecerán aquí.' : 'Prueba cambiando los filtros.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Sección: Pendientes primero */}
                            {evidenciasFiltradas.filter(e => e.estado === 'entregado').length > 0 && (
                                <>
                                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider px-1 flex items-center gap-1.5">
                                        <Clock size={11} /> Pendientes de revisión ({evidenciasFiltradas.filter(e => e.estado === 'entregado').length})
                                    </p>
                                    {evidenciasFiltradas
                                        .filter(e => e.estado === 'entregado')
                                        .map(e => <EvidenciaCard key={e.id} evidencia={e} onClick={abrirDetalle} />)}
                                    {evidenciasFiltradas.filter(e => e.estado !== 'entregado').length > 0 && (
                                        <hr className="my-3" />
                                    )}
                                </>
                            )}
                            {/* Sección: resto */}
                            {evidenciasFiltradas
                                .filter(e => e.estado !== 'entregado')
                                .map(e => <EvidenciaCard key={e.id} evidencia={e} onClick={abrirDetalle} />)}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    //  RENDER – VISTA DETALLE / EVALUACIÓN
    // ─────────────────────────────────────────────────────────────
    const alumno  = seleccionada?.tutorados?.usuarios?.nombre_completo || '—';
    const ctrl    = seleccionada?.tutorados?.num_control_tutorado || '';
    const correo  = seleccionada?.tutorados?.usuarios?.correo || '';
    const actNom  = seleccionada?.actividades?.nombre || '—';
    const actInst = seleccionada?.actividades?.instrucciones || '';
    const patNom  = seleccionada?.actividades?.planes_tutoria?.nombre || '—';
    const esPendiente = seleccionada?.estado === 'entregado';
    const yaEvaluada  = seleccionada?.estado === 'evaluado' || seleccionada?.estado === 'pendiente_reenvio';

    return (
        <div className="max-w-3xl mx-auto pb-10 space-y-5">

            {/* Barra superior */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <button
                    onClick={() => setVista('lista')}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0B2B54] transition-colors font-medium"
                >
                    <ArrowLeft size={16} /> Volver a la lista
                </button>
                <EstadoBadge estado={seleccionada?.estado} />
            </div>

            {/* Información del alumno y actividad */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Información de la Evidencia</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0B2B54] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {alumno.charAt(0)}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">{alumno}</p>
                            {ctrl && <p className="text-xs text-gray-400">Ctrl: {ctrl}</p>}
                            <p className="text-xs text-gray-400">{correo}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">Actividad</p>
                        <p className="font-semibold text-sm text-gray-800">{actNom}</p>
                        <p className="text-xs text-gray-400 mt-0.5">PAT: {patNom}</p>
                    </div>
                    {actInst && (
                        <div className="sm:col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Instrucciones de la actividad</p>
                            <p className="text-xs text-blue-600">{actInst}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">Fecha de entrega</p>
                        <p className="text-sm text-gray-700">{formatFecha(seleccionada?.fecha_carga)}</p>
                    </div>
                    {seleccionada?.fecha_evaluacion && (
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Fecha de evaluación</p>
                            <p className="text-sm text-gray-700">{formatFecha(seleccionada.fecha_evaluacion)}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Archivo adjunto */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Archivo Adjunto</h4>
                {seleccionada?.archivo_url ? (
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{getFileIcon(seleccionada.archivo_url)}</span>
                            <div>
                                <p className="text-sm font-medium text-gray-800">
                                    {seleccionada.archivo_url.split(/[\\/]/).pop()}
                                </p>
                                <p className="text-xs text-gray-400 uppercase">{getExtension(seleccionada.archivo_url)} · Evidencia digital</p>
                            </div>
                        </div>
                        <button
                            onClick={() => verArchivo(seleccionada)}
                            className="flex items-center gap-2 bg-[#0B2B54] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#0f3d75] transition-colors font-medium"
                        >
                            <Eye size={15} /> Ver / Descargar
                        </button>
                    </div>
                ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-600">No hay archivo adjunto. Solicita al tutorado que realice un nuevo envío.</p>
                    </div>
                )}
            </div>

            {/* Resultado previo si ya fue evaluada */}
            {yaEvaluada && (
                <div className={`p-5 rounded-xl border-2 ${seleccionada.estado === 'evaluado' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                    <p className={`text-sm font-bold mb-2 ${seleccionada.estado === 'evaluado' ? 'text-green-700' : 'text-orange-700'}`}>
                        {seleccionada.estado === 'evaluado' ? '✅ Evaluación anterior: Aprobada' : '⚠️ Evaluación anterior: Rechazada — Reenvío habilitado'}
                    </p>
                    {seleccionada.calificacion != null && (
                        <p className="text-sm text-gray-700 flex items-center gap-1">
                            <Star size={13} className="text-amber-500" />
                            Calificación: <strong>{seleccionada.calificacion}</strong>
                        </p>
                    )}
                    {seleccionada.observaciones_tutor && (
                        <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Observaciones:</span> {seleccionada.observaciones_tutor}
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Puedes re-evaluar esta evidencia si es necesario.</p>
                </div>
            )}

            {/* Formulario de evaluación */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                    {yaEvaluada ? 'Re-evaluar Evidencia' : 'Registrar Evaluación'}
                </h4>

                <div className="space-y-4">
                    {/* Resultado */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            Resultado <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setResultado('aprobada')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                    resultado === 'aprobada'
                                        ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                                        : 'border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50/50'
                                }`}
                            >
                                <CheckCircle2 size={18} />
                                Cumplimiento / Aprobada
                            </button>
                            <button
                                type="button"
                                onClick={() => setResultado('rechazada')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                    resultado === 'rechazada'
                                        ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                                        : 'border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50/50'
                                }`}
                            >
                                <XCircle size={18} />
                                Rechazo / Reenvío
                            </button>
                        </div>
                        {resultado === 'rechazada' && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                                <AlertCircle size={13} />
                                Al rechazar, el alumno recibirá una notificación y podrá volver a subir la evidencia.
                            </div>
                        )}
                    </div>

                    {/* Calificación (opcional) */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1">
                            Calificación <span className="text-gray-400 font-normal">(opcional, 0–4)</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                max="4"
                                step="1"
                                value={calificacion}
                                onChange={e => setCalificacion(e.target.value)}
                                placeholder="Ej. 3"
                                className="w-32 border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            />
                            {calificacion && (
                                <div className="flex items-center gap-1 text-amber-600">
                                    {[...Array(parseInt(calificacion || 0))].map((_, i) => (
                                        <Star key={i} size={14} fill="currentColor" />
                                    ))}
                                    <span className="text-sm font-bold ml-1">
                                        {calificacion} / 4 ({calificacion == 4 ? 'Excelente' : calificacion == 3 ? 'Notable' : calificacion == 2 ? 'Suficiente' : 'Insuficiente'})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1">
                            Observaciones / Retroalimentación <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            placeholder="Escribe comentarios para el alumno sobre su evidencia…"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B2B54] resize-none"
                        />
                    </div>

                    {/* Botón confirmar */}
                    <button
                        onClick={handleEvaluar}
                        disabled={enviando || !resultado}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                            resultado === 'rechazada'
                                ? 'bg-red-600 hover:bg-red-700'
                                : resultado === 'aprobada'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-gray-400'
                        }`}
                    >
                        {enviando ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : resultado === 'aprobada' ? (
                            <CheckCircle2 size={16} />
                        ) : resultado === 'rechazada' ? (
                            <XCircle size={16} />
                        ) : (
                            <FileText size={16} />
                        )}
                        {enviando
                            ? 'Registrando…'
                            : resultado === 'aprobada'
                                ? 'Confirmar Aprobación'
                                : resultado === 'rechazada'
                                    ? 'Confirmar Rechazo y Solicitar Reenvío'
                                    : 'Selecciona un resultado'}
                    </button>
                </div>
            </div>
        </div>
    );
}
