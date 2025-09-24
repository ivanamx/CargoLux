import { 
    Container, 
    Title, 
    Text, 
    Card, 
    Group, 
    Button, 
    Stack, 
    Badge, 
    TextInput, 
    NumberInput,
    Divider,
    ThemeIcon,
    Box,
    Grid,
    Alert,
    Modal,
    List,
    CheckIcon
} from '@mantine/core';
import { 
    IconShoppingCart, 
    IconCreditCard, 
    IconCheck, 
    IconX,
    IconInfoCircle,
    IconStar,
    IconRocket,
    IconBuilding,
    IconCalculator
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

// Definir los paquetes de escaneos
const scanPackages = [
    {
        id: 'basic',
        name: 'Básico',
        scans: 500,
        price: 0, // Se calculará dinámicamente
        icon: IconInfoCircle,
        color: 'blue',
        popular: false
    },
    {
        id: 'standard',
        name: 'Estándar',
        scans: 1000,
        price: 0, // Se calculará dinámicamente
        icon: IconStar,
        color: 'green',
        popular: true
    },
    {
        id: 'premium',
        name: 'Premium',
        scans: 2000,
        price: 0, // Se calculará dinámicamente
        icon: IconRocket,
        color: 'violet',
        popular: false
    },
    {
        id: 'enterprise',
        name: 'Empresarial',
        scans: 5000,
        price: 0, // Se calculará dinámicamente
        icon: IconBuilding,
        color: 'orange',
        popular: false
    }
];

// Precio base por escaneo (esto se puede mover a configuración)
const BASE_PRICE_PER_SCAN = 0.50; // $0.50 USD por escaneo

// Descuentos por volumen
const VOLUME_DISCOUNTS = {
    500: 0,      // Sin descuento
    1000: 0.05,  // 5% descuento
    2000: 0.10,  // 10% descuento
    5000: 0.15   // 15% descuento
};

const PurchaseScans = () => {
    const navigate = useNavigate();
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
    const [customScans, setCustomScans] = useState<number>(0);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Calcular precio con descuentos
    const calculatePrice = (scans: number) => {
        const basePrice = scans * BASE_PRICE_PER_SCAN;
        const discount = VOLUME_DISCOUNTS[scans as keyof typeof VOLUME_DISCOUNTS] || 0;
        const finalPrice = basePrice * (1 - discount);
        return {
            basePrice,
            discount: discount * 100,
            finalPrice: Math.round(finalPrice * 100) / 100
        };
    };

    // Obtener el paquete seleccionado
    const getSelectedPackageData = () => {
        if (isCustomMode) {
            return {
                scans: customScans,
                ...calculatePrice(customScans)
            };
        }
        const pkg = scanPackages.find(p => p.id === selectedPackage);
        if (pkg) {
            return {
                scans: pkg.scans,
                ...calculatePrice(pkg.scans)
            };
        }
        return null;
    };

    const handlePackageSelect = (packageId: string) => {
        setSelectedPackage(packageId);
        setIsCustomMode(false);
    };

    const handleCustomMode = () => {
        setIsCustomMode(true);
        setSelectedPackage(null);
    };

    const handlePurchase = async () => {
        const packageData = getSelectedPackageData();
        if (!packageData || packageData.scans <= 0) {
            notifications.show({
                title: 'Error',
                message: 'Selecciona un paquete válido',
                color: 'red'
            });
            return;
        }

        setLoading(true);
        setShowPaymentModal(true);
        
        // Simular proceso de pago
        setTimeout(() => {
            setLoading(false);
            notifications.show({
                title: 'Compra Exitosa',
                message: `Se han agregado ${packageData.scans} escaneos a tu cuenta`,
                color: 'green'
            });
            navigate('/client');
        }, 2000);
    };

    const selectedData = getSelectedPackageData();

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                {/* Header */}
                <Box>
                    <Title order={1} c="white" mb="sm">
                        Adquirir Más Escaneos
                    </Title>
                    <Text c="dimmed" size="lg">
                        Selecciona el paquete que mejor se adapte a tus necesidades o personaliza la cantidad
                    </Text>
                </Box>

                {/* Paquetes predefinidos */}
                <Box>
                    <Title order={3} c="white" mb="md">
                        Paquetes Disponibles
                    </Title>
                    <Grid>
                        {scanPackages.map((pkg) => {
                            const priceData = calculatePrice(pkg.scans);
                            return (
                                <Grid.Col key={pkg.id} span={{ base: 12, sm: 6, md: 3 }}>
                                    <Card
                                        p="lg"
                                        radius="md"
                                        withBorder
                                        style={{
                                            cursor: 'pointer',
                                            border: selectedPackage === pkg.id ? '2px solid #6366F1' : '1px solid #373A40',
                                            backgroundColor: selectedPackage === pkg.id ? 'rgba(99, 102, 241, 0.1)' : '#1A1B1E',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => handlePackageSelect(pkg.id)}
                                    >
                                        <Stack gap="md">
                                            <Group justify="space-between">
                                                <ThemeIcon
                                                    size="lg"
                                                    variant="light"
                                                    color={pkg.color}
                                                >
                                                    <pkg.icon size={20} />
                                                </ThemeIcon>
                                                {pkg.popular && (
                                                    <Badge color="violet" variant="light">
                                                        Popular
                                                    </Badge>
                                                )}
                                            </Group>
                                            
                                            <Box>
                                                <Text fw={700} size="xl" c="white">
                                                    {pkg.name}
                                                </Text>
                                            </Box>

                                            <Box>
                                                <Text size="3xl" fw={800} c="white">
                                                    {pkg.scans.toLocaleString()}
                                                </Text>
                                                <Text c="dimmed" size="md" fw={500}>
                                                    escaneos
                                                </Text>
                                            </Box>

                                            <Box>
                                                <Text size="lg" fw={600} c="teal">
                                                    ${priceData.finalPrice.toFixed(2)} USD
                                                </Text>
                                                {priceData.discount > 0 && (
                                                    <Text size="sm" c="dimmed">
                                                        Ahorra {priceData.discount}%
                                                    </Text>
                                                )}
                                            </Box>
                                        </Stack>
                                    </Card>
                                </Grid.Col>
                            );
                        })}
                    </Grid>
                </Box>

                {/* Opción personalizada */}
                <Box>
                    <Title order={3} c="white" mb="md">
                        O Personaliza tu Cantidad
                    </Title>
                    <Card p="lg" radius="md" withBorder>
                        <Stack gap="md">
                            <Group>
                                <ThemeIcon size="lg" variant="light" color="blue">
                                    <IconCalculator size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={500} size="lg" c="white">
                                        Cantidad Personalizada
                                    </Text>
                                    <Text c="dimmed" size="sm">
                                        Ingresa la cantidad exacta de escaneos que necesitas
                                    </Text>
                                </Box>
                            </Group>

                            <NumberInput
                                label="Número de Escaneos"
                                placeholder="Ej: 1500"
                                value={customScans}
                                onChange={(value) => setCustomScans(Number(value) || 0)}
                                min={1}
                                max={10000}
                                size="md"
                                onClick={() => handleCustomMode()}
                            />

                            {customScans > 0 && (
                                <Alert
                                    icon={<IconInfoCircle size={16} />}
                                    title="Cotización"
                                    color="blue"
                                >
                                    <Text size="md">
                                        <Text component="span" size="xl" fw={800} c="white">
                                            {customScans.toLocaleString()}
                                        </Text>
                                        <Text component="span" size="md" fw={500} c="dimmed" ml="xs">
                                            escaneos
                                        </Text>
                                        <Text component="span" size="md" fw={600} c="teal" ml="xs">
                                            = ${calculatePrice(customScans).finalPrice.toFixed(2)} USD
                                        </Text>
                                        {calculatePrice(customScans).discount > 0 && (
                                            <Text component="span" c="teal" ml="xs" fw={500}>
                                                (Ahorra {calculatePrice(customScans).discount}%)
                                            </Text>
                                        )}
                                    </Text>
                                </Alert>
                            )}
                        </Stack>
                    </Card>
                </Box>

                {/* Resumen de compra */}
                {selectedData && (
                    <Card p="lg" radius="md" withBorder bg="rgba(99, 102, 241, 0.1)">
                        <Stack gap="md">
                            <Title order={4} c="white">
                                Resumen de Compra
                            </Title>
                            
                            <Group justify="space-between">
                                <Text c="dimmed">Escaneos:</Text>
                                <Text fw={500} c="white">
                                    {selectedData.scans.toLocaleString()}
                                </Text>
                            </Group>

                            <Group justify="space-between">
                                <Text c="dimmed">Precio base:</Text>
                                <Text c="white">
                                    ${selectedData.basePrice.toFixed(2)} USD
                                </Text>
                            </Group>

                            {selectedData.discount > 0 && (
                                <Group justify="space-between">
                                    <Text c="dimmed">Descuento ({selectedData.discount}%):</Text>
                                    <Text c="teal">
                                        -${(selectedData.basePrice - selectedData.finalPrice).toFixed(2)} USD
                                    </Text>
                                </Group>
                            )}

                            <Divider />

                            <Group justify="space-between">
                                <Text fw={700} size="lg" c="white">Total:</Text>
                                <Text fw={700} size="lg" c="teal">
                                    ${selectedData.finalPrice.toFixed(2)} USD
                                </Text>
                            </Group>
                        </Stack>
                    </Card>
                )}

                {/* Botones de acción */}
                <Group justify="space-between">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/client')}
                        leftSection={<IconX size={16} />}
                    >
                        Cancelar
                    </Button>
                    
                    <Button
                        onClick={handlePurchase}
                        disabled={!selectedData || selectedData.scans <= 0}
                        loading={loading}
                        leftSection={<IconShoppingCart size={16} />}
                        size="lg"
                    >
                        Proceder al Pago
                    </Button>
                </Group>
            </Stack>

            {/* Modal de pago */}
            <Modal
                opened={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Procesando Pago"
                size="md"
            >
                <Stack gap="md">
                    <Alert
                        icon={<IconCreditCard size={16} />}
                        title="Integración con Stripe"
                        color="blue"
                    >
                        <Text size="sm">
                            Esta funcionalidad se integrará con Stripe para procesar pagos de forma segura.
                        </Text>
                    </Alert>

                    <List spacing="xs" size="sm">
                        <List.Item icon={<CheckIcon size={16} />}>
                            Pago seguro con Stripe
                        </List.Item>
                        <List.Item icon={<CheckIcon size={16} />}>
                            Escaneos agregados instantáneamente
                        </List.Item>
                        <List.Item icon={<CheckIcon size={16} />}>
                            Recibo por email
                        </List.Item>
                    </List>

                    <Text size="sm" c="dimmed" ta="center">
                        Simulando proceso de pago...
                    </Text>
                </Stack>
            </Modal>
        </Container>
    );
};

export default PurchaseScans;
