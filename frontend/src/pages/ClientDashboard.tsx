import { Grid, Paper, Text, Group, RingProgress, SimpleGrid, Card, Title, Stack, Badge, Button, ThemeIcon, Box, Modal, SimpleGrid as MantineSimpleGrid, Divider, Avatar, ActionIcon, Progress, TextInput, Select, Autocomplete } from '@mantine/core';
import { DateInput } from '@mantine/dates';
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
    IconFilter,
    IconSearch,
    IconX,
    IconShare,
    IconUserPlus
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
import {
    DndContext,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    closestCenter,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const calculateStats = (employees: Employee[]) => [
    { 
        title: 'PAQUETE ACTUAL', 
        value: 'Premium', 
        subtitle: '2,000 escaneos incluidos',
        icon: IconUsers, 
        color: '#3B82F6', 
        bg: 'rgba(59, 130, 246, 0.1)' 
    },
    { 
        title: 'ESCANEOS UTILIZADOS', 
        value: '1,247', 
        subtitle: 'Último usado el 15 de enero, 2025',
        icon: IconUserCheck, 
        color: '#F59E0B', 
        bg: 'rgba(245, 158, 11, 0.1)' 
    },
    { 
        title: 'ESCANEOS DISPONIBLES', 
        value: '753', 
        subtitle: '365 días de duración',
        icon: IconUserX, 
        color: '#10B981', 
        bg: 'rgba(16, 185, 129, 0.1)' 
    },
    { 
        title: 'ADQUIRIR MÁS ESCANEOS', 
        value: 'Selecciona y paga al instante', 
        subtitle: 'Pago seguro a través de Stripe',
        icon: IconClock, 
        color: '#8B5CF6', 
        bg: 'rgba(139, 92, 246, 0.1)' 
    },
];

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
    },
    projectMetrics: {
        daysRemaining: 0, // Se calculará dinámicamente
        delayedProjects: 0, // Se calculará dinámicamente
        reportedIssues: 0, // Se actualizará dinámicamente
    }
};

// Los datos de problemas reportados ahora se obtienen de la API

// Opciones para los filtros (se generarán dinámicamente)
const getProjectOptions = (problems: ReportedProblem[]) => {
    const projects = [...new Set(problems.map(p => p.project))];
    return [
    { value: '', label: 'Todos los proyectos' },
        ...projects.map(project => ({ value: project, label: project }))
    ];
};

// Opciones de proyectos para autocompletado (basadas en los proyectos del contexto)
const getProjectAutocompleteOptions = (projects: any[]) => {
    return projects.map(project => ({
        value: project.name,
        label: project.name
    }));
};

// Opciones de tipo de problema (iguales a las del soporte técnico)
const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'software', label: 'Fallo de Software' },
    { value: 'emergencia', label: 'Emergencia' },
    { value: 'equipo', label: 'Falta de Equipo' },
    { value: 'documentacion', label: 'Falta Documentación' },
    { value: 'sin_llaves', label: 'Sin llaves' },
    { value: 'unidad_cerrada', label: 'Unidad cerrada' },
    { value: 'unidad_danada', label: 'Unidad dañada' },
    { value: 'sin_bateria', label: 'Sin batería' },
    { value: 'seguridad', label: 'Problema de Seguridad' }
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
        // Para iOS, usar Apple Maps
        window.open(`https://maps.apple.com/?q=${location}`, '_blank');
    } else {
        // Para Android y Desktop, usar Google Maps
        window.open(`https://www.google.com/maps?q=${location}`, '_blank');
    }
};

const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en-revision', label: 'En Revisión' },
    { value: 'resuelto', label: 'Resuelto' }
];

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

// Interfaz para problemas reportados (usando la misma estructura que Issue)
interface ReportedProblem {
    id: number;
    type: string;
    part_number_vin: string;
    project: string;
    location: string;
    date_reported: string;
    status: 'pendiente' | 'en-revision' | 'resuelto';
    created_at: string;
    updated_at: string;
    created_by?: number;
    description?: string;
    resolved_at?: string;
    assigned_user_id?: number;
    assigned_at?: string;
    assigned_user?: {
        id: number;
        full_name: string;
        email: string;
        phone: string;
        location: string;
        avatar?: string;
    };
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
    const { user, logout, effectiveUser, isSimulating, setUser, setAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { employees } = useEmployees();
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const stats = calculateStats(employees);
    const [inProgressModalOpen, setInProgressModalOpen] = useState(false);
    const [selectedProjectTechs, setSelectedProjectTechs] = useState<ProjectInProgress | null>(null);
    const [selectedProjectEquipment, setSelectedProjectEquipment] = useState<ProjectInProgress | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<ProjectEquipment | null>(null);
    const [problemsModalOpen, setProblemsModalOpen] = useState(false);
    const [assignMode, setAssignMode] = useState(false);
    
    // Estado para drag and drop
    const [activeTechnician, setActiveTechnician] = useState<Employee | null>(null);
    
    // Sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const [projectFilter, setProjectFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [pendingIssuesCount, setPendingIssuesCount] = useState<number>(0);
    const [reportedProblems, setReportedProblems] = useState<ReportedProblem[]>([]);
    const [issuesLoading, setIssuesLoading] = useState<boolean>(true);
    const [projectMetrics, setProjectMetrics] = useState<{
        daysRemaining: number;
        delayedProjects: number;
    }>({
        daysRemaining: 0,
        delayedProjects: 0
    });
    const [daysRemainingModalOpen, setDaysRemainingModalOpen] = useState(false);
    const [delayedProjectsModalOpen, setDelayedProjectsModalOpen] = useState(false);
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
            // Actualizar las métricas del proyecto
            serviceMetrics.projectMetrics.reportedIssues = count;
        } catch (error) {
            console.error('Error fetching pending issues count:', error);
            // En caso de error, mantener el valor por defecto
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
            // En caso de error, mantener array vacío
            setReportedProblems([]);
        }
    };

    // Funciones para drag and drop
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const technicianId = active.id.toString().replace('tech-', '');
        const technician = employees.find(emp => emp.id.toString() === technicianId && emp.role === 'tecnico');
        setActiveTechnician(technician || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        
        console.log('Drag End Event:', { active: active.id, over: over?.id });
        
        if (!over) {
            setActiveTechnician(null);
            return;
        }

        const technicianId = parseInt(active.id.toString().replace('tech-', ''));
        const problemId = parseInt(over.id.toString().replace('problem-', ''));

        console.log('Assignment Details:', { technicianId, problemId });

        try {
            // Asignar técnico al problema usando el servicio del backend
            const updatedIssue = await issuesService.assignTechnician({
                issue_id: problemId,
                assigned_user_id: technicianId
            });

            // Actualizar el estado local con la respuesta del backend
            setReportedProblems(prev => 
                prev.map(issue => 
                    issue.id === problemId ? updatedIssue : issue
                )
            );

            setActiveTechnician(null);
            
            // Mostrar notificación de éxito
            const technician = employees.find(emp => emp.id === technicianId);
            const problem = reportedProblems.find(p => p.id === problemId);
            
            if (technician && problem) {
                notifications.show({
                    title: 'Asignación Exitosa',
                    message: `${technician.full_name} asignado a ${getTypeLabel(problem.type)}`,
                    color: 'green',
                    autoClose: 3000,
                });
            }
        } catch (error) {
            console.error('Error assigning technician:', error);
            notifications.show({
                title: 'Error en Asignación',
                message: 'No se pudo asignar el técnico al problema',
                color: 'red',
                autoClose: 3000,
            });
        }
    };

    const handleDragCancel = () => {
        setActiveTechnician(null);
    };

    // Función para obtener técnico asignado a un problema
    const getAssignedTechnician = (problemId: string) => {
        const problem = reportedProblems.find(p => p.id.toString() === problemId);
        return problem?.assigned_user || null;
    };

    // Función para verificar si un técnico está asignado
    const isTechnicianAssigned = (technicianId: number) => {
        return reportedProblems.some(problem => 
            problem.assigned_user_id === technicianId
        );
    };

    // Componente para card de técnico draggable
    const DraggableTechnicianCard = ({ technician }: { technician: Employee }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: `tech-${technician.id}` });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        const isAssigned = isTechnicianAssigned(technician.id);

        return (
            <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
                <Card 
                    p="md" 
                    radius="md" 
                    withBorder 
                    className="mobile-technician-card"
                    style={{
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isAssigned ? 0.6 : 0.9,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        border: isAssigned ? '2px dashed #666' : undefined,
                        backgroundColor: isAssigned ? 'rgba(102, 102, 102, 0.1)' : undefined,
                    }}
                >
                    <Stack gap="sm">
                        {/* Header del técnico */}
                        <Group justify="space-between" align="flex-start">
                            <Group gap="sm">
                                <Avatar
                                    src={technician.avatar}
                                    size="lg"
                                    radius="md"
                                    color="blue"
                                >
                                    {technician.full_name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Text fw={600} size="md" c="white">
                                        {technician.full_name}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Técnico Especializado
                                    </Text>
                                </Box>
                            </Group>
                            <Group gap="xs">
                                <Badge 
                                    color={technician.status === 'presente' ? 'green' : 'red'}
                                    variant="light"
                                >
                                    {technician.status === 'presente' ? 'Disponible' : 'No Disponible'}
                                </Badge>
                                {isAssigned && (
                                    <Badge color="orange" variant="light" size="sm">
                                        Asignado
                                    </Badge>
                                )}
                            </Group>
                        </Group>

                    </Stack>
                </Card>
            </div>
        );
    };

    // Componente para card de problema droppable
    const DroppableProblemCard = ({ problem }: { problem: ReportedProblem }) => {
        const assignedTechnician = getAssignedTechnician(problem.id.toString());
        const isAssigned = !!assignedTechnician;
        
        console.log(`Problem ${problem.id} - Assigned: ${isAssigned}, Technician:`, assignedTechnician);
        
        const { setNodeRef, isOver } = useDroppable({
            id: `problem-${problem.id}`,
        });

        return (
            <div ref={setNodeRef}>
                <Card 
                    p="md" 
                    radius="md" 
                    withBorder 
                    className="mobile-problem-card"
                    style={{
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isAssigned ? 0.6 : 0.9,
                        border: isAssigned ? '2px dashed #10B981' : isOver ? '2px dashed #3B82F6' : undefined,
                        backgroundColor: isAssigned ? 'rgba(16, 185, 129, 0.1)' : isOver ? 'rgba(59, 130, 246, 0.1)' : undefined,
                        cursor: isAssigned ? 'not-allowed' : 'default',
                        filter: isAssigned ? 'grayscale(0.3)' : 'none',
                        transform: isOver ? 'scale(1.02)' : 'scale(1)',
                    }}
                >
                <Stack gap="sm">
                    {/* Header del problema */}
                    <Group justify="space-between" align="flex-start" className="mobile-problem-header">
                        <Group gap="sm">
                            <ThemeIcon 
                                size="lg" 
                                variant="light" 
                                color={
                                    problem.type === 'Falla Mecánica' ? 'red' :
                                    problem.type === 'Error de Software' ? 'blue' :
                                    'orange'
                                }
                            >
                                <IconTools size={20} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={600} size="lg" c="white" className="mobile-problem-title">
                                    {getTypeLabel(problem.type)}
                                </Text>
                                <Text size="sm" c="dimmed" className="mobile-problem-date">
                                    Reportado el {new Date(problem.date_reported).toLocaleDateString('es-MX')}
                                </Text>
                            </Box>
                        </Group>
                        <Group gap="sm">
                            <ActionIcon
                                variant="light"
                                color="blue"
                                size="lg"
                                onClick={() => shareIndividualProblem(problem)}
                                title="Compartir problema"
                                style={{ opacity: isAssigned ? 0.5 : 1 }}
                            >
                                <IconShare size={18} />
                            </ActionIcon>
                            <Badge 
                                color={
                                    problem.status === 'pendiente' ? 'red' :
                                    problem.status === 'en-revision' ? 'yellow' :
                                    'green'
                                }
                                variant="light"
                            >
                                {problem.status === 'pendiente' ? 'Pendiente' :
                                 problem.status === 'en-revision' ? 'En Revisión' :
                                 'Resuelto'}
                            </Badge>
                            {isAssigned && (
                                <Badge color="green" variant="filled" size="sm">
                                    Asignado
                                </Badge>
                            )}
                        </Group>
                    </Group>

                    {/* Información del problema */}
                    <Grid className="mobile-problem-info">
                        <Grid.Col span={6}>
                            <Stack gap="xs">
                                <Group gap="xs">
                                    <Text size="sm" c="dimmed" className="mobile-problem-info-text">No. de Parte / VIN:</Text>
                                    <Text size="sm" fw={500} c="white" className="mobile-problem-info-text">{problem.part_number_vin}</Text>
                                </Group>
                                <Group gap="xs">
                                    <Text size="sm" c="dimmed" className="mobile-problem-info-text">Proyecto:</Text>
                                    <Text size="sm" fw={500} c="white" className="mobile-problem-info-text">{problem.project}</Text>
                                </Group>
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Stack gap="xs">
                                <Group gap="xs">
                                    <Text size="sm" c="dimmed" className="mobile-problem-info-text">Ubicación:</Text>
                                    <Text 
                                        size="sm" 
                                        fw={500} 
                                        c="blue" 
                                        className="mobile-problem-location"
                                        style={{ 
                                            cursor: 'pointer', 
                                            textDecoration: 'underline',
                                            textDecorationColor: 'rgba(255, 255, 255, 0.3)'
                                        }}
                                        onClick={() => openLocationInMaps(problem.location)}
                                        title="Hacer clic para abrir en mapas"
                                    >
                                        {problem.location}
                                    </Text>
                                </Group>
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    {/* Técnico asignado */}
                    {assignedTechnician && (
                        <Paper 
                            p="sm" 
                            radius="md" 
                            bg="rgba(16, 185, 129, 0.2)" 
                            withBorder
                            style={{
                                opacity: 0.8,
                                border: '1px solid rgba(16, 185, 129, 0.5)',
                            }}
                        >
                            <Group gap="sm">
                                <Avatar
                                    src={assignedTechnician.avatar}
                                    size="sm"
                                    radius="md"
                                    color="green"
                                    style={{ opacity: 0.8 }}
                                >
                                    {assignedTechnician.full_name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Text size="sm" fw={500} c="green" style={{ opacity: 0.9 }}>
                                        Técnico Asignado: {assignedTechnician.full_name}
                                    </Text>
                                    <Text size="xs" c="dimmed" style={{ opacity: 0.7 }}>
                                        {assignedTechnician.location || 'Ubicación no especificada'}
                                    </Text>
                                </Box>
                            </Group>
                        </Paper>
                    )}
                </Stack>
            </Card>
            </div>
        );
    };

    // Función para calcular métricas de proyectos
    const calculateProjectMetrics = () => {
        const activeProjects = projects.filter(p => 
            p.status === 'activo' || p.status === 'en-progreso'
        );

        if (activeProjects.length === 0) {
            setProjectMetrics({
                daysRemaining: 0,
                delayedProjects: 0
            });
            return;
        }

        // Calcular días restantes promedio
        const today = new Date();
        const daysRemainingArray = activeProjects
            .filter(p => p.end_date && new Date(p.end_date) > today)
            .map(p => {
                const endDate = new Date(p.end_date);
                const diffTime = endDate.getTime() - today.getTime();
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            });

        const daysRemaining = daysRemainingArray.length > 0 
            ? Math.round(daysRemainingArray.reduce((sum, days) => sum + days, 0) / daysRemainingArray.length)
            : 0;

        // Calcular proyectos atrasados
        const delayedProjects = activeProjects.filter(p => {
            if (!p.end_date) return false;
            
            const endDate = new Date(p.end_date);
            const today = new Date();
            
            // Ya vencidos
            if (endDate < today) return true;
            
            // Próximos a vencer (menos de 14 días) con progreso bajo
            const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const expectedProgress = Math.max(0, 100 - (daysLeft * 2)); // 2% por día
            
            return daysLeft < 14 && p.progress < expectedProgress;
        }).length;

        setProjectMetrics({
            daysRemaining,
            delayedProjects
        });

        // Actualizar también las métricas del servicio para consistencia
        serviceMetrics.projectMetrics.daysRemaining = daysRemaining;
        serviceMetrics.projectMetrics.delayedProjects = delayedProjects;
    };

    // Función para obtener proyectos activos ordenados por días restantes
    const getActiveProjectsSorted = () => {
        const today = new Date();
        return projects
            .filter(p => (p.status === 'activo' || p.status === 'en-progreso') && p.end_date)
            .map(p => {
                const endDate = new Date(p.end_date);
                const diffTime = endDate.getTime() - today.getTime();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...p, daysLeft };
            })
            .sort((a, b) => a.daysLeft - b.daysLeft);
    };

    // Función para obtener proyectos atrasados
    const getDelayedProjects = () => {
        const today = new Date();
        return projects.filter(p => {
            if (!p.end_date || (p.status !== 'activo' && p.status !== 'en-progreso')) return false;
            
            const endDate = new Date(p.end_date);
            
            // Ya vencidos
            if (endDate < today) return true;
            
            // Próximos a vencer (menos de 14 días) con progreso bajo
            const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const expectedProgress = Math.max(0, 100 - (daysLeft * 2));
            
            return daysLeft < 14 && p.progress < expectedProgress;
        });
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

    // Cargar issues cuando se active el modo de asignación
    useEffect(() => {
        if (assignMode) {
            fetchAllIssues();
        }
    }, [assignMode]);

    // Calcular métricas de proyectos cuando cambien los proyectos
    useEffect(() => {
        calculateProjectMetrics();
    }, [projects]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleProjectStatusClick = (status: string) => {
        console.log('Click en card de proyecto:', status);
        // Mapear los estados del dashboard a los filtros de la página de client-projects
        const statusMap: { [key: string]: string } = {
            'activo': 'activo',
            'en-progreso': 'en-progreso', 
            'completado': 'completado'
        };
        
        const filterValue = statusMap[status] || status;
        const url = `/client-projects?filter=${encodeURIComponent(filterValue)}`;
        console.log('Navegando a:', url);
        
        // Usar window.location para asegurar que la navegación funcione
        window.location.href = url;
    };


    const handleAcquireMoreScansClick = () => {
        navigate('/purchase-scans');
    };

    const clearFilters = () => {
        setProjectFilter('');
        setTypeFilter('');
        setStatusFilter('');
        setDateFilter(null);
    };

    // Función para filtrar problemas reportados
    const getFilteredProblems = () => {
        return reportedProblems.filter(problem => {
            const matchesProject = !projectFilter || problem.project.toLowerCase().includes(projectFilter.toLowerCase());
            const matchesType = !typeFilter || problem.type === typeFilter;
            const matchesStatus = !statusFilter || problem.status === statusFilter;
            const matchesDate = !dateFilter || new Date(problem.date_reported).toDateString() === dateFilter.toDateString();
            
            return matchesProject && matchesType && matchesStatus && matchesDate;
        });
    };

    // Función reutilizable para compartir un problema individual
    const shareIndividualProblem = async (problem: ReportedProblem) => {
        // Función para obtener emoji según el estado
        const getStatusEmoji = (status: string) => {
            switch (status) {
                case 'pendiente': return '🔴';
                case 'en-revision': return '🟡';
                case 'resuelto': return '🟢';
                default: return '⚪';
            }
        };
        
        // Función para obtener emoji según el tipo de problema
        const getTypeEmoji = (type: string) => {
            switch (type) {
                case 'hardware': return '🔧';
                case 'software': return '💻';
                case 'logistics': return '📦';
                case 'quality': return '⚠️';
                case 'safety': return '🛡️';
                default: return '❓';
            }
        };
        
        const statusLabel = problem.status === 'pendiente' ? 'PENDIENTE' : 
                          problem.status === 'en-revision' ? 'EN REVISIÓN' : 'RESUELTO';
        
        const problemText = `${getStatusEmoji(problem.status)} PROBLEMA REPORTADO
🏭 Proyecto: ${problem.project}
${getTypeEmoji(problem.type)} Tipo: ${getTypeLabel(problem.type)}
🏷️ No. Parte/VIN: ${problem.part_number_vin}
📍 Ubicación: ${problem.location}
📅 Reportado: ${new Date(problem.date_reported).toLocaleDateString('es-MX')}
👤 Estado: ${statusLabel}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        // Verificar si el navegador soporta la Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Problema Reportado - ${problem.project}`,
                    text: problemText
                });
                
                notifications.show({
                    title: 'Compartido',
                    message: 'Problema compartido exitosamente',
                    color: 'green'
                });
            } catch (error) {
                // Si el usuario cancela el compartir, no mostrar error
                if ((error as Error).name !== 'AbortError') {
                    console.error('Error al compartir:', error);
                    // Fallback a clipboard
                    await navigator.clipboard.writeText(problemText);
                    notifications.show({
                        title: 'Compartido',
                        message: 'Información del problema copiada al portapapeles',
                        color: 'blue'
                    });
                }
            }
        } else {
            // Fallback para navegadores que no soportan Web Share API
            await navigator.clipboard.writeText(problemText);
            notifications.show({
                title: 'Compartido',
                message: 'Información del problema copiada al portapapeles',
                color: 'blue'
            });
        }
    };

    const shareAllProblems = async () => {
        const filteredProblems = getFilteredProblems();
        
        // Calcular estadísticas
        const totalProblems = filteredProblems.length;
        const pendingCount = filteredProblems.filter(p => p.status === 'pendiente').length;
        const inReviewCount = filteredProblems.filter(p => p.status === 'en-revision').length;
        const resolvedCount = filteredProblems.filter(p => p.status === 'resuelto').length;
        
        // Función para obtener emoji según el estado
        const getStatusEmoji = (status: string) => {
            switch (status) {
                case 'pendiente': return '🔴';
                case 'en-revision': return '🟡';
                case 'resuelto': return '🟢';
                default: return '⚪';
            }
        };
        
        // Función para obtener emoji según el tipo de problema
        const getTypeEmoji = (type: string) => {
            switch (type) {
                case 'hardware': return '🔧';
                case 'software': return '💻';
                case 'logistics': return '📦';
                case 'quality': return '⚠️';
                case 'safety': return '🛡️';
                default: return '❓';
            }
        };
        
        // Crear el encabezado con estadísticas
        const header = `🚨 REPORTE DE PROBLEMAS - ${new Date().toLocaleDateString('es-MX')}
📊 Total: ${totalProblems} problemas | ⚠️ Pendientes: ${pendingCount} | 🔄 En Revisión: ${inReviewCount} | ✅ Resueltos: ${resolvedCount}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
        
        // Crear el contenido de cada problema
        const problemsText = filteredProblems
            .sort((a, b) => {
                // Ordenar por prioridad: pendientes primero, luego en revisión, luego resueltos
                const statusOrder = { 'pendiente': 0, 'en-revision': 1, 'resuelto': 2 };
                return statusOrder[a.status] - statusOrder[b.status];
            })
            .map((problem, index) => {
                const statusLabel = problem.status === 'pendiente' ? 'PENDIENTE' : 
                                  problem.status === 'en-revision' ? 'EN REVISIÓN' : 'RESUELTO';
                
                return `${getStatusEmoji(problem.status)} PROBLEMA #${index + 1} - ${statusLabel}
🏭 Proyecto: ${problem.project}
${getTypeEmoji(problem.type)} Tipo: ${getTypeLabel(problem.type)}
🏷️ No. Parte/VIN: ${problem.part_number_vin}
📍 Ubicación: ${problem.location}
📅 Reportado: ${new Date(problem.date_reported).toLocaleDateString('es-MX')}
👤 Estado: ${statusLabel}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            }).join('');
        
        const finalText = header + problemsText;
        
        // Verificar si el navegador soporta la Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Reporte de Problemas - ${new Date().toLocaleDateString('es-MX')}`,
                    text: finalText
                });
                
        notifications.show({
            title: 'Compartido',
                    message: `Reporte de ${totalProblems} problemas compartido exitosamente`,
            color: 'green'
        });
            } catch (error) {
                // Si el usuario cancela el compartir, no mostrar error
                if ((error as Error).name !== 'AbortError') {
                    console.error('Error al compartir:', error);
                    // Fallback a clipboard
                    await navigator.clipboard.writeText(finalText);
                    notifications.show({
                        title: 'Compartido',
                        message: `Reporte de ${totalProblems} problemas copiado al portapapeles`,
                        color: 'blue'
                    });
                }
            }
        } else {
            // Fallback para navegadores que no soportan Web Share API
            await navigator.clipboard.writeText(finalText);
            notifications.show({
                title: 'Compartido',
                message: `Reporte de ${totalProblems} problemas copiado al portapapeles`,
                color: 'blue'
            });
        }
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
            {/* Estilos específicos para móvil */}
            <style>
                {`
                    @media (max-width: 768px) {
                        .mobile-header {
                            flex-direction: column !important;
                            align-items: flex-start !important;
                            gap: 16px !important;
                        }
                        
                        .mobile-user-info {
                            width: 100% !important;
                        }
                        
                        .mobile-user-name {
                            font-size: 18px !important;
                            line-height: 1.2 !important;
                        }
                        
                        .mobile-date {
                            font-size: 14px !important;
                            margin-top: 4px !important;
                        }
                        
                        .mobile-actions {
                            width: 100% !important;
                            justify-content: space-between !important;
                            flex-wrap: wrap !important;
                            gap: 8px !important;
                        }
                        
                        .mobile-button {
                            flex: 1 !important;
                            min-width: 120px !important;
                            font-size: 12px !important;
                            padding: 8px 12px !important;
                        }
                        
                        .mobile-badge {
                            font-size: 10px !important;
                            padding: 4px 8px !important;
                        }
                        
                        .mobile-stats-grid {
                            grid-template-columns: 1fr 1fr !important;
                            gap: 12px !important;
                        }
                        
                        .mobile-stats-grid .mobile-stat-card:nth-child(1),
                        .mobile-stats-grid .mobile-stat-card:nth-child(4) {
                            grid-column: 1 / -1 !important;
                        }
                        
                        .mobile-stats-grid .mobile-stat-card:nth-child(2) .mobile-stat-value {
                            display: flex !important;
                            align-items: center !important;
                            justify-content: space-between !important;
                        }
                        
                        .mobile-stats-grid .mobile-stat-card:nth-child(2) .mobile-stat-icon {
                            position: relative !important;
                            margin-left: 8px !important;
                        }
                        
                        .mobile-stat-card {
                            padding: 16px !important;
                        }
                        
                        .mobile-stat-title {
                            font-size: 10px !important;
                            margin-bottom: 4px !important;
                        }
                        
                        .mobile-stat-value {
                            font-size: 20px !important;
                            margin-bottom: 4px !important;
                        }
                        
                        .mobile-stat-subtitle {
                            font-size: 11px !important;
                            line-height: 1.3 !important;
                        }
                        
                        .mobile-stat-icon {
                            width: 24px !important;
                            height: 24px !important;
                        }
                        
                        .mobile-metrics-section {
                            margin-top: 24px !important;
                        }
                        
                        .mobile-metrics-header {
                            flex-direction: column !important;
                            align-items: flex-start !important;
                            gap: 8px !important;
                            margin-bottom: 16px !important;
                        }
                        
                        .mobile-metrics-title {
                            font-size: 16px !important;
                        }
                        
                        .mobile-project-bars {
                            grid-template-columns: 1fr !important;
                            gap: 12px !important;
                        }
                        
                        .mobile-project-bar {
                            padding: 12px !important;
                        }
                        
                        .mobile-project-bar-title {
                            font-size: 13px !important;
                        }
                        
                        .mobile-project-bar-badge {
                            font-size: 14px !important;
                            padding: 4px 8px !important;
                        }
                        
                        .mobile-metrics-cards {
                            grid-template-columns: 1fr !important;
                            gap: 12px !important;
                        }
                        
                        .mobile-metric-card {
                            padding: 12px !important;
                        }
                        
                        .mobile-metric-title {
                            font-size: 12px !important;
                        }
                        
                        .mobile-metric-value {
                            font-size: 18px !important;
                        }
                        
                        .mobile-metric-subtitle {
                            font-size: 10px !important;
                        }
                        
                        .mobile-activity-section {
                            margin-top: 24px !important;
                        }
                        
                        .mobile-activity-title {
                            font-size: 16px !important;
                            margin-bottom: 12px !important;
                        }
                        
                        .mobile-activity-item {
                            padding: 8px !important;
                            margin-bottom: 6px !important;
                        }
                        
                        .mobile-activity-icon {
                            width: 32px !important;
                            height: 32px !important;
                        }
                        
                        .mobile-activity-name {
                            font-size: 13px !important;
                        }
                        
                        .mobile-activity-project {
                            font-size: 11px !important;
                        }
                        
                        .mobile-activity-time {
                            font-size: 11px !important;
                        }
                        
                        .mobile-activity-status {
                            font-size: 10px !important;
                        }
                        
                        .mobile-modal-title {
                            font-size: 18px !important;
                        }
                        
                        .mobile-modal-header {
                            flex-direction: column !important;
                            gap: 12px !important;
                        }
                        
                        .mobile-carousel-slide {
                            padding: 12px !important;
                        }
                        
                        .mobile-project-card {
                            padding: 16px !important;
                        }
                        
                        .mobile-project-name {
                            font-size: 16px !important;
                        }
                        
                        .mobile-project-progress-badge {
                            font-size: 14px !important;
                            padding: 4px 8px !important;
                        }
                        
                        .mobile-project-location {
                            font-size: 12px !important;
                        }
                        
                        .mobile-project-stats {
                            gap: 8px !important;
                        }
                        
                        .mobile-project-stat-title {
                            font-size: 11px !important;
                        }
                        
                        .mobile-project-stat-value {
                            font-size: 14px !important;
                        }
                        
                        .mobile-project-contact {
                            font-size: 12px !important;
                        }
                        
                        .mobile-filter-section {
                            padding: 12px !important;
                            margin-bottom: 12px !important;
                        }
                        
                        .mobile-filter-title {
                            font-size: 14px !important;
                            margin-bottom: 8px !important;
                        }
                        
                        .mobile-filter-grid {
                            grid-template-columns: 1fr !important;
                            gap: 8px !important;
                        }
                        
                        .mobile-filter-input {
                            font-size: 12px !important;
                        }
                        
                        .mobile-problem-card {
                            padding: 12px !important;
                        }
                        
                        .mobile-problem-header {
                            flex-direction: column !important;
                            gap: 8px !important;
                        }
                        
                        .mobile-problem-title {
                            font-size: 14px !important;
                        }
                        
                        .mobile-problem-date {
                            font-size: 11px !important;
                        }
                        
                        .mobile-problem-info {
                            grid-template-columns: 1fr !important;
                            gap: 8px !important;
                        }
                        
                        .mobile-problem-info-text {
                            font-size: 11px !important;
                        }
                        
                        .mobile-problem-location {
                            font-size: 11px !important;
                        }
                    }
                `}
            </style>

            <Group justify="space-between" mb="xl" className="mobile-header">
                <div className="mobile-user-info">
                    <Group align="center" gap="xs">
                        <Badge color="orange" size="lg" className="mobile-badge">CLIENT</Badge>
                        <Group gap={8}>
                            <Text size="lg" fw={700} c="teal.4" className="mobile-user-name">
                                {effectiveUser?.full_name}
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
                    <Text size="sm" c="dimmed" className="mobile-date">
                        {new Date().toLocaleDateString('es-MX', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </Text>
                </div>
                <Group gap="md" className="mobile-actions">
                    {/* Badge y botón para sesión temporal */}
                    {localStorage.getItem('admin_token') && (
                        <>
                            <Badge 
                                color="orange" 
                                variant="light" 
                                size="sm"
                                leftSection={<IconUser size={12} />}
                                className="mobile-badge"
                            >
                                Sesión Temporal
                            </Badge>
                            <Button 
                                color="orange" 
                                variant="light"
                                size="sm"
                                className="mobile-button"
                                onClick={() => {
                                    // Restaurar credenciales del admin
                                    const adminToken = localStorage.getItem('admin_token');
                                    const adminUser = localStorage.getItem('admin_user');
                                    
                                    if (adminToken && adminUser) {
                                        // Hacer logout de la sesión temporal primero
                                        logout();
                                        
                                        // Restaurar credenciales del admin
                                        localStorage.setItem('token', adminToken);
                                        localStorage.setItem('user', adminUser);
                                        localStorage.removeItem('admin_token');
                                        localStorage.removeItem('admin_user');
                                        
                                        // Actualizar el contexto con las credenciales del admin
                                        setUser(JSON.parse(adminUser));
                                        setAuthenticated(true);
                                    }
                                    
                                    navigate('/dashboard');
                                }}
                            >
                                Volver a Admin
                            </Button>
                        </>
                    )}
                    <Button onClick={handleLogout} color="red" className="mobile-button">
                        Cerrar Sesión
                    </Button>
                </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" className="mobile-stats-grid">
                {stats.map((stat) => (
                    <Card 
                        key={stat.title} 
                        padding="lg" 
                        radius="md" 
                        bg={stat.bg}
                        className="mobile-stat-card"
                        onClick={stat.title === 'ADQUIRIR MÁS ESCANEOS' ? handleAcquireMoreScansClick : undefined}
                        style={{ 
                            cursor: stat.title === 'ADQUIRIR MÁS ESCANEOS' ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            '&:hover': stat.title === 'ADQUIRIR MÁS ESCANEOS' ? {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                            } : {}
                        }}
                    >
                        <Group justify="space-between">
                            <div>
                                <Text c="dimmed" tt="uppercase" fw={700} size="xs" className="mobile-stat-title">
                                    {stat.title}
                                </Text>
                                {stat.title === 'ESCANEOS UTILIZADOS' ? (
                                    <Group gap="xs" align="center">
                                        <Text fw={700} size="xl" c="gray.1" className="mobile-stat-value">
                                            {stat.value}
                                        </Text>
                                        <stat.icon size={24} color={stat.color} className="mobile-stat-icon" />
                                    </Group>
                                ) : (
                                    <Text fw={700} size={stat.title === 'ADQUIRIR MÁS ESCANEOS' ? 'sm' : 'xl'} c="gray.1" className="mobile-stat-value">
                                        {stat.value}
                                    </Text>
                                )}
                                {stat.subtitle && (
                                    <Text c="dimmed" size="xs" mt={4} className="mobile-stat-subtitle">
                                        {stat.subtitle}
                                    </Text>
                                )}
                            </div>
                            {stat.title !== 'ESCANEOS UTILIZADOS' && (
                                <stat.icon size={32} color={stat.color} className="mobile-stat-icon" />
                            )}
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            <Grid mt={50} className="mobile-metrics-section">
                <Grid.Col span={{ base: 12, md: 12, lg: 8 }}>
                    <Paper withBorder radius="md" p="sm">
                        <Group justify="space-between" mb="md" className="mobile-metrics-header">
                            <Group>
                                <IconChartBar size={20} color="#666" />
                                <Text fw={500} size="md" c="gray.3" className="mobile-metrics-title">
                                    Métricas de Proyectos
                                </Text>
                            </Group>
                            <Group gap="xs">
                                <Text size="sm" c="dimmed">Total de Proyectos:</Text>
                                <Text size="sm" fw={700}>{projectStats.total}</Text>
                            </Group>
                        </Group>

                        {/* Fila superior: Barras de estado de proyectos */}
                        <Stack gap="md" mb="lg">
                            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" className="mobile-project-bars">
                                {/* Barra de Proyectos En Progreso */}
                                <Paper 
                                    p="md" 
                                    withBorder
                                    className="mobile-project-bar"
                                    onClick={() => {
                                        console.log('Click en En Progreso');
                                        handleProjectStatusClick('en-progreso');
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Group justify="space-between" mb={8}>
                                        <Text size="sm" fw={500} className="mobile-project-bar-title">En Progreso</Text>
                                        <Badge size="lg" variant="filled" color="violet" className="mobile-project-bar-badge">
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

                                {/* Barra de Proyectos Activos */}
                                <Paper 
                                    p="md" 
                                    withBorder
                                    className="mobile-project-bar"
                                    onClick={() => {
                                        console.log('Click en Activos');
                                        handleProjectStatusClick('activo');
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Group justify="space-between" mb={8}>
                                        <Text size="sm" fw={500} className="mobile-project-bar-title">Activos</Text>
                                        <Badge size="lg" variant="filled" color="blue" className="mobile-project-bar-badge">
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

                                {/* Barra de Proyectos Terminados */}
                                <Paper 
                                    p="md" 
                                    withBorder
                                    className="mobile-project-bar"
                                    onClick={() => {
                                        console.log('Click en Terminados');
                                        handleProjectStatusClick('completado');
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Group justify="space-between" mb={8}>
                                        <Text size="sm" fw={500} className="mobile-project-bar-title">Terminados</Text>
                                        <Badge size="lg" variant="filled" color="green" className="mobile-project-bar-badge">
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
                        <Grid className="mobile-metrics-cards">
                            <Grid.Col span={4}>
                                <Card 
                                    p="md" 
                                    radius="md" 
                                    withBorder
                                    className="mobile-metric-card"
                                    onClick={() => setDaysRemainingModalOpen(true)}
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
                                        <Text fw={500} size="sm" c="dimmed" className="mobile-metric-title">
                                            Días Restantes
                                        </Text>
                                        <Group justify="space-between" align="flex-end">
                                            <Text 
                                                size="xl" 
                                                fw={700} 
                                                c={
                                                    projectMetrics.daysRemaining > 30 ? 'green' :
                                                    projectMetrics.daysRemaining > 7 ? 'yellow' : 'red'
                                                }
                                                className="mobile-metric-value"
                                            >
                                                {projectMetrics.daysRemaining}
                                            </Text>
                                            <Text size="sm" c="dimmed" className="mobile-metric-subtitle">
                                                Promedio
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
                                    className="mobile-metric-card"
                                    onClick={() => setDelayedProjectsModalOpen(true)}
                                    style={{ 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                        }
                                    }}
                                >
                                    <Stack gap={0}>
                                        <Text fw={500} size="sm" c="dimmed" className="mobile-metric-title">
                                            Atrasados
                                        </Text>
                                        <Group justify="space-between" align="flex-end">
                                            <Text 
                                                size="xl" 
                                                fw={700} 
                                                c={projectMetrics.delayedProjects > 0 ? 'red' : 'green'}
                                                className="mobile-metric-value"
                                            >
                                                {projectMetrics.delayedProjects}
                                            </Text>
                                            <Text size="sm" c="dimmed" className="mobile-metric-subtitle">
                                                Requieren atención
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
                                    className="mobile-metric-card"
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
                                        <Text fw={500} size="sm" c="dimmed" className="mobile-metric-title">
                                            Problemas Reportados
                                        </Text>
                                        <Group justify="space-between" align="flex-end">
                                            <Text size="xl" fw={700} c="yellow" className="mobile-metric-value">
                                                {issuesLoading ? '...' : pendingIssuesCount}
                                            </Text>
                                            <Text size="sm" c="dimmed" className="mobile-metric-subtitle">
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
                        p="sm" 
                        radius="md" 
                        withBorder
                        className="mobile-activity-section"
                        style={{ 
                            backgroundColor: '#1A1B1E',
                        }}
                    >
                        <Text size="md" fw={700} c="gray.2" mb="sm" className="mobile-activity-title">
                            Actividad Reciente
                        </Text>
                        <Stack 
                            gap="xs" 
                            style={{ 
                                maxHeight: '200px',
                                overflowY: 'auto',
                                scrollbarWidth: 'thin'
                            }}
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
                                    className="mobile-activity-item"
                                    style={{ 
                                        borderRadius: '6px', 
                                        backgroundColor: '#25262B',
                                        marginBottom: '4px'
                                    }}
                                >
                                    <Group>
                                        <ThemeIcon 
                                            size="lg" 
                                            radius="xl" 
                                            variant="light"
                                            color={activity.type === 'check-in' ? 'green' : 'red'}
                                            className="mobile-activity-icon"
                                        >
                                            <IconDoorEnter 
                                                size={18} 
                                                style={{ 
                                                    transform: activity.type === 'check-out' ? 'scaleX(-1)' : 'none' 
                                                }} 
                                            />
                                        </ThemeIcon>
                                        <div>
                                            <Text size="sm" fw={500} className="mobile-activity-name">
                                                {activity.user_name.split(' ')[0]} {activity.user_name.split(' ')[1]?.[0]}.
                                            </Text>
                                            <Text size="xs" c="dimmed" className="mobile-activity-project">
                                                <Text span c="blue">{activity.project_name}</Text>
                                            </Text>
                                        </div>
                                    </Group>
                                    <Stack gap={0} align="flex-end">
                                        <Text size="sm" c="dimmed" className="mobile-activity-time">
                                            {new Date(activity.timestamp).toLocaleTimeString('es-MX', {
                                                hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                            })}
                                        </Text>
                                        <Text size="xs" c={activity.type === 'check-in' ? 'teal' : 'red'} className="mobile-activity-status">
                                            {activity.type === 'check-in' ? '✓ Registrado' : '← Salida'}
                                        </Text>
                                    </Stack>
                                </Group>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Añadir el Modal */}
            <Modal
                opened={inProgressModalOpen}
                onClose={() => setInProgressModalOpen(false)}
                title={
                    <Group justify="space-between" w="100%" className="mobile-modal-header">
                        <Text fw={500} size="xl" className="mobile-modal-title">Proyectos en Progreso</Text>
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
                        <Carousel.Slide key={project.id} className="mobile-carousel-slide">
                            <Card p="xl" radius="md" withBorder h="100%" className="mobile-project-card">
                                <Stack gap="md">
                                    <Group justify="space-between" mb={-5} align="flex-start" wrap="nowrap">
                                        <Box maw="70%">
                                            <Text fw={500} size="xl" truncate className="mobile-project-name">
                                                {project.name}
                                            </Text>
                                        </Box>
                                        <Badge 
                                            color="blue" 
                                            variant="light" 
                                            size="xl"
                                            className="mobile-project-progress-badge"
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
                                        <Text size="sm" c="dimmed" truncate className="mobile-project-location">
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

                                    <Group grow align="flex-start" gap="xs" className="mobile-project-stats">
                                        <Stack gap={4}>
                                            <Text size="sm" fw={500} className="mobile-project-stat-title">Partes</Text>
                                            <Group gap={4}>
                                                <Text size="lg" fw={600} c="teal" className="mobile-project-stat-value">
                                                    {project.completed_parts}
                                                </Text>
                                                <Text size="sm" c="dimmed">/</Text>
                                                <Text size="sm" c="dimmed">
                                                    {project.total_parts}
                                                </Text>
                                            </Group>
                                        </Stack>
                                        <Stack gap={4}>
                                            <Text size="sm" fw={500} className="mobile-project-stat-title">Técnicos</Text>
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
                                            <Text size="sm" truncate className="mobile-project-contact">
                                                {project.plantContact.name}
                                            </Text>
                                        </Group>
                                        <Group gap="xs" align="center" ml={24}>
                                            <Text size="sm" c="dimmed" className="mobile-project-contact">
                                                {project.plantContact.phone}
                                            </Text>
                                        </Group>
                                        <Group gap="xs" align="center" ml={24}>
                                            <Text size="sm" c="dimmed" className="mobile-project-contact">
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
                    <Group justify="space-between" w="100%" className="mobile-modal-header">
                        <Text fw={500} size="xl" className="mobile-modal-title">Problemas Reportados</Text>
                        <Group gap="sm">
                            <Badge size="lg" variant="filled" color="yellow">
                                {getFilteredProblems().length} problemas
                            </Badge>
                            <Button 
                                variant="light" 
                                color="blue" 
                                size="sm"
                                leftSection={<IconShare size={16} />}
                                onClick={shareAllProblems}
                            >
                                Compartir Todo
                            </Button>
                            <Button 
                                variant={assignMode ? "filled" : "light"} 
                                color="green" 
                                size="sm"
                                leftSection={<IconUserPlus size={16} />}
                                onClick={() => {
                                    setAssignMode(!assignMode);
                                }}
                            >
                                {assignMode ? "Exit Assign" : "Assign Mode"}
                            </Button>
                        </Group>
                    </Group>
                }
                size="90%"
            >
                {/* Filtros */}
                <Paper p="md" radius="md" withBorder mb="md" className="mobile-filter-section">
                    <Group justify="space-between" mb="md">
                        <Group gap="xs">
                            <IconFilter size={20} color="#666" />
                            <Text fw={500} size="md" c="gray.3" className="mobile-filter-title">
                                Filtros
                            </Text>
                        </Group>
                        <Button 
                            variant="light" 
                            color="gray" 
                            size="xs"
                            leftSection={<IconX size={14} />}
                            onClick={clearFilters}
                        >
                            Limpiar
                        </Button>
                    </Group>
                    
                    <Grid className="mobile-filter-grid">
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
                                className="mobile-filter-input"
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
                                className="mobile-filter-input"
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
                                className="mobile-filter-input"
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
                                className="mobile-filter-input"
                            />
                        </Grid.Col>
                    </Grid>
                </Paper>
                {assignMode ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                            gap: '24px',
                        alignItems: 'start'
                    }}>
                            {/* Columna izquierda - Problemas */}
                            <div>
                                <Text fw={600} size="lg" mb="md" c="white">
                                    Problemas Reportados ({getFilteredProblems().length})
                                </Text>
                                <Stack gap="md">
                        {getFilteredProblems().map((problem) => (
                                        <DroppableProblemCard key={problem.id} problem={problem} />
                                    ))}
                                </Stack>
                            </div>

                            {/* Columna derecha - Técnicos */}
                            <div>
                                <Text fw={600} size="lg" mb="md" c="white">
                                    Técnicos Disponibles ({employees.filter(emp => emp.role === 'tecnico').length})
                                </Text>
                                <SortableContext 
                                    items={employees.filter(emp => emp.role === 'tecnico').map(emp => `tech-${emp.id}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <Stack gap="md">
                                        {employees.filter(emp => emp.role === 'tecnico').map((technician) => (
                                            <DraggableTechnicianCard key={technician.id} technician={technician} />
                                        ))}
                                    </Stack>
                                </SortableContext>
                            </div>
                        </div>

                        <DragOverlay>
                            {activeTechnician ? (
                            <Card 
                                p="md" 
                                radius="md" 
                                withBorder 
                                style={{
                                        opacity: 0.8,
                                        transform: 'rotate(5deg)',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                                }}
                            >
                                        <Group gap="sm">
                                        <Avatar
                                            src={activeTechnician.avatar}
                                                size="lg" 
                                            radius="md"
                                            color="blue"
                                        >
                                            {activeTechnician.full_name.charAt(0).toUpperCase()}
                                        </Avatar>
                                            <Box>
                                            <Text fw={600} size="md" c="white">
                                                {activeTechnician.full_name}
                                                </Text>
                                            <Text size="sm" c="dimmed">
                                                Técnico Especializado
                                                </Text>
                                            </Box>
                                        </Group>
                            </Card>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    <Stack gap="md">
                        {getFilteredProblems().map((problem) => (
                            <Card 
                                key={problem.id} 
                                p="lg" 
                                radius="md" 
                                withBorder 
                                className="mobile-problem-card"
                                style={{
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: 1,
                                }}
                            >
                                <Stack gap="md">
                                    {/* Header del problema */}
                                    <Group justify="space-between" align="flex-start" className="mobile-problem-header">
                                        <Group gap="sm">
                                            <ThemeIcon 
                                                size="lg" 
                                                variant="light" 
                                                color={
                                                    problem.type === 'Falla Mecánica' ? 'red' :
                                                    problem.type === 'Error de Software' ? 'blue' :
                                                    'orange'
                                                }
                                            >
                                                <IconTools size={20} />
                                            </ThemeIcon>
                                            <Box>
                                                <Text fw={600} size="lg" c="white" className="mobile-problem-title">
                                                    {getTypeLabel(problem.type)}
                                                </Text>
                                                <Text size="sm" c="dimmed" className="mobile-problem-date">
                                                    Reportado el {new Date(problem.date_reported).toLocaleDateString('es-MX')}
                                                </Text>
                                            </Box>
                                        </Group>
                                        <Group gap="sm">
                                            <ActionIcon
                                                variant="light"
                                                color="blue"
                                                size="lg"
                                                onClick={() => shareIndividualProblem(problem)}
                                                title="Compartir problema"
                                            >
                                                <IconShare size={18} />
                                            </ActionIcon>
                                            <Badge 
                                                color={
                                                    problem.status === 'pendiente' ? 'red' :
                                                    problem.status === 'en-revision' ? 'yellow' :
                                                    'green'
                                                }
                                                variant="light"
                                            >
                                                {problem.status === 'pendiente' ? 'Pendiente' :
                                                 problem.status === 'en-revision' ? 'En Revisión' :
                                                 'Resuelto'}
                                            </Badge>
                                        </Group>
                                    </Group>

                                    {/* Información del problema */}
                                    <Grid className="mobile-problem-info">
                                        <Grid.Col span={6}>
                                            <Stack gap="xs">
                                                <Group gap="xs">
                                                    <Text size="sm" c="dimmed" className="mobile-problem-info-text">No. de Parte / VIN:</Text>
                                                    <Text size="sm" fw={500} c="white" className="mobile-problem-info-text">{problem.part_number_vin}</Text>
                                                </Group>
                                                <Group gap="xs">
                                                    <Text size="sm" c="dimmed" className="mobile-problem-info-text">Proyecto:</Text>
                                                    <Text size="sm" fw={500} c="white" className="mobile-problem-info-text">{problem.project}</Text>
                                                </Group>
                                            </Stack>
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <Stack gap="xs">
                                                <Group gap="xs">
                                                    <Text size="sm" c="dimmed" className="mobile-problem-info-text">Ubicación:</Text>
                                                    <Text 
                                                        size="sm" 
                                                        fw={500} 
                                                        c="blue" 
                                                        className="mobile-problem-location"
                                                        style={{ 
                                                            cursor: 'pointer', 
                                                            textDecoration: 'underline',
                                                            textDecorationColor: 'rgba(255, 255, 255, 0.3)'
                                                        }}
                                                        onClick={() => openLocationInMaps(problem.location)}
                                                        title="Hacer clic para abrir en mapas"
                                                    >
                                                        {problem.location}
                                                    </Text>
                                                </Group>
                                            </Stack>
                                        </Grid.Col>
                                    </Grid>
                                </Stack>
                            </Card>
                        ))}
                    </Stack>
                )}
            </Modal>

            {/* Modal de Días Restantes */}
            <Modal
                opened={daysRemainingModalOpen}
                onClose={() => setDaysRemainingModalOpen(false)}
                title={
                    <Group gap="xs">
                        <Text fw={500} size="xl">Proyectos Activos</Text>
                        <Badge size="lg" variant="filled" color="blue">
                            {getActiveProjectsSorted().length} proyectos
                        </Badge>
                    </Group>
                }
                size="lg"
            >
                <Stack gap="md">
                    {getActiveProjectsSorted().map((project) => (
                        <Card key={project.id} p="md" radius="md" withBorder>
                            <Stack gap="sm">
                                <Group justify="space-between" align="flex-start">
                                    <Box style={{ flex: 1 }}>
                                        <Text fw={600} size="lg" c="white" truncate>
                                            {project.name}
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            {project.location?.plant_name || 'Sin ubicación'}
                                        </Text>
                                    </Box>
                                    <Badge 
                                        size="lg" 
                                        variant="filled" 
                                        color={
                                            project.daysLeft > 30 ? 'green' :
                                            project.daysLeft > 7 ? 'yellow' : 'red'
                                        }
                                    >
                                        {project.daysLeft} días
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
                                        width: `${project.progress}%`,
                                        height: '100%',
                                        backgroundColor: '#6366F1',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">
                                        Progreso: {project.progress}%
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {project.completed_parts} / {project.total_parts} partes
                                    </Text>
                                </Group>
                            </Stack>
                        </Card>
                    ))}
                </Stack>
            </Modal>

            {/* Modal de Proyectos Atrasados */}
            <Modal
                opened={delayedProjectsModalOpen}
                onClose={() => setDelayedProjectsModalOpen(false)}
                title={
                    <Group gap="xs">
                        <Text fw={500} size="xl">Proyectos que Requieren Atención</Text>
                        <Badge size="lg" variant="filled" color="red">
                            {getDelayedProjects().length} proyectos
                        </Badge>
                    </Group>
                }
                size="lg"
            >
                <Stack gap="md">
                    {getDelayedProjects().map((project) => {
                        const today = new Date();
                        const endDate = new Date(project.end_date);
                        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const isOverdue = endDate < today;
                        
                        return (
                            <Card key={project.id} p="md" radius="md" withBorder>
                                <Stack gap="sm">
                                    <Group justify="space-between" align="flex-start">
                                        <Box style={{ flex: 1 }}>
                                            <Text fw={600} size="lg" c="white" truncate>
                                                {project.name}
                                            </Text>
                                            <Text size="sm" c="dimmed">
                                                {project.location?.plant_name || 'Sin ubicación'}
                                            </Text>
                                        </Box>
                                        <Badge 
                                            size="lg" 
                                            variant="filled" 
                                            color={isOverdue ? 'red' : 'yellow'}
                                        >
                                            {isOverdue ? 'VENCIDO' : `${daysLeft} días`}
                                        </Badge>
                                    </Group>
                                    
                                    <div style={{ 
                                        width: '100%', 
                                        height: '8px', 
                                        backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${project.progress}%`,
                                            height: '100%',
                                            backgroundColor: '#EF4444',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                    
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">
                                            Progreso: {project.progress}%
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            {project.completed_parts} / {project.total_parts} partes
                                        </Text>
                                    </Group>
                                </Stack>
                            </Card>
                        );
                    })}
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