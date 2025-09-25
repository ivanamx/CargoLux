import React, { useState, useEffect } from 'react';
import { 
    Container, 
    Title, 
    Text, 
    Button, 
    Group, 
    Stack, 
    Card, 
    Grid, 
    ThemeIcon, 
    Box, 
    Badge, 
    NumberInput,
    Modal,
    List,
    Divider,
    Paper,
    SimpleGrid,
    Center,
    Anchor,
    Image,
    ActionIcon,
    TextInput,
    Alert
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { HelmetProvider } from 'react-helmet-async';
import LandingPageSEO from './LandingPageSEO';
import '../styles/landing.css';
import { 
    IconQrcode, 
    IconUsers, 
    IconMapPin, 
    IconClock, 
    IconChartBar, 
    IconShield, 
    IconRocket, 
    IconCheck, 
    IconStar, 
    IconBuilding, 
    IconCalculator,
    IconShoppingCart,
    IconCreditCard,
    IconInfoCircle,
    IconPhone,
    IconMail,
    IconBrandLinkedin,
    IconBrandX,
    IconBrandFacebook,
    IconArrowRight,
    IconPlayerPlay,
    IconDownload,
    IconAward,
    IconTrendingUp,
    IconSettings,
    IconEye,
    IconLock,
    IconCloud,
    IconDeviceMobile,
    IconGlobe,
    IconTarget,
    IconBulb,
    IconHeart,
    IconThumbUp,
    IconMessageCircle,
    IconHeadphones,
    IconBolt,
    IconDatabase,
    IconRefresh,
    IconSearch,
    IconFilter,
    IconReportAnalytics,
    IconFileText,
    IconCalendar,
    IconBell,
    IconAlertCircle,
    IconCircleCheck,
    IconX,
    IconPlus,
    IconMinus
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

// Datos de paquetes de escaneos (reutilizando la lógica de PurchaseScans)
const scanPackages = [
    {
        id: 'basic',
        name: 'Básico',
        scans: 500,
        price: 0,
        icon: IconInfoCircle,
        color: 'blue',
        popular: false,
        description: 'Perfecto para pequeñas empresas',
        features: ['500 escaneos', 'Soporte básico', 'Reportes básicos']
    },
    {
        id: 'standard',
        name: 'Estándar',
        scans: 1000,
        price: 0,
        icon: IconStar,
        color: 'green',
        popular: true,
        description: 'La opción más popular',
        features: ['1,000 escaneos', 'Soporte prioritario', 'Reportes avanzados', 'API básica']
    },
    {
        id: 'premium',
        name: 'Premium',
        scans: 2000,
        price: 0,
        icon: IconRocket,
        color: 'violet',
        popular: false,
        description: 'Para empresas en crecimiento',
        features: ['2,000 escaneos', 'Soporte 24/7', 'Reportes personalizados', 'API completa']
    },
    {
        id: 'enterprise',
        name: 'Empresarial',
        scans: 5000,
        price: 0,
        icon: IconBuilding,
        color: 'orange',
        popular: false,
        description: 'Solución empresarial completa',
        features: ['5,000 escaneos', 'Soporte dedicado', 'Reportes personalizados', 'API completa', 'Integraciones']
    }
];

// Precio base por escaneo
const BASE_PRICE_PER_SCAN = 0.50;

// Descuentos por volumen
const VOLUME_DISCOUNTS = {
    500: 0,
    1000: 0.05,
    2000: 0.10,
    5000: 0.15
};

// Características principales de la plataforma
const features = [
    {
        icon: IconQrcode,
        title: 'Control de Calidad Industrial',
        description: 'Sistema de checkpoints, categorización y reempacado con códigos QR para garantizar estándares de calidad en procesos de retrabajo',
        color: 'blue'
    },
    {
        icon: IconUsers,
        title: 'Gestión de Técnicos Especializados',
        description: 'Control de asistencia con geolocalización GPS, reporte de horas trabajadas y gestión de recursos humanos para equipos de retrabajo',
        color: 'green'
    },
    {
        icon: IconMapPin,
        title: 'Tracking de Partes con GPS',
        description: 'Seguimiento geográfico de partes en proceso de retrabajo, checkpoints de ubicación y trazabilidad completa del flujo de trabajo',
        color: 'red'
    },
    {
        icon: IconChartBar,
        title: 'Reportes de Calidad y Progreso',
        description: 'Dashboard con estadísticas de calidad, reportes detallados por proyecto, análisis de eficiencia y métricas de retrabajo',
        color: 'violet'
    },
    {
        icon: IconClock,
        title: 'Project Mode Modal',
        description: 'Sistema de auditorías y procesos de retrabajo con modal de pantalla completa para control preciso de operaciones industriales',
        color: 'orange'
    },
    {
        icon: IconAlertCircle,
        title: 'Reporte de Fallas e Incidencias',
        description: 'Sistema integrado para reportar partes fallidas, incidencias de calidad y seguimiento de problemas en procesos de retrabajo',
        color: 'cyan'
    }
];

// Beneficios clave
const benefits = [
    {
        icon: IconTrendingUp,
        title: 'Reducción de Retrabajos',
        description: 'Control de calidad sistemático reduce defectos y mejora la eficiencia en procesos de retrabajo industrial',
        stat: '40%'
    },
    {
        icon: IconShield,
        title: 'Trazabilidad Completa',
        description: 'Seguimiento GPS y códigos QR garantizan trazabilidad total de partes desde entrada hasta salida',
        stat: '100%'
    },
    {
        icon: IconBolt,
        title: 'Control en Tiempo Real',
        description: 'Monitoreo instantáneo de técnicos, checkpoints de calidad y reportes automáticos de incidencias',
        stat: '24/7'
    },
    {
        icon: IconHeart,
        title: 'Empresas Optimizadas',
        description: 'Compañías industriales confían en CargoLux para mejorar sus procesos de control de calidad',
        stat: '50+'
    }
];

// Testimonios
const testimonials = [
    {
        name: 'Carlos Mendoza',
        company: 'Panasonic México',
        role: 'Gerente de Control de Calidad',
        content: 'CargoLux ha revolucionado nuestros procesos de retrabajo. El sistema de checkpoints y categorización nos permite mantener estándares de calidad excepcionales con trazabilidad completa.',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    },
    {
        name: 'María González',
        company: 'Industrias del Norte',
        role: 'Supervisora de Retrabajos',
        content: 'El Project Mode Modal y el tracking de partes con GPS han mejorado significativamente nuestra eficiencia. Ahora podemos rastrear cada parte desde entrada hasta salida con precisión milimétrica.',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    },
    {
        name: 'Roberto Silva',
        company: 'Manufacturas del Sur',
        role: 'Coordinador de Calidad',
        content: 'El sistema de reporte de fallas e incidencias integrado con geolocalización nos permite identificar y resolver problemas de calidad de manera inmediata. Es fundamental para nuestros procesos.',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    }
];

// Preguntas frecuentes
const faqs = [
    {
        question: '¿Cómo funciona el sistema de control de calidad con checkpoints?',
        answer: 'CargoLux utiliza un sistema de checkpoints GPS para rastrear cada parte en proceso de retrabajo. Los técnicos escanean códigos QR en puntos específicos para registrar categorización, reempacado y control de calidad en tiempo real.'
    },
    {
        question: '¿Qué es el Project Mode Modal y cómo se usa?',
        answer: 'El Project Mode Modal es una interfaz de pantalla completa diseñada para auditorías y procesos de retrabajo. Permite a los técnicos trabajar de manera inmersiva con controles de calidad, categorización y seguimiento detallado de cada parte.'
    },
    {
        question: '¿Cómo se rastrea la trazabilidad de las partes?',
        answer: 'Cada parte se rastrea con códigos QR únicos y geolocalización GPS. El sistema registra cada checkpoint, categoría, técnico responsable y ubicación exacta, creando una trazabilidad completa desde entrada hasta salida del proceso de retrabajo.'
    },
    {
        question: '¿Qué reportes de calidad y progreso puedo obtener?',
        answer: 'El sistema genera reportes detallados de calidad por proyecto, análisis de eficiencia de técnicos, métricas de retrabajo, estadísticas de checkpoints, reportes de fallas e incidencias, y análisis de tiempo por categoría de parte.'
    },
    {
        question: '¿Cómo funciona el sistema de reporte de fallas e incidencias?',
        answer: 'Los técnicos pueden reportar partes fallidas directamente desde el campo con geolocalización GPS. El sistema categoriza automáticamente las incidencias, las asigna a proyectos específicos y genera alertas para supervisores y equipos de calidad.'
    }
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
    const [customScans, setCustomScans] = useState<number>(0);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [phone, setPhone] = useState('');
    const [showContactModal, setShowContactModal] = useState(false);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    // SEO and Performance optimizations
    useEffect(() => {
        // Preload critical resources
        const preloadImage = (src: string) => {
            const img = document.createElement('img');
            img.src = src;
        };

        // Preload hero background and key images
        preloadImage('https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face');
        preloadImage('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face');
        preloadImage('https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face');

        // Add loading class for smooth transitions
        document.body.classList.add('loaded');
    }, []);

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

    const handleGetStarted = () => {
        navigate('/login');
    };

    const handleContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        notifications.show({
            title: '¡Mensaje enviado!',
            message: 'Nos pondremos en contacto contigo en las próximas 24 horas.',
            color: 'green'
        });
        setShowContactModal(false);
        setName('');
        setEmail('');
        setCompany('');
        setPhone('');
    };

    const selectedData = getSelectedPackageData();

    return (
        <HelmetProvider>
            <LandingPageSEO />
            <Box>
                {/* Hero Section */}
            <Box
                style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                    minHeight: '100vh',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Corporate Background Pattern */}
                <Box
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
                        zIndex: 1
                    }}
                />

                <Container size="lg" style={{ position: 'relative', zIndex: 2 }}>
                    <Grid align="center" style={{ minHeight: '100vh' }}>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Stack gap="xl">
                                <Badge size="lg" variant="light" color="blue" style={{ alignSelf: 'flex-start', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                    ✓ Control de Calidad Industrial
                                </Badge>
                                
                                <Title 
                                    order={1} 
                                    size="3.5rem" 
                                    c="white" 
                                    fw={800}
                                    style={{ 
                                        lineHeight: 1.1,
                                        letterSpacing: '-0.02em'
                                    }}
                                >
                                    CargoLux
                                    <Text component="span" c="blue.3" display="block">
                                        Control de Calidad
                                    </Text>
                                </Title>

                                <Text size="xl" c="white" opacity={0.9} maw={500} style={{ lineHeight: 1.6 }}>
                                    Plataforma especializada en control de calidad industrial y gestión de retrabajos. 
                                    Sistema de checkpoints, tracking de partes con GPS y reporte de incidencias para optimizar procesos de calidad.
                                </Text>

                                <Group gap="md" wrap="wrap">
                                    <Button
                                        size="lg"
                                        onClick={handleGetStarted}
                                        rightSection={<IconArrowRight size={20} />}
                                        style={{
                                            background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                                            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
                                            border: 'none'
                                        }}
                                    >
                                        Solicitar Demo
                                    </Button>
                                    
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        color="white"
                                        onClick={() => setShowContactModal(true)}
                                        rightSection={<IconMessageCircle size={20} />}
                                        style={{
                                            border: '2px solid rgba(255, 255, 255, 0.3)',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    >
                                        Contactar Ventas
                                    </Button>
                                </Group>

                                <Group gap="xl" mt="xl">
                                    <Group gap="xs">
                                        <IconCheck size={20} color="#3b82f6" />
                                        <Text c="white" size="sm">Checkpoints GPS</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <IconCheck size={20} color="#3b82f6" />
                                        <Text c="white" size="sm">Control de Calidad</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <IconCheck size={20} color="#3b82f6" />
                                        <Text c="white" size="sm">Trazabilidad Total</Text>
                                    </Group>
                                </Group>
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Box
                                style={{
                                    position: 'relative',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    backdropFilter: 'blur(20px)',
                                    borderRadius: '16px',
                                    padding: '2rem',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)'
                                }}
                            >
                                <Stack gap="md">
                                    <Group justify="space-between">
                                        <Text c="white" fw={600} size="lg">Sistema en Acción</Text>
                                        <Badge color="blue" variant="light" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>Live</Badge>
                                    </Group>
                                    
                                    <Carousel
                                        withIndicators
                                        height={400}
                                        slideSize="100%"
                                        slideGap="md"
                                        loop
                                        withControls
                                        styles={{
                                            control: {
                                                '&[data-inactive]': {
                                                    opacity: 0,
                                                    cursor: 'default',
                                                },
                                            },
                                        }}
                                    >
                                        <Carousel.Slide>
                                            <Box
                                                style={{
                                                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                                    borderRadius: '12px',
                                                    padding: '2rem',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <IconQrcode size={60} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                                                <Text c="white" fw={600} size="lg" mb="sm">Control de Calidad</Text>
                                                <Text c="white" size="sm" opacity={0.8}>
                                                    Sistema de checkpoints y categorización para procesos de retrabajo industrial
                                                </Text>
                                            </Box>
                                        </Carousel.Slide>
                                        
                                        <Carousel.Slide>
                                            <Box
                                                style={{
                                                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                                    borderRadius: '12px',
                                                    padding: '2rem',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <IconMapPin size={60} color="#10b981" style={{ marginBottom: '1rem' }} />
                                                <Text c="white" fw={600} size="lg" mb="sm">Tracking GPS</Text>
                                                <Text c="white" size="sm" opacity={0.8}>
                                                    Seguimiento geográfico de partes con geolocalización en tiempo real
                                                </Text>
                                            </Box>
                                        </Carousel.Slide>
                                        
                                        <Carousel.Slide>
                                            <Box
                                                style={{
                                                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                                    borderRadius: '12px',
                                                    padding: '2rem',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <IconChartBar size={60} color="#f59e0b" style={{ marginBottom: '1rem' }} />
                                                <Text c="white" fw={600} size="lg" mb="sm">Reportes Detallados</Text>
                                                <Text c="white" size="sm" opacity={0.8}>
                                                    Analytics de calidad, progreso y métricas de retrabajo por proyecto
                                                </Text>
                                            </Box>
                                        </Carousel.Slide>
                                        
                                        <Carousel.Slide>
                                            <Box
                                                style={{
                                                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                                    borderRadius: '12px',
                                                    padding: '2rem',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <IconAlertCircle size={60} color="#ef4444" style={{ marginBottom: '1rem' }} />
                                                <Text c="white" fw={600} size="lg" mb="sm">Reporte de Incidencias</Text>
                                                <Text c="white" size="sm" opacity={0.8}>
                                                    Sistema integrado para reportar fallas y problemas de calidad
                                                </Text>
                                            </Box>
                                        </Carousel.Slide>
                                    </Carousel>
                                </Stack>
                            </Box>
                        </Grid.Col>
                    </Grid>
                </Container>
            </Box>

            {/* Features Section */}
            <Box
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                    padding: '100px 0'
                }}
            >
                <Container size="lg">
                    <Stack gap="xl" align="center">
                        <Box ta="center" maw={600}>
                            <Badge size="lg" variant="light" color="blue" mb="md" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                Control Industrial
                            </Badge>
                            <Title order={2} size="2.5rem" fw={800} mb="md" c="white">
                                Control de Calidad Industrial Avanzado
                            </Title>
                            <Text size="lg" c="white" opacity={0.9}>
                                Plataforma especializada para control de calidad, gestión de retrabajos y optimización de procesos industriales
                            </Text>
                        </Box>

                    <Grid>
                        {features.map((feature, index) => (
                            <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4 }}>
                                <Card
                                    p="xl"
                                    radius="md"
                                    withBorder
                                    style={{
                                        height: '100%',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: 'white'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                >
                                    <Stack gap="md" align="center" ta="center">
                                        <ThemeIcon
                                            size={60}
                                            radius="xl"
                                            variant="light"
                                            color={feature.color}
                                        >
                                            <feature.icon size={30} />
                                        </ThemeIcon>
                                        
                                        <Title order={3} size="h4" c="white">
                                            {feature.title}
                                        </Title>
                                        
                                        <Text c="white" size="sm" opacity={0.8}>
                                            {feature.description}
                                        </Text>
                                    </Stack>
                                </Card>
                            </Grid.Col>
                        ))}
                    </Grid>
                </Stack>
                </Container>
            </Box>

            {/* Benefits Section */}
            <Box
                style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                    padding: '100px 0'
                }}
            >
                <Container size="lg">
                    <Stack gap="xl">
                        <Box ta="center" maw={600} mx="auto">
                            <Badge size="lg" variant="light" color="green" mb="md" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                Resultados Comprobados
                            </Badge>
                            <Title order={2} size="2.5rem" fw={800} mb="md" c="white">
                                ¿Por qué las empresas industriales eligen CargoLux?
                            </Title>
                            <Text size="lg" c="white" opacity={0.9}>
                                Empresas industriales han optimizado sus procesos de calidad y retrabajo con nuestro sistema especializado
                            </Text>
                        </Box>

                        <Grid>
                            {benefits.map((benefit, index) => (
                                <Grid.Col key={index} span={{ base: 12, sm: 6, md: 3 }}>
                                    <Card
                                        p="xl"
                                        radius="md"
                                        withBorder
                                        style={{ 
                                            height: '100%',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            color: 'white'
                                        }}
                                    >
                                        <Stack gap="md" align="center" ta="center">
                                            <Box
                                                style={{
                                                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                                                    borderRadius: '50%',
                                                    padding: '1rem',
                                                    color: 'white'
                                                }}
                                            >
                                                <benefit.icon size={30} />
                                            </Box>
                                            
                                            <Text size="3rem" fw={800} c="white">
                                                {benefit.stat}
                                            </Text>
                                            
                                            <Title order={3} size="h4" c="white">
                                                {benefit.title}
                                            </Title>
                                            
                                            <Text c="white" size="sm" opacity={0.8}>
                                                {benefit.description}
                                            </Text>
                                        </Stack>
                                    </Card>
                                </Grid.Col>
                            ))}
                        </Grid>
                    </Stack>
                </Container>
            </Box>

            {/* Pricing Section */}
            <Box
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                    padding: '100px 0'
                }}
            >
                <Container size="lg">
                    <Stack gap="xl" align="center">
                        <Box ta="center" maw={600}>
                            <Badge size="lg" variant="light" color="violet" mb="md" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                Paquetes de Escaneos
                            </Badge>
                            <Title order={2} size="2.5rem" fw={800} mb="md" c="white">
                                Escaneos QR para Control Industrial
                            </Title>
                            <Text size="lg" c="white" opacity={0.9}>
                                Paquetes de escaneos QR adaptados a las necesidades de tu empresa industrial
                            </Text>
                        </Box>

                    <Grid>
                        {scanPackages.map((pkg) => {
                            const priceData = calculatePrice(pkg.scans);
                            return (
                                <Grid.Col key={pkg.id} span={{ base: 12, sm: 6, md: 3 }}>
                                    <Card
                                        p="xl"
                                        radius="md"
                                        withBorder
                                        style={{
                                            height: '100%',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            border: selectedPackage === pkg.id ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                                            background: selectedPackage === pkg.id ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            backdropFilter: 'blur(10px)',
                                            color: 'white',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => handlePackageSelect(pkg.id)}
                                    >
                                        {pkg.popular && (
                                            <Badge
                                                color="violet"
                                                variant="light"
                                                style={{
                                                    position: 'absolute',
                                                    top: -10,
                                                    left: '50%',
                                                    transform: 'translateX(-50%)'
                                                }}
                                            >
                                                Más Popular
                                            </Badge>
                                        )}

                                        <Stack gap="md" align="center" ta="center">
                                            <ThemeIcon
                                                size={60}
                                                radius="xl"
                                                variant="light"
                                                color={pkg.color}
                                            >
                                                <pkg.icon size={30} />
                                            </ThemeIcon>

                                            <Title order={3} size="h4" c="white">
                                                {pkg.name}
                                            </Title>

                                            <Text c="white" size="sm" opacity={0.8}>
                                                {pkg.description}
                                            </Text>

                                            <Box>
                                                <Text size="3rem" fw={800} c="white">
                                                    ${priceData.finalPrice.toFixed(2)}
                                                </Text>
                                                <Text c="white" size="sm" opacity={0.8}>
                                                    USD por {pkg.scans.toLocaleString()} escaneos
                                                </Text>
                                                {priceData.discount > 0 && (
                                                    <Badge color="green" variant="light" size="sm">
                                                        Ahorra {priceData.discount}%
                                                    </Badge>
                                                )}
                                            </Box>

                                            <List size="sm" c="white" style={{ textAlign: 'left', opacity: 0.9 }}>
                                                {pkg.features.map((feature, index) => (
                                                    <List.Item key={index} icon={<IconCheck size={16} color="#10b981" />}>
                                                        {feature}
                                                    </List.Item>
                                                ))}
                                            </List>
                                        </Stack>
                                    </Card>
                                </Grid.Col>
                            );
                        })}
                    </Grid>

                    {/* Custom Package Option */}
                    <Card 
                        p="xl" 
                        radius="md" 
                        withBorder 
                        maw={500} 
                        w="100%"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'white'
                        }}
                    >
                        <Stack gap="md" align="center" ta="center">
                            <ThemeIcon size={60} radius="xl" variant="light" color="blue">
                                <IconCalculator size={30} />
                            </ThemeIcon>

                            <Title order={3} size="h4" c="white">
                                Cantidad Personalizada
                            </Title>

                            <Text c="white" size="sm" opacity={0.8}>
                                Ingresa la cantidad exacta de escaneos que necesitas
                            </Text>

                            <NumberInput
                                label="Número de Escaneos"
                                placeholder="Ej: 1500"
                                value={customScans}
                                onChange={(value) => setCustomScans(Number(value) || 0)}
                                min={1}
                                max={10000}
                                size="md"
                                onClick={handleCustomMode}
                                style={{ width: '100%' }}
                            />

                            {customScans > 0 && (
                                <Alert
                                    icon={<IconInfoCircle size={16} />}
                                    title="Cotización"
                                    color="blue"
                                    style={{ width: '100%' }}
                                >
                                    <Text size="md">
                                        <Text component="span" size="xl" fw={800}>
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

                    <Button
                        size="xl"
                        onClick={handleGetStarted}
                        rightSection={<IconArrowRight size={20} />}
                        style={{
                            background: 'linear-gradient(45deg, #667eea, #764ba2)',
                            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                        }}
                    >
                        Comenzar Ahora
                    </Button>
                </Stack>
                </Container>
            </Box>

            {/* Testimonials Section */}
            <Box
                style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                    padding: '100px 0'
                }}
            >
                <Container size="lg">
                    <Stack gap="xl" align="center">
                        <Box ta="center" maw={600}>
                            <Badge size="lg" variant="light" color="orange" mb="md" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                Casos de Éxito
                            </Badge>
                            <Title order={2} size="2.5rem" fw={800} mb="md" c="white">
                                Nuestros Clientes Hablan
                            </Title>
                            <Text size="lg" c="white" opacity={0.9}>
                                Gerentes y supervisores industriales comparten sus experiencias con CargoLux
                            </Text>
                        </Box>

                        <Grid>
                            {testimonials.map((testimonial, index) => (
                                <Grid.Col key={index} span={{ base: 12, md: 4 }}>
                                    <Card 
                                        p="xl" 
                                        radius="md" 
                                        withBorder 
                                        style={{ 
                                            height: '100%',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            color: 'white'
                                        }}
                                    >
                                        <Stack gap="md">
                                            <Group>
                                                {[...Array(testimonial.rating)].map((_, i) => (
                                                    <IconStar key={i} size={20} color="#ffd700" fill="#ffd700" />
                                                ))}
                                            </Group>

                                            <Text c="white" style={{ fontStyle: 'italic', opacity: 0.9 }}>
                                                "{testimonial.content}"
                                            </Text>

                                            <Group>
                                                <Image
                                                    src={testimonial.avatar}
                                                    alt={testimonial.name}
                                                    width={50}
                                                    height={50}
                                                    radius="xl"
                                                />
                                                <Box>
                                                    <Text fw={600} c="white">{testimonial.name}</Text>
                                                    <Text size="sm" c="white" opacity={0.8}>{testimonial.role}</Text>
                                                    <Text size="sm" c="white" opacity={0.9}>{testimonial.company}</Text>
                                                </Box>
                                            </Group>
                                        </Stack>
                                    </Card>
                                </Grid.Col>
                            ))}
                        </Grid>
                    </Stack>
                </Container>
            </Box>

            {/* FAQ Section */}
            <Box
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                    padding: '100px 0'
                }}
            >
                <Container size="lg">
                    <Stack gap="xl" align="center">
                        <Box ta="center" maw={600}>
                            <Badge size="lg" variant="light" color="cyan" mb="md" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                Soporte Técnico
                            </Badge>
                            <Title order={2} size="2.5rem" fw={800} mb="md" c="white">
                                Preguntas Frecuentes
                            </Title>
                            <Text size="lg" c="white" opacity={0.9}>
                                Respuestas a las preguntas más comunes sobre CargoLux y su implementación en control de calidad
                            </Text>
                        </Box>

                    <Box maw={800} w="100%">
                        {faqs.map((faq, index) => (
                            <Card
                                key={index}
                                p="md"
                                radius="md"
                                withBorder
                                mb="md"
                                style={{ 
                                    cursor: 'pointer',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white'
                                }}
                                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                            >
                                <Group justify="space-between">
                                    <Text fw={600} size="lg" c="white">
                                        {faq.question}
                                    </Text>
                                    <ActionIcon
                                        variant="subtle"
                                        color="white"
                                        size="sm"
                                    >
                                        {activeFaq === index ? <IconMinus size={16} /> : <IconPlus size={16} />}
                                    </ActionIcon>
                                </Group>
                                
                                {activeFaq === index && (
                                    <Text c="white" mt="md" opacity={0.9}>
                                        {faq.answer}
                                    </Text>
                                )}
                            </Card>
                        ))}
                    </Box>
                </Stack>
                </Container>
            </Box>

            {/* CTA Section */}
            <Box
                style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                    padding: '100px 0'
                }}
            >
                <Container size="lg">
                    <Stack gap="xl" align="center" ta="center">
                        <Title order={2} size="2.5rem" fw={800} c="white">
                            ¿Listo para Optimizar tu Control de Calidad Industrial?
                        </Title>
                        
                        <Text size="xl" c="white" opacity={0.9} maw={600}>
                            Únete a las empresas industriales que han revolucionado sus procesos de calidad y retrabajo con CargoLux
                        </Text>

                        <Group gap="md" wrap="wrap">
                            <Button
                                size="xl"
                                onClick={handleGetStarted}
                                rightSection={<IconArrowRight size={20} />}
                                style={{
                                    background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
                                    border: 'none'
                                }}
                            >
                                Iniciar Demo
                            </Button>
                            
                            <Button
                                size="xl"
                                variant="outline"
                                color="white"
                                onClick={() => setShowContactModal(true)}
                                rightSection={<IconMessageCircle size={20} />}
                                style={{
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                Contactar Ventas
                            </Button>
                        </Group>

                        <Group gap="xl" mt="xl">
                            <Group gap="xs">
                                <IconCheck size={20} color="#3b82f6" />
                                <Text c="white" size="sm">Demo personalizada</Text>
                            </Group>
                            <Group gap="xs">
                                <IconCheck size={20} color="#3b82f6" />
                                <Text c="white" size="sm">Implementación de calidad</Text>
                            </Group>
                            <Group gap="xs">
                                <IconCheck size={20} color="#3b82f6" />
                                <Text c="white" size="sm">Soporte técnico especializado</Text>
                            </Group>
                        </Group>
                    </Stack>
                </Container>
            </Box>

            {/* Footer */}
            <Box bg="dark" c="white" py={60}>
                <Container size="lg">
                    <Grid>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <Stack gap="md">
                                <Title order={3} c="white">
                                    CargoLux
                                </Title>
                                <Text c="dimmed" size="sm">
                                    La plataforma más avanzada para control de calidad industrial, 
                                    gestión de retrabajos y optimización de procesos de calidad.
                                </Text>
                                <Group gap="md">
                                    <ActionIcon variant="subtle" color="white" size="lg">
                                        <IconBrandLinkedin size={20} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" color="white" size="lg">
                                        <IconBrandX size={20} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" color="white" size="lg">
                                        <IconBrandFacebook size={20} />
                                    </ActionIcon>
                                </Group>
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, md: 2 }}>
                            <Stack gap="md">
                                <Text fw={600} c="white">Producto</Text>
                                <Anchor href="#" c="dimmed" size="sm">Control de Calidad</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Gestión de Retrabajos</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Checkpoints GPS</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Tracking de Partes</Anchor>
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, md: 2 }}>
                            <Stack gap="md">
                                <Text fw={600} c="white">Empresa</Text>
                                <Anchor href="#" c="dimmed" size="sm">Acerca de</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Casos de Éxito</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Carreras</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Contacto</Anchor>
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, md: 2 }}>
                            <Stack gap="md">
                                <Text fw={600} c="white">Soporte</Text>
                                <Anchor href="#" c="dimmed" size="sm">Centro de Ayuda</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Documentación</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Estado del Sistema</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Soporte Técnico</Anchor>
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, md: 2 }}>
                            <Stack gap="md">
                                <Text fw={600} c="white">Legal</Text>
                                <Anchor href="#" c="dimmed" size="sm">Privacidad</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Términos</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Cookies</Anchor>
                                <Anchor href="#" c="dimmed" size="sm">Seguridad</Anchor>
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    <Divider my="xl" color="gray.7" />

                    <Group justify="space-between" wrap="wrap">
                        <Text c="dimmed" size="sm">
                            © 2025 CargoLux Industrial. Todos los derechos reservados.
                        </Text>
                        <Group gap="md">
                            <Anchor href="#" c="dimmed" size="sm">Privacidad</Anchor>
                            <Anchor href="#" c="dimmed" size="sm">Términos</Anchor>
                            <Anchor href="#" c="dimmed" size="sm">Cookies</Anchor>
                        </Group>
                    </Group>
                </Container>
            </Box>

            {/* Contact Modal */}
            <Modal
                opened={showContactModal}
                onClose={() => setShowContactModal(false)}
                title="Contactar Ventas - CargoLux"
                size="md"
            >
                <form onSubmit={handleContactSubmit}>
                    <Stack gap="md">
                        <TextInput
                            label="Nombre completo"
                            placeholder="Tu nombre"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        
                        <TextInput
                            label="Email"
                            placeholder="tu@empresa.com"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        
                        <TextInput
                            label="Empresa"
                            placeholder="Nombre de tu empresa"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            required
                        />
                        
                        <TextInput
                            label="Teléfono"
                            placeholder="+52 55 1234 5678"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />

                        <Button type="submit" fullWidth size="md">
                            Enviar Mensaje
                        </Button>
                    </Stack>
                </form>
            </Modal>
            </Box>
        </HelmetProvider>
    );
};

export default LandingPage;
