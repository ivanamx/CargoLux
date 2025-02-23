import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Map from './pages/Map';
import TechnicianDashboard from './pages/TechnicianDashboard';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import Hours from './pages/Hours';

export default function AppContent() {
    const { user, isAuthenticated } = useAuth();

    const AdminRoute = ({ children }: { children: React.ReactNode }) => (
        isAuthenticated && user?.role === 'admin' ? (
            <AppLayout>{children}</AppLayout>
        ) : (
            <Navigate to="/login" replace />
        )
    );

    return (
        <Routes>
            {/* Ruta pública - Login */}
            <Route 
                path="/login" 
                element={
                    !isAuthenticated ? (
                        <Login />
                    ) : (
                        <Navigate to="/dashboard" replace />
                    )
                } 
            />

            {/* Ruta Dashboard - Diferente vista según rol */}
            <Route 
                path="/dashboard" 
                element={
                    isAuthenticated ? (
                        user?.role === 'admin' ? (
                            <AppLayout>
                                <Dashboard />
                            </AppLayout>
                        ) : (
                            <TechnicianDashboard />
                        )
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } 
            />

            {/* Rutas solo para admin */}
            {user?.role === 'admin' && (
                <>
                    <Route path="/employees" element={<AdminRoute><Employees /></AdminRoute>} />
                    <Route path="/projects" element={<AdminRoute><Projects /></AdminRoute>} />
                    <Route path="/map" element={<AdminRoute><Map /></AdminRoute>} />
                    <Route path="/hours" element={<AdminRoute><Hours /></AdminRoute>} />
                </>
            )}

            <Route 
                path="*" 
                element={
                    <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
                }
            />
        </Routes>
    );
} 