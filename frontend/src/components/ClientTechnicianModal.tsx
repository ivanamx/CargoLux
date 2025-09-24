import { Modal, Group, Avatar, Text, Badge, Stack, SimpleGrid, Button, Paper, RingProgress, ThemeIcon, ActionIcon } from '@mantine/core';
import { IconPhone, IconMail, IconClock, IconMapPin, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface TechnicianData {
    full_name: string;
    phone: string;
    email: string;
    status: string;
    avatar?: string;
    location?: string;
}

interface ClientTechnicianModalProps {
    opened: boolean;
    onClose: () => void;
    technicianData: TechnicianData | null;
    techStats: {
        partsCompleted: number;
        totalAssigned: number;
        efficiency: number;
        lastActivity: string;
    };
    allTechnicians: TechnicianData[];
    currentIndex: number;
    onPrevious: () => void;
    onNext: () => void;
}

export function ClientTechnicianModal({ opened, onClose, technicianData, techStats, allTechnicians, currentIndex, onPrevious, onNext }: ClientTechnicianModalProps) {
    if (!technicianData) return null;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group justify="space-between" w="100%">
                    <Group>
                        <Avatar 
                            size="md" 
                            radius="xl"
                            color="violet"
                            src={technicianData.avatar}
                        >
                            {technicianData.full_name.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <div>
                            <Group gap="sm" align="center">
                                <Text size="lg" fw={500}>{technicianData.full_name}</Text>
                                <Badge color={technicianData.status === 'presente' ? 'green' : 'red'}>
                                    {technicianData.status.toUpperCase()}
                                </Badge>
                            </Group>
                        </div>
                    </Group>
                    
                    {/* Flechas de navegación */}
                    {allTechnicians.length > 1 && (
                        <Group gap="xs">
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                onClick={onPrevious}
                                disabled={currentIndex === 0}
                            >
                                <IconChevronLeft size={20} />
                            </ActionIcon>
                            <Text size="sm" c="dimmed">
                                {currentIndex + 1} / {allTechnicians.length}
                            </Text>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                onClick={onNext}
                                disabled={currentIndex === allTechnicians.length - 1}
                            >
                                <IconChevronRight size={20} />
                            </ActionIcon>
                        </Group>
                    )}
                </Group>
            }
            size="lg"
        >
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
                                // notifications.show({
                                //     title: 'Error',
                                //     message: 'No hay número de teléfono disponible',
                                //     color: 'red'
                                // });
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
                                // notifications.show({
                                //     title: 'Error',
                                //     message: 'No hay correo electrónico disponible',
                                //     color: 'red'
                                // });
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

                    <SimpleGrid cols={2} spacing="md">
                        <div>
                            <Text size="sm" c="dimmed">Partes Completadas</Text>
                            <Text size="xl" fw={700} c="violet">{techStats.partsCompleted}</Text>
                        </div>
                        <div>
                            <Text size="sm" c="dimmed">Eficiencia</Text>
                            <Text size="xl" fw={700} c="green">{techStats.efficiency}%</Text>
                        </div>
                    </SimpleGrid>
                </Paper>

                {/* Información Adicional */}
                <Paper p="md" radius="md" withBorder>
                    <SimpleGrid cols={2} spacing="md">
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
                    </SimpleGrid>
                </Paper>
            </Stack>
        </Modal>
    );
}
