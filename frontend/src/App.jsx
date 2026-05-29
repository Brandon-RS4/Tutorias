import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import CambiarContrasenaInicial from './pages/CambiarContrasenaInicial';

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

// Componente temporal para el Dashboard mientras creamos las vistas específicas
const PlaceholderDashboard = () => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-xl font-medium text-gray-800 mb-4">Bienvenido a tu panel de control</h3>
    <p className="text-gray-600">Desde aquí podrás gestionar tus operaciones según tu rol institucional.</p>
  </div>
);

import ProgramaTutorias from './pages/ProgramaTutorias';
import AsignarTutores from './pages/AsignarTutores';
import AsignarTutorados from './pages/AsignarTutorados';
import CapturarAsistencias from './pages/CapturarAsistencias';
import EvaluarEvidencias from './pages/EvaluarEvidencias';
import SubirEvidencias from './pages/SubirEvidencias';
import EvaluarTutorados from './pages/EvaluarTutorados';
import ModificarActividades from './pages/ModificarActividades';

import Constancias from './pages/Constancias';
import ConsultarTutores from './pages/ConsultarTutores';
import ConsultarTutorados from './pages/ConsultarTutorados';

// Componente genérico para vistas en construcción
const PlaceholderView = ({ title }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-xl font-medium text-[#0B2B54] mb-4">{title}</h3>
    <p className="text-gray-600">Esta funcionalidad (Caso de Uso) está actualmente en desarrollo.</p>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cambiar-contrasena-inicial" element={<CambiarContrasenaInicial />} />

      {/* Rutas Protegidas */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PlaceholderDashboard />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="constancias" element={<Constancias />} />
        
        {/* Rutas en construcción mapeadas a los Casos de Uso */}
        <Route path="consultar-tutores" element={<ConsultarTutores />} />
        <Route path="consultar-tutorados" element={<ConsultarTutorados />} />
        <Route path="asignar-tutores" element={<AsignarTutores />} />
        <Route path="programa-tutorias" element={<ProgramaTutorias />} />
        <Route path="asignar-tutorados" element={<AsignarTutorados />} />
        <Route path="asistencias" element={<CapturarAsistencias />} />
        <Route path="evaluaciones" element={<EvaluarEvidencias />} />
        <Route path="evaluar-tutorados" element={<EvaluarTutorados />} />
        <Route path="actividades" element={<ModificarActividades />} />
        <Route path="evidencias" element={<SubirEvidencias />} />
      </Route>

      {/* Ruta comodín para atrapar errores de URL */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}