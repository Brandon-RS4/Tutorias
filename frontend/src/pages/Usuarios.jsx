import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Swal from 'sweetalert2';
import { Trash2, Edit } from 'lucide-react';

export default function Usuarios() {
    const { user } = useAuth();
    const [usuariosLista, setUsuariosLista] = useState([]);

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

    const cargarUsuarios = async () => {
        try {
            const rolesValues = rolesPermitidos.map(r => r.value.toLowerCase().replace(/_/g, ''));
            const res = await api.get('/usuarios');
            const todos = res.data.data.usuarios || [];
            
            // Si es administrador, director o jefe desarrollo, trae a todos
            if (user?.rol === 'Administrador' || user?.rol === 'Director' || user?.rol === 'Jefe_Departamento_Desarrollo_Academico') {
                setUsuariosLista(todos);
            } else {
                // Filtramos por lo que tienen permitido ver/gestionar
                const filtrados = todos.filter(u => {
                    const r = u.rol.toLowerCase().replace(/_/g, '');
                    return rolesValues.includes(r);
                });
                setUsuariosLista(filtrados);
            }
        } catch (err) {
            console.error('Error cargando usuarios:', err);
        }
    };

    useEffect(() => {
        cargarUsuarios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Se manda el departamento del usuario que está creando la cuenta
            const payload = {
                ...formData,
                departamento_id: user?.departamento_id || null
            };

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
            cargarUsuarios();
        } catch (err) {
            Swal.fire({
                title: 'Error',
                text: err.response?.data?.message || 'Ocurrió un error al registrar el usuario.',
                icon: 'error',
                confirmButtonColor: '#0B2B54'
            });
        }
    };

    const handleEliminar = async (id, nombre) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará permanentemente al usuario ${nombre}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/usuarios/${id}`);
                Swal.fire('¡Eliminado!', 'El usuario ha sido eliminado.', 'success');
                cargarUsuarios();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.message || 'Error al eliminar usuario', 'error');
            }
        }
    };

    const handleEditar = async (u) => {
        let extraHtml = '';
        const isTutor = u.rol === 'Tutor';
        const isTutorado = u.rol === 'Tutorado';
        
        let ctrlTutor = isTutor ? (u.tutores?.[0]?.num_control_tutor || '') : '';
        let carrTutor = isTutor ? (u.tutores?.[0]?.carrera || '') : '';
        let maxTut = isTutor ? (u.tutores?.[0]?.max_tutorados || 30) : 30;
        
        let ctrlTutorado = isTutorado ? (u.tutorados?.[0]?.num_control_tutorado || '') : '';
        let dirTutorado = isTutorado ? (u.tutorados?.[0]?.direccion || '') : '';

        if (isTutor) {
            extraHtml = `
                <div class="swal2-input-group mt-3 text-left">
                    <label class="text-xs font-semibold text-gray-500 uppercase">No. Control Tutor</label>
                    <input id="swal-input-ctrl-t" class="swal2-input !mt-1" style="width: 100%; box-sizing: border-box;" placeholder="No. Control" value="${ctrlTutor}" maxlength="8">
                </div>
                <div class="swal2-input-group mt-3 text-left">
                    <label class="text-xs font-semibold text-gray-500 uppercase">Carrera</label>
                    <input id="swal-input-carr" class="swal2-input !mt-1" style="width: 100%; box-sizing: border-box;" placeholder="Carrera" value="${carrTutor}">
                </div>
                <div class="swal2-input-group mt-3 text-left">
                    <label class="text-xs font-semibold text-gray-500 uppercase">Máximo Tutorados</label>
                    <input id="swal-input-max" class="swal2-input !mt-1" type="number" style="width: 100%; box-sizing: border-box;" placeholder="Max Tutorados" value="${maxTut}">
                </div>
            `;
        } else if (isTutorado) {
            extraHtml = `
                <div class="swal2-input-group mt-3 text-left">
                    <label class="text-xs font-semibold text-gray-500 uppercase">No. Control Tutorado</label>
                    <input id="swal-input-ctrl-a" class="swal2-input !mt-1" style="width: 100%; box-sizing: border-box;" placeholder="No. Control" value="${ctrlTutorado}" maxlength="8">
                </div>
                <div class="swal2-input-group mt-3 text-left">
                    <label class="text-xs font-semibold text-gray-500 uppercase">Dirección</label>
                    <input id="swal-input-dir" class="swal2-input !mt-1" style="width: 100%; box-sizing: border-box;" placeholder="Dirección" value="${dirTutorado}">
                </div>
            `;
        }

        const { value: formValues } = await Swal.fire({
            title: `Editar Usuario`,
            html: `
                <div class="swal2-input-group mt-2 text-left">
                    <label class="text-xs font-semibold text-gray-500 uppercase">Nombre Completo</label>
                    <input id="swal-input-nombre" class="swal2-input !mt-1" style="width: 100%; box-sizing: border-box;" placeholder="Nombre Completo" value="${u.nombre_completo}">
                </div>
                <div class="swal2-input-group mt-3 text-left">
                    <label class="text-xs font-semibold text-gray-500 uppercase">Correo Institucional</label>
                    <input id="swal-input-correo" class="swal2-input !mt-1" style="width: 100%; box-sizing: border-box;" placeholder="Correo Institucional" value="${u.correo}">
                </div>
                ${extraHtml}
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0B2B54',
            preConfirm: () => {
                const nombre = document.getElementById('swal-input-nombre').value;
                const correo = document.getElementById('swal-input-correo').value;
                
                if (!nombre || !correo) {
                    Swal.showValidationMessage('Nombre y correo son obligatorios');
                    return false;
                }

                const payload = { nombre_completo: nombre, correo };

                if (isTutor) {
                    const ctrl = document.getElementById('swal-input-ctrl-t').value;
                    const carr = document.getElementById('swal-input-carr').value;
                    
                    if(!/^\d{8}$/.test(ctrl)) {
                        Swal.showValidationMessage('El número de control debe tener 8 números exactos.');
                        return false;
                    }
                    payload.num_control_tutor = ctrl;
                    payload.carrera = carr;
                    payload.max_tutorados = parseInt(document.getElementById('swal-input-max').value, 10);
                } else if (isTutorado) {
                    const ctrl = document.getElementById('swal-input-ctrl-a').value;
                    if(!/^\d{8}$/.test(ctrl)) {
                        Swal.showValidationMessage('El número de control debe tener 8 números exactos.');
                        return false;
                    }
                    payload.num_control_tutorado = ctrl;
                    payload.direccion = document.getElementById('swal-input-dir').value;
                }
                return payload;
            }
        });

        if (formValues) {
            try {
                await api.put(`/usuarios/${u.id}`, formValues);
                Swal.fire({ title: '¡Actualizado!', text: 'La información se guardó correctamente.', icon: 'success', confirmButtonColor: '#0B2B54' });
                cargarUsuarios();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.message || 'Error al actualizar', 'error');
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-10 space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-[#0B2B54] mb-6">Asignar Usuarios al Sistema</h3>

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
                                    maxLength={8}
                                    pattern="\d{8}"
                                    title="Debe contener exactamente 8 números"
                                    value={formData.num_control_tutor}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 8) setFormData({ ...formData, num_control_tutor: val });
                                    }}
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
                                    <option value="Ing. Industrial">Ing. Industrial</option>
                                    <option value="Ing. Mecatrónica">Ing. Mecatrónica</option>
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
                                    maxLength={8}
                                    pattern="\d{8}"
                                    title="Debe contener exactamente 8 números"
                                    value={formData.num_control_tutorado}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 8) setFormData({ ...formData, num_control_tutorado: val });
                                    }}
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

            {/* Listado de Usuarios */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-[#0B2B54] mb-6">Usuarios Registrados (Bajo mi gestión)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Nombre</th>
                                <th className="px-4 py-3">Correo</th>
                                <th className="px-4 py-3">Rol</th>
                                <th className="px-4 py-3">No. Control</th>
                                <th className="px-4 py-3 rounded-r-lg text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usuariosLista.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                        No hay usuarios registrados o no tienes permisos para verlos.
                                    </td>
                                </tr>
                            )}
                            {usuariosLista.map(u => {
                                let ctrl = 'N/A';
                                if (u.rol === 'Tutor') ctrl = u.tutores?.[0]?.num_control_tutor || 'N/A';
                                if (u.rol === 'Tutorado') ctrl = u.tutorados?.[0]?.num_control_tutorado || 'N/A';
                                
                                return (
                                <tr key={u.id} className="bg-white hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{u.nombre_completo}</td>
                                    <td className="px-4 py-3">{u.correo}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {u.rol}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-500">{ctrl}</td>
                                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                                        <button onClick={() => handleEditar(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors" title="Editar Información">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleEliminar(u.id, u.nombre_completo)} className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Eliminar Permanentemente">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}