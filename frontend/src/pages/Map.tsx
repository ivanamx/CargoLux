import { Paper, Title, Button, Group, TextInput, Select, ComboboxData, Center, Loader, Text, Stack, SimpleGrid, ScrollArea } from '@mantine/core';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { IconSearch } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useLocations } from '../context/LocationContext';
import { attendanceService } from '../services/attendance';
import { RecentActivity } from '../types';

interface Location {
    id: number;
    name: string;
    coordinates: [number, number];
    status: 'presente' | 'ausente' | 'en-ruta';
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

export default function Map() {
    const [pulse, setPulse] = useState(true);
    const [filter, setFilter] = useState<'todos' | 'presentes' | 'ausentes' | 'en-ruta'>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string | null>('todas');
    const { locations } = useLocations();
    const [isLoading, setIsLoading] = useState(true);
    const [showList, setShowList] = useState(false);
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

    useEffect(() => {
        const interval = setInterval(() => {
            setPulse(prev => !prev);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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

    const formatName = (fullName: string) => {
        const [firstName, lastName] = fullName.split(' ');
        return `${firstName} ${lastName.charAt(0)}.`;
    };

    const cityOptions: ComboboxData = [
        { value: 'todas', label: 'Todas las ciudades' },
        ...Array.from(new Set(locations.map(emp => emp.city)))
            .map(city => ({ value: city, label: city }))
    ];

    const filteredEmployees = locations.filter(employee => {
        const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filter === 'todos' ||
            (filter === 'presentes' && employee.status === 'presente') ||
            (filter === 'ausentes' && employee.status === 'ausente') ||
            (filter === 'en-ruta' && employee.status === 'en-ruta');
        const matchesCity = selectedCity === 'todas' || employee.city === selectedCity;

        return matchesSearch && matchesStatus && matchesCity;
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
                                                                c={employee.status === 'presente' ? '#10B981' : employee.status === 'ausente' ? '#EF4444' : '#F59E0B'}
                                                                style={{ flexShrink: 0 }}
                                                            >
                                                                {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
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
                                                    <td style={{ padding: 8, color: employee.status === 'presente' ? '#10B981' : employee.status === 'ausente' ? '#EF4444' : '#F59E0B' }}>
                                                        {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
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
                        <Paper p="md" radius="md" style={{ height: isMobile ? 'calc(100vh - 400px)' : 'calc(100vh - 200px)' }}>
                            {filteredEmployees.length === 0 ? (
                                <Center style={{ height: '100%' }}>
                                    <Text c="dimmed">No hay técnicos activos en este momento</Text>
                                </Center>
                            ) : (
                                <MapContainer
                                    center={filteredEmployees.length > 0 
                                        ? filteredEmployees[0].coordinates 
                                        : [23.6345, -102.5528]}
                                    zoom={isMobile ? 4 : 5}
                                    style={{ height: '100%', width: '100%', background: '#1A1B1E' }}
                                    zoomControl={!isMobile}
                                >
                                    <TileLayer
                                        attribution=''
                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    />

                                    {filteredEmployees.map((employee) => {
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
                                        }
                                        
                                        return (
                                            <CircleMarker
                                                key={employee.id}
                                                center={employee.coordinates}
                                                radius={isMobile ? 10 : 8}
                                                pathOptions={{
                                                    fillColor: markerColor,
                                                    fillOpacity: pulse ? 0.6 : 0.3,
                                                    color: markerColor,
                                                    weight: 2,
                                                    opacity: pulse ? 1 : 0.5
                                                }}
                                            >
                                                <Popup>
                                                    <div style={{ display: 'flex', alignItems: 'center', minWidth: isMobile ? 280 : 220 }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 600, fontSize: isMobile ? '1.2em' : '1.1em', marginBottom: 4 }}>{employee.name}</div>
                                                            <div style={{ marginBottom: 4 }}>
                                                                <span style={{ color: markerColor, fontWeight: 500 }}>
                                                                    {employee.status === 'presente' ? 'Presente' : 
                                                                     employee.status === 'ausente' ? 'Ausente' : 
                                                                     employee.status === 'en-ruta' ? 'En ruta' : 'Sin estado'}
                                                                </span>
                                                                <span style={{ marginLeft: 8, color: '#555', fontSize: '0.95em' }}>
                                                                    {employee.checkInTime}
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '0.95em', color: '#555' }}>
                                                                Proyecto:<br />
                                                                <span style={{ color: '#222', fontWeight: 500 }}>{employee.projectName || 'Sin proyecto'}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                            {/* Foto de Check-in */}
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '4px' }}>Check-in</div>
                                                                {formatPhotoUrl(employee.photo_check_in) ? (
                                                                    <img
                                                                        src={formatPhotoUrl(employee.photo_check_in)!}
                                                                        alt="Foto check-in"
                                                                    style={{
                                                                            width: isMobile ? '70px' : '60px',
                                                                            height: isMobile ? '70px' : '60px',
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
                                                                    <div style={{
                                                                        width: isMobile ? '70px' : '60px',
                                                                        height: isMobile ? '70px' : '60px',
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
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '4px' }}>Check-out</div>
                                                                {formatPhotoUrl(employee.photo_check_out) ? (
                                                                    <img
                                                                        src={formatPhotoUrl(employee.photo_check_out)!}
                                                                        alt="Foto check-out"
                                                                        style={{
                                                                            width: isMobile ? '70px' : '60px',
                                                                            height: isMobile ? '70px' : '60px',
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
                                                                <div style={{
                                                                        width: isMobile ? '70px' : '60px',
                                                                        height: isMobile ? '70px' : '60px',
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
                                </MapContainer>
                            )}
                        </Paper>
                    )}
                </>
            )}
        </>
    );
}