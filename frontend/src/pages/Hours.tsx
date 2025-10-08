import { Title, Paper, Group, Select, Table, Badge, ActionIcon, Text, Stack, RingProgress, Center, Button, Tooltip, SimpleGrid, ScrollArea } from '@mantine/core';
import { IconCheck, IconX, IconFileSpreadsheet } from '@tabler/icons-react';
import { useState, useEffect, useMemo } from 'react';
import { attendanceService } from '../services/attendance';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import * as XLSX from 'xlsx';

interface TimeEntryReport {
    id: string;
    technicianName: string;
    date: string;
    hours: number;
    project: string;
    status: 'pending' | 'approved' | 'rejected';
    start_time?: string;
    end_time?: string;
    description?: string;
}

type PeriodType = 'current-day' | 'current-fortnight' | 'previous-fortnight' | 'current-month' | 'previous-month';

export default function Hours() {
    const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('current-day');
    const [timeEntries, setTimeEntries] = useState<TimeEntryReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalTechnicians, setTotalTechnicians] = useState(0);

    const [reportedTechnicians, setReportedTechnicians] = useState(0);
    const [technicians, setTechnicians] = useState<Array<{ value: string; label: string }>>([]);
    const [isDayClosed, setIsDayClosed] = useState(false);
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

    const periodOptions = [
        { value: 'current-day', label: 'Día en curso' },
        { value: 'current-fortnight', label: 'Quincena en curso' },
        { value: 'previous-fortnight', label: 'Quincena anterior' },
        { value: 'current-month', label: 'Mes en curso' },
        { value: 'previous-month', label: 'Mes anterior' }
    ];

    const loadTotalTechnicians = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/users/technicians/count', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            const data = await response.json();
            setTotalTechnicians(data.total);
        } catch (error) {
            console.error('Error al cargar total de técnicos:', error);
        }
    };

    const loadTimeEntries = async () => {
        setLoading(true);
        try {
            let entries: TimeEntryReport[] = [];
            
            // Cargar datos según el período seleccionado
            switch (selectedPeriod) {
                case 'current-day':
                    entries = await attendanceService.getTodayReports();
                    break;
                case 'current-fortnight':
                    entries = await attendanceService.getCurrentFortnightReports();
                    break;
                case 'previous-fortnight':
                    entries = await attendanceService.getPreviousFortnightReports();
                    break;
                case 'current-month':
                    entries = await attendanceService.getCurrentMonthReports();
                    break;
                case 'previous-month':
                    entries = await attendanceService.getPreviousMonthReports();
                    break;
                default:
                    entries = await attendanceService.getTodayReports();
            }
            
            console.log('Datos recibidos del servicio:', entries);
            const updatedEntries = entries.map(entry => ({
                ...entry,
                status: entry.status
            }));
            
            setTimeEntries(updatedEntries);
            
            // Obtener técnicos únicos para el filtro
            const uniqueTechnicians = Array.from(new Set(updatedEntries.map(entry => entry.technicianName)))
                .map(name => ({
                    value: name,
                    label: name
                }));
            setTechnicians([{ value: 'todos', label: 'Todos los técnicos' }, ...uniqueTechnicians]);
            
            // Obtener técnicos únicos que han reportado
            const uniqueReportedTechnicians = new Set(updatedEntries.map(entry => entry.technicianName));
            setReportedTechnicians(uniqueReportedTechnicians.size);
            
        } catch (error) {
            console.error('Error al cargar reportes:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los registros',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    // Filtrar entradas según el técnico seleccionado
    const filteredEntries = useMemo(() => {
        return timeEntries.filter(entry => 
            !selectedTechnician || selectedTechnician === 'todos' || 
            entry.technicianName === selectedTechnician
        );
    }, [timeEntries, selectedTechnician]);

    // Agregar esta función para verificar si todos los registros están aprobados
    const areAllEntriesApproved = useMemo(() => {
        return timeEntries.length > 0 && timeEntries.every(entry => entry.status === 'approved');
    }, [timeEntries]);

    // Agregar función para verificar el estado del día
    const checkDayStatus = async () => {
        try {
            const response = await attendanceService.getDayStatus();
            // Verificar si el día cerrado es el día actual
            const today = new Date().toISOString().split('T')[0];
            const closedDate = response.closed_at ? new Date(response.closed_at).toISOString().split('T')[0] : null;
            
            // Si el día cerrado no es el día actual, resetear el estado
            if (closedDate !== today) {
                setIsDayClosed(false);
            } else {
                setIsDayClosed(response.is_closed);
            }
        } catch (error) {
            console.error('Error al verificar estado del día:', error);
        }
    };

    useEffect(() => {
        loadTotalTechnicians();
        checkDayStatus(); // Verificar estado inicial

        // Escuchar evento de cierre de día
        const handleDayClosed = () => {
            setIsDayClosed(true);
        };

        // Escuchar evento de apertura de día
        const handleDayOpened = () => {
            setIsDayClosed(false);
        };

        window.addEventListener('day-closed', handleDayClosed);
        window.addEventListener('day-opened', handleDayOpened);

        // Verificar el estado del día cada hora
        const interval = setInterval(checkDayStatus, 3600000); // 3600000 ms = 1 hora

        return () => {
            window.removeEventListener('day-closed', handleDayClosed);
            window.removeEventListener('day-opened', handleDayOpened);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        loadTimeEntries();
    }, [selectedPeriod]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'green';
            case 'rejected': return 'red';
            default: return 'yellow';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'approved': return 'APROBADO';
            case 'rejected': return 'RECHAZADO';
            default: return 'PENDIENTE';
        }
    };

    const handleApprove = (entryId: string) => {
        setTimeEntries(prev => {
            const updated = prev.map(entry => 
                entry.id === entryId 
                    ? { ...entry, status: 'approved' as const }
                    : entry
            );
            localStorage.setItem('timeEntries', JSON.stringify(updated));
            return updated;
        });
        
        notifications.show({
            title: 'Registro aprobado',
            message: 'El registro de horas ha sido aprobado exitosamente',
            color: 'green'
        });
    };

    const handleReject = (entryId: string) => {
        setTimeEntries(prev => {
            const updated = prev.map(entry => 
                entry.id === entryId 
                    ? { ...entry, status: 'rejected' as const }
                    : entry
            );
            localStorage.setItem('timeEntries', JSON.stringify(updated));
            return updated;
        });
        
        notifications.show({
            title: 'Registro rechazado',
            message: 'El registro de horas ha sido rechazado',
            color: 'red'
        });
    };

    const handleDownloadExcel = () => {
        try {
            // Filtrar solo las entradas aprobadas
            const approvedEntries = timeEntries.filter(entry => entry.status === 'approved');

            if (approvedEntries.length === 0) {
                notifications.show({
                    title: 'Sin datos',
                    message: 'No hay registros aprobados para exportar',
                    color: 'yellow'
                });
                return;
            }

            // Preparar los datos para el Excel con los nuevos campos
            const excelData = approvedEntries.map(entry => ({
                'Fecha': new Date(entry.date).toLocaleDateString(),
                'Técnico': entry.technicianName,
                'Proyecto': entry.project,
                'Hora Inicio': entry.start_time ? new Date(entry.start_time).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) : 'N/A',
                'Hora Fin': entry.end_time ? new Date(entry.end_time).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) : 'N/A',
                'Horas': entry.hours.toFixed(2),
                'Descripción': entry.description || 'Sin descripción'
            }));

            // Crear el libro de Excel
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Horas');

            // Ajustar el ancho de las columnas
            const maxWidth = excelData.reduce((acc, row) => ({
                'Fecha': Math.max(acc['Fecha'], row['Fecha'].length),
                'Técnico': Math.max(acc['Técnico'], row['Técnico'].length),
                'Proyecto': Math.max(acc['Proyecto'], row['Proyecto'].length),
                'Hora Inicio': Math.max(acc['Hora Inicio'], row['Hora Inicio'].length),
                'Hora Fin': Math.max(acc['Hora Fin'], row['Hora Fin'].length),
                'Horas': Math.max(acc['Horas'], row['Horas'].length),
                'Descripción': Math.max(acc['Descripción'], row['Descripción'].length)
            }), { 
                'Fecha': 10, 
                'Técnico': 15, 
                'Proyecto': 20, 
                'Hora Inicio': 10,
                'Hora Fin': 10,
                'Horas': 8,
                'Descripción': 30
            });

            worksheet['!cols'] = [
                { wch: maxWidth['Fecha'] },
                { wch: maxWidth['Técnico'] },
                { wch: maxWidth['Proyecto'] },
                { wch: maxWidth['Hora Inicio'] },
                { wch: maxWidth['Hora Fin'] },
                { wch: maxWidth['Horas'] },
                { wch: maxWidth['Descripción'] }
            ];

            // Generar el archivo y descargarlo
            const today = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Reporte_Horas_${today}.xlsx`);

            notifications.show({
                title: 'Éxito',
                message: 'El archivo Excel ha sido generado correctamente',
                color: 'green'
            });
        } catch (error) {
            console.error('Error al generar Excel:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo generar el archivo Excel',
                color: 'red'
            });
        }
    };

    const handleCloseDay = async () => {
        modals.openConfirmModal({
            title: 'Confirmar cierre de día',
            centered: true,
            children: (
                <div>
                    <Text size="sm" mb="xs">
                        ¿Estás seguro de que deseas cerrar el día? Esta acción:
                    </Text>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>Bloqueará la edición de los registros de este día</li>
                        <li>Los registros pendientes serán aprobados automáticamente</li>
                        <li>Se puede reabrir el día si es necesario</li>
                    </ul>
                </div>
            ),
            labels: { confirm: 'Sí, cerrar día', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await attendanceService.closeDay();
                    
                    // Actualizar los registros pendientes a aprobados
                    setTimeEntries(prev => {
                        const updated = prev.map(entry => 
                            entry.status === 'pending' 
                                ? { ...entry, status: 'approved' as const }
                                : entry
                        );
                        localStorage.setItem('timeEntries', JSON.stringify(updated));
                        return updated;
                    });

                    notifications.show({
                        title: 'Éxito',
                        message: 'El día ha sido cerrado exitosamente',
                        color: 'green'
                    });

                    // Deshabilitar el botón de cerrar día
                    setIsDayClosed(true);

                } catch (error) {
                    console.error('Error al cerrar el día:', error);
                    notifications.show({
                        title: 'Error',
                        message: 'No se pudo cerrar el día',
                        color: 'red'
                    });
                }
            },
        });
    };

    const handleOpenDay = async () => {
        modals.openConfirmModal({
            title: 'Confirmar apertura de día',
            centered: true,
            children: (
                <div>
                    <Text size="sm" mb="xs">
                        ¿Estás seguro de que deseas reabrir el día? Esta acción:
                    </Text>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>Permitirá editar los registros nuevamente</li>
                        <li>Los registros aprobados automáticamente volverán a estar pendientes</li>
                        <li>Se podrán enviar recordatorios nuevamente</li>
                    </ul>
                </div>
            ),
            labels: { confirm: 'Sí, abrir día', cancel: 'Cancelar' },
            confirmProps: { color: 'blue' },
            onConfirm: async () => {
                try {
                    await attendanceService.openDay();
                    
                    // Recargar los registros para obtener el estado actualizado
                    await loadTimeEntries();

                    notifications.show({
                        title: 'Éxito',
                        message: 'El día ha sido reabierto exitosamente',
                        color: 'green'
                    });

                    // Habilitar el botón de cerrar día
                    setIsDayClosed(false);

                } catch (error) {
                    console.error('Error al abrir el día:', error);
                    notifications.show({
                        title: 'Error',
                        message: 'No se pudo reabrir el día',
                        color: 'red'
                    });
                }
            },
        });
    };

    // Agregar la función para enviar recordatorios
    const handleSendReminder = async () => {
        try {
            const response = await attendanceService.sendTimeReportReminder();
            
            if (response.success) {
                notifications.show({
                    title: 'Recordatorio Enviado',
                    message: `Se enviaron recordatorios a ${totalTechnicians - reportedTechnicians} técnicos`,
                    color: 'green'
                });
            }
        } catch (error) {
            console.error('Error al enviar recordatorios:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron enviar los recordatorios',
                color: 'red'
            });
        }
    };

    const renderDailyStats = () => {
        if (selectedPeriod !== 'current-day') return null;

        const percentage = (reportedTechnicians / totalTechnicians) * 100 || 0;
        const totalHoursToday = timeEntries.reduce((acc, curr) => acc + curr.hours, 0);

        return (
            <Paper p="xs" radius="md" style={{
                backgroundColor: '#25262B',
                border: '1px solid #2C2E33'
            }}>
                {isMobile ? (
                    // Vista móvil - Stack vertical
                    <Stack gap="md">
                        {/* Estadísticas de horas - Grid responsivo */}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <Paper p="xs" radius="md" style={{
                                backgroundColor: '#2C2E33',
                                border: '1px solid #373A40'
                            }}>
                                <Stack gap={0} align="center">
                                    <Text size="sm" c="gray.5">Total de horas hoy</Text>
                                    <Text size="xl" fw={700} c="orange.4">{totalHoursToday.toFixed(2)}</Text>
                                </Stack>
                            </Paper>
                            <Paper p="xs" radius="md" style={{
                                backgroundColor: '#2C2E33',
                                border: '1px solid #373A40'
                            }}>
                                <Stack gap={0} align="center">
                                    <Text size="sm" c="gray.5">Total de horas este mes</Text>
                                    <Text size="xl" fw={700} c="orange.4">0</Text>
                                </Stack>
                            </Paper>
                        </SimpleGrid>

                        {/* RingProgress y texto - Centrado en móvil */}
                        <Group justify="center" gap="md">
                            <RingProgress
                                size={isMobile ? 100 : 140}
                                roundCaps
                                thickness={8}
                                sections={[
                                    { 
                                        value: percentage, 
                                        color: reportedTechnicians === totalTechnicians ? 'lime' : 'blue' 
                                    },
                                ]}
                                label={
                                    <Center>
                                        <Text size={isMobile ? "lg" : "xl"} fw={700} ta="center">
                                            {reportedTechnicians}/{totalTechnicians}
                                        </Text>
                                    </Center>
                                }
                            />
                            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                                <Text size={isMobile ? "md" : "lg"} fw={500} c="gray.3">
                                    Reporte de Horas - Hoy
                                </Text>
                                <Text c="gray.5" size={isMobile ? "sm" : "md"}>
                                    <Text span c="green.4" fw={500}>{reportedTechnicians}</Text> técnicos han reportado
                                </Text>
                                <Text c="gray.5" size={isMobile ? "sm" : "md"}>
                                    <Text span c="yellow.4" fw={500}>{totalTechnicians - reportedTechnicians}</Text> técnicos pendientes
                                </Text>
                            </Stack>
                        </Group>

                        {/* Botones - Stack vertical en móvil */}
                        <Stack gap="xs">
                            <Button
                                variant="filled"
                                color="blue"
                                onClick={handleSendReminder}
                                disabled={isDayClosed || reportedTechnicians === totalTechnicians}
                                loading={loading}
                                fullWidth={isMobile}
                                size={isMobile ? "md" : "sm"}
                                style={{ minHeight: isMobile ? 44 : undefined }}
                            >
                                Enviar Recordatorio
                            </Button>
                            {isDayClosed ? (
                                <Tooltip label="Reabrir el día para permitir ediciones">
                                    <Button
                                        variant="filled"
                                        color="green"
                                        onClick={handleOpenDay}
                                        fullWidth={isMobile}
                                        size={isMobile ? "md" : "sm"}
                                        style={{ minHeight: isMobile ? 44 : undefined }}
                                    >
                                        Abrir Día
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Tooltip label="Cerrar el día para bloquear ediciones">
                                    <Button
                                        variant="filled"
                                        color="red"
                                        onClick={handleCloseDay}
                                        fullWidth={isMobile}
                                        size={isMobile ? "md" : "sm"}
                                        style={{ minHeight: isMobile ? 44 : undefined }}
                                    >
                                        Cerrar Día
                                    </Button>
                                </Tooltip>
                            )}
                        </Stack>
                    </Stack>
                ) : (
                    // Vista desktop - Layout horizontal original
                    <Group justify="space-between" gap="xs">
                        <Stack gap="xs">
                            <Paper p="xs" radius="md" style={{
                                backgroundColor: '#2C2E33',
                                border: '1px solid #373A40',
                                width: '150px'
                            }}>
                                <Stack gap={0} align="center">
                                    <Text size="sm" c="gray.5">Total de horas hoy</Text>
                                    <Text size="xl" fw={700} c="orange.4">{totalHoursToday.toFixed(2)}</Text>
                                </Stack>
                            </Paper>
                            <Paper p="xs" radius="md" style={{
                                backgroundColor: '#2C2E33',
                                border: '1px solid #373A40',
                                width: '150px'
                            }}>
                                <Stack gap={0} align="center">
                                    <Text size="sm" c="gray.5">Total de horas este mes</Text>
                                    <Text size="xl" fw={700} c="orange.4">0</Text>
                                </Stack>
                            </Paper>
                        </Stack>

                        <Group align="center" gap="xl">
                            <RingProgress
                                size={140}
                                roundCaps
                                thickness={8}
                                sections={[
                                    { 
                                        value: percentage, 
                                        color: reportedTechnicians === totalTechnicians ? 'lime' : 'blue' 
                                    },
                                ]}
                                label={
                                    <Center>
                                        <Text size="xl" fw={700} ta="center">
                                            {reportedTechnicians}/{totalTechnicians}
                                        </Text>
                                    </Center>
                                }
                            />
                            <Stack gap={4}>
                                <Text size="lg" fw={500} c="gray.3">
                                    Reporte de Horas - Hoy
                                </Text>
                                <Text c="gray.5" size="md">
                                    <Text span c="green.4" fw={500}>{reportedTechnicians}</Text> técnicos han reportado
                                </Text>
                                <Text c="gray.5" size="md">
                                    <Text span c="yellow.4" fw={500}>{totalTechnicians - reportedTechnicians}</Text> técnicos pendientes
                                </Text>
                            </Stack>
                        </Group>

                        <Stack gap="xs">
                            <Button
                                variant="filled"
                                color="blue"
                                onClick={handleSendReminder}
                                disabled={isDayClosed || reportedTechnicians === totalTechnicians}
                                loading={loading}
                            >
                                Enviar Recordatorio
                            </Button>
                            {isDayClosed ? (
                                <Tooltip label="Reabrir el día para permitir ediciones">
                                    <Button
                                        variant="filled"
                                        color="green"
                                        onClick={handleOpenDay}
                                    >
                                        Abrir Día
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Tooltip label="Cerrar el día para bloquear ediciones">
                                    <Button
                                        variant="filled"
                                        color="red"
                                        onClick={handleCloseDay}
                                    >
                                        Cerrar Día
                                    </Button>
                                </Tooltip>
                            )}
                        </Stack>
                    </Group>
                )}
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
                    {isMobile ? (
                        // Vista móvil - Stack vertical
                        <Stack gap="md">
                            <SimpleGrid cols={1} spacing="md">
                                <Select
                                    label="Técnico"
                                    placeholder="Seleccionar técnico"
                                    value={selectedTechnician}
                                    onChange={setSelectedTechnician}
                                    data={technicians}
                                    clearable
                                    searchable
                                    styles={{
                                        input: { minHeight: 44 } // Altura mínima para touch
                                    }}
                                />
                                <Select
                                    label="Período"
                                    placeholder="Seleccionar período"
                                    value={selectedPeriod}
                                    onChange={(value) => setSelectedPeriod(value as PeriodType)}
                                    data={periodOptions}
                                    styles={{
                                        input: { minHeight: 44 } // Altura mínima para touch
                                    }}
                                />
                            </SimpleGrid>
                            <Tooltip
                                label={!areAllEntriesApproved ? "Todos los registros deben estar aprobados para descargar" : ""}
                                disabled={areAllEntriesApproved}
                            >
                                <Button
                                    variant="filled"
                                    color="grape"
                                    leftSection={<IconFileSpreadsheet size="1rem" />}
                                    onClick={handleDownloadExcel}
                                    disabled={!areAllEntriesApproved}
                                    fullWidth
                                    size="md"
                                    style={{ minHeight: 44 }}
                                >
                                    Descargar Excel
                                </Button>
                            </Tooltip>
                        </Stack>
                    ) : (
                        // Vista desktop - Layout horizontal original
                        <Group justify="space-between">
                            <Group>
                                <Select
                                    label="Técnico"
                                    placeholder="Seleccionar técnico"
                                    value={selectedTechnician}
                                    onChange={setSelectedTechnician}
                                    data={technicians}
                                    style={{ width: 200 }}
                                    clearable
                                    searchable
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
                            <Tooltip
                                label={!areAllEntriesApproved ? "Todos los registros deben estar aprobados para descargar" : ""}
                                disabled={areAllEntriesApproved}
                            >
                                <Button
                                    variant="filled"
                                    color="grape"
                                    leftSection={<IconFileSpreadsheet size="1rem" />}
                                    onClick={handleDownloadExcel}
                                    style={{ marginTop: 'auto' }}
                                    disabled={!areAllEntriesApproved}
                                >
                                    Descargar Excel
                                </Button>
                            </Tooltip>
                        </Group>
                    )}

                    {isMobile ? (
                        // Vista móvil - Cards en lugar de tabla
                        <Stack gap="sm">
                            {filteredEntries.map((entry) => (
                                <Paper key={entry.id} p="md" radius="md" withBorder>
                                    <Stack gap="sm">
                                        <Group justify="space-between" wrap="nowrap">
                                            <Text fw={500} size="sm" c="gray.3" style={{ flex: 1, minWidth: 0 }}>
                                                {entry.technicianName}
                                            </Text>
                                            <Badge color={getStatusColor(entry.status)} size="sm">
                                                {getStatusText(entry.status)}
                                            </Badge>
                                        </Group>
                                        
                                        <Group gap="xs" wrap="nowrap">
                                            <Text size="xs" c="dimmed" style={{ flexShrink: 0, minWidth: 'fit-content' }}>
                                                Fecha:
                                            </Text>
                                            <Text size="xs" c="gray.3" style={{ flex: 1, minWidth: 0 }}>
                                                {new Date(entry.date).toLocaleDateString()}
                                            </Text>
                                        </Group>
                                        
                                        <Group gap="xs" wrap="nowrap">
                                            <Text size="xs" c="dimmed" style={{ flexShrink: 0, minWidth: 'fit-content' }}>
                                                Proyecto:
                                            </Text>
                                            <Text size="xs" c="gray.3" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {entry.project}
                                            </Text>
                                        </Group>
                                        
                                        <Group gap="xs" wrap="nowrap">
                                            <Text size="xs" c="dimmed" style={{ flexShrink: 0, minWidth: 'fit-content' }}>
                                                Horas:
                                            </Text>
                                            <Text size="xs" c="orange.4" fw={500}>
                                                {entry.hours.toFixed(2)}h
                                            </Text>
                                        </Group>
                                        
                                        <Group justify="center" gap="md" mt="xs">
                                            <ActionIcon
                                                variant="filled"
                                                color="green"
                                                size="lg"
                                                onClick={() => handleApprove(entry.id)}
                                                disabled={entry.status !== 'pending' || isDayClosed}
                                                title={isDayClosed ? "El día está cerrado" : "Aprobar registro"}
                                                style={{ minHeight: 44, minWidth: 44 }}
                                            >
                                                <IconCheck size="1.2rem" />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="filled"
                                                color="red"
                                                size="lg"
                                                onClick={() => handleReject(entry.id)}
                                                disabled={entry.status !== 'pending' || isDayClosed}
                                                title={isDayClosed ? "El día está cerrado" : "Rechazar registro"}
                                                style={{ minHeight: 44, minWidth: 44 }}
                                            >
                                                <IconX size="1.2rem" />
                                            </ActionIcon>
                                        </Group>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    ) : (
                        // Vista desktop - Tabla original
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
                                {filteredEntries.map((entry) => (
                                    <Table.Tr key={entry.id}>
                                        <Table.Td>{new Date(entry.date).toLocaleDateString()}</Table.Td>
                                        <Table.Td>{entry.technicianName}</Table.Td>
                                        <Table.Td>{entry.project}</Table.Td>
                                        <Table.Td>{entry.hours.toFixed(2)}</Table.Td>
                                        <Table.Td>
                                            <Badge color={getStatusColor(entry.status)}>
                                                {getStatusText(entry.status)}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <ActionIcon
                                                    variant="filled"
                                                    color="green"
                                                    size="sm"
                                                    onClick={() => handleApprove(entry.id)}
                                                    disabled={entry.status !== 'pending' || isDayClosed}
                                                    title={isDayClosed ? "El día está cerrado" : "Aprobar registro"}
                                                >
                                                    <IconCheck size="1rem" />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="filled"
                                                    color="red"
                                                    size="sm"
                                                    onClick={() => handleReject(entry.id)}
                                                    disabled={entry.status !== 'pending' || isDayClosed}
                                                    title={isDayClosed ? "El día está cerrado" : "Rechazar registro"}
                                                >
                                                    <IconX size="1rem" />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}

                    {isMobile ? (
                        // Vista móvil - Stack vertical para resumen
                        <Stack gap="xs" align="center">
                            <Text c="yellow.4" fw={500} size="sm">
                                Total de horas: {(filteredEntries.reduce((acc, curr) => acc + curr.hours, 0)).toFixed(2)}
                            </Text>
                            <Text c="gray.3" size="sm">
                                Registros pendientes: {filteredEntries.filter(e => e.status === 'pending').length}
                            </Text>
                        </Stack>
                    ) : (
                        // Vista desktop - Layout horizontal original
                        <Group justify="space-between">
                            <Text c="yellow.4">
                                Total de horas: {(filteredEntries.reduce((acc, curr) => acc + curr.hours, 0)).toFixed(2)}
                            </Text>
                            <Text c="gray.3">
                                Registros pendientes: {filteredEntries.filter(e => e.status === 'pending').length}
                            </Text>
                        </Group>
                    )}
                </Stack>
            </Paper>
        </>
    );
}