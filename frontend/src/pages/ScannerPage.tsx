import { useState, useEffect, useRef } from 'react';
import { 
    Paper, Button, Text, Group, Stack, Badge, Card, 
    Modal, Alert, Center, Loader, Image, ActionIcon, Switch,
    TextInput, ScrollArea, Select
} from '@mantine/core';
import { 
    IconQrcode, IconArrowLeft, IconRotate, IconCamera,
    IconCheck, IconX, IconRefresh, IconKeyboard, IconSearch,
    IconMapPin, IconExternalLink, IconSend, IconDownload,
    IconBuilding
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface ScannedCode {
    code: string;
    type: 'barcode' | 'qrcode';
    timestamp: Date;
    source: 'camera' | 'usb_scanner';
    location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    projectId?: number; // Agregar relación con proyecto
    projectName?: string; // Agregar nombre del proyecto
}

interface Project {
    id: number;
    name: string;
    status: string;
    client: string;
    description?: string;
}

interface CustomNotification {
    id: string;
    title: string;
    message: string;
    color: string;
    timestamp: Date;
}

// Control global de duplicados
let lastCodeGlobal = { code: '', source: '', time: 0 };

export default function ScannerPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedCodes, setScannedCodes] = useState<ScannedCode[]>([]);
    const [lastScannedCode, setLastScannedCode] = useState<ScannedCode | null>(null);
    const [scanInterval, setScanInterval] = useState<NodeJS.Timeout | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Estados para escáner USB
    const [isUsbScannerActive, setIsUsbScannerActive] = useState(false);
    const [usbScannerBuffer, setUsbScannerBuffer] = useState('');
    const [usbScannerTimeout, setUsbScannerTimeout] = useState<NodeJS.Timeout | null>(null);
    const [lastUsbScanTime, setLastUsbScanTime] = useState<number>(0);

    // Estado para notificaciones personalizadas
    const [customNotifications, setCustomNotifications] = useState<CustomNotification[]>([]);

    // Nuevo estado para deshabilitar el escaneo temporalmente
    const [scanDisabled, setScanDisabled] = useState(false);

    // Estados para el modal de lista completa
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Estados para el modal del mapa
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [mapSearchQuery, setMapSearchQuery] = useState('');

    // Estado para mostrar código USB en el área de cámara
    const [usbScannedCode, setUsbScannedCode] = useState<string>('');

    // Estados para proyectos
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);

    // Función para obtener proyectos del backend
    const fetchProjects = async () => {
        try {
            setIsLoadingProjects(true);
            const response = await fetch('/api/projects/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener proyectos');
            }
            
            const projectsData = await response.json();
            setProjects(projectsData);
            
            // Si no hay proyecto seleccionado y hay proyectos disponibles, seleccionar el primero
            if (!selectedProject && projectsData.length > 0) {
                setSelectedProject(projectsData[0].id.toString());
            }
            
        } catch (error) {
            console.error('Error fetching projects:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los proyectos',
                color: 'red'
            });
        } finally {
            setIsLoadingProjects(false);
        }
    };

    // Cargar proyectos al montar el componente
    useEffect(() => {
        fetchProjects();
    }, []);

    // Función para obtener el nombre del proyecto seleccionado
    const getSelectedProjectName = () => {
        if (!selectedProject) return 'Sin proyecto seleccionado';
        const project = projects.find(p => p.id.toString() === selectedProject);
        return project ? project.name : 'Proyecto no encontrado';
    };

    // Función para obtener el proyecto seleccionado completo
    const getSelectedProject = () => {
        if (!selectedProject) return null;
        return projects.find(p => p.id.toString() === selectedProject) || null;
    };

    // Inicializar el lector de códigos
    useEffect(() => {
        codeReaderRef.current = new BrowserMultiFormatReader();
        
        return () => {
            if (codeReaderRef.current) {
                codeReaderRef.current.reset();
            }
        };
    }, []);

    // Función para manejar entrada de escáner USB
    const handleUsbScannerInput = (event: KeyboardEvent) => {
        if (!isUsbScannerActive) return;

        const currentTime = Date.now();
        
        // Si han pasado más de 100ms desde la última tecla, reiniciar buffer
        if (currentTime - lastUsbScanTime > 100) {
            setUsbScannerBuffer('');
        }
        
        setLastUsbScanTime(currentTime);
        
        // Agregar carácter al buffer
        if (event.key.length === 1) {
            setUsbScannerBuffer(prev => prev + event.key);
        }
        
        // Limpiar timeout anterior
        if (usbScannerTimeout) {
            clearTimeout(usbScannerTimeout);
        }
        
        // Crear nuevo timeout para procesar el código completo
        const timeout = setTimeout(() => {
            if (usbScannerBuffer.length > 0) {
                processUsbScannedCode(usbScannerBuffer);
                setUsbScannerBuffer('');
            }
        }, 50); // 50ms después de la última tecla
        
        setUsbScannerTimeout(timeout);
    };

    // Función para procesar código escaneado por USB
    const processUsbScannedCode = async (code: string) => {
        // Limpiar caracteres especiales que algunos escáneres agregan
        const cleanCode = code.replace(/[\r\n]/g, '').trim();
        
        if (cleanCode.length === 0) return;
        
        // Mostrar el código en el área de cámara
        setUsbScannedCode(cleanCode);
        
        // Limpiar el código después de 3 segundos
        setTimeout(() => {
            setUsbScannedCode('');
        }, 3000);
        
        // Verificar si es duplicado
        const isDuplicate = scannedCodes.some(
            scannedCode => scannedCode.code === cleanCode && 
            (new Date().getTime() - scannedCode.timestamp.getTime()) < 3000
        );
        
        if (!isDuplicate) {
            await processCodeWithLocation(cleanCode, 'barcode', 'usb_scanner');
        }
    };

    // Función para activar/desactivar escáner USB
    const toggleUsbScanner = () => {
        if (isUsbScannerActive) {
            setIsUsbScannerActive(false);
            if (usbScannerTimeout) {
                clearTimeout(usbScannerTimeout);
                setUsbScannerTimeout(null);
            }
            setUsbScannerBuffer('');
            notifications.show({
                title: 'Escáner USB Desactivado',
                message: 'Ya no escucha códigos de escáneres USB',
                color: 'orange'
            });
        } else {
            // Desactivar cámara cuando se activa el escáner USB
            if (isCameraActive) {
                stopCamera();
            }
            setIsUsbScannerActive(true);
            notifications.show({
                title: 'Escáner USB Activado',
                message: 'Escuchando códigos de escáneres USB. Enfoca el input y escanea.',
                color: 'green'
            });
        }
    };

    // Agregar event listener para teclado
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            handleUsbScannerInput(event);
        };

        if (isUsbScannerActive) {
            document.addEventListener('keydown', handleKeyPress);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [isUsbScannerActive, usbScannerBuffer, lastUsbScanTime, usbScannerTimeout]);

    // Función para iniciar la cámara
    const startCamera = async () => {
        try {
            setCameraError(null);
            setIsProcessing(true);
            
            // Intentar obtener todas las cámaras disponibles
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            console.log('Cámaras disponibles:', videoDevices.map(d => ({ label: d.label, deviceId: d.deviceId })));
            
            // Buscar cámara trasera específicamente para mejor escaneo
            const backCamera = videoDevices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('trasera') ||
                device.label.toLowerCase().includes('environment') ||
                device.label.toLowerCase().includes('posterior') ||
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('traseira')
            );
            
            let constraints: MediaStreamConstraints;
            
            if (backCamera) {
                // Usar cámara trasera específica si se encuentra
                console.log('Usando cámara trasera específica:', backCamera.label);
                constraints = {
                    video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    deviceId: { exact: backCamera.deviceId }
                    }
                };
            } else {
                // Forzar cámara trasera con facingMode
                console.log('Forzando cámara trasera con facingMode environment');
                constraints = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: { ideal: 'environment' } // Forzar cámara trasera
                    }
                };
            }
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            setIsCameraActive(true);
            
            // Iniciar el escaneo automático
            startScanning(stream);
            
            // Notificación de prueba
            showCustomNotification('Cámara Iniciada', 'Cámara activada correctamente', 'green');
            
        } catch (error) {
            console.error('Error al acceder a la cámara trasera:', error);
            setCameraError('No se pudo acceder a la cámara trasera. Verifica los permisos.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Función para detener la cámara
    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
            setIsCameraActive(false);
        }
        if (scanInterval) {
            clearInterval(scanInterval);
            setScanInterval(null);
        }
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
        }
        setIsScanning(false);
    };

    // Función para iniciar el escaneo automático
    const startScanning = (stream?: MediaStream) => {
        if (!codeReaderRef.current || !videoRef.current) return;
        
        console.log('🔍 Iniciando escaneo...');
        setIsScanning(true);
        
        // Obtener deviceId de forma segura
        let deviceId: string | null = null;
        if (stream && stream.getVideoTracks().length > 0) {
            const settings = stream.getVideoTracks()[0].getSettings();
            deviceId = settings.deviceId || null;
            console.log('📷 Device ID:', deviceId);
        }
        
        // Configurar el lector para escaneo continuo
        codeReaderRef.current.decodeFromVideoDevice(
            deviceId,
            videoRef.current,
            (result: Result | null, error: any) => {
                if (result) {
                    // Código detectado exitosamente
                    const detectedCode = result.getText();
                    const format = result.getBarcodeFormat();
                    
                    console.log('🎯 ¡CÓDIGO DETECTADO!:', detectedCode, 'Formato:', format);
                    
                    // Determinar el tipo de código
                    const isQR = format.toString().includes('QR') || 
                                format.toString().includes('AZTEC') ||
                                format.toString().includes('DATA_MATRIX');
                    
            const newScannedCode: ScannedCode = {
                        code: detectedCode,
                        type: isQR ? 'qrcode' : 'barcode',
                        timestamp: new Date(),
                        source: 'camera'
                    };
                    
                    // Evitar duplicados recientes
                    const isDuplicate = scannedCodes.some(
                        code => code.code === detectedCode && 
                        (new Date().getTime() - code.timestamp.getTime()) < 3000 // 3 segundos
                    );
                    
                    if (!isDuplicate) {
                        // Procesar código con geolocalización
                        processCodeWithLocation(detectedCode, isQR ? 'qrcode' : 'barcode', 'camera').catch(error => {
                            console.error('Error procesando código:', error);
                        });
                    }
                }
                
                if (error) {
                    // Solo mostrar errores que no sean NotFoundException (que es normal durante el escaneo)
                    if (error.name !== 'NotFoundException' && error.name !== 'NotFoundException2') {
                        console.error('❌ Error en el escaneo:', error);
                    }
                }
            }
        );
        
        console.log('✅ Escáner iniciado correctamente');
    };

    // Función para limpiar códigos escaneados
    const clearScannedCodes = () => {
        setScannedCodes([]);
        setLastScannedCode(null);
    };

    // Función para copiar código al portapapeles
    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            notifications.show({
                title: 'Copiado',
                message: 'Código copiado al portapapeles',
                color: 'blue'
            });
        });
    };

    // Función para forzar cámara trasera
    const forceBackCamera = async () => {
        try {
            setCameraError(null);
            setIsProcessing(true);
            
            // Detener cámara actual si está activa
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
            
            // Forzar cámara trasera
            const constraints: MediaStreamConstraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: { ideal: 'environment' }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            setIsCameraActive(true);
            startScanning(stream);
            
            notifications.show({
                title: 'Cámara Trasera Activada',
                message: 'Cámara trasera forzada exitosamente',
                color: 'green',
                icon: <IconCamera size={16} />
            });
            
        } catch (error) {
            console.error('Error al forzar cámara trasera:', error);
            setCameraError('No se pudo activar la cámara trasera.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Función para reiniciar el escáner
    const restartScanner = () => {
        stopCamera();
        setTimeout(() => {
            startCamera();
        }, 500);
    };

    useEffect(() => {
        startCamera();
        
        return () => {
            stopCamera();
        };
    }, []);

    // Función para mostrar notificación personalizada
    const showCustomNotification = (title: string, message: string, color: string = 'green') => {
        const newNotification: CustomNotification = {
            id: Date.now().toString(),
            title,
            message,
            color,
            timestamp: new Date()
        };
        
        setCustomNotifications(prev => [newNotification, ...prev.slice(0, 2)]);
        
        // Auto-remover después de 4 segundos
        setTimeout(() => {
            setCustomNotifications(prev => prev.filter(n => n.id !== newNotification.id));
        }, 4000);
    };

    // Función para abrir ubicación en mapas
    const openLocationInMaps = (latitude: number, longitude: number) => {
        // Detectar si es iOS para usar Apple Maps
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isIOS) {
            // Apple Maps para iOS
            window.open(`https://maps.apple.com/?q=${latitude},${longitude}&ll=${latitude},${longitude}&z=15`);
        } else {
            // Google Maps para otros dispositivos
            window.open(`https://www.google.com/maps?q=${latitude},${longitude}&z=15`);
        }
    };

    // Función para filtrar códigos escaneados
    const getFilteredScannedCodes = () => {
        if (!searchQuery.trim()) {
            return scannedCodes;
        }
        
        const query = searchQuery.toLowerCase().trim();
        return scannedCodes.filter(code => 
            code.code.toLowerCase().includes(query) ||
            code.code.slice(-6).toLowerCase().includes(query)
        );
    };

    // Función para obtener códigos del día actual
    const getTodayScannedCodes = () => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        return scannedCodes.filter(code => 
            code.timestamp >= startOfDay && code.timestamp <= endOfDay
        );
    };

    // Función para enviar registro individual por WhatsApp
    const sendIndividualRecord = (code: ScannedCode) => {
        // Crear mensaje con código y ubicación
        let message = `📱 *Registro de Escaneo*\n\n`;
        message += `🔢 *Código:* ${code.code}\n`;
        message += `📅 *Fecha:* ${code.timestamp.toLocaleDateString()}\n`;
        message += `⏰ *Hora:* ${code.timestamp.toLocaleTimeString()}\n`;
        message += `📊 *Tipo:* ${code.type === 'qrcode' ? 'QR Code' : 'Código de Barras'}\n`;
        message += `📷 *Fuente:* ${code.source === 'camera' ? 'Cámara' : 'USB'}\n`;
        
        // Agregar información del proyecto si existe
        if (code.projectName) {
            message += `📋 *Proyecto:* ${code.projectName}\n`;
        }
        
        if (code.location) {
            // Crear enlace de Google Maps clickeable
            const mapsUrl = `https://www.google.com/maps?q=${code.location.latitude},${code.location.longitude}&z=15`;
            message += `📍 *Ubicación:* ${code.location.latitude.toFixed(6)}, ${code.location.longitude.toFixed(6)}\n`;
            message += `🗺️ *Ver en Maps:* ${mapsUrl}\n`;
            
            if (code.location.accuracy) {
                message += `🎯 *Precisión:* ±${Math.round(code.location.accuracy)}m\n`;
            }
        } else {
            message += `⚠️ *Sin ubicación GPS*\n`;
        }
        
        // Crear URL de WhatsApp con el mensaje
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        
        // Abrir WhatsApp
        window.open(whatsappUrl, '_blank');
        
        notifications.show({
            title: 'WhatsApp Abierto',
            message: 'El mensaje está listo para enviar en WhatsApp',
            color: 'green',
            icon: <IconSend size={16} />
        });
    };

    // Función para descargar Excel
    const downloadExcel = () => {
        const todayCodes = getTodayScannedCodes();
        
        if (todayCodes.length === 0) {
            notifications.show({
                title: 'Sin datos',
                message: 'No hay registros para descargar',
                color: 'orange'
            });
            return;
        }

        // Crear contenido CSV (formato Excel)
        let csvContent = 'Código,Tipo,Fuente,Fecha,Hora,Latitud,Longitud,Proyecto\n';
        
        todayCodes.forEach(code => {
            const date = code.timestamp.toLocaleDateString();
            const time = code.timestamp.toLocaleTimeString();
            const lat = code.location?.latitude || '';
            const lon = code.location?.longitude || '';
            const project = code.projectName || '';
            
            csvContent += `"${code.code}","${code.type}","${code.source}","${date}","${time}","${lat}","${lon}","${project}"\n`;
        });

        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `escaneos_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        notifications.show({
            title: 'Excel Descargado',
            message: `${todayCodes.length} registros exportados correctamente`,
            color: 'green'
        });
    };

    // Función para obtener códigos con ubicación para el mapa
    const getScannedCodesWithLocation = () => {
        return scannedCodes.filter(code => code.location);
    };

    // Función para obtener el centro del mapa
    const getMapCenter = () => {
        const codesWithLocation = getScannedCodesWithLocation();
        if (codesWithLocation.length === 0) {
            return [23.6345, -102.5528] as [number, number]; // Centro de México
        }
        
        const avgLat = codesWithLocation.reduce((sum, code) => sum + code.location!.latitude, 0) / codesWithLocation.length;
        const avgLon = codesWithLocation.reduce((sum, code) => sum + code.location!.longitude, 0) / codesWithLocation.length;
        
        return [avgLat, avgLon] as [number, number];
    };

    // Función para filtrar códigos del mapa
    const getFilteredMapCodes = () => {
        const codesWithLocation = getScannedCodesWithLocation();
        
        if (!mapSearchQuery.trim()) {
            return codesWithLocation;
        }
        
        const query = mapSearchQuery.toLowerCase().trim();
        return codesWithLocation.filter(code => 
            code.code.toLowerCase().includes(query) ||
            code.code.slice(-6).toLowerCase().includes(query)
        );
    };

    // Función para obtener geolocalización
    const getCurrentLocation = (): Promise<{latitude: number, longitude: number, accuracy?: number}> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    console.error('Error obteniendo geolocalización:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    };

    const processCodeWithLocation = async (code: string, type: 'barcode' | 'qrcode', source: 'camera' | 'usb_scanner') => {
        const now = Date.now();
        if (
            lastCodeGlobal.code === code &&
            lastCodeGlobal.source === source &&
            now - lastCodeGlobal.time < 2000
        ) {
            return;
        }
        lastCodeGlobal = { code, source, time: now };
        
        // Obtener información del proyecto seleccionado
        const selectedProjectData = getSelectedProject();
        
        try {
            // Obtener ubicación
            const location = await getCurrentLocation();
            const newScannedCode: ScannedCode = {
                code,
                type,
                timestamp: new Date(),
                source,
                location,
                projectId: selectedProjectData?.id,
                projectName: selectedProjectData?.name
            };
            setLastScannedCode(newScannedCode);
            setScannedCodes(prev => [newScannedCode, ...prev.slice(0, 9)]);
            
            // Enviar al backend
            await sendScannedCodeToBackend(newScannedCode);
            
            // Mostrar notificación con información del proyecto
            let notificationMessage = `Código: ${code}\n📍 Ubicación: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
            if (selectedProjectData) {
                notificationMessage += `\n📋 Proyecto: ${selectedProjectData.name}`;
            }
            
            showCustomNotification(
                '✅ Código Detectado', 
                notificationMessage, 
                'green'
            );
        } catch (error) {
            console.error('Error obteniendo ubicación:', error);
            const newScannedCode: ScannedCode = {
                code,
                type,
                timestamp: new Date(),
                source,
                projectId: selectedProjectData?.id,
                projectName: selectedProjectData?.name
            };
            setLastScannedCode(newScannedCode);
            setScannedCodes(prev => [newScannedCode, ...prev.slice(0, 9)]);
            
            // Enviar al backend sin ubicación
            await sendScannedCodeToBackend(newScannedCode);
            
            // Mostrar notificación sin ubicación pero con proyecto
            let notificationMessage = `Código: ${code}\n⚠️ No se pudo obtener ubicación`;
            if (selectedProjectData) {
                notificationMessage += `\n📋 Proyecto: ${selectedProjectData.name}`;
            }
            
            showCustomNotification(
                '✅ Código Detectado', 
                notificationMessage, 
                'green'
            );
        }
    };

    // Función para enviar código escaneado al backend
    const sendScannedCodeToBackend = async (scannedCode: ScannedCode) => {
        try {
            const response = await fetch('/api/scanned-codes/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: scannedCode.code,
                    type: scannedCode.type,
                    source: scannedCode.source,
                    project_id: scannedCode.projectId,
                    latitude: scannedCode.location?.latitude,
                    longitude: scannedCode.location?.longitude,
                    timestamp: scannedCode.timestamp.toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Código escaneado guardado en backend:', result);
            
        } catch (error) {
            console.error('Error enviando código al backend:', error);
            // No mostrar error al usuario, solo log
        }
    };

    return (
        <Stack gap="lg" p="md">
            {/* Header */}
            <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <ActionIcon 
                            variant="subtle" 
                            color="gray" 
                            onClick={() => navigate(-1)}
                            size="lg"
                        >
                            <IconArrowLeft size={24} />
                        </ActionIcon>
                        <div>
                            <Text size="xl" fw={700} c="green.4">
                                Escáner de Códigos
                            </Text>
                            <Text size="sm" c="yellow.4">
                                Cámara + Escáner USB
                            </Text>
                        </div>
                    </Group>
                    <Group gap="xs">
                        <Badge 
                            color={isCameraActive ? 'green' : 'gray'} 
                            size="sm"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                if (isCameraActive) {
                                    stopCamera();
                                } else {
                                    if (isUsbScannerActive) {
                                        toggleUsbScanner(); // Desactivar USB primero
                                    }
                                    startCamera();
                                }
                            }}
                        >
                            Cámara
                        </Badge>
                        <Badge 
                            color={isUsbScannerActive ? 'blue' : 'gray'} 
                            size="sm"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                if (isUsbScannerActive) {
                                    toggleUsbScanner();
                                } else {
                                    if (isCameraActive) {
                                        stopCamera(); // Desactivar cámara primero
                                    }
                                    toggleUsbScanner();
                                }
                            }}
                        >
                            USB
                    </Badge>
                    </Group>
                </Group>
            </Paper>

            {/* Selección de Proyecto */}
            <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                <Stack gap="md">
                    <Group>
                        <IconBuilding size={20} color="#4CAF50" />
                        <Text fw={500} c="gray.2">Proyecto Asignado</Text>
                    </Group>
                    
                        <div>
                        <Text size="sm" fw={500} c="gray.3" mb="xs">
                            Selecciona el proyecto para los escaneos
                        </Text>
                        <Select
                            placeholder={isLoadingProjects ? "Cargando proyectos..." : "Seleccionar proyecto..."}
                            data={projects.map(project => ({
                                value: project.id.toString(),
                                label: `${project.name} - ${project.client}`
                            }))}
                            value={selectedProject}
                            onChange={setSelectedProject}
                            disabled={isLoadingProjects}
                            searchable
                            clearable
                            styles={{
                                input: { 
                                    backgroundColor: '#2D3748',
                                    border: '1px solid #4A5568',
                                    color: '#E2E8F0'
                                },
                                dropdown: { 
                                    backgroundColor: '#2D3748',
                                    border: '1px solid #4A5568'
                                }
                            }}
                            classNames={{
                                option: 'select-option'
                            }}
                        />
                        
                        {selectedProject && (
                            <Group mt="xs" gap="xs">
                                <Badge color="green" size="sm">
                                    Proyecto Seleccionado
                                </Badge>
                                <Text size="xs" c="gray.4">
                                    {getSelectedProjectName()}
                                </Text>
                    </Group>
                        )}
                    
                        {!selectedProject && (
                            <Alert color="orange" title="Sin Proyecto Seleccionado" mt="xs">
                            <Text size="sm">
                                    Los códigos escaneados no estarán asociados a ningún proyecto.
                            </Text>
                        </Alert>
                    )}
                    </div>
                </Stack>
            </Paper>

            {/* Área de la Cámara */}
            <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                <Stack gap="md">
                    <Group justify="space-between">
                        <Text fw={500} c="gray.2">Vista de Cámara</Text>
                        <Group gap="xs">
                            <ActionIcon 
                                variant="light" 
                                color="blue"
                                onClick={startCamera}
                                disabled={isCameraActive || isProcessing}
                                loading={isProcessing}
                            >
                                <IconCamera size={20} />
                            </ActionIcon>
                            <ActionIcon 
                                variant="light" 
                                color="green"
                                onClick={forceBackCamera}
                                disabled={isProcessing}
                                title="Forzar Cámara Trasera"
                            >
                                <IconRotate size={20} />
                            </ActionIcon>
                            <ActionIcon 
                                variant="light" 
                                color="orange"
                                onClick={stopCamera}
                                disabled={!isCameraActive}
                            >
                                <IconX size={20} />
                            </ActionIcon>
                            <ActionIcon 
                                variant="light" 
                                color="cyan"
                                onClick={restartScanner}
                                disabled={!isCameraActive}
                            >
                                <IconRefresh size={20} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    {cameraError ? (
                        <Alert color="red" title="Error de Cámara">
                            {cameraError}
                            <Button 
                                variant="light" 
                                color="blue" 
                                size="sm" 
                                mt="sm"
                                onClick={restartScanner}
                            >
                                Reintentar
                            </Button>
                        </Alert>
                    ) : !isCameraActive && !isUsbScannerActive ? (
                        <Center h={400}>
                            <Stack align="center" gap="md">
                                <IconQrcode size={80} color="#666" />
                                <Text c="dimmed">
                                    {isProcessing ? 'Iniciando cámara...' : 'Cámara no activa'}
                                </Text>
                                {isProcessing && <Loader />}
                            </Stack>
                        </Center>
                    ) : isUsbScannerActive ? (
                        <div 
                            style={{
                                width: '100%',
                                height: 400,
                                backgroundColor: '#666',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {usbScannedCode ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '20px'
                                }}>
                                    <Text 
                                        size="xl" 
                                        fw={700} 
                                        c="green.4" 
                                        style={{ 
                                            fontFamily: 'monospace',
                                            fontSize: '2rem',
                                            textShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
                                        }}
                                    >
                                        {usbScannedCode}
                                    </Text>
                                    <Text size="sm" c="gray.3" mt="md">
                                        Código escaneado por USB
                                    </Text>
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '20px'
                                }}>
                                    <IconQrcode size={80} color="#999" />
                                    <Text c="gray.4" size="lg" mt="md">
                                        Escáner USB Activo
                                    </Text>
                                    <Text c="gray.5" size="sm" mt="xs">
                                        Escanea un código de barras
                                    </Text>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div 
                            style={{
                                width: '100%',
                                height: 400,
                                backgroundColor: '#000',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            <video
                                ref={videoRef}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: 'scaleX(1)' // Fuerza a no espejar la imagen
                                }}
                                autoPlay
                                muted
                                playsInline
                            />
                            <canvas
                                ref={canvasRef}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0
                                }}
                            />
                            
                            {/* Overlay de escaneo - MÁS GRANDE */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '80%',
                                    height: '60%',
                                    border: '3px solid #00ff00',
                                    borderRadius: '12px',
                                    pointerEvents: 'none',
                                    boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)'
                                }}
                            />
                            
                            {/* Indicador de escaneo - MÁS GRANDE */}
                            {isScanning && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: 'calc(80% - 20px)',
                                        height: 'calc(60% - 20px)',
                                        border: '3px solid #00ff00',
                                        borderRadius: '12px',
                                        animation: 'scanning 2s infinite'
                                    }}
                                />
                            )}
                            
                            {/* Texto de ayuda */}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                    color: '#fff',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    pointerEvents: 'none'
                                }}
                            >
                                Coloca el código en cualquier lugar de la pantalla
                            </div>
                            
                            <style>
                                {`
                                    @keyframes scanning {
                                        0% { 
                                            border-color: #00ff00;
                                            box-shadow: 0 0 20px #00ff00;
                                        }
                                        50% { 
                                            border-color: #ffff00;
                                            box-shadow: 0 0 30px #ffff00;
                                        }
                                        100% { 
                                            border-color: #00ff00;
                                            box-shadow: 0 0 20px #00ff00;
                                        }
                                    }
                                `}
                            </style>
                        </div>
                    )}
                </Stack>
            </Paper>

            {/* Último Código Escaneado */}
            {lastScannedCode && (
                <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Text fw={500} c="gray.2">Último Código Detectado</Text>
                            <Group gap="xs">
                            <Badge color={lastScannedCode.type === 'qrcode' ? 'blue' : 'green'}>
                                {lastScannedCode.type === 'qrcode' ? 'QR Code' : 'Código de Barras'}
                            </Badge>
                                <Badge color={lastScannedCode.source === 'camera' ? 'green' : 'blue'}>
                                    {lastScannedCode.source === 'camera' ? 'Cámara' : 'USB'}
                                </Badge>
                            </Group>
                        </Group>
                        
                        <Card p="md" bg="dark.6" radius="sm">
                            <Stack gap="xs">
                                <Text size="lg" fw={700} c="cyan.4" style={{ fontFamily: 'monospace' }}>
                                    {lastScannedCode.code}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    Escaneado: {lastScannedCode.timestamp.toLocaleTimeString()}
                                </Text>
                                {lastScannedCode.projectName && (
                                    <Stack gap={4}>
                                        <Text size="xs" c="blue.4" fw={500}>
                                            📋 Proyecto:
                                        </Text>
                                        <Text size="xs" c="gray.3">
                                            {lastScannedCode.projectName}
                                        </Text>
                                    </Stack>
                                )}
                                
                                {lastScannedCode.location && (
                                    <Stack gap={4}>
                                        <Text size="xs" c="green.4" fw={500}>
                                            📍 Ubicación GPS:
                                        </Text>
                                        <Text size="xs" c="gray.3" style={{ fontFamily: 'monospace' }}>
                                            Lat: {lastScannedCode.location.latitude.toFixed(6)}
                                        </Text>
                                        <Text size="xs" c="gray.3" style={{ fontFamily: 'monospace' }}>
                                            Lon: {lastScannedCode.location.longitude.toFixed(6)}
                                        </Text>
                                    </Stack>
                                )}
                            </Stack>
                        </Card>
                    </Stack>
                </Paper>
            )}

            {/* Historial de Códigos */}
            {scannedCodes.length > 0 && (
                <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Text fw={500} c="gray.2">Historial de Códigos</Text>
                            <Group gap="xs">
                                <Button 
                                    variant="light" 
                                    color="blue" 
                                    size="xs"
                                    leftSection={<IconCheck size={14} />}
                                    onClick={() => setIsListModalOpen(true)}
                                >
                                    Ver Lista Completa
                                </Button>
                                <Button 
                                    variant="light" 
                                    color="green" 
                                    size="xs"
                                    leftSection={<IconCamera size={14} />}
                                    onClick={() => setIsMapModalOpen(true)}
                                >
                                    Ver Mapa
                                </Button>
                                <ActionIcon 
                                    variant="light" 
                                    color="red"
                                    onClick={clearScannedCodes}
                                >
                                    <IconRefresh size={16} />
                                </ActionIcon>
                            </Group>
                        </Group>
                        
                        <Stack gap="xs">
                            {scannedCodes.map((code, index) => (
                                <Card key={index} p="xs" bg="dark.6" radius="sm">
                                    <Group justify="space-between">
                                        <Stack gap={4}>
                                            <Text size="sm" fw={500} c="gray.2" style={{ fontFamily: 'monospace' }}>
                                                {code.code}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {code.timestamp.toLocaleTimeString()}
                                            </Text>
                                            {code.projectName && (
                                                <Group gap="xs">
                                                    <Text size="sm" c="blue.4" fw={500}>
                                                        📋 Proyecto:
                                                    </Text>
                                                    <Text size="sm" c="gray.3">
                                                        {code.projectName}
                                                    </Text>
                                                </Group>
                                            )}
                                            {code.location ? (
                                                <Group gap="xs">
                                                    <Text size="sm" c="green.4" fw={500}>
                                                        📍 Ubicación:
                                                    </Text>
                                                    <Button
                                                        variant="subtle"
                                                        color="blue"
                                                        size="xs"
                                                        leftSection={<IconMapPin size={14} />}
                                                        onClick={() => openLocationInMaps(code.location!.latitude, code.location!.longitude)}
                                                    >
                                                        {code.location.latitude.toFixed(6)}, {code.location.longitude.toFixed(6)}
                                                    </Button>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="blue"
                                                        size="sm"
                                                        onClick={() => openLocationInMaps(code.location!.latitude, code.location!.longitude)}
                                                        title="Abrir en mapas"
                                                    >
                                                        <IconExternalLink size={14} />
                                                    </ActionIcon>
                                                </Group>
                                            ) : (
                                                <Text size="sm" c="red.4">
                                                    ⚠️ Sin ubicación GPS
                                                </Text>
                                            )}

                                            {/* Botón Enviar Registro */}
                                            <Group justify="flex-end">
                                                <Button
                                                    variant="light"
                                                    color="orange"
                                                    size="xs"
                                                    leftSection={<IconSend size={14} />}
                                                    onClick={() => sendIndividualRecord(code)}
                                                >
                                                    Enviar Registro
                                                </Button>
                                            </Group>
                                        </Stack>
                                        <Group gap="xs">
                                            <Badge size="sm" color={code.type === 'qrcode' ? 'blue' : 'green'}>
                                                {code.type === 'qrcode' ? 'QR' : 'BAR'}
                                            </Badge>
                                            <Badge size="sm" color={code.source === 'camera' ? 'green' : 'blue'}>
                                                {code.source === 'camera' ? 'CAM' : 'USB'}
                                            </Badge>
                                            <ActionIcon 
                                                variant="subtle" 
                                                color="blue"
                                                size="sm"
                                                onClick={() => copyToClipboard(code.code)}
                                            >
                                                <IconCheck size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    </Stack>
                </Paper>
            )}

            {/* Notificaciones Personalizadas - SIEMPRE EN LA PARTE SUPERIOR */}
            {customNotifications.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        maxWidth: '400px'
                    }}
                >
                    {customNotifications.map((notification) => (
                        <Paper
                            key={notification.id}
                            p="md"
                            radius="md"
                            style={{
                                backgroundColor: '#2d3748',
                                border: `2px solid ${notification.color === 'green' ? '#48bb78' : '#4299e1'}`,
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                animation: 'slideIn 0.3s ease-out'
                            }}
                        >
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text fw={600} c={notification.color === 'green' ? 'green.4' : 'blue.4'}>
                                        {notification.title}
                                    </Text>
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        size="sm"
                                        onClick={() => setCustomNotifications(prev => 
                                            prev.filter(n => n.id !== notification.id)
                                        )}
                                    >
                                        <IconX size={14} />
                                    </ActionIcon>
                                </Group>
                                <Text size="sm" c="gray.3">
                                    {notification.message}
                                </Text>
                            </Stack>
                        </Paper>
                    ))}
                </div>
            )}

            <style>
                {`
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    .select-option[data-selected] {
                        background-color: #4CAF50 !important;
                        color: #fff !important;
                    }
                    
                    .select-option[data-hovered] {
                        background-color: #4A5568 !important;
                    }
                `}
            </style>

            {/* Modal de Lista Completa */}
            <Modal
                opened={isListModalOpen}
                onClose={() => {
                    setIsListModalOpen(false);
                    setSearchQuery('');
                }}
                title={
                    <Group>
                        <IconCheck size={20} />
                        <Text fw={600}>Lista Completa de Escaneos - {new Date().toLocaleDateString()}</Text>
                    </Group>
                }
                size="lg"
                styles={{
                    title: { color: '#fff' },
                    header: { backgroundColor: '#1A1B1E' },
                    body: { backgroundColor: '#1A1B1E' }
                }}
            >
                <Stack gap="md">
                    {/* Barra de búsqueda */}
                    <TextInput
                        placeholder="Buscar por código completo o últimos 6 caracteres..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.currentTarget.value)}
                        leftSection={<IconSearch size={16} />}
                        styles={{
                            input: { backgroundColor: '#2D3748' },
                            section: { color: '#A0AEC0' }
                        }}
                    />

                    {/* Botón Descargar Excel */}
                    <Button
                        variant="light"
                        color="green"
                        leftSection={<IconDownload size={16} />}
                        onClick={downloadExcel}
                        fullWidth
                    >
                        Descargar Excel
                    </Button>

                    {/* Estadísticas */}
                    <Group justify="space-between">
                        <Text size="sm" c="gray.3">
                            Total de escaneos del día: {getTodayScannedCodes().length}
                        </Text>
                        <Text size="sm" c="gray.3">
                            Mostrando: {getFilteredScannedCodes().length}
                        </Text>
                    </Group>

                    {/* Lista de códigos */}
                    <ScrollArea h={400}>
                        <Stack gap="xs">
                            {getFilteredScannedCodes().length > 0 ? (
                                getFilteredScannedCodes().map((code, index) => (
                                    <Card key={index} p="md" bg="dark.6" radius="sm">
                                        <Stack gap="xs">
                                            <Group justify="space-between">
                                                <Text size="lg" fw={700} c="cyan.4" style={{ fontFamily: 'monospace' }}>
                                                    {code.code}
                                                </Text>
                                                <Group gap="xs">
                                                    <Badge size="sm" color={code.type === 'qrcode' ? 'blue' : 'green'}>
                                                        {code.type === 'qrcode' ? 'QR' : 'BAR'}
                                                    </Badge>
                                                    <Badge size="sm" color={code.source === 'camera' ? 'green' : 'blue'}>
                                                        {code.source === 'camera' ? 'CAM' : 'USB'}
                                                    </Badge>
                                                </Group>
                                            </Group>
                                            
                                            <Text size="sm" c="dimmed">
                                                Escaneado: {code.timestamp.toLocaleString()}
                                            </Text>
                                            
                                            {code.projectName && (
                                                <Group gap="xs">
                                                    <Text size="sm" c="blue.4" fw={500}>
                                                        📋 Proyecto:
                                                    </Text>
                                                    <Text size="sm" c="gray.3">
                                                        {code.projectName}
                                                    </Text>
                                                </Group>
                                            )}
                                            
                                            {code.location ? (
                                                <Group gap="xs">
                                                    <Text size="sm" c="green.4" fw={500}>
                                                        📍 Ubicación:
                                                    </Text>
                                                    <Button
                                                        variant="subtle"
                                                        color="blue"
                                                        size="xs"
                                                        leftSection={<IconMapPin size={14} />}
                                                        onClick={() => openLocationInMaps(code.location!.latitude, code.location!.longitude)}
                                                    >
                                                        {code.location.latitude.toFixed(6)}, {code.location.longitude.toFixed(6)}
                                                    </Button>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="blue"
                                                        size="sm"
                                                        onClick={() => openLocationInMaps(code.location!.latitude, code.location!.longitude)}
                                                        title="Abrir en mapas"
                                                    >
                                                        <IconExternalLink size={14} />
                                                    </ActionIcon>
                                                </Group>
                                            ) : (
                                                <Text size="sm" c="red.4">
                                                    ⚠️ Sin ubicación GPS
                                                </Text>
                                            )}

                                            {/* Botón Enviar Registro */}
                                            <Group justify="flex-end">
                                                <Button
                                                    variant="light"
                                                    color="orange"
                                                    size="xs"
                                                    leftSection={<IconSend size={14} />}
                                                    onClick={() => sendIndividualRecord(code)}
                                                >
                                                    Enviar Registro
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </Card>
                                ))
                            ) : (
                                <Center h={200}>
                                    <Stack align="center" gap="md">
                                        <IconQrcode size={60} color="#666" />
                                        <Text c="dimmed" ta="center">
                                            {searchQuery ? 'No se encontraron códigos con esa búsqueda' : 'No hay escaneos registrados hoy'}
                                        </Text>
                                    </Stack>
                                </Center>
                            )}
                        </Stack>
                    </ScrollArea>

                    {/* Botones de acción */}
                    <Group justify="flex-end">
                        <Button
                            variant="light"
                            color="gray"
                            onClick={() => {
                                setIsListModalOpen(false);
                                setSearchQuery('');
                            }}
                        >
                            Cerrar
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal del Mapa */}
            <Modal
                opened={isMapModalOpen}
                onClose={() => {
                    setIsMapModalOpen(false);
                    setMapSearchQuery('');
                }}
                title={
                    <Group>
                        <IconMapPin size={20} />
                        <Text fw={600}>Mapa de Escaneos - {new Date().toLocaleDateString()}</Text>
                    </Group>
                }
                size="xl"
                fullScreen
                styles={{
                    title: { color: '#fff' },
                    header: { backgroundColor: '#1A1B1E' },
                    body: { backgroundColor: '#1A1B1E', padding: 0 }
                }}
            >
                <div style={{ height: 'calc(100vh - 120px)', width: '100%' }}>
                    {getScannedCodesWithLocation().length === 0 ? (
                        <Center style={{ height: '100%' }}>
                            <Stack align="center" gap="md">
                                <IconMapPin size={80} color="#666" />
                                <Text c="dimmed" ta="center" size="lg">
                                    No hay escaneos con ubicación GPS
                                </Text>
                                <Text c="dimmed" ta="center" size="sm">
                                    Los escaneos aparecerán aquí cuando tengan coordenadas GPS
                                </Text>
                            </Stack>
                        </Center>
                    ) : (
                        <>
                            {/* Barra de búsqueda y estadísticas */}
                            <div style={{ 
                                position: 'absolute', 
                                top: '20px', 
                                left: '20px', 
                                right: '20px', 
                                zIndex: 1000,
                                backgroundColor: 'rgba(26, 27, 30, 0.9)',
                                padding: '16px',
                                borderRadius: '8px',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <Stack gap="md">
                                    <TextInput
                                        placeholder="Buscar por código completo o últimos 6 caracteres..."
                                        value={mapSearchQuery}
                                        onChange={(event) => setMapSearchQuery(event.currentTarget.value)}
                                        leftSection={<IconSearch size={16} />}
                                        styles={{
                                            input: { backgroundColor: '#2D3748' },
                                            section: { color: '#A0AEC0' }
                                        }}
                                    />
                                    
                                    <Group justify="space-between">
                                        <Text size="sm" c="gray.3">
                                            Total con ubicación: {getScannedCodesWithLocation().length}
                                        </Text>
                                        <Text size="sm" c="gray.3">
                                            Mostrando: {getFilteredMapCodes().length}
                                        </Text>
                                    </Group>
                                </Stack>
                            </div>

                            <MapContainer
                                center={getMapCenter()}
                                zoom={10}
                                style={{ height: '100%', width: '100%', background: '#1A1B1E' }}
                                zoomControl={true}
                            >
                                <TileLayer
                                    attribution=''
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                />

                                {getFilteredMapCodes().map((code, index) => {
                                    const markerColor = code.type === 'qrcode' ? '#3B82F6' : '#10B981';
                                    
                                    return (
                                        <CircleMarker
                                            key={index}
                                            center={[code.location!.latitude, code.location!.longitude]}
                                            radius={8}
                                            pathOptions={{
                                                fillColor: markerColor,
                                                fillOpacity: 0.7,
                                                color: markerColor,
                                                weight: 2,
                                                opacity: 1
                                            }}
                                        >
                                            <Popup>
                                                <div style={{ minWidth: 250 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '1.1em', marginBottom: 8, color: '#333' }}>
                                                        Código: {code.code}
                                                    </div>
                                                    <div style={{ marginBottom: 4 }}>
                                                        <span style={{ color: markerColor, fontWeight: 500 }}>
                                                            {code.type === 'qrcode' ? 'QR Code' : 'Código de Barras'}
                                                        </span>
                                                        <span style={{ marginLeft: 8, color: '#555', fontSize: '0.95em' }}>
                                                            {code.source === 'camera' ? 'Cámara' : 'USB'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.95em', color: '#555', marginBottom: 8 }}>
                                                        Escaneado: {code.timestamp.toLocaleString()}
                                                    </div>
                                                    {code.projectName && (
                                                        <div style={{ fontSize: '0.95em', color: '#555', marginBottom: 8 }}>
                                                            📋 Proyecto: <span style={{ color: '#222', fontWeight: 500 }}>
                                                                {code.projectName}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '0.95em', color: '#555' }}>
                                                        📍 Coordenadas:<br />
                                                        <span style={{ color: '#222', fontWeight: 500, fontFamily: 'monospace' }}>
                                                            {code.location!.latitude.toFixed(6)}, {code.location!.longitude.toFixed(6)}
                                                        </span>
                                                    </div>
                                                    {code.location!.accuracy && (
                                                        <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>
                                                            Precisión: ±{Math.round(code.location!.accuracy)}m
                                                        </div>
                                                    )}
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    );
                                })}
                            </MapContainer>
                        </>
                    )}
                </div>
            </Modal>
        </Stack>
    );
} 