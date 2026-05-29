import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { UserPlus, Link2, Users, CheckCircle2, AlertTriangle } from 'lucide-react';

const CARRERAS = [
    'Ing. Sistemas Computacionales',
    'Ing. Electrónica',
    'Ing. Eléctrica',
    'Ing. TICS',
    'Ing. Bioquímica',
    'Ing. Mecánica',
    'Ing. Ambiental',
    'Ing. Energías Renovables',
    'Ing. Gestión Empresarial',
    'Ing. Industrial',
    'Ing. Mecatrónica'
];

const PASOS = [
    { id: 1, label: 'Datos del Alumno', icon: UserPlus },
    { id: 2, label: 'Asignar Tutor', icon: Link2 },
];

export default function AsignarTutorados() {
    const { user } = useAuth();
    const [paso, setPaso] = useState(1);

    // ── Paso 1: Datos del alumno ──────────────────────────────────
    const [alumnoData, setAlumnoData] = useState({
        nombre_completo: '',
        correo: '',
        num_control_tutorado: '',
        direccion: '',
        carrera_interes: '', // referencial, no se guarda en BD pero ayuda al coordinador
    });
    const [alumnoRegistrado, setAlumnoRegistrado] = useState(null); // respuesta del backend

    // ── Paso 2: Asignar tutor ─────────────────────────────────────
    const [tutores, setTutores] = useState([]);
    const [tutorSeleccionado, setTutorSeleccionado] = useState('');
    const [cargandoTutores, setCargandoTutores] = useState(false);

    // ── Vista de resumen ──────────────────────────────────────────
    const [tutorados, setTutorados] = useState([]);

    // ── Cargar tutores disponibles y lista de tutorados ──────────
    const cargarTutores = async () => {
        setCargandoTutores(true);
        try {
            const res = await api.get('/usuarios/tutores');
            setTutores(res.data.data.tutores || []);
        } catch (err) {
            console.error('Error cargando tutores:', err);
        } finally {
            setCargandoTutores(false);
        }
    };

    const cargarTutorados = async () => {
        try {
            const res = await api.get('/usuarios/tutorados');
            setTutorados(res.data.data.tutorados || []);
        } catch (err) {
            console.error('Error cargando tutorados:', err);
        }
    };

    useEffect(() => {
        cargarTutores();
        cargarTutorados();
    }, []);

    // ── Paso 1: Registrar alumno ──────────────────────────────────
    const handleRegistrarAlumno = async (e) => {
        e.preventDefault();

        // Validación local: correo institucional
        if (!alumnoData.correo.endsWith('@culiacan.tecnm.mx')) {
            Swal.fire({
                title: 'Correo inválido',
                text: 'El correo debe ser institucional (@culiacan.tecnm.mx).',
                icon: 'warning',
                confirmButtonColor: '#0B2B54',
            });
            return;
        }

        try {
            const payload = {
                nombre_completo: alumnoData.nombre_completo,
                correo: alumnoData.correo,
                rol: 'tutorado',
                num_control_tutorado: alumnoData.num_control_tutorado,
                direccion: alumnoData.direccion || '',
                departamento_id: user?.departamento_id || null,
                activo: true,
            };

            const res = await api.post('/usuarios', payload);
            const nuevoUsuario = res.data.data.usuario;

            setAlumnoRegistrado(nuevoUsuario);
            setPaso(2);

            Swal.fire({
                title: '¡Alumno Registrado!',
                text: `${nuevoUsuario.nombre_completo} fue registrado. Ahora selecciona su tutor.`,
                icon: 'success',
                confirmButtonColor: '#0B2B54',
                timer: 2500,
                showConfirmButton: false,
            });
        } catch (err) {
            Swal.fire({
                title: 'Error al registrar',
                text: err.response?.data?.message || 'Ocurrió un error al registrar al alumno.',
                icon: 'error',
                confirmButtonColor: '#0B2B54',
            });
        }
    };

    // ── Paso 2: Asignar tutor ─────────────────────────────────────
    const handleAsignarTutor = async (e) => {
        e.preventDefault();

        if (!tutorSeleccionado) {
            Swal.fire({
                title: 'Selecciona un tutor',
                text: 'Debes elegir un tutor disponible para continuar.',
                icon: 'warning',
                confirmButtonColor: '#0B2B54',
            });
            return;
        }

        try {
            await api.post('/tutorias/tutorados/asignar', {
                tutorado_id: alumnoRegistrado.id,
                tutor_id: tutorSeleccionado,
            });

            const tutorNombre = tutores.find(t => t._id === tutorSeleccionado)?.nombre_completo || 'el tutor';

            Swal.fire({
                title: '¡Asignación Exitosa!',
                html: `<b>${alumnoRegistrado.nombre_completo}</b> quedó asignado a <b>${tutorNombre}</b>.`,
                icon: 'success',
                confirmButtonColor: '#0B2B54',
            });

            // Reiniciar para un nuevo registro
            setAlumnoData({ nombre_completo: '', correo: '', num_control_tutorado: '', direccion: '', carrera_interes: '' });
            setAlumnoRegistrado(null);
            setTutorSeleccionado('');
            setPaso(1);
            cargarTutorados();
        } catch (err) {
            Swal.fire({
                title: 'Error al asignar',
                text: err.response?.data?.message || 'No se pudo asignar el tutorado al tutor.',
                icon: 'error',
                confirmButtonColor: '#0B2B54',
            });
        }
    };

    const handleSaltarAsignacion = () => {
        Swal.fire({
            title: '¿Omitir asignación?',
            text: 'El alumno quedará registrado pero sin tutor asignado. Podrás asignarlo después.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0B2B54',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, omitir',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                setAlumnoData({ nombre_completo: '', correo: '', num_control_tutorado: '', direccion: '', carrera_interes: '' });
                setAlumnoRegistrado(null);
                setTutorSeleccionado('');
                setPaso(1);
                cargarTutorados();
            }
        });
    };

    // ── Capacidad de tutores ──────────────────────────────────────
    const getTutorCapacity = (tutor) => {
        const total = tutor.max_tutorados || 30;
        const actual = tutor.totalTutorados || 0;
        const disponibles = total - actual;
        const pct = Math.round((actual / total) * 100);
        return { total, actual, disponibles, pct, lleno: disponibles <= 0 };
    };

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-8">

            {/* ── Stepper ───────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-[#0B2B54] mb-6">Asignar Tutorados a los Tutores</h3>
                <div className="flex items-center gap-4 mb-8">
                    {PASOS.map((p, idx) => {
                        const Icon = p.icon;
                        const activo = paso === p.id;
                        const completado = paso > p.id;
                        return (
                            <div key={p.id} className="flex items-center gap-2 flex-1">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activo ? 'bg-[#0B2B54] text-white shadow-md' :
                                        completado ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-400'
                                    }`}>
                                    {completado ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                                    <span>{p.label}</span>
                                </div>
                                {idx < PASOS.length - 1 && (
                                    <div className={`flex-1 h-0.5 ${completado ? 'bg-green-400' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── PASO 1: Datos del alumno ───────────────────── */}
                {paso === 1 && (
                    <form onSubmit={handleRegistrarAlumno} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <h4 className="text-sm font-bold text-gray-800 border-b pb-2 mb-1">Información del Alumno Tutorado</h4>
                            <p className="text-xs text-gray-500">Captura los datos académicos y generales del alumno.</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Nombre Completo <span className="text-red-500">*</span></label>
                            <input
                                type="text" required
                                placeholder="Ej. Juan Carlos Pérez López"
                                value={alumnoData.nombre_completo}
                                onChange={e => setAlumnoData({ ...alumnoData, nombre_completo: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Correo Institucional <span className="text-red-500">*</span></label>
                            <input
                                type="email" required
                                placeholder="alumno@culiacan.tecnm.mx"
                                value={alumnoData.correo}
                                onChange={e => setAlumnoData({ ...alumnoData, correo: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Número de Control <span className="text-red-500">*</span></label>
                            <input
                                type="text" required
                                placeholder="Ej. 21410001"
                                maxLength={8}
                                pattern="\d{8}"
                                title="Debe contener exactamente 8 números"
                                value={alumnoData.num_control_tutorado}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 8) setAlumnoData({ ...alumnoData, num_control_tutorado: val });
                                }}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Carrera (referencia)</label>
                            <select
                                value={alumnoData.carrera_interes}
                                onChange={e => setAlumnoData({ ...alumnoData, carrera_interes: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            >
                                <option value="">Selecciona la carrera del alumno</option>
                                {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Dirección (opcional)</label>
                            <input
                                type="text"
                                placeholder="Calle, colonia, ciudad..."
                                value={alumnoData.direccion}
                                onChange={e => setAlumnoData({ ...alumnoData, direccion: e.target.value })}
                                className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] text-sm"
                            />
                        </div>

                        <div className="md:col-span-2 pt-2">
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-[#0B2B54] text-white py-3 rounded-lg hover:bg-[#0f3d75] transition-colors font-medium shadow-md"
                            >
                                <UserPlus size={18} />
                                Registrar Alumno y Continuar
                            </button>
                        </div>
                    </form>
                )}

                {/* ── PASO 2: Asignar tutor ──────────────────────── */}
                {paso === 2 && alumnoRegistrado && (
                    <div className="space-y-6">
                        {/* Resumen del alumno registrado */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle2 className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                            <div>
                                <p className="font-semibold text-green-800">{alumnoRegistrado.nombre_completo}</p>
                                <p className="text-sm text-green-700">{alumnoRegistrado.correo}</p>
                                <p className="text-xs text-green-600 mt-1">Alumno registrado. Ahora selecciona su tutor.</p>
                            </div>
                        </div>

                        {/* Lista de tutores disponibles */}
                        {cargandoTutores ? (
                            <p className="text-gray-500 text-sm text-center py-4">Cargando tutores disponibles...</p>
                        ) : tutores.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                                <p className="text-sm text-yellow-800">No hay tutores activos registrados en el sistema. El alumno quedará sin tutor asignado por ahora.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleAsignarTutor} className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-800 border-b pb-2">Seleccionar Tutor para el Alumno</h4>
                                <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
                                    {tutores.map(tutor => {
                                        const cap = getTutorCapacity(tutor);
                                        const seleccionado = tutorSeleccionado === tutor._id;
                                        return (
                                            <button
                                                key={tutor._id}
                                                type="button"
                                                disabled={cap.lleno}
                                                onClick={() => !cap.lleno && setTutorSeleccionado(tutor._id)}
                                                className={`text-left p-4 rounded-lg border-2 transition-all ${cap.lleno ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' :
                                                        seleccionado ? 'border-[#0B2B54] bg-blue-50 shadow-md' :
                                                            'border-gray-200 bg-white hover:border-[#0B2B54] hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-gray-900 text-sm">{tutor.nombre_completo}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">{tutor.carrera || 'Sin carrera registrada'}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-4">
                                                        {cap.lleno ? (
                                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Cupo lleno</span>
                                                        ) : (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{cap.disponibles} lugar{cap.disponibles !== 1 ? 'es' : ''}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Barra de capacidad */}
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                        <span>{cap.actual} tutorado{cap.actual !== 1 ? 's' : ''}</span>
                                                        <span>Máx. {cap.total}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all ${cap.pct >= 90 ? 'bg-red-500' :
                                                                    cap.pct >= 70 ? 'bg-yellow-500' :
                                                                        'bg-green-500'
                                                                }`}
                                                            style={{ width: `${cap.pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleSaltarAsignacion}
                                        className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                    >
                                        Omitir (sin tutor por ahora)
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!tutorSeleccionado}
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#0B2B54] text-white py-2.5 rounded-lg hover:bg-[#0f3d75] transition-colors text-sm font-medium shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        <Link2 size={16} />
                                        Confirmar Asignación
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* ── Resumen de tutorados registrados ─────────────── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#0B2B54] mb-4 flex items-center gap-2">
                    <Users size={20} />
                    Tutorados Registrados en el Sistema
                </h3>

                {tutorados.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6">No hay tutorados registrados aún.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Nombre</th>
                                    <th className="px-4 py-3">Correo</th>
                                    <th className="px-4 py-3">Tutor Asignado</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3 rounded-r-lg">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tutorados.map(t => (
                                    <tr key={t.id} className="bg-white hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{t.nombre_completo}</td>
                                        <td className="px-4 py-3 text-gray-500">{t.correo}</td>
                                        <td className="px-4 py-3">
                                            {t.tutor ? (
                                                <span className="text-green-700 font-medium text-xs">
                                                    ✓ {t.tutor.nombre_completo}
                                                </span>
                                            ) : (
                                                <span className="text-yellow-600 italic text-xs">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {t.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => {
                                                    setAlumnoRegistrado({ id: t.id, nombre_completo: t.nombre_completo, correo: t.correo });
                                                    setTutorSeleccionado('');
                                                    setPaso(2);
                                                }}
                                                className="text-xs text-[#0B2B54] hover:underline font-medium"
                                            >
                                                {t.tutor ? 'Reasignar tutor' : 'Asignar tutor'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
