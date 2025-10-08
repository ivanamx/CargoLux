import { Table, Avatar, Text, Badge, Group, Paper, Title, TextInput, Select, Stack, Modal, Button, Grid, ThemeIcon, ActionIcon, Radio, Checkbox, List, SimpleGrid, ScrollArea } from '@mantine/core';
import { IconMapPin, IconSearch, IconPhone, IconMail, IconDownload, IconCalendar, IconCertificate, IconChartBar, IconUserCircle, IconBuildingSkyscraper, IconChartDonut, IconAlertCircle, IconSettings, IconPlus, IconEdit, IconUpload, IconUserPlus, IconTrash, IconX, IconBriefcase } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dropzone } from '@mantine/dropzone';
import { useEmployees } from '../context/EmployeeContext';
import { useProjects } from '../context/ProjectContext';
import { notifications } from '@mantine/notifications';
import { employeeService } from '../services/api';
import { API_URL } from '../services/api';
import { getToken } from '../services/auth';

interface Employee {
    id: number;
    email: string;
    full_name: string;
    location: string;
    phone: string;
    status: string;
    role: string;
    avatar?: string;
    personal_info: {
        curp: string;
        rfc: string;
        birth_date: string;
        address: string;
        emergency_contact: {
            name: string;
            phone: string;
            relation: string;
        };
    };
    employment_info: {
        start_date: string;
        last_contract_renewal: string;
        contract_file: string;
        position: string;
        supervisor: string;
        certifications: string[];
    };
    hr_info: {
        salary: {
            base: number;
            last_increase: string;
            next_review_date: string;
        };
        benefits: string[];
        vacations: {
            days_total: number;
            days_used: number;
            next_vacation_date: string;
            history: Array<{
                start_date: string;
                end_date: string;
                days: number;
            }>;
        };
        documents: Array<{
            name: string;
            type: string;
            upload_date: string;
            file_url: string;
        }>;
    };
    project?: string;  // Lista de proyectos asignados separados por coma
}

const getStatusColor = (status: string) => {
    const colors = {
        presente: 'green',
        ausente: 'red',
        vacaciones: 'blue',
        incapacidad: 'orange',
        'en-ruta': 'orange'
    };
    return colors[status as keyof typeof colors];
};

export type { Employee };

export default function Employees() {
    console.log("VITE_API_URL en runtime:", import.meta.env.VITE_API_URL);
    const { employees, setEmployees } = useEmployees();
    const { projects } = useProjects();
    const location = useLocation();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [locationFilter, setLocationFilter] = useState<string | null>(null);
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showExpediente, setShowExpediente] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [showAssignProjectModal, setShowAssignProjectModal] = useState(false);
    const [employeeToAssign, setEmployeeToAssign] = useState<Employee | null>(null);
    const [selectedProjectsToAssign, setSelectedProjectsToAssign] = useState<string[]>([]);
    const [projectsModalOpen, setProjectsModalOpen] = useState(false);
    const [selectedEmployeeProjects, setSelectedEmployeeProjects] = useState<string[]>([]);
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

    const [newEmployee, setNewEmployee] = useState({
        firstName: '',
        lastName: '',
        secondLastName: '',
        location: '',
        phone: '',
        email: '',
        curp: '',
        rfc: '',
        birthDate: '',
        startDate: '',
        position: '',
        salary: '',
        vacationDays: '',
        contractFile: null as File | null,
        avatar: null as File | null
    });

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const data = await employeeService.getEmployees();
                
                // Los datos ya vienen con el campo role del backend
                setEmployees(data);
            } catch (error) {
                console.error('Error al cargar empleados:', error);
                notifications.show({
                    title: 'Error',
                    message: 'Error al cargar la lista de empleados',
                    color: 'red'
                });
            }
        };

        loadEmployees();
    }, []);

    useEffect(() => {
        if (location.state?.openExpediente) {
            const technicianName = location.state.technicianName;
            const employee = employees.find(emp => emp.full_name === technicianName);
            if (employee) {
                setSelectedEmployee(employee);
                setShowExpediente(true);
            }
        }
    }, [location]);

    useEffect(() => {
        console.log('Proyectos disponibles:', projects);
    }, [projects]);

    const filteredEmployees = employees.filter(employee => {
        // Asegurarnos que employee y full_name existan antes de usar toLowerCase
        const employeeName = employee?.full_name || '';
        const searchLower = search.toLowerCase();
        
        const matchesSearch = employeeName.toLowerCase().includes(searchLower);
        const matchesStatus = !statusFilter || employee.status === statusFilter;
        const matchesLocation = !locationFilter || employee.location === locationFilter;
        const matchesRole = !roleFilter || employee.role === roleFilter;

        return matchesSearch && matchesStatus && matchesLocation && matchesRole;
    });

    const locations = [...new Set(employees.map(emp => emp.location).filter(Boolean))];

    const openEmployeeDetails = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowExpediente(true);
    };

    const openEmployeeEdit = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEditing(true);
        const names = employee.full_name.split(' ');
        setNewEmployee({
            firstName: names[0] || '',
            lastName: names[1] || '',
            secondLastName: names[2] || '',
            location: employee.location,
            phone: employee.phone,
            email: employee.email,
            curp: employee.personal_info?.curp || '',
            rfc: employee.personal_info?.rfc || '',
            birthDate: employee.personal_info?.birth_date || '',
            startDate: employee.employment_info?.start_date || '',
            position: employee.employment_info?.position || '',
            salary: employee.hr_info?.salary.base.toString() || '',
            vacationDays: employee.hr_info?.vacations.days_total.toString() || '',
            contractFile: null,
            avatar: null
        });
        setShowAddModal(true);
    };

    const openProjectsList = (projects: string) => {
        const projectList = projects.split(', ')
            .filter(p => p.trim() !== '' && p.trim() !== 'Sin proyecto asignado');
        setSelectedEmployeeProjects(projectList);
        setProjectsModalOpen(true);
    };

    const handleSaveEmployee = async () => {
        try {
            // Llama al servicio de API para crear el empleado
            const result = await employeeService.createEmployee(
                newEmployee,
                newEmployee.avatar,
                newEmployee.contractFile
            );
            
            // Actualiza la lista de empleados en el estado
            setEmployees(prev => [...prev, result]);
            
            // Limpia el formulario y cierra el modal
            setShowAddModal(false);
            setNewEmployee({
                firstName: '',
                lastName: '',
                secondLastName: '',
                location: '',
                phone: '',
                email: '',
                curp: '',
                rfc: '',
                birthDate: '',
                startDate: '',
                position: '',
                salary: '',
                vacationDays: '',
                contractFile: null,
                avatar: null
            });

            notifications.show({
                title: 'Éxito',
                message: 'Empleado creado correctamente',
                color: 'green'
            });

        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Error al crear empleado',
                color: 'red'
            });
        }
    };

    const handleProjectClick = (employee: Employee) => {
        if (employee.project) {
            // Buscar el proyecto por nombre en la lista de proyectos
            const projectNames = employee.project.split(', '); // Por si tiene múltiples proyectos
            const projectToShow = projects.find(p => projectNames.includes(p.name));
            
            if (projectToShow) {
                navigate('/projects', { 
                    state: { 
                        openProject: projectToShow.id,  // Usar el ID del proyecto encontrado
                        showProjectDetails: true
                    } 
                });
            }
        } else {
            setEmployeeToAssign(employee);
            setShowAssignProjectModal(true);
        }
    };

    const handleEditEmployee = async () => {
        try {
            if (!selectedEmployee) return;

            const result = await employeeService.updateEmployee(
                selectedEmployee.id,
                newEmployee,
                newEmployee.avatar,
                newEmployee.contractFile
            );

            setEmployees(prev => prev.map(emp => 
                emp.id === selectedEmployee.id ? result : emp
            ));

            setShowAddModal(false);
            setIsEditing(false);
            
            notifications.show({
                title: 'Éxito',
                message: 'Empleado actualizado correctamente',
                color: 'green'
            });
        } catch (error) {
            console.error('Error al actualizar empleado:', error);
            notifications.show({
                title: 'Error',
                message: 'Error al actualizar el empleado',
                color: 'red'
            });
        }
    };

    const handleDeleteEmployee = async () => {
        try {
            if (!employeeToDelete) return;

            await employeeService.deleteEmployee(employeeToDelete.id);
            
            setEmployees(prevEmployees => 
                prevEmployees.filter(emp => emp.id !== employeeToDelete.id)
            );
            
            setEmployeeToDelete(null);
            
            notifications.show({
                title: 'Éxito',
                message: 'Empleado eliminado correctamente',
                color: 'green'
            });
        } catch (error) {
            console.error('Error al eliminar empleado:', error);
            notifications.show({
                title: 'Error',
                message: 'Error al eliminar el empleado',
                color: 'red'
            });
        }
    };

    const handleProjectAssignment = async (employeeId: number, projectId: number) => {
        try {
            console.log('Enviando asignación:', { employeeId, projectId });
            const response = await fetch(`${API_URL}/api/employees/${employeeId}/assign-project`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ 
                    project_id: projectId,
                    action: 'assign'  // Agregar el parámetro action
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Error response:', data);
                throw new Error(data.detail || 'Error al asignar proyecto');
            }

            // Obtener el nombre del proyecto asignado
            const assignedProject = projects.find(p => p.id === projectId);
            if (!assignedProject) return;

            // Actualizar el estado local después de la asignación
            setEmployees(prev => prev.map(emp => {
                if (emp.id === employeeId) {
                    const currentProjects = emp.project ? emp.project.split(', ') : [];
                    if (!currentProjects.includes(assignedProject.name)) {
                        currentProjects.push(assignedProject.name);
                    }
                    return {
                        ...emp,
                        project: currentProjects.join(', ')
                    };
                }
                return emp;
            }));

            // Mostrar mensaje apropiado según si ya existía o no
            notifications.show({
                title: data.already_exists ? 'Información' : 'Éxito',
                message: data.message,
                color: data.already_exists ? 'blue' : 'green'
            });

            // Cerrar el modal después de una asignación exitosa
            if (!data.already_exists) {
                setShowAssignProjectModal(false);
                setEmployeeToAssign(null);
                setSelectedProjectsToAssign([]);
            }

        } catch (error) {
            console.error('Error completo:', error);
            notifications.show({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Error al asignar proyecto',
                color: 'red'
            });
        }
    };

    // Modificar la función handleProjectUnassignment
    const handleProjectUnassignment = async (employeeId: number, projectId: number) => {
        try {
            const response = await fetch(`${API_URL}/api/employees/${employeeId}/assign-project`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ 
                    project_id: projectId,
                    action: 'unassign'  // Agregar el parámetro action
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Error al desasignar proyecto');
            }

            // Actualizar el estado local después de la desasignación
            setEmployees(prev => prev.map(emp => {
                if (emp.id === employeeId) {
                    const currentProjects = emp.project ? emp.project.split(', ') : [];
                    return {
                        ...emp,
                        project: currentProjects
                            .filter(p => p !== projects.find(proj => proj.id === projectId)?.name)
                            .join(', ')
                    };
                }
                return emp;
            }));

            notifications.show({
                title: 'Éxito',
                message: data.message || 'Proyecto desasignado correctamente',
                color: 'green'
            });

        } catch (error) {
            console.error('Error al desasignar proyecto:', error);
            notifications.show({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Error al desasignar proyecto',
                color: 'red'
            });
        }
    };

    // Modificar la función handleMultipleAssignments
    const handleMultipleAssignments = async () => {
        try {
            if (!employeeToAssign) return;

            // Obtener los proyectos actuales del empleado
            const currentProjects = employeeToAssign.project ? employeeToAssign.project.split(', ') : [];
            
            // Proyectos a asignar (nuevos seleccionados que no estaban antes)
            const projectsToAssign = selectedProjectsToAssign.filter(p => !currentProjects.includes(p));
            
            // Proyectos a desasignar (estaban antes pero ya no están seleccionados)
            const projectsToUnassign = currentProjects.filter(p => !selectedProjectsToAssign.includes(p));

            // Procesar asignaciones
            for (const projectName of projectsToAssign) {
                const project = projects.find(p => p.name === projectName);
                if (project) {
                    await handleProjectAssignment(employeeToAssign.id, project.id);
                }
            }

            // Procesar desasignaciones
            for (const projectName of projectsToUnassign) {
                const project = projects.find(p => p.name === projectName);
                if (project) {
                    await handleProjectUnassignment(employeeToAssign.id, project.id);
                }
            }

            // Cerrar el modal y limpiar el estado
                setShowAssignProjectModal(false);
                setEmployeeToAssign(null);
                setSelectedProjectsToAssign([]);

        } catch (error) {
            console.error('Error en asignación/desasignación múltiple:', error);
            notifications.show({
                title: 'Error',
                message: 'Error al actualizar las asignaciones de proyectos',
                color: 'red'
            });
        }
    };

    return (
        <>
            {isMobile ? (
                // Vista móvil - Stack vertical
                <Stack gap="md" mb="2rem">
                    <Title order={2} size="h1" c="gray.3" ta="center">
                        Equipo
                    </Title>
                    <Button 
                        leftSection={<IconUserPlus size={20} />}
                        variant="filled"
                        color="blue"
                        onClick={() => setShowAddModal(true)}
                        fullWidth
                        size="md"
                        style={{ minHeight: 44 }}
                    >
                        Agregar Técnico
                    </Button>
                </Stack>
            ) : (
                // Vista desktop - Layout horizontal original
            <Group justify="space-between" mb="2rem">
                <Title order={2} size="h1" c="gray.3">
                    Equipo
                </Title>
                <Button 
                    leftSection={<IconUserPlus size={20} />}
                    variant="filled"
                    color="blue"
                    onClick={() => setShowAddModal(true)}
                >
                    Agregar Técnico
                </Button>
            </Group>
            )}

            <Stack mb="xl">
                {isMobile ? (
                    // Vista móvil - Stack vertical para filtros
                    <Stack gap="md">
                        <TextInput
                            placeholder="Buscar por nombre..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            styles={{
                                input: { minHeight: 44 } // Altura mínima para touch
                            }}
                        />
                        <SimpleGrid cols={1} spacing="sm">
                            <Select
                                placeholder="Estado"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                data={[
                                    { value: 'presente', label: 'Presente' },
                                    { value: 'ausente', label: 'Ausente' },
                                    { value: 'vacaciones', label: 'Vacaciones' },
                                    { value: 'incapacidad', label: 'Incapacidad' },
                                    { value: 'en-ruta', label: 'En ruta' }
                                ]}
                                clearable
                                styles={{
                                    input: { minHeight: 44 } // Altura mínima para touch
                                }}
                            />
                            <SimpleGrid cols={2} spacing="sm">
                                <Select
                                    placeholder="Ubicación"
                                    value={locationFilter}
                                    onChange={setLocationFilter}
                                    data={locations}
                                    clearable
                                    styles={{
                                        input: { minHeight: 44 } // Altura mínima para touch
                                    }}
                                />
                                <Select
                                    placeholder="Rol"
                                    value={roleFilter}
                                    onChange={setRoleFilter}
                                    data={[
                                        { value: 'tecnico', label: 'Técnico' },
                                        { value: 'client', label: 'Cliente' }
                                    ]}
                                    clearable
                                    styles={{
                                        input: { minHeight: 44 } // Altura mínima para touch
                                    }}
                                />
                            </SimpleGrid>
                        </SimpleGrid>
                    </Stack>
                ) : (
                    // Vista desktop - Layout horizontal original
                <Group>
                    <TextInput
                        placeholder="Buscar por nombre..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        style={{ flex: 1 }}
                    />
                    <Select
                        placeholder="Filtrar por estado"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        data={[
                            { value: 'presente', label: 'Presente' },
                            { value: 'ausente', label: 'Ausente' },
                            { value: 'vacaciones', label: 'Vacaciones' },
                            { value: 'incapacidad', label: 'Incapacidad' },
                            { value: 'en-ruta', label: 'En ruta' }
                        ]}
                        clearable
                    />
                    <Select
                        placeholder="Filtrar por ubicación"
                        value={locationFilter}
                        onChange={setLocationFilter}
                        data={locations}
                        clearable
                    />
                    <Select
                        placeholder="Filtrar por rol"
                        value={roleFilter}
                        onChange={setRoleFilter}
                        data={[
                            { value: 'tecnico', label: 'Técnico' },
                            { value: 'client', label: 'Cliente' }
                        ]}
                        clearable
                    />
                </Group>
                )}
            </Stack>

            {isMobile ? (
                // Vista móvil - Cards en lugar de tabla
                <Stack gap="md">
                    {filteredEmployees.map((employee) => {
                        console.log("Avatar para empleado:", employee.full_name, employee.avatar);
                        return (
                            <Paper key={employee.id} p="md" radius="md" withBorder>
                                <Stack gap="md">
                                    {/* Header con avatar y nombre */}
                                    <Group gap="sm" wrap="nowrap">
                                        <Avatar
                                            src={
                                                employee.avatar
                                                    ? employee.avatar.startsWith('http')
                                                        ? employee.avatar
                                                        : `${API_URL}${employee.avatar}`
                                                    : undefined
                                            }
                                            size={60}
                                        />
                                        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                                            <Group gap="xs" align="center" wrap="nowrap">
                                                <Text
                                                    size="md"
                                                    fw={500}
                                                    c="gray.1"
                                                    style={{
                                                        cursor: 'pointer',
                                                        transition: 'color 0.2s',
                                                        flex: 1,
                                                        minWidth: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    onClick={() => openEmployeeDetails(employee)}
                                                >
                                                    {employee.full_name || 'Sin nombre'}
                                                </Text>
                                                {employee.role !== 'client' && (
                                                    <Badge
                                                        color={getStatusColor(employee.status)}
                                                        variant="light"
                                                        size="sm"
                                                        radius="sm"
                                                        style={{ flexShrink: 0 }}
                                                    >
                                                        {employee.status}
                                                    </Badge>
                                                )}
                                            </Group>
                                            <Group gap="xs" wrap="nowrap">
                                                <IconMapPin size={14} color="#666" style={{ flexShrink: 0 }} />
                                                <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {employee.location || 'Sin ubicación'}
                                                </Text>
                                            </Group>
                                        </Stack>
                                    </Group>

                                    {/* Información de contacto */}
                                    <Stack gap="xs">
                                        <Group gap="xs" wrap="nowrap">
                                            <IconPhone size={14} color="#666" style={{ flexShrink: 0 }} />
                                            <Text
                                                component="a"
                                                href={employee.phone ? `tel:${employee.phone}` : undefined}
                                                size="sm"
                                                c="dimmed"
                                                style={{ 
                                                    textDecoration: 'none',
                                                    flex: 1,
                                                    minWidth: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {employee.phone || 'Sin teléfono'}
                                            </Text>
                                            <IconMail size={14} color="#666" style={{ flexShrink: 0 }} />
                                            <Text
                                                component="a"
                                                href={employee.email ? `mailto:${employee.email}` : undefined}
                                                size="sm"
                                                c="dimmed"
                                                style={{ 
                                                    textDecoration: 'none',
                                                    flex: 1,
                                                    minWidth: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {employee.email || 'Sin email'}
                                            </Text>
                                        </Group>
                                    </Stack>

                                    {/* Proyecto asignado */}
                                    <Stack gap="xs">
                                        <Text size="xs" c="dimmed" fw={500}>Proyecto Asignado:</Text>
                                        <Group justify="space-between" wrap="nowrap">
                                            {employee.project && employee.project.includes(',') ? (
                                                <Text 
                                                    component="a" 
                                                    href="#" 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        openProjectsList(employee.project || '');
                                                    }}
                                                    style={{ 
                                                        textDecoration: 'none', 
                                                        color: 'var(--mantine-color-blue-6)',
                                                        cursor: 'pointer',
                                                        fontWeight: 500,
                                                        flex: 1,
                                                        minWidth: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    Ver lista ({employee.project.split(',').filter(p => p.trim() !== '' && p.trim() !== 'Sin proyecto asignado').length} proyectos)
                                                </Text>
                                            ) : (
                                                <Text 
                                                    component="a" 
                                                    href="#" 
                                                    style={{ 
                                                        textDecoration: 'none', 
                                                        color: 'var(--mantine-color-blue-6)',
                                                        flex: 1,
                                                        minWidth: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    title={employee.project || 'Sin proyecto asignado'}
                                                >
                                                    {employee.project || 'Sin proyecto asignado'}
                                                </Text>
                                            )}
                                            <ActionIcon 
                                                variant="subtle" 
                                                color="blue" 
                                                size="md"
                                                onClick={() => {
                                                    setEmployeeToAssign(employee);
                                                    setShowAssignProjectModal(true);
                                                    if (employee.project) {
                                                        setSelectedProjectsToAssign(employee.project.split(', '));
                                                    }
                                                }}
                                                title="Editar asignación"
                                                style={{ minHeight: 36, minWidth: 36, flexShrink: 0 }}
                                            >
                                                <IconEdit size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Stack>

                                    {/* Botones de acción */}
                                    <Group justify="center" gap="md" mt="xs">
                                        <ActionIcon 
                                            variant="subtle" 
                                            color="blue" 
                                            size="lg"
                                            onClick={() => openEmployeeEdit(employee)}
                                            style={{ minHeight: 44, minWidth: 44 }}
                                        >
                                            <IconEdit size={18} />
                                        </ActionIcon>
                                        <ActionIcon 
                                            variant="subtle" 
                                            color="red" 
                                            size="lg"
                                            onClick={() => setEmployeeToDelete(employee)}
                                            style={{ minHeight: 44, minWidth: 44 }}
                                        >
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    </Group>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            ) : (
                // Vista desktop - Tabla original
            <Paper p="md" radius="md">
                <Table verticalSpacing="md" horizontalSpacing="lg">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nombre</Table.Th>
                            <Table.Th>Contacto</Table.Th>
                            <Table.Th>Proyecto Asignado</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filteredEmployees.map((employee) => {
                            console.log("Avatar para empleado:", employee.full_name, employee.avatar);
                            return (
                                <Table.Tr key={employee.id}>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <Avatar
                                                src={
                                                    employee.avatar
                                                        ? employee.avatar.startsWith('http')
                                                            ? employee.avatar
                                                            : `${API_URL}${employee.avatar}`
                                                        : undefined
                                                }
                                                size={50}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <Group gap="xs" align="center" mb={4}>
                                                    <Text
                                                        size="sm"
                                                        fw={500}
                                                        c="gray.1"
                                                        style={{
                                                            cursor: 'pointer',
                                                            transition: 'color 0.2s',
                                                            '&:hover': {
                                                                color: '#228be6'
                                                            }
                                                        }}
                                                        onClick={() => openEmployeeDetails(employee)}
                                                    >
                                                        {employee.full_name || 'Sin nombre'}
                                                    </Text>
                                                    {employee.role !== 'client' && (
                                                        <Badge
                                                            color={getStatusColor(employee.status)}
                                                            variant="light"
                                                            size="sm"
                                                            radius="sm"
                                                        >
                                                            {employee.status}
                                                        </Badge>
                                                    )}
                                                </Group>
                                                <Group gap="xs" mt={4}>
                                                    <IconMapPin size={14} color="#666" />
                                                    <Text size="xs" c="dimmed">
                                                        {employee.location || 'Sin ubicación'}
                                                    </Text>
                                                </Group>
                                            </div>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Stack gap="xs">
                                            <Group gap="xs">
                                                <IconPhone size={14} color="#666" />
                                                <Text
                                                    component="a"
                                                    href={employee.phone ? `tel:${employee.phone}` : undefined}
                                                    size="xs"
                                                    c="dimmed"
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    {employee.phone || 'Sin teléfono'}
                                                </Text>
                                            </Group>
                                            <Group gap="xs">
                                                <IconMail size={14} color="#666" />
                                                <Text
                                                    component="a"
                                                    href={employee.email ? `mailto:${employee.email}` : undefined}
                                                    size="xs"
                                                    c="dimmed"
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    {employee.email || 'Sin email'}
                                                </Text>
                                            </Group>
                                        </Stack>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group justify="flex-start" wrap="nowrap">
                                            {employee.project && employee.project.includes(',') ? (
                                                <Text 
                                                    component="a" 
                                                    href="#" 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        openProjectsList(employee.project || '');
                                                    }}
                                                    style={{ 
                                                        textDecoration: 'none', 
                                                        color: 'var(--mantine-color-blue-6)',
                                                        cursor: 'pointer',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    Ver lista ({employee.project.split(',').filter(p => p.trim() !== '' && p.trim() !== 'Sin proyecto asignado').length} proyectos)
                                                </Text>
                                            ) : (
                                                <Text 
                                                    component="a" 
                                                    href="#" 
                                                    style={{ 
                                                        textDecoration: 'none', 
                                                        color: 'var(--mantine-color-blue-6)',
                                                        maxWidth: '180px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    title={employee.project || 'Sin proyecto asignado'}
                                                >
                                                    {employee.project || 'Sin proyecto asignado'}
                                                </Text>
                                            )}
                                            <ActionIcon 
                                                variant="subtle" 
                                                color="blue" 
                                                size="sm"
                                                onClick={() => {
                                                    setEmployeeToAssign(employee);
                                                    setShowAssignProjectModal(true);
                                                    if (employee.project) {
                                                        setSelectedProjectsToAssign(employee.project.split(', '));
                                                    }
                                                }}
                                                title="Editar asignación"
                                            >
                                                <IconEdit size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group justify="flex-start" wrap="nowrap" gap="xs">
                                            <ActionIcon 
                                                variant="subtle" 
                                                color="blue" 
                                                size="sm"
                                                onClick={() => openEmployeeEdit(employee)}
                                            >
                                                <IconEdit size={16} />
                                            </ActionIcon>
                                            <ActionIcon 
                                                variant="subtle" 
                                                color="red" 
                                                size="sm"
                                                onClick={() => setEmployeeToDelete(employee)}
                                            >
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            </Paper>
            )}

            {/* Modal del Expediente */}
            <Modal
                opened={!!selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
                size={isMobile ? "95%" : "xl"}
                title={
                    <Title order={3} c="gray.3" size={isMobile ? "h4" : "h3"}>
                        Expediente Técnico
                    </Title>
                }
                styles={{
                    content: {
                        maxHeight: isMobile ? '90vh' : 'auto',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    },
                    body: {
                        flex: 1,
                        overflow: 'auto',
                        padding: isMobile ? 'md' : 'lg'
                    }
                }}
            >
                {selectedEmployee && (
                    <Stack gap="lg">
                        {/* Encabezado con información básica */}
                        <Group>
                            <Avatar
                                src={
                                    selectedEmployee?.avatar
                                        ? selectedEmployee.avatar.startsWith('http')
                                            ? selectedEmployee.avatar
                                            : `${API_URL}${selectedEmployee.avatar}`
                                        : undefined
                                }
                                size={100}
                                radius={100}
                            />
                            <div>
                                <Text size="xl" fw={700} c="gray.1">
                                    {selectedEmployee.full_name}
                                </Text>
                                <Badge
                                    color={getStatusColor(selectedEmployee.status)}
                                    variant="light"
                                    size="lg"
                                    mt={5}
                                >
                                    {selectedEmployee.status.toUpperCase()}
                                </Badge>
                            </div>
                        </Group>

                        <Grid>
                            {/* Información Personal */}
                            <Grid.Col span={isMobile ? 12 : 4}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="blue" size={isMobile ? "md" : "lg"}>
                                                <IconUserCircle size={isMobile ? "1rem" : "1.2rem"} />
                                            </ThemeIcon>
                                            <Text fw={500} size={isMobile ? "md" : "lg"} c="gray.3">Información Personal</Text>
                                        </Group>
                                        <Stack gap="xs">
                                            <Text size={isMobile ? "xs" : "sm"} c="gray.5">CURP: <Text span c="gray.3">{selectedEmployee.personal_info?.curp}</Text></Text>
                                            <Text size={isMobile ? "xs" : "sm"} c="gray.5">RFC: <Text span c="gray.3">{selectedEmployee.personal_info?.rfc}</Text></Text>
                                            <Text size={isMobile ? "xs" : "sm"} c="gray.5">Fecha de Nacimiento: <Text span c="gray.3">{selectedEmployee.personal_info?.birth_date}</Text></Text>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Información Laboral */}
                            <Grid.Col span={isMobile ? 12 : 4}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="green" size={isMobile ? "md" : "lg"}>
                                                <IconCalendar size={isMobile ? "1rem" : "1.2rem"} />
                                            </ThemeIcon>
                                            <Text fw={500} size={isMobile ? "md" : "lg"} c="gray.3">Información Laboral</Text>
                                        </Group>
                                        <Stack gap="xs">
                                            <Text size={isMobile ? "xs" : "sm"} c="gray.5">Fecha de Ingreso: <Text span c="gray.3">{selectedEmployee.employment_info?.start_date}</Text></Text>
                                            <Text size={isMobile ? "xs" : "sm"} c="gray.5">Última Renovación: <Text span c="gray.3">{selectedEmployee.employment_info?.last_contract_renewal}</Text></Text>
                                            <Button
                                                variant="light"
                                                leftSection={<IconDownload size="1rem" />}
                                                size={isMobile ? "sm" : "xs"}
                                                onClick={() => {/* Manejar descarga */ }}
                                                fullWidth={isMobile}
                                                style={{ minHeight: isMobile ? 44 : undefined }}
                                            >
                                                Descargar Contrato
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Información del Puesto */}
                            <Grid.Col span={isMobile ? 12 : 4}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="orange" size={isMobile ? "md" : "lg"}>
                                                <IconChartBar size={isMobile ? "1rem" : "1.2rem"} />
                                            </ThemeIcon>
                                            <Text fw={500} size={isMobile ? "md" : "lg"} c="gray.3">Información del Puesto</Text>
                                        </Group>
                                        <Stack gap="xs">
                                            <Text size={isMobile ? "xs" : "sm"} c="gray.5">Posición: <Text span c="blue.4" fw={500}>{selectedEmployee.employment_info?.position}</Text></Text>
                                            <Text size={isMobile ? "xs" : "sm"} c="gray.5">Supervisor: <Text span c="green.4" fw={500}>{selectedEmployee.employment_info?.supervisor}</Text></Text>
                                            <Text size={isMobile ? "xs" : "sm"} c="gray.5">Certificaciones: <Text span c="orange.4" fw={500}>{selectedEmployee.employment_info?.certifications?.length || 0}</Text></Text>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Información de Recursos Humanos y Historial de Incidentes */}
                            <Grid.Col span={12}>
                                <Group grow align="flex-start">
                                    {/* Información de RRHH (ajustado) */}
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="violet" size="lg">
                                                <IconBuildingSkyscraper size="1.2rem" />
                                            </ThemeIcon>
                                            <Text fw={500} size="lg" c="gray.3">Información de RRHH</Text>
                                        </Group>
                                            <Stack gap="xs" style={{ minHeight: '200px', overflowY: 'auto' }}>
                                        <Grid>
                                            <Grid.Col span={6}>
                                                <Stack gap="xs">
                                                    <Text size="sm" c="gray.5">Salario Base: <Text span c="violet.4" fw={500}>${selectedEmployee.hr_info?.salary.base}</Text></Text>
                                                    <Text size="sm" c="gray.5">Último Aumento: <Text span c="gray.3">{selectedEmployee.hr_info?.salary.last_increase}</Text></Text>
                                                    <Text size="sm" c="gray.5">Próxima Revisión: <Text span c="gray.3">{selectedEmployee.hr_info?.salary.next_review_date}</Text></Text>
                                                </Stack>
                                            </Grid.Col>
                                            <Grid.Col span={6}>
                                                <Stack gap="xs">
                                                    <Text size="sm" c="gray.5">Días Vacaciones Disponibles: <Text span c="green.4" fw={500}>{(selectedEmployee.hr_info?.vacations?.days_total ?? 0) - (selectedEmployee.hr_info?.vacations?.days_used ?? 0)}</Text></Text>
                                                    <Text size="sm" c="gray.5">Próximas Vacaciones: <Text span c="gray.3">{selectedEmployee.hr_info?.vacations.next_vacation_date}</Text></Text>
                                                            <Text size="sm" c="gray.5">Beneficios: <Text span c="blue.4" fw={500}>{selectedEmployee.hr_info?.benefits?.join(', ') || 'Ninguno'}</Text></Text>
                                                            <Text size="sm" c="gray.5">Documentos: <Text span c="orange.4" fw={500}>{selectedEmployee.hr_info?.documents?.length || 0} archivos</Text></Text>
                                                </Stack>
                                            </Grid.Col>
                                        </Grid>
                                            </Stack>
                                    </Stack>
                                </Paper>

                                    {/* Nueva sección: Historial de Incidentes */}
                                    <Paper p="md" radius="md" withBorder>
                                        <Stack gap="md">
                                            <Group>
                                                <ThemeIcon color="red" size="lg">
                                                    <IconAlertCircle size="1.2rem" />
                                                </ThemeIcon>
                                                <Text fw={500} size="lg" c="gray.3">Historial de Incidentes</Text>
                                            </Group>
                                            <Stack gap="xs" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {/* Datos de ejemplo - esto se reemplazará con datos reales del backend */}
                                                <Paper withBorder p="xs" radius="sm">
                                                    <Group justify="space-between" mb={4}>
                                                        <Badge color="red" variant="light">Retraso</Badge>
                                                        <Text size="xs" c="dimmed">23/03/2024</Text>
                                                    </Group>
                                                    <Text size="sm">Llegada tardía al proyecto APTIV - 45 minutos</Text>
                                                </Paper>
                                                <Paper withBorder p="xs" radius="sm">
                                                    <Group justify="space-between" mb={4}>
                                                        <Badge color="yellow" variant="light">Advertencia</Badge>
                                                        <Text size="xs" c="dimmed">15/03/2024</Text>
                                                    </Group>
                                                    <Text size="sm">No completó el reporte diario de actividades</Text>
                                                </Paper>
                                                <Paper withBorder p="xs" radius="sm">
                                                    <Group justify="space-between" mb={4}>
                                                        <Badge color="orange" variant="light">Ausencia</Badge>
                                                        <Text size="xs" c="dimmed">02/03/2024</Text>
                                                    </Group>
                                                    <Text size="sm">Falta sin aviso previo</Text>
                                                </Paper>
                                                <Paper withBorder p="xs" radius="sm">
                                                    <Group justify="space-between" mb={4}>
                                                        <Badge color="green" variant="light">Resuelto</Badge>
                                                        <Text size="xs" c="dimmed">28/02/2024</Text>
                                                    </Group>
                                                    <Text size="sm">Justificación de ausencia aceptada - Problema familiar</Text>
                                                </Paper>
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                </Group>
                            </Grid.Col>
                        </Grid>
                    </Stack>
                )}
            </Modal>

            {/* Agregar el modal para nuevo técnico */}
            <Modal
                opened={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                    setNewEmployee({
                        firstName: '',
                        lastName: '',
                        secondLastName: '',
                        location: '',
                        phone: '',
                        email: '',
                        curp: '',
                        rfc: '',
                        birthDate: '',
                        startDate: '',
                        position: '',
                        salary: '',
                        vacationDays: '',
                        contractFile: null,
                        avatar: null
                    });
                }}
                title={isEditing ? "Editar Expediente Técnico" : "Nuevo Expediente Técnico"}
                size={isMobile ? "95%" : "xl"}
                styles={{
                    content: {
                        maxHeight: isMobile ? '90vh' : 'auto',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    },
                    body: {
                        flex: 1,
                        overflow: 'auto',
                        padding: isMobile ? 'md' : 'lg'
                    }
                }}
            >
                <Stack gap="lg">
                    {isMobile ? (
                        // Vista móvil - Stack vertical
                        <Stack gap="md">
                            {/* Foto centrada en móvil */}
                            <Stack gap="xs" align="center">
                                <Text size="sm" fw={500}>Foto</Text>
                                <Dropzone
                                    onDrop={(files) => setNewEmployee(prev => ({ ...prev, avatar: files[0] }))}
                                    maxSize={5 * 1024 ** 2}
                                    accept={['image/jpeg', 'image/png']}
                                    h={150}
                                    w={150}
                                    radius="md"
                                    style={{ 
                                        border: '2px dashed var(--mantine-color-blue-6)',
                                        background: newEmployee.avatar ? 
                                            `url(${URL.createObjectURL(newEmployee.avatar)}) center/cover` : 
                                            undefined
                                    }}
                                >
                                    <Group justify="center" gap="xs" style={{ pointerEvents: 'none', height: '100%' }}>
                                        {!newEmployee.avatar && (
                                            <Stack align="center" gap={5}>
                                                <IconUpload size={20} />
                                                <Text size="xs" ta="center">Arrastra o selecciona una foto</Text>
                                                <Text size="xs" c="dimmed" ta="center">(5MB máx)</Text>
                                            </Stack>
                                        )}
                                    </Group>
                                </Dropzone>
                            </Stack>

                            {/* Datos personales - Stack vertical */}
                            <Stack gap="md">
                                <Text size="sm" fw={500}>Datos Personales</Text>
                                <TextInput
                                    placeholder="Nombre(s)"
                                    label="Nombre(s)"
                                    required
                                    value={newEmployee.firstName}
                                    onChange={(e) => setNewEmployee(prev => ({ 
                                        ...prev, 
                                        firstName: e.target.value 
                                    }))}
                                    styles={{
                                        input: { minHeight: 44 }
                                    }}
                                />
                                <SimpleGrid cols={2} spacing="sm">
                                    <TextInput
                                        placeholder="Apellido Paterno"
                                        label="Apellido Paterno"
                                        required
                                        value={newEmployee.lastName}
                                        onChange={(e) => setNewEmployee(prev => ({ 
                                            ...prev, 
                                            lastName: e.target.value 
                                        }))}
                                        styles={{
                                            input: { minHeight: 44 }
                                        }}
                                    />
                                    <TextInput
                                        placeholder="Apellido Materno"
                                        label="Apellido Materno"
                                        required
                                        value={newEmployee.secondLastName}
                                        onChange={(e) => setNewEmployee(prev => ({ 
                                            ...prev, 
                                            secondLastName: e.target.value 
                                        }))}
                                        styles={{
                                            input: { minHeight: 44 }
                                        }}
                                    />
                                </SimpleGrid>
                                <Select
                                    label="Ciudad"
                                    placeholder="Seleccionar ciudad"
                                    data={[
                                        { value: 'Saltillo', label: 'Saltillo' },
                                        { value: 'Aguascalientes', label: 'Aguascalientes' },
                                        { value: 'Zacatecas', label: 'Zacatecas' },
                                        { value: 'Toluca', label: 'Toluca' }
                                    ]}
                                    value={newEmployee.location}
                                    onChange={(value) => setNewEmployee(prev => ({ 
                                        ...prev, 
                                        location: value || '' 
                                    }))}
                                    styles={{
                                        input: { minHeight: 44 }
                                    }}
                                />
                            </Stack>
                        </Stack>
                    ) : (
                        // Vista desktop - Layout horizontal original
                        <Group align="flex-start" gap="xl">
                            {/* Columna de la foto */}
                            <Stack gap="xs" w={200}>
                                <Text size="sm" fw={500}>Foto</Text>
                                <Dropzone
                                    onDrop={(files) => setNewEmployee(prev => ({ ...prev, avatar: files[0] }))}
                                    maxSize={5 * 1024 ** 2}
                                    accept={['image/jpeg', 'image/png']}
                                    h={200}
                                    w={200}
                                    radius="md"
                                    style={{ 
                                        border: '2px dashed var(--mantine-color-blue-6)',
                                        background: newEmployee.avatar ? 
                                            `url(${URL.createObjectURL(newEmployee.avatar)}) center/cover` : 
                                            undefined
                                    }}
                                >
                                    <Group justify="center" gap="xs" style={{ pointerEvents: 'none', height: '100%' }}>
                                        {!newEmployee.avatar && (
                                            <Stack align="center" gap={5}>
                                                <IconUpload size={24} />
                                                <Text size="sm" ta="center">Arrastra o selecciona una foto</Text>
                                                <Text size="xs" c="dimmed" ta="center">(5MB máx)</Text>
                                            </Stack>
                                        )}
                                    </Group>
                                </Dropzone>
                            </Stack>

                            {/* Columna de los datos */}
                            <Stack style={{ flex: 1 }} gap="md">
                                <Text size="sm" fw={500}>Datos Personales</Text>
                                <Group grow>
                                    <TextInput
                                        placeholder="Nombre(s)"
                                        label="Nombre(s)"
                                        required
                                        value={newEmployee.firstName}
                                        onChange={(e) => setNewEmployee(prev => ({ 
                                            ...prev, 
                                            firstName: e.target.value 
                                        }))}
                                    />
                                </Group>
                                <Group grow>
                                    <TextInput
                                        placeholder="Apellido Paterno"
                                        label="Apellido Paterno"
                                        required
                                        value={newEmployee.lastName}
                                        onChange={(e) => setNewEmployee(prev => ({ 
                                            ...prev, 
                                            lastName: e.target.value 
                                        }))}
                                    />
                                    <TextInput
                                        placeholder="Apellido Materno"
                                        label="Apellido Materno"
                                        required
                                        value={newEmployee.secondLastName}
                                        onChange={(e) => setNewEmployee(prev => ({ 
                                            ...prev, 
                                            secondLastName: e.target.value 
                                        }))}
                                    />
                                </Group>
                                <Select
                                    label="Ciudad"
                                    placeholder="Seleccionar ciudad"
                                    data={[
                                        { value: 'Saltillo', label: 'Saltillo' },
                                        { value: 'Aguascalientes', label: 'Aguascalientes' },
                                        { value: 'Zacatecas', label: 'Zacatecas' },
                                        { value: 'Toluca', label: 'Toluca' }
                                    ]}
                                    value={newEmployee.location}
                                    onChange={(value) => setNewEmployee(prev => ({ 
                                        ...prev, 
                                        location: value || '' 
                                    }))}
                                />
                            </Stack>
                        </Group>
                    )}

                    <Grid>
                        {/* Información Personal - Editable */}
                        <Grid.Col span={isMobile ? 12 : 4}>
                            <Paper p="md" radius="md" withBorder>
                                <Stack gap="md">
                                    <Group>
                                        <ThemeIcon color="blue" size={isMobile ? "md" : "lg"}>
                                            <IconUserCircle size={isMobile ? "1rem" : "1.2rem"} />
                                        </ThemeIcon>
                                        <Text fw={500} size={isMobile ? "md" : "lg"} c="gray.3">Información Personal</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        <TextInput
                                            label="CURP"
                                            placeholder="CURP"
                                            value={newEmployee.curp}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, curp: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                        <TextInput
                                            label="RFC"
                                            placeholder="RFC"
                                            value={newEmployee.rfc}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, rfc: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                        <TextInput
                                            label="Fecha de Nacimiento"
                                            placeholder="DD/MM/AAAA"
                                            value={newEmployee.birthDate}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, birthDate: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                        <TextInput
                                            label="Teléfono"
                                            placeholder="Teléfono"
                                            value={newEmployee.phone}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                        <TextInput
                                            label="Email"
                                            placeholder="Email"
                                            value={newEmployee.email}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Grid.Col>

                        {/* Información Laboral - Editable */}
                        <Grid.Col span={isMobile ? 12 : 4}>
                            <Paper p="md" radius="md" withBorder>
                                <Stack gap="md">
                                    <Group>
                                        <ThemeIcon color="green" size={isMobile ? "md" : "lg"}>
                                            <IconCalendar size={isMobile ? "1rem" : "1.2rem"} />
                                        </ThemeIcon>
                                        <Text fw={500} size={isMobile ? "md" : "lg"} c="gray.3">Información Laboral</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        <TextInput
                                            label="Fecha de Ingreso"
                                            placeholder="DD/MM/AAAA"
                                            value={newEmployee.startDate}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, startDate: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                        <TextInput
                                            label="Puesto"
                                            placeholder="Puesto"
                                            value={newEmployee.position}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                        <Text size="sm" fw={500} mt="md">Contrato Laboral</Text>
                                        <Dropzone
                                            onDrop={(files) => console.log('dropped files', files)}
                                            maxSize={3 * 1024 ** 2}
                                            accept={['application/pdf']}
                                            h={isMobile ? 80 : 100}
                                        >
                                            <Group justify="center" gap="xl" style={{ minHeight: isMobile ? 60 : 80, pointerEvents: 'none' }}>
                                                <Dropzone.Accept>
                                                    <IconDownload
                                                        size={isMobile ? "2.5rem" : "3.2rem"}
                                                        stroke={1.5}
                                                        color="var(--mantine-color-blue-6)"
                                                    />
                                                </Dropzone.Accept>
                                                <Dropzone.Reject>
                                                    <IconX
                                                        size={isMobile ? "2.5rem" : "3.2rem"}
                                                        stroke={1.5}
                                                        color="var(--mantine-color-red-6)"
                                                    />
                                                </Dropzone.Reject>
                                                <Dropzone.Idle>
                                                    <IconUpload
                                                        size={isMobile ? "2.5rem" : "3.2rem"}
                                                        stroke={1.5}
                                                    />
                                                </Dropzone.Idle>
                                                <div>
                                                    <Text size={isMobile ? "xs" : "sm"} inline>
                                                        Arrastra o selecciona el contrato aquí
                                                    </Text>
                                                    <Text size="xs" c="dimmed" inline mt={7}>
                                                        (3MB PDF)
                                                    </Text>
                                                </div>
                                            </Group>
                                        </Dropzone>
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Grid.Col>

                        {/* Información de RRHH - Editable */}
                        <Grid.Col span={isMobile ? 12 : 4}>
                            <Paper p="md" radius="md" withBorder>
                                <Stack gap="md">
                                    <Group>
                                        <ThemeIcon color="violet" size={isMobile ? "md" : "lg"}>
                                            <IconBuildingSkyscraper size={isMobile ? "1rem" : "1.2rem"} />
                                        </ThemeIcon>
                                        <Text fw={500} size={isMobile ? "md" : "lg"} c="gray.3">Información de RRHH</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        <TextInput
                                            label="Salario Base"
                                            placeholder="$0.00"
                                            type="number"
                                            value={newEmployee.salary}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, salary: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                        <TextInput
                                            label="Días de Vacaciones"
                                            placeholder="0"
                                            type="number"
                                            value={newEmployee.vacationDays}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, vacationDays: e.target.value }))}
                                            styles={{
                                                input: { minHeight: isMobile ? 44 : undefined }
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Grid.Col>
                    </Grid>

                    {isMobile ? (
                        <Stack gap="sm">
                            <Button 
                                fullWidth
                                size="md"
                                style={{ minHeight: 44 }}
                                color="blue"
                                onClick={() => {
                                    if (isEditing) {
                                        handleEditEmployee();
                                    } else {
                                        handleSaveEmployee();
                                    }
                                }}
                            >
                                {isEditing ? 'Guardar Cambios' : 'Guardar Expediente'}
                            </Button>
                            <Button 
                                fullWidth
                                variant="default" 
                                size="md"
                                style={{ minHeight: 44 }}
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancelar
                            </Button>
                        </Stack>
                    ) : (
                        <Group justify="flex-end">
                            <Button variant="default" onClick={() => setShowAddModal(false)}>
                                Cancelar
                            </Button>
                            <Button color="blue" onClick={() => {
                                if (isEditing) {
                                    handleEditEmployee();
                                } else {
                                    handleSaveEmployee();
                                }
                            }}>
                                {isEditing ? 'Guardar Cambios' : 'Guardar Expediente'}
                            </Button>
                        </Group>
                    )}
                </Stack>
            </Modal>

            {/* Agregar el modal de confirmación */}
            <Modal
                opened={!!employeeToDelete}
                onClose={() => setEmployeeToDelete(null)}
                title="Confirmar eliminación"
                size="sm"
            >
                <Stack>
                    <Text>¿Estás seguro de eliminar a {employeeToDelete?.full_name}?</Text>
                    <Text size="sm" c="dimmed">Esta acción no se puede deshacer.</Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setEmployeeToDelete(null)}>
                            Cancelar
                    </Button>
                        <Button 
                            color="red" 
                            onClick={handleDeleteEmployee}
                        >
                            Eliminar
                    </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Agregar el modal de asignación de proyecto */}
            <Modal
                opened={showAssignProjectModal}
                onClose={() => {
                    setShowAssignProjectModal(false);
                    setEmployeeToAssign(null);
                    setSelectedProjectsToAssign([]);
                }}
                title="Asignar Proyectos"
                size="md"
            >
                <Stack>
                    <Text size="sm" fw={500} mb="xs">
                        Selecciona los proyectos para {employeeToAssign?.full_name}
                    </Text>
                    
                    {projects.length === 0 && (
                        <Text c="dimmed">No hay proyectos disponibles</Text>
                    )}
                    
                    <Checkbox.Group
                        value={selectedProjectsToAssign}
                        onChange={setSelectedProjectsToAssign}
                    >
                        <Stack gap="xs">
                            {projects.map(project => {
                                console.log('Renderizando proyecto:', project);
                                return (
                                    <Checkbox
                                        key={project.id}
                                        value={project.name}
                                        label={project.name}
                                    />
                                );
                            })}
                        </Stack>
                    </Checkbox.Group>

                    <Group justify="flex-end" mt="xl">
                        <Button 
                            variant="default" 
                            onClick={() => {
                                setShowAssignProjectModal(false);
                                setEmployeeToAssign(null);
                                setSelectedProjectsToAssign([]);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            color="blue"
                            disabled={selectedProjectsToAssign.length === 0}
                            onClick={handleMultipleAssignments}
                        >
                            Asignar Proyectos
                    </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal de Lista de Proyectos */}
            <Modal
                opened={projectsModalOpen}
                onClose={() => setProjectsModalOpen(false)}
                title="Proyectos Asignados"
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Lista de proyectos asignados al empleado:
                    </Text>
                    <List spacing="xs" size="sm">
                        {selectedEmployeeProjects.map((project, index) => (
                            <List.Item key={index}>
                                <Text>{project.trim()}</Text>
                            </List.Item>
                        ))}
                    </List>
                    <Group justify="flex-end" mt="md">
                        <Button 
                            variant="default" 
                            onClick={() => setProjectsModalOpen(false)}
                        >
                            Cerrar
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}