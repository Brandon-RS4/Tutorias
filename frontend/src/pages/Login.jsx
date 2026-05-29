import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Login() {
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await login(correo, contrasena);

        if (result.success) {
            if (result.primer_inicio_sesion) {
                navigate('/cambiar-contrasena-inicial');
            } else {
                navigate('/dashboard');
            }
        } else {
            Swal.fire({
                title: 'Acceso Denegado',
                text: result.message || 'Credenciales incorrectas.',
                icon: 'error',
                confirmButtonColor: '#0B2B54'
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#0B2B54]">Sistema de Tutorías</h1>
                    <p className="text-gray-500 mt-2">Ingresa tus credenciales institucionales</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Correo Institucional
                        </label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B2B54] focus:border-[#0B2B54] outline-none transition-colors"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            placeholder="usuario@culiacan.tecnm.mx"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={mostrarContrasena ? "text" : "password"}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B2B54] focus:border-[#0B2B54] outline-none transition-colors pr-10"
                                value={contrasena}
                                onChange={(e) => setContrasena(e.target.value)}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setMostrarContrasena(!mostrarContrasena)}
                            >
                                {mostrarContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#0B2B54] hover:bg-[#0f3d75] text-white font-medium py-2.5 rounded-lg transition-colors shadow-md disabled:opacity-70"
                    >
                        {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}