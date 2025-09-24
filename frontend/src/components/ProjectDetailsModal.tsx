import { Title, Paper, Text, Group, Badge, Stack, List, ActionIcon, Box, Progress, Modal, SimpleGrid } from '@mantine/core';
import { IconMapPin, IconPhone, IconMail, IconBuildingFactory, IconBed, IconUser, IconTools, IconDownload } from '@tabler/icons-react';
import { plantImages, hotelImages, cityImages, getCityFromAddress } from '../data/projectsData';
import type { Project } from '../types/project';
import { useState, useEffect } from 'react';
import { WeatherService, type WeatherData } from '../services/weather';
import { WeatherIndicator } from './WeatherIndicator';
import { WeatherAnimations } from './WeatherAnimations';

interface ProjectDetailsModalProps {
    project: Project | null;
    onClose: () => void;
    onTechnicianClick?: (technicianName: string) => void;
    onImageClick?: (imageData: { src: string; title: string }) => void;
    onEquipmentClick?: () => void;
}

export function ProjectDetailsModal({ 
    project, 
    onClose, 
    onTechnicianClick,
    onImageClick,
    onEquipmentClick 
}: ProjectDetailsModalProps) {
    console.log('ProjectDetailsModal - project:', project);
    console.log('ProjectDetailsModal - assigned_to:', project?.assigned_to);

    // Agregar estado local para forzar re-renders
    const [, forceUpdate] = useState({});
    
    // Estados para el clima
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);

    // Función para obtener el clima
    const fetchWeather = async () => {
        if (!project?.location?.plant_address) return;
        
        setWeatherLoading(true);
        try {
            const city = getCityFromAddress(project.location.plant_address);
            const weather = await WeatherService.getWeatherByCity(city);
            setWeatherData(weather);
        } catch (error) {
            console.error('Error fetching weather:', error);
            setWeatherData(null);
        } finally {
            setWeatherLoading(false);
        }
    };

    // Escuchar eventos de actualización del estado del proyecto
    useEffect(() => {
        const handleProjectStatusUpdate = () => {
            console.log('Project status updated, forcing re-render');
            forceUpdate({});
        };

        window.addEventListener('project-status-updated', handleProjectStatusUpdate);

        return () => {
            window.removeEventListener('project-status-updated', handleProjectStatusUpdate);
        };
    }, []);

    // Cargar clima cuando se abre el modal
    useEffect(() => {
        if (project) {
            fetchWeather();
        }
    }, [project]);

    const getProjectStatusFromProgress = (project: Project) => {
        // Si el proyecto está completado, mantener ese estado
        if (project.status === 'completado') {
            return 'completado';
        }
        // Si el progreso es 100%, marcar como completado
        if (project.progress === 100) {
            return 'completado';
        }
        // En cualquier otro caso, respetar el estado actual del proyecto
        return project.status;
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error al descargar el archivo:', error);
        }
    };

    const getProjectBackgroundImage = (project: Project | null) => {
        if (!project) return cityImages.default;
        
        if (!project.location?.plant_address) {
            if (project.client === 'Stellantis') return cityImages['Saltillo'] || cityImages.default;
            if (project.client === 'APTIV Cableados') return cityImages['Saltillo'] || cityImages.default;
            return cityImages.default;
        }
        
        const city = getCityFromAddress(project.location.plant_address);
        return cityImages[city as keyof typeof cityImages] || cityImages.default;
    };

    const getPlantImageKey = (plantName: string | undefined): keyof typeof plantImages => {
        console.log('getPlantImageKey called with:', plantName);
        
        if (!plantName) {
            console.log('No plant name, returning default');
            return 'default';
        }
        
        // Buscar coincidencias exactas primero
        if (plantName === 'APTIV Planta Zacatecas') {
            console.log('Exact match: APTIV Planta Zacatecas');
            return 'APTIV Planta Zacatecas';
        }
        if (plantName === 'HARMAN México') {
            console.log('Exact match: HARMAN México');
            return 'HARMAN México';
        }
        if (plantName === 'Ford Hermosillo') {
            console.log('Exact match: Ford Hermosillo');
            return 'Ford Hermosillo';
        }
        if (plantName === 'TOYOTA TMMGT') {
            console.log('Exact match: TOYOTA TMMGT');
            return 'TOYOTA TMMGT';
        }
        if (plantName === 'SVAP VAN') {
            console.log('Exact match: SVAP VAN');
            return 'SVAP VAN';
        }
        if (plantName === 'STAP Trucks') {
            console.log('Exact match: STAP Trucks');
            return 'STAP Trucks';
        }
        if (plantName === 'TAP Toluca') {
            console.log('Exact match: TAP Toluca');
            return 'TAP Toluca';
        }
        if (plantName === 'Patio Comodato Toluca') {
            console.log('Exact match: Patio Comodato Toluca');
            return 'Patio Comodato Toluca';
        }
        
        // Si no hay coincidencia exacta, buscar por palabras clave
        if (plantName.includes('APTIV')) {
            console.log('Keyword match: APTIV -> APTIV Planta Zacatecas');
            return 'APTIV Planta Zacatecas';
        }
        if (plantName.includes('HARMAN')) {
            console.log('Keyword match: HARMAN -> HARMAN México');
            return 'HARMAN México';
        }
        if (plantName.includes('Ford')) {
            console.log('Keyword match: Ford -> Ford Hermosillo');
            return 'Ford Hermosillo';
        }
        if (plantName.includes('TOYOTA') || plantName.includes('TMMGT')) {
            console.log('Keyword match: TOYOTA/TMMGT -> TOYOTA TMMGT');
            return 'TOYOTA TMMGT';
        }
        if (plantName.includes('SVAP')) {
            console.log('Keyword match: SVAP -> SVAP VAN');
            return 'SVAP VAN';
        }
        if (plantName.includes('STAP')) {
            console.log('Keyword match: STAP -> STAP Trucks');
            return 'STAP Trucks';
        }
        if (plantName.includes('TAP') && !plantName.includes('STAP')) {
            console.log('Keyword match: TAP -> TAP Toluca');
            return 'TAP Toluca';
        }
        if (plantName.includes('Patio') || plantName.includes('Comodato')) {
            console.log('Keyword match: Patio/Comodato -> Patio Comodato Toluca');
            return 'Patio Comodato Toluca';
        }
        
        console.log('No match found, returning default');
        return 'default';
    };

    return (
        <Modal
            opened={!!project}
            onClose={onClose}
            size="xl"
            // Optimizaciones para móvil
            styles={{
                content: {
                    '@media (max-width: 768px)': {
                        margin: '8px',
                        height: 'calc(100vh - 16px)',
                        maxHeight: 'calc(100vh - 16px)',
                    }
                },
                body: {
                    '@media (max-width: 768px)': {
                        padding: '12px',
                        maxHeight: 'calc(100vh - 80px)',
                        overflowY: 'auto',
                    }
                },
                header: {
                    '@media (max-width: 768px)': {
                        padding: '12px',
                        borderBottom: '1px solid var(--mantine-color-gray-3)',
                    }
                }
            }}
            title={
                <Group wrap="nowrap" gap="xs">
                    <IconBuildingFactory size={20} />
                    <Title 
                        order={3} 
                        style={{ 
                            fontSize: 'clamp(16px, 4vw, 20px)',
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                        }}
                    >
                        {project?.name}
                    </Title>
                    <Badge
                        size="sm"
                        color={
                            project ? (
                                getProjectStatusFromProgress(project) === 'activo' ? 'blue' :
                                getProjectStatusFromProgress(project) === 'completado' ? 'green' :
                                getProjectStatusFromProgress(project) === 'en-progreso' ? 'teal' : 'yellow'
                            ) : 'gray'
                        }
                    >
                        {project ? getProjectStatusFromProgress(project).toUpperCase() : ''}
                    </Badge>
                </Group>
            }
        >
            {project && (
                <Stack>
                    {/* Sección de Progreso y Clima - VISTA MÓVIL */}
                    <Box hiddenFrom="md">
                        <Stack gap="md">
                            {/* Progreso del Proyecto - Solo móvil */}
                            <Paper p="md" radius="md" withBorder
                                style={{
                                    background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('${getProjectBackgroundImage(project)}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minHeight: '120px'
                                }}
                            >
                                <Box style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <Text c="gray.3" mb="xs" size="sm">Progreso del Proyecto: <Text span fw={500} c="gray.2">{Math.round((project.completed_parts / project.total_parts) * 100)}%</Text></Text>
                                        <Progress 
                                            value={Math.round((project.completed_parts / project.total_parts) * 100)}
                                            color="lime"
                                            size="lg"
                                            radius="xl"
                                            mb="xs"
                                        />
                                    </div>
                                    <Group justify="space-between" align="center" wrap="wrap">
                                        <Text size="md" c="gray.4">
                                            Partes:{' '}
                                            <Text span c="lime" fw={700} size="md">
                                                {project.completed_parts}/{project.total_parts}
                                            </Text>
                                        </Text>
                                        <Group gap={4} wrap="wrap">
                                            {Array.isArray(project.assigned_to) && project.assigned_to.map((tech: string, index: number) => {
                                                const names = tech.split(' ');
                                                const shortName = names.length > 1 ? 
                                                    `${names[0]} ${names[1]}` : 
                                                    names[0];
                                                
                                                return (
                                                    <Badge 
                                                        key={index}
                                                        size="sm"
                                                        variant="filled"
                                                        color="violet"
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            backgroundColor: '#4c2889',
                                                            color: 'white',
                                                            minHeight: '28px',
                                                            padding: '4px 8px'
                                                        }}
                                                        onClick={() => onTechnicianClick?.(tech)}
                                                    >
                                                        {shortName}
                                                    </Badge>
                                                );
                                            })}
                                        </Group>
                                    </Group>
                                </Box>
                            </Paper>

                            {/* Contenedor de Clima - Solo móvil */}
                            <Paper p="md" radius="md" withBorder
                                style={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minHeight: '100px',
                                    background: weatherData ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                            >
                                {weatherData && (
                                    <WeatherAnimations 
                                        key={`weather-${weatherData.weatherCode}-${Date.now()}`}
                                        weatherCode={weatherData.weatherCode} 
                                    />
                                )}
                                
                                <Box style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <Text c="white" fw={600} size="md" mb="sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                                            Clima Actual
                                        </Text>
                                        <WeatherIndicator 
                                            weatherData={weatherData} 
                                            loading={weatherLoading} 
                                        />
                                    </div>
                                    
                                    {weatherData && (
                                        <Group justify="space-between" wrap="nowrap">
                                            <Text size="sm" c="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Viento:</Text>
                                            <Text size="sm" fw={500} c="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{weatherData.windSpeed} km/h</Text>
                                        </Group>
                                    )}
                                </Box>
                            </Paper>
                        </Stack>
                    </Box>

                    {/* Sección de Progreso y Clima - VISTA ESCRITORIO (2 por fila) */}
                    <Box visibleFrom="md">
                        <SimpleGrid cols={2} spacing="md" style={{ gridTemplateColumns: '2fr 1fr' }}>
                            {/* Progreso del Proyecto - Escritorio */}
                            <Paper p="md" radius="md" withBorder
                                style={{
                                    background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('${getProjectBackgroundImage(project)}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minHeight: '120px'
                                }}
                            >
                                <Box style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <Text c="gray.3" mb="xs" size="sm">Progreso del Proyecto: <Text span fw={500} c="gray.2">{Math.round((project.completed_parts / project.total_parts) * 100)}%</Text></Text>
                                        <Progress 
                                            value={Math.round((project.completed_parts / project.total_parts) * 100)}
                                            color="lime"
                                            size="lg"
                                            radius="xl"
                                            mb="xs"
                                        />
                                    </div>
                                    <Group justify="space-between" align="center" wrap="wrap">
                                        <Text size="md" c="gray.4">
                                            Partes:{' '}
                                            <Text span c="lime" fw={700} size="md">
                                                {project.completed_parts}/{project.total_parts}
                                            </Text>
                                        </Text>
                                        <Group gap={4} wrap="wrap">
                                            {Array.isArray(project.assigned_to) && project.assigned_to.map((tech: string, index: number) => {
                                                const names = tech.split(' ');
                                                const shortName = names.length > 1 ? 
                                                    `${names[0]} ${names[1]}` : 
                                                    names[0];
                                                
                                                return (
                                                    <Badge 
                                                        key={index}
                                                        size="sm"
                                                        variant="filled"
                                                        color="violet"
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            backgroundColor: '#4c2889',
                                                            color: 'white',
                                                            minHeight: '28px',
                                                            padding: '4px 8px'
                                                        }}
                                                        onClick={() => onTechnicianClick?.(tech)}
                                                    >
                                                        {shortName}
                                                    </Badge>
                                                );
                                            })}
                                        </Group>
                                    </Group>
                                </Box>
                            </Paper>

                            {/* Contenedor de Clima - Escritorio */}
                            <Paper p="md" radius="md" withBorder
                                style={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minHeight: '100px',
                                    background: weatherData ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                            >
                                {weatherData && (
                                    <WeatherAnimations 
                                        key={`weather-${weatherData.weatherCode}-${Date.now()}`}
                                        weatherCode={weatherData.weatherCode} 
                                    />
                                )}
                                
                                <Box style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <Text c="white" fw={600} size="md" mb="sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                                            Clima Actual
                                        </Text>
                                        <WeatherIndicator 
                                            weatherData={weatherData} 
                                            loading={weatherLoading} 
                                        />
                                    </div>
                                    
                                    {weatherData && (
                                        <Group justify="space-between" wrap="nowrap">
                                            <Text size="sm" c="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Viento:</Text>
                                            <Text size="sm" fw={500} c="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{weatherData.windSpeed} km/h</Text>
                                        </Group>
                                    )}
                                </Box>
                            </Paper>
                        </SimpleGrid>
                    </Box>

                    {/* Sección de Información de Planta y Hotel - VISTA MÓVIL */}
                    <Box hiddenFrom="md">
                        <Stack gap="md">
                            {/* Información de Planta - Solo móvil */}
                            <Paper p="md" radius="md" withBorder>
                            <Box
                                style={{
                                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url(${plantImages[getPlantImageKey(project.location?.plant_name)]?.thumbnail})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    marginBottom: '1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    minHeight: '80px'
                                }}
                                onClick={() => onImageClick?.({
                                    src: plantImages[getPlantImageKey(project.location?.plant_name)]?.full,
                                    title: 'Información de Planta'
                                })}
                            >
                                <Title order={4} p="md">
                                    <Group>
                                        <IconBuildingFactory size={18} />
                                        <Text size="md">Información de Planta</Text>
                                    </Group>
                                </Title>
                            </Box>
                            <Stack gap="md">
                                <div>
                                    <Text fw={700} size="md" mb="xs">{project.location?.plant_name || 'Sin nombre'}</Text>
                                    <Text 
                                        fw={500} 
                                        c="blue.4" 
                                        component="a" 
                                        href={project.location?.plant_coordinates} 
                                        target="_blank"
                                        size="sm"
                                        style={{ 
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            wordBreak: 'break-word',
                                            lineHeight: 1.4
                                        }}
                                    >
                                        {project.location?.plant_address || 'No disponible'}
                                    </Text>
                                </div>
                                <List spacing="xs">
                                    <List.Item icon={<IconUser size={16} />}>
                                        <Group justify="space-between" align="center" wrap="nowrap">
                                            <Text size="sm" style={{ flex: 1, wordBreak: 'break-word' }}>
                                                {project.location?.contact_name || 'No disponible'}
                                            </Text>
                                            <ActionIcon
                                                variant="light"
                                                color="yellow"
                                                size="md"
                                                component="a"
                                                href={project.location?.contact_phone ? `tel:${project.location.contact_phone}` : undefined}
                                                title="Llamar al contacto"
                                                disabled={!project.location?.contact_phone}
                                                style={{ minWidth: '36px', minHeight: '36px' }}
                                            >
                                                <IconPhone size={18} />
                                            </ActionIcon>
                                        </Group>
                                        <Text 
                                            component="a" 
                                            href={project.location?.contact_email ? `mailto:${project.location.contact_email}` : undefined}
                                            size="sm"
                                            style={{ 
                                                textDecoration: 'none', 
                                                color: 'var(--mantine-color-blue-6)',
                                                cursor: project.location?.contact_email ? 'pointer' : 'default',
                                                textAlign: 'left',
                                                wordBreak: 'break-word'
                                            }}
                                        >
                                            {project.location?.contact_email || 'No disponible'}
                                        </Text>
                                    </List.Item>
                                </List>
                            </Stack>
                        </Paper>

                        {/* Información de Hotel - Solo si es necesario */}
                        {project.requires_hotel &&
                            project.location?.hotel_name &&
                            project.location.hotel_name.trim() !== '' &&
                            project.location.hotel_address &&
                            project.location.hotel_address.trim() !== '' && (
                            <Paper p="md" radius="md" withBorder>
                                <Box
                                    style={{
                                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url(${hotelImages[project.location.hotel_name as keyof typeof hotelImages]?.thumbnail || hotelImages.default.thumbnail})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        marginBottom: '1rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        minHeight: '80px'
                                    }}
                                    onClick={() => onImageClick?.({
                                        src: hotelImages[project.location.hotel_name as keyof typeof hotelImages]?.full || hotelImages.default.full,
                                        title: 'Hospedaje'
                                    })}
                                >
                                    <Title order={4} p="md">
                                        <Group>
                                            <IconBed size={18} />
                                            <Text size="md">Hospedaje</Text>
                                        </Group>
                                    </Title>
                                </Box>
                                <Stack gap="md">
                                    <div>
                                        <Text fw={500} size="md" mb="xs">{project.location.hotel_name}</Text>
                                        <Text 
                                            c="blue.4" 
                                            component="a" 
                                            href={project.location.hotel_coordinates} 
                                            target="_blank"
                                            size="sm"
                                            style={{ 
                                                textDecoration: 'none',
                                                cursor: 'pointer',
                                                wordBreak: 'break-word',
                                                lineHeight: 1.4
                                            }}
                                        >
                                            {project.location.hotel_address}
                                        </Text>
                                    </div>
                                    <List spacing="xs">
                                        <List.Item icon={<IconPhone size={16} />}>
                                            <Text 
                                                component="a" 
                                                href={`tel:${project.location.hotel_phone}`}
                                                size="sm"
                                                style={{ 
                                                    textDecoration: 'none', 
                                                    color: 'var(--mantine-color-blue-6)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {project.location.hotel_phone}
                                            </Text>
                                        </List.Item>
                                        <List.Item icon={<IconMapPin size={16} />}>
                                            <Text 
                                                component="a" 
                                                href={project.location.hotel_coordinates}
                                                target="_blank"
                                                size="sm"
                                                style={{ 
                                                    textDecoration: 'none', 
                                                    color: 'var(--mantine-color-blue-6)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Ver ubicación en Google Maps
                                            </Text>
                                        </List.Item>
                                    </List>
                                </Stack>
                            </Paper>
                        )}
                        </Stack>
                    </Box>

                    {/* Sección de Información de Planta y Hotel - VISTA ESCRITORIO (2 por fila) */}
                    <Box visibleFrom="md">
                        <SimpleGrid cols={2} spacing="md">
                            {/* Información de Planta - Escritorio */}
                            <Paper p="md" radius="md" withBorder>
                                <Box
                                    style={{
                                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url(${plantImages[getPlantImageKey(project.location?.plant_name)]?.thumbnail})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        marginBottom: '1rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        minHeight: '80px'
                                    }}
                                    onClick={() => onImageClick?.({
                                        src: plantImages[getPlantImageKey(project.location?.plant_name)]?.full,
                                        title: 'Información de Planta'
                                    })}
                                >
                                    <Title order={4} p="md">
                                        <Group>
                                            <IconBuildingFactory size={18} />
                                            <Text size="md">Información de Planta</Text>
                                        </Group>
                                    </Title>
                                </Box>
                                <Stack gap="md">
                                    <div>
                                        <Text fw={700} size="md" mb="xs">{project.location?.plant_name || 'Sin nombre'}</Text>
                                        <Text 
                                            fw={500} 
                                            c="blue.4" 
                                            component="a" 
                                            href={project.location?.plant_coordinates} 
                                            target="_blank"
                                            size="sm"
                                            style={{ 
                                                textDecoration: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                wordBreak: 'break-word',
                                                lineHeight: 1.4
                                            }}
                                        >
                                            {project.location?.plant_address || 'No disponible'}
                                        </Text>
                                    </div>
                                    <List spacing="xs">
                                        <List.Item icon={<IconUser size={16} />}>
                                            <Group justify="space-between" align="center" wrap="nowrap">
                                                <Text size="sm" style={{ flex: 1, wordBreak: 'break-word' }}>
                                                    {project.location?.contact_name || 'No disponible'}
                                                </Text>
                                                <ActionIcon
                                                    variant="light"
                                                    color="yellow"
                                                    size="md"
                                                    component="a"
                                                    href={project.location?.contact_phone ? `tel:${project.location.contact_phone}` : undefined}
                                                    title="Llamar al contacto"
                                                    disabled={!project.location?.contact_phone}
                                                    style={{ minWidth: '36px', minHeight: '36px' }}
                                                >
                                                    <IconPhone size={18} />
                                                </ActionIcon>
                                            </Group>
                                            <Text 
                                                component="a" 
                                                href={project.location?.contact_email ? `mailto:${project.location.contact_email}` : undefined}
                                                size="sm"
                                                style={{ 
                                                    textDecoration: 'none', 
                                                    color: 'var(--mantine-color-blue-6)',
                                                    cursor: project.location?.contact_email ? 'pointer' : 'default',
                                                    textAlign: 'left',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {project.location?.contact_email || 'No disponible'}
                                            </Text>
                                        </List.Item>
                                    </List>
                                </Stack>
                            </Paper>

                            {/* Información de Hotel - Escritorio */}
                            {project.requires_hotel &&
                                project.location?.hotel_name &&
                                project.location.hotel_name.trim() !== '' &&
                                project.location.hotel_address &&
                                project.location.hotel_address.trim() !== '' ? (
                                <Paper p="md" radius="md" withBorder>
                                    <Box
                                        style={{
                                            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url(${hotelImages[project.location.hotel_name as keyof typeof hotelImages]?.thumbnail || hotelImages.default.thumbnail})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            marginBottom: '1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            minHeight: '80px'
                                        }}
                                        onClick={() => onImageClick?.({
                                            src: hotelImages[project.location.hotel_name as keyof typeof hotelImages]?.full || hotelImages.default.full,
                                            title: 'Hospedaje'
                                        })}
                                    >
                                        <Title order={4} p="md">
                                            <Group>
                                                <IconBed size={18} />
                                                <Text size="md">Hospedaje</Text>
                                            </Group>
                                        </Title>
                                    </Box>
                                    <Stack gap="md">
                                        <div>
                                            <Text fw={500} size="md" mb="xs">{project.location.hotel_name}</Text>
                                            <Text 
                                                c="blue.4" 
                                                component="a" 
                                                href={project.location.hotel_coordinates} 
                                                target="_blank"
                                                size="sm"
                                                style={{ 
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                    wordBreak: 'break-word',
                                                    lineHeight: 1.4
                                                }}
                                            >
                                                {project.location.hotel_address}
                                            </Text>
                                        </div>
                                        <List spacing="xs">
                                            <List.Item icon={<IconPhone size={16} />}>
                                                <Text 
                                                    component="a" 
                                                    href={`tel:${project.location.hotel_phone}`}
                                                    size="sm"
                                                    style={{ 
                                                        textDecoration: 'none', 
                                                        color: 'var(--mantine-color-blue-6)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {project.location.hotel_phone}
                                                </Text>
                                            </List.Item>
                                            <List.Item icon={<IconMapPin size={16} />}>
                                                <Text 
                                                    component="a" 
                                                    href={project.location.hotel_coordinates}
                                                    target="_blank"
                                                    size="sm"
                                                    style={{ 
                                                        textDecoration: 'none', 
                                                        color: 'var(--mantine-color-blue-6)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Ver ubicación en Google Maps
                                                </Text>
                                            </List.Item>
                                        </List>
                                    </Stack>
                                </Paper>
                            ) : (
                                <Paper p="md" radius="md" withBorder>
                                    <Text size="sm" c="dimmed" ta="center" py="md">
                                        No requiere hospedaje
                                    </Text>
                                </Paper>
                            )}
                        </SimpleGrid>
                    </Box>

                    {/* Sección de Equipo y Documentos - VISTA MÓVIL */}
                    <Box hiddenFrom="md">
                        <Stack gap="md">
                            {/* Equipo Necesario - Solo móvil */}
                            <Paper p="md" radius="md" withBorder>
                            <Title order={4} mb="md">
                                <Group>
                                    <IconTools size={18} />
                                    <Text size="md">Equipo Necesario</Text>
                                </Group>
                            </Title>
                            <ActionIcon
                                variant="light"
                                color="blue"
                                size="lg"
                                radius="md"
                                style={{ 
                                    width: '100%', 
                                    minHeight: '48px',
                                    fontSize: '14px',
                                    fontWeight: 500
                                }}
                                onClick={onEquipmentClick}
                            >
                                Ver lista de equipo
                            </ActionIcon>
                        </Paper>

                        {/* Documentos Requeridos */}
                        <Paper p="md" radius="md" withBorder>
                            <Title order={4} mb="md">
                                <Group>
                                    <IconDownload size={18} />
                                    <Text size="md">Documentos Requeridos</Text>
                                </Group>
                            </Title>
                            {project.documents && project.documents.length > 0 ? (
                                <List spacing="xs">
                                    {project.documents.map((doc, index) => (
                                        <List.Item 
                                            key={index}
                                            icon={
                                                <ActionIcon 
                                                    size="md" 
                                                    variant="light" 
                                                    color="blue" 
                                                    onClick={() => handleDownload(doc.url, doc.name)}
                                                    style={{ 
                                                        cursor: 'pointer',
                                                        minWidth: '32px',
                                                        minHeight: '32px'
                                                    }}
                                                >
                                                    <IconDownload size={16} />
                                                </ActionIcon>
                                            }
                                        >
                                            <Text size="sm" style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                                                {doc.name}
                                            </Text>
                                        </List.Item>
                                    ))}
                                </List>
                            ) : (
                                <Text size="sm" c="dimmed" ta="center" py="md">
                                    No hay documentos requeridos
                                </Text>
                            )}
                        </Paper>
                        </Stack>
                    </Box>

                    {/* Sección de Equipo y Documentos - VISTA ESCRITORIO (2 por fila) */}
                    <Box visibleFrom="md">
                        <SimpleGrid cols={2} spacing="md">
                            {/* Equipo Necesario - Escritorio */}
                            <Paper p="md" radius="md" withBorder>
                                <Title order={4} mb="md">
                                    <Group>
                                        <IconTools size={18} />
                                        <Text size="md">Equipo Necesario</Text>
                                    </Group>
                                </Title>
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    radius="md"
                                    style={{ 
                                        width: '100%', 
                                        minHeight: '48px',
                                        fontSize: '14px',
                                        fontWeight: 500
                                    }}
                                    onClick={onEquipmentClick}
                                >
                                    Ver lista de equipo
                                </ActionIcon>
                            </Paper>

                            {/* Documentos Requeridos - Escritorio */}
                            <Paper p="md" radius="md" withBorder>
                                <Title order={4} mb="md">
                                    <Group>
                                        <IconDownload size={18} />
                                        <Text size="md">Documentos Requeridos</Text>
                                    </Group>
                                </Title>
                                {project.documents && project.documents.length > 0 ? (
                                    <List spacing="xs">
                                        {project.documents.map((doc, index) => (
                                            <List.Item 
                                                key={index}
                                                icon={
                                                    <ActionIcon 
                                                        size="md" 
                                                        variant="light" 
                                                        color="blue" 
                                                        onClick={() => handleDownload(doc.url, doc.name)}
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            minWidth: '32px',
                                                            minHeight: '32px'
                                                        }}
                                                    >
                                                        <IconDownload size={16} />
                                                    </ActionIcon>
                                                }
                                            >
                                                <Text size="sm" style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                                                    {doc.name}
                                                </Text>
                                            </List.Item>
                                        ))}
                                    </List>
                                ) : (
                                    <Text size="sm" c="dimmed" ta="center" py="md">
                                        No hay documentos requeridos
                                    </Text>
                                )}
                            </Paper>
                        </SimpleGrid>
                    </Box>
                </Stack>
            )}
        </Modal>
    );
}