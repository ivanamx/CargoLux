import { Title, Paper, Group, Select, Table, Badge, ActionIcon, Text, Stack, RingProgress, Center, Button } from '@mantine/core';
import { IconCheck, IconX, IconFileSpreadsheet } from '@tabler/icons-react';
import { useState } from 'react';

interface TimeEntry {
    id: string;
    technicianName: string;
    date: Date;
    hours: number;
    project: string;
    status: 'pending' | 'approved' | 'rejected';
}

type PeriodType = 'current-day' | 'current-fortnight' | 'previous-fortnight' | 'current-month' | 'previous-month';

export default function Hours() {
    const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('current-day');

    const periodOptions = [
        { value: 'current-day', label: 'Día en curso' },
        { value: 'current-fortnight', label: 'Quincena en curso' },
        { value: 'previous-fortnight', label: 'Quincena anterior' },
        { value: 'current-month', label: 'Mes en curso' },
        { value: 'previous-month', label: 'Mes anterior' }
    ];

    const mockData: TimeEntry[] = [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'green';
            case 'rejected': return 'red';
            default: return 'yellow';
        }
    };

    const statsData = {
        totalTechnicians: 0,
        reportedToday: 0
    };

    const renderDailyStats = () => {
        if (selectedPeriod !== 'current-day') return null;

        const percentage = (statsData.reportedToday / statsData.totalTechnicians) * 100;

        return (
            <Paper p="xs" radius="md" style={{
                backgroundColor: '#25262B',
                border: '1px solid #2C2E33'
            }}>
                <Group justify="space-between" gap="xs">
                    <Stack gap="xs">
                        <Paper p="xs" radius="md" style={{
                            backgroundColor: '#2C2E33',
                            border: '1px solid #373A40'
                        }}>
                            <Stack gap={0}>
                                <Text size="sm" c="gray.5">Total de horas hoy</Text>
                                <Text size="xl" fw={700} c="orange.4">0</Text>
                            </Stack>
                        </Paper>
                        <Paper p="xs" radius="md" style={{
                            backgroundColor: '#2C2E33',
                            border: '1px solid #373A40'
                        }}>
                            <Stack gap={0}>
                                <Text size="sm" c="gray.5">Total de horas este mes</Text>
                                <Text size="xl" fw={700} c="orange.4">0</Text>
                            </Stack>
                        </Paper>
                    </Stack>

                    <Stack gap="xs" align="center">
                        <RingProgress
                            size={140}
                            roundCaps
                            thickness={8}
                            sections={[
                                { value: percentage, color: 'blue' },
                            ]}
                            label={
                                <Center>
                                    <Text size="xl" fw={700} ta="center">
                                        {statsData.reportedToday}/{statsData.totalTechnicians}
                                    </Text>
                                </Center>
                            }
                        />
                        <Stack gap={0}>
                            <Text size="lg" fw={500} c="gray.3" ta="center">
                                Reporte de Horas - Hoy
                            </Text>
                            <Text c="gray.5" size="sm" ta="center">
                                <Text span c="green.4" fw={500}>{statsData.reportedToday}</Text> técnicos han reportado
                            </Text>
                            <Text c="gray.5" size="sm" ta="center">
                                <Text span c="yellow.4" fw={500}>{statsData.totalTechnicians - statsData.reportedToday}</Text> técnicos pendientes
                            </Text>
                        </Stack>
                    </Stack>

                    <Stack justify="center">
                        <ActionIcon
                            variant="filled"
                            color="blue"
                            size="xl"
                            onClick={() => {/* Manejar envío de recordatorio */ }}
                            style={{ width: 'auto', padding: '0.5rem 1rem' }}
                        >
                            <Group gap={4}>
                                <Text size="sm" c="white">Enviar Recordatorio</Text>
                            </Group>
                        </ActionIcon>
                    </Stack>
                </Group>
            </Paper>
        );
    };

    return (
        <>
            <Title order={2} size="h1" mb="md" c="gray.3">
                Control de Horas
            </Title>

            {renderDailyStats()}

            <Paper p="sm" radius="md" mt="xs" style={{
                backgroundColor: '#25262B',
                border: '1px solid #2C2E33'
            }}>
                <Stack gap="sm">
                    <Group justify="space-between">
                        <Group>
                            <Select
                                label="Técnico"
                                placeholder="Seleccionar técnico"
                                value={selectedTechnician}
                                onChange={setSelectedTechnician}
                                data={[
                                    { value: 'todos', label: 'Todos los técnicos' }
                                ]}
                                style={{ width: 200 }}
                            />
                            <Select
                                label="Período"
                                placeholder="Seleccionar período"
                                value={selectedPeriod}
                                onChange={(value) => setSelectedPeriod(value as PeriodType)}
                                data={periodOptions}
                                style={{ width: 200 }}
                            />
                        </Group>
                        <Button
                            variant="filled"
                            color="grape"
                            leftSection={<IconFileSpreadsheet size="1rem" />}
                            onClick={() => {/* Manejar descarga de Excel */ }}
                            style={{ marginTop: 'auto' }}
                        >
                            Descargar Excel
                        </Button>
                    </Group>

                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Técnico</Table.Th>
                                <Table.Th>Proyecto</Table.Th>
                                <Table.Th>Horas</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {mockData.map((entry) => (
                                <Table.Tr key={entry.id}>
                                    <Table.Td>{entry.date.toLocaleDateString()}</Table.Td>
                                    <Table.Td>{entry.technicianName}</Table.Td>
                                    <Table.Td>{entry.project}</Table.Td>
                                    <Table.Td>{entry.hours}</Table.Td>
                                    <Table.Td>
                                        <Badge color={getStatusColor(entry.status)}>
                                            {entry.status.toUpperCase()}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4}>
                                            <ActionIcon
                                                variant="filled"
                                                color="green"
                                                size="sm"
                                                onClick={() => {/* Manejar aprobación */ }}
                                            >
                                                <IconCheck size="1rem" />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="filled"
                                                color="red"
                                                size="sm"
                                                onClick={() => {/* Manejar rechazo */ }}
                                            >
                                                <IconX size="1rem" />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>

                    <Group justify="space-between">
                        <Text c="yellow.4">Total de horas: 0</Text>
                        <Text c="gray.3">Registros pendientes: 0</Text>
                    </Group>
                </Stack>
            </Paper>
        </>
    );
}