import { Grid, Paper, Text, Group, RingProgress, SimpleGrid, Card, Title, Stack, Badge, Button, ThemeIcon, Box, Modal, SimpleGrid as MantineSimpleGrid, Divider, Avatar, ActionIcon, Progress, useMantineTheme } from '@mantine/core';
import { 
    IconUsers, 
    IconUserCheck, 
    IconUserX, 
    IconClock,
    IconChartBar,
    IconCalendar,
    IconMapPin,
    IconUser,
    IconPhone,
    IconMail,
    IconTools,
    IconCopy,
    IconDoorEnter,
    IconUserCircle
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useEmployees } from '../context/EmployeeContext';
import type { Employee } from './Employees'; // Importar el tipo Employee
import { attendanceService } from '../services/attendance';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RecentActivity } from '../types/api';
import { keyframes } from '@emotion/react';
import { notifications } from '@mantine/notifications';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { useProjects } from '../context/ProjectContext';
import { API_URL } from '../services/api';
import { getToken } from '../services/auth';
import { predefinedPlants, predefinedClients } from '../data/projectsData';
import { issuesService, type Issue } from '../services/issues';
import { DateInput } from '@mantine/dates';
import { Autocomplete, Select } from '@mantine/core';
import { IconFilter, IconSearch, IconX, IconShare } from '@tabler/icons-react';

// Opciones para filtros
const typeOptions = [
    { value: 'sin_bateria', label: 'Sin Batería' },
    { value: 'sin_llaves', label: 'Sin Llaves' },
    { value: 'software', label: 'Error de Software' },
    { value: 'hardware', label: 'Falla de Hardware' },
    { value: 'conectividad', label: 'Problema de Conectividad' },
    { value: 'calibracion', label: 'Error de Calibración' },
    { value: 'mantenimiento', label: 'Requiere Mantenimiento' },
    { value: 'otro', label: 'Otro' }
];

const statusOptions = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en-revision', label: 'En Revisión' },
    { value: 'resuelto', label: 'Resuelto' }
];

// Función para obtener la etiqueta correcta del tipo de problema
const getTypeLabel = (type: string) => {
    const option = typeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
};

// Función para abrir ubicación en mapas
const openLocationInMaps = (location: string) => {
    // Detectar si es iOS (Apple Maps) o Android/Desktop (Google Maps)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
        // Usar Apple Maps en iOS
        window.open(`http://maps.apple.com/?q=${encodeURIComponent(location)}`, '_blank');
    } else {
        // Usar Google Maps en Android/Desktop
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
    }
};

const calculateStats = (employees: Employee[], recentActivity: RecentActivity[], isMobile: boolean = false) => {
    const clientes = employees.filter(emp => emp.role === 'client');
    const tecnicos = employees.filter(emp => emp.role === 'tecnico');
    
    const ubicacionesClientes = new Set(clientes.map(emp => emp.location).filter(loc => loc && loc.trim() !== ''));
    const ubicacionesTecnicos = new Set(tecnicos.map(emp => emp.location).filter(loc => loc && loc.trim() !== ''));
    
    // Obtener último check-in y check-out
    const checkIns = recentActivity.filter(activity => activity.type === 'check-in');
    const checkOuts = recentActivity.filter(activity => activity.type === 'check-out');
    
    const ultimoCheckIn = checkIns.length > 0 
        ? new Date(Math.max(...checkIns.map(ci => new Date(ci.timestamp).getTime())))
        : null;
    const ultimoCheckOut = checkOuts.length > 0 
        ? new Date(Math.max(...checkOuts.map(co => new Date(co.timestamp).getTime())))
        : null;
    
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };
    
    const baseStats = [
        { 
            title: 'CLIENTES', 
            value: clientes.length.toString(), 
            icon: IconUserCircle, 
            color: '#8B5CF6', 
            bg: 'rgba(139, 92, 246, 0.1)',
            subtitle: `(${ubicacionesClientes.size}) ubicaciones`
        },
        { 
            title: 'TECNICOS', 
            value: tecnicos.length.toString(), 
        icon: IconUsers, 
        color: '#3B82F6', 
            bg: 'rgba(59, 130, 246, 0.1)',
            subtitle: `(${ubicacionesTecnicos.size}) ubicaciones`
    },
    { 
        title: 'PRESENTES', 
        value: employees.filter(emp => emp.status === 'presente').length.toString(), 
        icon: IconUserCheck, 
        color: '#10B981', 
            bg: 'rgba(16, 185, 129, 0.1)',
            subtitle: ultimoCheckIn ? `último: ${formatTime(ultimoCheckIn)}` : 'último check in'
    },
    { 
        title: 'AUSENTES', 
        value: employees.filter(emp => emp.status === 'ausente').length.toString(), 
        icon: IconUserX, 
        color: '#EF4444', 
            bg: 'rgba(239, 68, 68, 0.1)',
            subtitle: ultimoCheckOut ? `último: ${formatTime(ultimoCheckOut)}` : 'último checkout'
    }
    ];

    // Solo agregar la card "TARDE" si NO es móvil
    if (!isMobile) {
        baseStats.push({ 
            title: 'TARDE', // Cambiado de "LLEGADAS TARDE" a "INCAPACIDAD" para coincidir con los estados disponibles
            value: employees.filter(emp => emp.status === 'incapacidad').length.toString(), 
            icon: IconClock, 
            color: '#F59E0B', 
            bg: 'rgba(245, 158, 11, 0.1)',
            subtitle: 'promedio: (número)'
        });
    }

    return baseStats;
};

// Modificar el cálculo de tasa de asistencia
const calculateAttendanceRate = (employees: Employee[]) => {
    if (employees.length === 0) return 0;
    
    const presentEmployees = employees.filter(emp => emp.status === 'presente').length;
    const totalEmployees = employees.length;
    
    return Math.round((presentEmployees / totalEmployees) * 100);
};

const serviceMetrics = {
    daily: {
        total: 15,
        completed: 8,
        inProgress: 4,
        pending: 3,
        urgent: 2
    },
    performance: {
        efficiency: 85,
        productivity: 92,
    }
};

// Modificar la animación para hacerla más pronunciada
const pulseAnimation = keyframes({
    '0%': { opacity: 1 },
    '50%': { opacity: 0 },  // Cambiar a 0 para hacerlo más visible
    '100%': { opacity: 1 }
});

// Añadir nueva interfaz para técnicos
interface Technician {
    id: number;
    name: string;
    photo: string;
    email: string;
    phone: string;
    status: 'presente' | 'ausente' | 'tarde';  // Añadir status
}

// Actualizar la interfaz ProjectEquipment para incluir números de serie
interface ProjectEquipment {
    id: number;
    name: string;
    quantity: number;
    type: 'laptop' | 'tool' | 'equipment';
    partNumber: string;
    serialNumbers: string[];  // Añadir array de números de serie
}

// Actualizar la interfaz ProjectInProgress
interface ProjectInProgress {
    id: number;
    name: string;
    location: string;
    progress: number;
    total_parts: number;
    completed_parts: number;
    technicians: Technician[];  // Cambiar de string[] a Technician[]
    plantContact: {
        name: string;
        phone: string;
        email: string;
    };
    equipment: ProjectEquipment[];  // Añadir esta línea
}

const Dashboard = () => {
    const { user, logout, setSimulatedUser, effectiveUser, isSimulating, setUser, setAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { employees } = useEmployees();
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useMantineTheme();
    const [isMobile, setIsMobile] = useState(false);
    
    // Detectar tamaño de pantalla
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768); // Breakpoint sm de Mantine (768px)
        };
        
        checkIsMobile(); // Verificar al montar
        window.addEventListener('resize', checkIsMobile);
        
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);
    
    const stats = calculateStats(employees, recentActivity, isMobile);
    const [inProgressModalOpen, setInProgressModalOpen] = useState(false);
    const [selectedProjectTechs, setSelectedProjectTechs] = useState<ProjectInProgress | null>(null);
    const [selectedProjectEquipment, setSelectedProjectEquipment] = useState<ProjectInProgress | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<ProjectEquipment | null>(null);
    const [problemsModalOpen, setProblemsModalOpen] = useState(false);
    const [pendingIssuesCount, setPendingIssuesCount] = useState<number>(0);
    const [reportedProblems, setReportedProblems] = useState<Issue[]>([]);
    const [issuesLoading, setIssuesLoading] = useState<boolean>(true);
    const [projectFilter, setProjectFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [meetingTimes] = useState<{[key: number]: string}>({
        1: '13:00',  // Horario para proyecto 1
        2: '15:30',  // Horario para proyecto 2
        3: '14:15',  // Horario para proyecto 3
    });
    const { projects } = useProjects();  // Obtener proyectos del contexto
    
    // Función para obtener opciones de autocompletado de proyectos
    const getProjectAutocompleteOptions = (projects: any[]) => {
        const uniqueProjects = [...new Set(projects.map(p => p.name))];
        return uniqueProjects.map(project => ({ value: project, label: project }));
    };

    // Función para filtrar problemas
    const getFilteredProblems = () => {
        return reportedProblems.filter(problem => {
            const matchesProject = !projectFilter || problem.project.toLowerCase().includes(projectFilter.toLowerCase());
            const matchesType = !typeFilter || problem.type === typeFilter;
            const matchesStatus = !statusFilter || problem.status === statusFilter;
            const matchesDate = !dateFilter || new Date(problem.date_reported).toDateString() === dateFilter.toDateString();
            
            return matchesProject && matchesType && matchesStatus && matchesDate;
        });
    };

    // Función para limpiar filtros
    const clearFilters = () => {
        setProjectFilter('');
        setTypeFilter('');
        setStatusFilter('');
        setDateFilter(null);
    };

    // Función para compartir un problema individual
    const shareIndividualProblem = (problem: Issue) => {
        const statusLabel = problem.status === 'pendiente' ? 'Pendiente' :
                           problem.status === 'en-revision' ? 'En Revisión' : 'Resuelto';
        
        const problemText = `🚨 PROBLEMA REPORTADO
🏭 Proyecto: ${problem.project}
🔧 Tipo: ${getTypeLabel(problem.type)}
🏷️ No. Parte/VIN: ${problem.part_number_vin}
📍 Ubicación: ${problem.location}
📅 Reportado: ${new Date(problem.date_reported).toLocaleDateString('es-MX')}
👤 Estado: ${statusLabel}`;

        if (navigator.share) {
            navigator.share({
                title: 'Problema Reportado',
                text: problemText
            });
        } else {
            navigator.clipboard.writeText(problemText);
            notifications.show({
                title: 'Copiado',
                message: 'Problema copiado al portapapeles',
                color: 'green'
            });
        }
    };

    // Función para compartir todos los problemas
    const shareAllProblems = () => {
        const allProblemsText = getFilteredProblems().map((problem, index) => {
            const statusLabel = problem.status === 'pendiente' ? 'Pendiente' :
                               problem.status === 'en-revision' ? 'En Revisión' : 'Resuelto';
            
            return `🚨 PROBLEMA #${index + 1} - ${statusLabel}
🏭 Proyecto: ${problem.project}
🔧 Tipo: ${getTypeLabel(problem.type)}
🏷️ No. Parte/VIN: ${problem.part_number_vin}
📍 Ubicación: ${problem.location}
📅 Reportado: ${new Date(problem.date_reported).toLocaleDateString('es-MX')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        }).join('\n\n');

        if (navigator.share) {
            navigator.share({
                title: 'Problemas Reportados',
                text: allProblemsText
            });
        } else {
            navigator.clipboard.writeText(allProblemsText);
            notifications.show({
                title: 'Copiado',
                message: 'Todos los problemas copiados al portapapeles',
                color: 'green'
            });
        }
    };
    
    // Funciones para hacer login real y navegar
    const handleLoginAsTech = async () => {
        try {
            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    username: 'tech@apizhe.com',
                    password: 'tech123'
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Guardar credenciales del admin actual
                localStorage.setItem('admin_token', localStorage.getItem('token') || '');
                localStorage.setItem('admin_user', localStorage.getItem('user') || '');
                
                // Hacer login con el técnico
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Actualizar el contexto de autenticación
                setUser(data.user);
                setAuthenticated(true);
                
                navigate('/technician');
            } else {
                notifications.show({
                    title: 'Error',
                    message: 'No se pudo hacer login como técnico',
                    color: 'red'
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Error de conexión',
                color: 'red'
            });
        }
    };

    const handleLoginAsClient = async () => {
        try {
            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    username: 'client@apizhe.com',
                    password: 'client123'
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Guardar credenciales del admin actual
                localStorage.setItem('admin_token', localStorage.getItem('token') || '');
                localStorage.setItem('admin_user', localStorage.getItem('user') || '');
                
                // Hacer login con el cliente
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Actualizar el contexto de autenticación
                setUser(data.user);
                setAuthenticated(true);
                
                navigate('/client');
            } else {
                notifications.show({
                    title: 'Error',
                    message: 'No se pudo hacer login como cliente',
                    color: 'red'
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Error de conexión',
                color: 'red'
            });
        }
    };

    const handleReturnToAdmin = () => {
        // Restaurar credenciales del admin
        const adminToken = localStorage.getItem('admin_token');
        const adminUser = localStorage.getItem('admin_user');
        
        if (adminToken && adminUser) {
            localStorage.setItem('token', adminToken);
            localStorage.setItem('user', adminUser);
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
        }
        
        navigate('/dashboard');
    };
    
    // Calcular estadísticas de proyectos
    const projectStats = {
        active: projects.filter(p => p.status === 'activo').length,
        completed: projects.filter(p => p.status === 'completado').length,
        inProgress: projects.filter(p => p.status === 'en-progreso').length,  // Cambiar de 'pendiente' a 'en-progreso'
        total: projects.length
    };

    // Calcular porcentajes
    const percentages = {
        active: projectStats.total ? (projectStats.active / projectStats.total) * 100 : 0,
        completed: projectStats.total ? (projectStats.completed / projectStats.total) * 100 : 0,
        inProgress: projectStats.total ? (projectStats.inProgress / projectStats.total) * 100 : 0
    };

    // Modificar projectsInProgress para usar datos reales
    const projectsInProgress: ProjectInProgress[] = projects
        .filter(p => p.status === 'en-progreso')
        .map(project => {
            const client = predefinedClients.find(c => c.name === project.client);
            const plantInfo = predefinedPlants.find(plant => plant.clientId === (client?.id || ''));
            
            return {
                id: project.id,
                name: project.name,
                location: plantInfo ? plantInfo.name : 'Sin ubicación',
                progress: project.progress,
                total_parts: project.total_parts,
                completed_parts: project.completed_parts,
                plantContact: {
                    name: project.location?.contact_name || '',
                    phone: project.location?.contact_phone || '',
                    email: project.location?.contact_email || ''
                },
                technicians: project.assigned_to.map(techName => ({
                    id: 0,  // ID temporal
                    name: techName,
                    photo: '',  // Foto por defecto
                    email: '',  // Email por defecto
                    phone: '',  // Teléfono por defecto
                    status: 'presente'  // Status por defecto
                })),
                equipment: []
            };
        });

    const fetchRecentActivity = async () => {
            try {
                const activity = await attendanceService.getRecentActivity();
                setRecentActivity(activity);
            setLoading(false);
            } catch (error) {
            console.error('Error fetching recent activity:', error);
            setLoading(false);
        }
    };

    // Función para obtener el conteo de issues pendientes
    const fetchPendingIssuesCount = async () => {
        try {
            setIssuesLoading(true);
            const count = await issuesService.getPendingIssuesCount();
            setPendingIssuesCount(count);
        } catch (error) {
            console.error('Error fetching pending issues count:', error);
            setPendingIssuesCount(0);
        } finally {
            setIssuesLoading(false);
        }
    };

    // Función para obtener todos los issues (para el modal)
    const fetchAllIssues = async () => {
        try {
            const issues = await issuesService.getIssues();
            setReportedProblems(issues);
        } catch (error) {
            console.error('Error fetching issues:', error);
            setReportedProblems([]);
        }
    };

    // Actualizar cuando el componente se monta y cuando hay cambios en la asistencia
    useEffect(() => {
        fetchRecentActivity();
        fetchPendingIssuesCount();

        // Suscribirse a eventos de check-in y check-out
        const handleAttendanceUpdate = () => {
            console.log('Attendance update detected, refreshing activity...');
            fetchRecentActivity();
        };

        // Escuchar eventos personalizados para check-in y check-out
        window.addEventListener('attendance-updated', handleAttendanceUpdate);

        return () => {
            window.removeEventListener('attendance-updated', handleAttendanceUpdate);
        };
    }, []);

    // Cargar issues cuando se abra el modal de problemas
    useEffect(() => {
        if (problemsModalOpen) {
            fetchAllIssues();
        }
    }, [problemsModalOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleProjectStatusClick = (status: string) => {
        navigate(`/projects?filter=Activo`);
    };

    const handleCompletedProjectsClick = () => {
        navigate(`/projects?filter=Completado`);
    };

    const attendanceRate = calculateAttendanceRate(employees);

    const handleReturnToDeveloper = () => {
        try {
            // Recuperar credenciales del developer
            const developerToken = localStorage.getItem('developer_token');
            const developerUser = localStorage.getItem('developer_user');

            if (developerToken && developerUser) {
                // Restaurar las credenciales del developer
                localStorage.setItem('token', developerToken);
                localStorage.setItem('user', developerUser);
                
                // Limpiar las credenciales guardadas
                localStorage.removeItem('developer_token');
                localStorage.removeItem('developer_user');

                notifications.show({
                    title: 'Retorno Exitoso',
                    message: 'Volviendo al dashboard de developer',
                    color: 'green'
                });

                // Redirigir al dashboard de developer
                window.location.href = '/developer';
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo volver al modo developer',
                color: 'red'
            });
        }
    };

    return (
        <div>
            {/* Header responsive */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Group align="center" gap="xs">
                        <Badge color="pink" size="lg">ADMIN</Badge>
                        <Group gap={8}>
                            <Text size="lg" fw={700} c="teal.4">
                                {user?.full_name}
                            </Text>
                            <Box
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#10B981',
                                    animation: `${pulseAnimation} 1s ease-in-out infinite`,
                                    willChange: 'opacity'
                                }}
                            />
                        </Group>
                    </Group>
                    <Text size="sm" c="dimmed">
                        {new Date().toLocaleDateString('es-MX', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </Text>
                </div>
                <Group gap="md">
                    {/* Botones solo para administradores - ocultos en móvil */}
                    {user?.role === 'admin' && (
                        <>
                            <Button 
                                color="blue" 
                                variant="light"
                                leftSection={<IconUsers size={16} />}
                                onClick={handleLoginAsTech}
                                size="sm"
                                style={{ display: isMobile ? 'none' : 'flex' }}
                            >
                                Vista Tech
                            </Button>
                            <Button 
                                color="green" 
                                variant="light"
                                leftSection={<IconChartBar size={16} />}
                                onClick={handleLoginAsClient}
                                size="sm"
                                style={{ display: isMobile ? 'none' : 'flex' }}
                            >
                                Vista Cliente
                            </Button>
                        </>
                    )}
                    <Button onClick={handleLogout} color="red" size="sm">
                        Salir
                    </Button>
                </Group>
            </Group>

            {/* Botones de vista para móvil - solo se muestran en móvil */}
            {user?.role === 'admin' && isMobile && (
                <Group gap="sm" grow mb="xl">
                    <Button 
                        color="blue" 
                        variant="light"
                        leftSection={<IconUsers size={18} />}
                        onClick={handleLoginAsTech}
                        size="md"
                        style={{ minHeight: 44 }}
                    >
                        <Text size="sm" fw={500}>Vista Tech</Text>
                    </Button>
                    <Button 
                        color="green" 
                        variant="light"
                        leftSection={<IconChartBar size={18} />}
                        onClick={handleLoginAsClient}
                        size="md"
                        style={{ minHeight: 44 }}
                    >
                        <Text size="sm" fw={500}>Vista Cliente</Text>
                    </Button>
                </Group>
            )}


            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
                {stats.map((stat) => (
                    <Card 
                        key={stat.title} 
                        padding="md" 
                    radius="md" 
                        bg={stat.bg}
                    style={{ 
                            minHeight: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                    >
                        <Group justify="space-between" align="flex-start" style={{ flex: 1 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text 
                                    c="dimmed" 
                                    tt="uppercase" 
                                    fw={700} 
                                    size="xs"
                                    style={{ lineHeight: 1.2 }}
                                >
                                    {stat.title}
                                </Text>
                                <Text 
                                    fw={700} 
                                    size="lg" 
                                    c="gray.1"
                                    style={{ lineHeight: 1.1 }}
                                >
                                    {stat.value}
                                </Text>
                                {stat.subtitle && (
                                    <Text 
                                        c="dimmed" 
                                        size="xs" 
                                        mt={4}
                                        style={{ lineHeight: 1.2 }}
                                    >
                                        {stat.subtitle}
                                    </Text>
                                )}
                            </div>
                            <div style={{ flexShrink: 0, marginLeft: 8 }}>
                                <stat.icon 
                                    size={24} 
                                    color={stat.color} 
                                />
                            </div>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            <Grid mt={50}>
                <Grid.Col span={{ base: 12, md: 12, lg: 8 }}>
                    <Paper withBorder radius="md" p="sm">
                        <Group justify="space-between" mb="md">
                            <Group>
                                <IconChartBar size={20} color="#666" />
                                <Text fw={500} size="md" c="gray.3">
                                Métricas de Proyectos
                            </Text>
                            </Group>
                            <Group gap="xs">
                                <Text size="sm" c="dimmed">Total de Proyectos:</Text>
                                <Text size="sm" fw={700}>{projectStats.total}</Text>
                            </Group>
                        </Group>

                        {/* Fila superior: Barras de estado de proyectos - Optimizado para móvil */}
                        <Stack gap="md" mb="lg">
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                                    {/* Barra de Proyectos En Progreso - Optimizado para móvil */}
                                    <Paper 
                                    p="md" 
                                        withBorder
                                        onClick={() => setInProgressModalOpen(true)}
                                        style={{ 
                                            cursor: 'pointer',
                                            minHeight: 80,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Group justify="space-between" mb={8} wrap="nowrap">
                                            <Text 
                                                size="sm" 
                                                fw={500}
                                                style={{ flex: 1, minWidth: 0 }}
                                            >
                                                En Progreso
                                            </Text>
                                            <Badge 
                                                size="md" 
                                                variant="filled" 
                                                color="violet"
                                                style={{ flexShrink: 0 }}
                                            >
                                                {projectStats.inProgress}
                                            </Badge>
                                        </Group>
                                        <div style={{ 
                                            width: '100%', 
                                        height: '8px', 
                                            backgroundColor: 'rgba(99, 102, 241, 0.2)', 
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${percentages.inProgress}%`,
                                                height: '100%',
                                                backgroundColor: '#6366F1',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                    </Paper>

                                    {/* Barra de Proyectos Activos - Optimizado para móvil */}
                                    <Paper 
                                    p="md" 
                                        withBorder
                                        onClick={() => handleProjectStatusClick('Activo')}
                                        style={{ 
                                            cursor: 'pointer',
                                            minHeight: 80,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Group justify="space-between" mb={8} wrap="nowrap">
                                            <Text 
                                                size="sm" 
                                                fw={500}
                                                style={{ flex: 1, minWidth: 0 }}
                                            >
                                                Activos
                                            </Text>
                                            <Badge 
                                                size="md" 
                                                variant="filled" 
                                                color="blue"
                                                style={{ flexShrink: 0 }}
                                            >
                                                {projectStats.active}
                                            </Badge>
                                        </Group>
                                        <div style={{ 
                                            width: '100%', 
                                        height: '8px', 
                                            backgroundColor: 'rgba(14, 165, 233, 0.2)', 
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${percentages.active}%`,
                                                height: '100%',
                                                backgroundColor: '#0EA5E9',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                    </Paper>

                                    {/* Barra de Proyectos Terminados - Optimizado para móvil */}
                                    <Paper 
                                    p="md" 
                                        withBorder
                                        onClick={handleCompletedProjectsClick}
                                        style={{ 
                                            cursor: 'pointer',
                                            minHeight: 80,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Group justify="space-between" mb={8} wrap="nowrap">
                                            <Text 
                                                size="sm" 
                                                fw={500}
                                                style={{ flex: 1, minWidth: 0 }}
                                            >
                                                Terminados
                                            </Text>
                                            <Badge 
                                                size="md" 
                                                variant="filled" 
                                                color="green"
                                                style={{ flexShrink: 0 }}
                                            >
                                                {projectStats.completed}
                                            </Badge>
                                        </Group>
                                        <div style={{ 
                                            width: '100%', 
                                        height: '8px', 
                                            backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${percentages.completed}%`,
                                                height: '100%',
                                                backgroundColor: '#10B981',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                    </Paper>
                            </SimpleGrid>
                                </Stack>

                        {/* Fila inferior: Métricas adicionales */}
                        <Grid>
                            <Grid.Col span={4}>
                                <Card 
                                    p="md" 
                                    radius="md" 
                                    withBorder
                                    style={{ 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                        }
                                    }}
                                >
                                        <Stack gap={0}>
                                        <Text fw={500} size="sm" c="dimmed">
                                                Tasa de Asistencia
                                            </Text>
                                            <Group justify="space-between" align="flex-end">
                                            <Text 
                                                size="xl" 
                                                fw={700} 
                                                c="teal"
                                            >
                                            {attendanceRate}%
                                        </Text>
                                            <Text size="sm" c="dimmed">
                                                    Promedio mensual
                                            </Text>
                                            </Group>
                                        </Stack>
                                    </Card>
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Card 
                                    p="md" 
                                    radius="md" 
                                    withBorder
                                    style={{ 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                                        }
                                    }}
                                >
                                        <Stack gap={0}>
                                        <Text fw={500} size="sm" c="dimmed">
                                                Productividad del Equipo
                                            </Text>
                                            <Group justify="space-between" align="flex-end">
                                            <Text 
                                                size="xl" 
                                                fw={700} 
                                                c="violet"
                                            >
                                                {serviceMetrics.performance.productivity}%
                                            </Text>
                                            <Text size="sm" c="dimmed">
                                                    Objetivos cumplidos
                                            </Text>
                                            </Group>
                                        </Stack>
                                    </Card>
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Card 
                                    p="md" 
                                    radius="md" 
                                    withBorder
                                    onClick={() => setProblemsModalOpen(true)}
                                    style={{ 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
                                        }
                                    }}
                                >
                                    <Stack gap={0}>
                                        <Text fw={500} size="sm" c="dimmed">
                                            Problemas Reportados
                                        </Text>
                                        <Group justify="space-between" align="flex-end">
                                            <Text size="xl" fw={700} c="yellow">
                                                {issuesLoading ? '...' : pendingIssuesCount}
                                            </Text>
                                            <Text size="sm" c="dimmed">
                                                Pendientes
                                            </Text>
                                        </Group>
                                </Stack>
                                </Card>
                            </Grid.Col>
                        </Grid>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                    <Paper 
                        p="md" 
                        radius="md" 
                        withBorder
                        style={{ 
                            backgroundColor: '#1A1B1E',
                        }}
                    >
                        <Text size="lg" fw={700} c="gray.2" mb="md">
                            Actividad Reciente
                        </Text>
                        <div 
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#373A40 #1A1B1E'
                            }}
                            className="custom-scrollbar"
                        >
                            {recentActivity.map((activity, index) => {
                                console.log('Timestamp from backend:', {
                                    raw: activity.timestamp,
                                    parsed: new Date(activity.timestamp),
                                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                });
                                
                                return (
                                <Group 
                                    key={index} 
                                    justify="space-between" 
                                    p="xs" 
                                    style={{ 
                                        borderRadius: '8px', 
                                        backgroundColor: '#25262B' 
                                    }}
                                >
                                    <Group>
                                        <ThemeIcon 
                                            size="lg" 
                                            radius="xl" 
                                            variant="light"
                                            color={activity.type === 'check-in' ? 'green' : 'red'}
                                        >
                                            <IconDoorEnter 
                                                size={18} 
                                                style={{ 
                                                    transform: activity.type === 'check-out' ? 'scaleX(-1)' : 'none' 
                                                }} 
                                            />
                                        </ThemeIcon>
                                        <div>
                                            <Text size="sm" fw={500}>
                                                {activity.user_name.split(' ')[0]} {activity.user_name.split(' ')[1]?.[0]}.
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                <Text span c="blue">{activity.project_name}</Text>
                                            </Text>
                                        </div>
                                    </Group>
                                    <Stack gap={0} align="flex-end">
                                        <Text size="sm" c="dimmed">
                                            {new Date(activity.timestamp).toLocaleTimeString('es-MX', {
                                                hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                            })}
                                        </Text>
                                        <Text size="xs" c={activity.type === 'check-in' ? 'teal' : 'red'}>
                                            {activity.type === 'check-in' ? '✓ Registrado' : '← Salida'}
                                        </Text>
                                    </Stack>
                                </Group>
                                );
                            })}
                        </div>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Añadir el Modal */}
            <Modal
                opened={inProgressModalOpen}
                onClose={() => setInProgressModalOpen(false)}
                title={
                    <Group justify="space-between" w="100%">
                        <Text fw={500} size="xl">Proyectos en Progreso</Text>
                        <Group gap="xl">
                            <Group gap="xs">
                                <ThemeIcon size="md" variant="light" color="blue">
                                    <IconUserCheck size={16} />
                                </ThemeIcon>
                                <Stack gap={0}>
                                    <Text size="sm" c="dimmed">Técnicos Trabajando</Text>
                                    <Text size="md" fw={500}>
                                        {projectsInProgress.reduce((total, project) => 
                                            total + project.technicians.filter(tech => 
                                                tech.status === 'presente'
                                            ).length
                                        , 0)} técnicos
                                    </Text>
                                </Stack>
                            </Group>
                            <Group gap="xs">
                                <ThemeIcon size="md" variant="light" color="teal">
                                    <IconChartBar size={16} />
                                </ThemeIcon>
                                <Stack gap={0}>
                                    <Text size="sm" c="dimmed">Partes Completadas Hoy</Text>
                                    <Text size="md" fw={500}>45 partes</Text>
                                </Stack>
                            </Group>
                        </Group>
                    </Group>
                }
                size="90%"
            >
                <Carousel
                    slideSize="33.333333%"
                    slideGap="xl"
                    align="start"
                    slidesToScroll={3}
                    withControls
                    loop
                    styles={{
                        control: {
                            '&[data-inactive]': {
                                opacity: 0,
                                cursor: 'default',
                            },
                            border: '2px solid #2C2E33',
                            backgroundColor: '#1A1B1E',
                        },
                        slide: {
                            padding: '8px',
                        }
                    }}
                    mt="xl"
                >
                    {projectsInProgress.map((project) => (
                        <Carousel.Slide key={project.id}>
                            <Card p="xl" radius="md" withBorder h="100%">
                                <Stack gap="md">
                                    <Group justify="space-between" mb={-5} align="flex-start" wrap="nowrap">
                                        <Box maw="70%">
                                            <Text fw={500} size="xl" truncate>
                                                {project.name}
                                            </Text>
                                        </Box>
                                        <Badge 
                                            color="blue" 
                                            variant="light" 
                                            size="xl"
                                            style={{ 
                                                flexShrink: 0,
                                                marginLeft: 'auto'
                                            }}
                                        >
                                            {project.progress}%
                                        </Badge>
                                    </Group>

                                    <Group gap="xs" mb={5}>
                                        <IconMapPin size={18} color="#666" />
                                        <Text size="sm" c="dimmed" truncate>
                                            {project.location}
                                        </Text>
                                    </Group>

                                    <div style={{ 
                                        width: '100%', 
                                        height: '4px', 
                                        backgroundColor: 'rgba(99, 102, 241, 0.2)', 
                                        borderRadius: '2px',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${project.progress}%`,
                                            height: '100%',
                                            backgroundColor: '#6366F1',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>

                                    <Divider my={8} />

                                    <Group grow align="flex-start" gap="xs">
                                        <Stack gap={4}>
                                            <Text size="sm" fw={500}>Partes</Text>
                                            <Group gap={4}>
                                                <Text size="lg" fw={600} c="teal">
                                                    {project.completed_parts}
                                                </Text>
                                                <Text size="sm" c="dimmed">/</Text>
                                                <Text size="sm" c="dimmed">
                                                    {project.total_parts}
                                                </Text>
                                            </Group>
                                        </Stack>
                                        <Stack gap={4}>
                                            <Text size="sm" fw={500}>Técnicos</Text>
                                            <Text 
                                                size="sm" 
                                                c="dimmed"
                                                style={{ 
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                    '&:hover': {
                                                        color: '#228BE6'
                                                    }
                                                }}
                                                onClick={() => setSelectedProjectTechs(project)}
                                            >
                                                {project.technicians.length} asignados
                                            </Text>
                                        </Stack>
                                    </Group>

                                    <Divider my={8} />

                                    <Group justify="space-between" align="center">
                                        <Group gap="xs" align="center">
                                            <ThemeIcon size="md" variant="light" color="orange">
                                                <IconCalendar size={16} />
                                            </ThemeIcon>
                                            <Stack gap={0}>
                                                <Text size="sm" c="dimmed">Próxima Reunión</Text>
                                                <Text size="md" fw={500} c="orange">
                                                    {meetingTimes[project.id]} hrs
                                                </Text>
                                            </Stack>
                                        </Group>
                                        
                                        <ActionIcon
                                            variant="light"
                                            color="blue"
                                            size="lg"
                                            onClick={() => setSelectedProjectEquipment(project)}
                                            title="Ver Equipo"
                                        >
                                            <IconTools size={20} />
                                        </ActionIcon>
                                    </Group>

                                    <Divider my={8} />

                                    <Stack gap={4}>
                                        <Group gap="xs" align="center">
                                            <ThemeIcon size="md" variant="light" color="gray">
                                                <IconUser size={16} />
                                            </ThemeIcon>
                                            <Text size="sm" truncate>
                                                {project.plantContact.name}
                                            </Text>
                                        </Group>
                                        <Group gap="xs" align="center" ml={24}>
                                            <Text size="sm" c="dimmed">
                                                {project.plantContact.phone}
                                            </Text>
                                        </Group>
                                        <Group gap="xs" align="center" ml={24}>
                                            <Text size="sm" c="dimmed">
                                                {project.plantContact.email}
                                            </Text>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Card>
                        </Carousel.Slide>
                    ))}
                </Carousel>
            </Modal>

            {/* Modal de Técnicos */}
            <Modal
                opened={selectedProjectTechs !== null}
                onClose={() => setSelectedProjectTechs(null)}
                title={`Técnicos Asignados - ${selectedProjectTechs?.name}`}
                size="md"
            >
                <SimpleGrid cols={3} spacing="lg">
                    {selectedProjectTechs?.technicians.map((tech) => (
                        <Card key={tech.id} p="sm" radius="md" withBorder>
                            <Stack align="center" gap="xs">
                                <Avatar
                                    src={tech.photo}
                                    size="xl"
                                    radius="50%"
                                />
                                <Group gap="xs" align="center">
                                    <Text size="sm" fw={500} ta="center">
                                        {tech.name}
                                    </Text>
                                    <Box
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            backgroundColor: tech.status === 'presente' 
                                                ? '#40C057' 
                                                : tech.status === 'ausente'
                                                ? '#FA5252'
                                                : '#FCC419',
                                        }}
                                    />
                                </Group>
                                <Group gap="xs">
                                    <ActionIcon
                                        variant="light"
                                        color="blue"
                                        onClick={() => window.location.href = `tel:${tech.phone}`}
                                    >
                                        <IconPhone size={16} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="light"
                                        color="teal"
                                        onClick={() => window.location.href = `mailto:${tech.email}`}
                                    >
                                        <IconMail size={16} />
                                    </ActionIcon>
                                </Group>
                            </Stack>
                        </Card>
                    ))}
                </SimpleGrid>
            </Modal>

            {/* Modal de Equipo */}
            <Modal
                opened={selectedProjectEquipment !== null}
                onClose={() => setSelectedProjectEquipment(null)}
                title={`Equipo en Uso - ${selectedProjectEquipment?.name}`}
                size="sm"
            >
                <Stack gap="md">
                    {selectedProjectEquipment?.equipment.map((item) => (
                        <Paper key={item.id} p="xs" withBorder>
                            <Group justify="space-between" align="flex-start">
                                <Group gap="sm">
                                    <ThemeIcon 
                                        size="md" 
                                        variant="light" 
                                        color={
                                            item.type === 'laptop' ? 'blue' : 
                                            item.type === 'tool' ? 'orange' : 
                                            'teal'
                                        }
                                    >
                                        <IconTools size={16} />
                                    </ThemeIcon>
                                    <Text size="sm">{item.name}</Text>
                                </Group>
                                <Text 
                                    size="sm" 
                                    c="blue"
                                    style={{ 
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        '&:hover': {
                                            opacity: 0.7
                                        }
                                    }}
                                    onClick={() => setSelectedEquipment(item)}
                                >
                                    {item.quantity} {item.quantity > 1 ? 'unidades' : 'unidad'}
                                </Text>
                            </Group>
                        </Paper>
                    ))}
                    
                    <Divider my="xs" />
                    
                    <Group justify="space-between">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed">Estaciones Completas</Text>
                            <Text size="sm" fw={500} c="teal">3 funcionando</Text>
                        </Stack>
                        <Stack gap={0} align="flex-end">
                            <Text size="xs" c="dimmed">Partes por Hora</Text>
                            <Text size="sm" fw={500} c="blue">12 pph</Text>
                        </Stack>
                    </Group>
                </Stack>
            </Modal>

            {/* Nuevo Modal para Números de Serie */}
            <Modal
                opened={selectedEquipment !== null}
                onClose={() => setSelectedEquipment(null)}
                title={`Números de Serie - ${selectedEquipment?.name}`}
                size="xs"
            >
                <Stack gap="md">
                    {selectedEquipment?.serialNumbers.map((serial, index) => (
                        <Paper key={index} p="xs" withBorder>
                            <Group justify="space-between" align="center">
                                <Group gap="sm">
                                    <ThemeIcon 
                                        size="sm" 
                                        variant="light" 
                                        color={selectedEquipment.type === 'laptop' ? 'blue' : 
                                               selectedEquipment.type === 'tool' ? 'orange' : 
                                               'teal'}
                                    >
                                        <Text size="xs" fw={700}>{index + 1}</Text>
                                    </ThemeIcon>
                                    <Text size="sm">{serial}</Text>
                                </Group>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    onClick={() => {
                                        // Copiar al portapapeles
                                        navigator.clipboard.writeText(serial);
                                        notifications.show({
                                            title: 'Copiado',
                                            message: 'Número de serie copiado al portapapeles',
                                            color: 'green'
                                        });
                                    }}
                                >
                                    <IconCopy size={16} />
                                </ActionIcon>
                            </Group>
                        </Paper>
                    ))}
                </Stack>
            </Modal>

            {/* Modal de Problemas Reportados */}
            <Modal
                opened={problemsModalOpen}
                onClose={() => setProblemsModalOpen(false)}
                title={
                    <Stack gap="sm" w="100%">
                        <Group justify="space-between" w="100%" wrap="nowrap">
                            <Text 
                                fw={500} 
                                size="lg"
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                Problemas Reportados
                            </Text>
                            <Badge 
                                size="md" 
                                variant="filled" 
                                color="yellow"
                                style={{ flexShrink: 0 }}
                            >
                                {getFilteredProblems().length} problemas
                            </Badge>
                        </Group>
                        <Button
                            variant="light"
                            color="blue"
                            size="sm"
                            leftSection={<IconShare size={16} />}
                            onClick={shareAllProblems}
                            fullWidth
                            style={{ minHeight: 44 }} // Altura mínima para touch
                        >
                            Compartir Todo
                        </Button>
                    </Stack>
                }
                size="90%"
                styles={{
                    content: {
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    },
                    body: {
                        flex: 1,
                        overflow: 'auto',
                        padding: 0
                    }
                }}
            >
                {/* Filtros - Optimizados para móvil */}
                <Paper p="md" radius="md" withBorder mb="md">
                    <Group justify="space-between" mb="md" wrap="nowrap">
                        <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                            <IconFilter size={18} color="#666" />
                            <Text fw={500} size="sm" c="gray.3">
                                Filtros
                            </Text>
                        </Group>
                        <Button
                            variant="light"
                            color="gray"
                            size="xs"
                            leftSection={<IconX size={14} />}
                            onClick={clearFilters}
                            style={{ flexShrink: 0 }}
                        >
                            Limpiar
                        </Button>
                    </Group>

                    <Grid>
                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                            <Autocomplete
                                label="Proyecto"
                                placeholder="Buscar por proyecto..."
                                value={projectFilter}
                                onChange={setProjectFilter}
                                data={getProjectAutocompleteOptions(projects)}
                                leftSection={<IconSearch size={16} />}
                                size="sm"
                                limit={10}
                                maxDropdownHeight={200}
                                styles={{
                                    input: { minHeight: 44 } // Altura mínima para touch
                                }}
                            />
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                            <Select
                                label="Tipo de Problema"
                                placeholder="Seleccionar tipo"
                                value={typeFilter}
                                onChange={(value) => setTypeFilter(value || '')}
                                data={typeOptions}
                                size="sm"
                                clearable
                                styles={{
                                    input: { minHeight: 44 } // Altura mínima para touch
                                }}
                            />
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                            <Select
                                label="Estado"
                                placeholder="Seleccionar estado"
                                value={statusFilter}
                                onChange={(value) => setStatusFilter(value || '')}
                                data={statusOptions}
                                size="sm"
                                clearable
                                styles={{
                                    input: { minHeight: 44 } // Altura mínima para touch
                                }}
                            />
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                            <DateInput
                                label="Fecha"
                                placeholder="Seleccionar fecha"
                                value={dateFilter}
                                onChange={setDateFilter}
                                size="sm"
                                clearable
                                styles={{
                                    input: { minHeight: 44 } // Altura mínima para touch
                                }}
                            />
                        </Grid.Col>
                    </Grid>
                </Paper>
                <Stack gap="md" p="md">
                    {getFilteredProblems().map((problem) => (
                        <Card 
                            key={problem.id} 
                            p="md" 
                            radius="md" 
                            withBorder
                            style={{ minHeight: 120 }}
                        >
                            <Stack gap="md">
                                {/* Header del problema - Optimizado para móvil */}
                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                    <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                                        <ThemeIcon 
                                            size="md"
                                            variant="light" 
                                            color={
                                                problem.type === 'sin_bateria' ? 'red' :
                                                problem.type === 'sin_llaves' ? 'orange' :
                                                problem.type === 'software' ? 'blue' :
                                                'gray'
                                            }
                                            style={{ flexShrink: 0 }}
                                        >
                                            <IconTools size={18} />
                                        </ThemeIcon>
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <Text 
                                                fw={600} 
                                                size="sm" 
                                                c="white"
                                                style={{ 
                                                    lineHeight: 1.2,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {getTypeLabel(problem.type)}
                                            </Text>
                                            <Text 
                                                size="xs" 
                                                c="dimmed"
                                                style={{ lineHeight: 1.2 }}
                                            >
                                                Reportado el {new Date(problem.date_reported).toLocaleDateString('es-MX')}
                                            </Text>
                                        </Box>
                                    </Group>
                                    <Group gap="sm" style={{ flexShrink: 0 }}>
                                        <ActionIcon
                                            variant="light"
                                            color="blue"
                                            size="md"
                                            onClick={() => shareIndividualProblem(problem)}
                                            title="Compartir problema"
                                            style={{ minHeight: 36, minWidth: 36 }} // Tamaño mínimo para touch
                                        >
                                            <IconShare size={16} />
                                        </ActionIcon>
                                    <Badge 
                                        color={
                                            problem.status === 'pendiente' ? 'red' :
                                            problem.status === 'en-revision' ? 'yellow' :
                                            'green'
                                        }
                                        variant="light"
                                            size="sm"
                                    >
                                        {problem.status === 'pendiente' ? 'Pendiente' :
                                         problem.status === 'en-revision' ? 'En Revisión' :
                                         'Resuelto'}
                                    </Badge>
                                    </Group>
                                </Group>

                                {/* Información del problema - Optimizada para móvil */}
                                <Stack gap="xs">
                                    <Group gap="xs" wrap="nowrap">
                                        <Text 
                                            size="xs" 
                                            c="dimmed"
                                            style={{ flexShrink: 0, minWidth: 'fit-content' }}
                                        >
                                            No. de Parte / VIN:
                                        </Text>
                                        <Text 
                                            size="xs" 
                                            fw={500} 
                                            c="white"
                                            style={{ 
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {problem.part_number_vin}
                                        </Text>
                                            </Group>
                                    <Group gap="xs" wrap="nowrap">
                                        <Text 
                                            size="xs" 
                                            c="dimmed"
                                            style={{ flexShrink: 0, minWidth: 'fit-content' }}
                                        >
                                            Proyecto:
                                        </Text>
                                        <Text 
                                            size="xs" 
                                            fw={500} 
                                            c="white"
                                            style={{ 
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {problem.project}
                                        </Text>
                                            </Group>
                                    <Group gap="xs" wrap="nowrap">
                                        <Text 
                                            size="xs" 
                                            c="dimmed"
                                            style={{ flexShrink: 0, minWidth: 'fit-content' }}
                                        >
                                            Ubicación:
                                        </Text>
                                        <Text
                                            size="xs"
                                            fw={500}
                                            c="blue"
                                            style={{
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                textDecorationColor: 'rgba(255, 255, 255, 0.3)',
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onClick={() => openLocationInMaps(problem.location)}
                                            title="Hacer clic para abrir en mapas"
                                        >
                                            {problem.location}
                                        </Text>
                                            </Group>
                                        </Stack>
                            </Stack>
                        </Card>
                    ))}
                </Stack>
            </Modal>

            {/* Agregar el botón de retorno si estamos en modo simulación */}
            {localStorage.getItem('developer_token') && (
                <Button
                    onClick={handleReturnToDeveloper}
                    color="yellow"
                    style={{ position: 'fixed', bottom: '20px', right: '20px' }}
                >
                    Regresar a Developer
                </Button>
            )}
        </div>
    );
};

export default Dashboard;