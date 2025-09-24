import { useState } from 'react';
import { AppShell, Burger, Text, NavLink, Group } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconDashboard, IconUsers, IconMap2, IconLogout, IconBriefcase, IconClock, IconTools } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

const mainLinks = [
    { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: IconUsers, label: 'Equipo', path: '/employees' },
    { icon: IconBriefcase, label: 'Proyectos', path: '/projects' },
    { icon: IconClock, label: 'Horas', path: '/hours' },
    { icon: IconMap2, label: 'Mapa', path: '/map' },
];

const clientLinks = [
    { icon: IconDashboard, label: 'Dashboard', path: '/client' },
    { icon: IconBriefcase, label: 'Proyectos', path: '/client-projects' },
    { icon: IconMap2, label: 'Mapa', path: '/client-map' },
];

const devTools = { icon: IconTools, label: 'DevTools', path: '/devtools' };

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [opened, setOpened] = useState(false);
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    let links = [...mainLinks];
    
    // Usar enlaces específicos según el rol del usuario
    if (user?.role === 'client') {
        links = [...clientLinks];
    }
    
    if (user?.role === 'developer') {
        links.push(devTools);
    }

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 200,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            <AppShell.Header style={{ backgroundColor: '#1A1B1E', borderBottom: '1px solid #2C2E33' }}>
                <Group h="100%" px="md">
                    <Burger
                        opened={opened}
                        onClick={() => setOpened(!opened)}
                        hiddenFrom="sm"
                        size="sm"
                        color="gray.2"
                    />
                    <Text size="lg" fw={500} c="gray.2">CargoLux</Text>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md" style={{ backgroundColor: '#1A1B1E' }}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ flex: 1 }}>
                        {links.map((link) => (
                            <NavLink
                                key={link.label}
                                label={link.label}
                                leftSection={<link.icon size={18} stroke={1.5} />}
                                onClick={() => navigate(link.path)}
                                active={location.pathname === link.path}
                                variant="filled"
                                style={{
                                    borderRadius: '8px',
                                    marginBottom: '4px'
                                }}
                            />
                        ))}
                    </div>

                    <NavLink
                        label="Cerrar Sesión"
                        leftSection={<IconLogout size={18} stroke={1.5} />}
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        color="red"
                        style={{
                            borderRadius: '8px',
                            marginTop: 'auto',
                            marginBottom: '8px'
                        }}
                    />
                </div>
            </AppShell.Navbar>

            <AppShell.Main style={{ backgroundColor: '#1A1B1E' }}>
                {children}
            </AppShell.Main>
        </AppShell>
    );
}