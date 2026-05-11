import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Swal from 'sweetalert2';

export default function Usuarios() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        nombre_completo: '',
        correo: '',
        contrasena: '123456', // Contraseña genérica por defecto
        rol: 'tutorado',
        activo: true,
        // Campos específicos de tutor
        num_control_tutor: '',
        carrera: '',
        max_tutorados: 30,
        // Campos específicos de tutorado
        num_control_tutorado: '',
        direccion: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Se manda el departamento del usuario que está creando la cuenta
            const payload = {
                ...formData,
                departamento: user?.departamento?._id || user?.departamento
            };

            // El endpoint en el backend está mapeado a POST /api/usuarios/
            const res = await api.post('/usuarios', payload);
            
            Swal.fire({
                title: '¡Operación Exitosa!',
                text: res.data.message || 'Usuario registrado correctamente.',
                icon: 'success',
                confirmButtonColor: '#0B2B54'
            });

            setFormData({ 
                nombre_completo: '', 
                correo: '', 
                contrasena: '123456', 
                rol: 'tutorado',
                activo: true,
                num_control_tutor: '',
                carrera: '',
                max_tutorados: 30,
                num_control_tutorado: '',
                direccion: ''
            });
        } catch (err) {
            Swal.fire({
                title: 'Error',
                text: err.response?.data?.message || 'Ocurrió un error al registrar el usuario.',
                icon: 'error',
                confirmButtonColor: '#0B2B54'
            });
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h3 className="text-xl font-bold text-[#0B2B54] mb-6">CU01: Asignar Usuarios al Sistema</h3>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2">
                        <h4 className="text-sm font-bold text-gray-800 border-b pb-2 mb-2">Datos Generales</h4>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                        <input
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            type="text" required
                            value={formData.nombre_completo}
                            onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Correo Institucional</label>
                        <input
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            type="email" required
                            placeholder="usuario@tecnm.mx"
                            value={formData.correo}
                            onChange={e => setFormData({ ...formData, correo: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Rol Institucional</label>
                        <select
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            value={formData.rol}
                            onChange={e => setFormData({ ...formData, rol: e.target.value })}
                        >
                            <option value="tutorado">Tutorado</option>
                            <option value="tutor">Tutor</option>
                            <option value="coordinador_pt">Coordinador PT (Institucional)</option>
                            <option value="coordinador_dep_ac_pt">Coordinador Departamento Académico</option>
                            <option value="jefe_depto_academico">Jefe del Departamento Académico</option>
                            <option value="subdirector">Subdirector</option>
                            <option value="director">Director / Jefe de Desarrollo Académico</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Estado de la cuenta</label>
                        <select
                            className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                            value={formData.activo}
                            onChange={e => setFormData({ ...formData, activo: e.target.value === 'true' })}
                        >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                        </select>
                    </div>

                    {/* CAMPOS DINÁMICOS SEGÚN EL ROL */}
                    {formData.rol === 'tutor' && (
                        <>
                            <div className="space-y-1 md:col-span-2 mt-4">
                                <h4 className="text-sm font-bold text-gray-800 border-b pb-2 mb-2">Información de Tutor</h4>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">No. Control Tutor</label>
                                <input
                                    className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                                    type="text" required
                                    value={formData.num_control_tutor}
                                    onChange={e => setFormData({ ...formData, num_control_tutor: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Carrera</label>
                                <select
                                    className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                                    required
                                    value={formData.carrera}
                                    onChange={e => setFormData({ ...formData, carrera: e.target.value })}
                                >
                                    <option value="" disabled>Seleccione una carrera</option>
                                    <option value="Ing. Sistemas Computacionales">Ing. Sistemas Computacionales</option>
                                    <option value="Ing. Industrial">Ing. Industrial</option>
                                    <option value="Ing. Mecatrónica">Ing. Mecatrónica</option>
                                    <option value="Lic. Administración">Lic. Administración</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Máximo de Tutorados</label>
                                <input
                                    className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                                    type="number" required min="1"
                                    value={formData.max_tutorados}
                                    onChange={e => setFormData({ ...formData, max_tutorados: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    {formData.rol === 'tutorado' && (
                        <>
                            <div className="space-y-1 md:col-span-2 mt-4">
                                <h4 className="text-sm font-bold text-gray-800 border-b pb-2 mb-2">Información de Tutorado</h4>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">No. Control Tutorado</label>
                                <input
                                    className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                                    type="text" required
                                    value={formData.num_control_tutorado}
                                    onChange={e => setFormData({ ...formData, num_control_tutorado: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Dirección</label>
                                <input
                                    className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0B2B54]"
                                    type="text"
                                    placeholder="Domicilio del alumno (opcional)"
                                    value={formData.direccion}
                                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    <div className="md:col-span-2 pt-4">
                        <button type="submit" className="w-full bg-[#0B2B54] text-white py-3 rounded-lg hover:bg-[#0f3d75] transition-colors font-medium shadow-md">
                            Confirmar Registro
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}