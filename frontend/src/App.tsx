import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { theme } from './theme';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { EmployeeProvider } from './context/EmployeeContext';
import { ProjectProvider } from './context/ProjectContext';
import { Notifications } from '@mantine/notifications';
import AppContent from './AppContent';
import { ModalsProvider } from '@mantine/modals';
import { LocationProvider } from './context/LocationContext';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function ProvidersWrapper({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    if (isAuthenticated) {
        return (
            <ProjectProvider>
                <EmployeeProvider>
                    {children}
                </EmployeeProvider>
            </ProjectProvider>
        );
    }
    return <>{children}</>;
}

function App() {
    // Forzar orientación vertical en toda la aplicación
    useEffect(() => {
        const forcePortraitOrientation = () => {
            // Verificar si estamos en un mapa (no forzar orientación)
            const isMapOpen = document.querySelector('.map-modal-container');
            if (isMapOpen) {
                return; // No forzar orientación si el mapa está abierto
            }

            // Forzar orientación vertical
            try {
                // @ts-ignore - API experimental de orientación
                if (screen.orientation && screen.orientation.lock) {
                    // @ts-ignore - API experimental de orientación
                    screen.orientation.lock('portrait').catch(() => {
                        console.log('No se pudo bloquear la orientación en portrait');
                    });
                }
            } catch (error) {
                console.log('Error al bloquear orientación en portrait:', error);
            }
        };

        // Aplicar orientación vertical al cargar
        forcePortraitOrientation();

        // Escuchar cambios de orientación
        const handleOrientationChange = () => {
            setTimeout(forcePortraitOrientation, 100);
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);

        // Cleanup
        return () => {
            window.removeEventListener('orientationchange', handleOrientationChange);
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, []);

    return (
        <LocationProvider>
            <BrowserRouter>
                <QueryClientProvider client={queryClient}>
                    <MantineProvider theme={theme}>
                        <ModalsProvider>
                            <Notifications autoClose={4000} />
                            <AuthProvider>
                                <ProvidersWrapper>
                                    <AppContent />
                                </ProvidersWrapper>
                            </AuthProvider>
                        </ModalsProvider>
                    </MantineProvider>
                </QueryClientProvider>
            </BrowserRouter>
        </LocationProvider>
    );
}

export default App;