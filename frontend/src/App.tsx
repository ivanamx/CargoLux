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