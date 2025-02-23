import { Title, Paper, Text, Group, Badge, Stack, Modal, List, ActionIcon, Box, Grid, Progress, Select, TextInput, Button, Tabs, MultiSelect, NumberInput, Switch, Image, Avatar, Popover, Divider, ThemeIcon } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconMapPin, IconPhone, IconMail, IconDownload, IconTools, IconBuildingFactory, IconBed, IconUser, IconSearch, IconSettings, IconPlus, IconEdit, IconX, IconFileText, IconTrash, IconCalendar, IconChevronDown, IconBatteryFilled, IconBattery2, IconBattery1 } from '@tabler/icons-react';
import { useState, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { predefinedClients, predefinedPlants } from '../data/projectsData';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { Dropzone } from '@mantine/dropzone';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployees } from '../context/EmployeeContext';
import { useProjects } from '../context/ProjectContext';
import { MapContainer, TileLayer, Popup, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface ProjectDocument {
    name: string;
    type: string;
    url: string;
    size?: number;
}

export interface Project {
    id: number;
    name: string;
    status: 'activo' | 'completado' | 'en-progreso';
    client: string;
    startDate: string;
    endDate: string;
    progress: number;
    assignedTo: string[];
    location: {
        plant: {
            address: string;
            coordinates: string; // URL de Google Maps
            contact: {
                name: string;
                phone: string;
                email: string;
            };
        };
        hotel: {
            name: string;
            address: string;
            coordinates: string; // URL de Google Maps
            phone: string;
        };
    };
    cityImage: string;
    documents: Array<{
        name: string;
        type: string;
        url: string;
    }>;
    equipment: string[];
    lastTechnician: {
        name: string;
        date: string;
        action: string;
    };
    totalParts: number;
    completedParts: number;
    projectType?: 'bench' | 'patios' | null;  // Nuevo campo
}

type CityImageType = {
    [key in 'Guadalupe' | 'Querétaro' | 'Hermosillo' | 'San Pedro Tenango' | 'default']: string;
};

const cityImages: CityImageType = {
    'Guadalupe': 'https://images.unsplash.com/photo-1577127305724-1111131c6e0f?q=80&w=1920',
    'Querétaro': 'https://images.unsplash.com/photo-1581993192008-63e896f4f744?q=80&w=1920',
    'Hermosillo': 'https://images.unsplash.com/photo-1619465712426-607f8ec542b9?q=80&w=1920',
    'San Pedro Tenango': 'https://images.unsplash.com/photo-1513735492246-483525079686?q=80&w=1920',
    'default': 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=1920'
};

// Modificar la función getCityAndState para que solo retorne la ciudad
const getCityFromAddress = (address: string | undefined): string => {
    if (!address) return '';
    
    // Dividir la dirección y buscar la ciudad
    const parts = address.split(',').map(part => part.trim());
    
    // La ciudad suele estar antes del código postal
    const cityIndex = parts.findIndex(part => /\d{5}/.test(part)) - 1;
    if (cityIndex >= 0) {
        return parts[cityIndex];
    }
    
    return parts[parts.length - 2] || ''; // Fallback a la penúltima parte
};

const mockProjects: Project[] = [];

// Agregar este console.log después de la definición
console.log('Mock project cityImage:', mockProjects[0]?.cityImage);

type HotelImageMap = {
    'Fiesta': {
        thumbnail: string;
        full: string;
    };
    default: {
        thumbnail: string;
        full: string;
    };
};

type PlantImageMap = {
    'APTIV': {
        thumbnail: string;
        full: string;
    };
    default: {
        thumbnail: string;
        full: string;
    };
};

const plantImages: PlantImageMap = {
    'APTIV': {
        thumbnail: '/images/plants/aptiv.png',
        full: '/images/plants/aptiv-full.jpg'
    },
    'default': {
        thumbnail: '/images/plants/default-plant.png',
        full: '/images/plants/default-plant-full.jpg'
    }
};

const hotelImages: HotelImageMap = {
    'Fiesta': {
        thumbnail: '/images/hotels/fiesta-inn.jpg',
        full: '/images/hotels/fiesta-inn-full.jpg'
    },
    'default': {
        thumbnail: '/images/hotels/default-hotel.jpg',
        full: '/images/hotels/default-hotel-full.jpg'
    }
};

const availableTechnicians = [
    { value: 'Carlos López', label: 'Carlos López' },
    { value: 'Ana García', label: 'Ana García' },
    { value: 'Roberto Martínez', label: 'Roberto Martínez' },
    { value: 'María Rodríguez', label: 'María Rodríguez' }
];

// 1. Primero, definir los equipos y documentos predefinidos
const predefinedEquipment = [
    'Kit de herramientas básicas',
    'Multímetro industrial',
    'Equipo de protección personal',
    'Analizador de vibraciones',
    'Osciloscopio',
    'Termómetro infrarrojo',
    'Kit de calibración',
    'Herramientas de diagnóstico',
    'Equipo de soldadura',
    'Cámara termográfica'
];

const predefinedDocuments = [
    { value: 'dc3', label: 'DC-3', type: 'PDF', url: '/docs/dc3.pdf' },
    { value: 'seguridad', label: 'Seguridad Industrial', type: 'PDF', url: '/docs/seguridad.pdf' },
    { value: 'acceso', label: 'Acceso Planta', type: 'PDF', url: '/docs/acceso.pdf' },
    { value: 'procedimientos', label: 'Procedimientos Operativos', type: 'PDF', url: '/docs/procedimientos.pdf' },
    { value: 'calidad', label: 'Manual de Calidad', type: 'PDF', url: '/docs/calidad.pdf' }
];

// Agregar este tipo e interfaz al inicio del archivo junto con los otros tipos
interface Employee {
    name: string;
    location: string;
    phone: string;
    email: string;
    status: 'PRESENTE' | 'AUSENTE' | 'INCAPACIDAD';
    avatar: string;
}

// Agregar estos datos mock (puedes moverlos a un archivo separado después)
const employeesData: Employee[] = [];

// Agregar datos de ejemplo para las gráficas
const mockProjectPartsData = [
    { name: 'Completadas', value: 16, color: '#82ca9d' },
    { name: 'Pendientes', value: 8, color: '#8884d8' }
];

const mockTechnicianHistoryData = [
    { month: 'Ene', partes: 45 },
    { month: 'Feb', partes: 52 },
    { month: 'Mar', partes: 48 },
    { month: 'Abr', partes: 71 },
    { month: 'May', partes: 63 },
    { month: 'Jun', partes: 52 }
];

// Agregar esta interfaz para el seguimiento de partes por técnico
interface TechnicianProjectProgress {
    projectId: number;
    technicianName: string;
    completedParts: number;
    totalAssignedParts: number;
}

// Agregar datos de ejemplo para el seguimiento de partes por técnico
const mockTechnicianProgress: TechnicianProjectProgress[] = [];

// Agregar esta función auxiliar
const getProjectStatusFromProgress = (project: Project): Project['status'] => {
    if (project.progress === 100) {
        return 'completado';
    }
    return project.status;
};

// Crear un componente personalizado para el marcador triangular
const TriangleMarker = ({ position, color, onClick }: {
    position: [number, number];
    color: string;
    onClick?: () => void;
}) => {
    const triangleIcon = L.divIcon({
        className: 'custom-triangle',
        html: `<div style="
            width: 0; 
            height: 0; 
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 17px solid ${color};
            transform: rotate(0deg);
            cursor: pointer;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 17],
    });

    return (
        <Marker 
            position={position} 
            icon={triangleIcon}
            eventHandlers={{
                click: onClick
            }}
        />
    );
};

const extractCoordinates = (googleMapsUrl: string): [number, number] => {
    try {
        const match = googleMapsUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            return [parseFloat(match[1]), parseFloat(match[2])];
        }
        return [23.6345, -102.5528]; // Coordenadas default (centro de México)
    } catch {
        return [23.6345, -102.5528];
    }
};

const generateRandomPositionsAroundPlant = (
    centerLat: number, 
    centerLng: number, 
    count: number
): Array<{ lat: number; lng: number }> => {
    return Array.from({ length: count }, () => ({
        lat: centerLat + (Math.random() - 0.5) * 0.002, // ±~200m
        lng: centerLng + (Math.random() - 0.5) * 0.002
    }));
};

interface MapUnit {
    status: 'ok' | 'pending' | 'failed';
    position: { lat: number; lng: number };
    unitId: string;
    timestamp: Date;
    technician: string;
    battery: number;
    location: string; // Agregar ubicación
}

const MapModal = ({ project, units, onClose }: {
    project: Project;
    units: {
        ok: number;
        pending: number;
        failed: number;
        positions: Array<{
            status: 'ok' | 'pending' | 'failed';
            position: { lat: number; lng: number };
            unitId: string;
            timestamp: Date;
            technician: string;
            battery: number;
            location: string; // Agregar ubicación
        }>;
    };
    onClose: () => void;
}) => {
    const [filter, setFilter] = useState<'all' | 'ok' | 'pending' | 'failed'>('all');
    const [vinFilter, setVinFilter] = useState('');
    const [techFilter, setTechFilter] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<typeof units.positions[0] | null>(null);
    
    // Extraer coordenadas con manejo de espacios
    const cleanUrl = project.location.plant.coordinates.replace(/\s+/g, '');
    const coordinates = cleanUrl
        .match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/)
        ?.slice(1)
        .map(Number) as [number, number];

    const getStatusColor = (status: 'ok' | 'pending' | 'failed') => {
        switch (status) {
            case 'ok': return '#10B981';
            case 'pending': return '#FB923C';
            case 'failed': return '#EF4444';
            default: return '#10B981';
        }
    };

    const filteredPositions = units.positions.filter(unit => {
        const matchesStatus = filter === 'all' || unit.status === filter;
        const matchesVin = !vinFilter || 
            unit.unitId.includes(vinFilter) || 
            unit.unitId.slice(-6).includes(vinFilter);
        const matchesTech = !techFilter || 
            project.assignedTo.some(tech => 
                tech.toLowerCase().includes(techFilter.toLowerCase())
            );
        
        return matchesStatus && matchesVin && matchesTech;
    });

    const mapRef = useRef<L.Map | null>(null);

    return (
        <Modal
            opened={true}
            onClose={onClose}
            size="100%"
            fullScreen
            title={
                <Stack gap="xs" style={{ width: '100%' }}>
                    <Group justify="space-between">
                        <Group>
                            <Title order={3}>{project.name} - Vista de Unidades</Title>
                            <Text c="dimmed" size="sm">
                                {project.location.plant.address}
                            </Text>
                        </Group>
                        <Group>
                            <Badge color="green" style={{ cursor: 'pointer' }}
                                variant={filter === 'ok' ? 'filled' : 'outline'}
                                onClick={() => setFilter(filter === 'ok' ? 'all' : 'ok')}
                            >
                                OK: {units.ok}
                            </Badge>
                            <Badge
                                color="orange"
                                style={{ cursor: 'pointer' }}
                                variant={filter === 'pending' ? 'filled' : 'outline'}
                                onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
                            >
                                Pendientes: {units.pending}
                            </Badge>
                            <Badge
                                color="red"
                                style={{ cursor: 'pointer' }}
                                variant={filter === 'failed' ? 'filled' : 'outline'}
                                onClick={() => setFilter(filter === 'failed' ? 'all' : 'failed')}
                            >
                                Falladas: {units.failed}
                            </Badge>
                        </Group>
                    </Group>
                    
                    <Paper p="xs" withBorder>
                        <Group>
                            <TextInput
                                placeholder="Buscar por VIN"
                                value={vinFilter}
                                onChange={(e) => setVinFilter(e.currentTarget.value)}
                                style={{ flex: 1 }}
                                leftSection={<IconSearch size={16} />}
                            />
                            <TextInput
                                placeholder="Buscar por Técnico"
                                value={techFilter}
                                onChange={(e) => setTechFilter(e.currentTarget.value)}
                                style={{ flex: 1 }}
                                leftSection={<IconUser size={16} />}
                            />
                            <Popover 
                                opened={showCalendar} 
                                onChange={setShowCalendar}
                                position="bottom"
                                shadow="md"
                            >
                                <Popover.Target>
                                    <Button
                                        variant="default"
                                        onClick={() => setShowCalendar((o) => !o)}
                                        leftSection={<IconCalendar size={16} />}
                                        rightSection={<IconChevronDown size={16} />}
                                        style={{ flex: 1 }}
                                    >
                                        {selectedDate.toLocaleDateString('es-ES', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <Stack>
                                        <DateInput
                                            value={selectedDate}
                                            onChange={(date) => {
                                                setSelectedDate(date || new Date());
                                                setShowCalendar(false);
                                            }}
                                            locale="es"
                                        />
                                        <Button 
                                            variant="subtle" 
                                            onClick={() => {
                                                setSelectedDate(new Date());
                                                setShowCalendar(false);
                                            }}
                                        >
                                            Hoy
                                        </Button>
                                    </Stack>
                                </Popover.Dropdown>
                            </Popover>
                        </Group>
                    </Paper>
                </Stack>
            }
        >
            <Paper h="calc(100vh - 80px)" withBorder>
                <MapContainer
                    ref={mapRef}
                    center={coordinates}
                    zoom={17}
                    style={{ height: '100%', width: '100%', background: '#1A1B1E' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution=''
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    
                    {filteredPositions.map((unit, index) => (
                        <TriangleMarker
                            key={index}
                            position={[unit.position.lat, unit.position.lng]}
                            color={getStatusColor(unit.status)}
                            onClick={() => setSelectedUnit(unit)}
                        />
                    ))}
                </MapContainer>
            </Paper>

            {/* Modal de detalles */}
            <Modal
                opened={selectedUnit !== null}
                onClose={() => setSelectedUnit(null)}
                title={
                    <Group justify="space-between">
                        <Text fw={700} size="lg">Detalles de la Unidad</Text>
                        <Badge 
                            color={
                                selectedUnit?.status === 'ok' ? 'green' :
                                selectedUnit?.status === 'pending' ? 'orange' : 'red'
                            }
                            size="lg"
                        >
                            {selectedUnit?.status.toUpperCase()}
                        </Badge>
                    </Group>
                }
                size="md"
            >
                {selectedUnit && (
                    <Stack gap="md">
                        <Paper p="md" withBorder>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">VIN Completo</Text>
                                    <Text fw={500}>{selectedUnit.unitId}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">VIN (últimos 6)</Text>
                                    <Text fw={700} c="blue.4">{selectedUnit.unitId.slice(-6)}</Text>
                                </Group>
                            </Stack>
                        </Paper>

                        <Paper p="md" withBorder>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Técnico Asignado</Text>
                                    <Text>{selectedUnit.technician}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">
                                        {selectedUnit.status === 'ok' && 'Fecha de OK'}
                                        {selectedUnit.status === 'pending' && 'Fecha de Escaneo'}
                                        {selectedUnit.status === 'failed' && 'Fecha de Fallo'}
                                    </Text>
                                    <Text c={selectedUnit.status === 'ok' ? 'green' : 
                                          selectedUnit.status === 'pending' ? 'orange' : 'red'}>
                                        {selectedUnit.timestamp.toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Text>
                                </Group>
                            </Stack>
                        </Paper>

                        <Paper p="md" withBorder>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Estado de Batería</Text>
                                    <Group gap="xs">
                                        <Text 
                                            fw={700} 
                                            c={selectedUnit.battery > 20 ? 
                                               selectedUnit.battery > 50 ? 'green' : 'yellow' : 'red'}
                                        >
                                            {selectedUnit.battery}%
                                        </Text>
                                        <ThemeIcon 
                                            color={selectedUnit.battery > 20 ? 
                                                   selectedUnit.battery > 50 ? 'green' : 'yellow' : 'red'} 
                                            variant="light"
                                        >
                                            {selectedUnit.battery <= 20 ? (
                                                <IconBattery1 size={16} />
                                            ) : selectedUnit.battery <= 50 ? (
                                                <IconBattery2 size={16} />
                                            ) : (
                                                <IconBatteryFilled size={16} />
                                            )}
                                        </ThemeIcon>
                                    </Group>
                                </Group>
                                <Progress 
                                    value={selectedUnit.battery} 
                                    color={selectedUnit.battery > 20 ? 
                                           selectedUnit.battery > 50 ? 'green' : 'yellow' : 'red'}
                                />
                            </Stack>
                        </Paper>

                        <Paper p="md" withBorder>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Ubicación</Text>
                                    <Group gap="xs">
                                        <IconMapPin size={16} style={{ color: 'var(--mantine-color-blue-6)' }}/>
                                        <Text>{selectedUnit.location}</Text>
                                    </Group>
                                </Group>
                            </Stack>
                        </Paper>

                        <Group grow>
                            <Button
                                color="teal"
                                leftSection={<IconMapPin size={16}/>}
                                onClick={() => {
                                    if (mapRef.current) {
                                        mapRef.current.setView(
                                            [selectedUnit.position.lat, selectedUnit.position.lng],
                                            18
                                        );
                                    }
                                    setSelectedUnit(null);
                                }}
                            >
                                Ir a Unidad
                            </Button>

                            <Button
                                color="blue"
                                leftSection={<IconFileText size={16}/>}
                                onClick={() => {
                                    notifications.show({
                                        title: 'Ficha Enviada',
                                        message: 'La ficha ha sido enviada correctamente',
                                        color: 'green'
                                    });
                                }}
                            >
                                Enviar Ficha
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Modal>
    );
};

export default function Projects() {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string | null>('todas');
    const [selectedTechnician, setSelectedTechnician] = useState<string | null>('todos');
    const [selectedStatus, setSelectedStatus] = useState<string | null>('todos');
    const [imageModal, setImageModal] = useState<{ src: string; title: string } | null>(null);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [requiresHotel, setRequiresHotel] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Project>>({});
    const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
    const [filteredPlants, setFilteredPlants] = useState<typeof predefinedPlants>([]);
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [newProjectData, setNewProjectData] = useState<Partial<Project>>({
        status: 'activo',
        progress: 0,
        completedParts: 0,
        totalParts: 0,
        assignedTo: [],
        documents: [],
        equipment: [
            'Kit de herramientas básicas',
            'Multímetro industrial',
            'Equipo de protección personal'
        ],
        projectType: 'bench'
    });
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [selectedTechnicianModal, setSelectedTechnicianModal] = useState<Employee | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [mapModal, setMapModal] = useState<{
        project: Project;
        units: {
            ok: number;
            pending: number;
            failed: number;
            positions: Array<{
                status: 'ok' | 'pending' | 'failed';
                position: { lat: number; lng: number };
                unitId: string;
                timestamp: Date;
                technician: string;
                battery: number;
                location: string; // Agregar ubicación
            }>;
        };
    } | null>(null);

    const navigate = useNavigate();
    const location = useLocation();

    // Obtener la lista de empleados del contexto
    const { employees, setEmployees } = useEmployees();

    // Convertir los empleados al formato que espera el MultiSelect
    const availableTechnicians = employees.map(emp => ({
        value: emp.name,
        label: emp.name
    }));

    // Modificar cómo obtenemos la lista de ciudades
    const cities = ['todas', ...Array.from(new Set(mockProjects
        .map(project => getCityFromAddress(project?.location?.plant?.address))
        .filter(Boolean)
    ))];

    // Obtener técnicos únicos de los proyectos
    const technicians = ['todos', ...Array.from(new Set(
        mockProjects.flatMap(project => project?.assignedTo || [])
    ))];

    // Opciones de estado
    const statusOptions = [
        { value: 'todos', label: 'Todos los estados' },
        { value: 'activo', label: 'Activo' },
        { value: 'completado', label: 'Completado' },
        { value: 'en-progreso', label: 'En Progreso' }
    ];

    // Filtrar proyectos
    const filteredProjects = mockProjects.filter(project => {
        const matchesSearch = project?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            project?.client.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCity = selectedCity === 'todas' || selectedCity === null || 
                          getCityFromAddress(project?.location?.plant?.address) === selectedCity;
        const matchesTechnician = selectedTechnician === 'todos' || selectedTechnician === null || 
                                project?.assignedTo.some(tech => tech === selectedTechnician) === true;
        const matchesStatus = selectedStatus === 'todos' || selectedStatus === null || 
                            project?.status === selectedStatus;

        return matchesSearch && matchesCity && matchesTechnician && matchesStatus;
    });

    // Para el status automático, modificamos el objeto project antes de renderizarlo
    const getProjectStatus = (project: Project) => {
        if (project.progress === 100) {
            return 'completado';
        }
        return project.status;
    };

    // Configurar el locale
    useEffect(() => {
        import('dayjs/locale/es').then(() => {
            dayjs.locale('es');
        });
    }, []);

    // 3. Modificar el efecto de los cambios de fecha
    useEffect(() => {
        if (startDate) {
            setNewProjectData(prev => ({
                ...prev,
                startDate: startDate.toISOString().split('T')[0]
            }));
        }
    }, [startDate]);

    useEffect(() => {
        if (endDate) {
            setNewProjectData(prev => ({
                ...prev,
                endDate: endDate.toISOString().split('T')[0]
            }));
        }
    }, [endDate]);

    const clearForm = () => {
        setNewProjectData({
            status: 'activo',
            progress: 0,
            completedParts: 0,
            totalParts: 0,
            assignedTo: [],
            documents: [],
            equipment: [
                'Kit de herramientas básicas',
                'Multímetro industrial',
                'Equipo de protección personal'
            ],
            projectType: 'bench'
        });
        setSelectedClient(null);
        setSelectedPlant(null);
        setRequiresHotel(false);
        setStartDate(null);
        setEndDate(null);
    };

    // 1. Agregar un nuevo useEffect para el debug
    useEffect(() => {
        if (selectedProject) {
            console.log('URL de imagen en el Paper:', selectedProject.cityImage);
        }
    }, [selectedProject]);

    // 2. Asegurémonos de que el cityImages esté bien definido
    const cityImages = {
        'Guadalupe': 'https://images.unsplash.com/photo-1577127305724-1111131c6e0f?q=80&w=1920',
        'Querétaro': 'https://images.unsplash.com/photo-1581993192008-63e896f4f744?q=80&w=1920',
        'Hermosillo': 'https://images.unsplash.com/photo-1619465712426-607f8ec542b9?q=80&w=1920',
        'San Pedro Tenango': 'https://images.unsplash.com/photo-1513735492246-483525079686?q=80&w=1920',
        'default': 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=1920'
    } as const;

    // 3. Agregar un console.log para verificar los estilos aplicados
    useEffect(() => {
        if (selectedProject) {
            console.log('Estilos aplicados:', {
                background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${selectedProject.cityImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            });
            
            // Verificar que la imagen se pueda cargar
            const img = document.createElement('img');
            img.onload = () => console.log('Imagen cargada correctamente');
            img.onerror = () => console.log('Error al cargar la imagen');
            img.src = selectedProject.cityImage;
        }
    }, [selectedProject]);

    // 4. Corregir la asignación de cityImage en el nuevo proyecto
    const getCityImage = (address: string): string => {
        const city = getCityFromAddress(address);
        return city in cityImages ? cityImages[city as keyof CityImageType] : cityImages.default;
    };

    const handleTechnicianClick = (technicianName: string) => {
        const employee = employeesData.find(emp => emp.name === technicianName);
        if (employee) {
            setSelectedTechnicianModal(employee);
        }
    };

    useEffect(() => {
        // Si llegamos desde Employees.tsx con un proyecto para mostrar
        if (location.state?.showProjectDetails) {
            const projectToShow = mockProjects.find(p => p.id === location.state.openProject);
            if (projectToShow) {
                setSelectedProject(projectToShow);
            }
        }
    }, [location.state]);

    // Y usar el contexto en su lugar
    const { projects, setProjects } = useProjects();

    // Inicializar el contexto con los datos mock
    useEffect(() => {
        if (projects.length === 0) {
            setProjects(mockProjects);
        }
    }, []);

    const handleCreateProject = () => {
        // ... código existente ...
        
        // Después de crear el proyecto, actualizar los empleados
        const { setEmployees } = useEmployees();
        setEmployees(prevEmployees => 
            prevEmployees.map(emp => {
                if (newProjectData.assignedTo?.includes(emp.name)) {
                    return {
                        ...emp,
                        project: newProjectData.name  // O el nombre del proyecto
                    };
                }
                return emp;
            })
        );
        
        // ... resto del código ...
    };

    return (
        <>
            <Group justify="space-between" mb="2rem">
                <Title order={2} size="h1" c="gray.3">
                    Proyectos
                </Title>
                <Button 
                    leftSection={<IconSettings size={20} />}
                    variant="light"
                    color="blue"
                    onClick={() => setShowAdminModal(true)}
                >
                    Admin Proyectos
                </Button>
            </Group>

            <Paper p="md" radius="md" mb="md" withBorder>
                <Stack gap="md">
                    <TextInput
                        placeholder="Buscar por nombre de proyecto o cliente..."
                        leftSection={<IconSearch size={16} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                    
                    <Group>
                        <Select
                            placeholder="Filtrar por ciudad"
                            data={cities.map(city => ({ value: city, label: city }))}
                            value={selectedCity}
                            onChange={setSelectedCity}
                            style={{ width: 200 }}
                            clearable
                        />
                        
                        <Select
                            placeholder="Filtrar por técnico"
                            data={technicians.map(tech => ({ value: tech, label: tech }))}
                            value={selectedTechnician}
                            onChange={setSelectedTechnician}
                            style={{ width: 200 }}
                            clearable
                        />

                        <Select
                            placeholder="Filtrar por estado"
                            data={statusOptions}
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            style={{ width: 200 }}
                            clearable
                        />
                    </Group>
                </Stack>
            </Paper>

            <Paper p="md" radius="md">
                <Stack gap="lg">
                    {filteredProjects.length === 0 ? (
                        <Text c="dimmed" ta="center" py="xl">
                            No se encontraron proyectos con los filtros seleccionados
                        </Text>
                    ) : (
                        filteredProjects.map((project) => (
                            <Paper 
                                key={project.id} 
                                p="md" 
                                radius="md" 
                                withBorder
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedProject(project)}
                            >
                                <Group justify="space-between" mb="xs">
                                    <Text size="lg" fw={500} c="gray.2">
                                        {project.name || 'Sin nombre'}
                                    </Text>
                                    <Group gap="sm">
                                        <Badge
                                            color={
                                                getProjectStatusFromProgress(project) === 'activo' ? 'blue' :
                                                getProjectStatusFromProgress(project) === 'completado' ? 'green' :
                                                getProjectStatusFromProgress(project) === 'en-progreso' ? 'purple' : 'yellow'
                                            }
                                        >
                                            {getProjectStatusFromProgress(project).toUpperCase()}
                                        </Badge>
                                        <ActionIcon 
                                            variant="subtle" 
                                            color="red" 
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setProjectToDelete(project);
                                            }}
                                            title="Eliminar"
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Group>

                                <Group gap="xl">
                                    <Group gap={4}>
                                        <Text size="sm" c="dimmed">Cliente:</Text>
                                        <Text span c="gray.3">{project.client || 'Sin cliente'}</Text>
                                    </Group>
                                    {project.location?.plant?.address && (
                                        <Group gap={4}>
                                            <IconMapPin size={14} color="#666" />
                                            <Text size="sm" c="gray.3">
                                                {getCityFromAddress(project.location.plant.address)}
                                            </Text>
                                        </Group>
                                    )}
                                </Group>

                                <Group gap="xl" mt="xs">
                                    <Text size="sm" c="dimmed">Inicio: <Text span c="gray.3">{project.startDate}</Text></Text>
                                    <Text size="sm" c="dimmed">Fin: <Text span c="gray.3">{project.endDate}</Text></Text>
                                </Group>

                                <Group justify="space-between" mt="md">
                                    <Group>
                                    <Text size="sm" c="dimmed">
                                            Progreso: {' '}
                                        <Text 
                                            span 
                                            c={getProjectStatus(project) === 'completado' ? 'green.4' : 'blue.4'}
                                            fw={getProjectStatus(project) === 'completado' ? 700 : 500}
                                        >
                                            {project.progress}%
                                        </Text>
                                    </Text>
                                        {project.projectType === 'patios' && (
                                            <ActionIcon
                                                variant="subtle"
                                                color="orange"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        // Validar que tengamos coordenadas
                                                        if (!project.location?.plant?.coordinates) {
                                                            notifications.show({
                                                                title: 'Error',
                                                                message: 'No hay coordenadas disponibles para esta planta',
                                                                color: 'red'
                                                            });
                                                            return;
                                                        }

                                                        // Limpiar la URL y extraer coordenadas
                                                        const cleanUrl = project.location.plant.coordinates.replace(/\s+/g, '');
                                                        const coordMatch = cleanUrl.match(/q=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                                                        
                                                        if (!coordMatch) {
                                                            console.error('No se pudieron extraer las coordenadas:', project.location.plant.coordinates);
                                                            notifications.show({
                                                                title: 'Error',
                                                                message: 'Formato de coordenadas inválido',
                                                                color: 'red'
                                                            });
                                                            return;
                                                        }

                                                        const coords = [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
                                                        console.log('Coordenadas extraídas:', coords);

                                                        // Generar posiciones solo si tenemos coordenadas válidas
                                                        const positions = Array.from({ length: 26 }, () => ({
                                                            lat: coords[0] + (Math.random() - 0.5) * 0.001,
                                                            lng: coords[1] + (Math.random() - 0.5) * 0.001
                                                        }));

                                                        setMapModal({
                                                            project,
                                                            units: {
                                                                ok: 15,
                                                                pending: 8,
                                                                failed: 3,
                                                                positions: positions.map((pos, index) => ({
                                                                    status: index < 15 ? 'ok' : 
                                                                           index < 23 ? 'pending' : 'failed',
                                                                    position: { lat: pos.lat, lng: pos.lng },
                                                                    unitId: `3HGRM4870${Math.random().toString().slice(2, 7)}${index.toString().padStart(6, '0')}`,
                                                                    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
                                                                    technician: project.assignedTo[Math.floor(Math.random() * project.assignedTo.length)],
                                                                    battery: Math.floor(Math.random() * (100 - 20) + 20),
                                                                    location: `Línea ${Math.floor(Math.random() * 5) + 1}, Estación ${Math.floor(Math.random() * 20) + 1}` // Ubicación aleatoria
                                                                }))
                                                            }
                                                        });
                                                    } catch (error) {
                                                        console.error('Error al procesar coordenadas:', error);
                                                        notifications.show({
                                                            title: 'Error',
                                                            message: 'Error al procesar las coordenadas del mapa',
                                                            color: 'red'
                                                        });
                                                    }
                                                }}
                                                title="Ver Mapa"
                                                style={{ color: '#ff9f43' }}
                                            >
                                                <IconMapPin size={16} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                    <Group gap={8}>
                                        {project.assignedTo.map((tech, index) => {
                                            const names = tech.split(' ');
                                            const shortName = names.length > 1 ? 
                                                `${names[0]} ${names[1]}` : 
                                                names[0];
                                            
                                            return (
                                            <Badge 
                                                key={index}
                                                size="md"
                                                variant="light"
                                                    color="grape"
                                                    style={{ 
                                                        cursor: 'pointer',
                                                        backgroundColor: 'var(--mantine-color-grape-9)',
                                                        color: 'white'
                                                    }}
                                                onClick={() => handleTechnicianClick(tech)}
                                            >
                                                    {shortName}
                                            </Badge>
                                            );
                                        })}
                                    </Group>
                                </Group>
                            </Paper>
                        ))
                    )}
                </Stack>
            </Paper>

            <Modal
                opened={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                size="xl"
                title={
                    <Group>
                        <IconBuildingFactory size={24} />
                        <Title order={3}>{selectedProject?.name}</Title>
                        <Badge
                            color={
                                selectedProject ? (
                                    getProjectStatusFromProgress(selectedProject) === 'activo' ? 'blue' :
                                    getProjectStatusFromProgress(selectedProject) === 'completado' ? 'green' :
                                    getProjectStatusFromProgress(selectedProject) === 'en-progreso' ? 'red' : 'yellow'
                                ) : 'gray'
                            }
                        >
                            {selectedProject ? getProjectStatusFromProgress(selectedProject).toUpperCase() : ''}
                        </Badge>
                    </Group>
                }
            >
                {selectedProject && (
                    <Stack>
                        <Paper p="md" radius="md" withBorder
                            style={{
                                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url("https://images.unsplash.com/photo-1577127305724-1111131c6e0f?q=80&w=1920")`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                minHeight: '200px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <Box style={{ position: 'relative', zIndex: 1 }}>
                                <Title order={4} mb="md" c="gray.2">Progreso del Proyecto</Title>
                                <Group justify="space-between" mb="xs">
                                    <Text c="gray.3">Progreso del Proyecto</Text>
                                    <Text fw={500} c="gray.2">{selectedProject.progress}%</Text>
                                </Group>
                                <Progress 
                                    value={selectedProject.progress} 
                                    color={selectedProject.progress === 100 ? 'green' : 'blue'}
                                    size="xl"
                                    radius="xl"
                                />
                                <Group justify="space-between" mt="md">
                                    <Text size="sm" c="gray.4">
                                        Partes Completadas: {selectedProject.completedParts}/{selectedProject.totalParts}
                                    </Text>
                                    <Group gap={8}>
                                        {selectedProject.assignedTo.map((tech, index) => (
                                            <Badge 
                                                key={index}
                                                size="md"
                                                variant="light"
                                                color="grape"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleTechnicianClick(tech)}
                                            >
                                                {tech}
                                            </Badge>
                                        ))}
                                    </Group>
                                </Group>
                            </Box>
                        </Paper>

                        <Group grow>
                            <Paper p="md" radius="md" withBorder>
                                <Box
                                    style={{
                                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url("/images/plants/aptiv.png")',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        marginBottom: '1rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setImageModal({
                                        src: '/images/plants/aptiv.png',
                                        title: 'Información de Planta'
                                    })}
                                >
                                    <Title order={4} p="md">
                                        <Group>
                                            <IconBuildingFactory size={20} />
                                            <Text>Información de Planta</Text>
                                        </Group>
                                    </Title>
                                </Box>
                                <Text c="blue.4" component="a" href={selectedProject.location.plant.coordinates} target="_blank">
                                    {selectedProject.location.plant.address}
                                </Text>
                                <List spacing="xs" mt="md">
                                    <List.Item icon={<IconUser size={16} />}>
                                        {selectedProject.location.plant.contact.name}
                                    </List.Item>
                                    <List.Item icon={<IconPhone size={16} />}>
                                        <Text 
                                            component="a" 
                                            href={`tel:${selectedProject.location.plant.contact.phone}`}
                                            style={{ 
                                                textDecoration: 'none', 
                                                color: 'var(--mantine-color-blue-6)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {selectedProject.location.plant.contact.phone}
                                        </Text>
                                    </List.Item>
                                    <List.Item icon={<IconMail size={16} />}>
                                        <Text 
                                            component="a" 
                                            href={`mailto:${selectedProject.location.plant.contact.email}`}
                                            style={{ 
                                                textDecoration: 'none', 
                                                color: 'var(--mantine-color-blue-6)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {selectedProject.location.plant.contact.email}
                                        </Text>
                                    </List.Item>
                                </List>
                            </Paper>

                            {selectedProject.location.hotel.name && (
                                <Paper p="md" radius="md" withBorder>
                                    <Box
                                        style={{
                                            backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url("/images/hotels/fiesta-inn.jpg")',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            marginBottom: '1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setImageModal({
                                            src: '/images/hotels/fiesta-inn.jpg',
                                            title: 'Hospedaje'
                                        })}
                                    >
                                        <Title order={4} p="md">
                                            <Group>
                                                <IconBed size={20} />
                                                <Text>Hospedaje</Text>
                                            </Group>
                                        </Title>
                                    </Box>
                                    <Text fw={500}>{selectedProject.location.hotel.name}</Text>
                                    <Text c="blue.4" component="a" href={selectedProject.location.hotel.coordinates} target="_blank">
                                        {selectedProject.location.hotel.address}
                                    </Text>
                                    <List spacing="xs" mt="md">
                                        <List.Item icon={<IconPhone size={16} />}>
                                            <Text 
                                                component="a" 
                                                href={`tel:${selectedProject.location.hotel.phone}`}
                                                style={{ 
                                                    textDecoration: 'none', 
                                                    color: 'var(--mantine-color-blue-6)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {selectedProject.location.hotel.phone}
                                            </Text>
                                        </List.Item>
                                    </List>
                                </Paper>
                            )}
                        </Group>

                        <Group grow>
                            <Paper p="md" radius="md" withBorder>
                                <Title order={4} mb="md">
                                    <Group>
                                        <IconTools size={20} />
                                        <Text>Equipo Necesario</Text>
                                    </Group>
                                </Title>
                                <List spacing="xs">
                                    {selectedProject.equipment.map((item, index) => (
                                        <List.Item key={index}>{item}</List.Item>
                                    ))}
                                </List>
                            </Paper>

                            <Paper p="md" radius="md" withBorder>
                                <Title order={4} mb="md">
                                    <Group>
                                        <IconDownload size={20} />
                                        <Text>Documentos Requeridos</Text>
                                    </Group>
                                </Title>
                                <List spacing="xs">
                                    {selectedProject.documents.map((doc, index) => (
                                        <List.Item 
                                            key={index}
                                            icon={
                                                <ActionIcon 
                                                    size="sm" 
                                                    variant="light" 
                                                    color="blue" 
                                                    component="a" 
                                                    href={doc.url}
                                                    target="_blank"
                                                >
                                                    <IconDownload size={16} />
                                                </ActionIcon>
                                            }
                                        >
                                            {doc.name}
                                        </List.Item>
                                    ))}
                                </List>
                            </Paper>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal
                opened={!!imageModal}
                onClose={() => setImageModal(null)}
                size="xl"
                title={imageModal?.title}
            >
                {imageModal && (
                    <Image
                        src={imageModal.src}
                        alt={imageModal.title}
                        style={{ 
                            width: '100%',
                            borderRadius: 8
                        }}
                        fit="contain"
                    />
                )}
            </Modal>

            <Modal
                opened={showAdminModal}
                onClose={() => setShowAdminModal(false)}
                title={null}
                size="90%"
                padding={0}
                withCloseButton={false}
                style={{ 
                    maxWidth: '1400px',
                    height: '90vh'
                }}
            >
                <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Group justify="apart" p="md" style={{ borderBottom: '1px solid #2C2E33' }}>
                        <Title order={3} c="gray.2">Administración de Proyectos</Title>
                        <ActionIcon variant="subtle" onClick={() => setShowAdminModal(false)}>
                            <IconX size={20} />
                        </ActionIcon>
                    </Group>

                    <Tabs defaultValue="create" style={{ flex: 1 }}>
                        <Tabs.List>
                            <Tabs.Tab value="create" leftSection={<IconPlus size={16} />}>
                                Crear Proyecto
                            </Tabs.Tab>
                            <Tabs.Tab value="edit" leftSection={<IconEdit size={16} />}>
                                Editar Proyecto
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="create" p="md">
                            <Grid grow gutter="md">
                                <Grid.Col span={12}>
                                    <Paper withBorder p="md">
                                        <Stack>
                                            <Title order={4} c="gray.2">Datos del Proyecto</Title>
                                            <Grid>
                                                <Grid.Col span={6}>
                                                    <TextInput
                                                        label="Nombre del Proyecto"
                                                        placeholder="Ej: CPIM"
                                                        required
                                                        value={newProjectData.name}
                                                        onChange={(e) => setNewProjectData(prev => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={6}>
                                                    <Select
                                                        label="Cliente"
                                                        placeholder="Selecciona el cliente"
                                                        data={predefinedClients.map(client => ({
                                                            value: client.id,
                                                            label: client.name
                                                        }))}
                                                        required
                                                        searchable
                                                        value={selectedClient}
                                                        onChange={(value) => {
                                                            setSelectedClient(value);
                                                            if (value) {
                                                                const clientPlants = predefinedPlants.filter(
                                                                    plant => plant.clientId === value
                                                                );
                                                                setFilteredPlants(clientPlants);
                                                                setNewProjectData(prev => ({
                                                                    ...prev,
                                                                    client: predefinedClients.find(c => c.id === value)?.name || ''
                                                                }));
                                                            } else {
                                                                setFilteredPlants([]);
                                                            }
                                                            setSelectedPlant(null);
                                                            setRequiresHotel(false);
                                                        }}
                                                    />
                                                </Grid.Col>
                                                
                                                <Grid.Col span={4}>
                                                    <DateInput
                                                        label="Fecha de Inicio"
                                                        placeholder="Selecciona una fecha"
                                                        required
                                                        value={startDate}
                                                        onChange={(value) => {
                                                            setStartDate(value);
                                                            if (value) {
                                                                setNewProjectData(prev => ({
                                                                    ...prev,
                                                                    startDate: value.toISOString().split('T')[0]
                                                                }));
                                                            }
                                                        }}
                                                        minDate={new Date()}
                                                        locale="es"
                                                        firstDayOfWeek={0}
                                                        styles={(theme) => ({
                                                            input: {
                                                                backgroundColor: theme.colors.dark[7],
                                                            },
                                                            day: {
                                                                '&[data-selected]': {
                                                                    backgroundColor: theme.colors.blue[6],
                                                                }
                                                            }
                                                        })}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={4}>
                                                    <DateInput
                                                        label="Fecha de Fin"
                                                        placeholder="Selecciona una fecha"
                                                        required
                                                        value={endDate}
                                                        onChange={(value) => {
                                                            setEndDate(value);
                                                            if (value) {
                                                                setNewProjectData(prev => ({
                                                                    ...prev,
                                                                    endDate: value.toISOString().split('T')[0]
                                                                }));
                                                            }
                                                        }}
                                                        minDate={startDate || new Date()}
                                                        locale="es"
                                                        firstDayOfWeek={0}
                                                        styles={(theme) => ({
                                                            input: {
                                                                backgroundColor: theme.colors.dark[7],
                                                            },
                                                            day: {
                                                                '&[data-selected]': {
                                                                    backgroundColor: theme.colors.blue[6],
                                                                }
                                                            }
                                                        })}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={4}>
                                                    <Group align="center" mb={8}>
                                                        <Text size="sm" fw={500}>Tipo de Proyecto</Text>
                                                        <Text size="sm" c="red" fw={700}>*</Text>
                                                    </Group>
                                                    <Group>
                                                        <Badge
                                                            size="lg"
                                                            variant={newProjectData.projectType === 'bench' ? 'filled' : 'outline'}
                                                            color="blue"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => setNewProjectData(prev => ({
                                                            ...prev,
                                                                projectType: prev.projectType === 'bench' ? null : 'bench'
                                                            }))}
                                                        >
                                                            Bench
                                                        </Badge>
                                                        <Badge
                                                            size="lg"
                                                            variant={newProjectData.projectType === 'patios' ? 'filled' : 'outline'}
                                                            color="violet"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => setNewProjectData(prev => ({
                                                                ...prev,
                                                                projectType: prev.projectType === 'patios' ? null : 'patios'
                                                            }))}
                                                        >
                                                            Patios
                                                        </Badge>
                                                    </Group>
                                                </Grid.Col>

                                                <Grid.Col span={12}>
                                                    <Title order={5} c="gray.2" mb="md">Ubicación</Title>
                                                    <Grid>
                                                        <Grid.Col span={12}>
                                                            <Select
                                                                label="Planta"
                                                                placeholder="Selecciona la planta"
                                                                data={filteredPlants.map(plant => ({
                                                                    value: plant.id,
                                                                    label: plant.name,
                                                                    description: plant.address
                                                                }))}
                                                                required
                                                                searchable
                                                                disabled={!selectedClient || filteredPlants.length === 0}
                                                                value={selectedPlant}
                                                                onChange={(plantId) => {
                                                                    setSelectedPlant(plantId);
                                                                    if (plantId) {
                                                                        const plant = predefinedPlants.find(p => p.id === plantId);
                                                                        if (plant) {
                                                                            setNewProjectData(prev => ({
                                                                                ...prev,
                                                                                location: {
                                                                                    plant: {
                                                                                        address: plant.address || '',
                                                                                        coordinates: plant.coordinates || '',
                                                                                        contact: {
                                                                                            name: plant.contact?.name || '',
                                                                                            phone: plant.contact?.phone || '',
                                                                                            email: plant.contact?.email || ''
                                                                                        }
                                                                                    },
                                                                                    hotel: requiresHotel ? {
                                                                                        ...plant.defaultHotel,
                                                                                        coordinates: 'https://maps.google.com/?q=22.77548264081194,-102.60761641848022'
                                                                                    } : {
                                                                                        name: '',
                                                                                        address: '',
                                                                                        coordinates: '',
                                                                                        phone: ''
                                                                                    }
                                                                                }
                                                                            }));
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            {!selectedClient && (
                                                                <Text size="sm" c="dimmed" mt={4}>
                                                                    Selecciona un cliente primero para ver las plantas disponibles
                                                                </Text>
                                                            )}
                                                        </Grid.Col>

                                                        <Grid.Col span={12}>
                                                            <Group align="flex-start">
                                                                <Switch
                                                                    label="Requiere Hospedaje"
                                                                    description="Activa esta opción si el proyecto requiere hospedaje para los técnicos"
                                                                    size="md"
                                                                    onChange={(event) => setRequiresHotel(event.currentTarget.checked)}
                                                                />
                                                            </Group>
                                                        </Grid.Col>

                                                        {requiresHotel && (
                                                            <Grid.Col span={12}>
                                                                <Paper withBorder p="md" bg="dark.6">
                                                                    <Stack>
                                                                        <Select
                                                                            label="Hotel"
                                                                            placeholder="Selecciona el hotel"
                                                                            data={predefinedPlants
                                                                                .filter(plant => plant.id === selectedPlant) // Filtrar por planta seleccionada
                                                                                .map(plant => ({
                                                                                    value: plant.id + '-hotel',
                                                                                    label: plant.defaultHotel.name,
                                                                                    description: plant.defaultHotel.address
                                                                                }))}
                                                                            searchable
                                                                            onChange={(hotelId) => {
                                                                                const plant = predefinedPlants.find(p => p.id + '-hotel' === hotelId);
                                                                                if (plant) {
                                                                                    console.log('Hotel seleccionado:', plant.defaultHotel);
                                                                                    // Aquí podrías actualizar el estado del formulario con la info del hotel
                                                                                }
                                                                            }}
                                                                        />
                                                                        <Text size="xs" c="dimmed">
                                                                            La información del hotel seleccionado se agregará automáticamente al proyecto
                                                                        </Text>
                                                                    </Stack>
                                                                </Paper>
                                                            </Grid.Col>
                                                        )}
                                                    </Grid>
                                                </Grid.Col>

                                                <Grid.Col span={12}>
                                                    <Title order={5} c="gray.2" mb="md">Asignación y Alcance</Title>
                                                    <Grid>
                                                        <Grid.Col span={6}>
                                                            <MultiSelect
                                                                label="Técnicos Asignados"
                                                                placeholder="Selecciona los técnicos"
                                                                data={availableTechnicians}
                                                                searchable
                                                                required
                                                                value={newProjectData.assignedTo}
                                                                onChange={(values) => setNewProjectData(prev => ({
                                                                    ...prev,
                                                                    assignedTo: values
                                                                }))}
                                                            />
                                                        </Grid.Col>
                                                        <Grid.Col span={6}>
                                                            <NumberInput
                                                                label="Total de Partes"
                                                                placeholder="Número total de partes a trabajar"
                                                                min={1}
                                                                required
                                                                value={newProjectData.totalParts}
                                                                onChange={(value: number | string) => setNewProjectData(prev => ({
                                                                    ...prev,
                                                                    totalParts: typeof value === 'number' ? value : parseInt(value as string) || 0
                                                                }))}
                                                            />
                                                        </Grid.Col>
                                                    </Grid>
                                                </Grid.Col>

                                                <Grid.Col span={12}>
                                                    <Title order={5} c="gray.2" mb="md">Documentación y Equipo</Title>
                                                    <Grid>
                                                        <Grid.Col span={6}>
                                                            <MultiSelect
                                                                label="Equipo Necesario"
                                                                placeholder="Selecciona el equipo requerido"
                                                                data={predefinedEquipment.map(eq => ({ value: eq, label: eq }))}
                                                                searchable
                                                                value={newProjectData.equipment}
                                                                onChange={(values) => setNewProjectData(prev => ({
                                                                    ...prev,
                                                                    equipment: values
                                                                }))}
                                                            />
                                                            <Text size="xs" c="dimmed" mt={4}>
                                                                Selecciona todo el equipo necesario para el proyecto
                                                            </Text>
                                                        </Grid.Col>
                                                        
                                                        <Grid.Col span={6}>
                                                            <Text size="sm" fw={500} mb={8}>Documentos Requeridos</Text>
                                                            <Dropzone
                                                                onDrop={(files) => {
                                                                    const newDocs: Array<{
                                                                        name: string;
                                                                        type: string;
                                                                        url: string;
                                                                        size?: number;
                                                                    }> = files.map(file => ({
                                                                        name: file.name,
                                                                        type: file.type || 'application/pdf',
                                                                        url: URL.createObjectURL(file),
                                                                        size: file.size
                                                                    }));
                                                                    
                                                                    setNewProjectData(prev => ({
                                                                        ...prev,
                                                                        documents: [...(prev.documents || []), ...newDocs]
                                                                    }));
                                                                }}
                                                                onReject={(files) => {
                                                                    notifications.show({
                                                                        title: 'Error',
                                                                        message: 'Algunos archivos no pudieron ser cargados. Asegúrate de que sean PDF.',
                                                                        color: 'red'
                                                                    });
                                                                }}
                                                                maxSize={5 * 1024 ** 2} // 5MB
                                                                accept={['application/pdf']}
                                                                style={{ minHeight: '120px' }}
                                                            >
                                                                <Group justify="center" gap="xl" style={{ minHeight: '100px', pointerEvents: 'none' }}>
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
                                                                        <IconDownload
                                                                            size="3.2rem"
                                                                            stroke={1.5}
                                                                        />
                                                                    </Dropzone.Idle>

                                                                    <Stack gap="xs" align="center">
                                                                        <Text size="xl" inline>
                                                                            Arrastra documentos aquí o haz click para seleccionar
                                                                        </Text>
                                                                        <Text size="sm" c="dimmed" inline>
                                                                            Archivos PDF, máximo 5MB cada uno
                                                                        </Text>
                                                                    </Stack>
                                                                </Group>
                                                            </Dropzone>

                                                            {/* Lista de documentos cargados */}
                                                            {newProjectData.documents && newProjectData.documents.length > 0 && (
                                                                <Paper withBorder p="xs" mt="sm">
                                                                    <Stack gap="xs">
                                                                        <Text size="sm" fw={500}>Documentos Cargados:</Text>
                                                                        {newProjectData.documents.map((doc, index) => (
                                                                            <Group key={index} justify="space-between">
                                                                                <Group gap="xs">
                                                                                    <IconFileText size="1.2rem" />
                                                                                    <Text size="sm">{doc.name}</Text>
                                                                                </Group>
                                                                                <ActionIcon 
                                                                                    color="red" 
                                                                                    variant="subtle"
                                                                                    onClick={() => {
                                                                                        setNewProjectData(prev => ({
                                                                                            ...prev,
                                                                                            documents: prev.documents?.filter((_, i) => i !== index) || []
                                                                                        }));
                                                                                    }}
                                                                                >
                                                                                    <IconTrash size="1rem" />
                                                                                </ActionIcon>
                                                                            </Group>
                                                                        ))}
                                                                    </Stack>
                                                                </Paper>
                                                            )}

                                                            <Text size="xs" c="dimmed" mt={4}>
                                                                Sube los documentos que deberán presentar los técnicos
                                                            </Text>
                                                        </Grid.Col>
                                                    </Grid>
                                                </Grid.Col>
                                            </Grid>
                                        </Stack>
                                    </Paper>
                                </Grid.Col>
                                                <Grid.Col span={12}>
                                                    <Group justify="right" mt="xl">
                                                        <Button variant="default" onClick={() => {
                                                            clearForm();
                                                            setShowAdminModal(false);
                                                        }}>
                                                            Cancelar
                                                        </Button>
                                                        <Button 
                                                            onClick={() => {
                                                // Validar campos requeridos incluyendo projectType
                                                if (!newProjectData.name || 
                                                    !newProjectData.client || 
                                                    !startDate || 
                                                    !endDate || 
                                                    !selectedPlant || 
                                                    !newProjectData.totalParts ||
                                                    !newProjectData.projectType) {  // Nueva validación
                                                    
                                                                    notifications.show({
                                                                        title: 'Error',
                                                        message: !newProjectData.projectType 
                                                            ? 'Por favor selecciona el tipo de proyecto (Bench o Patios)'
                                                            : 'Por favor completa todos los campos requeridos',
                                                                        color: 'red'
                                                                    });
                                                                    return;
                                                                }

                                                                // Obtener la planta seleccionada
                                                                const plant = predefinedPlants.find(p => p.id === selectedPlant);
                                                                if (!plant) return;

                                                                // Crear el nuevo proyecto
                                                                const newProject: Project = {
                                                                    ...newProjectData as Project,
                                                                    id: mockProjects.length + 1,
                                                                    client: plant.name,
                                                                    location: {
                                                                        plant: {
                                                                            address: plant.address || '',
                                                                            coordinates: plant.coordinates || '',
                                                                            contact: {
                                                                                name: plant.contact?.name || '',
                                                                                phone: plant.contact?.phone || '',
                                                                                email: plant.contact?.email || ''
                                                                            }
                                                                        },
                                                                        hotel: requiresHotel ? {
                                                                            ...plant.defaultHotel,
                                                                            coordinates: 'https://maps.google.com/?q=22.77548264081194,-102.60761641848022'
                                                                        } : {
                                                                            name: '',
                                                                            address: '',
                                                                            coordinates: '',
                                                                            phone: ''
                                                                        }
                                                                    },
                                                                    cityImage: getCityImage(plant.address),
                                                                    lastTechnician: {
                                                                        name: 'Sistema',
                                                                        date: new Date().toISOString().split('T')[0],
                                                                        action: 'Proyecto creado'
                                                                    },
                                                                    progress: 0,
                                                                    completedParts: 0,
                                                                    totalParts: newProjectData.totalParts || 0,
                                                                    assignedTo: newProjectData.assignedTo || [],
                                                                    documents: [],
                                                                    equipment: [
                                                                        'Kit de herramientas básicas',
                                                                        'Multímetro industrial',
                                                                        'Equipo de protección personal'
                                                                    ],
                                                    status: newProjectData.status || 'en-progreso',
                                                                    startDate: startDate ? startDate.toISOString().split('T')[0] : '',
                                                    endDate: endDate ? endDate.toISOString().split('T')[0] : '',
                                                    projectType: newProjectData.projectType  // Agregar el tipo de proyecto
                                                                };

                                                                // Agregar el nuevo proyecto a la lista
                                                                mockProjects.unshift(newProject);

                                                                // Mostrar notificación de éxito
                                                                notifications.show({
                                                                    title: 'Éxito',
                                                    message: `Proyecto ${newProjectData.projectType?.toUpperCase()} creado correctamente`,
                                                                    color: 'green'
                                                                });

                                                                // Limpiar el formulario y cerrar el modal
                                                                clearForm();
                                                                setShowAdminModal(false);

                                                // Después de crear el proyecto, actualizar los empleados
                                                setEmployees(prevEmployees => 
                                                    prevEmployees.map(emp => {
                                                        if (newProjectData.assignedTo?.includes(emp.name)) {
                                                            return {
                                                                ...emp,
                                                                project: newProjectData.name
                                                            };
                                                        }
                                                        return emp;
                                                    })
                                                );
                                                            }}
                                                        >
                                                            Guardar Proyecto
                                                        </Button>
                                                    </Group>
                                </Grid.Col>
                            </Grid>
                        </Tabs.Panel>

                        <Tabs.Panel value="edit" p="md">
                            <Grid grow gutter="md">
                                <Grid.Col span={12}>
                                    <Paper withBorder p="md">
                                        <Stack>
                                            <Group justify="space-between" mb="md">
                                                <Title order={4} c="gray.2">Seleccionar Proyecto</Title>
                                                <Select
                                                    placeholder="Buscar proyecto..."
                                                    data={mockProjects.map(p => ({
                                                        value: p.id.toString(),
                                                        label: `${p.name} - ${p.client}`
                                                    }))}
                                                    searchable
                                                    style={{ width: 300 }}
                                                    onChange={(value) => {
                                                        const project = mockProjects.find(p => p.id.toString() === value);
                                                        if (project) {
                                                            setEditFormData(project);
                                                        }
                                                    }}
                                                />
                                            </Group>
                                            
                                            <Grid>
                                                <Grid.Col span={6}>
                                                    <TextInput
                                                        label="Nombre del Proyecto"
                                                        placeholder="Ej: CPIM"
                                                        value={editFormData?.name || ''}
                                                        onChange={(e) => setEditFormData(prev => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={6}>
                                                    <Select
                                                        label="Cliente"
                                                        placeholder="Selecciona el cliente"
                                                        data={predefinedClients.map(client => ({
                                                            value: client.id,
                                                            label: client.name
                                                        }))}
                                                        value={editFormData?.client}
                                                        onChange={(value) => setEditFormData(prev => ({
                                                            ...prev,
                                                            client: value || ''
                                                        }))}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={4}>
                                                    <DateInput
                                                        label="Fecha de Inicio"
                                                        placeholder="Selecciona una fecha"
                                                        value={editFormData?.startDate ? new Date(editFormData.startDate) : null}
                                                        onChange={(date) => setEditFormData(prev => ({
                                                            ...prev,
                                                            startDate: date?.toISOString().split('T')[0] || ''
                                                        }))}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={4}>
                                                    <DateInput
                                                        label="Fecha de Fin"
                                                        placeholder="Selecciona una fecha"
                                                        value={editFormData?.endDate ? new Date(editFormData.endDate) : null}
                                                        onChange={(date) => setEditFormData(prev => ({
                                                            ...prev,
                                                            endDate: date?.toISOString().split('T')[0] || ''
                                                        }))}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={4}>
                                                    <Select
                                                        label="Estado"
                                                        data={[
                                                            { value: 'activo', label: 'Activo' },
                                                            { value: 'completado', label: 'Completado' },
                                                            { value: 'en-progreso', label: 'En Progreso' }
                                                        ]}
                                                        value={editFormData?.status || ''}
                                                        onChange={(value) => setEditFormData(prev => ({
                                                            ...prev,
                                                            status: value as Project['status']
                                                        }))}
                                                    />
                                                </Grid.Col>
                                                
                                                <Grid.Col span={12}>
                                                    <Title order={5} c="gray.2" mb="md">Asignación y Alcance</Title>
                                                    <Grid>
                                                        <Grid.Col span={6}>
                                                            <MultiSelect
                                                                label="Técnicos Asignados"
                                                                placeholder="Selecciona los técnicos"
                                                                data={availableTechnicians}
                                                                value={editFormData?.assignedTo || []}
                                                                onChange={(values) => setEditFormData(prev => ({
                                                                    ...prev,
                                                                    assignedTo: values
                                                                }))}
                                                                searchable
                                                            />
                                                        </Grid.Col>
                                                        <Grid.Col span={6}>
                                                            <NumberInput
                                                                label="Total de Partes"
                                                                placeholder="Número total de partes"
                                                                value={editFormData?.totalParts || 0}
                                                                onChange={(value) => setEditFormData(prev => ({
                                                                    ...prev,
                                                                    totalParts: typeof value === 'number' ? value : 0
                                                                }))}
                                                                min={1}
                                                            />
                                                        </Grid.Col>
                                                    </Grid>
                                                </Grid.Col>

                                                <Grid.Col span={12}>
                                                    <Group justify="right" mt="xl">
                                                        <Button variant="default" onClick={() => {
                                                            setEditFormData({});
                                                            setShowAdminModal(false);
                                                        }}>
                                                            Cancelar
                                                        </Button>
                                                        <Button 
                                                            color="yellow"
                                                            disabled={!editFormData}
                                                            onClick={() => {
                                                                if (editFormData) {
                                                                    console.log('Guardando cambios:', editFormData);
                                                                    // Aquí iría la lógica para actualizar el proyecto
                                                                }
                                                            }}
                                                        >
                                                            Actualizar Proyecto
                                                        </Button>
                                                    </Group>
                                                </Grid.Col>
                                            </Grid>
                                        </Stack>
                                    </Paper>
                                </Grid.Col>
                            </Grid>
                        </Tabs.Panel>
                    </Tabs>
                </Box>
            </Modal>

            <Modal
                opened={!!selectedTechnicianModal}
                onClose={() => setSelectedTechnicianModal(null)}
                title={
                    selectedTechnicianModal && (
                        <Group justify="space-between" align="center" mb="md">
                            <Group>
                                <Avatar
                                    src={selectedTechnicianModal?.avatar}
                                    size="xl"
                                    radius="md"
                                />
                                <Stack gap="xs">
                                    <Title order={3}>{selectedTechnicianModal?.name}</Title>
                                    <Badge
                                        color={
                                            selectedTechnicianModal?.status === 'PRESENTE' ? 'green' :
                                            selectedTechnicianModal?.status === 'AUSENTE' ? 'red' : 'yellow'
                                        }
                                    >
                                        {selectedTechnicianModal?.status}
                                    </Badge>
                                </Stack>
                            </Group>
                            <Button
                                variant="light"
                                color="blue"
                                leftSection={<IconUser size={16} />}
                                onClick={() => {
                                    setSelectedTechnicianModal(null);
                                    navigate('/employees', { 
                                        state: { 
                                            openExpediente: true, 
                                            technicianName: selectedTechnicianModal?.name 
                                        } 
                                    });
                                }}
                            >
                                Ver Expediente
                            </Button>
                        </Group>
                    )
                }
                size="xl"
            >
                {selectedTechnicianModal && (
                    <Stack>
                        <Paper withBorder p="md">
                            <Stack>
                                <List spacing="md">
                                    <List.Item icon={<IconMapPin size={16} />}>
                                        {selectedTechnicianModal.location}
                                    </List.Item>
                                    <List.Item icon={<IconPhone size={16} />}>
                                        <Text 
                                            component="a" 
                                            href={`tel:${selectedTechnicianModal.phone}`}
                                            style={{ 
                                                textDecoration: 'none', 
                                                color: 'var(--mantine-color-blue-6)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {selectedTechnicianModal.phone}
                                        </Text>
                                    </List.Item>
                                    <List.Item icon={<IconMail size={16} />}>
                                        <Text 
                                            component="a" 
                                            href={`mailto:${selectedTechnicianModal.email}`}
                                            style={{ 
                                                textDecoration: 'none', 
                                                color: 'var(--mantine-color-blue-6)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {selectedTechnicianModal.email}
                                        </Text>
                                    </List.Item>
                                </List>
                            </Stack>
                        </Paper>

                        <Grid grow gutter="md" mt="md">
                            <Grid.Col span={6}>
                                <Paper withBorder p="md">
                                    <Title order={4} mb="lg">Contribución al Proyecto Actual</Title>
                                    {selectedProject && (
                                        <Stack gap="md">
                                            {(() => {
                                                const techProgress = mockTechnicianProgress.find(
                                                    tp => tp.projectId === selectedProject.id && 
                                                         tp.technicianName === selectedTechnicianModal.name
                                                );
                                                
                                                if (!techProgress) {
                                                    return <Text>No hay datos de progreso disponibles</Text>;
                                                }

                                                return (
                                                    <Stack gap="md">
                                                        <Group justify="apart">
                                                            <Text fw={500}>Partes completadas:</Text>
                                                            <Badge size="lg" color="green">
                                                                {techProgress.completedParts} partes
                                                            </Badge>
                                                        </Group>
                                                        <Group justify="apart">
                                                            <Text fw={500}>Total del proyecto:</Text>
                                                            <Badge size="lg" color="blue">
                                                                {selectedProject.totalParts} partes
                                                            </Badge>
                                                        </Group>
                                                        <Group justify="apart">
                                                            <Text fw={500}>Porcentaje completado:</Text>
                                                            <Badge 
                                                                size="lg" 
                                                                color={Math.round((techProgress.completedParts / selectedProject.totalParts) * 100) >= 50 ? 'green' : 'yellow'}
                                                            >
                                                                {Math.round((techProgress.completedParts / selectedProject.totalParts) * 100)}%
                                                            </Badge>
                                                        </Group>
                                                    </Stack>
                                                );
                                            })()}
                                        </Stack>
                                    )}
                                </Paper>
                            </Grid.Col>

                            <Grid.Col span={6}>
                                <Paper withBorder p="md">
                                    <Title order={4} mb="lg">Historial de Partes Completadas</Title>
                                    <BarChart
                                        width={400}
                                        height={300}
                                        data={mockTechnicianHistoryData}
                                        margin={{
                                            top: 5,
                                            right: 30,
                                            left: 20,
                                            bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="partes" fill="#8884d8" name="Partes Completadas" />
                                    </BarChart>
                                </Paper>
                            </Grid.Col>
                        </Grid>
                    </Stack>
                )}
            </Modal>

            <Modal
                opened={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                title="Confirmar eliminación"
                size="sm"
            >
                <Stack>
                    <Text>¿Estás seguro de eliminar el proyecto "{projectToDelete?.name}"?</Text>
                    <Text size="sm" c="dimmed">Esta acción no se puede deshacer.</Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setProjectToDelete(null)}>
                            Cancelar
                        </Button>
                        <Button 
                            color="red" 
                            onClick={() => {
                                setProjects((prev: Project[]) => 
                                    prev.filter((p: Project) => p.id !== projectToDelete?.id)
                                );
                                setProjectToDelete(null);
                            }}
                        >
                            Eliminar
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {mapModal && (
                <MapModal
                    project={mapModal.project}
                    units={mapModal.units}
                    onClose={() => setMapModal(null)}
                />
            )}
        </>
    );
}

// Agregar el estilo CSS dentro del mismo archivo (si estás usando CSS-in-JS)
const styles = {
    '.technician-link': {
        background: 'none',
        border: 'none',
        color: '#0066cc',
        padding: '2px 8px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        '&:hover': {
            textDecoration: 'underline',
        }
    }
} 