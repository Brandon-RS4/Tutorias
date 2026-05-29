import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { Users, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function AsignarTutores() {
    const { user } = useAuth();
    const [planes, setPlanes] = useState([]);
    const [planSeleccionado, setPlanSeleccionado] = useState('');

    const [tutores, setTutores] = useState([]);
    const [grupos, setGrupos] = useState([]);

    const [asignacionData, setAsignacionData] = useState({ tutor_id: '', grupo_id: '' });
    const [grupoData, setGrupoData] = useState({ clave_grupo: '', dia: 'Lunes', hora_inicio: '10:00' });
    const [mostrarNuevoGrupo, setMostrarNuevoGrupo] = useState(false);

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const generarHoras = () => {
        const horas = [];
        for (let i = 7; i <= 19; i++) {
            const hora = i.toString().padStart(2, '0') + ':00';
            horas.push(hora);
        }
        return horas;
    };
    const opcionesHora = generarHoras();

    const obtenerHoraFin = (horaIni) => {
        const hora = parseInt(horaIni.split(':')[0]);
        return (hora + 1).toString().padStart(2, '0') + ':00';
    };

    const cargarDatos = async () => {
        try {
            const resPlanes = await api.get('/tutorias/planes');
            const planesData = resPlanes.data.data.planes;
            setPlanes(planesData);

            if (planesData.length > 0) {
                setPlanSeleccionado(planesData[0].id);
            }

            const resTutores = await api.get('/usuarios/tutores');
            setTutores(resTutores.data.data.tutores);

        } catch (err) {
            console.error('Error al cargar datos:', err);
        }
    };

    const cargarGrupos = async () => {
        if (!planSeleccionado) return;
        try {
            const resGrupos = await api.get(`/tutorias/grupos?plan_tutoria_id=${planSeleccionado}`);
            setGrupos(resGrupos.data.data.grupos);
        } catch (err) {
            console.error('Error al cargar grupos:', err);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        cargarGrupos();
    }, [planSeleccionado]);

    const handleCrearGrupo = async (e) => {
        e.preventDefault();

        const hora_fin = obtenerHoraFin(grupoData.hora_inicio);
        const horarioArmado = `${grupoData.dia} ${grupoData.hora_inicio}-${hora_fin}`;

        try {
            const payload = {
                clave_grupo: grupoData.clave_grupo,
                horario: horarioArmado,
                plan_tutoria_id: planSeleccionado
            };
            const res = await api.post('/tutorias/grupos', payload);

            Swal.fire({
                title: '¡Grupo Creado!',
                text: res.data.message || 'El grupo se creó correctamente.',
                icon: 'success',
                confirmButtonColor: '#0B2B54'
            });

            setMostrarNuevoGrupo(false);
            setGrupoData({ clave_grupo: '', dia: 'Lunes', hora_inicio: '10:00' });
            cargarGrupos();
        } catch (err) {
            Swal.fire({
                title: 'Error',
                text: err.response?.data?.message || 'Ocurrió un error al crear el grupo.',
                icon: 'error',
                confirmButtonColor: '#0B2B54'
            });
        }
    };

    const handleAsignarTutor = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/tutorias/tutores/asignar', asignacionData);

            Swal.fire({
                title: '¡Tutor Asignado!',
                text: res.data.message || 'El tutor se asignó al grupo exitosamente.',
                icon: 'success',
                confirmButtonColor: '#0B2B54'
            });

            setAsignacionData({ tutor_id: '', grupo_id: '' });
            cargarGrupos();
        } catch (err) {
            Swal.fire({
                title: 'Conflicto / Error',
                text: err.response?.data?.message || 'Error al asignar el tutor.',
                icon: 'error',
                confirmButtonColor: '#0B2B54'
            });
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-[#0B2B54]">CU03: Asignar a los Tutores</h3>
                    <button
                        onClick={() => setMostrarNuevoGrupo(!mostrarNuevoGrupo)}
                        className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                        disabled={!planSeleccionado}
                    >
                        <PlusCircle size={16} />
                        {mostrarNuevoGrupo ? 'Ocultar' : 'Crear Grupo Nuevo'}
                    </button>
                </div>

                {/* Filtro Principal */}
                <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Seleccionar Periodo (Plan de Tutoría)</label>
                    <select
                        className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                        value={planSeleccionado}
                        onChange={e => setPlanSeleccionado(e.target.value)}
                    >
                        <option value="" disabled>Selecciona un plan vigente</option>
                        {planes.map(plan => (
                            <option key={plan.id} value={plan.id}>
                                {plan.nombre} ({plan.semestre})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Formulario Oculto: Crear Grupo */}
                {mostrarNuevoGrupo && planSeleccionado && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                        <h4 className="font-bold text-[#0B2B54] mb-4">Crear Espacio / Grupo</h4>
                        <form onSubmit={handleCrearGrupo} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-1">
                                <label className="text-sm font-medium text-gray-700 block mb-1">Clave de Grupo</label>
                                <input
                                    type="text" required
                                    value={grupoData.clave_grupo}
                                    onChange={e => setGrupoData({ ...grupoData, clave_grupo: e.target.value })}
                                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-[#0B2B54] outline-none"
                                    placeholder="Ej. T-101"
                                />
                            </div>
                            <div className="lg:col-span-1">
                                <label className="text-sm font-medium text-gray-700 block mb-1">Día</label>
                                <select
                                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-[#0B2B54] outline-none"
                                    value={grupoData.dia}
                                    onChange={e => setGrupoData({ ...grupoData, dia: e.target.value })}
                                >
                                    {diasSemana.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="lg:col-span-1">
                                <label className="text-sm font-medium text-gray-700 block mb-1">Hora Inicio</label>
                                <select
                                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-[#0B2B54] outline-none"
                                    value={grupoData.hora_inicio}
                                    onChange={e => setGrupoData({ ...grupoData, hora_inicio: e.target.value })}
                                >
                                    {opcionesHora.map(h => <option key={`ini-${h}`} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div className="lg:col-span-1">
                                <label className="text-sm font-medium text-gray-700 block mb-1">Hora Fin (Autocálculo)</label>
                                <input
                                    type="text"
                                    disabled
                                    value={obtenerHoraFin(grupoData.hora_inicio)}
                                    className="w-full border border-gray-200 bg-gray-100 text-gray-500 p-2 rounded-lg cursor-not-allowed"
                                />
                            </div>
                            <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-2">
                                <button type="submit" className="bg-[#0B2B54] text-white py-2 px-6 rounded-lg font-medium hover:bg-[#0f3d75] transition-colors shadow-sm">
                                    Guardar Grupo
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Formulario Principal: CU03 Asignar Tutor */}
                {planSeleccionado && (
                    <form onSubmit={handleAsignarTutor} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 border-t pt-6">

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">1. Seleccionar Docente (Tutor)</label>
                            <select
                                className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                                value={asignacionData.tutor_id}
                                onChange={e => setAsignacionData({ ...asignacionData, tutor_id: e.target.value })}
                                required
                            >
                                <option value="" disabled>Lista de docentes disponibles</option>
                                {tutores.map(tutor => (
                                    <option key={tutor._id} value={tutor._id}>
                                        {tutor.nombre_completo} - {tutor.carrera || 'Sin carrera'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">2. Seleccionar Grupo y Horario Destinado</label>
                            <select
                                className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                                value={asignacionData.grupo_id}
                                onChange={e => setAsignacionData({ ...asignacionData, grupo_id: e.target.value })}
                                required
                            >
                                <option value="" disabled>Grupos / Espacios disponibles</option>
                                {grupos.map(grupo => (
                                    <option key={grupo.id} value={grupo.id} disabled={grupo.tutor}>
                                        {grupo.clave_grupo} - Horario: {grupo.horario} {grupo.tutor ? '(Ya tiene tutor asignado)' : '(Disponible)'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2 pt-4">
                            <button
                                type="submit"
                                disabled={!asignacionData.tutor_id || !asignacionData.grupo_id}
                                className="w-full flex items-center justify-center gap-2 bg-[#0B2B54] text-white py-3 rounded-lg hover:bg-[#0f3d75] transition-colors font-medium shadow-md disabled:bg-gray-400"
                            >
                                <CheckCircle2 size={20} />
                                Confirmar Asignación
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Vista Previa de Asignaciones */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#0B2B54] mb-4 flex items-center gap-2">
                    <Users size={20} />
                    Resumen de Asignaciones en el Plan Seleccionado
                </h3>

                {grupos.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay grupos creados en este plan.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 rounded-l-lg">Clave de Grupo</th>
                                    <th className="px-6 py-3">Horario</th>
                                    <th className="px-6 py-3 rounded-r-lg">Tutor Asignado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grupos.map(grupo => (
                                    <tr key={grupo.id} className="bg-white border-b">
                                        <td className="px-6 py-4 font-medium text-gray-900">{grupo.clave_grupo}</td>
                                        <td className="px-6 py-4">{grupo.horario}</td>
                                        <td className="px-6 py-4">
                                            {grupo.tutor ? (
                                                <span className="text-green-600 font-medium">✓ {grupo.tutor.nombre_completo}</span>
                                            ) : (
                                                <span className="text-yellow-600 italic">Sin asignar</span>
                                            )}
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
