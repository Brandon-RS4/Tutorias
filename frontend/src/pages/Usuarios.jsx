import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Swal from 'sweetalert2';

export default function Usuarios() {
    const { user } = useAuth();

    const getRolesPermitidos = () => {
        const rolActual = user?.rol;
        
        const allRoles = [
            { value: 'jefe_departamento_desarrollo_academico', label: 'Jefe del Departamento de Desarrollo Académico' },
            { value: 'tutorado', label: 'Tutorado' },
            { value: 'tutor', label: 'Tutor' },
            { value: 'coordinador_institucional_pt', label: 'Coordinador PT (Institucional)' },
            { value: 'coordinador_departamento_academico', label: 'Coordinador Departamento Académico' },
            { value: 'jefe_departamento_academico', label: 'Jefe del Departamento Académico' },
            { value: 'subdirector', label: 'Subdirector' },
            { value: 'director', label: 'Director' }
        ];

        if (rolActual === 'Administrador' || rolActual === 'Director' || rolActual === 'Jefe_Departamento_Desarrollo_Academico') {
            return allRoles;
        } else if (rolActual === 'Coordinador_Institucional_PT') {
            return [ { value: 'tutor', label: 'Tutor' } ];
        } else if (rolActual === 'Coordinador_Departamento_Academico') {
            return [ { value: 'tutorado', label: 'Tutorado' } ];
        }
        return [];
    };

    const rolesPermitidos = getRolesPermitidos();
    const defaultRol = rolesPermitidos.length > 0 ? rolesPermitidos[0].value : '';

    const [formData, setFormData] = useState({
        nombre_completo: '',
        correo: '',
        contrasena: '123456', // Contraseña genérica por defecto
        rol: defaultRol,
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
                departamento_id: user?.departamento_id || null
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
                rol: defaultRol,
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
                            {rolesPermitidos.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
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
                                    <option value="Ing. Electrónica">Ing. Electrónica</option>
                                    <option value="Ing. Eléctrica">Ing. Eléctrica</option>
                                    <option value="Ing. TICS">Ing. TICS</option>
                                    <option value="Ing. Bioquímica">Ing. Bioquímica</option>
                                    <option value="Ing. Mecánica">Ing. Mecánica</option>
                                    <option value="Ing. Ambiental">Ing. Ambiental</option>
                                    <option value="Ing. Energías Renovables">Ing. Energías Renovables</option>
                                    <option value="Ing. Gestión Empresarial">Ing. Gestión Empresarial</option>
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