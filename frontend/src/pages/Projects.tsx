import { Title, Paper, Text, Group, Badge, Stack, Modal, List, ActionIcon, Box, Grid, Progress, Select, TextInput, Button, Tabs, MultiSelect, NumberInput, Switch, Image, Avatar, Popover, Divider, ThemeIcon, LoadingOverlay, SimpleGrid, RingProgress, Menu } from '@mantine/core';
import * as XLSX from 'xlsx';
import { DateInput } from '@mantine/dates';
import { IconMapPin, IconPhone, IconMail, IconDownload, IconTools, IconBuildingFactory, IconBed, IconUser, IconSearch, IconSettings, IconPlus, IconEdit, IconX, IconFileText, IconTrash, IconCalendar, IconChevronDown, IconBatteryFilled, IconBattery2, IconBattery1, IconCircleCheck, IconChartBar, IconClock, IconBox, IconTag, IconLink, IconFile, IconFileSpreadsheet, IconFileCode, IconArchive, IconChevronDown as IconChevronDownMenu, IconShare } from '@tabler/icons-react';
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
import { MapContainer, TileLayer, Popup, Marker, useMap } from 'react-leaflet';
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
import JSZip from 'jszip';



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

// Mantener la definición de tipos y datos mock
interface Employee {
    id: number;
    email: string;
    full_name: string;
    location: string;
    phone: string;
    status: string;
    avatar?: string;
    personal_info?: {
        curp: string;
        rfc: string;
        birth_date: string;
    };
    employment_info?: {
        position: string;
        start_date: string;
    };
    project?: string;
}

// Agregar esta función antes del componente Projects
const getProjectStatusFromProgress = (project: Project) => {
    console.log('🔍 Analizando proyecto:', project.name, 'Status actual:', project.status);
    
    // Si el proyecto está completado, mantener ese status
    if (project.status === 'completado') return 'completado';
    
    // Si el progreso es 100%, cambiar a completado
    if (project.progress === 100) return 'completado';
    
    // Para otros casos, respetar el status real del proyecto
    if (project.status === 'en-progreso') return 'en-progreso';
    if (project.status === 'pendiente') return 'pendiente';
    if (project.status === 'retrasado') return 'retrasado';
    if (project.status === 'activo') return 'activo';
    
    // Solo como fallback, usar el status original
    return project.status || 'activo';
};

// Definir los datos mock que faltan
const predefinedEquipment = [
    'Power Supply',
    'Pulsar',
    'Equipo de protección personal',
    'Laptop',
    'Tablet',
    'Arneses',
    'Multipuertos USB',
    'Multicontacto',
    'Extensión',
    'Etiquetas',
    'Impresora',
    'Escaner de código de barras',
    'Dots',
    'HotSpot',
];

const mockTechnicianProgress: TechnicianProjectProgress[] = [];

const mockTechnicianHistoryData = [
    { month: 'Ene', partes: 45 },
    { month: 'Feb', partes: 52 },
    // ... otros datos
];

// Primero agregamos la definición del ícono al inicio del archivo, después de las importaciones
const triangleIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2L18 17H2L10 2Z" fill="currentColor" stroke="white"/>
        </svg>
    `),
        iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -20],
    className: 'triangle-marker'
});

// Icono para la ubicación del usuario (círculo rojo pulsante)
const userLocationIcon = L.divIcon({
    className: 'user-location-marker',
    html: `
        <div style="
            width: 12px;
            height: 12px;
            background-color: #ff4444;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 3px rgba(255, 68, 68, 0.3);
            animation: pulse 2s infinite;
        "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

// Funciones auxiliares para verificar fechas
const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const isYesterday = (date: Date): boolean => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
};

const isSameDate = (date1: Date, date2: Date): boolean => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
};

// Definir el componente MapModal
const MapModal: React.FC<{
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
            location: string;
            categorie?: string; // Para proyecto 28
            boxcode?: string; // Para proyecto 28
            boxtimestamp?: Date | null; // Para proyecto 28
        }>;
    };
    batteryCodes?: string[]; // Para proyecto 28 - códigos de batería para la barra lateral
    onClose: () => void;
}> = ({ project, units, batteryCodes = [], onClose }) => {
    // Para proyecto 28, usar filtros de categoría, para otros usar filtros de estado
    const isPanasonicProject = project.id === 28;
    
    const [filter, setFilter] = useState<'all' | 'ok' | 'pending' | 'failed' | 'a' | 'b' | 'c' | 'd' | 'e' | 'boxes'>('all');
    const [boxCodes, setBoxCodes] = useState<string[]>([]); // Para almacenar códigos de cajas
    
    // Función para cambiar el filtro y desactivar selección específica
    const handleFilterChange = (newFilter: 'all' | 'ok' | 'pending' | 'failed' | 'a' | 'b' | 'c' | 'd' | 'e' | 'boxes') => {
        setFilter(newFilter);
        setSelectedBatteryCode(null); // Desactivar selección específica al cambiar filtro
    };
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
    
    // Estado para la ubicación del usuario
    const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Cargar códigos de cajas cuando el componente se monte
    useEffect(() => {
        const loadBoxCodes = async () => {
            if (isPanasonicProject) {
                try {
                    const response = await fetch(`/api/panasonic-checkpoints/project/${project.id}`, {
                        headers: {
                            'Authorization': `Bearer ${getToken()}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const checkpoints = await response.json();
                        // Filtrar códigos que empiecen con 'BOX' y obtener códigos únicos
                        const uniqueBoxCodes: string[] = [];
                        const seenCodes = new Set<string>();
                        
                        checkpoints.forEach((checkpoint: any) => {
                            if (checkpoint.scanned_code && String(checkpoint.scanned_code).startsWith('BOX')) {
                                const code = String(checkpoint.scanned_code);
                                if (!seenCodes.has(code)) {
                                    seenCodes.add(code);
                                    uniqueBoxCodes.push(code);
                                }
                            }
                        });
                        
                        setBoxCodes(uniqueBoxCodes as string[]);
                        console.log('Códigos de cajas cargados:', uniqueBoxCodes);
                    }
                } catch (error) {
                    console.error('Error al cargar códigos de cajas:', error);
                }
            }
        };

        loadBoxCodes();
    }, [isPanasonicProject, project.id]);

    // Ordenar las posiciones por timestamp (más reciente primero) para la barra lateral
    const sortedPositions = [...units.positions].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Función para obtener la ubicación del usuario
    const getUserLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocalización no soportada por este navegador');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLocationError(null);
                notifications.show({
                    title: 'Ubicación obtenida',
                    message: 'Tu ubicación se ha agregado al mapa',
                    color: 'green'
                });
            },
            (error) => {
                let errorMessage = 'Error al obtener ubicación';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permisos de ubicación denegados';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Ubicación no disponible';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tiempo de espera agotado';
                        break;
                }
                setLocationError(errorMessage);
                notifications.show({
                    title: 'Error de ubicación',
                    message: errorMessage,
                    color: 'red'
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    // Funciones para manejar zoom y arrastre

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - imagePosition.x,
            y: e.clientY - imagePosition.y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setImagePosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setImageZoom(prev => Math.max(0.5, Math.min(5, prev * delta)));
    };

    // Funciones de exportación
    const getFilteredData = () => {
        return units.positions.filter(unit => {
            // Determinar si es una caja
            const isBox = unit.unitId?.startsWith('BOX');
            
            // Para proyecto Panasonic, manejar filtros especiales
            if (isPanasonicProject) {
                if (filter === 'boxes') {
                    // Solo mostrar cajas
                    const boxMatch = isBox;
                    const dateMatch = dateFilter === 'all' || 
                        (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                        (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                    const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                    return boxMatch && dateMatch && specificDateMatch &&
                        unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                        unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                } else if (filter === 'all') {
                    // Excluir cajas del filtro "todos"
                    const categoryMatch = !isBox;
            const dateMatch = dateFilter === 'all' || 
                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
            return categoryMatch && dateMatch && specificDateMatch &&
                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                } else if (filter === 'ok' || filter === 'failed') {
                    // Excluir cajas de los filtros de estado
                    const statusMatch = unit.status === filter && !isBox;
                    const dateMatch = dateFilter === 'all' || 
                        (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                        (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                    const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                    return statusMatch && dateMatch && specificDateMatch &&
                        unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                        unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                } else {
                    // Filtros de categoría (a, b, c, d, e) - excluir cajas
                    const categoryMatch = unit.categorie?.toLowerCase() === filter && !isBox;
                    const dateMatch = dateFilter === 'all' || 
                        (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                        (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                    const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                    return categoryMatch && dateMatch && specificDateMatch &&
                        unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                        unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                }
            } else {
                // Para otros proyectos, usar lógica original
                const categoryMatch = filter === 'all' || unit.status === filter;
                const dateMatch = dateFilter === 'all' || 
                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                return categoryMatch && dateMatch && specificDateMatch &&
                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
            }
        });
    };

    const exportToCSV = async () => {
        try {
            // Mostrar notificación de carga
            notifications.show({
                id: 'csv-generation',
                loading: true,
                title: 'Generando CSV',
                message: 'Obteniendo datos de panasonic_checkpoints...',
                autoClose: false,
                withCloseButton: false
            });

            let dataToExport;
            let csvContent;

            // Para proyecto 28, obtener datos de panasonic_checkpoints
            if (isPanasonicProject) {
                const response = await fetch(`/api/panasonic-checkpoints/project/${project.id}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener datos de panasonic_checkpoints');
                }

                const checkpoints = await response.json();
                
                // Aplicar filtros a los checkpoints
                const filteredCheckpoints = checkpoints.filter((checkpoint: any) => {
                    // Filtro por categoría
                    if (filter !== 'all' && filter !== 'boxes') {
                        if (filter === 'ok' || filter === 'failed') {
                            // Filtro por estado
                            if (checkpoint.status !== filter) return false;
                        } else {
                            // Filtro por categoría (a, b, c, d, e)
                            if (checkpoint.categorie?.toLowerCase() !== filter) return false;
                        }
                    }
                    
                    // Filtro por fecha
                    const checkpointDate = new Date(checkpoint.timestamp);
                    if (dateFilter === 'today' && !isToday(checkpointDate)) return false;
                    if (dateFilter === 'yesterday' && !isYesterday(checkpointDate)) return false;
                    if (selectedDate && !isSameDate(checkpointDate, selectedDate)) return false;
                    
                    // Filtro por código escaneado
                    if (vinFilter && !checkpoint.scanned_code?.toLowerCase().includes(vinFilter.toLowerCase())) return false;
                    
                    // Filtro por técnico
                    if (techFilter && !checkpoint.user?.full_name?.toLowerCase().includes(techFilter.toLowerCase())) return false;
                    
                    return true;
                });

                dataToExport = filteredCheckpoints;
                
                // Crear contenido CSV con todos los campos de panasonic_checkpoints
                csvContent = [
                    ['ID', 'Session ID', 'Tipo Checkpoint', 'Número Checkpoint', 'Código Escaneado', 'Orden Escaneo', 
                     'Latitud', 'Longitud', 'Precisión', 'Timestamp', 'Usuario ID', 'Nombre Usuario', 'Proyecto ID', 'Estado', 
                     'Categoría', 'Fase', 'Checkpoint 7 Storage Exit', 'Lat 7 Storage Exit', 'Lon 7 Storage Exit',
                     'Checkpoint 8 CD Arrival', 'Lat 8 CD Arrival', 'Lon 8 CD Arrival', 'Checkpoint 8 CDE Exit',
                     'Lat 8 CDE Exit', 'Lon 8 CDE Exit', 'Checkpoint 10 E Arrival', 'Lat 10 E Arrival', 'Lon 10 E Arrival',
                     'Checkpoint 11 E Arrival', 'Lat 11 E Arrival', 'Lon 11 E Arrival', 'Checkpoint 11 E Exit',
                     'Lat 11 E Exit', 'Lon 11 E Exit', 'Checkpoint AB Exit', 'Lat AB Exit', 'Lon AB Exit'],
                    ...dataToExport.map((checkpoint: any) => [
                        checkpoint.id,
                        checkpoint.session_id,
                        checkpoint.checkpoint_type,
                        checkpoint.checkpoint_number,
                        checkpoint.scanned_code,
                        checkpoint.scan_order || 'N/A',
                        checkpoint.latitude,
                        checkpoint.longitude,
                        checkpoint.accuracy || 'N/A',
                        new Date(checkpoint.timestamp).toLocaleString('es-ES'),
                        checkpoint.user_id,
                        checkpoint.user?.full_name || 'N/A',
                        checkpoint.project_id,
                        checkpoint.status,
                        checkpoint.categorie || 'N/A',
                        checkpoint.phase,
                        checkpoint.checkpoint_7_storage_exit || 'N/A',
                        checkpoint.lat_7_storage_exit || 'N/A',
                        checkpoint.lon_7_storage_exit || 'N/A',
                        checkpoint.checkpoint_8_cd_arrival || 'N/A',
                        checkpoint.lat_8_cd_arrival || 'N/A',
                        checkpoint.lon_8_cd_arrival || 'N/A',
                        checkpoint.checkpoint_8_cde_exit || 'N/A',
                        checkpoint.lat_8_cde_exit || 'N/A',
                        checkpoint.lon_8_cde_exit || 'N/A',
                        checkpoint.checkpoint_10_e_arrival || 'N/A',
                        checkpoint.lat_10_e_arrival || 'N/A',
                        checkpoint.lon_10_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_arrival || 'N/A',
                        checkpoint.lat_11_e_arrival || 'N/A',
                        checkpoint.lon_11_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_exit || 'N/A',
                        checkpoint.lat_11_e_exit || 'N/A',
                        checkpoint.lon_11_e_exit || 'N/A',
                        checkpoint.checkpoint_ab_exit || 'N/A',
                        checkpoint.lat_ab_exit || 'N/A',
                        checkpoint.lon_ab_exit || 'N/A'
                    ])
                ].map(row => row.map((cell: any) => `"${cell}"`).join(',')).join('\n');
            } else {
                // Para otros proyectos, obtener datos directamente de scanned_codes
                const response = await fetch(`/api/scanned-codes/project/${project.id}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener datos de scanned_codes');
                }

                const scannedCodes = await response.json();
                
                // Aplicar filtros a los scanned_codes
                const filteredScannedCodes = scannedCodes.filter((scannedCode: any) => {
                    // Filtro por estado
                    if (filter !== 'all' && filter !== 'boxes') {
                        if (filter === 'ok' || filter === 'failed') {
                            if (scannedCode.status !== filter) return false;
                        }
                    }
                    
                    // Filtro por fecha
                    const scannedDate = new Date(scannedCode.created_at);
                    if (dateFilter === 'today' && !isToday(scannedDate)) return false;
                    if (dateFilter === 'yesterday' && !isYesterday(scannedDate)) return false;
                    if (selectedDate && !isSameDate(scannedDate, selectedDate)) return false;
                    
                    // Filtro por código escaneado
                    if (vinFilter && !scannedCode.code?.toLowerCase().includes(vinFilter.toLowerCase())) return false;
                    
                    // Filtro por técnico
                    if (techFilter && !scannedCode.user?.full_name?.toLowerCase().includes(techFilter.toLowerCase())) return false;
                    
                    return true;
                });

                dataToExport = filteredScannedCodes;
                
                // Crear contenido CSV con todos los campos de scanned_codes
                csvContent = [
                    ['ID', 'Código', 'Estado', 'Latitud', 'Longitud', 'Timestamp', 'Proyecto ID', 'Técnico', 'Coordenadas'],
                    ...dataToExport.map((scannedCode: any) => [
                        scannedCode.id,
                        scannedCode.code,
                        scannedCode.status || 'N/A',
                        scannedCode.latitude || 'N/A',
                        scannedCode.longitude || 'N/A',
                        new Date(scannedCode.created_at).toLocaleString('es-ES'),
                        scannedCode.project_id || 'N/A',
                        scannedCode.user?.full_name || scannedCode.technician || 'Sin técnico',
                        scannedCode.latitude && scannedCode.longitude ? 
                            `${scannedCode.latitude}, ${scannedCode.longitude}` : 'Sin coordenadas'
            ])
                ].map(row => row.map((cell: any) => `"${cell}"`).join(',')).join('\n');
            }
        
            // Crear blob y descargar automáticamente
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${isPanasonicProject ? 'Panasonic_Checkpoints' : 'Scanned_Codes'}_${project.name}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
                URL.revokeObjectURL(url);
        
            // Cerrar notificación de carga y mostrar éxito
            notifications.hide('csv-generation');
        notifications.show({
                title: 'CSV generado exitosamente',
                message: `Se descargó el archivo con ${dataToExport.length} registros de ${isPanasonicProject ? 'panasonic_checkpoints' : 'scanned_codes'}`,
            color: 'green'
        });
            
        } catch (error) {
            console.error('Error al generar CSV:', error);
            notifications.hide('csv-generation');
            notifications.show({
                title: 'Error al generar CSV',
                message: 'No se pudo generar el archivo CSV. Inténtalo de nuevo.',
                color: 'red'
            });
        }
    };

    const exportToExcel = async () => {
        try {
            // Mostrar notificación de carga
            notifications.show({
                id: 'excel-generation',
                loading: true,
                title: 'Generando Excel',
                message: 'Obteniendo datos de panasonic_checkpoints...',
                autoClose: false,
                withCloseButton: false
            });

            let dataToExport;
            let excelContent;

            // Para proyecto 28, obtener datos de panasonic_checkpoints
            if (isPanasonicProject) {
                const response = await fetch(`/api/panasonic-checkpoints/project/${project.id}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener datos de panasonic_checkpoints');
                }

                const checkpoints = await response.json();
                
                // Aplicar filtros a los checkpoints
                const filteredCheckpoints = checkpoints.filter((checkpoint: any) => {
                    // Filtro por categoría
                    if (filter !== 'all' && filter !== 'boxes') {
                        if (filter === 'ok' || filter === 'failed') {
                            // Filtro por estado
                            if (checkpoint.status !== filter) return false;
                        } else {
                            // Filtro por categoría (a, b, c, d, e)
                            if (checkpoint.categorie?.toLowerCase() !== filter) return false;
                        }
                    }
                    
                    // Filtro por fecha
                    const checkpointDate = new Date(checkpoint.timestamp);
                    if (dateFilter === 'today' && !isToday(checkpointDate)) return false;
                    if (dateFilter === 'yesterday' && !isYesterday(checkpointDate)) return false;
                    if (selectedDate && !isSameDate(checkpointDate, selectedDate)) return false;
                    
                    // Filtro por código escaneado
                    if (vinFilter && !checkpoint.scanned_code?.toLowerCase().includes(vinFilter.toLowerCase())) return false;
                    
                    // Filtro por técnico (necesitamos obtener el nombre del usuario)
                    if (techFilter && !checkpoint.user?.full_name?.toLowerCase().includes(techFilter.toLowerCase())) return false;
                    
                    return true;
                });

                dataToExport = filteredCheckpoints;
                
                // Crear contenido Excel con todos los campos de panasonic_checkpoints
                excelContent = [
                    ['ID', 'Session ID', 'Tipo Checkpoint', 'Número Checkpoint', 'Código Escaneado', 'Orden Escaneo', 
                     'Latitud', 'Longitud', 'Precisión', 'Timestamp', 'Usuario ID', 'Proyecto ID', 'Estado', 
                     'Categoría', 'Fase', 'Checkpoint 7 Storage Exit', 'Lat 7 Storage Exit', 'Lon 7 Storage Exit',
                     'Checkpoint 8 CD Arrival', 'Lat 8 CD Arrival', 'Lon 8 CD Arrival', 'Checkpoint 8 CDE Exit',
                     'Lat 8 CDE Exit', 'Lon 8 CDE Exit', 'Checkpoint 10 E Arrival', 'Lat 10 E Arrival', 'Lon 10 E Arrival',
                     'Checkpoint 11 E Arrival', 'Lat 11 E Arrival', 'Lon 11 E Arrival', 'Checkpoint 11 E Exit',
                     'Lat 11 E Exit', 'Lon 11 E Exit', 'Checkpoint AB Exit', 'Lat AB Exit', 'Lon AB Exit'],
                    ...dataToExport.map((checkpoint: any) => [
                        checkpoint.id,
                        checkpoint.session_id,
                        checkpoint.checkpoint_type,
                        checkpoint.checkpoint_number,
                        checkpoint.scanned_code,
                        checkpoint.scan_order || 'N/A',
                        checkpoint.latitude,
                        checkpoint.longitude,
                        checkpoint.accuracy || 'N/A',
                        new Date(checkpoint.timestamp).toLocaleString('es-ES'),
                        checkpoint.user_id,
                        checkpoint.project_id,
                        checkpoint.status,
                        checkpoint.categorie || 'N/A',
                        checkpoint.phase,
                        checkpoint.checkpoint_7_storage_exit || 'N/A',
                        checkpoint.lat_7_storage_exit || 'N/A',
                        checkpoint.lon_7_storage_exit || 'N/A',
                        checkpoint.checkpoint_8_cd_arrival || 'N/A',
                        checkpoint.lat_8_cd_arrival || 'N/A',
                        checkpoint.lon_8_cd_arrival || 'N/A',
                        checkpoint.checkpoint_8_cde_exit || 'N/A',
                        checkpoint.lat_8_cde_exit || 'N/A',
                        checkpoint.lon_8_cde_exit || 'N/A',
                        checkpoint.checkpoint_10_e_arrival || 'N/A',
                        checkpoint.lat_10_e_arrival || 'N/A',
                        checkpoint.lon_10_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_arrival || 'N/A',
                        checkpoint.lat_11_e_arrival || 'N/A',
                        checkpoint.lon_11_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_exit || 'N/A',
                        checkpoint.lat_11_e_exit || 'N/A',
                        checkpoint.lon_11_e_exit || 'N/A',
                        checkpoint.checkpoint_ab_exit || 'N/A',
                        checkpoint.lat_ab_exit || 'N/A',
                        checkpoint.lon_ab_exit || 'N/A'
                    ])
                ];
            } else {
                // Para otros proyectos, obtener datos directamente de scanned_codes
                const response = await fetch(`/api/scanned-codes/project/${project.id}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener datos de scanned_codes');
                }

                const scannedCodes = await response.json();
                
                // Aplicar filtros a los scanned_codes
                const filteredScannedCodes = scannedCodes.filter((scannedCode: any) => {
                    // Filtro por estado
                    if (filter !== 'all' && filter !== 'boxes') {
                        if (filter === 'ok' || filter === 'failed') {
                            if (scannedCode.status !== filter) return false;
                        }
                    }
                    
                    // Filtro por fecha
                    const scannedDate = new Date(scannedCode.created_at);
                    if (dateFilter === 'today' && !isToday(scannedDate)) return false;
                    if (dateFilter === 'yesterday' && !isYesterday(scannedDate)) return false;
                    if (selectedDate && !isSameDate(scannedDate, selectedDate)) return false;
                    
                    // Filtro por código escaneado
                    if (vinFilter && !scannedCode.code?.toLowerCase().includes(vinFilter.toLowerCase())) return false;
                    
                    // Filtro por técnico
                    if (techFilter && !scannedCode.user?.full_name?.toLowerCase().includes(techFilter.toLowerCase())) return false;
                    
                    return true;
                });

                dataToExport = filteredScannedCodes;
                
                // Crear contenido Excel con todos los campos de scanned_codes
                excelContent = [
                    ['ID', 'Código', 'Estado', 'Latitud', 'Longitud', 'Timestamp', 'Proyecto ID', 'Técnico', 'Coordenadas'],
                    ...dataToExport.map((scannedCode: any) => [
                        scannedCode.id,
                        scannedCode.code,
                        scannedCode.status || 'N/A',
                        scannedCode.latitude || 'N/A',
                        scannedCode.longitude || 'N/A',
                        new Date(scannedCode.created_at).toLocaleString('es-ES'),
                        scannedCode.project_id || 'N/A',
                        scannedCode.user?.full_name || scannedCode.technician || 'Sin técnico',
                        scannedCode.latitude && scannedCode.longitude ? 
                            `${scannedCode.latitude}, ${scannedCode.longitude}` : 'Sin coordenadas'
            ])
        ];
            }
        
        // Crear libro de trabajo de Excel usando XLSX
        const workbook = XLSX.utils.book_new();
        
        // Crear hoja de trabajo
        const worksheet = XLSX.utils.aoa_to_sheet(excelContent);
        
        // Agregar hipervínculos a Google Maps para la columna de coordenadas
        if (!isPanasonicProject && dataToExport.length > 0) {
            // La columna de coordenadas es la columna I (índice 8)
            const coordColumnIndex = 8;
            const startRow = 2; // Empezar desde la fila 2 (después del header)
            
            dataToExport.forEach((scannedCode: any, index: number) => {
                if (scannedCode.latitude && scannedCode.longitude) {
                    const rowIndex = startRow + index;
                    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: coordColumnIndex });
                    const googleMapsUrl = `https://www.google.com/maps?q=${scannedCode.latitude},${scannedCode.longitude}`;
                    
                    // Crear hipervínculo con estilo azul
                    if (!worksheet[cellAddress]) {
                        worksheet[cellAddress] = { v: '', t: 's' };
                    }
                    worksheet[cellAddress].l = { Target: googleMapsUrl, Tooltip: `Ver en Google Maps: ${scannedCode.latitude}, ${scannedCode.longitude}` };
                    
                    // Aplicar estilo azul para indicar que es clickeable
                    worksheet[cellAddress].s = {
                        font: { color: { rgb: "0000FF" }, underline: true },
                        alignment: { horizontal: "center" }
                    };
                }
            });
        }
        
        // Agregar información del reporte en celdas adicionales
        const reportInfo = [
            [`Reporte de ${project.name}`],
            [`Fecha de generación: ${new Date().toLocaleString('es-ES')}`],
            [`Total de registros: ${dataToExport.length}`],
            [isPanasonicProject ? 'Fuente de datos: Tabla panasonic_checkpoints' : 'Fuente de datos: Tabla scanned_codes'],
            [''], // Línea en blanco
        ];
        
        // Insertar información del reporte al inicio
        XLSX.utils.sheet_add_aoa(worksheet, reportInfo, { origin: 'A1' });
        
        // Ajustar el ancho de las columnas
        const colWidths = excelContent[0].map((header: string) => ({ wch: Math.max(header.length, 15) }));
        worksheet['!cols'] = colWidths;
        
        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
        
        // Generar archivo Excel
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        
        // Crear blob y descargar
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${isPanasonicProject ? 'Panasonic_Checkpoints' : 'Scanned_Codes'}_${project.name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
            // Cerrar notificación de carga y mostrar éxito
            notifications.hide('excel-generation');
        notifications.show({
                title: 'Excel generado exitosamente',
                message: `Se descargó el archivo con ${dataToExport.length} registros de ${isPanasonicProject ? 'panasonic_checkpoints' : 'scanned_codes'}`,
            color: 'green'
        });
            
        } catch (error) {
            console.error('Error al generar Excel:', error);
            notifications.hide('excel-generation');
            notifications.show({
                title: 'Error al generar Excel',
                message: 'No se pudo generar el archivo Excel. Inténtalo de nuevo.',
                color: 'red'
            });
        }
    };

    const exportToPDF = async () => {
        try {
            // Mostrar notificación de carga
            notifications.show({
                id: 'pdf-generation',
                loading: true,
                title: 'Generando PDF',
                message: 'Creando reporte en formato PDF...',
                autoClose: false,
                withCloseButton: false
            });

            // Redirigir a ReportePDF.tsx con el ID del proyecto
            const reportUrl = `/reporte-pdf?projectId=${project.id}`;
            window.open(reportUrl, '_blank');

            // Actualizar notificación
            notifications.update({
                id: 'pdf-generation',
                title: 'Redirigiendo al reporte',
                message: 'Se abrió una nueva ventana con el reporte del proyecto',
                color: 'blue',
                autoClose: 3000
            });

        } catch (error) {
            console.error('Error generando PDF:', error);
            notifications.update({
                id: 'pdf-generation',
                title: 'Error al generar PDF',
                message: 'Ocurrió un error al abrir el reporte',
                color: 'red',
                autoClose: 5000
            });
        }
    };

    // Función para compartir PDF usando la API nativa de compartir
    const sharePDF = async () => {
        try {
            // Verificar si el navegador soporta la Web Share API
            if (!navigator.share) {
                // Fallback: abrir en nueva ventana
                const reportUrl = `/reporte-pdf?projectId=${project.id}`;
                window.open(reportUrl, '_blank');
                return;
            }

            // Mostrar notificación de carga
            notifications.show({
                id: 'pdf-share',
                loading: true,
                title: 'Preparando PDF para compartir',
                message: 'Generando archivo PDF...',
                autoClose: false,
                withCloseButton: false
            });

            // Generar el PDF usando la misma lógica que exportToPDF
            const reportUrl = `/reporte-pdf?projectId=${project.id}`;
            
            // Crear un blob del PDF (simulando la descarga)
            const response = await fetch(reportUrl);
            const blob = await response.blob();
            
            // Crear archivo para compartir
            const file = new File([blob], `proyecto_${project.name}_${new Date().toISOString().split('T')[0]}.pdf`, {
                type: 'application/pdf'
            });

            // Compartir usando la API nativa
            await navigator.share({
                title: `Proyecto ${project.name} - Reporte PDF`,
                text: `Reporte del proyecto ${project.name}`,
                files: [file]
            });

            // Cerrar notificación de carga
            notifications.hide('pdf-share');
            
            notifications.show({
                title: 'PDF compartido exitosamente',
                message: 'El archivo PDF se ha compartido usando la ventana nativa del dispositivo',
                color: 'green'
            });

        } catch (error) {
            console.error('Error compartiendo PDF:', error);
            notifications.hide('pdf-share');
            
            // Si el usuario cancela la acción de compartir, no mostrar error
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            
            // Fallback: abrir en nueva ventana
            const reportUrl = `/reporte-pdf?projectId=${project.id}`;
            window.open(reportUrl, '_blank');
            
            notifications.show({
                title: 'Abriendo PDF en nueva ventana',
                message: 'No se pudo usar la función de compartir nativa, se abrió en nueva ventana',
                color: 'blue'
            });
        }
    };

    // Función para compartir Excel usando la API nativa de compartir
    const shareExcel = async () => {
        try {
            // Verificar si el navegador soporta la Web Share API
            if (!navigator.share) {
                // Fallback: usar la función de exportación normal
                exportToExcel();
                return;
            }

            // Mostrar notificación de carga
            notifications.show({
                id: 'excel-share',
                loading: true,
                title: 'Preparando Excel para compartir',
                message: 'Generando archivo Excel...',
                autoClose: false,
                withCloseButton: false
            });

            // Usar la misma lógica que exportToExcel para generar el archivo
            let dataToExport;
            let excelContent;

            // Para proyecto 28, obtener datos de panasonic_checkpoints
            if (isPanasonicProject) {
                const response = await fetch(`/api/panasonic-checkpoints/project/${project.id}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener datos de panasonic_checkpoints');
                }

                const checkpoints = await response.json();
                
                // Aplicar filtros a los checkpoints
                const filteredCheckpoints = checkpoints.filter((checkpoint: any) => {
                    // Filtro por categoría
                    if (filter !== 'all' && filter !== 'boxes') {
                        if (filter === 'ok' || filter === 'failed') {
                            // Filtro por estado
                            if (checkpoint.status !== filter) return false;
                        } else {
                            // Filtro por categoría (a, b, c, d, e)
                            if (checkpoint.categorie?.toLowerCase() !== filter) return false;
                        }
                    }
                    
                    // Filtro por fecha
                    const checkpointDate = new Date(checkpoint.timestamp);
                    if (dateFilter === 'today' && !isToday(checkpointDate)) return false;
                    if (dateFilter === 'yesterday' && !isYesterday(checkpointDate)) return false;
                    if (selectedDate && !isSameDate(checkpointDate, selectedDate)) return false;
                    
                    // Filtro por código escaneado
                    if (vinFilter && !checkpoint.scanned_code?.toLowerCase().includes(vinFilter.toLowerCase())) return false;
                    
                    // Filtro por técnico (necesitamos obtener el nombre del usuario)
                    if (techFilter && !checkpoint.user?.full_name?.toLowerCase().includes(techFilter.toLowerCase())) return false;
                    
                    return true;
                });

                dataToExport = filteredCheckpoints;
                
                // Crear contenido Excel con todos los campos de panasonic_checkpoints
                excelContent = [
                    ['ID', 'Session ID', 'Tipo Checkpoint', 'Número Checkpoint', 'Código Escaneado', 'Orden Escaneo', 
                     'Latitud', 'Longitud', 'Precisión', 'Timestamp', 'Usuario ID', 'Proyecto ID', 'Estado', 
                     'Categoría', 'Fase', 'Checkpoint 7 Storage Exit', 'Lat 7 Storage Exit', 'Lon 7 Storage Exit',
                     'Checkpoint 8 CD Arrival', 'Lat 8 CD Arrival', 'Lon 8 CD Arrival', 'Checkpoint 8 CDE Exit',
                     'Lat 8 CDE Exit', 'Lon 8 CDE Exit', 'Checkpoint 10 E Arrival', 'Lat 10 E Arrival', 'Lon 10 E Arrival',
                     'Checkpoint 11 E Arrival', 'Lat 11 E Arrival', 'Lon 11 E Arrival', 'Checkpoint 11 E Exit',
                     'Lat 11 E Exit', 'Lon 11 E Exit', 'Checkpoint AB Exit', 'Lat AB Exit', 'Lon AB Exit'],
                    ...dataToExport.map((checkpoint: any) => [
                        checkpoint.id,
                        checkpoint.session_id,
                        checkpoint.checkpoint_type,
                        checkpoint.checkpoint_number,
                        checkpoint.scanned_code,
                        checkpoint.scan_order || 'N/A',
                        checkpoint.latitude,
                        checkpoint.longitude,
                        checkpoint.accuracy || 'N/A',
                        new Date(checkpoint.timestamp).toLocaleString('es-ES'),
                        checkpoint.user_id,
                        checkpoint.project_id,
                        checkpoint.status,
                        checkpoint.categorie || 'N/A',
                        checkpoint.phase,
                        checkpoint.checkpoint_7_storage_exit || 'N/A',
                        checkpoint.lat_7_storage_exit || 'N/A',
                        checkpoint.lon_7_storage_exit || 'N/A',
                        checkpoint.checkpoint_8_cd_arrival || 'N/A',
                        checkpoint.lat_8_cd_arrival || 'N/A',
                        checkpoint.lon_8_cd_arrival || 'N/A',
                        checkpoint.checkpoint_8_cde_exit || 'N/A',
                        checkpoint.lat_8_cde_exit || 'N/A',
                        checkpoint.lon_8_cde_exit || 'N/A',
                        checkpoint.checkpoint_10_e_arrival || 'N/A',
                        checkpoint.lat_10_e_arrival || 'N/A',
                        checkpoint.lon_10_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_arrival || 'N/A',
                        checkpoint.lat_11_e_arrival || 'N/A',
                        checkpoint.lon_11_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_exit || 'N/A',
                        checkpoint.lat_11_e_exit || 'N/A',
                        checkpoint.lon_11_e_exit || 'N/A',
                        checkpoint.checkpoint_ab_exit || 'N/A',
                        checkpoint.lat_ab_exit || 'N/A',
                        checkpoint.lon_ab_exit || 'N/A'
                    ])
                ];
            } else {
                // Para otros proyectos, usar la lógica original
                dataToExport = getFilteredData();
                excelContent = [
                    ['Código', 'Tipo', 'Estado', 'Categoría', 'Timestamp', 'Técnico', 'Ubicación', 'Latitud', 'Longitud'],
                    ...dataToExport.map(unit => [
                        unit.unitId,
                        unit.unitId?.startsWith('BAT') ? 'Batería' : 'Caja',
                        unit.status,
                        unit.categorie || 'N/A',
                        new Date(unit.timestamp).toLocaleString('es-ES'),
                        unit.technician,
                        unit.location,
                        unit.position.lat,
                        unit.position.lng
                    ])
                ];
            }

            // Crear libro de trabajo de Excel usando XLSX
            const workbook = XLSX.utils.book_new();
            
            // Crear hoja de trabajo
            const worksheet = XLSX.utils.aoa_to_sheet(excelContent);
            
            // Agregar información del reporte en celdas adicionales
            const reportInfo = [
                ['Reporte de Proyecto'],
                [`Proyecto: ${project.name}`],
                [`Fecha de generación: ${new Date().toLocaleString('es-ES')}`],
                [`Total de registros: ${dataToExport.length}`],
                ['']
            ];
            
            XLSX.utils.sheet_add_aoa(worksheet, reportInfo, { origin: 'A1' });
            
            // Ajustar el ancho de las columnas
            const colWidths = excelContent[0].map((header: string) => ({ wch: Math.max(header.length, 15) }));
            worksheet['!cols'] = colWidths;
            
            // Agregar la hoja al libro
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
            
            // Generar archivo Excel
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            
            // Crear blob
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // Crear archivo para compartir
            const file = new File([blob], `proyecto_${project.name}_${new Date().toISOString().split('T')[0]}.xlsx`, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Compartir usando la API nativa
            await navigator.share({
                title: `Proyecto ${project.name} - Reporte Excel`,
                text: `Reporte del proyecto ${project.name} con ${dataToExport.length} registros`,
                files: [file]
            });

            // Cerrar notificación de carga
            notifications.hide('excel-share');
            
            notifications.show({
                title: 'Excel compartido exitosamente',
                message: 'El archivo Excel se ha compartido usando la ventana nativa del dispositivo',
                color: 'green'
            });

        } catch (error) {
            console.error('Error compartiendo Excel:', error);
            notifications.hide('excel-share');
            
            // Si el usuario cancela la acción de compartir, no mostrar error
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            
            // Fallback: usar la función de exportación normal
            exportToExcel();
            
            notifications.show({
                title: 'Descargando Excel',
                message: 'No se pudo usar la función de compartir nativa, se descargó el archivo',
                color: 'blue'
            });
        }
    };

    const exportAllAsZIP = async () => {
        try {
            // Mostrar notificación de carga
            notifications.show({
                id: 'zip-generation',
                loading: true,
                title: 'Generando archivos ZIP',
                message: 'Creando PDF, Excel y CSV...',
                autoClose: false,
                withCloseButton: false
            });

            const zip = new JSZip();
            let dataToExport;
            let csvContent;
            let excelContent;

            // Para proyecto 28, obtener datos de panasonic_checkpoints
            if (isPanasonicProject) {
                const response = await fetch(`/api/panasonic-checkpoints/project/${project.id}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener datos de panasonic_checkpoints');
                }

                const checkpoints = await response.json();
                
                // Aplicar filtros a los checkpoints
                const filteredCheckpoints = checkpoints.filter((checkpoint: any) => {
                    // Filtro por categoría
                    if (filter !== 'all' && filter !== 'boxes') {
                        if (filter === 'ok' || filter === 'failed') {
                            // Filtro por estado
                            if (checkpoint.status !== filter) return false;
                        } else {
                            // Filtro por categoría (a, b, c, d, e)
                            if (checkpoint.categorie?.toLowerCase() !== filter) return false;
                        }
                    }
                    
                    // Filtro por fecha
                    const checkpointDate = new Date(checkpoint.timestamp);
                    if (dateFilter === 'today' && !isToday(checkpointDate)) return false;
                    if (dateFilter === 'yesterday' && !isYesterday(checkpointDate)) return false;
                    if (selectedDate && !isSameDate(checkpointDate, selectedDate)) return false;
                    
                    // Filtro por código escaneado
                    if (vinFilter && !checkpoint.scanned_code?.toLowerCase().includes(vinFilter.toLowerCase())) return false;
                    
                    // Filtro por técnico
                    if (techFilter && !checkpoint.user?.full_name?.toLowerCase().includes(techFilter.toLowerCase())) return false;
                    
                    return true;
                });

                dataToExport = filteredCheckpoints;
                
                // Crear contenido CSV con todos los campos de panasonic_checkpoints
                csvContent = [
                    ['ID', 'Session ID', 'Tipo Checkpoint', 'Número Checkpoint', 'Código Escaneado', 'Orden Escaneo', 
                     'Latitud', 'Longitud', 'Precisión', 'Timestamp', 'Usuario ID', 'Nombre Usuario', 'Proyecto ID', 'Estado', 
                     'Categoría', 'Fase', 'Checkpoint 7 Storage Exit', 'Lat 7 Storage Exit', 'Lon 7 Storage Exit',
                     'Checkpoint 8 CD Arrival', 'Lat 8 CD Arrival', 'Lon 8 CD Arrival', 'Checkpoint 8 CDE Exit',
                     'Lat 8 CDE Exit', 'Lon 8 CDE Exit', 'Checkpoint 10 E Arrival', 'Lat 10 E Arrival', 'Lon 10 E Arrival',
                     'Checkpoint 11 E Arrival', 'Lat 11 E Arrival', 'Lon 11 E Arrival', 'Checkpoint 11 E Exit',
                     'Lat 11 E Exit', 'Lon 11 E Exit', 'Checkpoint AB Exit', 'Lat AB Exit', 'Lon AB Exit'],
                    ...dataToExport.map((checkpoint: any) => [
                        checkpoint.id,
                        checkpoint.session_id,
                        checkpoint.checkpoint_type,
                        checkpoint.checkpoint_number,
                        checkpoint.scanned_code,
                        checkpoint.scan_order || 'N/A',
                        checkpoint.latitude,
                        checkpoint.longitude,
                        checkpoint.accuracy || 'N/A',
                        new Date(checkpoint.timestamp).toLocaleString('es-ES'),
                        checkpoint.user_id,
                        checkpoint.user?.full_name || 'N/A',
                        checkpoint.project_id,
                        checkpoint.status,
                        checkpoint.categorie || 'N/A',
                        checkpoint.phase,
                        checkpoint.checkpoint_7_storage_exit || 'N/A',
                        checkpoint.lat_7_storage_exit || 'N/A',
                        checkpoint.lon_7_storage_exit || 'N/A',
                        checkpoint.checkpoint_8_cd_arrival || 'N/A',
                        checkpoint.lat_8_cd_arrival || 'N/A',
                        checkpoint.lon_8_cd_arrival || 'N/A',
                        checkpoint.checkpoint_8_cde_exit || 'N/A',
                        checkpoint.lat_8_cde_exit || 'N/A',
                        checkpoint.lon_8_cde_exit || 'N/A',
                        checkpoint.checkpoint_10_e_arrival || 'N/A',
                        checkpoint.lat_10_e_arrival || 'N/A',
                        checkpoint.lon_10_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_arrival || 'N/A',
                        checkpoint.lat_11_e_arrival || 'N/A',
                        checkpoint.lon_11_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_exit || 'N/A',
                        checkpoint.lat_11_e_exit || 'N/A',
                        checkpoint.lon_11_e_exit || 'N/A',
                        checkpoint.checkpoint_ab_exit || 'N/A',
                        checkpoint.lat_ab_exit || 'N/A',
                        checkpoint.lon_ab_exit || 'N/A'
                    ])
                ].map(row => row.map((cell: any) => `"${cell}"`).join(',')).join('\n');

                // Crear contenido Excel con todos los campos de panasonic_checkpoints
                excelContent = [
                    ['ID', 'Session ID', 'Tipo Checkpoint', 'Número Checkpoint', 'Código Escaneado', 'Orden Escaneo', 
                     'Latitud', 'Longitud', 'Precisión', 'Timestamp', 'Usuario ID', 'Proyecto ID', 'Estado', 
                     'Categoría', 'Fase', 'Checkpoint 7 Storage Exit', 'Lat 7 Storage Exit', 'Lon 7 Storage Exit',
                     'Checkpoint 8 CD Arrival', 'Lat 8 CD Arrival', 'Lon 8 CD Arrival', 'Checkpoint 8 CDE Exit',
                     'Lat 8 CDE Exit', 'Lon 8 CDE Exit', 'Checkpoint 10 E Arrival', 'Lat 10 E Arrival', 'Lon 10 E Arrival',
                     'Checkpoint 11 E Arrival', 'Lat 11 E Arrival', 'Lon 11 E Arrival', 'Checkpoint 11 E Exit',
                     'Lat 11 E Exit', 'Lon 11 E Exit', 'Checkpoint AB Exit', 'Lat AB Exit', 'Lon AB Exit'],
                    ...dataToExport.map((checkpoint: any) => [
                        checkpoint.id,
                        checkpoint.session_id,
                        checkpoint.checkpoint_type,
                        checkpoint.checkpoint_number,
                        checkpoint.scanned_code,
                        checkpoint.scan_order || 'N/A',
                        checkpoint.latitude,
                        checkpoint.longitude,
                        checkpoint.accuracy || 'N/A',
                        new Date(checkpoint.timestamp).toLocaleString('es-ES'),
                        checkpoint.user_id,
                        checkpoint.project_id,
                        checkpoint.status,
                        checkpoint.categorie || 'N/A',
                        checkpoint.phase,
                        checkpoint.checkpoint_7_storage_exit || 'N/A',
                        checkpoint.lat_7_storage_exit || 'N/A',
                        checkpoint.lon_7_storage_exit || 'N/A',
                        checkpoint.checkpoint_8_cd_arrival || 'N/A',
                        checkpoint.lat_8_cd_arrival || 'N/A',
                        checkpoint.lon_8_cd_arrival || 'N/A',
                        checkpoint.checkpoint_8_cde_exit || 'N/A',
                        checkpoint.lat_8_cde_exit || 'N/A',
                        checkpoint.lon_8_cde_exit || 'N/A',
                        checkpoint.checkpoint_10_e_arrival || 'N/A',
                        checkpoint.lat_10_e_arrival || 'N/A',
                        checkpoint.lon_10_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_arrival || 'N/A',
                        checkpoint.lat_11_e_arrival || 'N/A',
                        checkpoint.lon_11_e_arrival || 'N/A',
                        checkpoint.checkpoint_11_e_exit || 'N/A',
                        checkpoint.lat_11_e_exit || 'N/A',
                        checkpoint.lon_11_e_exit || 'N/A',
                        checkpoint.checkpoint_ab_exit || 'N/A',
                        checkpoint.lat_ab_exit || 'N/A',
                        checkpoint.lon_ab_exit || 'N/A'
                    ])
                ];
            } else {
                // Para otros proyectos, obtener datos directamente de scanned_codes
                const response = await fetch(`/api/scanned-codes/project/${project.id}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener datos de scanned_codes');
                }

                const scannedCodes = await response.json();
                
                // Aplicar filtros a los scanned_codes
                const filteredScannedCodes = scannedCodes.filter((scannedCode: any) => {
                    // Filtro por estado
                    if (filter !== 'all' && filter !== 'boxes') {
                        if (filter === 'ok' || filter === 'failed') {
                            if (scannedCode.status !== filter) return false;
                        }
                    }
                    
                    // Filtro por fecha
                    const scannedDate = new Date(scannedCode.created_at);
                    if (dateFilter === 'today' && !isToday(scannedDate)) return false;
                    if (dateFilter === 'yesterday' && !isYesterday(scannedDate)) return false;
                    if (selectedDate && !isSameDate(scannedDate, selectedDate)) return false;
                    
                    // Filtro por código escaneado
                    if (vinFilter && !scannedCode.code?.toLowerCase().includes(vinFilter.toLowerCase())) return false;
                    
                    // Filtro por técnico
                    if (techFilter && !scannedCode.user?.full_name?.toLowerCase().includes(techFilter.toLowerCase())) return false;
                    
                    return true;
                });

                dataToExport = filteredScannedCodes;
                
                // Crear contenido CSV con todos los campos de scanned_codes
                csvContent = [
                    ['ID', 'Código', 'Estado', 'Latitud', 'Longitud', 'Timestamp', 'Proyecto ID', 'Técnico', 'Coordenadas'],
                    ...dataToExport.map((scannedCode: any) => [
                        scannedCode.id,
                        scannedCode.code,
                        scannedCode.status || 'N/A',
                        scannedCode.latitude || 'N/A',
                        scannedCode.longitude || 'N/A',
                        new Date(scannedCode.created_at).toLocaleString('es-ES'),
                        scannedCode.project_id || 'N/A',
                        scannedCode.user?.full_name || scannedCode.technician || 'Sin técnico',
                        scannedCode.latitude && scannedCode.longitude ? 
                            `${scannedCode.latitude}, ${scannedCode.longitude}` : 'Sin coordenadas'
            ])
                ].map(row => row.map((cell: any) => `"${cell}"`).join(',')).join('\n');
        
                // Crear contenido Excel con todos los campos de scanned_codes
                excelContent = [
                    ['ID', 'Código', 'Estado', 'Latitud', 'Longitud', 'Timestamp', 'Proyecto ID', 'Técnico', 'Coordenadas'],
                    ...dataToExport.map((scannedCode: any) => [
                        scannedCode.id,
                        scannedCode.code,
                        scannedCode.status || 'N/A',
                        scannedCode.latitude || 'N/A',
                        scannedCode.longitude || 'N/A',
                        new Date(scannedCode.created_at).toLocaleString('es-ES'),
                        scannedCode.project_id || 'N/A',
                        scannedCode.user?.full_name || scannedCode.technician || 'Sin técnico',
                        scannedCode.latitude && scannedCode.longitude ? 
                            `${scannedCode.latitude}, ${scannedCode.longitude}` : 'Sin coordenadas'
            ])
        ];
            }
        
            // Crear archivo Excel real usando XLSX
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(excelContent);
            
            // Agregar información del reporte
            const reportInfo = [
                [`Reporte de ${project.name}`],
                [`Fecha de generación: ${new Date().toLocaleString('es-ES')}`],
                [`Total de registros: ${dataToExport.length}`],
                [isPanasonicProject ? 'Fuente de datos: Tabla panasonic_checkpoints' : 'Fuente de datos: Tabla scanned_codes'],
                [''], // Línea en blanco
            ];
            
            XLSX.utils.sheet_add_aoa(worksheet, reportInfo, { origin: 'A1' });
            
            // Ajustar ancho de columnas
            const colWidths = excelContent[0].map((header: string) => ({ wch: Math.max(header.length, 15) }));
            worksheet['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
            
            // Generar buffer de Excel
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        
            // Agregar archivos al ZIP
            zip.file(`${isPanasonicProject ? 'Panasonic_Checkpoints' : 'Scanned_Codes'}_${project.name}_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
            zip.file(`${isPanasonicProject ? 'Panasonic_Checkpoints' : 'Scanned_Codes'}_${project.name}_${new Date().toISOString().slice(0, 10)}.xlsx`, excelBuffer);

            // Generar PDF y agregarlo al ZIP
            try {
                // Redirigir a ReportePDF.tsx para generar el PDF
                const reportUrl = `/reporte-pdf?projectId=${project.id}`;
                const reportWindow = window.open(reportUrl, '_blank');
                
                if (reportWindow) {
                    // Esperar un poco para que se genere el PDF
                    setTimeout(async () => {
                        try {
                            // Intentar obtener el PDF generado (esto requeriría una implementación adicional)
                            // Por ahora, agregamos un archivo de texto con la información del PDF
                            const pdfInfo = `
                                REPORTE PDF - ${project.name}
                                ================================
                                
                                Total de registros: ${dataToExport.length}
                                Fecha de exportación: ${new Date().toLocaleString('es-ES')}
                                Fuente de datos: ${isPanasonicProject ? 'Tabla panasonic_checkpoints' : 'Tabla scanned_codes'}
                                
                                Para generar el PDF completo, visite:
                                ${window.location.origin}${reportUrl}
                            `;
                            zip.file(`Informacion_PDF_${project.name}_${new Date().toISOString().slice(0, 10)}.txt`, pdfInfo);
                            
                            // Generar y descargar el ZIP
                            const zipBlob = await zip.generateAsync({ type: 'blob' });
                            const url = URL.createObjectURL(zipBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${isPanasonicProject ? 'Panasonic_Checkpoints' : 'Scanned_Codes'}_${project.name}_${new Date().toISOString().slice(0, 10)}.zip`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            
                            // Cerrar notificación de carga y mostrar éxito
                            notifications.hide('zip-generation');
            notifications.show({
                                title: 'ZIP generado exitosamente',
                                message: `Se descargó el archivo ZIP con ${dataToExport.length} registros (CSV, Excel + info PDF)`,
                color: 'green'
            });
                            
        } catch (error) {
                            console.error('Error al generar ZIP:', error);
                            notifications.hide('zip-generation');
            notifications.show({
                                title: 'Error al generar ZIP',
                                message: 'No se pudo generar el archivo ZIP. Inténtalo de nuevo.',
                                color: 'red'
                            });
                        }
                    }, 2000);
                } else {
                    throw new Error('No se pudo abrir la ventana del reporte PDF');
                }
            } catch (error) {
                console.error('Error al generar PDF:', error);
                // Continuar sin el PDF si hay error
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(zipBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${isPanasonicProject ? 'Panasonic_Checkpoints' : 'Scanned_Codes'}_${project.name}_${new Date().toISOString().slice(0, 10)}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                notifications.hide('zip-generation');
                notifications.show({
                    title: 'ZIP generado (sin PDF)',
                    message: `Se descargó el archivo ZIP con ${dataToExport.length} registros (CSV, Excel)`,
                    color: 'orange'
                });
            }
            
        } catch (error) {
            console.error('Error al generar ZIP:', error);
            notifications.hide('zip-generation');
            notifications.show({
                title: 'Error al generar ZIP',
                message: 'No se pudo generar el archivo ZIP. Inténtalo de nuevo.',
                color: 'red'
            });
        }
    };

    // Función para manejar el clic en un registro de la barra lateral
    const handleBatteryCodeClick = (batteryCode: string) => {
        console.log('🔍 Iniciando tracking para batería:', batteryCode);
        setSelectedBatteryCode(batteryCode);
        // NO cambiar el vinFilter para mantener todos los registros visibles en la barra lateral
        
        // Encontrar todas las posiciones de esta batería específica
        const batteryPositions = units.positions.filter(p => p.unitId === batteryCode);
        console.log('📍 Posiciones encontradas para', batteryCode, ':', batteryPositions.length);
        console.log('📍 Todas las posiciones disponibles:', units.positions.length);
        console.log('📍 Posiciones filtradas:', batteryPositions);
        
        if (batteryPositions.length > 0 && mapRef) {
            // Ordenar por timestamp para mostrar el camino cronológico
            const sortedPositions = batteryPositions.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            console.log('📍 Posiciones ordenadas:', sortedPositions);
            
            // Centrar el mapa en la primera posición
            const firstPosition = sortedPositions[0];
            console.log('📍 Primera posición:', firstPosition);
            mapRef.setView([firstPosition.position.lat, firstPosition.position.lng], 18);
            
            // Mostrar notificación con el tracking
            notifications.show({
                title: `Tracking: ${batteryCode}`,
                message: `Mostrando ${sortedPositions.length} checkpoints del camino de la batería`,
                color: 'blue',
                autoClose: 3000
            });
        } else {
            console.log('❌ No se encontraron posiciones o el mapa no está disponible');
            notifications.show({
                title: 'Error de Tracking',
                message: `No se encontraron posiciones para la batería ${batteryCode}`,
                color: 'red',
                autoClose: 3000
            });
        }
    };

    return (
        <>
            <style>
                {`
                    /* Animación de pulso para el marcador del usuario */
                    @keyframes pulse {
                        0% {
                            box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
                        }
                        70% {
                            box-shadow: 0 0 0 10px rgba(255, 68, 68, 0);
                        }
                        100% {
                            box-shadow: 0 0 0 0 rgba(255, 68, 68, 0);
                        }
                    }
                    
                    /* Forzar orientación horizontal para el mapa en móvil */
                    @media (max-width: 768px) {
                        .map-modal-container {
                            transform: rotate(90deg);
                            transform-origin: center center;
                            width: 100vh !important;
                            height: 100vw !important;
                            position: fixed !important;
                            top: 50% !important;
                            left: 50% !important;
                            margin-top: -50vw !important;
                            margin-left: -50vh !important;
                            z-index: 1000 !important;
                        }
                        
                        .map-modal-content {
                            width: 100% !important;
                            height: 100% !important;
                            transform: rotate(-90deg);
                            transform-origin: center center;
                        }
                        
                        .map-container-horizontal {
                            display: flex !important;
                            height: 100% !important;
                            width: 100% !important;
                        }
                        
                        .map-paper-horizontal {
                            height: 100% !important;
                            width: 100% !important;
                        }
                    }
                `}
            </style>
        <Modal
            opened={true}
            onClose={onClose}
            size="100%"
            fullScreen
                className="map-modal-container"
            title={
                    <Group justify="space-between" style={{ width: '100%' }} className="map-modal-content">
                    <Title order={3}>{project.name}</Title>
                    <ActionIcon onClick={onClose} variant="subtle">
                        <IconX size={20} />
                    </ActionIcon>
                        </Group>
            }
        >
            <div style={{ 
                display: 'flex', 
                height: 'calc(100vh - 80px)'
            }} className="map-container map-container-horizontal">
                {/* Barra lateral izquierda - Solo para proyecto Panasonic - Vista escritorio */}
                {isPanasonicProject && (
                    <Paper 
                        style={{ 
                            width: '300px', 
                            height: '100%', 
                            borderRight: '1px solid #373A40',
                            overflowY: 'auto',
                            padding: '16px',
                            marginRight: '16px',
                            backgroundColor: '#1A1B1E'
                        }}
                        visibleFrom="md"
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
                                {isPanasonicProject 
                                    ? (filter === 'boxes' 
                                        ? `${boxCodes.filter(boxCode => {
                                            // Filtro por código de caja
                                            if (vinFilter && !boxCode.toLowerCase().includes(vinFilter.toLowerCase())) {
                                                return false;
                                            }
                                            return true;
                                        }).length} códigos de cajas encontrados`
                                        : `${batteryCodes.filter(batteryData => {
                                        const [batteryCode, category] = batteryData.split('|');
                                        
                                        // Filtro por código de batería
                                        if (vinFilter && !batteryCode.toLowerCase().includes(vinFilter.toLowerCase())) {
                                            return false;
                                        }
                                        
                                        // Aplicar filtros de categoría según el badge seleccionado
                                            if (filter !== 'all') {
                                            if (filter === 'ok' || filter === 'failed') {
                                                // Para filtros de estado, necesitamos verificar en los datos reales
                                                // Por ahora, mostrar todos si no hay datos específicos de estado
                                                return true;
                                            } else {
                                                // Filtro por categoría (a, b, c, d, e)
                                                if (category?.toLowerCase() !== filter.toLowerCase()) {
                                                    return false;
                                                }
                                            }
                                        }
                                        
                                        return true;
                                        }).length} códigos de batería encontrados`)
                                    : `${sortedPositions.filter(unit => {
                                        // Determinar si es una caja
                                        const isBox = unit.unitId?.startsWith('BOX');
                                        
                                        // Para proyecto Panasonic, manejar filtros especiales
                                        if (isPanasonicProject) {
                                            if (filter === 'boxes') {
                                                // Solo mostrar cajas
                                                const boxMatch = isBox;
                                                const dateMatch = dateFilter === 'all' || 
                                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                return boxMatch && dateMatch && specificDateMatch &&
                                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            } else if (filter === 'all') {
                                                // Excluir cajas del filtro "todos"
                                                const categoryMatch = !isBox;
                                        const dateMatch = dateFilter === 'all' || 
                                            (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                            (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                        const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                        return categoryMatch && dateMatch && specificDateMatch &&
                                            unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                            unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            } else if (filter === 'ok' || filter === 'failed') {
                                                // Excluir cajas de los filtros de estado
                                                const statusMatch = unit.status === filter && !isBox;
                                                const dateMatch = dateFilter === 'all' || 
                                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                return statusMatch && dateMatch && specificDateMatch &&
                                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            } else {
                                                // Filtros de categoría (a, b, c, d, e) - excluir cajas
                                                const categoryMatch = unit.categorie?.toLowerCase() === filter && !isBox;
                                                const dateMatch = dateFilter === 'all' || 
                                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                return categoryMatch && dateMatch && specificDateMatch &&
                                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            }
                                        } else {
                                            // Para otros proyectos, usar lógica original
                                            const categoryMatch = filter === 'all' || unit.status === filter;
                                            const dateMatch = dateFilter === 'all' || 
                                                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                            return categoryMatch && dateMatch && specificDateMatch &&
                                                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                        }
                                    }).length} registros encontrados`
                                }
                            </Text>
                            
                            <Stack gap="xs" style={{ maxHeight: 'calc(100% - 80px)', overflowY: 'auto' }}>
                                {isPanasonicProject ? (
                                    filter === 'boxes' ? (
                                        // Para filtro de cajas, mostrar códigos de cajas
                                        boxCodes
                                            .filter(boxCode => {
                                                // Filtro por código de caja
                                                if (vinFilter && !boxCode.toLowerCase().includes(vinFilter.toLowerCase())) {
                                                    return false;
                                                }
                                                return true;
                                            })
                                            .map((boxCode, index) => (
                                                <Paper
                                                    key={index}
                                                    p="xs"
                                                    style={{ 
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedBatteryCode === boxCode ? '#339AF0' : '#2C2E33',
                                                        borderColor: selectedBatteryCode === boxCode ? '#4DABF7' : '#339AF0',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => handleBatteryCodeClick(boxCode)}
                                                    onMouseEnter={(e) => {
                                                        if (selectedBatteryCode !== boxCode) {
                                                            e.currentTarget.style.backgroundColor = '#339AF0';
                                                            e.currentTarget.style.borderColor = '#4DABF7';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (selectedBatteryCode !== boxCode) {
                                                            e.currentTarget.style.backgroundColor = '#2C2E33';
                                                            e.currentTarget.style.borderColor = '#339AF0';
                                                        }
                                                    }}
                                                >
                                                    <Group justify="space-between">
                                                        <Text size="sm" fw={600} c="blue.4">
                                                            {boxCode}
                                                        </Text>
                                                        <Group gap="xs">
                                                            <Badge 
                                                                color="orange" 
                                                                size="sm"
                                                                style={{ backgroundColor: '#FF8C00' }}
                                                            >
                                                                CAJA
                                                            </Badge>
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                color="blue"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBatteryCodeClick(boxCode);
                                                                }}
                                                            >
                                                                Track
                                                            </Button>
                                                        </Group>
                                                    </Group>
                                                </Paper>
                                            ))
                                    ) : (
                                        // Para otros filtros, mostrar códigos de batería
                                    batteryCodes
                                        .filter(batteryData => {
                                            const [batteryCode, category] = batteryData.split('|');
                                            
                                            // Filtro por código de batería
                                            if (vinFilter && !batteryCode.toLowerCase().includes(vinFilter.toLowerCase())) {
                                                return false;
                                            }
                                            
                                            // Aplicar filtros de categoría según el badge seleccionado
                                                if (filter !== 'all') {
                                                if (filter === 'ok' || filter === 'failed') {
                                                    // Para filtros de estado, necesitamos verificar en los datos reales
                                                    // Por ahora, mostrar todos si no hay datos específicos de estado
                                                    return true;
                                                } else {
                                                    // Filtro por categoría (a, b, c, d, e)
                                                    if (category?.toLowerCase() !== filter.toLowerCase()) {
                                                        return false;
                                                    }
                                                }
                                            }
                                            
                                            return true;
                                        })
                                        .map((batteryData, index) => {
                                            const [batteryCode, category] = batteryData.split('|');
                                            const getCategoryColor = (cat: string) => {
                                                switch (cat) {
                                                    case 'A': return 'cyan'; // Usar el mismo color que el filtro
                                                    case 'B': return 'blue'; // Usar el mismo color que el filtro
                                                    case 'C': return 'yellow'; // Usar el mismo color que el filtro
                                                    case 'D': return 'violet'; // Usar el mismo color que el filtro
                                                    case 'E': return 'grape'; // Usar el mismo color que el filtro
                                                    default: return 'gray';
                                                }
                                            };
                                            
                                            return (
                                                <Paper
                                                    key={index}
                                                    p="sm"
                                                    withBorder
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedBatteryCode === batteryCode ? '#339AF0' : '#2C2E33',
                                                        borderColor: selectedBatteryCode === batteryCode ? '#4DABF7' : '#339AF0',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => handleBatteryCodeClick(batteryCode)}
                                                >
                                                    <Group justify="space-between" align="center">
                                                        <Text size="sm" fw={600} c="blue.4">
                                                            {batteryCode}
                                                        </Text>
                                                        <Group gap="xs">
                                                            <Badge 
                                                                color={getCategoryColor(category)} 
                                                                size="sm"
                                                            >
                                                                {category}
                                                            </Badge>
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                color="blue"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBatteryCodeClick(batteryCode);
                                                                }}
                                                            >
                                                                Track
                                                            </Button>
                                                        </Group>
                                                    </Group>
                                                </Paper>
                                            );
                                        })
                                    )
                                ) : (
                                    // Para otros proyectos, mostrar posiciones normales
                                    sortedPositions
                                        .filter(unit => {
                                            // Determinar si es una caja
                                            const isBox = unit.unitId?.startsWith('BOX');
                                            
                                            // Para proyecto Panasonic, manejar filtros especiales
                                            if (isPanasonicProject) {
                                                if (filter === 'boxes') {
                                                    // Solo mostrar cajas
                                                    const boxMatch = isBox;
                                                    const dateMatch = dateFilter === 'all' || 
                                                        (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                        (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                    const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                    return boxMatch && dateMatch && specificDateMatch &&
                                                        unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                        unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                                } else if (filter === 'all') {
                                                    // Excluir cajas del filtro "todos"
                                                    const categoryMatch = !isBox;
                                            const dateMatch = dateFilter === 'all' || 
                                                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                            return categoryMatch && dateMatch && specificDateMatch &&
                                                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                                } else if (filter === 'ok' || filter === 'failed') {
                                                    // Excluir cajas de los filtros de estado
                                                    const statusMatch = unit.status === filter && !isBox;
                                                    const dateMatch = dateFilter === 'all' || 
                                                        (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                        (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                    const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                    return statusMatch && dateMatch && specificDateMatch &&
                                                        unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                        unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                                } else {
                                                    // Filtros de categoría (a, b, c, d, e) - excluir cajas
                                                    const categoryMatch = unit.categorie?.toLowerCase() === filter && !isBox;
                                                    const dateMatch = dateFilter === 'all' || 
                                                        (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                        (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                    const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                    return categoryMatch && dateMatch && specificDateMatch &&
                                                        unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                        unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                                }
                                            } else {
                                                // Para otros proyectos, usar lógica original
                                                const categoryMatch = filter === 'all' || unit.status === filter;
                                                const dateMatch = dateFilter === 'all' || 
                                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                return categoryMatch && dateMatch && specificDateMatch &&
                                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            }
                                        })
                                        .map((unit, index) => (
                                    <Paper 
                                        key={index}
                                        p="sm" 
                                        withBorder
                                        style={{ 
                                            cursor: 'pointer',
                                            backgroundColor: selectedBatteryCode === unit.unitId ? '#339AF0' : 
                                                           (filter === 'all' || filter === 'boxes' || unit.categorie?.toLowerCase() === filter || unit.status === filter ? '#2C2E33' : '#1A1B1E'),
                                            borderColor: selectedBatteryCode === unit.unitId ? '#4DABF7' : 
                                                        (filter === 'all' || filter === 'boxes' || unit.categorie?.toLowerCase() === filter || unit.status === filter ? '#339AF0' : '#373A40'),
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => handleBatteryCodeClick(unit.unitId)}
                                        onMouseEnter={(e) => {
                                            if (selectedBatteryCode !== unit.unitId) {
                                                e.currentTarget.style.backgroundColor = '#2C2E33';
                                                e.currentTarget.style.borderColor = '#339AF0';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedBatteryCode !== unit.unitId) {
                                                e.currentTarget.style.backgroundColor = filter === 'all' || filter === 'boxes' || unit.categorie?.toLowerCase() === filter || unit.status === filter ? '#2C2E33' : '#1A1B1E';
                                                e.currentTarget.style.borderColor = filter === 'all' || filter === 'boxes' || unit.categorie?.toLowerCase() === filter || unit.status === filter ? '#339AF0' : '#373A40';
                                            }
                                        }}
                                    >
                                        <Group justify="space-between" align="center">
                                            <Text size="sm" fw={600} c="blue.4">
                                                {unit.unitId}
                                            </Text>
                                            <Badge 
                                                size="sm"
                                                color={
                                                    unit.categorie === 'a' ? 'cyan' : 
                                                    unit.categorie === 'b' ? 'blue' : 
                                                    unit.categorie === 'c' ? 'yellow' : 
                                                    unit.categorie === 'd' ? 'violet' : 
                                                    unit.categorie === 'e' ? 'grape' : 'gray'
                                                }
                                                variant="filled"
                                            >
                                                CAT {unit.categorie?.toUpperCase()}
                                            </Badge>
                                        </Group>
                                    </Paper>
                                        ))
                                )}
                            </Stack>
                        </Stack>
                    </Paper>
                )}

                {/* Barra lateral móvil horizontal optimizada - Solo para proyecto Panasonic */}
                {isPanasonicProject && (
                    <Paper 
                        style={{ 
                            width: '200px', 
                            height: 'calc(100vh - 80px)', 
                            borderRight: '1px solid #373A40',
                            overflowY: 'auto',
                            padding: '8px',
                            marginRight: '8px',
                            backgroundColor: '#1A1B1E'
                        }}
                        hiddenFrom="md"
                    >
                        <Stack gap="xs">
                            <Title order={5} c="blue.4" size="sm">
                                Códigos de Batería
                            </Title>
                            
                            {/* Filtros por fecha - versión móvil compacta */}
                            <Group gap="xs">
                                <Badge 
                                    color={dateFilter === 'all' ? 'blue' : 'gray'}
                                    onClick={() => setDateFilter('all')}
                                    style={{ cursor: 'pointer' }}
                                    size="xs"
                                >
                                    TODOS
                                </Badge>
                                <Badge 
                                    color={dateFilter === 'today' ? 'green' : 'gray'}
                                    onClick={() => setDateFilter('today')}
                                    style={{ cursor: 'pointer' }}
                                    size="xs"
                                >
                                    HOY
                                </Badge>
                                <Badge 
                                    color={dateFilter === 'yesterday' ? 'orange' : 'gray'}
                                    onClick={() => setDateFilter('yesterday')}
                                    style={{ cursor: 'pointer' }}
                                    size="xs"
                                >
                                    AYER
                                </Badge>
                            </Group>
                            
                            <Text size="xs" c="dimmed">
                                {isPanasonicProject 
                                    ? (filter === 'boxes' 
                                        ? `${boxCodes.filter(boxCode => {
                                            if (vinFilter && !boxCode.toLowerCase().includes(vinFilter.toLowerCase())) {
                                                return false;
                                            }
                                            return true;
                                        }).length} códigos de cajas encontrados`
                                        : `${batteryCodes.filter(batteryData => {
                                        const [batteryCode, category] = batteryData.split('|');
                                        
                                        if (vinFilter && !batteryCode.toLowerCase().includes(vinFilter.toLowerCase())) {
                                            return false;
                                        }
                                        
                                        if (filter !== 'all') {
                                            if (filter === 'ok' || filter === 'failed') {
                                                return true;
                                            } else {
                                                if (category?.toLowerCase() !== filter.toLowerCase()) {
                                                    return false;
                                                }
                                            }
                                        }
                                        
                                        return true;
                                        }).length} códigos de batería encontrados`)
                                    : `${sortedPositions.filter(unit => {
                                        const isBox = unit.unitId?.startsWith('BOX');
                                        
                                        if (isPanasonicProject) {
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
                                        } else {
                                            const categoryMatch = filter === 'all' || unit.status === filter;
                                            const dateMatch = dateFilter === 'all' || 
                                                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                            return categoryMatch && dateMatch && specificDateMatch &&
                                                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                        }
                                    }).length} registros encontrados`
                                }
                            </Text>
                            
                            <Stack gap="xs" style={{ maxHeight: 'calc(100% - 60px)', overflowY: 'auto' }}>
                                {isPanasonicProject ? (
                                    filter === 'boxes' ? (
                                        boxCodes
                                            .filter(boxCode => {
                                                if (vinFilter && !boxCode.toLowerCase().includes(vinFilter.toLowerCase())) {
                                                    return false;
                                                }
                                                return true;
                                            })
                                            .map((boxCode, index) => (
                                                <Paper
                                                    key={index}
                                                    p="xs"
                                                    style={{ 
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedBatteryCode === boxCode ? '#339AF0' : '#2C2E33',
                                                        borderColor: selectedBatteryCode === boxCode ? '#4DABF7' : '#339AF0',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => handleBatteryCodeClick(boxCode)}
                                                    onMouseEnter={(e) => {
                                                        if (selectedBatteryCode !== boxCode) {
                                                            e.currentTarget.style.backgroundColor = '#339AF0';
                                                            e.currentTarget.style.borderColor = '#4DABF7';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (selectedBatteryCode !== boxCode) {
                                                            e.currentTarget.style.backgroundColor = '#2C2E33';
                                                            e.currentTarget.style.borderColor = '#339AF0';
                                                        }
                                                    }}
                                                >
                                                    <Group justify="space-between">
                                                        <Text size="xs" fw={600} c="blue.4">
                                                            {boxCode}
                                                        </Text>
                                                        <Group gap="xs">
                                                            <Badge 
                                                                color="orange" 
                                                                size="xs"
                                                                style={{ backgroundColor: '#FF8C00' }}
                                                            >
                                                                CAJA
                                                            </Badge>
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                color="blue"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBatteryCodeClick(boxCode);
                                                                }}
                                                            >
                                                                Track
                                                            </Button>
                                                        </Group>
                                                    </Group>
                                                </Paper>
                                            ))
                                    ) : (
                                        batteryCodes
                                            .filter(batteryData => {
                                                const [batteryCode, category] = batteryData.split('|');
                                                
                                                if (vinFilter && !batteryCode.toLowerCase().includes(vinFilter.toLowerCase())) {
                                                    return false;
                                                }
                                                
                                                if (filter !== 'all') {
                                                    if (filter === 'ok' || filter === 'failed') {
                                                        return true;
                                                    } else {
                                                        if (category?.toLowerCase() !== filter.toLowerCase()) {
                                                            return false;
                                                        }
                                                    }
                                                }
                                                
                                                return true;
                                            })
                                            .map((batteryData, index) => {
                                                const [batteryCode, category] = batteryData.split('|');
                                                return (
                                                    <Paper
                                                        key={index}
                                                        p="xs"
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            backgroundColor: selectedBatteryCode === batteryCode ? '#339AF0' : '#2C2E33',
                                                            borderColor: selectedBatteryCode === batteryCode ? '#4DABF7' : '#339AF0',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onClick={() => handleBatteryCodeClick(batteryCode)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedBatteryCode !== batteryCode) {
                                                                e.currentTarget.style.backgroundColor = '#339AF0';
                                                                e.currentTarget.style.borderColor = '#4DABF7';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedBatteryCode !== batteryCode) {
                                                                e.currentTarget.style.backgroundColor = '#2C2E33';
                                                                e.currentTarget.style.borderColor = '#339AF0';
                                                            }
                                                        }}
                                                    >
                                                        <Group justify="space-between">
                                                            <Text size="xs" fw={600} c="blue.4">
                                                                {batteryCode}
                                                            </Text>
                                                            <Group gap="xs">
                                                                <Badge 
                                                                    color={category === 'A' ? 'cyan' : 
                                                                           category === 'B' ? 'blue' : 
                                                                           category === 'C' ? 'yellow' : 
                                                                           category === 'D' ? 'violet' : 
                                                                           category === 'E' ? 'grape' : 'gray'} 
                                                                    size="xs"
                                                                >
                                                                    {category}
                                                                </Badge>
                                                                <Button
                                                                    size="xs"
                                                                    variant="outline"
                                                                    color="blue"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleBatteryCodeClick(batteryCode);
                                                                    }}
                                                                >
                                                                    Track
                                                                </Button>
                                                            </Group>
                                                        </Group>
                                                    </Paper>
                                                );
                                            })
                                    )
                                ) : (
                                    sortedPositions
                                        .filter(unit => {
                                            const isBox = unit.unitId?.startsWith('BOX');
                                            
                                            if (isPanasonicProject) {
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
                                            } else {
                                                const categoryMatch = filter === 'all' || unit.status === filter;
                                                const dateMatch = dateFilter === 'all' || 
                                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                return categoryMatch && dateMatch && specificDateMatch &&
                                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            }
                                        })
                                        .map((unit, index) => (
                                            <Paper
                                                key={index}
                                                p="xs"
                                                style={{ 
                                                    cursor: 'pointer',
                                                    backgroundColor: selectedBatteryCode === unit.unitId ? '#339AF0' : '#2C2E33',
                                                    borderColor: selectedBatteryCode === unit.unitId ? '#4DABF7' : '#339AF0',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onClick={() => handleBatteryCodeClick(unit.unitId)}
                                                onMouseEnter={(e) => {
                                                    if (selectedBatteryCode !== unit.unitId) {
                                                        e.currentTarget.style.backgroundColor = '#339AF0';
                                                        e.currentTarget.style.borderColor = '#4DABF7';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (selectedBatteryCode !== unit.unitId) {
                                                        e.currentTarget.style.backgroundColor = '#2C2E33';
                                                        e.currentTarget.style.borderColor = '#339AF0';
                                                    }
                                                }}
                                            >
                                                <Group justify="space-between">
                                                    <Text size="xs" fw={600} c="blue.4">
                                                        {unit.unitId}
                                                    </Text>
                                                    <Group gap="xs">
                                                        <Badge 
                                                            color={unit.status === 'ok' ? 'green' : 
                                                                   unit.status === 'pending' ? 'yellow' : 'red'} 
                                                            size="xs"
                                                        >
                                                            {unit.status === 'ok' ? 'OK' : 
                                                             unit.status === 'pending' ? 'PEND' : 'FAIL'}
                                                        </Badge>
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            color="blue"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleBatteryCodeClick(unit.unitId);
                                                            }}
                                                        >
                                                            Track
                                                        </Button>
                                                    </Group>
                                        </Group>
                                    </Paper>
                                        ))
                                )}
                            </Stack>
                        </Stack>
                    </Paper>
                )}

                {/* Contenido principal del mapa */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack>
                        {/* Vista de escritorio - mantener original */}
                        <Group justify="space-between" visibleFrom="md">
                                <Group>
                                <TextInput
                                    placeholder={isPanasonicProject ? "Filtrar por código de batería" : "Filtrar por VIN"}
                                    value={vinFilter}
                                    onChange={(e) => setVinFilter(e.target.value)}
                                    leftSection={<IconSearch size={16} />}
                                />
                                <TextInput
                                    placeholder="Filtrar por técnico"
                                    value={techFilter}
                                    onChange={(e) => setTechFilter(e.target.value)}
                                    leftSection={<IconUser size={16} />}
                                />
                                <DateInput
                                    placeholder="Filtrar por fecha"
                                    value={selectedDate}
                                    onChange={setSelectedDate}
                                    leftSection={<IconCalendar size={16} />}
                                    clearable
                                    locale="es"
                                />
                                <Menu
                                    shadow="md"
                                    width={200}
                                    opened={downloadMenuOpened}
                                    onClose={() => setDownloadMenuOpened(false)}
                                >
                                    <Menu.Target>
                                <ActionIcon
                                    variant="outline"
                                    color="blue"
                                    size="lg"
                                            onClick={() => setDownloadMenuOpened(!downloadMenuOpened)}
                                    title="Descargar datos"
                                >
                                    <IconDownload size={18} />
                                </ActionIcon>
                                    </Menu.Target>

                                    <Menu.Dropdown>
                                        <Menu.Label>Formato de descarga</Menu.Label>
                                        <Menu.Item
                                            leftSection={<IconFile size={16} />}
                                            onClick={() => {
                                                exportToPDF();
                                                setDownloadMenuOpened(false);
                                            }}
                                        >
                                            PDF
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconFileSpreadsheet size={16} />}
                                            onClick={() => {
                                                exportToExcel();
                                                setDownloadMenuOpened(false);
                                            }}
                                        >
                                            Excel
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconFileCode size={16} />}
                                            onClick={() => {
                                                exportToCSV();
                                                setDownloadMenuOpened(false);
                                            }}
                                        >
                                            CSV
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                            leftSection={<IconArchive size={16} />}
                                            onClick={() => {
                                                exportAllAsZIP();
                                                setDownloadMenuOpened(false);
                                            }}
                                        >
                                            Todos (ZIP)
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                                <Menu
                                    shadow="md"
                                    width={200}
                                    opened={shareMenuOpened}
                                    onClose={() => setShareMenuOpened(false)}
                                >
                                    <Menu.Target>
                                <ActionIcon
                                    variant="outline"
                                    color="green"
                                    size="lg"
                                            onClick={() => setShareMenuOpened(!shareMenuOpened)}
                                            title="Compartir proyecto"
                                        >
                                            <IconLink size={18} />
                                        </ActionIcon>
                                    </Menu.Target>

                                    <Menu.Dropdown>
                                        <Menu.Label>Compartir proyecto</Menu.Label>
                                        <Menu.Item
                                            leftSection={<IconLink size={16} />}
                                    onClick={() => {
                                        const shareData = {
                                            title: `Proyecto ${project.name}`,
                                            text: `Datos del proyecto ${project.name} - ${units.positions.length} registros encontrados`,
                                            url: window.location.href
                                        };
                                        
                                        if (navigator.share) {
                                            navigator.share(shareData).then(() => {
                                                notifications.show({
                                                    title: 'Compartido exitosamente',
                                                    message: 'El enlace se ha compartido correctamente',
                                                    color: 'green'
                                                });
                                            }).catch(() => {
                                                // Fallback: copiar al portapapeles
                                                navigator.clipboard.writeText(window.location.href).then(() => {
                                                    notifications.show({
                                                        title: 'Enlace copiado',
                                                        message: 'El enlace se ha copiado al portapapeles',
                                                        color: 'blue'
                                                    });
                                                });
                                            });
                                        } else {
                                            // Fallback: copiar al portapapeles
                                            navigator.clipboard.writeText(window.location.href).then(() => {
                                                notifications.show({
                                                    title: 'Enlace copiado',
                                                    message: 'El enlace se ha copiado al portapapeles',
                                                    color: 'blue'
                                                });
                                            });
                                        }
                                                setShareMenuOpened(false);
                                            }}
                                        >
                                            Link
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconFile size={16} />}
                                            onClick={() => {
                                                sharePDF();
                                                setShareMenuOpened(false);
                                            }}
                                        >
                                            PDF
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconFileSpreadsheet size={16} />}
                                            onClick={() => {
                                                shareExcel();
                                                setShareMenuOpened(false);
                                            }}
                                        >
                                            Excel
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                            leftSection={<IconArchive size={16} />}
                                            onClick={() => {
                                                exportAllAsZIP();
                                                setShareMenuOpened(false);
                                            }}
                                        >
                                            Todos (ZIP)
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </Group>

                        {/* Vista móvil horizontal optimizada */}
                        <Stack gap="xs" hiddenFrom="md">
                            {/* Fila 1: Filtros y botones */}
                            <Group gap="xs" wrap="nowrap">
                                <TextInput
                                    placeholder={isPanasonicProject ? "Código batería" : "VIN"}
                                    value={vinFilter}
                                    onChange={(e) => setVinFilter(e.target.value)}
                                    leftSection={<IconSearch size={14} />}
                                    size="xs"
                                    style={{ flex: 1, minWidth: '120px' }}
                                />
                                <TextInput
                                    placeholder="Técnico"
                                    value={techFilter}
                                    onChange={(e) => setTechFilter(e.target.value)}
                                    leftSection={<IconUser size={14} />}
                                    size="xs"
                                    style={{ flex: 1, minWidth: '100px' }}
                                />
                                <DateInput
                                    placeholder="Fecha"
                                    value={selectedDate}
                                    onChange={setSelectedDate}
                                    leftSection={<IconCalendar size={14} />}
                                    clearable
                                    locale="es"
                                    size="xs"
                                    style={{ flex: 1, minWidth: '100px' }}
                                />
                                <Menu
                                    shadow="md"
                                    width={180}
                                    opened={downloadMenuOpened}
                                    onClose={() => setDownloadMenuOpened(false)}
                                >
                                    <Menu.Target>
                                        <ActionIcon
                                            variant="outline"
                                            color="blue"
                                            size="sm"
                                            onClick={() => setDownloadMenuOpened(!downloadMenuOpened)}
                                            title="Descargar datos"
                                        >
                                            <IconDownload size={14} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Formato de descarga</Menu.Label>
                                        <Menu.Item
                                            leftSection={<IconFile size={14} />}
                                            onClick={() => {
                                                exportToPDF();
                                                setDownloadMenuOpened(false);
                                            }}
                                        >
                                            PDF
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconFileSpreadsheet size={14} />}
                                            onClick={() => {
                                                exportToExcel();
                                                setDownloadMenuOpened(false);
                                            }}
                                        >
                                            Excel
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconFileCode size={14} />}
                                            onClick={() => {
                                                exportToCSV();
                                                setDownloadMenuOpened(false);
                                            }}
                                        >
                                            CSV
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                            leftSection={<IconArchive size={14} />}
                                            onClick={() => {
                                                exportAllAsZIP();
                                                setDownloadMenuOpened(false);
                                            }}
                                        >
                                            Todos (ZIP)
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                                <Menu
                                    shadow="md"
                                    width={180}
                                    opened={shareMenuOpened}
                                    onClose={() => setShareMenuOpened(false)}
                                >
                                    <Menu.Target>
                                        <ActionIcon
                                            variant="outline"
                                            color="green"
                                            size="sm"
                                            onClick={() => setShareMenuOpened(!shareMenuOpened)}
                                            title="Compartir proyecto"
                                        >
                                            <IconLink size={14} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Compartir proyecto</Menu.Label>
                                        <Menu.Item
                                            leftSection={<IconLink size={14} />}
                                            onClick={() => {
                                                if (navigator.share) {
                                                    navigator.share({
                                                        title: `Proyecto ${project.name}`,
                                                        text: `Proyecto: ${project.name}`,
                                                        url: window.location.href
                                                    });
                                                } else {
                                                    navigator.clipboard.writeText(window.location.href);
                                                    notifications.show({
                                                        title: 'Enlace copiado',
                                                        message: 'El enlace del proyecto ha sido copiado al portapapeles',
                                                        color: 'green'
                                                    });
                                                }
                                                setShareMenuOpened(false);
                                            }}
                                        >
                                            Compartir enlace
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconFileText size={14} />}
                                            onClick={() => {
                                                exportToPDF();
                                                setShareMenuOpened(false);
                                            }}
                                        >
                                            Compartir PDF
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconFileSpreadsheet size={14} />}
                                            onClick={() => {
                                                exportToExcel();
                                                setShareMenuOpened(false);
                                            }}
                                        >
                                            Compartir Excel
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                            leftSection={<IconArchive size={14} />}
                                            onClick={() => {
                                                exportAllAsZIP();
                                                setShareMenuOpened(false);
                                            }}
                                        >
                                            Compartir todos (ZIP)
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </Stack>

                {/* Vista de escritorio - badges originales */}
                <Group gap="xs" visibleFrom="md">
                    {isPanasonicProject ? (
                        // Filtros para proyecto Panasonic (categorías)
                        <>
                            <Badge 
                                color={filter === 'all' ? 'blue' : 'gray'}
                                onClick={() => handleFilterChange('all')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                Todos ({new Set(units.positions.filter(u => !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'a' ? 'cyan' : 'gray'}
                                onClick={() => handleFilterChange('a')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                A ({new Set(units.positions.filter(u => u.categorie === 'A' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'b' ? 'blue' : 'gray'}
                                onClick={() => handleFilterChange('b')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                B ({new Set(units.positions.filter(u => u.categorie === 'B' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'c' ? 'yellow' : 'gray'}
                                onClick={() => handleFilterChange('c')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                C ({new Set(units.positions.filter(u => u.categorie === 'C' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'd' ? 'violet' : 'gray'}
                                onClick={() => handleFilterChange('d')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                D ({new Set(units.positions.filter(u => u.categorie === 'D' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'e' ? 'grape' : 'gray'}
                                onClick={() => handleFilterChange('e')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                E ({new Set(units.positions.filter(u => u.categorie === 'E' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge
                                color={filter === 'ok' ? 'green' : 'gray'}
                                onClick={() => handleFilterChange('ok')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                OK ({new Set(units.positions.filter(u => u.status === 'ok' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'failed' ? 'red' : 'gray'}
                                onClick={() => handleFilterChange('failed')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                Fallidos ({new Set(units.positions.filter(u => u.status === 'failed' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'boxes' ? 'orange' : 'gray'}
                                onClick={() => handleFilterChange('boxes')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                CAJAS ({new Set(units.positions.filter(u => u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                        </>
                    ) : (
                        // Filtros para otros proyectos (estados)
                        <>
                            <Badge 
                                color={filter === 'all' ? 'blue' : 'gray'}
                                onClick={() => handleFilterChange('all')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                Todos ({units.positions.length})
                            </Badge>
                            <Badge
                                color={filter === 'ok' ? 'green' : 'gray'}
                                onClick={() => handleFilterChange('ok')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                OK ({units.positions.filter(u => u.status === 'ok').length})
                            </Badge>
                            <Badge
                                color={filter === 'pending' ? 'yellow' : 'gray'}
                                onClick={() => handleFilterChange('pending')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                Pendientes ({units.positions.filter(u => u.status === 'pending').length})
                            </Badge>
                            <Badge 
                                color={filter === 'failed' ? 'red' : 'gray'}
                                onClick={() => handleFilterChange('failed')}
                                style={{ cursor: 'pointer' }}
                                size="lg"
                            >
                                Fallidos ({units.positions.filter(u => u.status === 'failed').length})
                            </Badge>
                        </>
                    )}
                </Group>

                {/* Vista móvil horizontal - badges optimizadas */}
                <Group gap="xs" wrap="nowrap" hiddenFrom="md">
                    {isPanasonicProject ? (
                        // Filtros para proyecto Panasonic (categorías) - versión móvil compacta
                        <>
                            <Badge 
                                color={filter === 'all' ? 'blue' : 'gray'}
                                onClick={() => handleFilterChange('all')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                TODOS ({new Set(units.positions.filter(u => !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'a' ? 'cyan' : 'gray'}
                                onClick={() => handleFilterChange('a')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                A ({new Set(units.positions.filter(u => u.categorie === 'A' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'b' ? 'blue' : 'gray'}
                                onClick={() => handleFilterChange('b')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                B ({new Set(units.positions.filter(u => u.categorie === 'B' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'c' ? 'yellow' : 'gray'}
                                onClick={() => handleFilterChange('c')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                C ({new Set(units.positions.filter(u => u.categorie === 'C' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'd' ? 'violet' : 'gray'}
                                onClick={() => handleFilterChange('d')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                D ({new Set(units.positions.filter(u => u.categorie === 'D' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'e' ? 'grape' : 'gray'}
                                onClick={() => handleFilterChange('e')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                E ({new Set(units.positions.filter(u => u.categorie === 'E' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge
                                color={filter === 'ok' ? 'green' : 'gray'}
                                onClick={() => handleFilterChange('ok')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                OK ({new Set(units.positions.filter(u => u.status === 'ok' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'failed' ? 'red' : 'gray'}
                                onClick={() => handleFilterChange('failed')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                FALLIDOS ({new Set(units.positions.filter(u => u.status === 'failed' && !u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            <Badge 
                                color={filter === 'boxes' ? 'orange' : 'gray'}
                                onClick={() => handleFilterChange('boxes')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                CAJAS ({new Set(units.positions.filter(u => u.unitId?.startsWith('BOX')).map(u => u.unitId)).size})
                            </Badge>
                            
                            {/* Botón para obtener ubicación del usuario */}
                            <ActionIcon
                                size="sm"
                                variant="filled"
                                color={userLocation ? "green" : "blue"}
                                onClick={getUserLocation}
                                title={userLocation ? "Ubicación obtenida" : "Obtener mi ubicación"}
                            >
                                <IconMapPin size={16} />
                            </ActionIcon>
                        </>
                    ) : (
                        // Filtros para otros proyectos (estados) - versión móvil compacta
                        <>
                            <Badge 
                                color={filter === 'all' ? 'blue' : 'gray'}
                                onClick={() => handleFilterChange('all')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                TODOS ({units.positions.length})
                            </Badge>
                            <Badge
                                color={filter === 'ok' ? 'green' : 'gray'}
                                onClick={() => handleFilterChange('ok')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                OK ({units.positions.filter(u => u.status === 'ok').length})
                            </Badge>
                            <Badge
                                color={filter === 'pending' ? 'yellow' : 'gray'}
                                onClick={() => handleFilterChange('pending')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                PENDIENTES ({units.positions.filter(u => u.status === 'pending').length})
                            </Badge>
                            <Badge 
                                color={filter === 'failed' ? 'red' : 'gray'}
                                onClick={() => handleFilterChange('failed')}
                                style={{ cursor: 'pointer' }}
                                size="sm"
                            >
                                FALLIDOS ({units.positions.filter(u => u.status === 'failed').length})
                            </Badge>
                            
                            {/* Botón para obtener ubicación del usuario */}
                            <ActionIcon
                                size="sm"
                                variant="filled"
                                color={userLocation ? "green" : "blue"}
                                onClick={getUserLocation}
                                title={userLocation ? "Ubicación obtenida" : "Obtener mi ubicación"}
                            >
                                <IconMapPin size={16} />
                            </ActionIcon>
                        </>
                    )}
                </Group>

                
                <Paper style={{ 
                    height: 'calc(100vh - 80px)'
                }} className="map-paper map-paper-horizontal">
                {isPanasonicProject ? (
                    // Para proyecto Panasonic (ID 28), usar mapa real de Toluca
                    <>
                        <style>
                            {`
                                .leaflet-control-attribution {
                                    display: none !important;
                                }
                                
                                /* Ocultar popup nativo blanco de Leaflet */
                                .leaflet-popup-content-wrapper {
                                    background: transparent !important;
                                    box-shadow: none !important;
                                    border: none !important;
                                    padding: 0 !important;
                                }
                                
                                .leaflet-popup-content {
                                    margin: 0 !important;
                                    padding: 0 !important;
                                }
                                
                                .leaflet-popup-tip {
                                    background: transparent !important;
                                    box-shadow: none !important;
                                    border: none !important;
                                }
                                
                                /* Estilos para móvil horizontal */
                                @media (max-width: 768px) {
                                    .map-container {
                                        height: calc(100vh - 80px) !important;
                                    }
                                    
                                    .map-paper {
                                        height: calc(100vh - 80px) !important;
                                    }
                                }
                            `}
                        </style>
                        <MapContainer
                            center={[19.298909, -99.605458]} // Coordenadas de Toluca
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            ref={setMapRef}
                        >
                            <TileLayer
                                attribution=''
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                            />
                            {(() => {
                                // Si estamos en modo tracking, mostrar todos los escaneos de la batería seleccionada
                                if (selectedBatteryCode) {
                                    return units.positions
                                        .filter(unit => {
                                            // Solo mostrar la batería seleccionada en modo tracking
                                            const batteryCodeMatch = unit.unitId === selectedBatteryCode;
                                            
                                            // Aplicar filtros de fecha y otros
                                            const dateMatch = dateFilter === 'all' || 
                                                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                            
                                            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                            
                                            return batteryCodeMatch && dateMatch && specificDateMatch &&
                                                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                        })
                                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Ordenar por timestamp
                                } else {
                                    // Modo normal: mostrar solo el último escaneo de cada batería
                                    const filteredUnits = units.positions.filter(unit => {
                                        // Determinar si es una caja
                                        const isBox = unit.unitId?.startsWith('BOX');
                                        
                                        // Para proyecto Panasonic, manejar filtros especiales
                                        if (isPanasonicProject) {
                                            if (filter === 'boxes') {
                                                // Solo mostrar cajas
                                                const boxMatch = isBox;
                                        const dateMatch = dateFilter === 'all' || 
                                            (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                            (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                        const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                return boxMatch && dateMatch && specificDateMatch &&
                                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            } else if (filter === 'all') {
                                                // Excluir cajas del filtro "todos"
                                                const categoryMatch = !isBox;
                                                const dateMatch = dateFilter === 'all' || 
                                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                        return categoryMatch && dateMatch && specificDateMatch &&
                                            unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                            unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            } else if (filter === 'ok' || filter === 'failed') {
                                                // Excluir cajas de los filtros de estado
                                                const statusMatch = unit.status === filter && !isBox;
                                                const dateMatch = dateFilter === 'all' || 
                                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                return statusMatch && dateMatch && specificDateMatch &&
                                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            } else {
                                                // Filtros de categoría (a, b, c, d, e) - excluir cajas
                                                const categoryMatch = unit.categorie?.toLowerCase() === filter && !isBox;
                                                const dateMatch = dateFilter === 'all' || 
                                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                                return categoryMatch && dateMatch && specificDateMatch &&
                                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                            }
                                        } else {
                                            // Para otros proyectos, usar lógica original
                                            const categoryMatch = filter === 'all' || unit.status === filter;
                                            const dateMatch = dateFilter === 'all' || 
                                                (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                                (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                            const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                            return categoryMatch && dateMatch && specificDateMatch &&
                                                unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                                unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                                        }
                                    });
                                    
                                    // Agrupar por unitId y tomar solo el último escaneo de cada batería
                                    const latestScans = new Map();
                                    filteredUnits.forEach(unit => {
                                        const existing = latestScans.get(unit.unitId);
                                        if (!existing || new Date(unit.timestamp) > new Date(existing.timestamp)) {
                                            latestScans.set(unit.unitId, unit);
                                        }
                                    });
                                    
                                    return Array.from(latestScans.values());
                                }
                            })()
                                .map((unit, index) => {
                                // Determinar si es una batería o una caja
                                const isBattery = unit.unitId?.startsWith('BAT');
                                const isBox = unit.unitId?.startsWith('BOX');
                                
                                // Determinar color de la batería
                                let batteryColor = '#808080'; // Gris por defecto
                                
                                // Si el filtro activo es por cajas, mostrar color naranja
                                if (filter === 'boxes') {
                                    batteryColor = '#FF8C00'; // Naranja para cajas
                                } else if (filter === 'ok' || filter === 'failed') {
                                // Si el filtro activo es por status (ok/failed), mostrar colores por status
                                    if (unit.status === 'ok') {
                                        batteryColor = '#4CAF50'; // Verde para OK
                                    } else if (unit.status === 'failed') {
                                        batteryColor = '#F44336'; // Rojo para FALLIDOS
                                    } else if (unit.status === 'pending') {
                                        batteryColor = '#ffd43b'; // Amarillo para pendientes
                                    } else {
                                        batteryColor = '#808080'; // Gris para otros status
                                    }
                                } else {
                                    // Si el filtro es por categoría o 'all', mostrar colores por categoría
                                    if (unit.categorie === 'A') {
                                        batteryColor = '#00BFFF'; // Azul claro
                                    } else if (unit.categorie === 'B') {
                                        batteryColor = '#0000ff'; // Azul
                                    } else if (unit.categorie === 'C') {
                                        batteryColor = '#ffff00'; // Amarillo
                                    } else if (unit.categorie === 'D') {
                                        batteryColor = '#8A2BE2'; // Violeta
                                    } else if (unit.categorie === 'E') {
                                        batteryColor = '#800080'; // Morado
                                    } else {
                                        // Fallback a colores por status si no hay categoría
                                        if (unit.status === 'ok') {
                                            batteryColor = '#4CAF50';
                                        } else if (unit.status === 'pending') {
                                            batteryColor = '#ffd43b';
                                        } else {
                                            batteryColor = '#F44336';
                                        }
                                    }
                                }
                                
                                // Color para cajas
                                const boxColor = filter === 'boxes' ? '#FF8C00' : '#8B4513'; // Naranja si filtro de cajas, café si no
                                
                                const markerColor = isBox ? boxColor : batteryColor;

                                // Si estamos haciendo tracking de una batería específica, mostrar números de secuencia
                                const isTracking = selectedBatteryCode && unit.unitId === selectedBatteryCode;
                                let sequenceNumber: number | string = '';
                                
                                if (isTracking) {
                                    // Obtener todas las posiciones de esta batería y encontrar el índice
                                    const batteryPositions = units.positions
                                        .filter(p => p.unitId === selectedBatteryCode)
                                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                    const sequenceIndex = batteryPositions.findIndex(p => p === unit);
                                    sequenceNumber = sequenceIndex + 1;
                                }

                                // Crear icono según el tipo (triangular para baterías, cuadrado para cajas)
                                const customIcon = L.divIcon({
                                    className: 'custom-div-icon',
                                    html: isBox ? 
                                        // Marcador cuadrado para cajas
                                        `<div style="
                                            position: relative;
                                            width: 20px;
                                            height: 20px;
                                            background: ${markerColor};
                                            border: 2px solid white;
                                            border-radius: 3px;
                                            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                                        ">
                                            ${isTracking ? `<div style="
                                                position: absolute;
                                                top: -8px;
                                                left: -8px;
                                                width: 16px;
                                                height: 16px;
                                                background: #ff6b35;
                                                border: 2px solid white;
                                                border-radius: 50%;
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                font-size: 10px;
                                                font-weight: bold;
                                                color: white;
                                                z-index: 1000;
                                            ">${sequenceNumber}</div>` : ''}
                                        </div>` :
                                        // Marcador triangular para baterías
                                        `<div style="
                                            position: relative;
                                            width: 0;
                                            height: 0;
                                            border-left: 10px solid transparent;
                                            border-right: 10px solid transparent;
                                            border-bottom: 20px solid ${markerColor};
                                            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                                        ">
                                            ${isTracking ? `<div style="
                                                position: absolute;
                                                top: -15px;
                                                left: -8px;
                                                width: 16px;
                                                height: 16px;
                                                background: #ff6b35;
                                                border: 2px solid white;
                                                border-radius: 50%;
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                font-size: 10px;
                                                font-weight: bold;
                                                color: white;
                                                z-index: 1000;
                                            ">${sequenceNumber}</div>` : ''}
                                        </div>`,
                                    iconSize: [20, 20],
                                    iconAnchor: isBox ? [10, 10] : [10, 20] // Centrar el cuadrado, apuntar el triángulo
                                });

                                    return (
                                    <Marker
                                            key={index}
                                        position={[unit.position.lat, unit.position.lng]}
                                        icon={customIcon}
                                    >
                                        <Popup>
                                            <div 
                                                className="custom-popup"
                                                style={{ 
                                                    backgroundColor: '#1a1b23', 
                                                    color: '#c1c2c5', 
                                                    padding: '16px', 
                                                    borderRadius: '8px',
                                                    minWidth: '300px',
                                                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
                                                    border: '1px solid #74c0fc',
                                                    boxShadow: '0 4px 16px rgba(116, 192, 252, 0.2)',
                                                    position: 'relative'
                                                }}>
                                                {/* Botón de cerrar personalizado */}
                                                <button
                                                    onClick={() => {
                                                        // Cerrar el popup
                                                        const popup = document.querySelector('.leaflet-popup');
                                                        if (popup) {
                                                            popup.remove();
                                                        }
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#909296',
                                                        fontSize: '18px',
                                                        cursor: 'pointer',
                                                        width: '24px',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '50%',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const target = e.target as HTMLButtonElement;
                                                        target.style.backgroundColor = '#ff4444';
                                                        target.style.color = '#ffffff';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const target = e.target as HTMLButtonElement;
                                                        target.style.backgroundColor = 'transparent';
                                                        target.style.color = '#909296';
                                                    }}
                                                >
                                                    ×
                                                </button>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    marginBottom: '12px',
                                                    paddingBottom: '8px',
                                                    borderBottom: '1px solid #373a40'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        <div style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            backgroundColor: unit.status === 'ok' ? '#00C853' : '#ff4444',
                                                            marginRight: '8px'
                                                        }}></div>
                                                        <strong style={{ 
                                                            fontSize: '16px', 
                                                            color: '#ffffff',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            {unit.unitId}
                                                        </strong>
                                                    </div>
                                                    {!isBox && (
                                                        <div style={{
                                                            backgroundColor: unit.categorie === 'a' ? '#00bcd4' : 
                                                                           unit.categorie === 'b' ? '#339af0' : 
                                                                           unit.categorie === 'c' ? '#fab005' : 
                                                                           unit.categorie === 'd' ? '#9775fa' : 
                                                                           unit.categorie === 'e' ? '#e64980' : '#6c757d',
                                                            color: '#ffffff',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            {unit.categorie?.toUpperCase() || 'N/A'}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {isTracking && (
                                                    <div style={{ marginBottom: '8px' }}>
                                                        <span style={{ color: '#909296', fontSize: '14px' }}>Paso:</span>
                                                        <span style={{ color: '#ffffff', fontWeight: '600', marginLeft: '8px' }}>
                                                            {sequenceNumber} de {units.positions.filter(p => p.unitId === selectedBatteryCode).length}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{ color: '#909296', fontSize: '14px' }}>Estado:</span>
                                                    <span style={{ 
                                                        color: unit.status === 'ok' ? '#00C853' : '#ff4444', 
                                                        fontWeight: '600', 
                                                        marginLeft: '8px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {unit.status}
                                                    </span>
                                                </div>
                                                
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{ color: '#909296', fontSize: '14px' }}>Timestamp:</span>
                                                    <span style={{ color: '#ffffff', fontWeight: '600', marginLeft: '8px' }}>
                                                        {new Date(unit.timestamp).toLocaleString('es-MX', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{ color: '#909296', fontSize: '14px' }}>Técnico:</span>
                                                    <span style={{ color: '#74c0fc', fontWeight: '600', marginLeft: '8px' }}>{unit.technician}</span>
                                                </div>
                                                
                                                <div style={{ marginBottom: '0' }}>
                                                    <span style={{ color: '#909296', fontSize: '14px' }}>Ubicación:</span>
                                                    <span style={{ color: '#ffffff', fontWeight: '600', marginLeft: '8px' }}>
                                                        {unit.location ? unit.location.split('|')[0].replace('Checkpoint:', '').trim() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    );
                                })}
                                
                                {/* Marcador de ubicación del usuario */}
                                {userLocation && (
                                    <Marker
                                        position={[userLocation.lat, userLocation.lng]}
                                        icon={userLocationIcon}
                                    >
                                        <Popup>
                                            <div style={{
                                                backgroundColor: '#1A1B1E',
                                                color: '#ffffff',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid #339AF0',
                                                boxShadow: '0 4px 16px rgba(116, 192, 252, 0.2)',
                                                minWidth: '200px'
                                            }}>
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{ color: '#74c0fc', fontSize: '16px', fontWeight: '600' }}>
                                                        📍 Tu Ubicación
                                                    </span>
                                                </div>
                                                
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{ color: '#909296', fontSize: '14px' }}>Coordenadas:</span>
                                                    <span style={{ color: '#ffffff', fontWeight: '600', marginLeft: '8px' }}>
                                                        {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                                                    </span>
                                                </div>
                                                
                                                <div style={{ marginBottom: '0' }}>
                                                    <span style={{ color: '#909296', fontSize: '14px' }}>Estado:</span>
                                                    <span style={{ color: '#51cf66', fontWeight: '600', marginLeft: '8px' }}>
                                                        Ubicación obtenida
                                                    </span>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}
                    </MapContainer>
                    </>
                ) : (
                    // Para otros proyectos, usar el mapa normal
                    <>
                        <style>
                            {`
                                .leaflet-control-attribution {
                                    display: none !important;
                                }
                                
                                /* Ocultar popup nativo blanco de Leaflet */
                                .leaflet-popup-content-wrapper {
                                    background: transparent !important;
                                    box-shadow: none !important;
                                    border: none !important;
                                    padding: 0 !important;
                                }
                                
                                .leaflet-popup-content {
                                    margin: 0 !important;
                                    padding: 0 !important;
                                }
                                
                                .leaflet-popup-tip {
                                    background: transparent !important;
                                    box-shadow: none !important;
                                    border: none !important;
                                }
                                
                                /* Estilos para móvil horizontal */
                                @media (max-width: 768px) {
                                    .map-container {
                                        height: calc(100vh - 80px) !important;
                                    }
                                    
                                    .map-paper {
                                        height: calc(100vh - 80px) !important;
                                    }
                                }
                            `}
                        </style>
                    <MapContainer
                            center={(() => {
                                // Extraer coordenadas de la planta del proyecto
                                const coordMatch = project.location?.plant_coordinates?.match(/q=(-?\d+\.\d+),?\s*(-?\d+\.\d+)/);
                                if (coordMatch) {
                                    return [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
                                }
                                return [22.77932374431193, -102.48588996713129]; // Valor por defecto
                            })()}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            ref={setMapRef}
                    >
                        <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                            />
                        {units.positions
                            .filter(unit => {
                                // Filtro por status o categoría
                                let statusOrCategoryMatch = false;
                                if (filter === 'ok' || filter === 'failed' || filter === 'pending') {
                                    statusOrCategoryMatch = unit.status === filter;
                                } else if (filter === 'all') {
                                    statusOrCategoryMatch = true;
                                } else {
                                    statusOrCategoryMatch = unit.categorie?.toLowerCase() === filter;
                                }
                                
                                // Filtro por fecha
                                const dateMatch = dateFilter === 'all' || 
                                    (dateFilter === 'today' && isToday(new Date(unit.timestamp))) ||
                                    (dateFilter === 'yesterday' && isYesterday(new Date(unit.timestamp)));
                                
                                // Filtro por fecha específica
                                const specificDateMatch = !selectedDate || (selectedDate !== null && isSameDate(new Date(unit.timestamp), selectedDate));
                                
                                // Filtro por batterycode seleccionado (solo para el mapa)
                                const batteryCodeMatch = !selectedBatteryCode || unit.unitId === selectedBatteryCode;
                                
                                return statusOrCategoryMatch && dateMatch && specificDateMatch && batteryCodeMatch &&
                                    unit.unitId?.toLowerCase().includes(vinFilter.toLowerCase()) &&
                                    unit.technician?.toLowerCase().includes(techFilter.toLowerCase());
                            })
                            .map((unit, index) => {
                                // Determinar color del marcador
                                let markerColor = '#808080'; // Gris por defecto
                                
                                // Prioridad especial para filtro "all" en proyectos no-Panasonic
                                if (filter === 'all' && !isPanasonicProject) {
                                    markerColor = '#2196F3'; // Azul para filtro "todos" solo en proyectos no-Panasonic
                                } else if (filter === 'ok' || filter === 'failed' || filter === 'pending') {
                                    // Si el filtro activo es por status (ok/failed/pending), mostrar colores por status
                                    if (unit.status === 'ok') {
                                        markerColor = '#4CAF50'; // Verde para OK
                                    } else if (unit.status === 'failed') {
                                        markerColor = '#F44336'; // Rojo para FALLIDOS
                                    } else if (unit.status === 'pending') {
                                        markerColor = '#FFC107'; // Amarillo para PENDIENTES
                                    } else {
                                        markerColor = '#808080'; // Gris para otros status
                                    }
                                } else {
                                    // Si el filtro es por categoría, mostrar colores por categoría
                                    if (unit.categorie === 'a') {
                                        markerColor = '#00BFFF'; // Azul claro
                                    } else if (unit.categorie === 'b') {
                                        markerColor = '#0000ff'; // Azul
                                    } else if (unit.categorie === 'c') {
                                        markerColor = '#ffff00'; // Amarillo
                                    } else if (unit.categorie === 'd') {
                                        markerColor = '#8A2BE2'; // Violeta
                                    } else if (unit.categorie === 'e') {
                                        markerColor = '#800080'; // Morado
                                    }
                                }
                                
                                const customIcon = new L.Icon({
                                    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2L22 20H2L12 2Z" fill="${markerColor}"/>
                                        </svg>
                                    `),
                                    iconSize: [24, 24],
                                    iconAnchor: [12, 24],
                                    popupAnchor: [0, -24],
                                    className: 'triangle-marker'
                                });

                                // LOG para depuración
                                console.log('Datos del marcador (unit):', unit);

                                return (
                                    <Marker
                            key={index}
                            position={[unit.position.lat, unit.position.lng]}
                            icon={customIcon}
                            eventHandlers={{
                                add: (e) => {
                                    e.target.getElement().setAttribute('data-battery-code', unit.unitId);
                                }
                            }}
                        >
                                        <Popup>
                                            <div 
                                                className="custom-popup"
                                                style={{ 
                                                    backgroundColor: '#1a1b23', 
                                                    color: '#c1c2c5', 
                                                    padding: '0',
                                                    borderRadius: '12px',
                                                    minWidth: '380px',
                                                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
                                                    boxShadow: '0 4px 16px rgba(116, 192, 252, 0.2)',
                                                    border: '1px solid #74c0fc',
                                                    position: 'relative'
                                                }}>
                                                {/* Botón de cerrar personalizado */}
                                                <button
                                                    onClick={() => {
                                                        // Cerrar el popup
                                                        const popup = document.querySelector('.leaflet-popup');
                                                        if (popup) {
                                                            popup.remove();
                                                        }
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '12px',
                                                        right: '12px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#909296',
                                                        fontSize: '20px',
                                                        cursor: 'pointer',
                                                        width: '28px',
                                                        height: '28px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '50%',
                                                        transition: 'all 0.2s ease',
                                                        zIndex: 1000
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const target = e.target as HTMLButtonElement;
                                                        target.style.backgroundColor = '#ff4444';
                                                        target.style.color = '#ffffff';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const target = e.target as HTMLButtonElement;
                                                        target.style.backgroundColor = 'transparent';
                                                        target.style.color = '#909296';
                                                    }}
                                                >
                                                    ×
                                                </button>
                                                {isPanasonicProject ? (
                                                    // Popup específico para proyecto Panasonic (ID 28)
                                                    <>
                                                        {/* Header con código y categoría */}
                                                        <div style={{
                                                            background: '#1a1b23',
                                                            padding: '16px 20px',
                                                            borderRadius: '12px 12px 0 0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            borderBottom: '1px solid #373a40'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                <div style={{
                                                                    width: '10px',
                                                                    height: '10px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: unit.status === 'ok' ? '#00C853' : '#ff4444',
                                                                    marginRight: '12px'
                                                                }}></div>
                                                                <div style={{
                                                                    color: '#ffffff',
                                                                    fontSize: '18px',
                                                                    fontWeight: '700',
                                                                    letterSpacing: '0.5px',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {unit.unitId}
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                backgroundColor: unit.categorie === 'a' ? '#00bcd4' : 
                                                                               unit.categorie === 'b' ? '#339af0' : 
                                                                               unit.categorie === 'c' ? '#fab005' : 
                                                                               unit.categorie === 'd' ? '#9775fa' : 
                                                                               unit.categorie === 'e' ? '#e64980' : '#6c757d',
                                                                color: '#ffffff',
                                                                padding: '6px 12px',
                                                                borderRadius: '16px',
                                                                fontSize: '12px',
                                                                fontWeight: '700',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px'
                                                            }}>
                                                                {unit.categorie?.toUpperCase() || 'N/A'}
                                                            </div>
                                                        </div>

                                                        {/* Contenido del popup */}
                                                        <div style={{ padding: '20px' }}>
                                                            {/* Debug: Log para verificar los datos en el popup */}
                                                            {(() => {
                                                                console.log('Datos en el popup para proyecto 28:', {
                                                                    unitId: unit.unitId,
                                                                    timestamp: unit.timestamp,
                                                                    boxtimestamp: unit.boxtimestamp,
                                                                    boxcode: unit.boxcode,
                                                                    position: unit.position,
                                                                    status: unit.status,
                                                                    categorie: unit.categorie
                                                                });
                                                                return null;
                                                            })()}
                                                            
                                                            {/* Estado */}
                                                            <div style={{ 
                                                                marginBottom: '16px',
                                                                paddingBottom: '12px',
                                                                borderBottom: '1px solid #373a40'
                                                            }}>
                                                                <div style={{ color: '#909296', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                                    Estado
                                                                </div>
                                                                <div style={{ 
                                                                    color: unit.status === 'ok' ? '#00C853' : '#ff4444', 
                                                                    fontSize: '16px', 
                                                                    fontWeight: '600',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {unit.status?.toUpperCase() || 'N/A'}
                                                                </div>
                                                            </div>

                                                            {/* Timestamp */}
                                                            <div style={{ marginBottom: '16px' }}>
                                                                <div style={{ color: '#909296', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                                    Timestamp
                                                                </div>
                                                                <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                                                                    {unit.timestamp ? new Date(unit.timestamp).toLocaleString('es-MX', {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        second: '2-digit'
                                                                    }) : 'N/A'}
                                                                </div>
                                                            </div>

                                                            {/* Técnico */}
                                                            <div style={{ marginBottom: '16px' }}>
                                                                <div style={{ color: '#909296', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                                    Técnico
                                                                </div>
                                                                <div style={{ color: '#74c0fc', fontSize: '14px', fontWeight: '500' }}>
                                                                    {unit.technician}
                                                                </div>
                                                            </div>

                                                            {/* Ubicación - Solo checkpoint */}
                                                            <div style={{ marginBottom: '0' }}>
                                                                <div style={{ color: '#909296', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                                    Ubicación
                                                                </div>
                                                                <div style={{ 
                                                                    color: '#ffffff', 
                                                                    fontSize: '14px', 
                                                                    fontWeight: '500',
                                                                    backgroundColor: '#2c2e33',
                                                                    padding: '8px 12px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #373a40'
                                                                }}>
                                                                    {unit.location ? unit.location.split('|')[0].replace('Checkpoint:', '').trim() : 'N/A'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    // Popup para otros proyectos (mantener funcionalidad original)
                                                    <>
                                                        <Group justify="space-between" pb="xs">
                                                            <Badge 
                                                                size="lg"
                                                                color={unit.status === 'ok' ? 'green' : 
                                                                       unit.status === 'pending' ? 'yellow' : 'red'}
                                                                variant="filled"
                                                                fullWidth
                                                            >
                                                                {unit.status === 'ok' ? 'UNIDAD OK' : 
                                                                 unit.status === 'pending' ? 'UNIDAD EN REVISIÓN' : 'UNIDAD CON FALLAS'}
                                                            </Badge>
                                                        </Group>

                                                        <Stack gap="xs">
                                                            <Group gap="xs" align="center">
                                                                <IconSearch size={18} style={{ color: '#909296' }}/>
                                                                <Text span size="sm" c="dimmed">VIN:</Text>
                                                                <Text span size="sm" fw={600} c="blue.6">{unit.unitId}</Text>
                                                            </Group>

                                                            <Group gap="xs" align="center">
                                                                <IconUser size={18} style={{ color: '#909296' }}/>
                                                                <Text span size="sm" c="dimmed">Técnico:</Text>
                                                                <Text span size="sm" fw={600} c="blue.6">{unit.technician}</Text>
                                                            </Group>

                                                            <Group gap="xs" align="center">
                                                                <IconBatteryFilled 
                                                                    size={18} 
                                                                    style={{ 
                                                                        color: unit.battery < 20 ? '#ff4444' : 
                                                                               unit.battery < 50 ? '#ffbb33' : '#00C853'
                                                                    }}
                                                                />
                                                                <Text span size="sm" c="dimmed">Batería:</Text>
                                                                <Text 
                                                                    span
                                                                    size="sm" 
                                                                    fw={600} 
                                                                    c={unit.battery < 20 ? 'red' : unit.battery < 50 ? 'yellow' : 'green'}
                                                                >
                                                                    {unit.battery}%
                                                                </Text>
                                                            </Group>

                                                            <Divider my="xs" />

                                                            <Group gap="xs" align="center">
                                                                <IconCalendar size={18} style={{ color: '#909296' }}/>
                                                                <Text span size="sm" c="dimmed">Actualizado:</Text>
                                                                <Text span size="sm" fw={600} c="gray.0">
                                                                    {new Date(unit.timestamp).toLocaleString('es-MX', {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </Text>
                                                            </Group>

                                                            <Group justify="space-between" align="center">
                                                                <Group gap="xs" align="center">
                                                                    <IconMapPin size={18} style={{ color: '#909296' }}/>
                                                                    <Text span size="sm" c="dimmed">Ubicación:</Text>
                                                                    <Text 
                                                                        span 
                                                                        size="sm" 
                                                                        fw={600} 
                                                                        c="blue.6"
                                                                        style={{ 
                                                                            cursor: 'pointer',
                                                                            textDecoration: 'underline',
                                                                            '&:hover': {
                                                                                color: '#339af0'
                                                                            }
                                                                        }}
                                                                        onClick={() => {
                                                                            // Detectar si es iOS (iPhone/iPad)
                                                                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                                                                                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                                                                            
                                                                            let mapsUrl: string;
                                                                            let mapsApp: string;
                                                                            
                                                                            if (isIOS) {
                                                                                // Usar Apple Maps en iOS
                                                                                mapsUrl = `http://maps.apple.com/?q=${unit.position.lat},${unit.position.lng}`;
                                                                                mapsApp = 'Apple Maps';
                                                                            } else {
                                                                                // Usar Google Maps en Android/Desktop
                                                                                mapsUrl = `https://www.google.com/maps?q=${unit.position.lat},${unit.position.lng}`;
                                                                                mapsApp = 'Google Maps';
                                                                            }
                                                                            
                                                                            // Abrir en la aplicación de mapas correspondiente
                                                                            window.open(mapsUrl, '_blank');
                                                                            
                                                                            // También copiar coordenadas al portapapeles
                                                                            navigator.clipboard.writeText(`${unit.position.lat}, ${unit.position.lng}`).then(() => {
                                                                                notifications.show({
                                                                                    title: 'Coordenadas copiadas',
                                                                                    message: `Las coordenadas se han copiado al portapapeles y abierto en ${mapsApp}`,
                                                                                    color: 'blue'
                                                                                });
                                                                            }).catch(() => {
                                                                                // Fallback si no se puede copiar
                                                                                notifications.show({
                                                                                    title: 'Ubicación abierta',
                                                                                    message: `Se ha abierto la ubicación en ${mapsApp}`,
                                                                                    color: 'green'
                                                                                });
                                                                            });
                                                                        }}
                                                                    >
                                                                        {unit.position.lat.toFixed(6)}, {unit.position.lng.toFixed(6)}
                                                                    </Text>
                                                                </Group>
                                                                
                                                                {/* Icono de compartir en la esquina derecha */}
                                                                <ActionIcon
                                                                    size="sm"
                                                                    variant="subtle"
                                                                    color="blue"
                                                                    onClick={async () => {
                                                                        // Preparar datos para compartir
                                                                        const shareData = {
                                                                            title: `Información de Unidad - ${unit.unitId}`,
                                                                            text: `VIN: ${unit.unitId}
Técnico: ${unit.technician}
Batería: ${unit.battery}%
Estado: ${unit.status === 'ok' ? 'OK' : unit.status === 'pending' ? 'EN REVISIÓN' : 'CON FALLAS'}
Actualizado: ${new Date(unit.timestamp).toLocaleString('es-MX', {
                                                                                day: '2-digit',
                                                                                month: '2-digit',
                                                                                year: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
Ubicación: ${unit.position.lat.toFixed(6)}, ${unit.position.lng.toFixed(6)}`,
                                                                            url: `https://www.google.com/maps?q=${unit.position.lat},${unit.position.lng}`
                                                                        };

                                                                        // Verificar si el navegador soporta la Web Share API
                                                                        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                                                                            try {
                                                                                await navigator.share(shareData);
                                                                                notifications.show({
                                                                                    title: 'Compartido exitosamente',
                                                                                    message: 'La información se ha compartido usando el modal nativo',
                                                                                    color: 'green'
                                                                                });
                                                                            } catch (error: any) {
                                                                                // El usuario canceló el compartir
                                                                                if (error.name !== 'AbortError') {
                                                                                    console.error('Error al compartir:', error);
                                                                                    notifications.show({
                                                                                        title: 'Error al compartir',
                                                                                        message: 'No se pudo compartir la información',
                                                                                        color: 'red'
                                                                                    });
                                                                                }
                                                                            }
                                                                        } else {
                                                                            // Fallback: copiar al portapapeles
                                                                            const textToCopy = `${shareData.title}\n\n${shareData.text}\n\nUbicación: ${shareData.url}`;
                                                                            try {
                                                                                await navigator.clipboard.writeText(textToCopy);
                                                                                notifications.show({
                                                                                    title: 'Información copiada',
                                                                                    message: 'La información se ha copiado al portapapeles',
                                                                                    color: 'blue'
                                                                                });
                                                                            } catch (error: any) {
                                                                                notifications.show({
                                                                                    title: 'Error al copiar',
                                                                                    message: 'No se pudo copiar la información al portapapeles',
                                                                                    color: 'red'
                                                                                });
                                                                            }
                                                                        }
                                                                    }}
                                                                    title="Compartir información"
                                                                >
                                                                    <IconShare size={16} />
                                                                </ActionIcon>
                                                            </Group>
                                                        </Stack>
                                                    </>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })
                        }
                        
                        {/* Marcador de ubicación del usuario */}
                        {userLocation && (
                            <Marker
                                position={[userLocation.lat, userLocation.lng]}
                                icon={userLocationIcon}
                            >
                                <Popup>
                                    <div style={{
                                        backgroundColor: '#1A1B1E',
                                        color: '#ffffff',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid #339AF0',
                                        boxShadow: '0 4px 16px rgba(116, 192, 252, 0.2)',
                                        minWidth: '200px'
                                    }}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <span style={{ color: '#74c0fc', fontSize: '16px', fontWeight: '600' }}>
                                                📍 Tu Ubicación
                                            </span>
                                        </div>
                                        
                                        <div style={{ marginBottom: '8px' }}>
                                            <span style={{ color: '#909296', fontSize: '14px' }}>Coordenadas:</span>
                                            <span style={{ color: '#ffffff', fontWeight: '600', marginLeft: '8px' }}>
                                                {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                                            </span>
                                        </div>
                                        
                                        <div style={{ marginBottom: '0' }}>
                                            <span style={{ color: '#909296', fontSize: '14px' }}>Estado:</span>
                                            <span style={{ color: '#51cf66', fontWeight: '600', marginLeft: '8px' }}>
                                                Ubicación obtenida
                                            </span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                    </>
                )}
                </Paper>
                    </Stack>
                </div>
            </div>
        </Modal>
        </>
    );
};

interface TechnicianProjectProgress {
    project_id: number;
    technician_name: string;
    completed_parts: number;
    total_assigned_parts: number;
}

interface CustomComboboxItem {
    value: string;
    label: string;
    color?: string;
}

// Primero definimos la interfaz para la respuesta
interface ProjectResponse {
    id: number;
    name: string;
    status: string;
    client: string;
    start_date: string;
    end_date: string;
    progress: number;
    total_parts: number;
    completed_parts: number;
    project_type: string;
    description?: string;
    location?: any;
    documents?: any[];
    equipment?: string[];
    assigned_to?: string[];
}

// Modificar la función formatDateForAPI para asegurar el formato correcto
const formatDateForAPI = (date: Date | string | null): string => {
    if (!date) return '';
    const d = new Date(date);
    // Asegurarnos de que la fecha se formatea con hora (00:00:00)
    return d.toISOString().split('T')[0] + 'T00:00:00';
};

// Definir una interfaz extendida para los items del combobox
interface StatusComboboxItem {
    value: string;
    label: string;
    color?: string;
}

// Dentro del componente Projects, después de obtener employees del contexto
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
    const [projectFailedParts, setProjectFailedParts] = useState<{[key: number]: number}>({});
    const [newProjectData, setNewProjectData] = useState<Partial<Project>>({
        name: '',
        status: 'activo',
        progress: 0,
        client: '',
        start_date: '',
        end_date: '',
        completed_parts: 0,
        total_parts: 0,
        assigned_to: [],
        documents: [],
        equipment: predefinedEquipment,
        project_type: 'bench',
        requires_hotel: false,
        location: {
            plant_name: '',
            plant_address: '',
            plant_coordinates: '',
            contact_name: '',
            contact_phone: '',
            contact_email: '',
            hotel_name: '',
            hotel_address: '',
            hotel_coordinates: '',
            hotel_phone: ''
        }
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
                categorie?: string; // Para proyecto 28
                boxcode?: string; // Para proyecto 28
                boxtimestamp?: Date | null; // Para proyecto 28
            }>;
        };
        batteryCodes?: string[]; // Para proyecto 28 - códigos de batería para la barra lateral
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const filterParam = searchParams.get('filter');

    // Obtener empleados del contexto
    const { employees, setEmployees } = useEmployees();
    const { projects, setProjects, loading, error, refreshProjects } = useProjects();

    // MOVER la definición aquí donde tenemos acceso a employees
    const availableTechnicians = employees.map((emp: Employee) => ({
        value: emp.full_name,
        label: emp.full_name
    }));
    console.log('Available technicians for dropdown:', availableTechnicians);

    // Antes de los filtros, asegurar que projects es un array y tiene los campos necesarios
    const safeProjects = Array.isArray(projects) ? projects : [];
    console.log('Safe projects:', safeProjects);

    // Modificar cómo obtenemos la lista de ciudades
    const cities = ['todas', ...Array.from(new Set(safeProjects
        .map(project => getCityFromAddress(project?.location?.plant_address))
        .filter(Boolean)
    ))];

    // Obtener técnicos únicos de los proyectos
    const technicians = ['todos', ...Array.from(new Set(safeProjects
        .flatMap(project => project?.assigned_to || [])
        .filter(Boolean)
    ))];
    console.log('Available technicians:', technicians);

    // Actualizar cuando el componente se monta o cuando cambia la URL
    useEffect(() => {
        if (filterParam) {
            setSelectedStatus(filterParam.toLowerCase());
        }
    }, [filterParam]);

    // Modificar el filtrado de proyectos para que coincida con el estado del filtro
    const filteredProjects = safeProjects.filter(project => {
        // Filtrar por búsqueda
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
            project.name?.toLowerCase().includes(searchLower) ||
            project.client?.toLowerCase().includes(searchLower) ||
            project.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;

        // Filtrar por ciudad
        if (selectedCity && selectedCity !== 'todas') {
            const projectCity = getCityFromAddress(project?.location?.plant_address || '');
            if (projectCity !== selectedCity) return false;
        }

        // Filtrar por técnico
        if (selectedTechnician && selectedTechnician !== 'todos') {
            const hasTechnician = project.assigned_to?.includes(selectedTechnician);
            if (!hasTechnician) return false;
        }

        // Filtrar por estado - Modificado para manejar mayúsculas/minúsculas
        if (selectedStatus && selectedStatus !== 'todos') {
            return project.status.toLowerCase() === selectedStatus.toLowerCase();
        }

        return true;
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
            const formattedDate = startDate.toISOString().split('T')[0];
            console.log('Fecha formateada:', formattedDate); // Para debugging
            setNewProjectData((prev: Partial<Project>) => ({
                ...prev,
                start_date: formattedDate
            }));
        }
    }, [startDate]);

    useEffect(() => {
        if (endDate) {
            setNewProjectData((prev: Partial<Project>) => ({
                ...prev,
                end_date: endDate.toISOString().split('T')[0]
            }));
        }
    }, [endDate]);

    const clearForm = () => {
        setNewProjectData({
            name: '',
            status: 'activo',
            progress: 0,
            client: '',
            start_date: '',
            end_date: '',
            completed_parts: 0,
            total_parts: 0,
            assigned_to: [],
            documents: [],
            equipment: predefinedEquipment,
            project_type: 'bench',
            requires_hotel: false,
            location: {
                plant_name: '',
                plant_address: '',
                plant_coordinates: '',
                contact_name: '',
                contact_phone: '',
                contact_email: '',
                hotel_name: '',
                hotel_address: '',
                hotel_coordinates: '',
                hotel_phone: ''
            }
        });
        setSelectedClient(null);
        setSelectedPlant(null);
        setRequiresHotel(false);
        setStartDate(null);
        setEndDate(null);
    };

    // 4. Corregir la asignación de cityImage en el nuevo proyecto
    const getCityImage = (address: string): string => {
        const city = getCityFromAddress(address);
        return city in cityImages ? cityImages[city as keyof typeof cityImages] : cityImages.default;
    };

    const handleTechnicianClick = async (technicianName: string) => {
        try {
            // Obtener datos reales del técnico
            const technicianData = await employeeService.getTechnicianByName(technicianName);
            
            // Obtener estadísticas del técnico (esto podría venir de otro endpoint en el futuro)
            const techStats = {
                partsCompleted: 45,
                totalAssigned: 100,
                efficiency: 92,
                lastActivity: new Date().toISOString(),
            };

            modals.open({
                title: (
                    <Group>
                        <Avatar 
                            size="md" 
                            radius="xl"
                            color="violet"
                            src={technicianData.avatar}
                        >
                            {technicianName.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <div>
                            <Text size="lg" fw={500}>{technicianName}</Text>
                            <Badge color={technicianData.status === 'presente' ? 'green' : 'red'}>
                                {technicianData.status.toUpperCase()}
                            </Badge>
                        </div>
                    </Group>
                ),
                size: 'lg',
                children: (
                    <Stack>
                        {/* Sección de Contacto Rápido */}
                        <SimpleGrid cols={2}>
                            <Button 
                                variant="light" 
                                leftSection={<IconPhone size={20} />}
                                component="a"
                                href={`tel:${technicianData.phone}`}
                                fullWidth
                                onClick={(e) => {
                                    e.preventDefault();
                                    // Verificar si es un número válido
                                    if (technicianData.phone) {
                                        window.location.href = `tel:${technicianData.phone}`;
                                    } else {
                                        notifications.show({
                                            title: 'Error',
                                            message: 'No hay número de teléfono disponible',
                                            color: 'red'
                                        });
                                    }
                                }}
                            >
                                Llamar
                            </Button>
                            <Button 
                                variant="light"
                                leftSection={<IconMail size={20} />}
                                component="a"
                                href={`mailto:${technicianData.email}`}
                                fullWidth
                                onClick={(e) => {
                                    e.preventDefault();
                                    // Verificar si es un email válido
                                    if (technicianData.email) {
                                        window.location.href = `mailto:${technicianData.email}`;
                                    } else {
                                        notifications.show({
                                            title: 'Error',
                                            message: 'No hay correo electrónico disponible',
                                            color: 'red'
                                        });
                                    }
                                }}
                            >
                                Email
                            </Button>
                        </SimpleGrid>

                        {/* Resto del modal permanece igual */}
                        <Paper p="md" radius="md" withBorder>
                            <Group justify="space-between" mb="md">
                                <Text size="lg" fw={500}>Contribución al Proyecto</Text>
                                <RingProgress
                                    size={80}
                                    roundCaps
                                    thickness={8}
                                    sections={[{ value: (techStats.partsCompleted/techStats.totalAssigned) * 100, color: 'violet' }]}
                                    label={
                                        <Text ta="center" size="xs" fw={700}>
                                            {Math.round((techStats.partsCompleted/techStats.totalAssigned) * 100)}%
                                        </Text>
                                    }
                                />
                            </Group>

                            <SimpleGrid cols={2}>
                                <Paper p="sm" radius="md" bg="dark.6">
                                    <Group>
                                        <ThemeIcon color="blue" variant="light" size="lg">
                                            <IconChartBar size={20} />
                                        </ThemeIcon>
                                        <div>
                                            <Text size="xs" c="dimmed">Partes</Text>
                                            <Text fw={500}>{techStats.partsCompleted}/{techStats.totalAssigned}</Text>
                                        </div>
                                    </Group>
                                </Paper>

                                <Paper p="sm" radius="md" bg="dark.6">
                                    <Group>
                                        <ThemeIcon 
                                            color={techStats.efficiency >= 90 ? 'green' : 'yellow'} 
                                            variant="light" 
                                            size="lg"
                                        >
                                            <IconSettings size={20} />
                                        </ThemeIcon>
                                        <div>
                                            <Text size="xs" c="dimmed">Eficiencia</Text>
                                            <Text fw={500}>{techStats.efficiency}%</Text>
                                        </div>
                                    </Group>
                                </Paper>
                            </SimpleGrid>
                        </Paper>

                        {/* Información Adicional */}
                        <Paper p="md" radius="md" withBorder>
                            <Stack gap="sm">
                                <Group>
                                    <ThemeIcon color="blue" variant="light">
                                        <IconClock size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" c="dimmed">Última Actividad</Text>
                                        <Text>{new Date(techStats.lastActivity).toLocaleString()}</Text>
                                    </div>
                                </Group>

                                <Group>
                                    <ThemeIcon color="grape" variant="light">
                                        <IconMapPin size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" c="dimmed">Ubicación</Text>
                                        <Text>{technicianData.location || 'No disponible'}</Text>
                                    </div>
                                </Group>
                            </Stack>
                        </Paper>
                    </Stack>
                )
            });
        } catch (error) {
            console.error('Error al obtener datos del técnico:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los datos del técnico',
                color: 'red'
            });
        }
    };

    useEffect(() => {
        // Si llegamos desde Employees.tsx con un proyecto para mostrar
        if (location.state?.showProjectDetails) {
            const projectToShow = projects.find(p => p.id === location.state.openProject);
            if (projectToShow) {
                setSelectedProject(projectToShow);
            }
        }
    }, [location.state]);

    // Inicializar el contexto con los datos mock
    useEffect(() => {
        if (projects.length === 0) {
            const projectsWithDefaultImage = projects.map(project => ({
                ...project
            }));
            setProjects(projectsWithDefaultImage);
        }
    }, []);

    // Calcular failed parts para cada proyecto
    useEffect(() => {
        const calculateFailedParts = async () => {
            if (projects.length === 0) return;

            const failedPartsMap: {[key: number]: number} = {};

            for (const project of projects) {
                try {
                    // Para proyecto ID 28, usar tabla panasonic_checkpoints, para otros usar scanned_codes
                    const apiEndpoint = project.id === 28 
                        ? `/api/panasonic-checkpoints/project/${project.id}`
                        : `/api/scanned-codes/project/${project.id}`;
                    
                    const response = await fetch(apiEndpoint, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${getToken()}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Contar elementos con status 'FAILED' o 'failed'
                        const failedCount = data.filter((item: any) => 
                            item.status === 'FAILED' || item.status === 'failed'
                        ).length;
                        
                        failedPartsMap[project.id] = failedCount;
                        console.log(`Proyecto ${project.name} (ID: ${project.id}): ${failedCount} failed parts`);
                    } else {
                        console.warn(`No se pudieron obtener datos para proyecto ${project.id}`);
                        failedPartsMap[project.id] = 0;
                    }
                } catch (error) {
                    console.error(`Error al obtener failed parts para proyecto ${project.id}:`, error);
                    failedPartsMap[project.id] = 0;
                }
            }

            setProjectFailedParts(failedPartsMap);
        };

        calculateFailedParts();
    }, [projects]);

    const handleSaveProject = async () => {
        try {
            setIsSubmitting(true);
            
            // Validar campos requeridos
            if (!newProjectData.name || !newProjectData.client || !newProjectData.start_date || 
                !newProjectData.end_date || !newProjectData.total_parts || !newProjectData.project_type) {
                notifications.show({
                    title: 'Error',
                    message: 'Por favor complete todos los campos requeridos',
                    color: 'red'
                });
                return;
            }

            console.log('Project data before save:', newProjectData);
            console.log('Assigned technicians before save:', newProjectData.assigned_to);

            // Validar fechas
            if (new Date(newProjectData.start_date) >= new Date(newProjectData.end_date)) {
                notifications.show({
                    title: 'Error',
                    message: 'La fecha de inicio debe ser anterior a la fecha de fin',
                    color: 'red'
                });
                return;
            }

            // Validar tipo de proyecto
            if (!['bench', 'patios'].includes(newProjectData.project_type)) {
                notifications.show({
                    title: 'Error',
                    message: 'Tipo de proyecto inválido',
                    color: 'red'
                });
                return;
            }

            // Validar total de partes
            const totalParts = Number(newProjectData.total_parts);
            if (isNaN(totalParts) || totalParts <= 0) {
                notifications.show({
                    title: 'Error',
                    message: 'El total de partes debe ser un número mayor a 0',
                    color: 'red'
                });
                return;
            }

            // Crear FormData para enviar archivos
            const formData = new FormData();

            // Procesar documentos
            if (newProjectData.documents && newProjectData.documents.length > 0) {
                console.log('Processing documents:', newProjectData.documents);
                for (const doc of newProjectData.documents) {
                    if (doc.file) {
                        console.log('Adding file to formData:', doc.file.name);
                        formData.append('files', doc.file);
                    }
                }
            }

            // Preparar datos del proyecto
            // Si no requiere hotel, eliminamos el objeto hotel
            let location = { ...newProjectData.location };
            if (!newProjectData.requires_hotel && location && location.hotel_name) {
                delete location.hotel_name;
            }
            if (location && location.hotel_name) {
                if (typeof location.hotel_name !== 'string' || location.hotel_name.trim() === '') {
                    delete location.hotel_name;
                }
            }

            // Mapeo para backend (objeto plano)
            const locationForBackend = {
                plant_name: location?.plant_name || '',
                plant_address: location?.plant_address || '',
                plant_coordinates: location?.plant_coordinates || '',
                contact_name: location?.contact_name || '',
                contact_phone: location?.contact_phone || '',
                contact_email: location?.contact_email || '',
                hotel_name: location?.hotel_name || '',
                hotel_address: location?.hotel_address || '',
                hotel_coordinates: location?.hotel_coordinates || '',
                hotel_phone: location?.hotel_phone || ''
            };

            const projectJson = {
                name: newProjectData.name,
                status: newProjectData.status || 'activo',
                client: newProjectData.client,
                start_date: formatDateForAPI(newProjectData.start_date),
                end_date: formatDateForAPI(newProjectData.end_date),
                progress: Number(newProjectData.progress || 0),
                total_parts: totalParts,
                completed_parts: Number(newProjectData.completed_parts || 0),
                project_type: newProjectData.project_type,
                description: newProjectData.description || '',
                company_id: 1,
                location: locationForBackend,
                equipment: Array.isArray(newProjectData.equipment) 
                    ? newProjectData.equipment.map(eq => {
                        if (typeof eq === 'string') return eq;
                        if (typeof eq === 'object' && eq !== null) {
                            return (eq as { name?: string; id?: string }).name || 
                                   (eq as { id?: string }).id || 
                                   String(eq);
                        }
                        return String(eq);
                    })
                    : [],
                assigned_to: newProjectData.assigned_to || [],
                requires_hotel: newProjectData.requires_hotel,
            };
            
            // Agregar los datos del proyecto como JSON
            formData.append('project', JSON.stringify(projectJson));

            // Log de los datos que se están enviando
            console.log('Datos del proyecto:', projectJson);
            console.log('Archivos:', formData.getAll('files'));

            // Enviar los datos al servidor
            const response = await projectService.createProject(formData);
            
            if (response) {
                notifications.show({
                    title: 'Éxito',
                    message: 'Proyecto creado correctamente',
                    color: 'green'
                });
                setShowAdminModal(false);
                clearForm();
                await refreshProjects();
            }
        } catch (error) {
            console.error('Error al crear proyecto:', error);
            notifications.show({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Error al crear el proyecto',
                color: 'red'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Agregar este useEffect para debug
    useEffect(() => {
        console.log('Current projects:', projects);
        console.log('Loading state:', loading);
        console.log('Error state:', error);
    }, [projects, loading, error]);

    // Agregar console.log para ver qué es projects
    useEffect(() => {
        console.log('Projects type:', typeof projects);
        console.log('Is Array?', Array.isArray(projects));
        console.log('Projects value:', projects);
    }, [projects]);

    // Agregar este useEffect para debug
    useEffect(() => {
        if (projects?.length > 0) {
            console.log('=== Project Data Check ===');
            console.log('First project example:', projects[0]);
            console.log('Date format check:', {
                start_date: projects[0].start_date,
                end_date: projects[0].end_date,
                last_technician_date: projects[0].last_technician.date
            });
            console.log('Required fields check:', {
                id: typeof projects[0].id === 'number',
                name: typeof projects[0].name === 'string',
                status: ['activo', 'completado', 'en-progreso'].includes(projects[0].status),
                client: typeof projects[0].client === 'string'
            });
        }
    }, [projects]);

    // Agregar listener temporal para debug del evento project-status-updated
    useEffect(() => {
        const handleProjectStatusUpdate = () => {
            console.log('🎯 Evento project-status-updated recibido en Projects.tsx');
            console.log('📊 Número actual de proyectos:', projects.length);
        };

        console.log('👂 Configurando listener temporal en Projects.tsx');
        window.addEventListener('project-status-updated', handleProjectStatusUpdate);

        return () => {
            console.log('🧹 Limpiando listener temporal en Projects.tsx');
            window.removeEventListener('project-status-updated', handleProjectStatusUpdate);
        };
    }, [projects.length]);

    // Agregar esta función helper
    const getPlantNameFromAddress = (address: string) => {
        const plant = predefinedPlants.find(p => p.address === address);
        return plant?.name || 'Sin planta asignada';
    };

    const handleHotelSelect = (selectedHotel: any) => {
        console.log('Hotel seleccionado:', selectedHotel);
        
        setNewProjectData(prev => ({
            ...prev,
            location: {
                ...prev.location,
                plant_name: prev.location?.plant_name || '',
                plant_address: prev.location?.plant_address || '',
                plant_coordinates: prev.location?.plant_coordinates || '',
                contact_name: prev.location?.contact_name || '',
                contact_phone: prev.location?.contact_phone || '',
                contact_email: prev.location?.contact_email || '',
                hotel_name: selectedHotel.name,
                hotel_address: selectedHotel.address,
                hotel_coordinates: selectedHotel.coordinates || '',
                hotel_phone: selectedHotel.phone
            }
        }));
    };

    if (loading) {
        return (
            <Paper p="xl" style={{ position: 'relative', minHeight: '200px' }}>
                <LoadingOverlay visible={true} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            </Paper>
        );
    }

    if (error) {
        notifications.show({
            title: 'Error',
            message: 'Error al cargar los proyectos',
            color: 'red'
        });
    }

    // Agregar esta función después de getCityImage
    const getProjectBackgroundImage = (project: Project | null) => {
        if (!project) return cityImages.default;
        
        // Si no hay dirección, usar la imagen por defecto basada en el cliente
        if (!project.location?.plant_address) {
            // Si el cliente es Stellantis o APTIV, usar su imagen correspondiente
            if (project.client === 'Stellantis') {
                return cityImages['Saltillo'] || cityImages.default;
            }
            if (project.client === 'APTIV Cableados') {
                return cityImages['Saltillo'] || cityImages.default;
            }
            return cityImages.default;
        }
        
        const city = getCityFromAddress(project.location.plant_address);
        return cityImages[city as keyof typeof cityImages] || cityImages.default;
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
                        placeholder="Buscar por nombre de proyecto, cliente o descripción..."
                        leftSection={<IconSearch size={16} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        styles={(theme) => ({
                            input: {
                                '&:focus': {
                                    borderColor: theme.colors.blue[5]
                                }
                            }
                        })}
                    />
                    
                    <Group grow>
                        <Select
                            placeholder="Filtrar por ciudad"
                            data={cities.map(city => ({ 
                                value: city, 
                                label: city.charAt(0).toUpperCase() + city.slice(1)
                            }))}
                            value={selectedCity}
                            onChange={setSelectedCity}
                            clearable
                            searchable
                            leftSection={<IconMapPin size={16} />}
                            styles={(theme) => ({
                                input: {
                                    '&:focus': {
                                        borderColor: theme.colors.blue[5]
                                    }
                                }
                            })}
                        />
                        
                        <Select
                            placeholder="Filtrar por técnico"
                            data={technicians.map(tech => ({ value: tech, label: tech }))}
                            value={selectedTechnician}
                            onChange={setSelectedTechnician}
                            clearable
                            searchable
                            leftSection={<IconUser size={16} />}
                            styles={(theme) => ({
                                input: {
                                    '&:focus': {
                                        borderColor: theme.colors.blue[5]
                                    }
                                }
                            })}
                        />

                        <Select
                            placeholder="Filtrar por estado"
                            data={[
                                { value: 'todos', label: 'Todos los estados' } as StatusComboboxItem,
                                { value: 'activo', label: 'Activo', color: 'green' } as StatusComboboxItem,
                                { value: 'completado', label: 'Completado', color: 'blue' } as StatusComboboxItem,
                                { value: 'en-progreso', label: 'En Progreso', color: 'yellow' } as StatusComboboxItem
                            ]}
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            clearable
                            leftSection={<IconChevronDown size={16} />}
                            styles={(theme) => ({
                                input: {
                                    '&:focus': {
                                        borderColor: theme.colors.blue[5]
                                    }
                                }
                            })}
                        />
                    </Group>

                    {(searchQuery || selectedCity !== null || selectedTechnician !== null || selectedStatus !== null) && (
                        <Group justify="space-between" pt="xs">
                            <Text size="sm" c="dimmed">
                                {filteredProjects.length} {filteredProjects.length === 1 ? 'proyecto encontrado' : 'proyectos encontrados'}
                            </Text>
                            <Button
                                variant="subtle"
                                color="gray"
                                size="xs"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCity(null);
                                    setSelectedTechnician(null);
                                    setSelectedStatus(null);
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </Group>
                    )}
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
                                style={{ cursor: 'pointer', position: 'relative' }}
                                onClick={() => {
                                    console.log('Selecting project:', project);
                                    setSelectedProject(project);
                                }}
                            >
                                <Group justify="space-between" mb="xs">
                                    <Group gap="md">
                                    {/* Nombre del proyecto para escritorio */}
                                    <Text size="lg" fw={500} c="gray.2" visibleFrom="md">
                                        {project.name || 'Sin nombre'}
                                    </Text>
                                    {/* Nombre del proyecto truncado para móvil */}
                                    <Text size="lg" fw={500} c="gray.2" hiddenFrom="md">
                                        {(() => {
                                            const projectName = project.name || 'Sin nombre';
                                            return projectName.length > 18 
                                                ? projectName.substring(0, 15) + '...'
                                                : projectName;
                                        })()}
                                    </Text>
                                        <Text span c="cyan.4" fw={500}>
                                            {project.client || 'Sin cliente'}
                                        </Text>
                                        {/* Mostrar porcentaje de progreso solo en móvil */}
                                        <Text 
                                            span 
                                            c="lime" 
                                            fw={700}
                                            size="sm"
                                            hiddenFrom="md"
                                        >
                                            {Math.round((project.completed_parts / project.total_parts) * 100)}%
                                        </Text>
                                    </Group>
                                    <Group gap="sm">
                                        <Badge
                                            color={
                                                getProjectStatusFromProgress(project) === 'activo' ? 'blue' :
                                                getProjectStatusFromProgress(project) === 'completado' ? 'green' :
                                                getProjectStatusFromProgress(project) === 'en-progreso' ? 'teal' : 'yellow'
                                            }
                                        >
                                            {getProjectStatusFromProgress(project).toUpperCase()}
                                        </Badge>
                                        
                                        {/* Nombre de planta y icono de mapa solo en móvil */}
                                        <Group gap="xs" hiddenFrom="md">
                                            <IconBuildingFactory size={14} color="#666" />
                                            <Text size="sm" c="gray.3">
                                                {project.location?.plant_address ? getPlantNameFromAddress(project.location.plant_address) : 'Sin planta'}
                                            </Text>
                                            {(project.project_type === 'patios' || project.project_type === 'bench') && (
                                                <ActionIcon
                                                    variant="subtle"
                                                    color={project.project_type === 'patios' ? 'orange' : 'blue'}
                                                    size="sm"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            // Mostrar loading
                                                            notifications.show({
                                                                title: 'Cargando datos',
                                                                message: 'Obteniendo datos de escaneos del proyecto...',
                                                                color: 'blue',
                                                                loading: true
                                                            });

                                                            // Obtener datos reales de la base de datos
                                                            // Para proyecto ID 28, usar tabla panasonic_checkpoints, para otros usar scanned_codes
                                                            const apiEndpoint = project.id === 28 
                                                                ? `/api/panasonic-checkpoints/project/${project.id}`
                                                                : `/api/scanned-codes/project/${project.id}`;
                                                            
                                                            const response = await fetch(apiEndpoint, {
                                                                method: 'GET',
                                                                headers: {
                                                                    'Authorization': `Bearer ${getToken()}`,
                                                                    'Content-Type': 'application/json'
                                                                }
                                                            });
                                                            
                                                            if (!response.ok) {
                                                                throw new Error(`HTTP error! status: ${response.status}`);
                                                            }
                                                            
                                                            const scannedCodes = await response.json();
                                                            console.log('Datos reales obtenidos:', scannedCodes);
                                                            
                                                            // Cerrar notificación de loading
                                                            notifications.hide('loading');
                                                            
                                                            if (scannedCodes.length === 0) {
                                                            notifications.show({
                                                                    title: 'Sin datos',
                                                                    message: 'No hay códigos escaneados con coordenadas para este proyecto',
                                                                    color: 'yellow'
                                                                });
                                                                return;
                                                            }

                                                            // Para proyecto 28, obtener códigos de batería desde panasonic_quality_questions para la barra lateral
                                                            let batteryCodesForSidebar: string[] = [];
                                                            if (project.id === 28) {
                                                                try {
                                                                    // Obtener códigos de batería desde quality questions
                                                                    const qualityResponse = await fetch(`/api/panasonic-quality-questions/project/${project.id}`, {
                                                                        method: 'GET',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${getToken()}`,
                                                                            'Content-Type': 'application/json'
                                                                        }
                                                                    });
                                                                    
                                                                    if (qualityResponse.ok) {
                                                                        const qualityData = await qualityResponse.json();
                                                                        console.log('Datos de quality questions:', qualityData);
                                                                        
                                                                        // Extraer códigos de batería únicos con sus categorías
                                                                        const batteryData = new Map<string, string>();
                                                                        qualityData.forEach((quality: any) => {
                                                                            // Usar las nuevas columnas de baterías individuales con sus categorías
                                                                            if (quality.battery1_code && quality.battery1_category) {
                                                                                batteryData.set(quality.battery1_code, quality.battery1_category);
                                                                            }
                                                                            if (quality.battery2_code && quality.battery2_category) {
                                                                                batteryData.set(quality.battery2_code, quality.battery2_category);
                                                                            }
                                                                            if (quality.battery3_code && quality.battery3_category) {
                                                                                batteryData.set(quality.battery3_code, quality.battery3_category);
                                                                            }
                                                                            if (quality.battery4_code && quality.battery4_category) {
                                                                                batteryData.set(quality.battery4_code, quality.battery4_category);
                                                                            }
                                                                            if (quality.battery5_code && quality.battery5_category) {
                                                                                batteryData.set(quality.battery5_code, quality.battery5_category);
                                                                            }
                                                                        });
                                                                        
                                                                        // Convertir a array de strings con formato "código|categoría"
                                                                        batteryCodesForSidebar = Array.from(batteryData.entries()).map(([code, category]) => `${code}|${category}`);
                                                                        console.log('Códigos de batería únicos:', batteryCodesForSidebar);
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error al obtener códigos de batería:', error);
                                                                }
                                                            }

                                                            // Convertir datos a formato de posiciones para el mapa
                                                            const positions = scannedCodes.map((checkpoint: any) => {
                                                                return {
                                                                    status: (() => {
                                                                        const status = checkpoint.status?.toString().toLowerCase();
                                                                        if (status === 'ok') return 'ok';
                                                                        if (status === 'failed') return 'failed';
                                                                        if (status === 'pending') return 'pending';
                                                                        return 'pending'; // Default
                                                                    })(),
                                                                    position: { 
                                                                        lat: checkpoint.latitude || checkpoint.lat, 
                                                                        lng: checkpoint.longitude || checkpoint.lon 
                                                                    },
                                                                    unitId: checkpoint.scanned_code || checkpoint.code || checkpoint.id?.toString(),
                                                                    timestamp: new Date(checkpoint.timestamp),
                                                                    technician: (() => {
                                                                        // Para proyecto 28, usar el campo technician directamente
                                                                        if (project.id === 28) {
                                                                            return checkpoint.technician || checkpoint.user_id?.toString() || 'Sin técnico';
                                                                        }
                                                                        // Para otros proyectos, usar la relación con user
                                                                        if (checkpoint.user) {
                                                                            return checkpoint.user.full_name || checkpoint.user.name || checkpoint.user.email;
                                                                        }
                                                                        return checkpoint.technician || checkpoint.user_id?.toString() || 'Sin técnico';
                                                                    })(),
                                                                    battery: 100, // No tenemos datos de batería
                                                                    categorie: project.id === 28 ? checkpoint.categorie : undefined, // Solo para proyecto 28
                                                                    checkpointType: project.id === 28 ? checkpoint.checkpoint_type : undefined, // Solo para proyecto 28
                                                                    checkpointNumber: project.id === 28 ? checkpoint.checkpoint_number : undefined, // Solo para proyecto 28
                                                                    phase: project.id === 28 ? checkpoint.phase : undefined, // Solo para proyecto 28
                                                                    location: project.id === 28 
                                                                        ? `Checkpoint: ${checkpoint.checkpoint_type} | Código: ${checkpoint.scanned_code} | Estado: ${checkpoint.status} | Categoría: ${checkpoint.categorie} | Fase: ${checkpoint.phase}`
                                                                        : `Escaneado: ${new Date(checkpoint.timestamp).toLocaleString()}`
                                                                };
                                                            });

                                                            // Contar por tipo de código
                                                            const qrCodes = project.id === 28 ? 0 : scannedCodes.filter((checkpoint: any) => checkpoint.type === 'qrcode').length;
                                                            const barcodeCodes = project.id === 28 ? scannedCodes.length : scannedCodes.filter((checkpoint: any) => checkpoint.type === 'barcode').length;

                                                            // Calcular contadores reales basados en status
                                                            const okCount = scannedCodes.filter((item: any) => 
                                                                item.status === 'OK' || item.status === 'ok'
                                                            ).length;
                                                            const pendingCount = scannedCodes.filter((item: any) => 
                                                                item.status === 'PENDING' || item.status === 'pending'
                                                            ).length;
                                                            const failedCount = scannedCodes.filter((item: any) => 
                                                                item.status === 'FAILED' || item.status === 'failed'
                                                            ).length;

                                                            setMapModal({
                                                                project,
                                                                units: {
                                                                    ok: okCount,
                                                                    pending: pendingCount,
                                                                    failed: failedCount,
                                                                    positions
                                                                },
                                                                batteryCodes: project.id === 28 ? batteryCodesForSidebar : undefined
                                                            });

                                                            notifications.show({
                                                                title: 'Mapa cargado',
                                                                message: project.id === 28 
                                                                    ? `${batteryCodesForSidebar.length} códigos de batería únicos encontrados, ${scannedCodes.length} checkpoints para tracking`
                                                                    : `${scannedCodes.length} códigos escaneados encontrados (${qrCodes} QR, ${barcodeCodes} códigos de barras)`,
                                                                color: 'green'
                                                            });

                                                        } catch (error) {
                                                            console.error('Error al obtener datos del proyecto:', error);
                                                            notifications.hide('loading');
                                                            notifications.show({
                                                                title: 'Error',
                                                                message: 'Error al obtener los datos del proyecto',
                                                                color: 'red'
                                                            });
                                                        }
                                                    }}
                                                    title="Ver Mapa"
                                                    style={{ 
                                                        color: project.project_type === 'patios' ? '#ff9f43' : '#339af0' 
                                                    }}
                                                >
                                                    <IconMapPin size={16} />
                                                </ActionIcon>
                                            )}
                                        </Group>
                                        
                                        {/* Icono de borrar solo en escritorio, oculto en móvil */}
                                        <ActionIcon 
                                            variant="subtle" 
                                            color="red" 
                                            size="sm"
                                            visibleFrom="md"
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
                                    <Group gap="md">
                                        <Group gap="xs">
                                            <IconCalendar size={16} style={{ color: '#909296' }}/>
                                            <Text size="sm" c="dimmed">Inicio:</Text>
                                            <Text size="sm" c="gray.2">
                                                {project.start_date ? dayjs(project.start_date).format('DD/MM/YYYY') : 'No definido'}
                                            </Text>
                                    </Group>
                                        <Group gap="xs">
                                            <IconCalendar size={16} style={{ color: '#909296' }}/>
                                            <Text size="sm" c="dimmed">Fin:</Text>
                                            <Text size="sm" c="gray.2">
                                                {project.end_date ? dayjs(project.end_date).format('DD/MM/YYYY') : 'No definido'}
                                            </Text>
                                        </Group>
                                        <Group gap={4}>
                                            <IconBuildingFactory size={14} color="#666" />
                                            <Text 
                                                size="sm" 
                                                c="gray.3"
                                                visibleFrom="md"
                                            >
                                                {project.location?.plant_address ? getPlantNameFromAddress(project.location.plant_address) : 'Sin planta asignada'}
                                            </Text>
                                        </Group>
                                </Group>
                                </Group>

                                <Group justify="space-between" mt="md">
                                    <Group gap="md">
                                    {/* Ocultar en móvil, mostrar solo en pantallas grandes */}
                                    <Text 
                                        size="md" 
                                        fw={500} 
                                        c="dimmed"
                                        visibleFrom="md"
                                    >
                                        Progreso:{' '}
                                        <Text span c="lime" fw={700}>
                                            {Math.round((project.completed_parts / project.total_parts) * 100)}%
                                        </Text>
                                    </Text>
                                    
                                    {/* Badges de status de parte */}
                                    <Group gap="xs">
                                        {/* Badge Total para escritorio */}
                                        <Badge size="md" color="blue" variant="light" visibleFrom="md">
                                            Total: {project.total_parts}
                                        </Badge>
                                        {/* Badge Total solo número para móvil */}
                                        <Badge size="md" color="blue" variant="light" hiddenFrom="md">
                                            Total:{project.total_parts}
                                        </Badge>
                                        <Badge size="md" color="green" variant="light">
                                            OK: {project.completed_parts}
                                        </Badge>
                                        <Badge size="md" color="red" variant="light">
                                            Fail: {projectFailedParts[project.id] || 0}
                                        </Badge>
                                        {/* Badge Pendientes para escritorio */}
                                        <Badge size="md" color="yellow" variant="light" visibleFrom="md">
                                            Pendientes: {project.total_parts - project.completed_parts - (projectFailedParts[project.id] || 0)}
                                        </Badge>
                                        {/* Badge Pendientes para móvil */}
                                        <Badge size="md" color="yellow" variant="light" hiddenFrom="md">
                                            PD: {project.total_parts - project.completed_parts - (projectFailedParts[project.id] || 0)}
                                        </Badge>
                                    </Group>
                                    
                                        {(project.project_type === 'patios' || project.project_type === 'bench') && (
                                            <ActionIcon
                                                variant="subtle"
                                                color={project.project_type === 'patios' ? 'orange' : 'blue'}
                                                size="sm"
                                                visibleFrom="md"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        // Mostrar loading
                                                        notifications.show({
                                                            title: 'Cargando datos',
                                                            message: 'Obteniendo datos de escaneos del proyecto...',
                                                            color: 'blue',
                                                            loading: true
                                                        });

                                                        // Obtener datos reales de la base de datos
                                                        // Para proyecto ID 28, usar tabla panasonic_checkpoints, para otros usar scanned_codes
                                                        const apiEndpoint = project.id === 28 
                                                            ? `/api/panasonic-checkpoints/project/${project.id}`
                                                            : `/api/scanned-codes/project/${project.id}`;
                                                        
                                                        const response = await fetch(apiEndpoint, {
                                                            method: 'GET',
                                                            headers: {
                                                                'Authorization': `Bearer ${getToken()}`,
                                                                'Content-Type': 'application/json'
                                                            }
                                                        });

                                                        if (!response.ok) {
                                                            throw new Error(`HTTP error! status: ${response.status}`);
                                                        }

                                                        const scannedCodes = await response.json();
                                                        console.log('Datos reales obtenidos:', scannedCodes);

                                                        // Cerrar notificación de loading
                                                        notifications.hide('loading');

                                                        if (scannedCodes.length === 0) {
                                                            notifications.show({
                                                                title: 'Sin datos',
                                                                message: 'No hay códigos escaneados con coordenadas para este proyecto',
                                                                color: 'yellow'
                                                            });
                                                            return;
                                                        }

                                                        // Para proyecto 28, obtener códigos de batería desde panasonic_quality_questions para la barra lateral
                                                        let batteryCodesForSidebar: string[] = [];
                                                        if (project.id === 28) {
                                                            try {
                                                                // Obtener códigos de batería desde quality questions
                                                                const qualityResponse = await fetch(`/api/panasonic-quality-questions/project/${project.id}`, {
                                                                    method: 'GET',
                                                                    headers: {
                                                                        'Authorization': `Bearer ${getToken()}`,
                                                                        'Content-Type': 'application/json'
                                                                    }
                                                                });
                                                                
                                                                if (qualityResponse.ok) {
                                                                    const qualityData = await qualityResponse.json();
                                                                    console.log('Datos de quality questions:', qualityData);
                                                                    
                                                                    // Extraer códigos de batería únicos con sus categorías
                                                                    const batteryData = new Map<string, string>();
                                                                    qualityData.forEach((quality: any) => {
                                                                        // Usar las nuevas columnas de baterías individuales con sus categorías
                                                                        if (quality.battery1_code && quality.battery1_category) {
                                                                            batteryData.set(quality.battery1_code, quality.battery1_category);
                                                                        }
                                                                        if (quality.battery2_code && quality.battery2_category) {
                                                                            batteryData.set(quality.battery2_code, quality.battery2_category);
                                                                        }
                                                                    });
                                                                    
                                                                    // Crear array de objetos con código y categoría
                                                                    batteryCodesForSidebar = Array.from(batteryData.entries()).map(([code, category]) => `${code}|${category}`);
                                                                    console.log('Códigos de batería extraídos:', batteryCodesForSidebar);
                                                                }
                                                            } catch (error) {
                                                                console.error('Error al obtener códigos de batería:', error);
                                                            }
                                                        }

                                                        // Convertir datos al formato esperado por el mapa (usar todos los checkpoints para tracking)
                                                        const positions = scannedCodes.map((checkpoint: any) => {
                                                            // Para panasonic_checkpoints, usar scanned_code como unitId
                                                            const unitId = project.id === 28 ? checkpoint.scanned_code : checkpoint.code;
                                                            
                                                            // Debug: Log para verificar los datos que llegan del backend
                                                            if (project.id === 28) {
                                                                console.log('Datos del backend para proyecto 28:', {
                                                                    session_id: checkpoint.session_id,
                                                                    checkpoint_type: checkpoint.checkpoint_type,
                                                                    checkpoint_number: checkpoint.checkpoint_number,
                                                                    scanned_code: checkpoint.scanned_code,
                                                                    timestamp: checkpoint.timestamp,
                                                                    latitude: checkpoint.latitude,
                                                                    longitude: checkpoint.longitude,
                                                                    status: checkpoint.status,
                                                                    categorie: checkpoint.categorie,
                                                                    phase: checkpoint.phase
                                                                });
                                                            }
                                                            
                                                            return {
                                                                status: (() => {
                                                                    if (project.id === 28) {
                                                                        return checkpoint.status; // Para proyecto 28 usar el status real
                                                                    } else {
                                                                        // Para otros proyectos, convertir el status correctamente
                                                                        const status = checkpoint.status?.toString().toLowerCase();
                                                                        if (status === 'ok') return 'ok';
                                                                        if (status === 'failed') return 'failed';
                                                                        if (status === 'pending') return 'pending';
                                                                        return 'pending'; // Default
                                                                    }
                                                                })(),
                                                                position: { 
                                                                    lat: parseFloat(checkpoint.latitude), 
                                                                    lng: parseFloat(checkpoint.longitude) 
                                                                },
                                                                unitId: unitId,
                                                                timestamp: new Date(checkpoint.timestamp),
                                                                technician: (() => {
                                                                    console.log('Datos del checkpoint para técnico:', {
                                                                        checkpoint: checkpoint,
                                                                        user: checkpoint.user,
                                                                        full_name: checkpoint.user?.full_name,
                                                                        technician: checkpoint.technician,
                                                                        user_id: checkpoint.user_id
                                                                    });
                                                                    return checkpoint.user?.full_name || checkpoint.technician || checkpoint.user_id?.toString() || 'Sin técnico';
                                                                })(),
                                                                battery: 100, // No tenemos datos de batería
                                                                categorie: project.id === 28 ? checkpoint.categorie : undefined, // Solo para proyecto 28
                                                                checkpointType: project.id === 28 ? checkpoint.checkpoint_type : undefined, // Solo para proyecto 28
                                                                checkpointNumber: project.id === 28 ? checkpoint.checkpoint_number : undefined, // Solo para proyecto 28
                                                                phase: project.id === 28 ? checkpoint.phase : undefined, // Solo para proyecto 28
                                                                location: project.id === 28 
                                                                    ? `Checkpoint: ${checkpoint.checkpoint_type} | Código: ${checkpoint.scanned_code} | Estado: ${checkpoint.status} | Categoría: ${checkpoint.categorie} | Fase: ${checkpoint.phase}`
                                                                    : `Escaneado: ${new Date(checkpoint.timestamp).toLocaleString()}`
                                                            };
                                                        });

                                                        // Contar por tipo de código
                                                        const qrCodes = project.id === 28 ? 0 : scannedCodes.filter((checkpoint: any) => checkpoint.type === 'qrcode').length;
                                                        const barcodeCodes = project.id === 28 ? scannedCodes.length : scannedCodes.filter((checkpoint: any) => checkpoint.type === 'barcode').length;

                                                        // Calcular contadores reales basados en status
                                                        const okCount = scannedCodes.filter((item: any) => 
                                                            item.status === 'OK' || item.status === 'ok'
                                                        ).length;
                                                        const pendingCount = scannedCodes.filter((item: any) => 
                                                            item.status === 'PENDING' || item.status === 'pending'
                                                        ).length;
                                                        const failedCount = scannedCodes.filter((item: any) => 
                                                            item.status === 'FAILED' || item.status === 'failed'
                                                        ).length;

                                                        setMapModal({
                                                            project,
                                                            units: {
                                                                ok: okCount,
                                                                pending: pendingCount,
                                                                failed: failedCount,
                                                                positions
                                                            },
                                                            batteryCodes: project.id === 28 ? batteryCodesForSidebar : undefined
                                                        });

                                                        notifications.show({
                                                            title: 'Mapa cargado',
                                                            message: project.id === 28 
                                                                ? `${batteryCodesForSidebar.length} códigos de batería únicos encontrados, ${scannedCodes.length} checkpoints para tracking`
                                                                : `${scannedCodes.length} códigos escaneados encontrados (${qrCodes} QR, ${barcodeCodes} códigos de barras)`,
                                                            color: 'green'
                                                        });

                                                    } catch (error) {
                                                        console.error('Error al obtener datos del proyecto:', error);
                                                        notifications.hide('loading');
                                                        notifications.show({
                                                            title: 'Error',
                                                            message: 'Error al obtener los datos del proyecto',
                                                            color: 'red'
                                                        });
                                                    }
                                                }}
                                                title="Ver Mapa"
                                                style={{ 
                                                    color: project.project_type === 'patios' ? '#ff9f43' : '#339af0' 
                                                }}
                                            >
                                                <IconMapPin size={16} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                    
                                    {(() => { console.log('Project assigned_to:', project.assigned_to); return null; })()}
                                    <Group gap={8} justify="space-between">
                                        <Group gap={8}>
                                        {Array.isArray(project.assigned_to) && project.assigned_to.length > 0 ? (
                                            project.assigned_to.length > 2 ? (
                                                <Badge 
                                                    size="md"
                                                    variant="filled"
                                                    color="violet"
                                                    style={{ 
                                                        cursor: 'pointer',
                                                        backgroundColor: '#4c2889',
                                                        color: 'white'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Abrir el primer técnico del proyecto
                                                        if (project.assigned_to && project.assigned_to.length > 0) {
                                                            handleTechnicianClick(project.assigned_to[0]);
                                                        }
                                                    }}
                                                >
                                                    Ver técnicos ({project.assigned_to.length})
                                                </Badge>
                                            ) : (
                                                project.assigned_to.map((tech: string, index: number) => {
                                                    console.log('Processing technician:', tech);
                                                const names = tech.split(' ');
                                                const shortName = names.length > 1 ? 
                                                    `${names[0]} ${names[1]}` : 
                                                    names[0];
                                                
                                                return (
                                                <Badge 
                                                    key={index}
                                                    size="md"
                                                    variant="filled"
                                                    color="violet"
                                                        style={{ 
                                                            cursor: 'pointer',
                                                        backgroundColor: '#4c2889',  // Un morado más oscuro personalizado
                                                            color: 'white'
                                                        }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTechnicianClick(tech);
                                                    }}
                                                >
                                                        {shortName}
                                                </Badge>
                                                );
                                                })
                                            )
                                        ) : (
                                            <Text size="sm" c="dimmed">Sin técnicos asignados</Text>
                                        )}
                                        </Group>
                                        
                                    </Group>
                                </Group>
                                
                                {/* Icono de borrar en esquina inferior derecha, solo en móvil */}
                                <ActionIcon 
                                    variant="subtle" 
                                    color="red" 
                                    size="sm"
                                    hiddenFrom="md"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setProjectToDelete(project);
                                    }}
                                    title="Eliminar"
                                    style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px'
                                    }}
                                >
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </Paper>
                        ))
                    )}
                </Stack>
            </Paper>

            <ProjectDetailsModal
                project={selectedProject}
                onClose={() => {
                    console.log('Closing ProjectDetailsModal');
                    setSelectedProject(null);
                }}
                onTechnicianClick={(techName) => {
                    console.log('Technician clicked:', techName);
                    handleTechnicianClick(techName);
                }}
                onImageClick={setImageModal}
                onEquipmentClick={() => setEquipmentModalOpen(true)}
            />

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
                // Optimizaciones para móvil
                styles={{
                    content: {
                        '@media (max-width: 768px)': {
                            margin: '4px',
                            height: 'calc(100vh - 8px)',
                            maxHeight: 'calc(100vh - 8px)',
                            maxWidth: 'calc(100vw - 8px)',
                        }
                    },
                    body: {
                        '@media (max-width: 768px)': {
                            padding: '0',
                            height: '100%',
                            overflow: 'hidden'
                        }
                    }
                }}
                style={{ 
                    maxWidth: '1400px',
                    height: '90vh',
                    '@media (max-width: 768px)': {
                        maxWidth: '100vw',
                        height: '100vh',
                        margin: '4px'
                    }
                }}
            >
                <Box style={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    '@media (max-width: 768px)': {
                        height: '100vh'
                    }
                }}>
                    <Group justify="apart" p="md" style={{ 
                        borderBottom: '1px solid #2C2E33',
                        '@media (max-width: 768px)': {
                            padding: '12px',
                            flexWrap: 'nowrap'
                        }
                    }}>
                        <Title 
                            order={3} 
                            c="gray.2"
                            style={{
                                '@media (max-width: 768px)': {
                                    fontSize: 'clamp(16px, 4vw, 20px)',
                                    lineHeight: 1.2,
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }
                            }}
                        >
                            Administración de Proyectos
                        </Title>
                        <ActionIcon 
                            variant="subtle" 
                            onClick={() => setShowAdminModal(false)}
                            style={{
                                '@media (max-width: 768px)': {
                                    minWidth: '40px',
                                    minHeight: '40px'
                                }
                            }}
                        >
                            <IconX size={20} />
                        </ActionIcon>
                    </Group>

                    <Tabs 
                        defaultValue="create" 
                        style={{ 
                            flex: 1,
                            '@media (max-width: 768px)': {
                                height: 'calc(100vh - 80px)',
                                display: 'flex',
                                flexDirection: 'column'
                            }
                        }}
                    >
                        <Tabs.List
                            style={{
                                '@media (max-width: 768px)': {
                                    flexWrap: 'nowrap',
                                    justifyContent: 'center',
                                    padding: '0 8px'
                                }
                            }}
                        >
                            <Tabs.Tab 
                                value="create" 
                                leftSection={<IconPlus size={16} />}
                                style={{
                                    '@media (max-width: 768px)': {
                                        flex: 1,
                                        minHeight: '48px',
                                        fontSize: '14px',
                                        padding: '8px 12px'
                                    }
                                }}
                            >
                                Crear Proyecto
                            </Tabs.Tab>
                            <Tabs.Tab 
                                value="edit" 
                                leftSection={<IconEdit size={16} />}
                                style={{
                                    '@media (max-width: 768px)': {
                                        flex: 1,
                                        minHeight: '48px',
                                        fontSize: '14px',
                                        padding: '8px 12px'
                                    }
                                }}
                            >
                                Editar Proyecto
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel 
                            value="create" 
                            p="md"
                            style={{
                                '@media (max-width: 768px)': {
                                    padding: '12px',
                                    height: 'calc(100vh - 140px)',
                                    overflowY: 'auto',
                                    flex: 1
                                }
                            }}
                        >
                            <Grid grow gutter="md">
                                <Grid.Col span={12}>
                                    <Paper withBorder p="md">
                                        <Stack>
                                            <Title 
                                                order={4} 
                                                c="gray.2"
                                                style={{
                                                    '@media (max-width: 768px)': {
                                                        fontSize: 'clamp(16px, 4vw, 18px)',
                                                        marginBottom: '12px'
                                                    }
                                                }}
                                            >
                                                Datos del Proyecto
                                            </Title>
                                            <Grid
                                                style={{
                                                    '@media (max-width: 768px)': {
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '12px'
                                                    }
                                                }}
                                            >
                                                <Grid.Col 
                                                    span={6}
                                                    style={{
                                                        '@media (max-width: 768px)': {
                                                            span: 12,
                                                            width: '100%'
                                                        }
                                                    }}
                                                >
                                                    <TextInput
                                                        label="Nombre del Proyecto"
                                                        placeholder="Ej: CPIM"
                                                        required
                                                        value={newProjectData.name}
                                                        onChange={(e) => setNewProjectData((prev: Partial<Project>) => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))}
                                                        styles={{
                                                            input: {
                                                                '@media (max-width: 768px)': {
                                                                    minHeight: '48px',
                                                                    fontSize: '16px'
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col 
                                                    span={6}
                                                    style={{
                                                        '@media (max-width: 768px)': {
                                                            span: 12,
                                                            width: '100%'
                                                        }
                                                    }}
                                                >
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
                                                                setNewProjectData((prev: Partial<Project>) => ({
                                                                    ...prev,
                                                                    client: predefinedClients.find(c => c.id === value)?.name || ''
                                                                }));
                                                            } else {
                                                                setFilteredPlants([]);
                                                            }
                                                            setSelectedPlant(null);
                                                            setRequiresHotel(false);
                                                        }}
                                                        styles={{
                                                            input: {
                                                                '@media (max-width: 768px)': {
                                                                    minHeight: '48px',
                                                                    fontSize: '16px'
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </Grid.Col>
                                                
                                                <Grid.Col 
                                                    span={4}
                                                    style={{
                                                        '@media (max-width: 768px)': {
                                                            span: 12,
                                                            width: '100%'
                                                        }
                                                    }}
                                                >
                                                    <DateInput
                                                        label="Fecha de Inicio"
                                                        placeholder="Selecciona una fecha"
                                                        required
                                                        value={startDate}
                                                        onChange={(value) => {
                                                            setStartDate(value);
                                                            setNewProjectData((prev: Partial<Project>) => ({
                                                                ...prev,
                                                                start_date: formatDateForAPI(value)
                                                            }));
                                                        }}
                                                        minDate={new Date()}
                                                        locale="es"
                                                        firstDayOfWeek={0}
                                                        styles={(theme) => ({
                                                            input: {
                                                                backgroundColor: theme.colors.dark[7],
                                                                '@media (max-width: 768px)': {
                                                                    minHeight: '48px',
                                                                    fontSize: '16px'
                                                                }
                                                            },
                                                            day: {
                                                                '&[data-selected]': {
                                                                    backgroundColor: theme.colors.blue[6],
                                                                }
                                                            }
                                                        })}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col 
                                                    span={4}
                                                    style={{
                                                        '@media (max-width: 768px)': {
                                                            span: 12,
                                                            width: '100%'
                                                        }
                                                    }}
                                                >
                                                    <DateInput
                                                        label="Fecha de Fin"
                                                        placeholder="Selecciona una fecha"
                                                        required
                                                        value={endDate}
                                                        onChange={(value) => {
                                                            setEndDate(value);
                                                            setNewProjectData((prev: Partial<Project>) => ({
                                                                ...prev,
                                                                end_date: formatDateForAPI(value)
                                                            }));
                                                        }}
                                                        minDate={startDate || new Date()}
                                                        locale="es"
                                                        firstDayOfWeek={0}
                                                        styles={(theme) => ({
                                                            input: {
                                                                backgroundColor: theme.colors.dark[7],
                                                                '@media (max-width: 768px)': {
                                                                    minHeight: '48px',
                                                                    fontSize: '16px'
                                                                }
                                                            },
                                                            day: {
                                                                '&[data-selected]': {
                                                                    backgroundColor: theme.colors.blue[6],
                                                                }
                                                            }
                                                        })}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col 
                                                    span={4}
                                                    style={{
                                                        '@media (max-width: 768px)': {
                                                            span: 12,
                                                            width: '100%'
                                                        }
                                                    }}
                                                >
                                                    <Group align="center" mb={8}>
                                                        <Text size="sm" fw={500}>Tipo de Proyecto</Text>
                                                        <Text size="sm" c="red" fw={700}>*</Text>
                                                    </Group>
                                                    <Group
                                                        style={{
                                                            '@media (max-width: 768px)': {
                                                                justifyContent: 'center',
                                                                gap: '12px'
                                                            }
                                                        }}
                                                    >
                                                        <Badge
                                                            size="lg"
                                                            variant={newProjectData.project_type === 'bench' ? 'filled' : 'outline'}
                                                            color="blue"
                                                            style={{ 
                                                                cursor: 'pointer',
                                                                '@media (max-width: 768px)': {
                                                                    minHeight: '48px',
                                                                    padding: '12px 20px',
                                                                    fontSize: '16px'
                                                                }
                                                            }}
                                                            onClick={() => setNewProjectData((prev: Partial<Project>) => ({
                                                                ...prev,
                                                                project_type: 'bench'
                                                            }))}
                                                        >
                                                            Bench
                                                        </Badge>
                                                        <Badge
                                                            size="lg"
                                                            variant={newProjectData.project_type === 'patios' ? 'filled' : 'outline'}
                                                            color="violet"
                                                            style={{ 
                                                                cursor: 'pointer',
                                                                '@media (max-width: 768px)': {
                                                                    minHeight: '48px',
                                                                    padding: '12px 20px',
                                                                    fontSize: '16px'
                                                                }
                                                            }}
                                                            onClick={() => setNewProjectData((prev: Partial<Project>) => ({
                                                                ...prev,
                                                                project_type: 'patios'
                                                            }))}
                                                        >
                                                            Patios
                                                        </Badge>
                                                    </Group>
                                                </Grid.Col>

                                                <Grid.Col span={12}>
                                                    <Title 
                                                        order={5} 
                                                        c="gray.2" 
                                                        mb="md"
                                                        style={{
                                                            '@media (max-width: 768px)': {
                                                                fontSize: 'clamp(14px, 3.5vw, 16px)',
                                                                marginBottom: '12px'
                                                            }
                                                        }}
                                                    >
                                                        Ubicación
                                                    </Title>
                                                    <Grid
                                                        style={{
                                                            '@media (max-width: 768px)': {
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '12px'
                                                            }
                                                        }}
                                                    >
                                                        <Grid.Col span={12}>
                                                            <Select
                                                                label="Planta"
                                                                placeholder="Selecciona la planta"
                                                                data={filteredPlants.map(plant => ({
                                                                    value: plant.id,
                                                                    label: plant.name
                                                                }))}
                                                                required
                                                                searchable
                                                                value={selectedPlant}
                                                                onChange={(value) => {
                                                                    setSelectedPlant(value);
                                                                    if (value) {
                                                                        const selectedPlant = filteredPlants.find(p => p.id === value);
                                                                        if (selectedPlant) {
                                                                            setNewProjectData(prev => ({
                                                                                ...prev,
                                                                                location: {
                                                                                    ...prev.location,
                                                                                    plant_name: selectedPlant.name,
                                                                                    plant_address: selectedPlant.address,
                                                                                    plant_coordinates: selectedPlant.coordinates,
                                                                                    contact_name: selectedPlant.contact?.name || '',
                                                                                    contact_phone: selectedPlant.contact?.phone || '',
                                                                                    contact_email: selectedPlant.contact?.email || '',
                                                                                    hotel_name: prev.requires_hotel && prev.location?.hotel_name ? prev.location.hotel_name : '',
                                                                                    hotel_address: prev.requires_hotel && prev.location?.hotel_address ? prev.location.hotel_address : '',
                                                                                    hotel_coordinates: prev.requires_hotel && prev.location?.hotel_coordinates ? prev.location.hotel_coordinates : '',
                                                                                    hotel_phone: prev.requires_hotel && prev.location?.hotel_phone ? prev.location.hotel_phone : ''
                                                                                }
                                                                            }));
                                                                        }
                                                                    }
                                                                }}
                                                                styles={{
                                                                    input: {
                                                                        '@media (max-width: 768px)': {
                                                                            minHeight: '48px',
                                                                            fontSize: '16px'
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
                                                                    checked={newProjectData.requires_hotel}
                                                                    onChange={(event) => setNewProjectData(prev => ({ ...prev, requires_hotel: event.currentTarget.checked }))}
                                                                    styles={{
                                                                        track: {
                                                                            '@media (max-width: 768px)': {
                                                                                minWidth: '48px',
                                                                                minHeight: '28px'
                                                                            }
                                                                        },
                                                                        thumb: {
                                                                            '@media (max-width: 768px)': {
                                                                                minWidth: '24px',
                                                                                minHeight: '24px'
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </Group>
                                                        </Grid.Col>

                                                        {newProjectData.requires_hotel && (
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
                                                                                    handleHotelSelect(plant.defaultHotel);
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
                                                    <Title 
                                                        order={5} 
                                                        c="gray.2" 
                                                        mb="md"
                                                        style={{
                                                            '@media (max-width: 768px)': {
                                                                fontSize: 'clamp(14px, 3.5vw, 16px)',
                                                                marginBottom: '12px'
                                                            }
                                                        }}
                                                    >
                                                        Asignación y Alcance
                                                    </Title>
                                                    <Grid
                                                        style={{
                                                            '@media (max-width: 768px)': {
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '12px'
                                                            }
                                                        }}
                                                    >
                                                        <Grid.Col 
                                                            span={6}
                                                            style={{
                                                                '@media (max-width: 768px)': {
                                                                    span: 12,
                                                                    width: '100%'
                                                                }
                                                            }}
                                                        >
                                                            <MultiSelect
                                                                label="Técnicos Asignados"
                                                                placeholder="Selecciona los técnicos"
                                                                data={availableTechnicians}
                                                                searchable
                                                                required
                                                                value={newProjectData.assigned_to}
                                                                onChange={(values) => {
                                                                    console.log('Selected technicians:', values);
                                                                    setNewProjectData((prev: Partial<Project>) => {
                                                                        const updated = {
                                                                    ...prev,
                                                                    assigned_to: values
                                                                        };
                                                                        console.log('Updated project data:', updated);
                                                                        return updated;
                                                                    });
                                                                }}
                                                                styles={{
                                                                    input: {
                                                                        '@media (max-width: 768px)': {
                                                                            minHeight: '48px',
                                                                            fontSize: '16px'
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </Grid.Col>
                                                        <Grid.Col 
                                                            span={6}
                                                            style={{
                                                                '@media (max-width: 768px)': {
                                                                    span: 12,
                                                                    width: '100%'
                                                                }
                                                            }}
                                                        >
                                                            <NumberInput
                                                                label="Total de Partes"
                                                                placeholder="Número total de partes a trabajar"
                                                                min={1}
                                                                required
                                                                value={newProjectData.total_parts}
                                                                onChange={(value: number | string) => setNewProjectData((prev: Partial<Project>) => ({
                                                                    ...prev,
                                                                    total_parts: typeof value === 'number' ? value : parseInt(value as string) || 0
                                                                }))}
                                                                styles={{
                                                                    input: {
                                                                        '@media (max-width: 768px)': {
                                                                            minHeight: '48px',
                                                                            fontSize: '16px'
                                                                        }
                                                                    }
                                                                }}
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
                                                                onChange={(values) => setNewProjectData((prev: Partial<Project>) => ({
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
                                                                onDrop={async (files) => {
                                                                    try {
                                                                        notifications.show({
                                                                            id: 'processing',
                                                                            loading: true,
                                                                            title: 'Procesando archivos',
                                                                            message: 'Subiendo documentos PDF...',
                                                                            autoClose: false,
                                                                            withCloseButton: false
                                                                        });

                                                                        // Agregar cada archivo al estado con el archivo original
                                                                        setNewProjectData((prev: Partial<Project>) => ({
                                                                            ...prev,
                                                                            documents: [...(prev.documents || []), ...files.map(file => ({
                                                                                name: file.name,
                                                                                type: file.type,
                                                                                url: URL.createObjectURL(file),
                                                                                size: file.size,
                                                                                file: file  // Guardar el archivo original
                                                                            }))]
                                                                        }));

                                                                        notifications.update({
                                                                            id: 'processing',
                                                                            title: 'Documentos procesados',
                                                                            message: 'Los documentos PDF se han procesado correctamente',
                                                                            color: 'green',
                                                                            autoClose: 2000
                                                                        });

                                                                    } catch (error) {
                                                                        console.error('Error procesando archivos:', error);
                                                                        notifications.show({
                                                                            title: 'Error',
                                                                            message: error instanceof Error ? error.message : 'Hubo un error al procesar los archivos',
                                                                            color: 'red'
                                                                        });
                                                                    }
                                                                }}
                                                                onReject={(files) => {
                                                                    notifications.show({
                                                                        title: 'Error',
                                                                        message: 'Solo se permiten archivos PDF',
                                                                        color: 'red'
                                                                    });
                                                                }}
                                                                maxSize={5 * 1024 ** 2}
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
                                                                            Arrastra documentos PDF aquí o haz click para seleccionar
                                                                        </Text>
                                                                        <Text size="sm" c="dimmed" inline>
                                                                            Solo archivos PDF, máximo 5MB cada uno
                                                                        </Text>
                                                                    </Stack>
                                                                </Group>
                                                            </Dropzone>

                                                            {/* Lista de documentos cargados */}
                                                            {newProjectData.documents && newProjectData.documents.length > 0 && (
                                                                <Paper withBorder p="xs" mt="sm">
                                                                    <Stack gap="xs">
                                                                        <Text size="sm" fw={500}>Documentos Cargados:</Text>
                                                                        {newProjectData.documents.map((doc: ProjectDocument, index: number) => (
                                                                            <Group key={index} justify="space-between">
                                                                                <Group gap="xs">
                                                                                    <IconFileText size="1.2rem" />
                                                                                    <Text size="sm">{doc.name}</Text>
                                                                                </Group>
                                                                                <ActionIcon 
                                                                                    color="red" 
                                                                                    variant="subtle"
                                                                                    onClick={() => {
                                                                                        setNewProjectData((prev: Partial<Project>) => ({
                                                                                            ...prev,
                                                                                            documents: prev.documents?.filter((_: unknown, i: number) => i !== index) || []
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
                                                        <Button 
                                                            variant="default" 
                                                            onClick={() => {
                                                            clearForm();
                                                            setShowAdminModal(false);
                                                            }}
                                                            style={{
                                                                '@media (max-width: 768px)': {
                                                                    width: '100%',
                                                                    minHeight: '48px',
                                                                    fontSize: '16px'
                                                                }
                                                            }}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                        <Button 
                                                            onClick={handleSaveProject}
                                                            disabled={!newProjectData.name || !newProjectData.client || isSubmitting}
                                                            loading={isSubmitting}
                                                            style={{
                                                                '@media (max-width: 768px)': {
                                                                    width: '100%',
                                                                    minHeight: '48px',
                                                                    fontSize: '16px'
                                                                }
                                                            }}
                                                        >
                                                            {isSubmitting ? 'Guardando...' : 'Guardar Proyecto'}
                                                        </Button>
                                                    </Group>
                                </Grid.Col>
                            </Grid>
                        </Tabs.Panel>

                        <Tabs.Panel 
                            value="edit" 
                            p="md"
                            style={{
                                '@media (max-width: 768px)': {
                                    padding: '12px',
                                    height: 'calc(100vh - 140px)',
                                    overflowY: 'auto',
                                    flex: 1
                                }
                            }}
                        >
                            <Grid grow gutter="md">
                                <Grid.Col span={12}>
                                    <Paper withBorder p="md">
                                        <Stack>
                                            <Group 
                                                justify="space-between" 
                                                mb="md"
                                                style={{
                                                    '@media (max-width: 768px)': {
                                                        flexDirection: 'column',
                                                        alignItems: 'stretch',
                                                        gap: '12px'
                                                    }
                                                }}
                                            >
                                                <Title 
                                                    order={4} 
                                                    c="gray.2"
                                                    style={{
                                                        '@media (max-width: 768px)': {
                                                            fontSize: 'clamp(16px, 4vw, 18px)',
                                                            marginBottom: '0'
                                                        }
                                                    }}
                                                >
                                                    Seleccionar Proyecto
                                                </Title>
                                                <Select
                                                    placeholder="Buscar proyecto..."
                                                    data={projects.map(p => ({
                                                        value: p.id.toString(),
                                                        label: `${p.name} - ${p.client}`
                                                    }))}
                                                    searchable
                                                    style={{ 
                                                        width: 300,
                                                        '@media (max-width: 768px)': {
                                                            width: '100%'
                                                        }
                                                    }}
                                                    onChange={(value) => {
                                                        const project = projects.find(p => p.id.toString() === value);
                                                        if (project) {
                                                            setEditFormData(project);
                                                        }
                                                    }}
                                                    styles={{
                                                        input: {
                                                            '@media (max-width: 768px)': {
                                                                minHeight: '48px',
                                                                fontSize: '16px'
                                                            }
                                                        }
                                                    }}
                                                />
                                            </Group>
                                            
                                            <Grid
                                                style={{
                                                    '@media (max-width: 768px)': {
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '12px'
                                                    }
                                                }}
                                            >
                                                <Grid.Col 
                                                    span={6}
                                                    style={{
                                                        '@media (max-width: 768px)': {
                                                            span: 12,
                                                            width: '100%'
                                                        }
                                                    }}
                                                >
                                                    <TextInput
                                                        label="Nombre del Proyecto"
                                                        placeholder="Ej: CPIM"
                                                        value={editFormData?.name || ''}
                                                        onChange={(e) => setEditFormData((prev: Partial<Project>) => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))}
                                                        styles={{
                                                            input: {
                                                                '@media (max-width: 768px)': {
                                                                    minHeight: '48px',
                                                                    fontSize: '16px'
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col 
                                                    span={6}
                                                    style={{
                                                        '@media (max-width: 768px)': {
                                                            span: 12,
                                                            width: '100%'
                                                        }
                                                    }}
                                                >
                                                    <Select
                                                        label="Cliente"
                                                        placeholder="Selecciona el cliente"
                                                        data={predefinedClients.map(client => ({
                                                            value: client.id,
                                                            label: client.name
                                                        }))}
                                                        value={editFormData?.client}
                                                        onChange={(value) => setEditFormData((prev: Partial<Project>) => ({
                                                            ...prev,
                                                            client: value || ''
                                                        }))}
                                                        styles={{
                                                            input: {
                                                                '@media (max-width: 768px)': {
                                                                    minHeight: '48px',
                                                                    fontSize: '16px'
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={4}>
                                                    <DateInput
                                                        label="Fecha de Inicio"
                                                        placeholder="Selecciona una fecha"
                                                        value={editFormData?.start_date ? new Date(editFormData.start_date) : null}
                                                        onChange={(date) => setEditFormData((prev: Partial<Project>) => ({
                                                            ...prev,
                                                            start_date: date?.toISOString().split('T')[0] || ''
                                                        }))}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={4}>
                                                    <DateInput
                                                        label="Fecha de Fin"
                                                        placeholder="Selecciona una fecha"
                                                        value={editFormData?.end_date ? new Date(editFormData.end_date) : null}
                                                        onChange={(date) => setEditFormData((prev: Partial<Project>) => ({
                                                            ...prev,
                                                            end_date: date?.toISOString().split('T')[0] || ''
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
                                                        onChange={(value) => setEditFormData((prev: Partial<Project>) => ({
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
                                                                value={editFormData?.assigned_to || []}
                                                                onChange={(values) => setEditFormData((prev: Partial<Project>) => ({
                                                                    ...prev,
                                                                    assigned_to: values
                                                                }))}
                                                                searchable
                                                            />
                                                        </Grid.Col>
                                                        <Grid.Col span={6}>
                                                            <NumberInput
                                                                label="Total de Partes"
                                                                placeholder="Número total de partes"
                                                                value={editFormData?.total_parts || 0}
                                                                onChange={(value) => setEditFormData((prev: Partial<Project>) => ({
                                                                    ...prev,
                                                                    total_parts: typeof value === 'number' ? value : 0
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
                                                            disabled={!editFormData || typeof editFormData.id !== 'number'}
                                                            onClick={async () => {
                                                                if (editFormData && typeof editFormData.id === 'number') {
                                                                    console.log('Guardando cambios:', editFormData);
                                                                    try {
                                                                        await projectService.updateProject(editFormData.id, editFormData);
                                                                        await refreshProjects(); // <-- Actualiza la lista de proyectos
                                                                        notifications.show({
                                                                            title: 'Éxito',
                                                                            message: 'Proyecto actualizado correctamente',
                                                                            color: 'green'
                                                                        });
                                                                    } catch (error) {
                                                                        notifications.show({
                                                                            title: 'Error',
                                                                            message: 'Error al actualizar el proyecto',
                                                                            color: 'red'
                                                                        });
                                                                    }
                                                                } else {
                                                                    notifications.show({
                                                                        title: 'Error',
                                                                        message: 'No se puede actualizar: el ID del proyecto es inválido',
                                                                        color: 'red'
                                                                    });
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
                                    <Title order={3}>{selectedTechnicianModal?.full_name}</Title>
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
                                            technicianName: selectedTechnicianModal?.full_name 
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
                                                    tp => tp.project_id === selectedProject.id && 
                                                         tp.technician_name === selectedTechnicianModal.full_name
                                                );
                                                
                                                if (!techProgress) {
                                                    return <Text>No hay datos de progreso disponibles</Text>;
                                                }

                                                return (
                                                    <Stack gap="md">
                                                        <Group justify="apart">
                                                            <Text fw={500}>Partes completadas:</Text>
                                                            <Badge size="lg" color="green">
                                                                {techProgress.completed_parts} partes
                                                            </Badge>
                                                        </Group>
                                                        <Group justify="apart">
                                                            <Text fw={500}>Total del proyecto:</Text>
                                                            <Badge size="lg" color="blue">
                                                                {selectedProject.total_parts} partes
                                                            </Badge>
                                                        </Group>
                                                        <Group justify="apart">
                                                            <Text fw={500}>Porcentaje completado:</Text>
                                                            <Badge 
                                                                size="lg" 
                                                                color={Math.round((techProgress.completed_parts / selectedProject.total_parts) * 100) >= 50 ? 'green' : 'yellow'}
                                                            >
                                                                {Math.round((techProgress.completed_parts / selectedProject.total_parts) * 100)}%
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
                            onClick={async () => {
                                try {
                                    await projectService.delete(projectToDelete?.id || 0);
                                setProjects((prev: Project[]) => 
                                    prev.filter((p: Project) => p.id !== projectToDelete?.id)
                                );
                                    notifications.show({
                                        title: 'Éxito',
                                        message: 'Proyecto eliminado correctamente',
                                        color: 'green'
                                    });
                                } catch (error) {
                                    notifications.show({
                                        title: 'Error',
                                        message: 'Error al eliminar el proyecto',
                                        color: 'red'
                                    });
                                } finally {
                                setProjectToDelete(null);
                                }
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
                    batteryCodes={mapModal.batteryCodes}
                    onClose={() => setMapModal(null)}
                />
            )}

            {/* Agregar el modal para la lista de equipo */}
            <Modal
                opened={equipmentModalOpen}
                onClose={() => setEquipmentModalOpen(false)}
                title="Lista de Equipo Necesario"
                size="md"
            >
                <List spacing="xs">
                    {selectedProject?.equipment?.map((item, index) => (
                        <List.Item key={index}>{item}</List.Item>
                    ))}
                </List>
            </Modal>
        </>
    );
} 
