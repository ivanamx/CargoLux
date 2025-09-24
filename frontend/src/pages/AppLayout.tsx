import { useState } from 'react';
import { AppShell, Burger, Text, NavLink, Group } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconDashboard, IconUsers, IconMap2, IconClock, IconLogout, IconClipboardList } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';


const mainLinks = [
    { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: IconUsers, label: 'Equipo', path: '/employees' },
    { icon: IconMap2, label: 'Mapa', path: '/map' },
    { icon: IconClock, label: 'Horas', path: '/hours' },
    { icon: IconClipboardList, label: 'Proyectos', path: '/projects' }
];

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [opened, setOpened] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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

            <AppShell.Navbar p="xs" style={{ backgroundColor: '#1A1B1E' }}>
                <AppShell.Section grow>
                    {mainLinks.map((link) => (
                        <NavLink
                            key={link.label}
                            label={link.label}
                            leftSection={<link.icon size={16} />}
                            onClick={() => navigate(link.path)}
                            active={location.pathname === link.path}
                        />
                    ))}
                </AppShell.Section>

                <AppShell.Section>
                    <NavLink
                        label="Cerrar Sesión"
                        leftSection={<IconLogout size={16} />}
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        color="red"
                    />
                </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main style={{ backgroundColor: '#1A1B1E' }}>
                {children}
            </AppShell.Main>
        </AppShell>
    );
}