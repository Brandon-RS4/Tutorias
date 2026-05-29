import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
    Users, Search, Download, Eye,
    CheckCircle2, XCircle, AlertCircle, RefreshCw,
    ChevronRight, ArrowLeft, Briefcase
} from 'lucide-react';

const CARRERAS_DISPONIBLES = [
    "Ing. Sistemas Computacionales",
    "Ing. Industrial",
    "Ing. Mecatrónica",
    "Ing. Electrónica",
    "Ing. Eléctrica",
    "Ing. Mecánica",
    "Ing. Energías Renovables",
    "Ing. Gestión Empresarial",
    "Ing. Ambiental",
    "Ing. Bioquímica"
];

export default function ConsultarTutores() {
    const { user } = useAuth();

    // Vistas: 'lista' | 'expediente'
    const [vista, setVista] = useState('lista');
    
    // Estado tutores
    const [tutores, setTutores] = useState([]);
    const [cargandoTutores, setCargandoTutores] = useState(false);
    const [carreraSel, setCarreraSel] = useState('');
    const [busquedaTutor, setBusquedaTutor] = useState('');

    // Estado expediente
    const [tutorSel, setTutorSel] = useState(null);
    const [tutorados, setTutorados] = useState([]);
    const [cargandoTutorados, setCargandoTutorados] = useState(false);
    const [generandoPDF, setGenerandoPDF] = useState(false);

    // ── Carga inicial de tutores ────────────────────────────────
    const cargarTutores = useCallback(async (carrera = '') => {
        setCargandoTutores(true);
        try {
            const endpoint = carrera ? `/usuarios/tutores?carrera=${encodeURIComponent(carrera)}` : `/usuarios/tutores`;
            const res = await api.get(endpoint);
            setTutores(res.data.data.tutores || []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los tutores.' });
        } finally {
            setCargandoTutores(false);
        }
    }, []);

    useEffect(() => { cargarTutores(carreraSel); }, [cargarTutores, carreraSel]);

    // ── Cargar tutorados de un tutor (Expediente) ──────────────
    const verExpediente = async (tutor) => {
        setTutorSel(tutor);
        setVista('expediente');
        setCargandoTutorados(true);
        try {
            const res = await api.get(`/usuarios/tutores/${tutor._id}/tutorados`);
            setTutorados(res.data.data.tutorados || []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el expediente del tutor.' });
            setVista('lista');
        } finally {
            setCargandoTutorados(false);
        }
    };

    // ── Generar PDF ────────────────────────────────────────────
    const exportarPDF = () => {
        setGenerandoPDF(true);
        try {
            const doc = new jsPDF();
            
            // Título
            doc.setFontSize(16);
            doc.text(`Expediente de Tutor: ${tutorSel.nombre_completo}`, 14, 20);
            
            doc.setFontSize(10);
            doc.text(`Carrera: ${tutorSel.carrera || 'No especificada'}`, 14, 28);
            doc.text(`Grupo Asignado: ${tutorSel.grupo?.clave_grupo || 'Sin grupo'}`, 14, 34);
            doc.text(`Total Tutorados: ${tutorados.length}`, 14, 40);

            // Tabla
            const tableColumn = ["No. Control", "Nombre del Alumno", "Asistencia", "Evidencias", "Estatus"];
            const tableRows = [];

            tutorados.forEach(alumno => {
                const asistencia = `${alumno.porcentaje_asistencia}%`;
                const evidencias = `${alumno.evidencias?.entregadas || 0}/${alumno.evidencias?.total || 0}`;
                let estatus = 'Pendiente / Sin Evaluar';
                
                if (alumno.evaluacion) {
                    estatus = alumno.evaluacion.acreditado ? `Acreditado (${alumno.evaluacion.calificacion})` : `No acreditado (${alumno.evaluacion.calificacion})`;
                }

                const rowData = [
                    alumno.num_control_tutorado || 'S/N',
                    alumno.nombre_completo,
                    asistencia,
                    evidencias,
                    estatus
                ];
                tableRows.push(rowData);
            });

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 48,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [11, 43, 84] } // Color #0B2B54
            });

            doc.save(`Expediente_Tutor_${tutorSel.num_control_tutor || 'Reporte'}.pdf`);
            
            Swal.fire({
                title: 'Reporte Exportado',
                text: 'El documento PDF ha sido generado exitosamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un problema al generar el PDF.' });
        } finally {
            setGenerandoPDF(false);
        }
    };

    // ── Filtrado local ─────────────────────────────────────────
    const tutoresFiltrados = tutores.filter(t => 
        (t.nombre_completo?.toLowerCase().includes(busquedaTutor.toLowerCase())) ||
        (t.num_control_tutor?.toLowerCase().includes(busquedaTutor.toLowerCase()))
    );

    // ─────────────────────────────────────────────────────────────
    // RENDER 1: Lista de Tutores
    // ─────────────────────────────────────────────────────────────
    if (vista === 'lista') {
        return (
            <div className="max-w-6xl mx-auto pb-10 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-[#0B2B54]">Consultar Tutores por Carrera</h3>
                        <p className="text-sm text-gray-500 mt-1">Supervisa el desempeño y expediente de los tutores asignados.</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <select
                            value={carreraSel}
                            onChange={(e) => setCarreraSel(e.target.value)}
                            className="w-full md:w-56 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B54]"
                        >
                            <option value="">Todas las carreras</option>
                            {CARRERAS_DISPONIBLES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o nómina..."
                                value={busquedaTutor}
                                onChange={(e) => setBusquedaTutor(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    {cargandoTutores ? (
                        <div className="text-center py-10"><RefreshCw className="mx-auto animate-spin text-gray-300" size={32} /></div>
                    ) : tutoresFiltrados.length === 0 ? (
                        <div className="text-center py-10">
                            <Briefcase className="mx-auto text-gray-200 mb-3" size={48} />
                            <p className="text-gray-500">No se encontraron tutores para los criterios seleccionados.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tutoresFiltrados.map(tutor => (
                                <div key={tutor._id} 
                                    className="border border-gray-200 p-5 rounded-xl hover:border-[#0B2B54] hover:shadow-md transition-all bg-white relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="bg-blue-50 text-[#0B2B54] px-3 py-1 rounded-lg font-bold text-sm border border-blue-100">
                                            Nómina: {tutor.num_control_tutor || 'S/N'}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${tutor.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {tutor.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <div className="space-y-1 mt-3 mb-5">
                                        <h4 className="text-base font-bold text-gray-900 line-clamp-1" title={tutor.nombre_completo}>{tutor.nombre_completo}</h4>
                                        <p className="text-xs text-gray-500 font-mono">{tutor.correo}</p>
                                        <p className="text-xs text-gray-600 mt-2 font-medium bg-gray-50 inline-block px-2 py-1 rounded">{tutor.carrera || 'Carrera no especificada'}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mb-4 border-t border-gray-100 pt-3">
                                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Grupo</p>
                                            <p className="text-sm font-semibold text-[#0B2B54]">{tutor.grupo?.clave_grupo || 'N/A'}</p>
                                        </div>
                                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Alumnos</p>
                                            <p className="text-sm font-semibold text-[#0B2B54]">{tutor.totalTutorados || 0}</p>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => verExpediente(tutor)}
                                        className="w-full flex justify-center items-center gap-2 py-2 bg-gray-50 hover:bg-[#0B2B54] text-gray-700 hover:text-white rounded-lg transition-colors border border-gray-200 hover:border-[#0B2B54] text-sm font-semibold group"
                                    >
                                        <Eye size={16} className="text-gray-400 group-hover:text-white transition-colors" /> Ver Expediente
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // RENDER 2: Expediente del Tutor (Tutorados)
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto pb-10 space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <button onClick={() => setVista('lista')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0B2B54] font-medium transition-colors">
                    <ArrowLeft size={16} /> Volver a Tutores
                </button>
                <button 
                    onClick={exportarPDF}
                    disabled={generandoPDF || tutorados.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#0B2B54] text-white rounded-lg hover:bg-[#0f3d75] transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
                >
                    <Download size={16} /> Exportar Reporte
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="mb-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h4 className="text-2xl font-bold text-[#0B2B54] mb-1">Expediente de: {tutorSel?.nombre_completo}</h4>
                        <div className="flex gap-3 text-sm text-gray-600">
                            <span className="bg-gray-100 px-2 py-1 rounded">Carrera: <strong>{tutorSel?.carrera || 'N/A'}</strong></span>
                            <span className="bg-gray-100 px-2 py-1 rounded">Grupo: <strong>{tutorSel?.grupo?.clave_grupo || 'N/A'}</strong></span>
                        </div>
                    </div>
                </div>

                {cargandoTutorados ? (
                    <div className="text-center py-10"><RefreshCw className="mx-auto animate-spin text-gray-300" size={32} /></div>
                ) : tutorados.length === 0 ? (
                    <div className="text-center py-10">
                        <Users className="mx-auto text-gray-200 mb-3" size={48} />
                        <p className="text-gray-500">Este tutor no tiene alumnos asignados actualmente.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tl-lg">No. Control</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Alumno</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Asistencia</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Evidencias</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tr-lg">Estatus Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tutorados.map(alumno => {
                                    const evaluado = !!alumno.evaluacion;
                                    const acreditado = alumno.evaluacion?.acreditado;
                                    
                                    // Colores para asistencia
                                    const asis = alumno.porcentaje_asistencia;
                                    const asisColor = asis >= 80 ? 'text-green-600' : asis >= 60 ? 'text-yellow-600' : 'text-red-600';

                                    return (
                                        <tr key={alumno._id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="py-3 px-4 font-mono text-sm text-gray-600">{alumno.num_control_tutorado || 'S/N'}</td>
                                            <td className="py-3 px-4">
                                                <p className="font-semibold text-gray-900 text-sm">{alumno.nombre_completo}</p>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`font-bold text-sm ${asisColor}`}>{asis}%</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="text-sm text-gray-600 font-medium">
                                                    {alumno.evidencias?.entregadas || 0} <span className="text-gray-400">/ {alumno.evidencias?.total || 0}</span>
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {!evaluado ? (
                                                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold">
                                                        <AlertCircle size={12} /> Sin evaluar
                                                    </span>
                                                ) : acreditado ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                                                        <CheckCircle2 size={12} /> Acreditado ({alumno.evaluacion.calificacion})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                                                        <XCircle size={12} /> No acreditado ({alumno.evaluacion.calificacion})
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
