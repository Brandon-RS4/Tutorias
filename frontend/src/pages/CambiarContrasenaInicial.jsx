import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';

export default function CambiarContrasenaInicial() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [contrasenaActual, setContrasenaActual] = useState('123456');
    const [nuevaContrasena, setNuevaContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (nuevaContrasena !== confirmarContrasena) {
            return Swal.fire({
                title: 'Error',
                text: 'Las contraseñas no coinciden.',
                icon: 'warning',
                confirmButtonColor: '#0B2B54'
            });
        }

        if (nuevaContrasena.length < 6) {
            return Swal.fire({
                title: 'Error',
                text: 'La nueva contraseña debe tener al menos 6 caracteres.',
                icon: 'warning',
                confirmButtonColor: '#0B2B54'
            });
        }

        setIsLoading(true);

        try {
            const response = await api.post('/auth/cambiar-contrasena-inicial', {
                correo: user?.correo,
                contrasena_actual: contrasenaActual,
                nueva_contrasena: nuevaContrasena
            });

            if (response.data.success) {
                await Swal.fire({
                    title: '¡Éxito!',
                    text: 'Tu contraseña ha sido actualizada. Por favor, inicia sesión nuevamente.',
                    icon: 'success',
                    confirmButtonColor: '#0B2B54'
                });
                logout();
                navigate('/');
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: error.response?.data?.message || 'Hubo un error al cambiar la contraseña.',
                icon: 'error',
                confirmButtonColor: '#0B2B54'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#0B2B54]">Cambio de Contraseña</h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Por seguridad, debes cambiar tu contraseña inicial antes de continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña Actual (Temporal)
                        </label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B2B54] outline-none bg-gray-100 text-gray-500"
                            value={contrasenaActual}
                            readOnly
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nueva Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={mostrarNueva ? "text" : "password"}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B2B54] outline-none transition-colors pr-10"
                                value={nuevaContrasena}
                                onChange={(e) => setNuevaContrasena(e.target.value)}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setMostrarNueva(!mostrarNueva)}
                            >
                                {mostrarNueva ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Nueva Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={mostrarConfirmar ? "text" : "password"}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B2B54] outline-none transition-colors pr-10"
                                value={confirmarContrasena}
                                onChange={(e) => setConfirmarContrasena(e.target.value)}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                            >
                                {mostrarConfirmar ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#0B2B54] hover:bg-[#0f3d75] text-white font-medium py-2.5 rounded-lg transition-colors shadow-md disabled:opacity-70 mt-4"
                    >
                        {isLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
}
