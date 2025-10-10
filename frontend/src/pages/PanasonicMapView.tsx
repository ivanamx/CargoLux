import { Title, Paper, Text, Group, Badge, Stack, Modal, List, ActionIcon, Box, Grid, Progress, Select, TextInput, Button, Tabs, MultiSelect, NumberInput, Switch, Image, Avatar, Popover, Divider, ThemeIcon, LoadingOverlay, SimpleGrid, RingProgress, Menu } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconMapPin, IconPhone, IconMail, IconDownload, IconTools, IconBuildingFactory, IconBed, IconUser, IconSearch, IconSettings, IconPlus, IconEdit, IconX, IconFileText, IconTrash, IconCalendar, IconChevronDown, IconBatteryFilled, IconBattery2, IconBattery1, IconCircleCheck, IconChartBar, IconClock, IconBox, IconTag, IconLink, IconFile, IconFileSpreadsheet, IconFileCode, IconArchive, IconChevronDown as IconChevronDownMenu, IconShare, IconCar, IconWalk } from '@tabler/icons-react';
import { useState, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { predefinedClients, predefinedPlants, getCityFromAddress, cityImages } from '../data/projectsData';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { Dropzone } from '@mantine/dropzone';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEmployees } from '../context/EmployeeContext';
import { useProjects } from '../context/ProjectContext';
import { MapContainer, TileLayer, Popup, Marker, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { projectService } from '../services/api';
import type { Project, ProjectDocument } from '../types/project';
import { getToken } from '../services/auth';
import { ProjectDetailsModal } from '../components/ProjectDetailsModal';
import { modals } from '@mantine/modals';
import { employeeService } from '../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';

// Configurar iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Función para verificar si es hoy
const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

// Función para verificar si es ayer
const isYesterday = (date: Date): boolean => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
};

// Función para verificar si es la misma fecha
const isSameDate = (date1: Date, date2: Date): boolean => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
};

// Componente para el mapa interactivo específico del proyecto Panasonic (ID 28)
const PanasonicMapView: React.FC = () => {
    const { user } = useAuth();
    const { projects } = useProjects();
    const [project, setProject] = useState<Project | null>(null);
    const [units, setUnits] = useState({
        ok: 0,
        pending: 0,
        failed: 0,
        positions: [] as Array<{
            status: 'ok' | 'pending' | 'failed';
            position: { lat: number; lng: number };
            unitId: string;
            timestamp: Date;
            technician: string;
            battery: number;
            location: string;
            categorie?: string;
            boxcode?: string;
            boxtimestamp?: Date | null;
        }>
    });
    const [batteryCodes, setBatteryCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'ok' | 'pending' | 'failed' | 'a' | 'b' | 'c' | 'd' | 'e' | 'boxes'>('all');
    const [boxCodes, setBoxCodes] = useState<string[]>([]);
    const [vinFilter, setVinFilter] = useState('');
    const [techFilter, setTechFilter] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('all');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedBatteryCode, setSelectedBatteryCode] = useState<string | null>(null);
    const [mapRef, setMapRef] = useState<any>(null);
    const [imageZoom, setImageZoom] = useState<number>(0.72);
    const [imagePosition, setImagePosition] = useState<{x: number, y: number}>({x: 0, y: 0});
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{x: number, y: number}>({x: 0, y: 0});
    const [downloadMenuOpened, setDownloadMenuOpened] = useState(false);
    const [shareMenuOpened, setShareMenuOpened] = useState(false);
    const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [currentRoute, setCurrentRoute] = useState<Array<[number, number]> | null>(null);
    const [transportMode, setTransportMode] = useState<'driving-car' | 'foot-walking'>('driving-car');
    const [isPortrait, setIsPortrait] = useState<boolean>(false);

    // Detectar orientación del dispositivo
    useEffect(() => {
        const checkOrientation = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };
        
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Cargar proyecto Panasonic (ID 28)
    useEffect(() => {
        const loadPanasonicProject = async () => {
            try {
                setLoading(true);
                const panasonicProject = projects.find(p => p.id === 28);
                if (panasonicProject) {
                    setProject(panasonicProject);
                    await loadProjectData(panasonicProject);
                } else {
                    notifications.show({
                        title: 'Error',
                        message: 'Proyecto Panasonic no encontrado',
                        color: 'red'
                    });
                }
            } catch (error) {
                console.error('Error loading Panasonic project:', error);
                notifications.show({
                    title: 'Error',
                    message: 'Error al cargar el proyecto Panasonic',
                    color: 'red'
                });
            } finally {
                setLoading(false);
            }
        };

        loadPanasonicProject();
    }, [projects]);

    // Función para cargar datos del proyecto
    const loadProjectData = async (projectData: Project) => {
        try {
            const token = getToken();
            if (!token) return;

            // Cargar datos de checkpoints de Panasonic
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/panasonic-checkpoints/project/${projectData.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const checkpoints = await response.json();
                console.log('Checkpoints cargados:', checkpoints);

                // Procesar datos para el mapa
                const processedPositions = checkpoints.map((checkpoint: any) => ({
                    status: 'ok' as const,
                    position: {
                        lat: parseFloat(checkpoint.latitude),
                        lng: parseFloat(checkpoint.longitude)
                    },
                    unitId: checkpoint.batterycode || `CHECK-${checkpoint.id}`,
                    timestamp: new Date(checkpoint.timestamp),
                    technician: checkpoint.user?.full_name || 'Técnico',
                    battery: 100,
                    location: checkpoint.location || 'Ubicación',
                    categorie: checkpoint.category || 'a',
                    boxcode: checkpoint.boxcode || null,
                    boxtimestamp: checkpoint.boxtimestamp ? new Date(checkpoint.boxtimestamp) : null
                }));

                setUnits({
                    ok: processedPositions.length,
                    pending: 0,
                    failed: 0,
                    positions: processedPositions
                });

                // Extraer códigos de batería únicos
                const uniqueBatteryCodes = [...new Set(processedPositions.map(p => p.unitId))];
                setBatteryCodes(uniqueBatteryCodes);

                // Extraer códigos de cajas únicos
                const uniqueBoxCodes = [...new Set(processedPositions.filter(p => p.boxcode).map(p => p.boxcode!))];
                setBoxCodes(uniqueBoxCodes);

            } else {
                console.error('Error loading checkpoints:', response.statusText);
            }
        } catch (error) {
            console.error('Error loading project data:', error);
        }
    };

    // Función para cambiar el filtro
    const handleFilterChange = (newFilter: 'all' | 'ok' | 'pending' | 'failed' | 'a' | 'b' | 'c' | 'd' | 'e' | 'boxes') => {
        setFilter(newFilter);
        setSelectedBatteryCode(null);
    };

    // Filtrar posiciones según los filtros activos
    const filteredPositions = units.positions.filter(unit => {
        const isBox = unit.unitId?.startsWith('BOX');
        
        if (filter === 'boxes') {
            const boxMatch = isBox;
            const dateMatch = dateFilter === 'all' || 
                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
            return boxMatch && dateMatch && specificDateMatch &&
                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
        } else if (filter === 'all') {
            const categoryMatch = !isBox;
            const dateMatch = dateFilter === 'all' || 
                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
            return categoryMatch && dateMatch && specificDateMatch &&
                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
        } else if (filter === 'ok' || filter === 'failed') {
            const statusMatch = unit.status === filter && !isBox;
            const dateMatch = dateFilter === 'all' || 
                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
            return statusMatch && dateMatch && specificDateMatch &&
                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
        } else {
            const categoryMatch = unit.categorie?.toLowerCase() === filter && !isBox;
            const dateMatch = dateFilter === 'all' || 
                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
            return categoryMatch && dateMatch && specificDateMatch &&
                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
        }
    });

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
            }}>
                <LoadingOverlay visible={true} />
            </div>
        );
    }

    if (!project) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column'
            }}>
                <Title order={2} c="red">Proyecto Panasonic no encontrado</Title>
                <Text c="dimmed">El proyecto con ID 28 no está disponible</Text>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper p="md" style={{ borderBottom: '1px solid #373A40' }}>
                <Group justify="space-between">
                    <div>
                        <Title order={2}>Mapa Interactivo - {project.name}</Title>
                        <Text c="dimmed">Vista DRE - Proyecto Panasonic</Text>
                    </div>
                    <Group>
                        <Text size="sm" c="dimmed">
                            {filteredPositions.length} registros mostrados
                        </Text>
                    </Group>
                </Group>
            </Paper>

            {/* Contenido principal */}
            <div style={{ 
                display: 'flex', 
                height: 'calc(100vh - 80px)',
                flex: 1
            }}>
                {/* Barra lateral izquierda */}
                <Paper 
                    style={{ 
                        width: '300px', 
                        height: '100%', 
                        borderRight: '1px solid #373A40',
                        overflowY: 'auto',
                        padding: '16px',
                        backgroundColor: '#1A1B1E'
                    }}
                >
                    <Stack gap="md">
                        <Title order={4} c="blue.4">
                            Códigos de Batería
                        </Title>
                        
                        {/* Filtros por fecha */}
                        <Group gap="xs">
                            <Badge 
                                color={dateFilter === 'all' ? 'blue' : 'gray'}
                                onClick={() => setDateFilter('all')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                Todos
                            </Badge>
                            <Badge 
                                color={dateFilter === 'today' ? 'green' : 'gray'}
                                onClick={() => setDateFilter('today')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                Hoy
                            </Badge>
                            <Badge 
                                color={dateFilter === 'yesterday' ? 'orange' : 'gray'}
                                onClick={() => setDateFilter('yesterday')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                Ayer
                            </Badge>
                        </Group>
                        
                        <Text size="sm" c="dimmed">
                            {filteredPositions.length} registros encontrados
                        </Text>
                        
                        {/* Lista de códigos */}
                        <Stack gap="xs" style={{ maxHeight: 'calc(100% - 200px)', overflowY: 'auto' }}>
                            {filteredPositions.map((unit, index) => (
                                <Paper
                                    key={index}
                                    p="xs"
                                    style={{ 
                                        cursor: 'pointer',
                                        backgroundColor: selectedBatteryCode === unit.unitId ? '#339AF0' : '#2C2E33',
                                        borderColor: selectedBatteryCode === unit.unitId ? '#4DABF7' : '#339AF0',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => setSelectedBatteryCode(unit.unitId)}
                                >
                                    <Group justify="space-between">
                                        <div>
                                            <Text size="sm" fw={500}>
                                                {unit.unitId}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {unit.technician}
                                            </Text>
                                        </div>
                                        <Badge 
                                            color={unit.categorie === 'a' ? 'green' : 
                                                   unit.categorie === 'b' ? 'blue' : 
                                                   unit.categorie === 'c' ? 'yellow' : 
                                                   unit.categorie === 'd' ? 'orange' : 'red'}
                                            size="sm"
                                        >
                                            {unit.categorie?.toUpperCase()}
                                        </Badge>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    </Stack>
                </Paper>

                {/* Mapa */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <MapContainer
                        center={[19.2925, -99.6569]} // Toluca, México
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        ref={setMapRef}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        
                        {/* Marcadores */}
                        {filteredPositions.map((unit, index) => {
                            let markerColor = '#2196F3';
                            
                            if (filter === 'all') {
                                markerColor = '#2196F3';
                            } else if (unit.categorie === 'a') {
                                markerColor = '#4CAF50';
                            } else if (unit.categorie === 'b') {
                                markerColor = '#2196F3';
                            } else if (unit.categorie === 'c') {
                                markerColor = '#FFC107';
                            } else if (unit.categorie === 'd') {
                                markerColor = '#FF9800';
                            } else if (unit.categorie === 'e') {
                                markerColor = '#F44336';
                            }

                            return (
                                <Marker
                                    key={index}
                                    position={[unit.position.lat, unit.position.lng]}
                                    icon={L.divIcon({
                                        className: 'custom-marker',
                                        html: `<div style="
                                            background-color: ${markerColor};
                                            width: 20px;
                                            height: 20px;
                                            border-radius: 50%;
                                            border: 2px solid white;
                                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                        "></div>`,
                                        iconSize: [20, 20],
                                        iconAnchor: [10, 10]
                                    })}
                                >
                                    <Popup>
                                        <div style={{ minWidth: '200px' }}>
                                            <Text fw={500} size="sm">
                                                {unit.unitId}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Técnico: {unit.technician}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Categoría: {unit.categorie?.toUpperCase()}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Fecha: {dayjs(unit.timestamp).format('DD/MM/YYYY HH:mm')}
                                            </Text>
                                            {unit.boxcode && (
                                                <Text size="xs" c="dimmed">
                                                    Caja: {unit.boxcode}
                                                </Text>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default PanasonicMapView;
