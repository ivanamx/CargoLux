import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
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

function App() {
    return (
        <LocationProvider>
            <BrowserRouter>
                <QueryClientProvider client={queryClient}>
                    <MantineProvider theme={theme}>
                        <ModalsProvider>
                            <Notifications />
                            <AuthProvider>
                                <ProjectProvider>
                                    <EmployeeProvider>
                                        <AppContent />
                                    </EmployeeProvider>
                                </ProjectProvider>
                            </AuthProvider>
                        </ModalsProvider>
                    </MantineProvider>
                </QueryClientProvider>
            </BrowserRouter>
        </LocationProvider>
    );
}

export default App;