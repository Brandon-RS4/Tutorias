import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import {
    Upload, BookOpen, CheckCircle2, Clock, AlertCircle,
    FileText, XCircle, RefreshCw, ChevronRight, ArrowLeft,
    Paperclip, X, Calendar, Star, RotateCcw
} from 'lucide-react';

// ── Constantes ─────────────────────────────────────────────────
const FORMATOS_PERMITIDOS = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'pptx'];
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const MIME_MAP = {
    pdf:  'application/pdf',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const ESTADO_CONFIG = {
    entregado:         { label: 'Entregada',      cls: 'bg-amber-100 text-amber-700 border-amber-200',    icon: Clock },
    evaluado:          { label: 'Aprobada',        cls: 'bg-green-100 text-green-700 border-green-200',    icon: CheckCircle2 },
    rechazado:         { label: 'Rechazada',       cls: 'bg-red-100 text-red-700 border-red-200',          icon: XCircle },
    pendiente_reenvio: { label: 'Reenvío Req.',    cls: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle },
};

const EXT_ICON = { pdf: '📄', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', docx: '📝', pptx: '📊' };

function getExt(nombre = '') { return nombre.split('.').pop()?.toLowerCase() || ''; }
function getIcon(nombre)     { return EXT_ICON[getExt(nombre)] || '📎'; }
function fmtBytes(b)         { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`; }
function fmtFecha(iso)       {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function EstadoBadge({ estado }) {
    const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.entregado;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
            <Icon size={11} />{cfg.label}
        </span>
    );
}

// ── Zona de drop de archivo ────────────────────────────────────
function DropZone({ archivo, onArchivo, onQuitar, error }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const validarYSetear = (file) => {
        if (!file) return;
        const ext = getExt(file.name);
        if (!FORMATOS_PERMITIDOS.includes(ext)) {
            Swal.fire({ icon: 'warning', title: 'Formato no permitido', text: `Solo se aceptan: ${FORMATOS_PERMITIDOS.join(', ').toUpperCase()}`, confirmButtonColor: '#0B2B54' });
            return;
        }
        if (file.size > MAX_BYTES) {
            Swal.fire({ icon: 'warning', title: 'Archivo demasiado grande', text: `El archivo no puede superar ${MAX_MB} MB. Tu archivo pesa ${fmtBytes(file.size)}.`, confirmButtonColor: '#0B2B54' });
            return;
        }
        onArchivo(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        validarYSetear(e.dataTransfer.files[0]);
    };

    return (
        <div>
            {!archivo ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none
                        ${dragging
                            ? 'border-[#0B2B54] bg-blue-50 scale-[1.01]'
                            : error
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 hover:border-[#0B2B54] hover:bg-blue-50/30'}`}
                >
                    <Upload className={`mx-auto mb-3 ${error ? 'text-red-400' : 'text-gray-300'}`} size={40} />
                    <p className="text-sm font-semibold text-gray-700">
                        {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo o haz clic para seleccionar'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Formatos: {FORMATOS_PERMITIDOS.map(f => f.toUpperCase()).join(' · ')} · Máximo {MAX_MB} MB
                    </p>
                    {error && <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>}
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        accept={FORMATOS_PERMITIDOS.map(f => `.${f}`).join(',')}
                        onChange={e => validarYSetear(e.target.files[0])}
                    />
                </div>
            ) : (
                <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <span className="text-3xl">{getIcon(archivo.name)}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{archivo.name}</p>
                        <p className="text-xs text-gray-400">{fmtBytes(archivo.size)} · {getExt(archivo.name).toUpperCase()}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onQuitar}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                        title="Quitar archivo"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  Componente principal
// ══════════════════════════════════════════════════════════════
export default function SubirEvidencias() {
    const { user } = useAuth();

    const [tab, setTab]                   = useState('actividades'); // 'actividades' | 'mis-entregas'
    const [actividades, setActividades]   = useState([]);
    const [misEvidencias, setMisEvidencias] = useState([]);
    const [cargando, setCargando]         = useState(false);

    // Flujo de entrega
    const [actSeleccionada, setActSeleccionada] = useState(null); // actividad elegida
    const [archivo, setArchivo]                 = useState(null);
    const [archivoError, setArchivoError]       = useState('');
    const [enviando, setEnviando]               = useState(false);

    // ── Carga inicial ──────────────────────────────────────────
    const cargarActividades = useCallback(async () => {
        setCargando(true);
        try {
            const res = await api.get('/evidencias/mis-actividades');
            setActividades(res.data.data.actividades || []);
        } catch (err) {
            console.error('Error cargando actividades:', err);
        } finally {
            setCargando(false);
        }
    }, []);

    const cargarMisEvidencias = useCallback(async () => {
        setCargando(true);
        try {
            const res = await api.get('/evidencias/mis-evidencias');
            setMisEvidencias(res.data.data.evidencias || []);
        } catch (err) {
            console.error('Error cargando mis evidencias:', err);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            cargarActividades();
            cargarMisEvidencias();
        }
    }, [user]);

    // ── Abrir formulario de entrega ────────────────────────────
    const abrirEntrega = (actividad) => {
        setActSeleccionada(actividad);
        setArchivo(null);
        setArchivoError('');
    };

    const cerrarEntrega = () => {
        setActSeleccionada(null);
        setArchivo(null);
        setArchivoError('');
    };

    // ── Confirmar y subir evidencia ────────────────────────────
    const handleSubir = async () => {
        if (!archivo) {
            setArchivoError('Debes seleccionar un archivo antes de confirmar.');
            return;
        }

        const confirmado = await Swal.fire({
            title: '¿Confirmar envío?',
            html: `
                <div class="text-sm text-left space-y-1 text-gray-600">
                    <p><strong>Actividad:</strong> ${actSeleccionada.nombre}</p>
                    <p><strong>Archivo:</strong> ${archivo.name}</p>
                    <p><strong>Tamaño:</strong> ${fmtBytes(archivo.size)}</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0B2B54',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, subir evidencia',
            cancelButtonText: 'Cancelar',
        });

        if (!confirmado.isConfirmed) return;

        setEnviando(true);
        try {
            const formData = new FormData();
            formData.append('archivo', archivo);
            formData.append('actividad_id', actSeleccionada.id);

            const res = await api.post('/evidencias/subir', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const acuse = res.data.data?.acuse;

            // Paso 10: Acuse de recibo
            await Swal.fire({
                title: '✅ Evidencia Enviada',
                html: `
                    <div class="text-sm text-left space-y-2 text-gray-600">
                        <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p class="font-semibold text-green-700 mb-1">Acuse de Recibo</p>
                            <p><strong>Actividad:</strong> ${acuse?.actividad || actSeleccionada.nombre}</p>
                            <p><strong>Archivo:</strong> ${acuse?.archivo || archivo.name}</p>
                            <p><strong>Tamaño:</strong> ${acuse?.tamanio_kb ? acuse.tamanio_kb + ' KB' : fmtBytes(archivo.size)}</p>
                            <p><strong>Fecha:</strong> ${new Date(acuse?.fecha_carga || Date.now()).toLocaleString('es-MX')}</p>
                            <p><strong>Estado:</strong> <span class="text-amber-600 font-semibold">Entregado</span></p>
                        </div>
                        <p class="text-xs text-gray-400">Tu tutor revisará la evidencia próximamente.</p>
                    </div>
                `,
                icon: 'success',
                confirmButtonColor: '#0B2B54',
                confirmButtonText: 'Entendido',
            });

            cerrarEntrega();
            cargarActividades();
            cargarMisEvidencias();
            setTab('mis-entregas');
        } catch (err) {
            const status = err.response?.status;
            const msg    = err.response?.data?.message || 'No se pudo subir el archivo.';
            // A1 – Formato, A2 – Tamaño, A3 – PAT inactivo
            Swal.fire({ icon: 'error', title: 'Error al subir', text: msg, confirmButtonColor: '#0B2B54' });
        } finally {
            setEnviando(false);
        }
    };

    // ── Estado de una actividad para mostrar chip ──────────────
    const getEstadoActividad = (actividad) => {
        if (!actividad.evidencia_entregada) return null;
        return actividad.evidencia_entregada.estado;
    };

    // ─────────────────────────────────────────────────────────────
    //  Si hay actividad seleccionada → mostrar formulario de entrega
    // ─────────────────────────────────────────────────────────────
    if (actSeleccionada) {
        const estadoPrevio = actSeleccionada.evidencia_entregada;
        const esReenvio    = estadoPrevio?.estado === 'pendiente_reenvio';

        return (
            <div className="max-w-2xl mx-auto pb-10 space-y-5">
                {/* Barra superior */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <button onClick={cerrarEntrega}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0B2B54] font-medium transition-colors">
                        <ArrowLeft size={16} /> Volver a actividades
                    </button>
                    {esReenvio && (
                        <span className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full font-semibold">
                            <RotateCcw size={11} /> Reenvío requerido
                        </span>
                    )}
                </div>

                {/* Datos de la actividad */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Actividad seleccionada</p>
                    <h4 className="text-lg font-bold text-[#0B2B54]">{actSeleccionada.nombre}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                        <Calendar size={12} className="inline mr-1" />
                        Fecha: {fmtFecha(actSeleccionada.fecha_realizacion)}
                        {actSeleccionada.planes_tutoria && (
                            <span className="ml-2">· PAT: {actSeleccionada.planes_tutoria.nombre}</span>
                        )}
                    </p>
                    {actSeleccionada.instrucciones && (
                        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-700 mb-0.5">Instrucciones</p>
                            <p className="text-sm text-blue-600">{actSeleccionada.instrucciones}</p>
                        </div>
                    )}
                </div>

                {/* Alerta si ya fue rechazada */}
                {esReenvio && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-orange-700">Tu tutor solicitó un reenvío</p>
                            <p className="text-xs text-orange-600 mt-0.5">La evidencia anterior fue rechazada. Sube una nueva versión corregida.</p>
                        </div>
                    </div>
                )}

                {/* Subir archivo */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                        <Paperclip size={14} className="inline mr-1.5" />
                        Adjuntar Archivo
                    </h4>
                    <DropZone
                        archivo={archivo}
                        onArchivo={(f) => { setArchivo(f); setArchivoError(''); }}
                        onQuitar={() => setArchivo(null)}
                        error={archivoError}
                    />
                </div>

                {/* Botón de confirmar */}
                <button
                    onClick={handleSubir}
                    disabled={enviando}
                    className="w-full flex items-center justify-center gap-2 bg-[#0B2B54] text-white py-3.5 rounded-xl hover:bg-[#0f3d75] transition-colors font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {enviando
                        ? <><RefreshCw size={16} className="animate-spin" /> Subiendo evidencia…</>
                        : <><Upload size={16} /> Confirmar y Subir Evidencia</>}
                </button>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    //  Vista principal: Tabs
    // ─────────────────────────────────────────────────────────────
    const pendientesReenvio = actividades.filter(a => a.evidencia_entregada?.estado === 'pendiente_reenvio').length;
    const sinEntregar = actividades.filter(a => !a.evidencia_entregada).length;

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-6">

            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-[#0B2B54]">CU07: Portal de Evidencias</h3>
                <p className="text-sm text-gray-500 mt-1">Entrega tus evidencias de actividades de tutoría</p>

                {/* Resumen */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-red-700">{sinEntregar}</p>
                        <p className="text-xs text-red-500 mt-0.5">Por entregar</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-amber-700">{pendientesReenvio}</p>
                        <p className="text-xs text-amber-500 mt-0.5">Reenvío requerido</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-green-700">
                            {actividades.filter(a => a.evidencia_entregada?.estado === 'evaluado').length}
                        </p>
                        <p className="text-xs text-green-500 mt-0.5">Aprobadas</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setTab('actividades')}
                        className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                            tab === 'actividades'
                                ? 'text-[#0B2B54] border-b-2 border-[#0B2B54] bg-blue-50/50'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <BookOpen size={14} className="inline mr-1.5" />
                        Actividades Disponibles
                        {sinEntregar > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                {sinEntregar}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab('mis-entregas')}
                        className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                            tab === 'mis-entregas'
                                ? 'text-[#0B2B54] border-b-2 border-[#0B2B54] bg-blue-50/50'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <FileText size={14} className="inline mr-1.5" />
                        Mis Entregas
                    </button>
                </div>

                <div className="p-6">
                    {cargando ? (
                        <div className="text-center py-12">
                            <RefreshCw className="mx-auto text-gray-300 animate-spin mb-3" size={36} />
                            <p className="text-gray-400 text-sm">Cargando…</p>
                        </div>
                    ) : tab === 'actividades' ? (
                        // ── TAB: Actividades disponibles ──────────────────
                        actividades.length === 0 ? (
                            <div className="text-center py-12">
                                <BookOpen className="mx-auto text-gray-200 mb-3" size={48} />
                                <p className="text-gray-500 font-medium">No hay actividades disponibles</p>
                                <p className="text-gray-400 text-xs mt-1">Tu tutor aún no ha registrado actividades en el PAT activo.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {actividades.map(act => {
                                    const estadoEv    = getEstadoActividad(act);
                                    const necesitaAcc = !estadoEv || estadoEv === 'pendiente_reenvio';
                                    const cfg         = estadoEv ? ESTADO_CONFIG[estadoEv] : null;

                                    return (
                                        <div key={act.id}
                                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all
                                                ${necesitaAcc
                                                    ? 'border-[#0B2B54]/20 hover:border-[#0B2B54] hover:shadow-md cursor-pointer'
                                                    : 'border-gray-100 bg-gray-50/50 cursor-default'
                                                }
                                                ${estadoEv === 'pendiente_reenvio' ? 'border-orange-200 bg-orange-50' : ''}
                                            `}
                                            onClick={() => necesitaAcc && abrirEntrega(act)}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0
                                                    ${necesitaAcc ? 'bg-[#0B2B54] text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                    #{act.no_actividad}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{act.nombre}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        <Calendar size={10} className="inline mr-1" />
                                                        {fmtFecha(act.fecha_realizacion)}
                                                        {act.planes_tutoria && <span className="ml-1.5">· {act.planes_tutoria.nombre}</span>}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                                {estadoEv ? (
                                                    <EstadoBadge estado={estadoEv} />
                                                ) : (
                                                    <span className="text-xs text-[#0B2B54] font-semibold flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                                                        <Upload size={12} /> Entregar
                                                    </span>
                                                )}
                                                {estadoEv === 'pendiente_reenvio' && (
                                                    <span className="text-xs text-orange-600 font-semibold flex items-center gap-1 bg-orange-100 px-2 py-1.5 rounded-lg border border-orange-200">
                                                        <RotateCcw size={11} /> Reenviar
                                                    </span>
                                                )}
                                                {necesitaAcc && <ChevronRight size={16} className="text-gray-400" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        // ── TAB: Mis Entregas ──────────────────────────────
                        misEvidencias.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="mx-auto text-gray-200 mb-3" size={48} />
                                <p className="text-gray-500 font-medium">Aún no has entregado ninguna evidencia</p>
                                <p className="text-gray-400 text-xs mt-1">Ve a "Actividades Disponibles" para hacer tu primera entrega.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {misEvidencias.map(ev => (
                                    <div key={ev.id}
                                        className="p-4 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <span className="text-2xl flex-shrink-0">{getIcon(ev.archivo_url)}</span>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm">
                                                        {ev.actividades?.nombre || 'Actividad'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {ev.actividades?.planes_tutoria?.nombre} · {ev.actividades?.planes_tutoria?.semestre}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        <Calendar size={10} className="inline mr-1" />
                                                        Entregada el {fmtFecha(ev.fecha_carga)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <EstadoBadge estado={ev.estado} />
                                                {ev.calificacion != null && (
                                                    <p className="text-xs text-amber-600 mt-1 flex items-center justify-end gap-1">
                                                        <Star size={11} fill="currentColor" />{ev.calificacion} / 10
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Retroalimentación del tutor */}
                                        {ev.observaciones_tutor && (
                                            <div className={`mt-3 p-3 rounded-lg text-xs border ${
                                                ev.estado === 'evaluado'
                                                    ? 'bg-green-50 border-green-200 text-green-700'
                                                    : 'bg-orange-50 border-orange-200 text-orange-700'
                                            }`}>
                                                <span className="font-semibold">Retroalimentación del tutor: </span>
                                                {ev.observaciones_tutor}
                                            </div>
                                        )}

                                        {/* Aviso de reenvío */}
                                        {ev.estado === 'pendiente_reenvio' && (
                                            <button
                                                onClick={() => {
                                                    const act = actividades.find(a => a.id === ev.actividad_id);
                                                    if (act) { setTab('actividades'); abrirEntrega(act); }
                                                }}
                                                className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-orange-700 bg-orange-100 hover:bg-orange-200 border border-orange-200 py-2 rounded-lg font-semibold transition-colors"
                                            >
                                                <RotateCcw size={12} /> Ir a reenviar evidencia
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
