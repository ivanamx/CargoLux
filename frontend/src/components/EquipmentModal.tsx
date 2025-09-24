import { Modal, Title, List, Paper } from '@mantine/core';
import { IconTools } from '@tabler/icons-react';

interface EquipmentModalProps {
    equipment: string[];
    opened: boolean;
    onClose: () => void;
}

export function EquipmentModal({ equipment, opened, onClose }: EquipmentModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Title order={4} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconTools size={20} />
                    Equipo Necesario
                </Title>
            }
            size="md"
        >
            <Paper>
                <List spacing="xs">
                    {equipment?.map((item, index) => (
                        <List.Item key={index}>{item}</List.Item>
                    ))}
                </List>
            </Paper>
        </Modal>
    );
} 