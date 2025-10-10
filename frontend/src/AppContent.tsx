import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import ClientProjects from './pages/ClientProjects';
import Map from './pages/Map';
import ClientMap from './pages/ClientMap';
import TechnicianDashboard from './pages/TechnicianDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import Hours from './pages/Hours';
import { useEffect } from 'react';
import DeveloperDashboard from './pages/DeveloperDashboard';
import ScannerPage from './pages/ScannerPage';
import ReportePDF from './pages/ReportePDF';
import ProfessionalReportPDF from './pages/ProfessionalReportPDF';
import PurchaseScans from './pages/PurchaseScans';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import { notifications } from '@mantine/notifications';

export default function AppContent() {
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();

    // Función para manejar timeout por inactividad
    const handleInactivityTimeout = () => {
        notifications.show({
            title: 'Sesión expirada por inactividad',
            message: 'Has estado inactivo por 30 minutos. Por favor, inicia sesión de nuevo.',
            color: 'orange',
        });
        logout();
    };

    // Configurar timer de inactividad (30 minutos = 30 * 60 * 1000 ms)
    useInactivityTimer({
        timeout: 30 * 60 * 1000, // 30 minutos
        onTimeout: handleInactivityTimeout
    });

    // Log para debug
    useEffect(() => {
        console.log('Auth state:', { isAuthenticated, user, currentPath: location.pathname });
    }, [isAuthenticated, user, location]);

    // Si no está autenticado, permitir acceso a landing page y login
    if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/') {
        return <Navigate to="/" replace />;
    }

    // Si está autenticado y está en login, redirigir según rol
    if (isAuthenticated && location.pathname === '/login') {
        if (user?.role === 'tecnico' || user?.role === 'employee') {
            return <Navigate to="/technician" replace />;
        } else if (user?.role === 'developer') {
            return <Navigate to="/developer" replace />;
        } else if (user?.role === 'client') {
            return <Navigate to="/client" replace />;
        } else if (user?.role === 'dre') {
            return <Navigate to="/client-projects" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    const AdminRoute = ({ children }: { children: React.ReactNode }) => (
        isAuthenticated && user?.role === 'admin' ? (
            <AppLayout>{children}</AppLayout>
        ) : (
            <Navigate to="/login" replace />
        )
    );

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            
            {/* Ruta para el dashboard de developer */}
            <Route 
                path="/developer" 
                element={
                    isAuthenticated && user?.role === 'developer' ? (
                        <DeveloperDashboard />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } 
            />


            {/* Ruta para el dashboard de admin */}
            <Route 
                path="/dashboard" 
                element={
                    isAuthenticated ? (
                        <AppLayout>
                            <Dashboard />
                        </AppLayout>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } 
            />

            <Route 
                path="/technician" 
                element={
                    isAuthenticated && (user?.role === 'tecnico' || user?.role === 'employee') ? 
                        <TechnicianDashboard /> : 
                        <Navigate to="/login" replace />
                } 
            />

            <Route 
                path="/client" 
                element={
                    isAuthenticated && user?.role === 'client' ? 
                        <AppLayout>
                            <ClientDashboard />
                        </AppLayout> : 
                        <Navigate to="/login" replace />
                } 
            />

            {/* Ruta para el escáner */}
            <Route 
                path="/scanner" 
                element={
                    isAuthenticated ? (
                        <ScannerPage />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />

            {/* Ruta de proyectos para clientes */}
            <Route 
                path="/client-projects" 
                element={
                    isAuthenticated && (user?.role === 'client' || user?.role === 'dre') ? 
                        <AppLayout>
                            <ClientProjects />
                        </AppLayout> : 
                        <Navigate to="/login" replace />
                } 
            />

            {/* Ruta de proyectos para admins */}
            <Route 
                path="/projects" 
                element={
                    isAuthenticated && user?.role === 'admin' ? 
                        <AppLayout>
                            <Projects />
                        </AppLayout> : 
                        <Navigate to="/login" replace />
                } 
            />

            {/* Ruta de mapa para clientes */}
            <Route 
                path="/client-map" 
                element={
                    isAuthenticated && user?.role === 'client' ? 
                        <AppLayout>
                            <ClientMap />
                        </AppLayout> : 
                        <Navigate to="/login" replace />
                } 
            />

            {/* Ruta de compra de escaneos para clientes */}
            <Route 
                path="/purchase-scans" 
                element={
                    isAuthenticated && user?.role === 'client' ? 
                        <AppLayout>
                            <PurchaseScans />
                        </AppLayout> : 
                        <Navigate to="/login" replace />
                } 
            />

            {/* Ruta de reporte PDF para clientes */}
            <Route 
                path="/reporte-pdf" 
                element={
                    isAuthenticated && user?.role === 'client' ? 
                        <AppLayout>
                            <ReportePDF />
                        </AppLayout> : 
                        <Navigate to="/login" replace />
                } 
            />

            {/* Ruta de reporte PDF profesional para clientes */}
            <Route 
                path="/professional-report-pdf" 
                element={
                    isAuthenticated && user?.role === 'client' ? 
                        <ProfessionalReportPDF />
                        : 
                        <Navigate to="/login" replace />
                } 
            />

            {/* Rutas solo para admin */}
            {user?.role === 'admin' && (
                <>
                    <Route path="/employees" element={<AdminRoute><Employees /></AdminRoute>} />
                    <Route path="/map" element={<AdminRoute><Map /></AdminRoute>} />
                    <Route path="/hours" element={<AdminRoute><Hours /></AdminRoute>} />
                    <Route path="/reporte-pdf" element={<AdminRoute><ReportePDF /></AdminRoute>} />
                </>
            )}
        </Routes>
    );
} 