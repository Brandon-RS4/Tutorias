import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import {
    FileCheck, Users, Search, Download, Eye,
    CheckCircle2, XCircle, AlertCircle, RefreshCw,
    ChevronRight, ArrowLeft, Layers, ShieldCheck
} from 'lucide-react';

export default function Constancias() {
    const { user } = useAuth();

    // Vistas: 'grupos' | 'tutorados'
    const [vista, setVista] = useState('grupos');
    
    // Estado grupos
    const [grupos, setGrupos] = useState([]);
    const [cargandoGrupos, setCargandoGrupos] = useState(false);
    const [busquedaGrupo, setBusquedaGrupo] = useState('');

    // Estado tutorados
    const [grupoSel, setGrupoSel] = useState(null);
    const [tutorados, setTutorados] = useState([]);
    const [cargandoTutorados, setCargandoTutorados] = useState(false);
    const [busquedaTutorado, setBusquedaTutorado] = useState('');

    const [generando, setGenerando] = useState(false);

    // ── Carga inicial de grupos ────────────────────────────────
    const cargarGrupos = useCallback(async () => {
        setCargandoGrupos(true);
        try {
            const res = await api.get('/acreditacion/grupos');
            setGrupos(res.data.data.grupos || []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los grupos.' });
        } finally {
            setCargandoGrupos(false);
        }
    }, []);

    useEffect(() => { cargarGrupos(); }, [cargarGrupos]);

    // ── Cargar tutorados de un grupo ───────────────────────────
    const seleccionarGrupo = async (grupo) => {
        setGrupoSel(grupo);
        setVista('tutorados');
        setCargandoTutorados(true);
        try {
            const res = await api.get(`/acreditacion/grupos/${grupo.id}/tutorados`);
            setTutorados(res.data.data.tutorados || []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los tutorados.' });
            setVista('grupos');
        } finally {
            setCargandoTutorados(false);
        }
    };

    // ── Generar PDF ────────────────────────────────────────────
    const generarPDF = async (alumno, accion = 'descargar') => {
        setGenerando(true);
        try {
            // 1. Notificar al backend (Guardar registro - Pasos 8-10)
            if (!alumno.constancia_generada) {
                await api.post(`/acreditacion/${alumno.id}/plan/${grupoSel.planes_tutoria.id}`);
                // Actualizar estado local
                setTutorados(prev => prev.map(t => 
                    t.id === alumno.id ? { ...t, constancia_generada: true } : t
                ));
            }

            // 2. Construir PDF con jsPDF
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });

            // Fuentes y configuraciones
            doc.setFont('helvetica');

            // --- Membrete Izquierdo (SEP) ---
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('EDUCACIÓN', 20, 25);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('SECRETARÍA DE EDUCACIÓN PÚBLICA', 20, 30);

            // --- Membrete Centro (TecNM) ---
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('TECNOLÓGICO', 95, 27);
            doc.text('NACIONAL DE MÉXICO', 95, 31);

            // --- Membrete Derecho (Tec Culiacán) ---
            doc.setFontSize(10);
            doc.text('Instituto Tecnológico de Culiacán', 140, 28);

            // --- Línea separadora superior ---
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 35, 195, 35);

            // --- Fecha y Asunto ---
            const fechaActual = new Date().toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: '2-digit'
            });
            const mesCapitalizado = fechaActual.charAt(3).toUpperCase() + fechaActual.slice(4);
            const fechaTexto = `Culiacán, Sinaloa, ${fechaActual.substring(0,2)}/${mesCapitalizado}`;
            
            doc.setFontSize(10);
            doc.text(fechaTexto, 195, 60, { align: 'right' });
            
            doc.text('Asunto: Constancia de acreditación de', 195, 70, { align: 'right' });
            doc.text('Actividad complementaria', 195, 75, { align: 'right' });
            if(alumno.constancia_generada) {
                doc.text('Duplicado', 195, 80, { align: 'right' });
            }

            // --- Destinatario ---
            doc.setFont('helvetica', 'bold');
            doc.text('C. DINORAH MEZA GARCIA', 20, 95);
            doc.text('JEFA DEL DEPTO. DE SERVICIO ESCOLARES', 20, 100);
            doc.text('P R E S E N T E', 20, 105);

            // --- Cuerpo del Documento ---
            doc.setFont('helvetica', 'normal');
            
            // Texto dinámico
            const calificacionNum = parseFloat(alumno.calificacion) || 4;
            const nivelDesempeño = calificacionNum >= 4 ? 'EXCELENTE' : calificacionNum >= 3 ? 'NOTABLE' : calificacionNum >= 2 ? 'SUFICIENTE' : 'INSUFICIENTE';
            const valorNumerico = Math.round(calificacionNum).toString();

            const textoCuerpo = `El que suscribe, por este medio se permite hacer de su conocimiento que el C. ${alumno.nombre?.toUpperCase()} con número de control ${alumno.num_control} de la carrera de ING. SISTEMAS COMPUTACIONALES ha cumplido su actividad complementaria con el nivel de desempeño ${nivelDesempeño} un valor numérico de ${valorNumerico}, durante el periodo escolar ${alumno.semestre_plan?.toUpperCase() || 'AGO-DIC 2023'} con un valor curricular de un crédito.`;

            const splitText = doc.splitTextToSize(textoCuerpo, 175);
            
            // Para pintar las partes en negrita dentro del parrafo es complejo en jsPDF estándar, 
            // así que lo pondremos normal pero estructurado
            doc.text(splitText, 20, 130, { align: 'justify' });

            // --- Firmas ---
            doc.setFont('helvetica', 'bold');
            doc.text('A T E N T A M E N T E', 20, 175);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.text('Excelencia en Educación Tecnológica', 20, 180);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Vo. Bo.', 120, 175);

            // Lineas de firma falsas (opcional, simulamos el garabato con texto o línea)
            doc.setDrawColor(0);
            doc.line(20, 210, 85, 210); // Firma 1
            doc.line(120, 210, 185, 210); // Firma 2

            // Nombres firmas
            doc.text('IVETTE ARMANDINA JOYA HUNTON', 20, 215);
            doc.text('COORDINADORA DEL PROGRAMA', 20, 220);
            doc.text('INSTITUCIONAL DE TUTORIAS', 20, 225);

            doc.text('MARIA HIDAELIA SANCHEZ LOPEZ', 120, 215);
            doc.text('JEFA DEL DEPTO. DE DESARROLLO', 120, 220);
            doc.text('ACADÉMICO', 120, 225);

            // --- Pie de página ---
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('C.c.p. Archivo', 20, 260);

            doc.setTextColor(100);
            doc.text('Juan de Dios Bátiz 310 Pte. Col. Guadalupe C.P.80220 Culiacán, Sinaloa. Tel. 667-454-0100', 20, 270);
            doc.text('y 667-713-3804 | https://www.culiacan.tecnm.mx', 20, 274);

            // Output
            if (accion === 'preview') {
                const blobUrl = doc.output('bloburl');
                window.open(blobUrl, '_blank');
            } else {
                doc.save(`Constancia_Tutorias_${alumno.num_control}.pdf`);
            }

            if(accion !== 'preview') {
                Swal.fire({
                    title: '¡Constancia Generada!',
                    text: 'El documento se ha descargado y el registro se ha guardado.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'No se pudo generar la constancia.'
            });
        } finally {
            setGenerando(false);
        }
    };


    // ── Filtrado ───────────────────────────────────────────────
    const gruposFiltrados = grupos.filter(g => 
        g.clave_grupo.toLowerCase().includes(busquedaGrupo.toLowerCase()) ||
        g.usuarios?.nombre_completo.toLowerCase().includes(busquedaGrupo.toLowerCase())
    );

    const tutoradosFiltrados = tutorados.filter(t => 
        t.num_control?.includes(busquedaTutorado) ||
        t.nombre?.toLowerCase().includes(busquedaTutorado.toLowerCase())
    );

    // ─────────────────────────────────────────────────────────────
    // RENDER 1: Grupos
    // ─────────────────────────────────────────────────────────────
    if (vista === 'grupos') {
        return (
            <div className="max-w-5xl mx-auto pb-10 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-[#0B2B54]">CU10: Constancias de Acreditación</h3>
                        <p className="text-sm text-gray-500 mt-1">Selecciona un grupo para expedir las constancias</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por clave o tutor..."
                                value={busquedaGrupo}
                                onChange={(e) => setBusquedaGrupo(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            />
                        </div>
                        <button onClick={cargarGrupos} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200">
                            <RefreshCw size={16} className={cargandoGrupos ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    {cargandoGrupos ? (
                        <div className="text-center py-10"><RefreshCw className="mx-auto animate-spin text-gray-300" size={32} /></div>
                    ) : gruposFiltrados.length === 0 ? (
                        <div className="text-center py-10">
                            <Layers className="mx-auto text-gray-200 mb-3" size={48} />
                            <p className="text-gray-500">No se encontraron grupos.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {gruposFiltrados.map(grupo => (
                                <div key={grupo.id} onClick={() => seleccionarGrupo(grupo)}
                                    className="border border-gray-200 p-4 rounded-xl hover:border-[#0B2B54] hover:shadow-md transition-all cursor-pointer group bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="bg-blue-50 text-[#0B2B54] px-3 py-1 rounded-lg font-bold text-lg">
                                            {grupo.clave_grupo}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${grupo.planes_tutoria?.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {grupo.planes_tutoria?.semestre}
                                        </span>
                                    </div>
                                    <div className="space-y-1 mt-3">
                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{grupo.usuarios?.nombre_completo}</p>
                                        <p className="text-xs text-gray-500">Tutor asignado</p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[#0B2B54]">
                                        <span className="text-xs font-semibold">Ver alumnos</span>
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // RENDER 2: Tutorados del grupo
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto pb-10 space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <button onClick={() => setVista('grupos')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0B2B54] font-medium transition-colors">
                    <ArrowLeft size={16} /> Volver a grupos
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div>
                        <h4 className="text-xl font-bold text-[#0B2B54]">Alumnos del Grupo {grupoSel?.clave_grupo}</h4>
                        <p className="text-sm text-gray-500 mt-1">Tutor: {grupoSel?.usuarios?.nombre_completo}</p>
                        <p className="text-sm text-gray-500">Periodo: {grupoSel?.planes_tutoria?.semestre}</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar alumno..."
                            value={busquedaTutorado}
                            onChange={(e) => setBusquedaTutorado(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B54]"
                        />
                    </div>
                </div>

                {cargandoTutorados ? (
                    <div className="text-center py-10"><RefreshCw className="mx-auto animate-spin text-gray-300" size={32} /></div>
                ) : tutoradosFiltrados.length === 0 ? (
                    <div className="text-center py-10">
                        <Users className="mx-auto text-gray-200 mb-3" size={48} />
                        <p className="text-gray-500">No hay tutorados en este grupo.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-100">
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider pl-2">No. Control</th>
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Alumno</th>
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Estatus Evaluación</th>
                                    <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right pr-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tutoradosFiltrados.map(alumno => {
                                    // Lógica A1 y A2 visual
                                    const evaluado = alumno.evaluado;
                                    const acreditado = alumno.acreditado;
                                    const listoParaConstancia = evaluado && acreditado;

                                    return (
                                        <tr key={alumno.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 pl-2 font-mono text-sm text-gray-600">{alumno.num_control}</td>
                                            <td className="py-4">
                                                <p className="font-semibold text-gray-900 text-sm">{alumno.nombre}</p>
                                                <p className="text-xs text-gray-400">{alumno.correo}</p>
                                            </td>
                                            <td className="py-4">
                                                {!evaluado ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200" title="A2. Datos incompletos: El tutor no ha registrado evaluación final">
                                                        <AlertCircle size={12} /> Sin evaluar
                                                    </span>
                                                ) : acreditado ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-200">
                                                        <CheckCircle2 size={12} /> Acreditado ({alumno.calificacion})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-200" title="A1. Alumno no acreditado: No cumple requisitos">
                                                        <XCircle size={12} /> No acreditado ({alumno.calificacion})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 pr-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {listoParaConstancia ? (
                                                        <>
                                                            {alumno.constancia_generada && (
                                                                <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 mr-2">
                                                                    Duplicado
                                                                </span>
                                                            )}
                                                            <button 
                                                                onClick={() => generarPDF(alumno, 'preview')}
                                                                disabled={generando}
                                                                className="p-2 text-gray-500 hover:text-[#0B2B54] hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                                title="Vista Previa"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => generarPDF(alumno, 'descargar')}
                                                                disabled={generando}
                                                                className="flex items-center gap-1.5 px-3 py-2 bg-[#0B2B54] text-white rounded-lg hover:bg-[#0f3d75] transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
                                                            >
                                                                <Download size={16} /> Emitir PDF
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic flex items-center gap-1 justify-end">
                                                            <ShieldCheck size={14} /> Bloqueado
                                                        </span>
                                                    )}
                                                </div>
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
