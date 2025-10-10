import { Paper, Title, Button, Group, TextInput, Select, ComboboxData, Center, Loader, Text, Stack, SimpleGrid } from '@mantine/core';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { IconSearch } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useLocations } from '../context/LocationContext';
import { attendanceService } from '../services/attendance';
import { RecentActivity } from '../types';
import { issuesService, Issue } from '../services/issues';
import L from 'leaflet';

interface Location {
    id: number;
    name: string;
    coordinates: [number, number];
    status: 'presente' | 'ausente' | 'en-ruta' | 'problema';
    city: string;
    checkInTime?: string;
    delayMinutes?: number;
    markerType?: 'check-in' | 'check-out';
    projectName?: string;
    photo?: string;
    photo_check_in?: string;
    photo_check_out?: string;
}

const employees: Location[] = [];

// Función para verificar y formatear las fotos Base64
const formatPhotoUrl = (photoData: string | null | undefined): string | null => {
    if (!photoData) return null;
    
    // Si ya tiene el prefijo data:image, devolver como está
    if (photoData.startsWith('data:image')) {
        return photoData;
    }
    
    // Si no tiene el prefijo, agregarlo (asumiendo que es JPEG)
    if (photoData && photoData.length > 0) {
        return `data:image/jpeg;base64,${photoData}`;
    }
    
    return null;
};

export default function ClientMap() {
    const [pulse, setPulse] = useState(true);
    const [filter, setFilter] = useState<'todos' | 'presentes' | 'ausentes' | 'en-ruta' | 'problemas'>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string | null>('todas');
    const { locations } = useLocations();
    const [isLoading, setIsLoading] = useState(true);
    const [showList, setShowList] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [reportedProblems, setReportedProblems] = useState<Issue[]>([]);
    const [problemsLoading, setProblemsLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setPulse(prev => !prev);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Detectar tamaño de pantalla
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768); // Breakpoint sm de Mantine (768px)
        };
        
        checkIsMobile(); // Verificar al montar
        window.addEventListener('resize', checkIsMobile);
        
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Función para obtener problemas reportados
    const fetchReportedProblems = async () => {
        try {
            setProblemsLoading(true);
            const problems = await issuesService.getIssues();
            setReportedProblems(problems);
        } catch (error) {
            console.error('Error fetching reported problems:', error);
            setReportedProblems([]);
        } finally {
            setProblemsLoading(false);
        }
    };

    // Cargar ubicaciones iniciales
    useEffect(() => {
        const loadInitialLocations = async () => {
            try {
                setIsLoading(true);
                
                // Importar el servicio de API
                const { apiClient } = await import('../services/api');
                
                // Obtener todos los técnicos con sus ubicaciones
                const employees = await apiClient.get('/api/employees/with-locations');
                console.log('Employees with locations:', employees);
                
                // Guardar empleados para uso en popups de problemas
                setEmployees(employees);

                // Limpiar ubicaciones existentes
                window.dispatchEvent(new CustomEvent('clearLocations'));

                // Crear marcadores para todos los técnicos
                employees.forEach((employee: any) => {
                    console.log('Processing employee:', {
                        id: employee.id,
                        name: employee.full_name,
                        photo_check_in: employee.photo_check_in ? 'EXISTS' : 'NULL',
                        photo_check_out: employee.photo_check_out ? 'EXISTS' : 'NULL',
                        checkInTime: employee.checkInTime,
                        checkOutTime: employee.checkOutTime
                    });
                    
                    if (employee.latitude && employee.longitude) {
                        const locationEvent = new CustomEvent('locationUpdate', {
                            detail: {
                                id: employee.id,
                                name: employee.full_name,
                                coordinates: [employee.latitude, employee.longitude] as [number, number],
                                status: employee.status,
                                city: employee.location || 'Ciudad Actual',
                                checkInTime: employee.checkInTime || 'Sin actividad',
                                checkOutTime: employee.checkOutTime || '',
                                markerType: employee.marker_type,
                                projectName: employee.project_name || 'Sin proyecto',
                                photo: employee.photo || '',
                                photo_check_in: employee.photo_check_in || '',
                                photo_check_out: employee.photo_check_out || ''
                            }
                        });
                        window.dispatchEvent(locationEvent);
                    }
                });

            } catch (error) {
                console.error('Error cargando ubicaciones:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialLocations();
        // Cambia el intervalo de actualización de 30 segundos (30000 ms) a 5 minutos (300000 ms)
        const interval = setInterval(loadInitialLocations, 300000);
        return () => clearInterval(interval);
    }, []);

    // Cargar problemas reportados al montar el componente
    useEffect(() => {
        fetchReportedProblems();
    }, []);

    const formatName = (fullName: string) => {
        const [firstName, lastName] = fullName.split(' ');
        return `${firstName} ${lastName.charAt(0)}.`;
    };

    // Crear icono triangular amarillo para problemas
    const createTriangleIcon = () => {
        return L.divIcon({
            className: 'custom-triangle-icon',
            html: `<div style="
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-bottom: 16px solid #EAB308;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 16],
            popupAnchor: [0, -16]
        });
    };

    // Función para obtener el nombre del técnico asignado por ID
    const getAssignedTechnicianName = (assignedUserId: number | null | undefined): string | null => {
        if (!assignedUserId) return null;
        const technician = employees.find(emp => emp.id === assignedUserId);
        return technician ? technician.full_name : null;
    };

    const cityOptions: ComboboxData = [
        { value: 'todas', label: 'Todas las ciudades' },
        ...Array.from(new Set(locations.map(emp => emp.city)))
            .map(city => ({ value: city, label: city }))
    ];

    const filteredEmployees = locations.filter(employee => {
        const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesProject = projectSearchQuery === '' || 
            (employee.projectName && employee.projectName.toLowerCase().includes(projectSearchQuery.toLowerCase()));
        const matchesStatus = filter === 'todos' ||
            (filter === 'presentes' && employee.status === 'presente') ||
            (filter === 'ausentes' && employee.status === 'ausente') ||
            (filter === 'en-ruta' && employee.status === 'en-ruta') ||
            (filter === 'problemas' && employee.status === 'problema'); // Nuevo filtro para problemas
        const matchesCity = selectedCity === 'todas' || employee.city === selectedCity;

        return matchesSearch && matchesProject && matchesStatus && matchesCity;
    });

    // Agregar un log para ver las ubicaciones filtradas
    console.log('Filtered employees:', filteredEmployees);

    return (
        <>
            <style>
                {`
                    .leaflet-control-attribution {
                        display: none !important;
                    }
                    
                    @media (max-width: 768px) {
                        .mobile-header {
                            margin-bottom: 20px !important;
                        }
                        
                        .mobile-title {
                            font-size: 24px !important;
                            line-height: 1.2 !important;
                        }
                        
                        .mobile-controls-section {
                            flex-direction: column !important;
                            gap: 12px !important;
                            margin-bottom: 16px !important;
                        }
                        
                        .mobile-filter-buttons {
                            flex-wrap: wrap !important;
                            gap: 8px !important;
                        }
                        
                        .mobile-filter-button {
                            font-size: 12px !important;
                            padding: 8px 12px !important;
                            min-width: 80px !important;
                        }
                        
                        .mobile-city-select {
                            font-size: 12px !important;
                            padding: 8px !important;
                            min-width: 120px !important;
                        }
                        
                        .mobile-list-button {
                            font-size: 12px !important;
                            padding: 8px 12px !important;
                        }
                        
                        .mobile-search-section {
                            flex-direction: column !important;
                            gap: 12px !important;
                            margin-bottom: 16px !important;
                        }
                        
                        .mobile-search-input {
                            font-size: 14px !important;
                            padding: 12px !important;
                        }
                        
                        .mobile-map-container {
                            height: 400px !important;
                            border-radius: 8px !important;
                        }
                        
                        .mobile-list-section {
                            margin-top: 16px !important;
                        }
                        
                        .mobile-list-button-back {
                            font-size: 12px !important;
                            padding: 8px 12px !important;
                            margin-bottom: 12px !important;
                        }
                        
                        .mobile-table-container {
                            overflow-x: auto !important;
                            border-radius: 8px !important;
                        }
                        
                        .mobile-table {
                            min-width: 600px !important;
                        }
                        
                        .mobile-table th {
                            padding: 8px 4px !important;
                            font-size: 11px !important;
                        }
                        
                        .mobile-table td {
                            padding: 8px 4px !important;
                            font-size: 11px !important;
                        }
                        
                        .mobile-table-photo {
                            width: 32px !important;
                            height: 32px !important;
                        }
                        
                        .mobile-popup-content {
                            min-width: 180px !important;
                            max-width: 250px !important;
                        }
                        
                        .mobile-popup-name {
                            font-size: 14px !important;
                            margin-bottom: 6px !important;
                        }
                        
                        .mobile-popup-status {
                            font-size: 12px !important;
                            margin-bottom: 4px !important;
                        }
                        
                        .mobile-popup-time {
                            font-size: 11px !important;
                            margin-bottom: 8px !important;
                        }
                        
                        .mobile-popup-project {
                            font-size: 11px !important;
                            margin-bottom: 8px !important;
                        }
                        
                        .mobile-popup-photos {
                            flex-direction: column !important;
                            gap: 8px !important;
                            align-items: center !important;
                        }
                        
                        .mobile-popup-photo-section {
                            text-align: center !important;
                        }
                        
                        .mobile-popup-photo-label {
                            font-size: 10px !important;
                            margin-bottom: 4px !important;
                        }
                        
                        .mobile-popup-photo {
                            width: 50px !important;
                            height: 50px !important;
                        }
                        
                        .mobile-loading-container {
                            height: 300px !important;
                        }
                        
                        .mobile-no-data-text {
                            font-size: 14px !important;
                            padding: 40px 20px !important;
                        }
                    }
                `}
            </style>
            <Title order={2} size="h1" mb="2rem" c="gray.3" ta={isMobile ? "center" : "left"}>
                Mapa de Técnicos
            </Title>

            {isLoading ? (
                <Paper p="md" radius="md" style={{ height: isMobile ? 'calc(100vh - 300px)' : 'calc(100vh - 200px)' }}>
                    <Center style={{ height: '100%' }}>
                        <Loader size="lg" />
                    </Center>
                </Paper>
            ) : (
                <>
                    {isMobile ? (
                        // Vista móvil - Stack vertical para controles
                        <Stack gap="md" mb="md">
                            {/* Botones de filtro - Grid responsivo */}
                            <SimpleGrid cols={2} spacing="sm">
                                <Button
                                    variant={filter === 'todos' ? 'filled' : 'light'}
                                    onClick={() => setFilter('todos')}
                                    fullWidth
                                    size="md"
                                    style={{ minHeight: 44 }}
                                >
                                    Todos
                                </Button>
                                <Button
                                    variant={filter === 'presentes' ? 'filled' : 'light'}
                                    color="green"
                                    onClick={() => setFilter('presentes')}
                                    fullWidth
                                    size="md"
                                    style={{ minHeight: 44 }}
                                >
                                    Presentes
                                </Button>
                                <Button
                                    variant={filter === 'ausentes' ? 'filled' : 'light'}
                                    color="red"
                                    onClick={() => setFilter('ausentes')}
                                    fullWidth
                                    size="md"
                                    style={{ minHeight: 44 }}
                                >
                                    Ausentes
                                </Button>
                                <Button
                                    variant={filter === 'en-ruta' ? 'filled' : 'light'}
                                    color="orange"
                                    onClick={() => setFilter('en-ruta')}
                                    fullWidth
                                    size="md"
                                    style={{ minHeight: 44 }}
                                >
                                    En ruta
                                </Button>
                                <Button
                                    variant={filter === 'problemas' ? 'filled' : 'light'}
                                    color="yellow"
                                    onClick={() => setFilter('problemas')}
                                    fullWidth
                                    size="md"
                                    style={{ minHeight: 44 }}
                                >
                                    Problemas
                                </Button>
                            </SimpleGrid>

                            {/* Selector de ciudad */}
                            <Select
                                placeholder="Seleccionar ciudad"
                                data={cityOptions}
                                value={selectedCity}
                                onChange={setSelectedCity}
                                styles={(theme) => ({
                                    input: {
                                        backgroundColor: theme.colors.dark[7],
                                        color: theme.colors.gray[3],
                                        minHeight: 44
                                    },
                                    dropdown: {
                                        backgroundColor: theme.colors.dark[7],
                                        borderColor: theme.colors.dark[4],
                                        zIndex: 9999
                                    },
                                    item: {
                                        '&[data-selected]': {
                                            backgroundColor: theme.colors.dark[5],
                                        },
                                        '&[data-hovered]': {
                                            backgroundColor: theme.colors.dark[6],
                                        },
                                        color: theme.colors.gray[3],
                                    }
                                })}
                            />

                            {/* Botón de lista */}
                            <Button
                                variant="outline"
                                color="blue"
                                onClick={() => setShowList(true)}
                                fullWidth
                                size="md"
                                style={{ minHeight: 44 }}
                            >
                                Ver lista
                            </Button>
                        </Stack>
                    ) : (
                        // Vista desktop - Layout horizontal original
                        <Group mb="md">
                            <Button
                                variant={filter === 'todos' ? 'filled' : 'light'}
                                onClick={() => setFilter('todos')}
                            >
                                Todos
                            </Button>
                            <Button
                                variant={filter === 'presentes' ? 'filled' : 'light'}
                                color="green"
                                onClick={() => setFilter('presentes')}
                            >
                                Presentes
                            </Button>
                            <Button
                                variant={filter === 'ausentes' ? 'filled' : 'light'}
                                color="red"
                                onClick={() => setFilter('ausentes')}
                            >
                                Ausentes
                            </Button>
                            <Button
                                variant={filter === 'en-ruta' ? 'filled' : 'light'}
                                color="orange"
                                onClick={() => setFilter('en-ruta')}
                            >
                                En ruta
                            </Button>
                            <Button
                                variant={filter === 'problemas' ? 'filled' : 'light'}
                                color="yellow"
                                onClick={() => setFilter('problemas')}
                            >
                                Problemas
                            </Button>

                            <Select
                                placeholder="Seleccionar ciudad"
                                data={cityOptions}
                                value={selectedCity}
                                onChange={setSelectedCity}
                                styles={(theme) => ({
                                    input: {
                                        backgroundColor: theme.colors.dark[7],
                                        color: theme.colors.gray[3],
                                    },
                                    dropdown: {
                                        backgroundColor: theme.colors.dark[7],
                                        borderColor: theme.colors.dark[4],
                                        zIndex: 9999
                                    },
                                    item: {
                                        '&[data-selected]': {
                                            backgroundColor: theme.colors.dark[5],
                                        },
                                        '&[data-hovered]': {
                                            backgroundColor: theme.colors.dark[6],
                                        },
                                        color: theme.colors.gray[3],
                                    }
                                })}
                            />
                            <Button
                                variant="outline"
                                color="blue"
                                style={{ marginLeft: 8 }}
                                onClick={() => setShowList(true)}
                            >
                                Ver lista
                            </Button>
                        </Group>
                    )}

                    <TextInput
                        placeholder="Buscar técnico..."
                        mb="md"
                        leftSection={<IconSearch size={14} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        styles={(theme) => ({
                            input: {
                                backgroundColor: theme.colors.dark[7],
                                color: theme.colors.gray[3],
                                minHeight: isMobile ? 44 : undefined,
                                '&::placeholder': {
                                    color: theme.colors.gray[5],
                                },
                            },
                        })}
                    />
                    
                    <TextInput
                        placeholder="Buscar proyecto..."
                        mb="md"
                        leftSection={<IconSearch size={14} />}
                        value={projectSearchQuery}
                        onChange={(e) => setProjectSearchQuery(e.currentTarget.value)}
                        styles={(theme) => ({
                            input: {
                                backgroundColor: theme.colors.dark[7],
                                color: theme.colors.gray[3],
                                minHeight: isMobile ? 44 : undefined,
                                '&::placeholder': {
                                    color: theme.colors.gray[5],
                                },
                            },
                        })}
                    />

                    {showList ? (
                        <>
                            <Button
                                variant="outline"
                                color="blue"
                                mb="md"
                                onClick={() => setShowList(false)}
                                fullWidth={isMobile}
                                size={isMobile ? "md" : "sm"}
                                style={{ minHeight: isMobile ? 44 : undefined }}
                            >
                                Ver mapa
                            </Button>
                            <Paper p="md" radius="md">
                                {isMobile ? (
                                    // Vista móvil - Cards en lugar de tabla
                                    <Stack gap="md">
                                        {locations.map((employee) => {
                                            console.log('Rendering employee in mobile cards:', {
                                                id: employee.id,
                                                name: employee.name,
                                                photo_check_in: employee.photo_check_in ? 'EXISTS' : 'NULL',
                                                photo_check_out: employee.photo_check_out ? 'EXISTS' : 'NULL'
                                            });
                                            return (
                                                <Paper key={employee.id} p="md" radius="md" withBorder>
                                                    <Stack gap="md">
                                                        {/* Header con nombre y status */}
                                                        <Group justify="space-between" wrap="nowrap">
                                                            <Text fw={500} size="md" c="gray.1" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {employee.name}
                                                            </Text>
                                                            <Text 
                                                                size="sm" 
                                                                fw={500}
                                                                c={employee.status === 'presente' ? '#10B981' : employee.status === 'ausente' ? '#EF4444' : employee.status === 'en-ruta' ? '#F59E0B' : employee.status === 'problema' ? '#EAB308' : '#6B7280'}
                                                                style={{ flexShrink: 0 }}
                                                            >
                                                                {employee.status === 'problema' ? 'Problema' : employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                                                            </Text>
                                                        </Group>

                                                        {/* Proyecto */}
                                                        <Group gap="xs" wrap="nowrap">
                                                            <Text size="xs" c="dimmed" style={{ flexShrink: 0, minWidth: 'fit-content' }}>
                                                                Proyecto:
                                                            </Text>
                                                            <Text size="sm" c="gray.3" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {employee.projectName || 'Sin proyecto'}
                                                            </Text>
                                                        </Group>

                                                        {/* Horarios y fotos */}
                                                        <SimpleGrid cols={2} spacing="md">
                                                            {/* Check-in */}
                                                            <Stack gap="xs" align="center">
                                                                <Text size="xs" c="dimmed" fw={500}>Check-in</Text>
                                                                <Text size="sm" c="gray.3">{employee.checkInTime || 'N/A'}</Text>
                                                                {formatPhotoUrl(employee.photo_check_in) ? (
                                                                    <img
                                                                        src={formatPhotoUrl(employee.photo_check_in)!}
                                                                        alt="Check-in"
                                                                        style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }}
                                                                        onError={(e) => {
                                                                            console.error('Error loading check-in photo:', e);
                                                                            e.currentTarget.style.display = 'none';
                                                                            (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '1.5em', border: '2px solid #10B981' }}>?</div>
                                                                )}
                                                            </Stack>

                                                            {/* Check-out */}
                                                            <Stack gap="xs" align="center">
                                                                <Text size="xs" c="dimmed" fw={500}>Check-out</Text>
                                                                <Text size="sm" c="gray.3">{employee.checkOutTime || 'N/A'}</Text>
                                                                {formatPhotoUrl(employee.photo_check_out) ? (
                                                                    <img
                                                                        src={formatPhotoUrl(employee.photo_check_out)!}
                                                                        alt="Check-out"
                                                                        style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #EF4444' }}
                                                                        onError={(e) => {
                                                                            console.error('Error loading check-out photo:', e);
                                                                            e.currentTarget.style.display = 'none';
                                                                            (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '1.5em', border: '2px solid #EF4444' }}>?</div>
                                                                )}
                                                            </Stack>
                                                        </SimpleGrid>
                                                    </Stack>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                ) : (
                                    // Vista desktop - Tabla original
                                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'transparent' }}>
                                        <thead>
                                            <tr style={{ background: '#232323' }}>
                                                <th style={{ padding: 8, color: '#fff' }}>Nombre</th>
                                                <th style={{ padding: 8, color: '#fff' }}>Status</th>
                                                <th style={{ padding: 8, color: '#fff' }}>Proyecto</th>
                                                <th style={{ padding: 8, color: '#fff' }}>Hora inicio</th>
                                                <th style={{ padding: 8, color: '#fff' }}>Foto check-in</th>
                                                <th style={{ padding: 8, color: '#fff' }}>Hora fin</th>
                                                <th style={{ padding: 8, color: '#fff' }}>Foto check-out</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {locations.map((employee) => {
                                                console.log('Rendering employee in table:', {
                                                    id: employee.id,
                                                    name: employee.name,
                                                    photo_check_in: employee.photo_check_in ? 'EXISTS' : 'NULL',
                                                    photo_check_out: employee.photo_check_out ? 'EXISTS' : 'NULL'
                                                });
                                                return (
                                                <tr key={employee.id} style={{ borderBottom: '1px solid #333' }}>
                                                    <td style={{ padding: 8 }}>{employee.name}</td>
                                                    <td style={{ padding: 8, color: employee.status === 'presente' ? '#10B981' : employee.status === 'ausente' ? '#EF4444' : employee.status === 'en-ruta' ? '#F59E0B' : employee.status === 'problema' ? '#EAB308' : '#6B7280' }}>
                                                        {employee.status === 'problema' ? 'Problema' : employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                                                    </td>
                                                    <td style={{ padding: 8 }}>{employee.projectName || 'Sin proyecto'}</td>
                                                    <td style={{ padding: 8 }}>{employee.checkInTime || 'N/A'}</td>
                                                    <td style={{ padding: 8 }}>
                                                            {formatPhotoUrl(employee.photo_check_in) ? (
                                                                                                                    <img
                                                                src={formatPhotoUrl(employee.photo_check_in)!}
                                                                alt="Check-in"
                                                                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #222' }}
                                                                    onError={(e) => {
                                                                        console.error('Error loading check-in photo:', e);
                                                                        e.currentTarget.style.display = 'none';
                                                                        (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                                                    }}
                                                            />
                                                        ) : (
                                                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '1.5em', border: '2px solid #222' }}>?</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: 8 }}>{employee.checkOutTime || 'N/A'}</td>
                                                    <td style={{ padding: 8 }}>
                                                            {formatPhotoUrl(employee.photo_check_out) ? (
                                                            <img
                                                                    src={formatPhotoUrl(employee.photo_check_out)!}
                                                                alt="Check-out"
                                                                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #222' }}
                                                                    onError={(e) => {
                                                                        console.error('Error loading check-out photo:', e);
                                                                        e.currentTarget.style.display = 'none';
                                                                        (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                                                    }}
                                                            />
                                                        ) : (
                                                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '1.5em', border: '2px solid #222' }}>?</div>
                                                        )}
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </Paper>
                        </>
                    ) : (
                        <Paper p="md" radius="md" className="mobile-map-container" style={{ height: 'calc(100vh - 200px)' }}>
                            {(filter === 'problemas' ? reportedProblems.filter(problem => {
                                if (!problem.location) return false;
                                
                                let lat: number, lng: number;
                                
                                // Manejar diferentes formatos de coordenadas
                                if (problem.location.includes('Lat:') && problem.location.includes('Lng:')) {
                                    const latMatch = problem.location.match(/Lat:\s*([+-]?\d*\.?\d+)/);
                                    const lngMatch = problem.location.match(/Lng:\s*([+-]?\d*\.?\d+)/);
                                    
                                    if (!latMatch || !lngMatch) return false;
                                    lat = parseFloat(latMatch[1]);
                                    lng = parseFloat(lngMatch[1]);
                                } else {
                                    const coords = problem.location.split(',');
                                    if (coords.length !== 2) return false;
                                    
                                    lat = parseFloat(coords[0].trim());
                                    lng = parseFloat(coords[1].trim());
                                }
                                
                                return !isNaN(lat) && !isNaN(lng) && 
                                       lat >= -90 && lat <= 90 && 
                                       lng >= -180 && lng <= 180;
                            }).length === 0 : filteredEmployees.length === 0) ? (
                                <Center style={{ height: '100%' }}>
                                    <Text c="dimmed" className="mobile-no-data-text">
                                        {filter === 'problemas' ? 'No hay problemas reportados con ubicación válida' : 'No hay técnicos activos en este momento'}
                                    </Text>
                                </Center>
                            ) : (
                                <MapContainer
                                    center={(() => {
                                        if (filter === 'problemas') {
                                            const validProblems = reportedProblems.filter(problem => {
                                                if (!problem.location) return false;
                                                
                                                let lat: number, lng: number;
                                                
                                                // Manejar diferentes formatos de coordenadas
                                                if (problem.location.includes('Lat:') && problem.location.includes('Lng:')) {
                                                    const latMatch = problem.location.match(/Lat:\s*([+-]?\d*\.?\d+)/);
                                                    const lngMatch = problem.location.match(/Lng:\s*([+-]?\d*\.?\d+)/);
                                                    
                                                    if (!latMatch || !lngMatch) return false;
                                                    lat = parseFloat(latMatch[1]);
                                                    lng = parseFloat(lngMatch[1]);
                                                } else {
                                                    const coords = problem.location.split(',');
                                                    if (coords.length !== 2) return false;
                                                    
                                                    lat = parseFloat(coords[0].trim());
                                                    lng = parseFloat(coords[1].trim());
                                                }
                                                
                                                return !isNaN(lat) && !isNaN(lng) && 
                                                       lat >= -90 && lat <= 90 && 
                                                       lng >= -180 && lng <= 180;
                                            });
                                            if (validProblems.length > 0) {
                                                const problem = validProblems[0];
                                                let lat: number, lng: number;
                                                
                                                if (problem.location!.includes('Lat:') && problem.location!.includes('Lng:')) {
                                                    const latMatch = problem.location!.match(/Lat:\s*([+-]?\d*\.?\d+)/);
                                                    const lngMatch = problem.location!.match(/Lng:\s*([+-]?\d*\.?\d+)/);
                                                    lat = parseFloat(latMatch![1]);
                                                    lng = parseFloat(lngMatch![1]);
                                                } else {
                                                    const coords = problem.location!.split(',');
                                                    lat = parseFloat(coords[0].trim());
                                                    lng = parseFloat(coords[1].trim());
                                                }
                                                return [lat, lng] as [number, number];
                                            }
                                        }
                                        return filteredEmployees.length > 0 
                                            ? filteredEmployees[0].coordinates 
                                            : [23.6345, -102.5528];
                                    })()}
                                    zoom={5}
                                    style={{ height: '100%', width: '100%', background: '#1A1B1E' }}
                                    zoomControl={false}
                                >
                                    <TileLayer
                                        attribution=''
                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    />

                                    {/* Marcadores de técnicos - no mostrar cuando filtro es 'problemas' */}
                                    {filter !== 'problemas' && filteredEmployees.map((employee) => {
                                        console.log('DEBUG MARCADOR:', {
                                            name: employee.name,
                                            markerType: employee.markerType,
                                            status: employee.status,
                                            photo_check_in: employee.photo_check_in ? 'EXISTS' : 'NULL',
                                            photo_check_out: employee.photo_check_out ? 'EXISTS' : 'NULL',
                                            employee
                                        });
                                        
                                        // Determinar color del marcador basado en el status del empleado
                                        let markerColor = '#6B7280'; // Gris por defecto
                                        if (employee.status === 'presente') {
                                            markerColor = '#10B981'; // Verde para presentes
                                        } else if (employee.status === 'ausente') {
                                            markerColor = '#EF4444'; // Rojo para ausentes
                                        } else if (employee.status === 'en-ruta') {
                                            markerColor = '#F59E0B'; // Naranja para en ruta
                                        } else if (employee.status === 'problema') {
                                            markerColor = '#EAB308'; // Amarillo para problemas
                                        }
                                        
                                        return (
                                            <CircleMarker
                                                key={employee.id}
                                                center={employee.coordinates}
                                                radius={8}
                                                pathOptions={{
                                                    fillColor: markerColor,
                                                    fillOpacity: pulse ? 0.6 : 0.3,
                                                    color: markerColor,
                                                    weight: 2,
                                                    opacity: pulse ? 1 : 0.5
                                                }}
                                            >
                                                <Popup>
                                                    <div className="mobile-popup-content" style={{ display: 'flex', alignItems: 'center', minWidth: 220 }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div className="mobile-popup-name" style={{ fontWeight: 600, fontSize: '1.1em', marginBottom: 4 }}>{employee.name}</div>
                                                            <div className="mobile-popup-status" style={{ marginBottom: 4 }}>
                                                                <span style={{ color: markerColor, fontWeight: 500 }}>
                                                                    {employee.status === 'presente' ? 'Presente' : 
                                                                     employee.status === 'ausente' ? 'Ausente' : 
                                                                     employee.status === 'en-ruta' ? 'En ruta' : 
                                                                     employee.status === 'problema' ? 'Problema' : 'Sin estado'}
                                                                </span>
                                                                <span className="mobile-popup-time" style={{ marginLeft: 8, color: '#555', fontSize: '0.95em' }}>
                                                                    {employee.checkInTime}
                                                                </span>
                                                            </div>
                                                            <div className="mobile-popup-project" style={{ fontSize: '0.95em', color: '#555' }}>
                                                                Proyecto:<br />
                                                                <span style={{ color: '#222', fontWeight: 500 }}>{employee.projectName || 'Sin proyecto'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="mobile-popup-photos" style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                            {/* Foto de Check-in */}
                                                            <div className="mobile-popup-photo-section" style={{ textAlign: 'center' }}>
                                                                <div className="mobile-popup-photo-label" style={{ fontSize: '0.8em', color: '#666', marginBottom: '4px' }}>Check-in</div>
                                                                {formatPhotoUrl(employee.photo_check_in) ? (
                                                                    <img
                                                                        src={formatPhotoUrl(employee.photo_check_in)!}
                                                                        alt="Foto check-in"
                                                                        className="mobile-popup-photo"
                                                                    style={{
                                                                            width: '60px',
                                                                            height: '60px',
                                                                        objectFit: 'cover',
                                                                            borderRadius: '50%',
                                                                            border: '2px solid #10B981',
                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                                                        }}
                                                                        onError={(e) => {
                                                                            console.error('Error loading check-in photo:', e);
                                                                            e.currentTarget.style.display = 'none';
                                                                            (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="mobile-popup-photo" style={{
                                                                        width: '60px',
                                                                        height: '60px',
                                                                        borderRadius: '50%',
                                                                        background: '#333',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: '#bbb',
                                                                        fontSize: '1.5em',
                                                                        border: '2px solid #10B981'
                                                                    }}>
                                                                        ?
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Foto de Check-out */}
                                                            <div className="mobile-popup-photo-section" style={{ textAlign: 'center' }}>
                                                                <div className="mobile-popup-photo-label" style={{ fontSize: '0.8em', color: '#666', marginBottom: '4px' }}>Check-out</div>
                                                                {formatPhotoUrl(employee.photo_check_out) ? (
                                                                    <img
                                                                        src={formatPhotoUrl(employee.photo_check_out)!}
                                                                        alt="Foto check-out"
                                                                        className="mobile-popup-photo"
                                                                        style={{
                                                                            width: '60px',
                                                                            height: '60px',
                                                                            objectFit: 'cover',
                                                                            borderRadius: '50%',
                                                                            border: '2px solid #EF4444',
                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                                                        }}
                                                                        onError={(e) => {
                                                                            console.error('Error loading check-out photo:', e);
                                                                            e.currentTarget.style.display = 'none';
                                                                            (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="mobile-popup-photo" style={{
                                                                        width: '60px',
                                                                        height: '60px',
                                                                    borderRadius: '50%',
                                                                    background: '#333',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#bbb',
                                                                        fontSize: '1.5em',
                                                                        border: '2px solid #EF4444'
                                                                }}>
                                                                    ?
                                                                </div>
                                                            )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </CircleMarker>
                                        );
                                    })}

                                    {/* Marcadores de problemas reportados - mostrar cuando filtro es 'todos' o 'problemas' */}
                                    {(filter === 'todos' || filter === 'problemas') && reportedProblems
                                        .filter(problem => {
                                            // Filtrar problemas que tienen coordenadas válidas
                                            if (!problem.location) return false;
                                            
                                            let lat: number, lng: number;
                                            
                                            // Manejar diferentes formatos de coordenadas
                                            if (problem.location.includes('Lat:') && problem.location.includes('Lng:')) {
                                                // Formato: "Lat: 25.465720, Lng: -100.966437"
                                                const latMatch = problem.location.match(/Lat:\s*([+-]?\d*\.?\d+)/);
                                                const lngMatch = problem.location.match(/Lng:\s*([+-]?\d*\.?\d+)/);
                                                
                                                if (!latMatch || !lngMatch) return false;
                                                lat = parseFloat(latMatch[1]);
                                                lng = parseFloat(lngMatch[1]);
                                            } else {
                                                // Formato: "29.06804441,-110.95180070"
                                                const coords = problem.location.split(',');
                                                if (coords.length !== 2) return false;
                                                
                                                lat = parseFloat(coords[0].trim());
                                                lng = parseFloat(coords[1].trim());
                                            }
                                            
                                            return !isNaN(lat) && !isNaN(lng) && 
                                                   lat >= -90 && lat <= 90 && 
                                                   lng >= -180 && lng <= 180;
                                        })
                                        .map((problem) => {
                                            let lat: number, lng: number;
                                            
                                            // Parsear coordenadas según el formato
                                            if (problem.location!.includes('Lat:') && problem.location!.includes('Lng:')) {
                                                const latMatch = problem.location!.match(/Lat:\s*([+-]?\d*\.?\d+)/);
                                                const lngMatch = problem.location!.match(/Lng:\s*([+-]?\d*\.?\d+)/);
                                                lat = parseFloat(latMatch![1]);
                                                lng = parseFloat(lngMatch![1]);
                                            } else {
                                                const coords = problem.location!.split(',');
                                                lat = parseFloat(coords[0].trim());
                                                lng = parseFloat(coords[1].trim());
                                            }
                                            
                                            return (
                                                <Marker
                                                    key={`problem-${problem.id}`}
                                                    position={[lat, lng]}
                                                    icon={createTriangleIcon()}
                                                >
                                                    <Popup>
                                                        <div style={{ 
                                                            minWidth: 220, 
                                                            backgroundColor: '#1A1B1E', 
                                                            color: '#E9ECEF',
                                                            padding: '12px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #373A40'
                                                        }}>
                                                            <div style={{ 
                                                                fontWeight: 600, 
                                                                fontSize: '1.1em', 
                                                                marginBottom: 12, 
                                                                color: '#EAB308',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}>
                                                                🚨 Problema Reportado
                                                            </div>
                                                            
                                                            <div style={{ marginBottom: 8 }}>
                                                                <span style={{ color: '#ADB5BD', fontSize: '0.9em', fontWeight: 500 }}>Tipo:</span>
                                                                <div style={{ color: '#E9ECEF', marginTop: 2 }}>{problem.type}</div>
                                                            </div>
                                                            
                                                            <div style={{ marginBottom: 8 }}>
                                                                <span style={{ color: '#ADB5BD', fontSize: '0.9em', fontWeight: 500 }}>VIN:</span>
                                                                <div style={{ color: '#E9ECEF', marginTop: 2, fontFamily: 'monospace' }}>{problem.part_number_vin}</div>
                                                            </div>
                                                            
                                                            <div style={{ marginBottom: 8 }}>
                                                                <span style={{ color: '#ADB5BD', fontSize: '0.9em', fontWeight: 500 }}>Proyecto:</span>
                                                                <div style={{ color: '#E9ECEF', marginTop: 2 }}>{problem.project}</div>
                                                            </div>
                                                            
                                                            <div style={{ marginBottom: 8 }}>
                                                                <span style={{ color: '#ADB5BD', fontSize: '0.9em', fontWeight: 500 }}>Estado:</span>
                                                                <div style={{ marginTop: 2 }}>
                                                                    <span style={{ 
                                                                        color: problem.status === 'pendiente' ? '#EAB308' : 
                                                                               problem.status === 'en-revision' ? '#F59E0B' : '#10B981',
                                                                        fontWeight: 500,
                                                                        fontSize: '0.95em'
                                                                    }}>
                                                                        {problem.status.charAt(0).toUpperCase() + problem.status.slice(1)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div style={{ marginBottom: 8 }}>
                                                                <span style={{ color: '#ADB5BD', fontSize: '0.9em', fontWeight: 500 }}>Fecha:</span>
                                                                <div style={{ color: '#E9ECEF', marginTop: 2 }}>
                                                                    {new Date(problem.date_reported).toLocaleDateString('es-ES', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    })}
                                                                </div>
                                                            </div>
                                                            
                                                            {problem.assigned_user_id && getAssignedTechnicianName(problem.assigned_user_id) && (
                                                                <div style={{ marginBottom: 8 }}>
                                                                    <span style={{ color: '#ADB5BD', fontSize: '0.9em', fontWeight: 500 }}>Técnico Asignado:</span>
                                                                    <div style={{ 
                                                                        color: '#10B981', 
                                                                        marginTop: 2, 
                                                                        fontWeight: 500,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px'
                                                                    }}>
                                                                        👤 {getAssignedTechnicianName(problem.assigned_user_id)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {(!problem.assigned_user_id || !getAssignedTechnicianName(problem.assigned_user_id)) && (
                                                                <div style={{ marginBottom: 8 }}>
                                                                    <span style={{ color: '#ADB5BD', fontSize: '0.9em', fontWeight: 500 }}>Técnico Asignado:</span>
                                                                    <div style={{ 
                                                                        color: '#EAB308', 
                                                                        marginTop: 2, 
                                                                        fontWeight: 500,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px'
                                                                    }}>
                                                                        ⚠️ Sin asignar
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {problem.description && (
                                                                <div style={{ marginBottom: 8 }}>
                                                                    <span style={{ color: '#ADB5BD', fontSize: '0.9em', fontWeight: 500 }}>Descripción:</span>
                                                                    <div style={{ 
                                                                        color: '#E9ECEF', 
                                                                        marginTop: 2, 
                                                                        fontSize: '0.9em',
                                                                        lineHeight: '1.4',
                                                                        backgroundColor: '#2C2E33',
                                                                        padding: '8px',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #373A40'
                                                                    }}>
                                                                        {problem.description}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}
                                </MapContainer>
                            )}
                        </Paper>
                    )}
                </>
            )}
        </>
    );
}