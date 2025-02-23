import { Table, Avatar, Text, Badge, Group, Paper, Title, TextInput, Select, Stack, Modal, Button, Grid, ThemeIcon, ActionIcon, Radio, Checkbox } from '@mantine/core';
import { IconMapPin, IconSearch, IconPhone, IconMail, IconDownload, IconCalendar, IconCertificate, IconChartBar, IconUserCircle, IconBuildingSkyscraper, IconChartDonut, IconAlertCircle, IconSettings, IconPlus, IconEdit, IconUpload, IconUserPlus, IconTrash, IconX, IconBriefcase } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dropzone } from '@mantine/dropzone';
import { useEmployees } from '../context/EmployeeContext';
import { useProjects } from '../context/ProjectContext';
import { notifications } from '@mantine/notifications';

interface Employee {
    id: number;
    avatar: string;
    name: string;
    project?: string;
    location: string;
    status: 'presente' | 'ausente' | 'vacaciones' | 'incapacidad' | 'en-ruta';
    phone: string;
    email: string;
    personalInfo?: {
        curp: string;
        rfc: string;
        birthDate: string;
        address: string;
        emergencyContact: {
            name: string;
            phone: string;
            relation: string;
        };
    };
    employmentInfo?: {
        startDate: string;
        lastContractRenewal: string;
        contractFile: string;
        position: string;
        supervisor: string;
        certifications: string[];
    };
    statistics?: {
        totalHours: number;
        totalServices: number;
        avgMonthlyHours: number;
        successRate: number;
        incidents: number;
    };
    hrInfo?: {
        salary: {
            base: number;
            lastIncrease: string;
            nextReviewDate: string;
        };
        benefits: string[];
        vacations: {
            daysTotal: number;
            daysUsed: number;
            nextVacationDate: string;
            history: Array<{
                startDate: string;
                endDate: string;
                days: number;
            }>;
        };
        documents: Array<{
            name: string;
            type: string;
            uploadDate: string;
            fileUrl: string;
        }>;
    };
    performance?: {
        lastEvaluation: {
            date: string;
            score: number;
            evaluator: string;
            comments: string;
        };
        skills: Array<{
            name: string;
            level: 'básico' | 'intermedio' | 'avanzado' | 'experto';
        }>;
        certifications: Array<{
            name: string;
            issueDate: string;
            expiryDate: string;
            status: 'vigente' | 'por-vencer' | 'vencido';
        }>;
        trainings: Array<{
            name: string;
            completionDate: string;
            score: number;
        }>;
    };
    incidents?: Array<{
        date: string;
        type: 'retraso' | 'falta' | 'accidente' | 'queja-cliente' | 'reconocimiento';
        description: string;
        status: 'pendiente' | 'resuelto';
        severity?: 'baja' | 'media' | 'alta';
    }>;
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
    const { employees, setEmployees } = useEmployees();
    const { projects } = useProjects();
    const location = useLocation();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [locationFilter, setLocationFilter] = useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showExpediente, setShowExpediente] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [showAssignProjectModal, setShowAssignProjectModal] = useState(false);
    const [employeeToAssign, setEmployeeToAssign] = useState<Employee | null>(null);
    const [selectedProjectsToAssign, setSelectedProjectsToAssign] = useState<string[]>([]);

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
        if (location.state?.openExpediente) {
            const technicianName = location.state.technicianName;
            const employee = employees.find(emp => emp.name === technicianName);
            if (employee) {
                setSelectedEmployee(employee);
                setShowExpediente(true);
            }
        }
    }, [location]);

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch = employee.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusFilter || employee.status === statusFilter;
        const matchesLocation = !locationFilter || employee.location === locationFilter;

        return matchesSearch && matchesStatus && matchesLocation;
    });

    const locations = [...new Set(employees.map(emp => emp.location))];

    const openEmployeeDetails = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowExpediente(true);
    };

    const openEmployeeEdit = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEditing(true);
        setNewEmployee({
            firstName: employee.name.split(' ')[0],
            lastName: employee.name.split(' ')[1] || '',
            secondLastName: employee.name.split(' ')[2] || '',
            location: employee.location,
            phone: employee.phone,
            email: employee.email,
            curp: employee.personalInfo?.curp || '',
            rfc: employee.personalInfo?.rfc || '',
            birthDate: employee.personalInfo?.birthDate || '',
            startDate: employee.employmentInfo?.startDate || '',
            position: employee.employmentInfo?.position || '',
            salary: employee.hrInfo?.salary.base.toString() || '',
            vacationDays: employee.hrInfo?.vacations.daysTotal.toString() || '',
            contractFile: null,
            avatar: null
        });
        setShowAddModal(true);
    };

    const handleSaveEmployee = () => {
        const newId = Math.max(...employees.map(emp => emp.id)) + 1;
        const displayName = `${newEmployee.firstName} ${newEmployee.lastName} ${newEmployee.secondLastName}`;
        
        if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.secondLastName || 
            !newEmployee.location || !newEmployee.phone || !newEmployee.email) {
            alert('Por favor completa todos los campos requeridos');
            return;
        }

        const employeeToAdd: Employee = {
            id: newId,
            avatar: newEmployee.avatar ? URL.createObjectURL(newEmployee.avatar) : `https://i.pravatar.cc/150?u=${newId}`,
            name: displayName,
            location: newEmployee.location,
            status: 'ausente',
            phone: newEmployee.phone,
            email: newEmployee.email.toLowerCase(),
            personalInfo: {
                curp: newEmployee.curp,
                rfc: newEmployee.rfc,
                birthDate: newEmployee.birthDate,
                address: '',
                emergencyContact: {
                    name: '',
                    phone: '',
                    relation: ''
                }
            },
            employmentInfo: {
                startDate: newEmployee.startDate,
                lastContractRenewal: newEmployee.startDate,
                contractFile: newEmployee.contractFile ? URL.createObjectURL(newEmployee.contractFile) : '',
                position: newEmployee.position,
                supervisor: '',
                certifications: []
            },
            hrInfo: {
                salary: {
                    base: Number(newEmployee.salary) || 0,
                    lastIncrease: '',
                    nextReviewDate: ''
                },
                benefits: [],
                vacations: {
                    daysTotal: Number(newEmployee.vacationDays) || 0,
                    daysUsed: 0,
                    nextVacationDate: '',
                    history: []
                },
                documents: []
            },
            statistics: {
                totalHours: 0,
                totalServices: 0,
                avgMonthlyHours: 0,
                successRate: 0,
                incidents: 0
            },
            performance: {
                lastEvaluation: {
                    date: '',
                    score: 0,
                    evaluator: '',
                    comments: ''
                },
                skills: [],
                certifications: [],
                trainings: []
            },
            incidents: []
        };

        setEmployees(prev => [...prev, employeeToAdd]);
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

    return (
        <>
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

            <Stack mb="xl">
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
                </Group>
            </Stack>

            <Paper p="md" radius="md">
                <Table verticalSpacing="md" horizontalSpacing="lg">
                    <Table.Tbody>
                        {filteredEmployees.map((employee) => (
                            <Table.Tr key={employee.id}>
                                <Table.Td>
                                    <Group gap="sm">
                                        <Avatar
                                            src={employee.avatar}
                                            size={50}
                                            radius={50}
                                            style={{ border: '2px solid #2C2E33' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <Text
                                                size="sm"
                                                fw={500}
                                                c="gray.1"
                                                style={{
                                                    cursor: 'pointer',
                                                    transition: 'color 0.2s',
                                                    '&:hover': {
                                                        color: '#228be6' // color azul al hacer hover
                                                    }
                                                }}
                                                onClick={() => openEmployeeDetails(employee)}
                                            >
                                                {employee.name}
                                            </Text>
                                            <Group gap="xs" mt={4}>
                                                <IconMapPin size={14} color="#666" />
                                                <Text size="xs" c="dimmed">
                                                    {employee.location}
                                                </Text>
                                            </Group>
                                        </div>
                                        <div>
                                            <Group gap="xs" mt={4}>
                                                <IconPhone size={14} color="#666" />
                                                <Text
                                                    component="a"
                                                    href={`tel:${employee.phone}`}
                                                    size="xs"
                                                    c="dimmed"
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    {employee.phone}
                                                </Text>
                                                <IconMail size={14} color="#666" />
                                                <Text
                                                    component="a"
                                                    href={`mailto:${employee.email}`}
                                                    size="xs"
                                                    c="dimmed"
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    {employee.email}
                                                </Text>
                                            </Group>
                                        </div>
                                    </Group>
                                </Table.Td>
                                <Table.Td>
                                    <Group justify="flex-start" wrap="nowrap">
                                        <Text 
                                            component="a" 
                                            href="#" 
                                            style={{ 
                                                textDecoration: 'none', 
                                                color: 'var(--mantine-color-blue-6)',
                                                maxWidth: '180px',  // Limitar el ancho
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title={employee.project || 'Sin proyecto asignado'}  // Mostrar texto completo en tooltip
                                        >
                                            {employee.project || 'Sin proyecto asignado'}
                                        </Text>
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
                                        <Badge
                                            color={getStatusColor(employee.status)}
                                            variant="light"
                                            size="sm"
                                            radius="sm"
                                        >
                                            {employee.status.toUpperCase()}
                                        </Badge>
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
                        ))}
                    </Table.Tbody>
                </Table>
            </Paper>

            {/* Modal del Expediente */}
            <Modal
                opened={!!selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
                size="xl"
                title={
                    <Title order={3} c="gray.3">
                        Expediente Técnico
                    </Title>
                }
            >
                {selectedEmployee && (
                    <Stack gap="lg">
                        {/* Encabezado con información básica */}
                        <Group>
                            <Avatar
                                src={selectedEmployee.avatar}
                                size={100}
                                radius={100}
                            />
                            <div>
                                <Text size="xl" fw={700} c="gray.1">
                                    {selectedEmployee.name}
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
                            <Grid.Col span={4}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="blue" size="lg">
                                                <IconUserCircle size="1.2rem" />
                                            </ThemeIcon>
                                            <Text fw={500} size="lg" c="gray.3">Información Personal</Text>
                                        </Group>
                                        <Stack gap="xs">
                                            <Text size="sm" c="gray.5">CURP: <Text span c="gray.3">{selectedEmployee.personalInfo?.curp}</Text></Text>
                                            <Text size="sm" c="gray.5">RFC: <Text span c="gray.3">{selectedEmployee.personalInfo?.rfc}</Text></Text>
                                            <Text size="sm" c="gray.5">Fecha de Nacimiento: <Text span c="gray.3">{selectedEmployee.personalInfo?.birthDate}</Text></Text>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Información Laboral */}
                            <Grid.Col span={4}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="green" size="lg">
                                                <IconCalendar size="1.2rem" />
                                            </ThemeIcon>
                                            <Text fw={500} size="lg" c="gray.3">Información Laboral</Text>
                                        </Group>
                                        <Stack gap="xs">
                                            <Text size="sm" c="gray.5">Fecha de Ingreso: <Text span c="gray.3">{selectedEmployee.employmentInfo?.startDate}</Text></Text>
                                            <Text size="sm" c="gray.5">Última Renovación: <Text span c="gray.3">{selectedEmployee.employmentInfo?.lastContractRenewal}</Text></Text>
                                            <Button
                                                variant="light"
                                                leftSection={<IconDownload size="1rem" />}
                                                size="xs"
                                                onClick={() => {/* Manejar descarga */ }}
                                            >
                                                Descargar Contrato
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Estadísticas */}
                            <Grid.Col span={4}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="orange" size="lg">
                                                <IconChartBar size="1.2rem" />
                                            </ThemeIcon>
                                            <Text fw={500} size="lg" c="gray.3">Estadísticas</Text>
                                        </Group>
                                        <Stack gap="xs">
                                            <Text size="sm" c="gray.5">Total Horas: <Text span c="blue.4" fw={500}>{selectedEmployee.statistics?.totalHours}</Text></Text>
                                            <Text size="sm" c="gray.5">Total Partes: <Text span c="green.4" fw={500}>{selectedEmployee.statistics?.totalServices}</Text></Text>
                                            <Text size="sm" c="gray.5">Tasa de Éxito: <Text span c="orange.4" fw={500}>{selectedEmployee.statistics?.successRate}%</Text></Text>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Información de Recursos Humanos */}
                            <Grid.Col span={6}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="violet" size="lg">
                                                <IconBuildingSkyscraper size="1.2rem" />
                                            </ThemeIcon>
                                            <Text fw={500} size="lg" c="gray.3">Información de RRHH</Text>
                                        </Group>
                                        <Grid>
                                            <Grid.Col span={6}>
                                                <Stack gap="xs">
                                                    <Text size="sm" c="gray.5">Salario Base: <Text span c="violet.4" fw={500}>${selectedEmployee.hrInfo?.salary.base}</Text></Text>
                                                    <Text size="sm" c="gray.5">Último Aumento: <Text span c="gray.3">{selectedEmployee.hrInfo?.salary.lastIncrease}</Text></Text>
                                                    <Text size="sm" c="gray.5">Próxima Revisión: <Text span c="gray.3">{selectedEmployee.hrInfo?.salary.nextReviewDate}</Text></Text>
                                                </Stack>
                                            </Grid.Col>
                                            <Grid.Col span={6}>
                                                <Stack gap="xs">
                                                    <Text size="sm" c="gray.5">Días Vacaciones Disponibles: <Text span c="green.4" fw={500}>{(selectedEmployee.hrInfo?.vacations?.daysTotal ?? 0) - (selectedEmployee.hrInfo?.vacations?.daysUsed ?? 0)}</Text></Text>
                                                    <Text size="sm" c="gray.5">Próximas Vacaciones: <Text span c="gray.3">{selectedEmployee.hrInfo?.vacations.nextVacationDate}</Text></Text>
                                                </Stack>
                                            </Grid.Col>
                                        </Grid>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Desempeño y Capacitación */}
                            <Grid.Col span={6}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="cyan" size="lg">
                                                <IconChartDonut size="1.2rem" />
                                            </ThemeIcon>
                                            <Text fw={500} size="lg" c="gray.3">Desempeño y Capacitación</Text>
                                        </Group>
                                        <Grid>
                                            <Grid.Col span={12}>
                                                <Group justify="apart">
                                                    <Text size="sm" c="gray.5">Última Evaluación:</Text>
                                                    <Badge
                                                        color={selectedEmployee.performance?.lastEvaluation?.score ?? 0 >= 8 ? 'green' : 'orange'}
                                                        variant="light"
                                                    >
                                                        {selectedEmployee.performance?.lastEvaluation?.score ?? 0}/10
                                                    </Badge>
                                                </Group>
                                                <Text size="xs" c="dimmed" mt={5}>{selectedEmployee.performance?.lastEvaluation?.date}</Text>
                                            </Grid.Col>
                                            <Grid.Col span={12}>
                                                <Text size="sm" fw={500} c="gray.5" mb={5}>Certificaciones Vigentes:</Text>
                                                <Group gap="xs">
                                                    {selectedEmployee.performance?.certifications
                                                        .filter(cert => cert.status === 'vigente')
                                                        .map(cert => (
                                                            <Badge key={cert.name} color="blue" variant="dot">
                                                                {cert.name}
                                                            </Badge>
                                                        ))
                                                    }
                                                </Group>
                                            </Grid.Col>
                                        </Grid>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Historial de Incidentes */}
                            <Grid.Col span={12}>
                                <Paper p="md" radius="md" withBorder>
                                    <Stack gap="md">
                                        <Group>
                                            <ThemeIcon color="red" size="lg">
                                                <IconAlertCircle size="1.2rem" />
                                            </ThemeIcon>
                                            <Text fw={500} size="lg" c="gray.3">Historial de Incidentes</Text>
                                        </Group>
                                        <Table>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Fecha</Table.Th>
                                                    <Table.Th>Tipo</Table.Th>
                                                    <Table.Th>Descripción</Table.Th>
                                                    <Table.Th>Estado</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {selectedEmployee.incidents?.map((incident, index) => (
                                                    <Table.Tr key={index}>
                                                        <Table.Td>{incident.date}</Table.Td>
                                                        <Table.Td>
                                                            <Badge
                                                                color={
                                                                    incident.type === 'reconocimiento' ? 'green' :
                                                                        incident.type === 'queja-cliente' ? 'red' :
                                                                            'orange'
                                                                }
                                                                variant="light"
                                                            >
                                                                {incident.type}
                                                            </Badge>
                                                        </Table.Td>
                                                        <Table.Td>{incident.description}</Table.Td>
                                                        <Table.Td>
                                                            <Badge
                                                                color={incident.status === 'resuelto' ? 'green' : 'yellow'}
                                                                variant="dot"
                                                            >
                                                                {incident.status}
                                                            </Badge>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </Stack>
                                </Paper>
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
                size="xl"
            >
                <Stack gap="lg">
                    {/* Encabezado con información básica */}
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

                    <Grid>
                        {/* Información Personal - Editable */}
                        <Grid.Col span={4}>
                            <Paper p="md" radius="md" withBorder>
                                <Stack gap="md">
                                    <Group>
                                        <ThemeIcon color="blue" size="lg">
                                            <IconUserCircle size="1.2rem" />
                                        </ThemeIcon>
                                        <Text fw={500} size="lg" c="gray.3">Información Personal</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        <TextInput
                                            label="CURP"
                                            placeholder="CURP"
                                            value={newEmployee.curp}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, curp: e.target.value }))}
                                        />
                                        <TextInput
                                            label="RFC"
                                            placeholder="RFC"
                                            value={newEmployee.rfc}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, rfc: e.target.value }))}
                                        />
                                        <TextInput
                                            label="Fecha de Nacimiento"
                                            placeholder="DD/MM/AAAA"
                                            value={newEmployee.birthDate}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, birthDate: e.target.value }))}
                                        />
                                        <TextInput
                                            label="Teléfono"
                                            placeholder="Teléfono"
                                            value={newEmployee.phone}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                                        />
                                        <TextInput
                                            label="Email"
                                            placeholder="Email"
                                            value={newEmployee.email}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                                        />
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Grid.Col>

                        {/* Información Laboral - Editable */}
                        <Grid.Col span={4}>
                            <Paper p="md" radius="md" withBorder>
                                <Stack gap="md">
                                    <Group>
                                        <ThemeIcon color="green" size="lg">
                                            <IconCalendar size="1.2rem" />
                                        </ThemeIcon>
                                        <Text fw={500} size="lg" c="gray.3">Información Laboral</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        <TextInput
                                            label="Fecha de Ingreso"
                                            placeholder="DD/MM/AAAA"
                                            value={newEmployee.startDate}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, startDate: e.target.value }))}
                                        />
                                        <TextInput
                                            label="Puesto"
                                            placeholder="Puesto"
                                            value={newEmployee.position}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                                        />
                                        <Text size="sm" fw={500} mt="md">Contrato Laboral</Text>
                                        <Dropzone
                                            onDrop={(files) => console.log('dropped files', files)}
                                            maxSize={3 * 1024 ** 2}
                                            accept={['application/pdf']}
                                            h={100}
                                        >
                                            <Group justify="center" gap="xl" style={{ minHeight: 80, pointerEvents: 'none' }}>
                                                <Dropzone.Accept>
                                                    <IconDownload
                                                        size="3.2rem"
                                                        stroke={1.5}
                                                        color="var(--mantine-color-blue-6)"
                                                    />
                                                </Dropzone.Accept>
                                                <Dropzone.Reject>
                                                    <IconX
                                                        size="3.2rem"
                                                        stroke={1.5}
                                                        color="var(--mantine-color-red-6)"
                                                    />
                                                </Dropzone.Reject>
                                                <Dropzone.Idle>
                                                    <IconUpload
                                                        size="3.2rem"
                                                        stroke={1.5}
                                                    />
                                                </Dropzone.Idle>
                                                <div>
                                                    <Text size="sm" inline>
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
                        <Grid.Col span={4}>
                            <Paper p="md" radius="md" withBorder>
                                <Stack gap="md">
                                    <Group>
                                        <ThemeIcon color="violet" size="lg">
                                            <IconBuildingSkyscraper size="1.2rem" />
                                        </ThemeIcon>
                                        <Text fw={500} size="lg" c="gray.3">Información de RRHH</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        <TextInput
                                            label="Salario Base"
                                            placeholder="$0.00"
                                            type="number"
                                            value={newEmployee.salary}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, salary: e.target.value }))}
                                        />
                                        <TextInput
                                            label="Días de Vacaciones"
                                            placeholder="0"
                                            type="number"
                                            value={newEmployee.vacationDays}
                                            onChange={(e) => setNewEmployee(prev => ({ ...prev, vacationDays: e.target.value }))}
                                        />
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Grid.Col>
                    </Grid>

                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setShowAddModal(false)}>
                            Cancelar
                    </Button>
                        <Button color="blue" onClick={() => {
                            if (isEditing) {
                                setEmployees(prev => prev.map(emp => 
                                    emp.id === selectedEmployee?.id 
                                        ? {
                                            ...emp,
                                            name: `${newEmployee.firstName} ${newEmployee.lastName} ${newEmployee.secondLastName}`.trim(),
                                            location: newEmployee.location,
                                            phone: newEmployee.phone,
                                            email: newEmployee.email.toLowerCase(),
                                            personalInfo: {
                                                ...emp.personalInfo!,
                                                curp: newEmployee.curp,
                                                rfc: newEmployee.rfc,
                                                birthDate: newEmployee.birthDate,
                                                address: emp.personalInfo?.address || '',
                                                emergencyContact: emp.personalInfo?.emergencyContact || {
                                                    name: '',
                                                    phone: '',
                                                    relation: ''
                                                }
                                            },
                                            employmentInfo: {
                                                ...emp.employmentInfo!,
                                                startDate: newEmployee.startDate,
                                                position: newEmployee.position,
                                                lastContractRenewal: emp.employmentInfo?.lastContractRenewal || '',
                                                contractFile: emp.employmentInfo?.contractFile || '',
                                                supervisor: emp.employmentInfo?.supervisor || '',
                                                certifications: emp.employmentInfo?.certifications || []
                                            },
                                            hrInfo: {
                                                ...emp.hrInfo!,
                                                salary: {
                                                    ...emp.hrInfo?.salary!,
                                                    base: Number(newEmployee.salary) || 0,
                                                    lastIncrease: emp.hrInfo?.salary.lastIncrease || '',
                                                    nextReviewDate: emp.hrInfo?.salary.nextReviewDate || ''
                                                },
                                                benefits: emp.hrInfo?.benefits || [],
                                                vacations: {
                                                    ...emp.hrInfo?.vacations!,
                                                    daysTotal: Number(newEmployee.vacationDays) || 0,
                                                    daysUsed: emp.hrInfo?.vacations.daysUsed || 0,
                                                    nextVacationDate: emp.hrInfo?.vacations.nextVacationDate || '',
                                                    history: emp.hrInfo?.vacations.history || []
                                                },
                                                documents: emp.hrInfo?.documents || []
                                            }
                                        }
                                        : emp
                                ));
                            } else {
                                handleSaveEmployee();
                            }
                            setShowAddModal(false);
                            setIsEditing(false);
                        }}>
                            {isEditing ? 'Guardar Cambios' : 'Guardar Expediente'}
                        </Button>
                    </Group>
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
                    <Text>¿Estás seguro de eliminar a {employeeToDelete?.name}?</Text>
                    <Text size="sm" c="dimmed">Esta acción no se puede deshacer.</Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setEmployeeToDelete(null)}>
                            Cancelar
                    </Button>
                        <Button 
                            color="red" 
                            onClick={() => {
                                setEmployees(prevEmployees => 
                                    prevEmployees.filter(emp => emp.id !== employeeToDelete?.id)
                                );
                                setEmployeeToDelete(null);
                                
                                notifications.show({
                                    title: 'Éxito',
                                    message: 'Empleado eliminado correctamente',
                                    color: 'green'
                                });
                            }}
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
                    <Text size="sm" fw={500} mb="xs">Selecciona los proyectos para {employeeToAssign?.name}</Text>
                    
                    <Checkbox.Group
                        value={selectedProjectsToAssign}
                        onChange={setSelectedProjectsToAssign}
                    >
                        <Stack gap="xs">
                            {projects.map(project => (
                                <Checkbox
                                    key={project.id}
                                    value={project.name}
                                    label={
                                        <Group gap="xs">
                                            <Text>{project.name}</Text>
                                            <Badge color={
                                                project.status === 'activo' ? 'blue' :
                                                project.status === 'completado' ? 'green' :
                                                project.status === 'en-progreso' ? 'orange' : 'yellow'
                                            }>
                                                {project.status.toUpperCase()}
                                            </Badge>
                                            <Text size="sm" c="dimmed">{project.client}</Text>
                                        </Group>
                                    }
                                />
                            ))}
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
                            onClick={() => {
                                if (employeeToAssign && selectedProjectsToAssign.length > 0) {
                                    setEmployees(prev => prev.map(emp => 
                                        emp.id === employeeToAssign.id 
                                            ? { ...emp, project: selectedProjectsToAssign.join(', ') }
                                            : emp
                                    ));
                                }
                                setShowAssignProjectModal(false);
                                setEmployeeToAssign(null);
                                setSelectedProjectsToAssign([]);
                            }}
                        >
                            Asignar Proyectos
                    </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}