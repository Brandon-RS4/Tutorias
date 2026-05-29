import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, Users, FileText, CheckSquare, Upload, Calendar } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Menú dinámico basado en los roles del Modelo de Dominio y los Casos de Uso (CU01 - CU12)
    const getMenuOptions = () => {
        if (!user) return [];

        const rol = user.rol?.toLowerCase();

        switch (rol) {
            case 'administrador':
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                    { name: 'Gestión de Usuarios', path: '/usuarios', icon: Users },
                    { name: 'Programa de Tutorías', path: '/programa-tutorias', icon: Calendar },
                    { name: 'Asignar Tutores', path: '/asignar-tutores', icon: Users },
                    { name: 'Asignar Tutorados', path: '/asignar-tutorados', icon: Users },
                    { name: 'Consultar Tutores', path: '/consultar-tutores', icon: Users },
                    { name: 'Consultar Tutorados', path: '/consultar-tutorados', icon: Users },
                    { name: 'Capturar Asistencias', path: '/asistencias', icon: CheckSquare },
                    { name: 'Evaluar Evidencias', path: '/evaluaciones', icon: FileText },
                    { name: 'Evaluar Tutorados', path: '/evaluar-tutorados', icon: Users },
                    { name: 'Modificar Actividades', path: '/actividades', icon: Calendar },
                    { name: 'Subir Evidencias', path: '/evidencias', icon: Upload },
                    { name: 'Generar Constancias', path: '/constancias', icon: FileText },
                ];

            case 'director':
            case 'subdirector':
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                    // CU11, CU12
                    { name: 'Consultar Tutores', path: '/consultar-tutores', icon: Users },
                    { name: 'Consultar Tutorados', path: '/consultar-tutorados', icon: Users },
                ];

            case 'jefe_departamento_academico':
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                    { name: 'Asignar Tutores', path: '/asignar-tutores', icon: Users },
                    { name: 'Consultar Tutores', path: '/consultar-tutores', icon: Users },
                    { name: 'Consultar Tutorados', path: '/consultar-tutorados', icon: Users },
                ];

            case 'coordinador_institucional_pt': // Coordinador Institucional
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                    { name: 'Gestión de Usuarios', path: '/usuarios', icon: Users },
                    { name: 'Programa de Tutorías', path: '/programa-tutorias', icon: Calendar },
                    { name: 'Generar Constancias', path: '/constancias', icon: FileText },
                    { name: 'Consultar Tutores', path: '/consultar-tutores', icon: Users },
                    { name: 'Consultar Tutorados', path: '/consultar-tutorados', icon: Users },
                ];

            case 'coordinador_departamento_academico': // Coordinador Departamental
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                    { name: 'Gestión de Usuarios', path: '/usuarios', icon: Users },
                    { name: 'Asignar Tutorados', path: '/asignar-tutorados', icon: Users },
                    { name: 'Consultar Tutores', path: '/consultar-tutores', icon: Users },
                    { name: 'Consultar Tutorados', path: '/consultar-tutorados', icon: Users },
                ];

            case 'jefe_departamento_desarrollo_academico': // Jefe de Desarrollo Académico
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                    { name: 'Gestión de Usuarios', path: '/usuarios', icon: Users },
                    { name: 'Consultar Tutores', path: '/consultar-tutores', icon: Users },
                    { name: 'Consultar Tutorados', path: '/consultar-tutorados', icon: Users },
                ];

            case 'tutor':
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                    // CU05
                    { name: 'Capturar Asistencias', path: '/asistencias', icon: CheckSquare },
                    // CU06
                    { name: 'Evaluar Evidencias', path: '/evaluaciones', icon: FileText },
                    // CU08
                    { name: 'Evaluar Tutorados', path: '/evaluar-tutorados', icon: Users },
                    // CU09
                    { name: 'Modificar Actividades', path: '/actividades', icon: Calendar },
                ];

            case 'tutorado':
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                    // CU07 – Subir evidencias
                    { name: 'Subir Evidencias', path: '/evidencias', icon: Upload },
                ];

            default:
                return [
                    { name: 'Panel de Control', path: '/dashboard', icon: Home },
                ];
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            {/* Sidebar con tu color institucional */}
            <aside className="w-64 bg-[#0B2B54] text-white flex flex-col shadow-xl">
                <div className="p-6 border-b border-blue-900/50">
                    <h1 className="text-xl font-bold tracking-wider">TECNM Tutorías</h1>
                    <p className="text-sm text-blue-200 mt-1 capitalize">
                        {(user?.rol?.toLowerCase() === 'administrador') ? 'Administrador' : user?.rol?.replace(/_/g, ' ')}
                    </p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {getMenuOptions().map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-amber-500 text-white shadow-md'
                                        : 'text-gray-300 hover:bg-[#0f3d75] hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-blue-900/50">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-300 hover:bg-red-500/10 hover:text-red-200 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Área principal de contenido */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {getMenuOptions().find(o => o.path === location.pathname)?.name || 'Dashboard'}
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">{user?.nombre_completo}</span>
                        <div className="w-10 h-10 rounded-full bg-[#0B2B54] text-white flex items-center justify-center font-bold">
                            {user?.nombre_completo?.charAt(0) || 'U'}
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-8">
                    <Outlet /> {/* Aquí se inyectan las demás páginas */}
                </div>
            </main>
        </div>
    );
}