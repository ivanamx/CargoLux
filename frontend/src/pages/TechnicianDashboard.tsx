import { useState, useEffect } from 'react';
import { 
    Paper, Button, Text, Group, Stack, Badge, Grid, Card, 
    RingProgress, ThemeIcon, SimpleGrid, Modal, Collapse,
    Select, Alert, Divider, Textarea, TextInput
} from '@mantine/core';
import { 
    IconUserCheck, IconClock, IconCalendarTime, 
    IconBriefcase, IconTools, IconDoorEnter, 
    IconClockHour4, IconFiles, IconClipboardList, 
    IconUserCircle, IconHeadset, IconChevronDown, IconChevronUp,
    IconAlertCircle, IconArrowLeft, IconFileTypePdf, IconFileTypeDoc, IconFileTypeXls, IconDownload, IconPlus, IconSend
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { attendanceService } from '../services/attendance';
import { useAuth } from '../context/AuthContext';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { modals } from '@mantine/modals';
import { DateInput } from '@mantine/dates';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../context/LocationContext';

export default function TechnicianDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [checkInModalOpen, setCheckInModalOpen] = useState(false);
    const { user, logout } = useAuth();
    const [menuExpanded, setMenuExpanded] = useState(false);
    const [assignedProjects, setAssignedProjects] = useState([
        { id: 1, name: 'Proyecto APTIV', location: 'Planta 3 - Línea A' },
        { id: 2, name: 'Proyecto Lear', location: 'Planta Norte' }
    ]);
    const [selectedProject, setSelectedProject] = useState<number | null>(null);
    const [activeProject, setActiveProject] = useState<{
        id: number;
        name: string;
        location: string;
        checkInTime: string;
    } | null>(null);
    const [hoursReportModalOpen, setHoursReportModalOpen] = useState(false);
    const [projectsModalOpen, setProjectsModalOpen] = useState(false);
    const [selectedProjectDetails, setSelectedProjectDetails] = useState<number | null>(null);
    const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
    const [requestsModalOpen, setRequestsModalOpen] = useState(false);
    const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
    const [supportModalOpen, setSupportModalOpen] = useState(false);
    const { updateLocation, removeLocation } = useLocations();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleCheckIn = async (status: 'presente' | 'ausente' | 'tarde') => {
        setLoading(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const response = await attendanceService.checkIn({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                status,
                projectId: selectedProject || assignedProjects[0].id,
                city: 'Ciudad Actual'
            });

            // Actualizar la ubicación en el contexto
            updateLocation({
                id: Date.now(), // Temporal, debería venir del backend
                name: user?.full_name || 'Usuario',
                coordinates: [position.coords.latitude, position.coords.longitude],
                status: status === 'tarde' ? 'ausente' : status,
                city: 'Ciudad Actual',
                checkInTime: new Date().toLocaleTimeString()
            });

            // Actualizar el proyecto activo después de un check-in exitoso
            const project = selectedProject 
                ? assignedProjects.find(p => p.id === selectedProject)
                : assignedProjects[0];

            if (project) {
                setActiveProject({
                    id: project.id,
                    name: project.name,
                    location: project.location,
                    checkInTime: new Date().toLocaleTimeString()
                });
            }

            notifications.show({
                title: 'Check-in exitoso',
                message: `Se registró tu ${status} correctamente`,
                color: 'green'
            });

        } catch (error) {
            console.error('Error en check-in:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo registrar el check-in',
                color: 'red'
            });
        } finally {
            setLoading(false);
            setSelectedProject(null);
        }
    };

    const handleCheckOut = async () => {
        setLoading(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            await attendanceService.checkOut({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                projectId: activeProject?.id || 0,
                city: 'Ciudad Actual'
            });

            // Eliminar la ubicación del técnico del mapa
            if (activeProject) {
                removeLocation(activeProject.id);
            }

            setActiveProject(null);
            notifications.show({
                title: 'Check-out exitoso',
                message: 'Se registró tu salida correctamente',
                color: 'green'
            });

        } catch (error) {
            console.error('Error en check-out:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo registrar el check-out',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    // Datos de ejemplo - estos deberían venir de la API
    const stats = {
        horasTrabajadas: 156,
        proyectosActivos: 3,
        incidentes: 0,
        proximoServicio: 'Mañana 9:00 AM',
        ubicacionServicio: 'APTIV Planta 3',
        estadoActual: 'presente'
    };

    const handleLogout = () => {
        // Limpiar el token y el estado del usuario
        localStorage.removeItem('auth_token');
        logout();
        // Redirigir al login
        navigate('/login');
    };

    return (
        <Stack gap="lg" p="md">
            <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Group align="center" gap="xs">
                            <Badge color="blue" size="lg">Técnico</Badge>
                            <Text size="xl" fw={700} c="green.4">
                                {user?.full_name}
                            </Text>
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#40C057',
                                    animation: 'pulse 1.5s infinite',
                                }}
                            />
                            <style>
                                {`
                                    @keyframes pulse {
                                        0% { opacity: 1; }
                                        50% { opacity: 0.4; }
                                        100% { opacity: 1; }
                                    }
                                `}
                            </style>
                        </Group>
                        <Text size="sm" c="yellow.4">
                            {new Date().toLocaleDateString('es-MX', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </Text>
                    </div>
                    <Stack align="flex-end" gap="xs">
                        <Text 
                            ta="right" 
                            size="xl"
                            fw={700} 
                            c="yellow.4"
                            style={{ letterSpacing: '0.05em' }}
                        >
                            {currentTime.toLocaleTimeString('es-MX', { 
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                            })}
                        </Text>
                        <Group gap="xs">
                            <Badge 
                                size="lg" 
                                color={stats.estadoActual === 'presente' ? 'green' : 'red'}
                            >
                                {stats.estadoActual.toUpperCase()}
                            </Badge>
                            <Button
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => {
                                    modals.openConfirmModal({
                                        title: 'Cerrar Sesión',
                                        centered: true,
                                        children: (
                                            <Text size="sm">
                                                ¿Estás seguro de que deseas cerrar sesión?
                                            </Text>
                                        ),
                                        labels: { confirm: 'Cerrar Sesión', cancel: 'Cancelar' },
                                        confirmProps: { color: 'red' },
                                        onConfirm: handleLogout
                                    });
                                }}
                            >
                                Cerrar Sesión
                            </Button>
                        </Group>
                    </Stack>
                </Group>
            </Paper>

            {/* Botón para expandir/colapsar menú */}
            <Group justify="center">
                <Button
                    variant="subtle"
                    color="gray"
                    onClick={() => setMenuExpanded(!menuExpanded)}
                    rightSection={menuExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                >
                    {menuExpanded ? 'Ocultar Herramientas' : 'Mostrar Herramientas'}
                </Button>
            </Group>

            {/* Menú de Herramientas */}
            <Collapse in={menuExpanded}>
                <SimpleGrid 
                    cols={{ base: 2, sm: 3, md: 4 }}
                    spacing={{ base: 'xs', sm: 'md' }}
                >
                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ backgroundColor: '#1A1B1E', cursor: 'pointer' }}
                        onClick={() => setCheckInModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="blue">
                                <IconDoorEnter size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Check In/Out
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ backgroundColor: '#1A1B1E', cursor: 'pointer' }}
                        onClick={() => setHoursReportModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="teal">
                                <IconClockHour4 size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Horas
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ backgroundColor: '#1A1B1E', cursor: 'pointer' }}
                        onClick={() => setProjectsModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="violet">
                                <IconBriefcase size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Mis Proyectos
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ backgroundColor: '#1A1B1E', cursor: 'pointer' }}
                        onClick={() => setDocumentsModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="yellow">
                                <IconFiles size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Documentos
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ backgroundColor: '#1A1B1E', cursor: 'pointer' }}
                        onClick={() => setRequestsModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="green">
                                <IconClipboardList size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Solicitudes
                            </Text>
                        </Stack>
                    </Card>

                    <Card p="md" radius="md" style={{ backgroundColor: '#1A1B1E', cursor: 'pointer' }}>
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="cyan">
                                <IconUserCircle size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Mi Perfil
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ backgroundColor: '#1A1B1E', cursor: 'pointer' }}
                        onClick={() => setSupportModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="orange">
                                <IconHeadset size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Soporte
                            </Text>
                        </Stack>
                    </Card>
                </SimpleGrid>
            </Collapse>

            {/* Modal de Check In */}
            <Modal 
                opened={checkInModalOpen} 
                onClose={() => setCheckInModalOpen(false)}
                title={activeProject ? "Registro de Salida" : "Registro de Entrada"}
                size="md"
            >
                <Stack gap="md">
                    {activeProject ? (
                        <>
                            <Paper p="xs" bg="dark.6" radius="sm">
                                <Text size="sm" fw={500} c="gray.2">Proyecto Activo:</Text>
                                <Text c="blue.4">{activeProject.name}</Text>
                                <Text size="xs" c="dimmed">{activeProject.location}</Text>
                                <Text size="xs" c="dimmed">Entrada: {activeProject.checkInTime}</Text>
                            </Paper>

                            <Button 
                                loading={loading}
                                color="orange"
                                leftSection={<IconDoorEnter size={20} />}
                                onClick={() => {
                                    handleCheckOut();
                                    setCheckInModalOpen(false);
                                }}
                                size="md"
                                fullWidth
                            >
                                Registrar Salida
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Selector de Proyecto - solo mostrar si no hay proyecto activo */}
                            {assignedProjects.length > 1 ? (
                                <Select
                                    label="Selecciona el Proyecto"
                                    placeholder="Elige un proyecto"
                                    data={assignedProjects.map(project => ({
                                        value: project.id.toString(),
                                        label: `${project.name} (${project.location})`
                                    }))}
                                    value={selectedProject?.toString()}
                                    onChange={(value) => setSelectedProject(value ? parseInt(value) : null)}
                                    required
                                />
                            ) : assignedProjects.length === 1 ? (
                                <Paper p="xs" bg="dark.6" radius="sm">
                                    <Text size="sm" fw={500} c="gray.2">Proyecto Asignado:</Text>
                                    <Text c="blue.4">{assignedProjects[0].name}</Text>
                                    <Text size="xs" c="dimmed">{assignedProjects[0].location}</Text>
                                </Paper>
                            ) : (
                                <Alert color="yellow" title="Sin Proyectos">
                                    No tienes proyectos asignados actualmente.
                                </Alert>
                            )}

                            {/* Botones de Check In */}
                            {(assignedProjects.length === 1 || selectedProject) && (
                                <Group grow>
                                    <Button 
                                        loading={loading}
                                        color="green"
                                        leftSection={<IconUserCheck size={20} />}
                                        onClick={() => {
                                            handleCheckIn('presente');
                                            setCheckInModalOpen(false);
                                        }}
                                        size="md"
                                    >
                                        Registrar Entrada
                                    </Button>

                                    <Button 
                                        loading={loading}
                                        color="red"
                                        leftSection={<IconClock size={20} />}
                                        onClick={() => {
                                            handleCheckIn('ausente');
                                            setCheckInModalOpen(false);
                                        }}
                                        size="md"
                                    >
                                        Reportar Ausencia
                                    </Button>
                                </Group>
                            )}
                        </>
                    )}
                </Stack>
            </Modal>

            {/* Modal de Reporte de Horas */}
            <Modal
                opened={hoursReportModalOpen}
                onClose={() => setHoursReportModalOpen(false)}
                title="Reporte de Horas"
                size="md"
            >
                <Stack gap="md">
                    {/* Fecha */}
                    <Paper p="sm" bg="dark.6" radius="sm">
                        <Group justify="space-between">
                            <Text fw={500} c="gray.2">Fecha:</Text>
                            <Text c="blue.4">{new Date().toLocaleDateString('es-MX', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</Text>
                        </Group>
                    </Paper>

                    {/* Carrusel de Proyectos */}
                    <Carousel
                        withIndicators
                        height={140}
                        slideSize="100%"
                        slideGap="md"
                        loop
                        align="start"
                        styles={{
                            indicators: {
                                bottom: '0.5rem',
                            },
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
                        {/* Proyecto APTIV */}
                        <Carousel.Slide>
                            <Card p="sm" bg="dark.7" radius="sm">
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text fw={500} c="teal.4">Proyecto APTIV</Text>
                                        <Text size="sm" c="dimmed">Planta 3 - Línea A</Text>
                                    </Group>
                                    <Group grow>
                                        <Paper p="xs" bg="dark.8" radius="sm">
                                            <Text size="sm" c="dimmed" ta="center">Horas</Text>
                                            <Text size="xl" fw={700} c="blue.4" ta="center">4h</Text>
                                        </Paper>
                                        <Paper p="xs" bg="dark.8" radius="sm">
                                            <Text size="sm" c="dimmed" ta="center">Partes</Text>
                                            <Text size="xl" fw={700} c="teal.4" ta="center">8</Text>
                                        </Paper>
                                    </Group>
                                </Stack>
                            </Card>
                        </Carousel.Slide>

                        {/* Proyecto Lear */}
                        <Carousel.Slide>
                            <Card p="sm" bg="dark.7" radius="sm">
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text fw={500} c="teal.4">Proyecto Lear</Text>
                                        <Text size="sm" c="dimmed">Planta Norte</Text>
                                    </Group>
                                    <Group grow>
                                        <Paper p="xs" bg="dark.8" radius="sm">
                                            <Text size="sm" c="dimmed" ta="center">Horas</Text>
                                            <Text size="xl" fw={700} c="blue.4" ta="center">4h</Text>
                                        </Paper>
                                        <Paper p="xs" bg="dark.8" radius="sm">
                                            <Text size="sm" c="dimmed" ta="center">Partes</Text>
                                            <Text size="xl" fw={700} c="teal.4" ta="center">7</Text>
                                        </Paper>
                                    </Group>
                                </Stack>
                            </Card>
                        </Carousel.Slide>
                    </Carousel>

                    {/* Resumen del día */}
                    <Paper p="sm" bg="dark.6" radius="sm">
                        <Text fw={500} c="gray.2" mb="xs">Resumen del Día</Text>
                        <Group justify="space-between">
                            <Stack gap={4}>
                                <Text size="sm" c="dimmed">Total Horas:</Text>
                                <Text size="sm" c="dimmed">Total Partes:</Text>
                                <Text size="sm" c="dimmed">Proyectos:</Text>
                            </Stack>
                            <Stack gap={4} align="flex-end">
                                <Text size="sm" fw={500} c="blue.4">8h</Text>
                                <Text size="sm" fw={500} c="teal.4">15</Text>
                                <Text size="sm" fw={500} c="blue.4">2</Text>
                            </Stack>
                        </Group>
                    </Paper>

                    <Group justify="flex-end" gap="sm">
                        <Button
                            color="red"
                            variant="light"
                            leftSection={<IconAlertCircle size={20} />}
                            onClick={() => {
                                modals.openConfirmModal({
                                    title: 'Reportar Error',
                                    centered: true,
                                    children: (
                                        <Stack gap="xs">
                                            <Text size="sm">
                                                ¿Hay algún error en las horas o partes registradas?
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Se notificará a tu supervisor para revisar y corregir el registro.
                                            </Text>
                                        </Stack>
                                    ),
                                    labels: { confirm: 'Reportar', cancel: 'Cancelar' },
                                    confirmProps: { color: 'red' },
                                    onConfirm: () => {
                                        notifications.show({
                                            title: 'Error Reportado',
                                            message: 'Se ha notificado al supervisor sobre el error',
                                            color: 'yellow'
                                        });
                                        setHoursReportModalOpen(false);
                                    },
                                });
                            }}
                        >
                            Reportar Error
                        </Button>

                        <Button
                            color="blue"
                            leftSection={<IconFiles size={20} />}
                            onClick={() => {
                                modals.openConfirmModal({
                                    title: 'Confirmar envío',
                                    centered: true,
                                    children: (
                                        <Text size="sm">
                                            ¿Estás seguro de que deseas enviar el reporte de horas del día?
                                        </Text>
                                    ),
                                    labels: { confirm: 'Enviar', cancel: 'Cancelar' },
                                    confirmProps: { color: 'blue' },
                                    onConfirm: () => {
                                        // Aquí iría la lógica para enviar el reporte
                                        notifications.show({
                                            title: 'Reporte Enviado',
                                            message: 'El reporte de horas se ha enviado correctamente',
                                            color: 'green'
                                        });
                                        setHoursReportModalOpen(false);
                                    },
                                });
                            }}
                        >
                            Enviar Reporte
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal de Proyectos */}
            <Modal
                opened={projectsModalOpen}
                onClose={() => {
                    setProjectsModalOpen(false);
                    setSelectedProjectDetails(null);
                }}
                title={selectedProjectDetails ? "Detalles del Proyecto" : "Mis Proyectos"}
                size="lg"
            >
                <Stack gap="md">
                    {!selectedProjectDetails ? (
                        // Lista de Proyectos
                        <>
                            <Text size="sm" c="dimmed">
                                Selecciona un proyecto para ver más detalles
                            </Text>
                            {assignedProjects.map((project) => (
                                <Card 
                                    key={project.id}
                                    p="sm" 
                                    bg="dark.6" 
                                    radius="sm"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedProjectDetails(project.id)}
                                >
                                    <Group justify="space-between" align="flex-start">
                                        <div>
                                            <Text fw={500} c="blue.4">
                                                {project.name}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {project.location}
                                            </Text>
                                        </div>
                                        <Badge 
                                            color="green" 
                                            variant="light"
                                            size="sm"
                                        >
                                            Activo
                                        </Badge>
                                    </Group>
                                    <Group mt="xs">
                                        <Text size="sm" c="dimmed">Progreso:</Text>
                                        <Text size="sm" c="teal.4" fw={500}>75%</Text>
                                        <Text size="sm" c="dimmed">Partes:</Text>
                                        <Text size="sm" c="blue.4" fw={500}>15/20</Text>
                                    </Group>
                                </Card>
                            ))}
                        </>
                    ) : (
                        // Detalles del Proyecto
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Button 
                                    variant="subtle" 
                                    leftSection={<IconArrowLeft size={16} />}
                                    onClick={() => setSelectedProjectDetails(null)}
                                >
                                    Volver
                                </Button>
                                <Badge color="green" size="lg">Activo</Badge>
                            </Group>

                            <Paper p="md" bg="dark.6" radius="md">
                                <Stack gap="xs">
                                    <Text size="xl" fw={700} c="blue.4">
                                        Proyecto APTIV
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Planta 3 - Línea A
                                    </Text>
                                    
                                    <Divider my="xs" />
                                    
                                    <Group grow>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Inicio</Text>
                                            <Text>01/02/2024</Text>
                                        </Stack>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Fin Estimado</Text>
                                            <Text>31/03/2024</Text>
                                        </Stack>
                                    </Group>

                                    <Divider my="xs" />

                                    <Text fw={500}>Información de Planta</Text>
                                    <SimpleGrid cols={2}>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Contacto</Text>
                                            <Text>Juan Pérez</Text>
                                        </Stack>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Teléfono</Text>
                                            <Text>+52 614 123 4567</Text>
                                        </Stack>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Email</Text>
                                            <Text>juan.perez@aptiv.com</Text>
                                        </Stack>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Horario</Text>
                                            <Text>9:00 - 18:00</Text>
                                        </Stack>
                                    </SimpleGrid>

                                    <Divider my="xs" />

                                    <Text fw={500}>Información de Hotel</Text>
                                    <SimpleGrid cols={2}>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Hotel</Text>
                                            <Text>Hotel Quality Inn</Text>
                                        </Stack>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Dirección</Text>
                                            <Text>Av. Principal #123</Text>
                                        </Stack>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Teléfono</Text>
                                            <Text>+52 614 987 6543</Text>
                                        </Stack>
                                        <Stack gap={0}>
                                            <Text size="sm" c="dimmed">Check-in</Text>
                                            <Text>15:00</Text>
                                        </Stack>
                                    </SimpleGrid>
                                </Stack>
                            </Paper>
                        </Stack>
                    )}
                </Stack>
            </Modal>

            {/* Modal de Documentos */}
            <Modal
                opened={documentsModalOpen}
                onClose={() => setDocumentsModalOpen(false)}
                title="Documentos"
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Documentos disponibles para descarga
                    </Text>

                    <Paper p="xs" bg="dark.6" radius="sm">
                        <Stack gap="xs">
                            <Group justify="space-between" align="center">
                                <Group>
                                    <ThemeIcon color="red" variant="light" size="lg">
                                        <IconFileTypePdf size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" fw={500}>Manual de Procedimientos</Text>
                                        <Text size="xs" c="dimmed">PDF • 2.5 MB</Text>
                                    </div>
                                </Group>
                                <Button 
                                    variant="subtle" 
                                    color="blue"
                                    size="sm"
                                    leftSection={<IconDownload size={16} />}
                                >
                                    Descargar
                                </Button>
                            </Group>

                            <Group justify="space-between" align="center">
                                <Group>
                                    <ThemeIcon color="blue" variant="light" size="lg">
                                        <IconFileTypeDoc size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" fw={500}>Formato de Reporte</Text>
                                        <Text size="xs" c="dimmed">DOCX • 500 KB</Text>
                                    </div>
                                </Group>
                                <Button 
                                    variant="subtle" 
                                    color="blue"
                                    size="sm"
                                    leftSection={<IconDownload size={16} />}
                                >
                                    Descargar
                                </Button>
                            </Group>

                            <Group justify="space-between" align="center">
                                <Group>
                                    <ThemeIcon color="green" variant="light" size="lg">
                                        <IconFileTypeXls size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" fw={500}>Control de Horas</Text>
                                        <Text size="xs" c="dimmed">XLSX • 750 KB</Text>
                                    </div>
                                </Group>
                                <Button 
                                    variant="subtle" 
                                    color="blue"
                                    size="sm"
                                    leftSection={<IconDownload size={16} />}
                                >
                                    Descargar
                                </Button>
                            </Group>
                        </Stack>
                    </Paper>
                </Stack>
            </Modal>

            {/* Modal de Solicitudes */}
            <Modal
                opened={requestsModalOpen}
                onClose={() => setRequestsModalOpen(false)}
                title="Mis Solicitudes"
                size="md"
            >
                <Stack gap="md">
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            Historial de solicitudes
                        </Text>
                        <Button 
                            variant="light" 
                            size="xs"
                            leftSection={<IconPlus size={16} />}
                            onClick={() => setNewRequestModalOpen(true)}
                        >
                            Nueva Solicitud
                        </Button>
                    </Group>

                    <Paper p="xs" bg="dark.6" radius="sm">
                        <Stack gap="xs">
                            <Card p="sm" bg="dark.7" radius="sm">
                                <Group justify="space-between" align="flex-start">
                                    <div>
                                        <Text fw={500}>Cambio de Horario</Text>
                                        <Text size="xs" c="dimmed">Proyecto APTIV</Text>
                                        <Text size="xs" c="dimmed">19 Feb, 2024</Text>
                                    </div>
                                    <Badge color="yellow">Pendiente</Badge>
                                </Group>
                            </Card>

                            <Card p="sm" bg="dark.7" radius="sm">
                                <Group justify="space-between" align="flex-start">
                                    <div>
                                        <Text fw={500}>Día Personal</Text>
                                        <Text size="xs" c="dimmed">Proyecto Lear</Text>
                                        <Text size="xs" c="dimmed">15 Feb, 2024</Text>
                                    </div>
                                    <Badge color="green">Aprobada</Badge>
                                </Group>
                            </Card>

                            <Card p="sm" bg="dark.7" radius="sm">
                                <Group justify="space-between" align="flex-start">
                                    <div>
                                        <Text fw={500}>Cambio de Proyecto</Text>
                                        <Text size="xs" c="dimmed">Proyecto APTIV</Text>
                                        <Text size="xs" c="dimmed">10 Feb, 2024</Text>
                                    </div>
                                    <Badge color="red">Rechazada</Badge>
                                </Group>
                            </Card>

                            <Card p="sm" bg="dark.7" radius="sm">
                                <Group justify="space-between" align="flex-start">
                                    <div>
                                        <Text fw={500}>Permiso Médico</Text>
                                        <Text size="xs" c="dimmed">Proyecto APTIV</Text>
                                        <Text size="xs" c="dimmed">5 Feb, 2024</Text>
                                    </div>
                                    <Badge color="green">Aprobada</Badge>
                                </Group>
                            </Card>
                        </Stack>
                    </Paper>
                </Stack>
            </Modal>

            {/* Modal de Nueva Solicitud */}
            <Modal
                opened={newRequestModalOpen}
                onClose={() => setNewRequestModalOpen(false)}
                title="Nueva Solicitud"
                size="md"
            >
                <Stack gap="md">
                    <Select
                        label="Tipo de Solicitud"
                        placeholder="Selecciona el tipo"
                        data={[
                            { value: 'horario', label: 'Cambio de Horario' },
                            { value: 'personal', label: 'Día Personal' },
                            { value: 'proyecto', label: 'Cambio de Proyecto' },
                            { value: 'medico', label: 'Permiso Médico' }
                        ]}
                        required
                    />

                    <Select
                        label="Proyecto"
                        placeholder="Selecciona el proyecto"
                        data={assignedProjects.map(project => ({
                            value: project.id.toString(),
                            label: project.name
                        }))}
                        required
                    />

                    <DateInput
                        label="Fecha"
                        placeholder="Selecciona la fecha"
                        required
                        minDate={new Date()}
                    />

                    <Textarea
                        label="Motivo"
                        placeholder="Describe el motivo de tu solicitud"
                        minRows={3}
                        required
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setNewRequestModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            color="blue"
                            onClick={() => {
                                notifications.show({
                                    title: 'Solicitud Enviada',
                                    message: 'Tu solicitud ha sido enviada para revisión',
                                    color: 'green'
                                });
                                setNewRequestModalOpen(false);
                            }}
                        >
                            Enviar Solicitud
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal de Soporte */}
            <Modal
                opened={supportModalOpen}
                onClose={() => setSupportModalOpen(false)}
                title="Soporte Técnico"
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Reporta cualquier problema o emergencia que necesite atención
                    </Text>

                    <Select
                        label="Tipo de Reporte"
                        placeholder="Selecciona el tipo"
                        data={[
                            { value: 'software', label: 'Fallo de Software' },
                            { value: 'emergencia', label: 'Emergencia' },
                            { value: 'equipo', label: 'Falta de Equipo' },
                            { value: 'documentacion', label: 'Falta Documentación' }
                        ]}
                        required
                    />

                    <Select
                        label="Proyecto"
                        placeholder="Selecciona el proyecto"
                        data={assignedProjects.map(project => ({
                            value: project.id.toString(),
                            label: project.name
                        }))}
                        required
                    />

                    <Group grow>
                        <TextInput
                            label="Fecha"
                            value={new Date().toLocaleDateString()}
                            readOnly
                        />
                        <TextInput
                            label="Hora"
                            value={new Date().toLocaleTimeString()}
                            readOnly
                        />
                    </Group>

                    <Textarea
                        label="Descripción del Problema"
                        placeholder="Describe detalladamente el problema que estás experimentando"
                        minRows={4}
                        required
                    />

                    <Select
                        label="Prioridad"
                        placeholder="Selecciona la prioridad"
                        data={[
                            { value: 'baja', label: 'Baja' },
                            { value: 'media', label: 'Media' },
                            { value: 'alta', label: 'Alta' },
                            { value: 'critica', label: 'Crítica' }
                        ]}
                        required
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setSupportModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            color="orange"
                            leftSection={<IconSend size={16} />}
                            onClick={() => {
                                notifications.show({
                                    title: 'Reporte Enviado',
                                    message: 'Tu reporte ha sido enviado al equipo de soporte',
                                    color: 'green'
                                });
                                setSupportModalOpen(false);
                            }}
                        >
                            Enviar Reporte
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {/* Carrusel de Horas */}
                <Carousel
                    withIndicators
                    height="160px"
                    slideSize="100%"
                    slideGap="md"
                    loop
                    align="start"
                    styles={{
                        indicators: {
                            bottom: '0.5rem',
                        },
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
                    {/* Hoy */}
                    <Carousel.Slide>
                        <Card p="xs" radius="md" style={{ backgroundColor: '#1A1B1E', height: '100%' }}>
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                            Hoy
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                            {currentTime.toLocaleDateString('es-MX', { weekday: 'long' })}
                                        </Text>
                                    </div>
                                    <ThemeIcon color="blue" variant="light" size={38} radius="md">
                                        <IconCalendarTime size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="blue.4">
                                            8h
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Trabajadas
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="green.4">
                                            09:00
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Entrada
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="red.4">
                                            17:00
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Salida
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                    </Carousel.Slide>

                    {/* Horas Semana */}
                    <Carousel.Slide>
                        <Card p="xs" radius="md" style={{ backgroundColor: '#1A1B1E', height: '100%' }}>
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                            Esta Semana
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                            13 - 19 Feb
                                        </Text>
                                    </div>
                                    <ThemeIcon color="violet" variant="light" size={38} radius="md">
                                        <IconCalendarTime size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="violet.4">
                                            40h
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Trabajadas
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="green.4">
                                            5/5
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Asistencias
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                    </Carousel.Slide>

                    {/* Horas Quincena */}
                    <Carousel.Slide>
                        <Card p="xs" radius="md" style={{ backgroundColor: '#1A1B1E', height: '100%' }}>
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                            Quincena
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                            1 - 15 Feb
                                        </Text>
                                    </div>
                                    <ThemeIcon color="orange" variant="light" size={38} radius="md">
                                        <IconCalendarTime size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="orange.4">
                                            80h
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Trabajadas
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="green.4">
                                            10/10
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Asistencias
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="teal.4">
                                            98%
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Puntualidad
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                    </Carousel.Slide>
                </Carousel>

                {/* Carrusel de Proyectos */}
                <Carousel
                    withIndicators
                    height="160px"
                    slideSize="100%"
                    slideGap="md"
                    loop
                    align="start"
                    styles={{
                        indicators: {
                            bottom: '0.5rem',
                        },
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
                    {/* Proyecto 1 */}
                    <Carousel.Slide>
                        <Card p="xs" radius="md" style={{ backgroundColor: '#1A1B1E', height: '100%' }}>
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                            Proyecto APTIV
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                            Planta 3 - Línea A
                                        </Text>
                                    </div>
                                    <ThemeIcon color="green" variant="light" size={38} radius="md">
                                        <IconBriefcase size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="teal.4">
                                            75%
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Progreso
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="blue.4">
                                            15/20
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Partes
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                    </Carousel.Slide>

                    {/* Proyecto 2 */}
                    <Carousel.Slide>
                        <Card p="xs" radius="md" style={{ backgroundColor: '#1A1B1E', height: '100%' }}>
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                            Proyecto Lear
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                            Planta Norte
                                        </Text>
                                    </div>
                                    <ThemeIcon color="green" variant="light" size={38} radius="md">
                                        <IconBriefcase size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="teal.4">
                                            30%
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Progreso
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="blue.4">
                                            6/20
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Partes
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                    </Carousel.Slide>
                </Carousel>
            </SimpleGrid>

            <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                <Text size="lg" fw={700} c="gray.2" mb="md">
                    Próxima Actividad
                </Text>
                <Group justify="space-between">
                    <div>
                        <Text c="gray.2">{stats.proximoServicio}</Text>
                        <Text size="sm" c="dimmed">{stats.ubicacionServicio}</Text>
                    </div>
                    <Button variant="light">
                        Ver Detalles
                    </Button>
                </Group>
            </Paper>
        </Stack>
    );
} 