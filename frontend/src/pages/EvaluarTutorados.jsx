import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import {
    Users, Star, CheckCircle2, XCircle, AlertCircle,
    ChevronRight, ArrowLeft, RefreshCw, BookOpen,
    TrendingUp, Award, FileWarning, ClipboardList
} from 'lucide-react';

// ── Utilidades ─────────────────────────────────────────────────
function fmtPct(p) { return `${p}%`; }

function colorPct(p) {
    if (p >= 80) return 'text-green-600';
    if (p >= 60) return 'text-amber-600';
    return 'text-red-600';
}

function bgBarPct(p) {
    if (p >= 80) return 'bg-green-500';
    if (p >= 60) return 'bg-amber-500';
    return 'bg-red-500';
}

// ── Mini barra de progreso ──────────────────────────────────────
function BarraPorcentaje({ valor, label, colorClass, bgClass }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">{label}</span>
                <span className={`text-xs font-bold ${colorClass}`}>{fmtPct(valor)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${bgClass}`}
                    style={{ width: `${valor}%` }}
                />
            </div>
        </div>
    );
}

// ── Tarjeta de tutorado en lista ───────────────────────────────
function TutoradoCard({ tutorado, planesActivos, onClick }) {
    const tieneEval = tutorado.evaluaciones_por_plan.some(e => e.evaluacion !== null);
    const evPendientes = tutorado.evidencias_pendientes > 0;

    return (
        <div
            onClick={() => onClick(tutorado)}
            className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-[#0B2B54]/30 hover:shadow-md transition-all cursor-pointer group bg-white"
        >
            <div className="flex items-center gap-4 min-w-0">
                {/* Avatar inicial */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0B2B54] to-[#1a4a7a] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                    {tutorado.nombre_completo.charAt(0)}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{tutorado.nombre_completo}</p>
                    <p className="text-xs text-gray-400">{tutorado.correo}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* % Asistencia */}
                        <span className={`text-xs font-semibold ${colorPct(tutorado.porcentaje_asistencia)}`}>
                            📊 {fmtPct(tutorado.porcentaje_asistencia)} asistencia
                        </span>
                        {/* Evidencias pendientes */}
                        {evPendientes && (
                            <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <FileWarning size={10} /> {tutorado.evidencias_pendientes} ev. pendiente{tutorado.evidencias_pendientes > 1 ? 's' : ''}
                            </span>
                        )}
                        {/* Ya evaluado */}
                        {tieneEval && (
                            <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <CheckCircle2 size={10} /> Evaluado
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-[#0B2B54] transition-colors flex-shrink-0 ml-3" />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  Componente principal – CU08
// ══════════════════════════════════════════════════════════════
export default function EvaluarTutorados() {
    const { user } = useAuth();

    const [vista, setVista]           = useState('lista');
    const [tutorados, setTutorados]   = useState([]);
    const [planesActivos, setPlanes]  = useState([]);
    const [cargando, setCargando]     = useState(false);
    const [seleccionado, setSelec]    = useState(null);

    // Formulario
    const [planSelec,  setPlan]      = useState('');
    const [calInput,   setCal]       = useState('');
    const [obs,        setObs]       = useState('');
    const [enviando,   setEnviando]  = useState(false);

    // ── Carga ─────────────────────────────────────────────────
    const cargar = useCallback(async () => {
        if (!user) return;
        setCargando(true);
        try {
            const res = await api.get('/evaluaciones/mis-tutorados');
            setTutorados(res.data.data.tutorados || []);
            setPlanes(res.data.data.planes_activos || []);
        } catch (err) {
            console.error('Error cargando tutorados:', err);
        } finally {
            setCargando(false);
        }
    }, [user]);

    useEffect(() => { cargar(); }, [cargar]);

    // ── Abrir formulario de evaluación ─────────────────────────
    const abrirEvaluar = (tutorado) => {
        setSelec(tutorado);
        // Pre-cargar plan y calificación si ya fue evaluado en algún plan
        const primeraPlan = planesActivos[0];
        if (primeraPlan) {
            const evExistente = tutorado.evaluaciones_por_plan.find(e => e.plan_id === primeraPlan.id);
            setPlan(primeraPlan.id);
            setCal(evExistente?.evaluacion?.calificacion_final?.toString() || '');
            setObs(evExistente?.evaluacion?.observaciones || '');
        } else {
            setPlan('');
            setCal('');
            setObs('');
        }
        setVista('evaluar');
    };

    const cerrar = () => {
        setVista('lista');
        setSelec(null);
        setPlan('');
        setCal('');
        setObs('');
    };

    // Al cambiar plan, cargar evaluación previa si existe
    const handleCambioPlan = (planId) => {
        setPlan(planId);
        if (seleccionado) {
            const ev = seleccionado.evaluaciones_por_plan.find(e => e.plan_id === planId);
            setCal(ev?.evaluacion?.calificacion_final?.toString() || '');
            setObs(ev?.evaluacion?.observaciones || '');
        }
    };

    // ── Guardar evaluación ─────────────────────────────────────
    const handleGuardar = async () => {
        const cal = parseFloat(calInput);
        if (!planSelec) {
            Swal.fire({ icon: 'warning', title: 'Plan requerido', text: 'Selecciona el Plan de Tutoría al que corresponde esta evaluación.', confirmButtonColor: '#0B2B54' });
            return;
        }
        if (calInput === '' || isNaN(cal) || cal < 0 || cal > 4) {
            Swal.fire({ icon: 'warning', title: 'Calificación inválida', text: 'La calificación debe ser un número entre 0 y 4.', confirmButtonColor: '#0B2B54' });
            return;
        }

        const acreditado = cal >= 2;
        const planNombre = planesActivos.find(p => p.id === planSelec)?.nombre || '';

        const confirm = await Swal.fire({
            title: 'Confirmar Evaluación',
            html: `
                <div class="text-sm text-left space-y-2 text-gray-600">
                    <p><strong>Tutorado:</strong> ${seleccionado.nombre_completo}</p>
                    <p><strong>Plan:</strong> ${planNombre}</p>
                    <p><strong>Calificación:</strong> <span class="text-lg font-bold ${acreditado ? 'text-green-600' : 'text-red-600'}">${cal} / 4</span></p>
                    <div class="${acreditado ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} border rounded-lg px-3 py-2 mt-2">
                        ${acreditado ? '✅ El tutorado <strong>acreditará</strong> el programa de tutorías.' : '❌ El tutorado <strong>no acreditará</strong> el programa de tutorías.'}
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: acreditado ? '#16a34a' : '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Guardar Evaluación',
            cancelButtonText: 'Cancelar',
        });

        if (!confirm.isConfirmed) return;

        setEnviando(true);
        try {
            const res = await api.post(`/evaluaciones/tutorados/${seleccionado._id}`, {
                calificacion_final: cal,
                observaciones: obs || undefined,
                plan_id: planSelec,
            });

            await Swal.fire({
                title: '✅ Evaluación Registrada',
                html: `
                    <div class="text-sm text-gray-600">
                        <p>${res.data.message}</p>
                    </div>
                `,
                icon: 'success',
                timer: 2500,
                showConfirmButton: false,
            });

            cerrar();
            cargar();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'No se pudo guardar la evaluación.',
                confirmButtonColor: '#0B2B54',
            });
        } finally {
            setEnviando(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    //  RENDER – VISTA LISTA
    // ─────────────────────────────────────────────────────────────
    if (vista === 'lista') {
        const totalEvaluados = tutorados.filter(t => t.evaluaciones_por_plan.some(e => e.evaluacion)).length;
        const totalSinEval   = tutorados.length - totalEvaluados;
        const promedioAsist  = tutorados.length > 0
            ? Math.round(tutorados.reduce((s, t) => s + t.porcentaje_asistencia, 0) / tutorados.length)
            : 0;

        return (
            <div className="max-w-4xl mx-auto pb-10 space-y-6">

                {/* Header */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#0B2B54]">CU08: Evaluar Tutorados</h3>
                            <p className="text-sm text-gray-500 mt-1">Registra la evaluación final del ciclo para cada alumno de tu grupo</p>
                        </div>
                        <button onClick={cargar}
                            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 px-3 rounded-lg transition-colors">
                            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                    </div>

                    {/* Estadísticas del grupo */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#0B2B54]/5 border border-[#0B2B54]/10 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-[#0B2B54]">{tutorados.length}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Total tutorados</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-amber-700">{totalSinEval}</p>
                            <p className="text-xs text-amber-600 mt-0.5">Sin evaluar</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-green-700">{fmtPct(promedioAsist)}</p>
                            <p className="text-xs text-green-600 mt-0.5">Asist. promedio</p>
                        </div>
                    </div>
                </div>

                {/* Lista de tutorados */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    {cargando ? (
                        <div className="text-center py-10">
                            <RefreshCw className="mx-auto text-gray-300 animate-spin mb-3" size={36} />
                            <p className="text-gray-400 text-sm">Cargando tutorados…</p>
                        </div>
                    ) : tutorados.length === 0 ? (
                        <div className="text-center py-10">
                            <Users className="mx-auto text-gray-200 mb-3" size={48} />
                            <p className="text-gray-500 font-medium">No tienes tutorados asignados</p>
                            <p className="text-gray-400 text-xs mt-1">El coordinador debe asignarte alumnos primero.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tutorados.map(t => (
                                <TutoradoCard
                                    key={t._id}
                                    tutorado={t}
                                    planesActivos={planesActivos}
                                    onClick={abrirEvaluar}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    //  RENDER – VISTA EVALUAR (formato de evaluación)
    // ─────────────────────────────────────────────────────────────
    const calNum = parseFloat(calInput) || 0;
    const acreditado = calInput !== '' && calNum >= 2;
    const noAcreditado = calInput !== '' && calNum < 2;
    const planActual = planesActivos.find(p => p.id === planSelec);
    const evalExistente = seleccionado?.evaluaciones_por_plan.find(e => e.plan_id === planSelec)?.evaluacion;

    return (
        <div className="max-w-2xl mx-auto pb-10 space-y-5">

            {/* Barra superior */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <button onClick={cerrar}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0B2B54] font-medium transition-colors">
                    <ArrowLeft size={16} /> Volver a la lista
                </button>
                {evalExistente && (
                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full font-medium">
                        Actualizando evaluación existente
                    </span>
                )}
            </div>

            {/* Perfil del tutorado */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0B2B54] to-[#1a4a7a] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                        {seleccionado?.nombre_completo.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-base">{seleccionado?.nombre_completo}</h4>
                        <p className="text-sm text-gray-500">{seleccionado?.correo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Ctrl: {seleccionado?.num_control_tutorado || '—'}</p>
                    </div>
                </div>

                {/* Métricas del alumno */}
                <div className="space-y-3">
                    <BarraPorcentaje
                        valor={seleccionado?.porcentaje_asistencia || 0}
                        label="Porcentaje de Asistencia"
                        colorClass={colorPct(seleccionado?.porcentaje_asistencia || 0)}
                        bgClass={bgBarPct(seleccionado?.porcentaje_asistencia || 0)}
                    />
                </div>

                {/* A2 – Evidencias pendientes: BLOQUEA la evaluación final */}
                {seleccionado?.evidencias_pendientes > 0 && (
                    <div className="mt-4 bg-red-50 border-2 border-red-300 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <XCircle size={18} className="text-red-500 flex-shrink-0" />
                            <p className="text-sm font-bold text-red-700">Evaluación bloqueada — Evidencias pendientes</p>
                        </div>
                        <p className="text-xs text-red-600">
                            Este tutorado tiene <strong>{seleccionado.evidencias_pendientes} evidencia{seleccionado.evidencias_pendientes > 1 ? 's' : ''} sin evaluar</strong>.
                            El sistema requiere que el <strong>100% de las evidencias estén evaluadas</strong> antes de registrar la calificación final.
                        </p>
                        <p className="text-xs text-red-500 mt-1.5">Ve a <strong>Evaluar Evidencias (CU06)</strong> y evalúa todas las evidencias de este alumno primero.</p>
                    </div>
                )}
            </div>

            {/* Evaluación previa (si existe) */}
            {evalExistente && (
                <div className={`p-4 rounded-xl border-2 ${evalExistente.acreditado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-sm font-bold mb-1 ${evalExistente.acreditado ? 'text-green-700' : 'text-red-700'}`}>
                        {evalExistente.acreditado ? '✅ Evaluación anterior: Acreditado' : '❌ Evaluación anterior: No acreditado'}
                    </p>
                    <p className="text-sm flex items-center gap-1 text-gray-700">
                        <Star size={13} className="text-amber-500" />
                        Calificación: <strong>{evalExistente.calificacion_final} / 4</strong>
                    </p>
                    {evalExistente.observaciones && (
                        <p className="text-xs text-gray-500 mt-1">Obs: {evalExistente.observaciones}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Puedes modificar esta evaluación.</p>
                </div>
            )}

            {/* Formulario de evaluación */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ClipboardList size={14} />
                    Formato de Evaluación Final
                </h4>

                <div className="space-y-5">
                    {/* Plan de Tutoría */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                            Plan de Tutoría <span className="text-red-500">*</span>
                        </label>
                        {planesActivos.length === 0 ? (
                            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                                <AlertCircle size={15} />
                                No hay planes de tutoría activos en este momento.
                            </div>
                        ) : (
                            <select
                                value={planSelec}
                                onChange={e => handleCambioPlan(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B2B54] bg-white"
                            >
                                <option value="" disabled>Selecciona el plan...</option>
                                {planesActivos.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre} ({p.semestre})</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Calificación con visualización dinámica */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                            Calificación Final <span className="text-red-500">*</span>
                            <span className="text-gray-400 font-normal ml-1">(0 – 4)</span>
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="0"
                                max="4"
                                step="1"
                                value={calInput}
                                onChange={e => setCal(e.target.value)}
                                placeholder="Ej. 3"
                                className={`w-36 border rounded-lg p-2.5 text-sm outline-none focus:ring-2 text-center text-lg font-bold transition-colors ${
                                    acreditado
                                        ? 'border-green-400 bg-green-50 text-green-700 focus:ring-green-400'
                                        : noAcreditado
                                            ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                                            : 'border-gray-300 focus:ring-[#0B2B54]'
                                }`}
                            />
                            {calInput !== '' && (
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                                    acreditado
                                        ? 'bg-green-50 border-green-300 text-green-700'
                                        : 'bg-red-50 border-red-300 text-red-700'
                                }`}>
                                    {acreditado
                                        ? <><CheckCircle2 size={18} /> Acredita el programa</>
                                        : <><XCircle size={18} /> No acredita</>}
                                </div>
                            )}
                        </div>
                        {calInput !== '' && (
                            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${bgBarPct(calNum)}`}
                                    style={{ width: `${(calNum / 4) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                            Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={obs}
                            onChange={e => setObs(e.target.value)}
                            placeholder="Comentarios sobre el desempeño del tutorado durante el ciclo…"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B2B54] resize-none"
                        />
                    </div>

                    {/* Botón guardar — deshabilitado si hay evidencias pendientes (A2) */}
                    <button
                        onClick={handleGuardar}
                        disabled={enviando || !planSelec || calInput === '' || seleccionado?.evidencias_pendientes > 0}
                        title={seleccionado?.evidencias_pendientes > 0 ? 'Debes evaluar todas las evidencias primero' : ''}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                            acreditado
                                ? 'bg-green-600 hover:bg-green-700'
                                : noAcreditado
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-[#0B2B54] hover:bg-[#0f3d75]'
                        }`}
                    >
                        {enviando
                            ? <><RefreshCw size={16} className="animate-spin" /> Guardando…</>
                            : evalExistente
                                ? <><Award size={16} /> Actualizar Evaluación</>
                                : <><Award size={16} /> Confirmar y Guardar Evaluación</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
