import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
    Users, Search, Download, Eye,
    CheckCircle2, XCircle, AlertCircle, RefreshCw,
    ArrowLeft, UserCheck
} from 'lucide-react';

export default function ConsultarTutorados() {
    const { user } = useAuth();

    // Vistas: 'tutores' | 'tutorados'
    const [vista, setVista] = useState('tutores');
    
    // Estado tutores
    const [tutores, setTutores] = useState([]);
    const [cargandoTutores, setCargandoTutores] = useState(false);
    const [busquedaTutor, setBusquedaTutor] = useState('');

    // Estado tutorados
    const [tutorSel, setTutorSel] = useState(null);
    const [tutorados, setTutorados] = useState([]);
    const [cargandoTutorados, setCargandoTutorados] = useState(false);
    const [busquedaTutorado, setBusquedaTutorado] = useState('');
    const [generandoPDF, setGenerandoPDF] = useState(false);

    // ── Carga inicial de tutores ────────────────────────────────
    const cargarTutores = useCallback(async () => {
        setCargandoTutores(true);
        try {
            // Obtenemos todos los tutores sin filtro de carrera
            const res = await api.get(`/usuarios/tutores`);
            setTutores(res.data.data.tutores || []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los tutores.' });
        } finally {
            setCargandoTutores(false);
        }
    }, []);

    useEffect(() => { cargarTutores(); }, [cargarTutores]);

    // ── Cargar tutorados de un tutor ────────────────────────────
    const seleccionarTutor = async (tutor) => {
        setTutorSel(tutor);
        setVista('tutorados');
        setCargandoTutorados(true);
        setBusquedaTutorado('');
        try {
            const res = await api.get(`/usuarios/tutores/${tutor._id}/tutorados`);
            setTutorados(res.data.data.tutorados || []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la lista de tutorados.' });
            setVista('tutores');
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
            doc.text(`Lista de Tutorados`, 14, 20);
            
            doc.setFontSize(10);
            doc.text(`Tutor: ${tutorSel.nombre_completo}`, 14, 28);
            doc.text(`Carrera: ${tutorSel.carrera || 'No especificada'}`, 14, 34);
            
            // Filtrados para el reporte
            const alumnosReporte = tutorados.filter(t => 
                t.nombre_completo?.toLowerCase().includes(busquedaTutorado.toLowerCase()) ||
                t.num_control_tutorado?.toLowerCase().includes(busquedaTutorado.toLowerCase())
            );

            doc.text(`Total Alumnos en reporte: ${alumnosReporte.length}`, 14, 40);

            // Tabla
            const tableColumn = ["No. Control", "Nombre del Alumno", "Asistencia", "Evidencias", "Estatus"];
            const tableRows = [];

            alumnosReporte.forEach(alumno => {
                const asistencia = `${alumno.porcentaje_asistencia}%`;
                const evidencias = `${alumno.evidencias?.entregadas || 0}/${alumno.evidencias?.total || 0}`;
                let estatus = 'Sin Evaluar';
                
                if (alumno.evaluacion) {
                    estatus = alumno.evaluacion.acreditado ? `Acred. (${alumno.evaluacion.calificacion})` : `No Acred. (${alumno.evaluacion.calificacion})`;
                }

                tableRows.push([
                    alumno.num_control_tutorado || 'S/N',
                    alumno.nombre_completo,
                    asistencia,
                    evidencias,
                    estatus
                ]);
            });

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 48,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [11, 43, 84] }
            });

            doc.save(`Alumnos_${tutorSel.num_control_tutor || 'Tutor'}.pdf`);
            
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

    // ── Filtrados ──────────────────────────────────────────────
    const tutoresFiltrados = tutores.filter(t => 
        (t.nombre_completo?.toLowerCase().includes(busquedaTutor.toLowerCase())) ||
        (t.num_control_tutor?.toLowerCase().includes(busquedaTutor.toLowerCase())) ||
        (t.carrera?.toLowerCase().includes(busquedaTutor.toLowerCase()))
    );

    const tutoradosFiltrados = tutorados.filter(t => 
        (t.nombre_completo?.toLowerCase().includes(busquedaTutorado.toLowerCase())) ||
        (t.num_control_tutorado?.toLowerCase().includes(busquedaTutorado.toLowerCase()))
    );

    // ─────────────────────────────────────────────────────────────
    // RENDER 1: Catálogo de Tutores
    // ─────────────────────────────────────────────────────────────
    if (vista === 'tutores') {
        return (
            <div className="max-w-6xl mx-auto pb-10 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-[#0B2B54]">Consultar Tutorados por Tutor</h3>
                        <p className="text-sm text-gray-500 mt-1">Selecciona un tutor para ver el avance y seguimiento de sus alumnos.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar tutor, carrera o nómina..."
                                value={busquedaTutor}
                                onChange={(e) => setBusquedaTutor(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            />
                        </div>
                        <button onClick={cargarTutores} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200" title="Recargar">
                            <RefreshCw size={16} className={cargandoTutores ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    {cargandoTutores ? (
                        <div className="text-center py-10"><RefreshCw className="mx-auto animate-spin text-gray-300" size={32} /></div>
                    ) : tutoresFiltrados.length === 0 ? (
                        <div className="text-center py-10">
                            <UserCheck className="mx-auto text-gray-200 mb-3" size={48} />
                            <p className="text-gray-500">No se encontraron tutores.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-100">
                                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider pl-2">Nómina</th>
                                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Tutor</th>
                                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Carrera</th>
                                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Tutorados</th>
                                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right pr-2">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tutoresFiltrados.map(tutor => (
                                        <tr key={tutor._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 pl-2 font-mono text-sm text-gray-600">{tutor.num_control_tutor || 'S/N'}</td>
                                            <td className="py-4">
                                                <p className="font-semibold text-gray-900 text-sm">{tutor.nombre_completo}</p>
                                                <p className="text-xs text-gray-400">{tutor.correo}</p>
                                            </td>
                                            <td className="py-4 text-sm text-gray-600">{tutor.carrera || 'No especificada'}</td>
                                            <td className="py-4 text-center">
                                                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded text-sm">
                                                    {tutor.totalTutorados || 0}
                                                </span>
                                            </td>
                                            <td className="py-4 pr-2 text-right">
                                                <button 
                                                    onClick={() => seleccionarTutor(tutor)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-[#0B2B54] text-gray-700 hover:text-white rounded-lg transition-colors border border-gray-200 text-sm font-medium"
                                                >
                                                    <Users size={14} /> Ver Alumnos
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

    // ─────────────────────────────────────────────────────────────
    // RENDER 2: Lista de Tutorados
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto pb-10 space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <button onClick={() => setVista('tutores')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0B2B54] font-medium transition-colors">
                    <ArrowLeft size={16} /> Volver a lista de tutores
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div>
                        <h4 className="text-xl font-bold text-[#0B2B54]">Alumnos de: {tutorSel?.nombre_completo}</h4>
                        <p className="text-sm text-gray-500 mt-1">Carrera: {tutorSel?.carrera || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar alumno..."
                                value={busquedaTutorado}
                                onChange={(e) => setBusquedaTutorado(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            />
                        </div>
                        <button 
                            onClick={exportarPDF}
                            disabled={generandoPDF || tutoradosFiltrados.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#0B2B54] text-white rounded-lg hover:bg-[#0f3d75] transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
                        >
                            <Download size={16} /> Exportar Reporte
                        </button>
                    </div>
                </div>

                {cargandoTutorados ? (
                    <div className="text-center py-10"><RefreshCw className="mx-auto animate-spin text-gray-300" size={32} /></div>
                ) : tutoradosFiltrados.length === 0 ? (
                    <div className="text-center py-10">
                        <Users className="mx-auto text-gray-200 mb-3" size={48} />
                        <p className="text-gray-500">No hay alumnos que coincidan con la búsqueda.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-100">
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider pl-2">No. Control</th>
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Alumno</th>
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Asistencia</th>
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Evidencias</th>
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Estatus Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tutoradosFiltrados.map(alumno => {
                                    const evaluado = !!alumno.evaluacion;
                                    const acreditado = alumno.evaluacion?.acreditado;
                                    
                                    const asis = alumno.porcentaje_asistencia;
                                    const asisColor = asis >= 80 ? 'text-green-600' : asis >= 60 ? 'text-yellow-600' : 'text-red-600';

                                    return (
                                        <tr key={alumno._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 pl-2 font-mono text-sm text-gray-600">{alumno.num_control_tutorado || 'S/N'}</td>
                                            <td className="py-4">
                                                <p className="font-semibold text-gray-900 text-sm">{alumno.nombre_completo}</p>
                                                <p className="text-xs text-gray-400">{alumno.correo}</p>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className={`font-bold text-sm ${asisColor}`}>{asis}%</span>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className="text-sm text-gray-600 font-medium">
                                                    {alumno.evidencias?.entregadas || 0} <span className="text-gray-400">/ {alumno.evidencias?.total || 0}</span>
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                {!evaluado ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200">
                                                        <AlertCircle size={12} /> Sin evaluar
                                                    </span>
                                                ) : acreditado ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-200">
                                                        <CheckCircle2 size={12} /> Acreditado ({alumno.evaluacion.calificacion})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-200">
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
