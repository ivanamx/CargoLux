import { Grid, Paper, Text, Group, RingProgress, SimpleGrid, Card, Title, Stack, Badge, Button, ThemeIcon, Box, Modal, SimpleGrid as MantineSimpleGrid, Divider, Avatar, ActionIcon, Progress } from '@mantine/core';
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
    IconCopy
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useEmployees } from '../context/EmployeeContext';
import type { Employee } from './Employees'; // Importar el tipo Employee
import { attendanceService } from '../services/attendance';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RecentActivity } from '../types';
import { keyframes } from '@emotion/react';
import { notifications } from '@mantine/notifications';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { useProjects } from '../context/ProjectContext';

const calculateStats = (employees: Employee[]) => [
    { 
        title: 'TOTAL TECNICOS', 
        value: employees.length.toString(), 
        icon: IconUsers, 
        color: '#3B82F6', 
        bg: 'rgba(59, 130, 246, 0.1)' 
    },
    { 
        title: 'PRESENTES', 
        value: employees.filter(emp => emp.status === 'presente').length.toString(), 
        icon: IconUserCheck, 
        color: '#10B981', 
        bg: 'rgba(16, 185, 129, 0.1)' 
    },
    { 
        title: 'AUSENTES', 
        value: employees.filter(emp => emp.status === 'ausente').length.toString(), 
        icon: IconUserX, 
        color: '#EF4444', 
        bg: 'rgba(239, 68, 68, 0.1)' 
    },
    { 
        title: 'TARDE', // Cambiado de "LLEGADAS TARDE" a "INCAPACIDAD" para coincidir con los estados disponibles
        value: employees.filter(emp => emp.status === 'incapacidad').length.toString(), 
        icon: IconClock, 
        color: '#F59E0B', 
        bg: 'rgba(245, 158, 11, 0.1)' 
    },
];

const attendanceRate = 78;

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
    totalParts: number;
    completedParts: number;
    technicians: Technician[];  // Cambiar de string[] a Technician[]
    plantContact: {
        name: string;
        phone: string;
        email: string;
    };
    equipment: ProjectEquipment[];  // Añadir esta línea
}

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { employees } = useEmployees();
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const stats = calculateStats(employees);
    const [inProgressModalOpen, setInProgressModalOpen] = useState(false);
    const [selectedProjectTechs, setSelectedProjectTechs] = useState<ProjectInProgress | null>(null);
    const [selectedProjectEquipment, setSelectedProjectEquipment] = useState<ProjectInProgress | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<ProjectEquipment | null>(null);
    const [meetingTimes] = useState<{[key: number]: string}>({
        1: '13:00',  // Horario para proyecto 1
        2: '15:30',  // Horario para proyecto 2
        3: '14:15',  // Horario para proyecto 3
    });
    const { projects } = useProjects();  // Obtener proyectos del contexto
    
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

    // Actualizar los datos de ejemplo
    const projectsInProgress: ProjectInProgress[] = [
        {
            id: 1,
            name: 'Mantenimiento APTIV',
            location: 'Planta 3 - Línea A',
            progress: 65,
            totalParts: 100,
            completedParts: 65,
            technicians: [
                {
                    id: 1,
                    name: 'Juan Pérez',
                    photo: 'https://i.pravatar.cc/150?img=1',
                    email: 'juan.perez@empresa.com',
                    phone: '614-123-4567',
                    status: 'presente'
                },
                {
                    id: 2,
                    name: 'María López',
                    photo: 'https://i.pravatar.cc/150?img=2',
                    email: 'maria.lopez@empresa.com',
                    phone: '614-234-5678',
                    status: 'ausente'
                },
                // ... otros técnicos
            ],
            plantContact: {
                name: 'Roberto Gómez',
                phone: '614-123-4567',
                email: 'roberto.gomez@aptiv.com'
            },
            equipment: [
                { 
                    id: 1, 
                    name: 'Laptop', 
                    quantity: 3, 
                    type: 'laptop', 
                    partNumber: 'LT-2024-001',
                    serialNumbers: ['LAP-2024-001', 'LAP-2024-002', 'LAP-2024-003']
                },
                { 
                    id: 2, 
                    name: 'Pulsar', 
                    quantity: 3, 
                    type: 'tool', 
                    partNumber: 'PL-2024-002',
                    serialNumbers: ['PUL-2024-001', 'PUL-2024-002', 'PUL-2024-003']
                },
                { 
                    id: 3, 
                    name: 'Fuente de Poder', 
                    quantity: 1, 
                    type: 'equipment', 
                    partNumber: 'FP-2024-003',
                    serialNumbers: ['FP-2024-001']
                },
                { 
                    id: 4, 
                    name: 'Arnés', 
                    quantity: 3, 
                    type: 'equipment', 
                    partNumber: 'AR-2024-004',
                    serialNumbers: ['AR-2024-001', 'AR-2024-002', 'AR-2024-003']
                }
            ]
        },
        {
            id: 2,
            name: 'Instalación Lear',
            location: 'Planta Norte',
            progress: 45,
            totalParts: 80,
            completedParts: 36,
            technicians: [
                {
                    id: 3,
                    name: 'Ana García',
                    photo: 'https://i.pravatar.cc/150?img=3',
                    email: 'ana.garcia@empresa.com',
                    phone: '614-345-6789',
                    status: 'presente'
                },
                {
                    id: 4,
                    name: 'Luis Torres',
                    photo: 'https://i.pravatar.cc/150?img=4',
                    email: 'luis.torres@empresa.com',
                    phone: '614-456-7890',
                    status: 'presente'
                }
            ],
            plantContact: {
                name: 'Patricia Sánchez',
                phone: '614-987-6543',
                email: 'patricia.sanchez@lear.com'
            },
            equipment: [
                { 
                    id: 5, 
                    name: 'Laptop', 
                    quantity: 2, 
                    type: 'laptop', 
                    partNumber: 'LT-2024-005',
                    serialNumbers: ['LAP-2024-004', 'LAP-2024-005']
                },
                { 
                    id: 6, 
                    name: 'Herramienta', 
                    quantity: 5, 
                    type: 'tool', 
                    partNumber: 'PL-2024-006',
                    serialNumbers: ['HER-2024-001', 'HER-2024-002', 'HER-2024-003', 'HER-2024-004', 'HER-2024-005']
                },
                { 
                    id: 7, 
                    name: 'Equipo de Seguridad', 
                    quantity: 1, 
                    type: 'equipment', 
                    partNumber: 'FP-2024-007',
                    serialNumbers: ['SEG-2024-001']
                },
                { 
                    id: 8, 
                    name: 'Guantes', 
                    quantity: 3, 
                    type: 'equipment', 
                    partNumber: 'AR-2024-008',
                    serialNumbers: ['GUA-2024-001', 'GUA-2024-002', 'GUA-2024-003']
                }
            ]
        },
        {
            id: 3,
            name: 'Actualización Sistema',
            location: 'Planta Sur',
            progress: 30,
            totalParts: 50,
            completedParts: 15,
            technicians: [
                {
                    id: 5,
                    name: 'Diego Martínez',
                    photo: 'https://i.pravatar.cc/150?img=5',
                    email: 'diego.martinez@empresa.com',
                    phone: '614-567-8901',
                    status: 'ausente'
                },
                {
                    id: 6,
                    name: 'Sofia Ruiz',
                    photo: 'https://i.pravatar.cc/150?img=6',
                    email: 'sofia.ruiz@empresa.com',
                    phone: '614-678-9012',
                    status: 'presente'
                }
            ],
            plantContact: {
                name: 'Fernando López',
                phone: '614-456-7890',
                email: 'fernando.lopez@sistema.com'
            },
            equipment: [
                { 
                    id: 9, 
                    name: 'Laptop', 
                    quantity: 1, 
                    type: 'laptop', 
                    partNumber: 'LT-2024-009',
                    serialNumbers: ['LAP-2024-006']
                },
                { 
                    id: 10, 
                    name: 'Herramienta', 
                    quantity: 3, 
                    type: 'tool', 
                    partNumber: 'PL-2024-010',
                    serialNumbers: ['HER-2024-006', 'HER-2024-007', 'HER-2024-008']
                },
                { 
                    id: 11, 
                    name: 'Equipo de Seguridad', 
                    quantity: 1, 
                    type: 'equipment', 
                    partNumber: 'FP-2024-011',
                    serialNumbers: ['SEG-2024-002']
                },
                { 
                    id: 12, 
                    name: 'Guantes', 
                    quantity: 2, 
                    type: 'equipment', 
                    partNumber: 'AR-2024-012',
                    serialNumbers: ['GUA-2024-004', 'GUA-2024-005']
                }
            ]
        }
    ];

    useEffect(() => {
        // Cargar actividad reciente
        const loadRecentActivity = async () => {
            try {
                const activity = await attendanceService.getRecentActivity();
                setRecentActivity(activity);
            } catch (error) {
                console.error('Error loading recent activity:', error);
            }
        };

        loadRecentActivity();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleProjectStatusClick = (status: string) => {
        navigate(`/projects?status=${status}`);
    };

    return (
        <div>
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
                                    animation: `${pulseAnimation} 1s ease-in-out infinite`,  // Reducir a 1s para hacerlo más rápido
                                    willChange: 'opacity'  // Optimizar la animación
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
                <Button onClick={handleLogout} color="red">
                    Cerrar Sesión
                </Button>
            </Group>
            <Group justify="space-between" mb="xl">
                <Title order={2} size="h1" c="gray.3">
                    Panel de Control
                </Title>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                {stats.map((stat) => (
                    <Card key={stat.title} padding="lg" radius="md" bg={stat.bg}>
                        <Group justify="space-between">
                            <div>
                                <Text c="dimmed" tt="uppercase" fw={700} size="xs">
                                    {stat.title}
                                </Text>
                                <Text fw={700} size="xl" c="gray.1">
                                    {stat.value}
                                </Text>
                            </div>
                            <stat.icon size={32} color={stat.color} />
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            <Grid mt={50}>
                <Grid.Col span={{ base: 12, md: 12, lg: 8 }}>
                    <Paper withBorder radius="md" p="md">
                        <Group mb="lg">
                            <IconChartBar size={22} color="#666" />
                            <Text fw={500} size="lg" c="gray.3">
                                Métricas de Proyectos
                            </Text>
                        </Group>

                        <Grid>
                            {/* Gráfico de Estado de Proyectos */}
                            <Grid.Col span={6}>
                                <Stack align="stretch">
                                    {/* Barra de Proyectos En Progreso */}
                                    <Paper 
                                        p="xs" 
                                        withBorder
                                        onClick={() => setInProgressModalOpen(true)}
                                    >
                                        <Group justify="space-between" mb={4}>
                                            <Text size="sm">En Progreso</Text>
                                            <Badge size="lg" variant="filled" color="violet">
                                                {projectStats.inProgress}
                                            </Badge>
                                        </Group>
                                        <div style={{ 
                                            width: '100%', 
                                            height: '24px', 
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

                                    {/* Barra de Proyectos Activos */}
                                    <Paper 
                                        p="xs" 
                                        withBorder
                                        onClick={() => handleProjectStatusClick('activo')}
                                    >
                                        <Group justify="space-between" mb={4}>
                                            <Text size="sm">Activos</Text>
                                            <Badge size="lg" variant="filled" color="blue">
                                                {projectStats.active}
                                            </Badge>
                                        </Group>
                                        <div style={{ 
                                            width: '100%', 
                                            height: '24px', 
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

                                    {/* Barra de Proyectos Terminados */}
                                    <Paper 
                                        p="xs" 
                                        withBorder
                                        onClick={() => handleProjectStatusClick('completado')}
                                    >
                                        <Group justify="space-between" mb={4}>
                                            <Text size="sm">Terminados</Text>
                                            <Badge size="lg" variant="filled" color="green">
                                                {projectStats.completed}
                                            </Badge>
                                        </Group>
                                        <div style={{ 
                                            width: '100%', 
                                            height: '24px', 
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

                                    <Group gap="xs" justify="center" mt="sm">
                                        <Text size="xs" c="dimmed">Total de Proyectos:</Text>
                                        <Text size="xs" fw={700}>{projectStats.total}</Text>
                                    </Group>
                                </Stack>
                            </Grid.Col>

                            {/* Cards de Métricas */}
                            <Grid.Col span={6}>
                                <Stack gap="md">
                                    <Card p="md" radius="md" withBorder>
                                        <Group justify="space-between" mb="xs">
                                            <Text fw={500} size="lg" c="gray.3">Tasa de Asistencia</Text>
                                            <ThemeIcon size={32} radius="xl" color="teal" variant="light">
                                                <IconUserCheck size={20} />
                                            </ThemeIcon>
                                        </Group>
                                        <Text size="xl" fw={700} c="teal">
                                            {attendanceRate}%
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            Promedio mensual de asistencia
                                            </Text>
                                    </Card>

                                    <Card p="md" radius="md" withBorder>
                                        <Group justify="space-between" mb="xs">
                                            <Text fw={500} size="lg" c="gray.3">Productividad del Equipo</Text>
                                            <ThemeIcon size={32} radius="xl" color="violet" variant="light">
                                                <IconChartBar size={20} />
                                            </ThemeIcon>
                                        </Group>
                                        <Text size="xl" fw={700} c="violet">
                                                {serviceMetrics.performance.productivity}%
                                            </Text>
                                        <Text size="sm" c="dimmed">
                                            Basado en objetivos cumplidos
                                            </Text>
                                    </Card>
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                    <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                        <Text size="lg" fw={700} c="gray.2" mb="md">
                            Actividad Reciente
                        </Text>
                        <Stack gap="xs">
                            {recentActivity.map((activity, index) => (
                                <Group key={index} justify="space-between" p="xs" style={{ borderRadius: '8px', backgroundColor: '#25262B' }}>
                                    <Group>
                                        <ThemeIcon 
                                            size="lg" 
                                            radius="xl" 
                                            variant="light"
                                            color={activity.status === 'presente' ? 'green' : 'red'}
                                        >
                                            {activity.user_name.split(' ')[1]?.[0]?.toUpperCase() || activity.user_name[0].toUpperCase()}
                                        </ThemeIcon>
                                        <div>
                                            <Text size="sm" fw={500}>
                                                {activity.user_name.split(' ')[0]} {activity.user_name.split(' ')[1]?.[0]}.
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {activity.status.toUpperCase()}
                                            </Text>
                                        </div>
                                    </Group>
                                    <Text size="sm" c="dimmed">
                                        {new Date(activity.timestamp).toLocaleTimeString('es-MX', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Text>
                                </Group>
                            ))}
                        </Stack>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Añadir el Modal */}
            <Modal
                opened={inProgressModalOpen}
                onClose={() => setInProgressModalOpen(false)}
                title={
                    <Group justify="space-between" w="100%">
                        <Text fw={500} size="lg">Proyectos en Progreso</Text>
                        <Group gap="xl">
                            <Group gap="xs">
                                <ThemeIcon size="sm" variant="light" color="blue">
                                    <IconUserCheck size={12} />
                                </ThemeIcon>
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed">Técnicos Trabajando</Text>
                                    <Text size="sm" fw={500}>
                                        {projectsInProgress.reduce((total, project) => 
                                            total + project.technicians.filter(tech => 
                                                tech.status === 'presente'
                                            ).length
                                        , 0)} técnicos
                                    </Text>
                                </Stack>
                            </Group>
                            <Group gap="xs">
                                <ThemeIcon size="sm" variant="light" color="teal">
                                    <IconChartBar size={12} />
                                </ThemeIcon>
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed">Partes Completadas Hoy</Text>
                                    <Text size="sm" fw={500}>45 partes</Text>
                                </Stack>
                            </Group>
                        </Group>
                    </Group>
                }
                size="xl"
            >
                <Carousel
                    slideSize="33.333333%"
                    slideGap="md"
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
                        }
                    }}
                >
                    {projectsInProgress.map((project) => (
                        <Carousel.Slide key={project.id}>
                            <Card p="sm" radius="md" withBorder h="100%">
                                <Stack gap="xs">
                                    {/* Encabezado */}
                                    <Group justify="space-between" mb={-5} align="flex-start" wrap="nowrap">
                                        <Box maw="70%">  {/* Reducir el ancho máximo para dejar espacio al badge */}
                                            <Text fw={500} size="md" truncate>
                                                {project.name}
                                            </Text>
                                        </Box>
                                        <Badge 
                                            color="blue" 
                                            variant="light" 
                                            size="sm"
                                            style={{ 
                                                flexShrink: 0,
                                                marginLeft: 'auto'  // Asegura que esté a la derecha
                                            }}
                                        >
                                            {project.progress}%
                                        </Badge>
                                    </Group>

                                    {/* Ubicación */}
                                    <Group gap="xs" mb={5}>
                                        <IconMapPin size={14} color="#666" />
                                        <Text size="xs" c="dimmed" truncate>
                                            {project.location}
                                        </Text>
                                    </Group>

                                    {/* Barra de Progreso */}
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

                                    {/* Partes y Técnicos en 2 columnas */}
                                    <Group grow align="flex-start" gap="xs">
                                        <Stack gap={4}>
                                            <Text size="xs" fw={500}>Partes</Text>
                                            <Group gap={4}>
                                                <Text size="sm" fw={600} c="teal">
                                                    {project.completedParts}
                                                </Text>
                                                <Text size="xs" c="dimmed">/</Text>
                                                <Text size="xs" c="dimmed">
                                                    {project.totalParts}
                                                </Text>
                                            </Group>
                                        </Stack>
                                        <Stack gap={4}>
                                            <Text size="xs" fw={500}>Técnicos</Text>
                                            <Text 
                                                size="xs" 
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

                                    {/* Reunión y Equipo en la misma fila */}
                                    <Group justify="space-between" align="center">
                                        <Group gap="xs" align="center">
                                            <ThemeIcon size="sm" variant="light" color="orange">
                                                <IconCalendar size={12} />
                                            </ThemeIcon>
                                            <Stack gap={0}>
                                                <Text size="xs" c="dimmed">Próxima Reunión</Text>
                                                <Text size="sm" fw={500} c="orange">
                                                    {meetingTimes[project.id]} hrs
                                                </Text>
                                            </Stack>
                                        </Group>
                                        
                                        <ActionIcon
                                            variant="light"
                                            color="blue"
                                            size="md"
                                            onClick={() => setSelectedProjectEquipment(project)}
                                            title="Ver Equipo"
                                        >
                                            <IconTools size={16} />
                                        </ActionIcon>
                                    </Group>

                                    <Divider my={8} />

                                    {/* Contacto de Planta */}
                                    <Stack gap={4}>
                                        <Group gap="xs" align="center">
                                            <ThemeIcon size="sm" variant="light" color="gray">
                                                <IconUser size={12} />
                                            </ThemeIcon>
                                            <Text size="xs" truncate>
                                                {project.plantContact.name}
                                            </Text>
                                        </Group>
                                        <Group gap="xs" align="center" ml={24}>
                                            <Text size="xs" c="dimmed">
                                                {project.plantContact.phone}
                                            </Text>
                                        </Group>
                                        <Group gap="xs" align="center" ml={24}>
                                            <Text size="xs" c="dimmed">
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
        </div>
    );
};

export default Dashboard;