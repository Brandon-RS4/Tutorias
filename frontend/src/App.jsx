import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';

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

// Componente temporal para Constancias
const PlaceholderConstancias = () => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-xl font-medium text-gray-800 mb-4">Generación de Constancias</h3>
    <p className="text-gray-600">Este módulo está en construcción. Aquí podrás generar las constancias para los tutores y tutorados.</p>
  </div>
);

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

      {/* Rutas Protegidas */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PlaceholderDashboard />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="constancias" element={<PlaceholderConstancias />} />
        
        {/* Rutas en construcción mapeadas a los Casos de Uso */}
        <Route path="consultar-tutores" element={<PlaceholderView title="Consultar Tutores (CU11)" />} />
        <Route path="consultar-tutorados" element={<PlaceholderView title="Consultar Tutorados (CU12)" />} />
        <Route path="asignar-tutores" element={<AsignarTutores />} />
        <Route path="programa-tutorias" element={<ProgramaTutorias />} />
        <Route path="asignar-tutorados" element={<PlaceholderView title="Asignar Tutorados (CU04)" />} />
        <Route path="asistencias" element={<PlaceholderView title="Capturar Asistencias (CU05)" />} />
        <Route path="evaluaciones" element={<PlaceholderView title="Evaluar Evidencias (CU06)" />} />
        <Route path="evaluar-tutorados" element={<PlaceholderView title="Evaluar Tutorados (CU08)" />} />
        <Route path="actividades" element={<PlaceholderView title="Modificar Actividades (CU09)" />} />
        <Route path="evidencias" element={<PlaceholderView title="Subir Evidencias (CU07)" />} />
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