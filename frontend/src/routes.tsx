import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { LoadingOverlay } from '@mantine/core';
import { AppLayout } from './pages/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Map from './pages/Map';
import Hours from './pages/Hours';
import Projects from './pages/Projects';
import ScannerPage from './pages/ScannerPage';
import ReportePDF from './pages/ReportePDF';
import PurchaseScans from './pages/PurchaseScans';
import LandingPage from './pages/LandingPage';
import ClientDashboard from './pages/ClientDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import { useAuth } from './context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<LoadingOverlay visible={true} />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/employees" element={
          <ProtectedRoute>
            <Employees />
          </ProtectedRoute>
        } />
        <Route path="/map" element={
          <ProtectedRoute>
            <Map />
          </ProtectedRoute>
        } />
        <Route path="/hours" element={
          <ProtectedRoute>
            <Hours />
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        } />
        <Route path="/scanner" element={
          <ProtectedRoute>
            <ScannerPage />
          </ProtectedRoute>
        } />
        <Route path="/reporte-pdf" element={
          <ProtectedRoute>
            <ReportePDF />
          </ProtectedRoute>
        } />
        <Route path="/purchase-scans" element={
          <ProtectedRoute>
            <PurchaseScans />
          </ProtectedRoute>
        } />
        <Route path="/client-dashboard" element={
          <ProtectedRoute>
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/technician-dashboard" element={
          <ProtectedRoute>
            <TechnicianDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}