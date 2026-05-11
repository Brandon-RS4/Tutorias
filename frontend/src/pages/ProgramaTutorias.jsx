import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, PlusCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ProgramaTutorias() {
    const { user } = useAuth();
    const [planes, setPlanes] = useState([]);
    const [planSeleccionado, setPlanSeleccionado] = useState('');

    // Estado para el formulario de Actividad
    const [actividadData, setActividadData] = useState({
        no_actividad: 1,
        nombre: '',
        instrucciones: '',
        fecha_realizacion: ''
    });

    // Estado para crear un nuevo Plan (Por si no hay ninguno)
    const [mostrarNuevoPlan, setMostrarNuevoPlan] = useState(false);
    const [planData, setPlanData] = useState({
        nombre: '',
        semestre: '2025-1',
        fecha_ini: '',
        fecha_fin: ''
    });

    const cargarPlanes = async () => {
        try {
            const res = await api.get('/tutorias/planes');
            setPlanes(res.data.data.planes);
            if (res.data.data.planes.length > 0 && !planSeleccionado) {
                setPlanSeleccionado(res.data.data.planes[0]._id);
            }
        } catch (err) {
            console.error('Error al cargar planes:', err);
        }
    };

    useEffect(() => {
        cargarPlanes();
    }, []);

    const handleCrearPlan = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...planData,
                departamento: user?.departamento?._id || user?.departamento
            };
            const res = await api.post('/tutorias/planes', payload);
            
            Swal.fire({
                title: '¡Plan Creado!',
                text: res.data.message || 'El periodo académico se creó correctamente.',
                icon: 'success',
                confirmButtonColor: '#0B2B54'
            });

            setMostrarNuevoPlan(false);
            setPlanData({ nombre: '', semestre: '2025-1', fecha_ini: '', fecha_fin: '' });
            cargarPlanes();
        } catch (err) {
            Swal.fire({
                title: 'Error',
                text: err.response?.data?.message || 'Ocurrió un error al crear el plan.',
                icon: 'error',
                confirmButtonColor: '#0B2B54'
            });
        }
    };

    const handleCrearActividad = async (e) => {
        e.preventDefault();
        if (!planSeleccionado) {
            Swal.fire({
                title: 'Atención',
                text: 'Debes seleccionar un Plan de Tutoría primero.',
                icon: 'warning',
                confirmButtonColor: '#0B2B54'
            });
            return;
        }

        try {
            const res = await api.post(`/tutorias/planes/${planSeleccionado}/actividades`, actividadData);
            
            Swal.fire({
                title: '¡Actividad Registrada!',
                text: res.data.message || 'La actividad se agregó al plan exitosamente.',
                icon: 'success',
                confirmButtonColor: '#0B2B54'
            });

            setActividadData({
                no_actividad: actividadData.no_actividad + 1,
                nombre: '',
                instrucciones: '',
                fecha_realizacion: ''
            });
        } catch (err) {
            Swal.fire({
                title: 'Error',
                text: err.response?.data?.message || 'Error al registrar la actividad.',
                icon: 'error',
                confirmButtonColor: '#0B2B54'
            });
        }
    };

    const planActual = planes.find(p => p._id === planSeleccionado);

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-[#0B2B54]">CU02: Asignar Actividades del Programa</h3>
                    <button 
                        onClick={() => setMostrarNuevoPlan(!mostrarNuevoPlan)}
                        className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                    >
                        <PlusCircle size={16} />
                        {mostrarNuevoPlan ? 'Cancelar Plan' : 'Nuevo Plan de Tutoría'}
                    </button>
                </div>

                {/* Formulario Oculto: Crear Plan */}
                {mostrarNuevoPlan && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                        <h4 className="font-bold text-[#0B2B54] mb-4">Crear un Nuevo Periodo (Plan de Tutoría)</h4>
                        <form onSubmit={handleCrearPlan} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Nombre del Plan</label>
                                <input type="text" required value={planData.nombre} onChange={e => setPlanData({...planData, nombre: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Ej. Plan PAT 2025" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Semestre</label>
                                <input type="text" required value={planData.semestre} onChange={e => setPlanData({...planData, semestre: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Ej. 2025-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Fecha Inicio</label>
                                <input type="date" required value={planData.fecha_ini} onChange={e => setPlanData({...planData, fecha_ini: e.target.value})} className="w-full border p-2 rounded-lg" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Fecha Fin</label>
                                <input type="date" required value={planData.fecha_fin} onChange={e => setPlanData({...planData, fecha_fin: e.target.value})} className="w-full border p-2 rounded-lg" />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button type="submit" className="bg-[#0B2B54] text-white py-2 px-6 rounded-lg font-medium">Guardar Plan</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Formulario Principal: CU02 Asignar Actividades */}
                <form onSubmit={handleCrearActividad} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Seleccionar Periodo (Plan Activo)</label>
                        <select
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            value={planSeleccionado}
                            onChange={e => setPlanSeleccionado(e.target.value)}
                            required
                        >
                            <option value="" disabled>Selecciona un plan vigente</option>
                            {planes.map(plan => (
                                <option key={plan._id} value={plan._id}>
                                    {plan.nombre} ({plan.semestre}) - Estado: {plan.estado}
                                </option>
                            ))}
                        </select>
                        {planActual && (
                            <p className="text-xs text-gray-500 mt-1">
                                <Calendar className="inline mr-1" size={12} />
                                Vigencia: {new Date(planActual.fecha_ini).toLocaleDateString()} al {new Date(planActual.fecha_fin).toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Número de Actividad</label>
                        <input
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            type="number" required min="1"
                            value={actividadData.no_actividad}
                            onChange={e => setActividadData({ ...actividadData, no_actividad: Number(e.target.value) })}
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Nombre de la Actividad</label>
                        <input
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            type="text" required
                            placeholder="Ej. Entrevista Inicial"
                            value={actividadData.nombre}
                            onChange={e => setActividadData({ ...actividadData, nombre: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Descripción / Instrucciones</label>
                        <textarea
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54] min-h-[100px]"
                            required
                            placeholder="Describe qué se debe hacer en esta actividad..."
                            value={actividadData.instrucciones}
                            onChange={e => setActividadData({ ...actividadData, instrucciones: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Fecha de Realización</label>
                        <input
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            type="date" required
                            value={actividadData.fecha_realizacion}
                            onChange={e => setActividadData({ ...actividadData, fecha_realizacion: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-1">La fecha debe estar dentro del periodo académico vigente.</p>
                    </div>

                    <div className="md:col-span-2 pt-4">
                        <button 
                            type="submit" 
                            disabled={!planSeleccionado}
                            className="w-full bg-[#0B2B54] text-white py-3 rounded-lg hover:bg-[#0f3d75] transition-colors font-medium shadow-md disabled:bg-gray-400"
                        >
                            Registrar Actividad
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
