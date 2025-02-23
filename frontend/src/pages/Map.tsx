import { Paper, Title, Button, Group, TextInput, Select, ComboboxData } from '@mantine/core';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { IconSearch } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useLocations } from '../context/LocationContext';

interface Location {
    id: number;
    name: string;
    coordinates: [number, number];
    status: 'presente' | 'ausente' | 'en-ruta';
    city: string;
    checkInTime?: string;
    delayMinutes?: number;
}

const employees: Location[] = [];

export default function Map() {
    const [pulse, setPulse] = useState(true);
    const [filter, setFilter] = useState<'todos' | 'presentes' | 'ausentes' | 'en-ruta'>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string | null>('todas');
    const { locations } = useLocations();

    useEffect(() => {
        const interval = setInterval(() => {
            setPulse(prev => !prev);
        }, 1000);
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

    return (
        <>
            <Title order={2} size="h1" mb="2rem" c="gray.3">
                Mapa de Técnicos
            </Title>

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
            </Group>

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
                        '&::placeholder': {
                            color: theme.colors.gray[5],
                        },
                    },
                })}
            />

            <Paper p="md" radius="md" style={{ height: 'calc(100vh - 200px)' }}>
                <MapContainer
                    center={[23.6345, -102.5528]}
                    zoom={5}
                    style={{ height: '100%', width: '100%', background: '#1A1B1E' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution=''
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    {filteredEmployees.map((employee) => {
                        const markerColor = employee.status === 'presente' ? '#10B981' :
                            employee.status === 'en-ruta' ? '#FB923C' : '#EF4444';
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
                                    <span style={{ color: '#1A1B1E', display: 'block', marginBottom: '4px' }}>
                                        {formatName(employee.name)}
                                    </span>
                                    {employee.status === 'presente' ? (
                                        <span style={{ color: '#84cc16', fontSize: '0.9em' }}>
                                            Check-in: {employee.checkInTime}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#ef4444', fontSize: '0.9em' }}>
                                            Retraso: {employee.delayMinutes} minutos
                                        </span>
                                    )}
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </Paper>
        </>
    );
}