import { useState, useEffect } from 'react';
import { 
    Paper, Button, Text, Group, Stack, Badge, Grid, Card, 
    RingProgress, ThemeIcon, SimpleGrid, Modal, Collapse,
    Select, Alert, Divider, Textarea, TextInput, Loader, Center, Tooltip, Image, Box
} from '@mantine/core';
import { 
    IconUserCheck, IconClock, IconCalendarTime, 
    IconBriefcase, IconTools, IconDoorEnter, 
    IconClockHour4, IconFiles, IconClipboardList, 
    IconUserCircle, IconHeadset, IconChevronDown, IconChevronUp,
    IconAlertCircle, IconArrowLeft, IconArrowRight, IconFileTypePdf, IconFileTypeDoc, IconFileTypeXls, IconDownload, IconPlus, IconSend, IconQrcode,
    IconX, IconAlertTriangle, IconUser
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { attendanceService } from '../services/attendance';
import { useAuth } from '../context/AuthContext';
import { projectService, panasonicCheckpointService, panasonicQualityService, getCurrentLocation, generateSessionId } from '../services/api';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { modals } from '@mantine/modals';
import { DateInput } from '@mantine/dates';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../context/LocationContext';
import { Project } from '../types/project';
import type { TimeEntry } from '../services/attendance';
import { ProjectDetailsModal } from '../components/ProjectDetailsModal';
import { getToken } from '../services/auth';

interface TimeTracking {
    hoursWorked: number;
    checkInTime: string | null;
    checkOutTime: string | null;
    isActive: boolean;
}

type GroupedEntry = TimeEntry & { duration: number; parts_completed: number };

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'REEMPLAZA_CON_TU_VAPID_PUBLIC_KEY';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function TechnicianDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [checkInModalOpen, setCheckInModalOpen] = useState(false);
    const { user, logout, effectiveUser, isSimulating, setUser, setAuthenticated } = useAuth();
    const [menuExpanded, setMenuExpanded] = useState(false);
    const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [activeProject, setActiveProject] = useState<{
        id: number;
        name: string;
        location: string;
        checkInTime: string;
    } | null>(() => {
        const saved = localStorage.getItem('activeProject');
        return saved ? JSON.parse(saved) : null;
    });
    const [hoursReportModalOpen, setHoursReportModalOpen] = useState(false);
    const [selectedProjectDetails, setSelectedProjectDetails] = useState<number | null>(null);
    const [projectsModalOpen, setProjectsModalOpen] = useState(false);
    const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
    const [supportModalOpen, setSupportModalOpen] = useState(false);
    
    // Estados para el formulario de soporte técnico
    const [supportForm, setSupportForm] = useState({
        type: '',
        partNumberVin: '',
        project: '',
        location: '',
        description: ''
    });
    
    const { updateLocation, removeLocation } = useLocations();
    // Clave única para cada usuario
    const timeTrackingKey = `timeTracking_${effectiveUser?.email || 'anon'}`;
    const [timeTracking, setTimeTracking] = useState<TimeTracking>(() => {
        const saved = localStorage.getItem(timeTrackingKey);
        return saved ? JSON.parse(saved) : {
            hoursWorked: 0,
            checkInTime: null,
            checkOutTime: null,
            isActive: false
        };
    });
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [isLoadingEntries, setIsLoadingEntries] = useState(false);
    const [isDayClosed, setIsDayClosed] = useState(false);
    const [isReportSubmitted, setIsReportSubmitted] = useState(() => {
        const today = new Date().toISOString().split('T')[0];
        return localStorage.getItem(`reportSubmitted_${today}`) === 'true';
    });
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [imageModal, setImageModal] = useState<{ src: string; title: string } | null>(null);
    const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
    const [reportNotes, setReportNotes] = useState('');
    const [parteFallidaModalOpen, setParteFallidaModalOpen] = useState(false);
    const [codigoParteFallida, setCodigoParteFallida] = useState('');
    const [problemaModalOpen, setProblemaModalOpen] = useState(false);
    const [descripcionProblema, setDescripcionProblema] = useState('');
    
    // Estados para la funcionalidad de cámara
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    
    // Estados para el modal de project mode
    const [projectModeOpen, setProjectModeOpen] = useState(false);
    const [projectModeMinimized, setProjectModeMinimized] = useState(false);
    const [projectModeData, setProjectModeData] = useState<{
        projectName: string;
        checkInTime: string;
        partsCompleted: number;
        modalStartTime?: Date; // Tiempo cuando se abrió el modal
    } | null>(null);

    // Estados para el modal interno de soporte técnico dentro de project mode
    const [internalSupportModalOpen, setInternalSupportModalOpen] = useState(false);
    const [internalSupportForm, setInternalSupportForm] = useState({
        type: '',
        partNumberVin: '',
        project: '',
        location: '',
        description: ''
    });
    const [allProjects, setAllProjects] = useState<Project[]>([]);

    // Estados para el tiempo por caja
    const [boxStartTime, setBoxStartTime] = useState<Date | null>(null);
    const [boxTimes, setBoxTimes] = useState<number[]>([]); // Array de tiempos de cajas completadas en segundos
    const [currentBoxTime, setCurrentBoxTime] = useState('00:00:00');
    const [averageBoxTime, setAverageBoxTime] = useState<string | null>(null);
    const [averageBoxTimeSeconds, setAverageBoxTimeSeconds] = useState<number | null>(null); // Promedio en segundos para BD
    const [firstBoxTime, setFirstBoxTime] = useState<string | null>(null); // Tiempo de la primera caja terminada
    const [colonBlink, setColonBlink] = useState(true); // Estado para el parpadeo de los dos puntos
    const [question2ModalOpen, setQuestion2ModalOpen] = useState(false); // Modal para pregunta 2
    const [question3ModalOpen, setQuestion3ModalOpen] = useState(false); // Modal para pregunta 3
    const [question4ModalOpen, setQuestion4ModalOpen] = useState(false); // Modal para pregunta 4
    const [question5ModalOpen, setQuestion5ModalOpen] = useState(false); // Modal para pregunta 5
    const [question8ModalOpen, setQuestion8ModalOpen] = useState(false); // Modal para pregunta 8
    const [question9ModalOpen, setQuestion9ModalOpen] = useState(false); // Modal para pregunta 9
    const [question12ModalOpen, setQuestion12ModalOpen] = useState(false); // Modal para pregunta 12
    const [question15ModalOpen, setQuestion15ModalOpen] = useState(false); // Modal para pregunta 15
    const [question16ModalOpen, setQuestion16ModalOpen] = useState(false); // Modal para pregunta 16
    const [question17ModalOpen, setQuestion17ModalOpen] = useState(false); // Modal para pregunta 17
    const [question18ModalOpen, setQuestion18ModalOpen] = useState(false); // Modal para pregunta 18
    const [question19ModalOpen, setQuestion19ModalOpen] = useState(false); // Modal para pregunta 19
    const [question20ModalOpen, setQuestion20ModalOpen] = useState(false); // Modal para pregunta 20
    const [question21ModalOpen, setQuestion21ModalOpen] = useState(false); // Modal para pregunta 21

    // Estados para el proceso de calidad
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [qualityAnswers, setQualityAnswers] = useState<{[key: number]: string}>({});
    const [scannedCode, setScannedCode] = useState('');
    const [scannedCode1, setScannedCode1] = useState('');
    const [scannedCode2, setScannedCode2] = useState('');
    const [scannedCode15, setScannedCode15] = useState('');
    const [scannedCode17_1, setScannedCode17_1] = useState('');
    const [scannedCode17_2, setScannedCode17_2] = useState('');
    const [question14Answered, setQuestion14Answered] = useState(false);
    const [question14Answer, setQuestion14Answer] = useState('');
    const [boxCompleted, setBoxCompleted] = useState(false);
    const [sessionId, setSessionId] = useState(() => generateSessionId());
    const [partsCompleted, setPartsCompleted] = useState(0);
    
    // Estados para el escaneo por categorías (pregunta 14)
    const [categoryScanningOpen, setCategoryScanningOpen] = useState(false);
    const [batteryCategoryAssignments, setBatteryCategoryAssignments] = useState<{
        battery1: string | null;
        battery2: string | null;
    }>({
        battery1: null,
        battery2: null
    });

    // Preguntas del proceso de calidad
    const qualityQuestions = [
        // Categorización (1-14)
        { number: 1, text: "Inspect the packaging box for visible damage, Inspecciona la caja de empaque para daños visibles. ¿La caja tiene algún daño visible?", category: "categorización" },
        { number: 2, text: "Scan the serial number of the packaging box, Escanea el código de barras de la caja. ¿Escaneaste el código de barras de la caja?", category: "categorización" },
        { number: 3, text: "Remove bands, Remueve las bandas. ¿Ya removiste las bandas?", category: "categorización" },
        { number: 4, text: "Remove top tray, Remueve la tapa superior. ¿Ya removieron la tapa superior?", category: "categorización", requiresMultipleOperators: true },
        { number: 5, text: "Remove side walls, Remueve las paredes laterales. ¿Ya removieron las paredes laterales?", category: "categorización", requiresMultipleOperators: true },
        { number: 6, text: "Inspect side walls to see if there is any damage due to the contact with coolant ports, connectors and rear bracket. Inspecciona las paredes laterales para ver si hay daño por contacto con puertos de refrigerante. ¿Las paredes internas tienen daño visible?", category: "categorización" },
        { number: 7, text: "Inspect the following items - the deformation of the layer - BOB tilted or come off - Plastic sheet shifted etc, Inspecciona los siguientes elementos - deformación de la capa - BOB inclinado o desprendido - Hoja de plástico desplazada etc. ¿Después de la inspección, notas daños, deformaciones, etcétera?", category: "categorización" },
        { number: 8, text: "Remove top layer, Remueve la primera capa protectora. ¿Ya removieron la primera capa protectora?", category: "categorización", requiresMultipleOperators: true },
        { number: 9, text: "Scan each serial number of 2 batteries of the 1st layer, Escanea el código de número de serie de cada batería (2) de la primera capa. ¿Escaneaste el código de número de serie de cada batería (2)?", category: "categorización" },
        { number: 10, text: "Inspect plastic sheets to see if there is any damage on them, Inspecciona las hojas de plástico para ver si hay daño en ellas. ¿Las hojas de plástico tienen daño visible?", category: "categorización" },
        { number: 11, text: "Inspect the top covers to see if there is any damage on them, Inspecciona las tapas superiores para ver si hay daño en ellas. ¿Las tapas superiores tienen daño visible?", category: "categorización" },
        { number: 12, text: "Move batteries from the packaging box to a table, Mueve las baterías de la caja de empaque a una mesa. ¿Ya movieron las baterías de la caja a la mesa?", category: "categorización", requiresMultipleOperators: true },
        { number: 13, text: "Inspect the top of the 2nd layer to see if there is any damage on the layer, Inspecciona la parte superior de la segunda capa para ver si hay daño en la capa. ¿La cubierta de la segunda capa tiene daño visible?", category: "categorización" },
        { number: 14, text: "Inspect the top of the 2nd layer to see if there is any damage on the layer, Inspecciona la parte superior de la segunda capa para ver si hay daño en la capa. ¿La parte superior de la segunda capa tiene daño visible?", category: "categorización", special: true },
        
        // Reempacado (15-21)
        { number: 15, text: "Scan the serial number of the packaging box, Escanea el código de barras de la caja. ¿Escaneaste el código de barras de la caja?", category: "reempacado" },
        { number: 16, text: "Return the batteries to their correct category box. Regresen las baterías a la caja de su categoría correspondiente (A,B,C,D,E). ¿Ya ordenaron las baterías en la caja correcta?", category: "reempacado" },
        { number: 17, text: "Scan each serial number of 2 batteries of the 1st layer, Escanea el número de serie de cada batería (2) de la primera capa. ¿Escaneaste el número de serie de cada batería (2)?", category: "reempacado" },
        { number: 18, text: "Remove side walls, Remueve las paredes laterales. ¿Ya removieron las paredes laterales?", category: "reempacado", requiresMultipleOperators: true },
        { number: 19, text: "Remove top tray, Remueve la tapa superior. ¿Ya removiste la tapa superior?", category: "reempacado", requiresMultipleOperators: true },
        { number: 20, text: "Remove bands, Remueve las bandas. ¿Ya removiste las bandas?", category: "reempacado" },
        { number: 21, text: "Category labels are attached on the packaging box, Coloca las etiquetas de categoría B en la caja de empaque. ¿Ya colocaste las etiquetas?", category: "reempacado" }
    ];
    const [modalElapsedTime, setModalElapsedTime] = useState('00:00:00');

    // Función para formatear tiempo en HH:MM:SS
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Función para formatear tiempo con parpadeo de los dos puntos
    const formatTimeWithBlinkingColon = (timeString: string): JSX.Element => {
        const [hours, minutes, seconds] = timeString.split(':');
        const colon = colonBlink ? ':' : ' ';
        
        return (
            <>
                {hours}
                <span style={{ opacity: colonBlink ? 1 : 0.3 }}>{colon}</span>
                {minutes}
                <span style={{ opacity: colonBlink ? 1 : 0.3 }}>{colon}</span>
                {seconds}
            </>
        );
    };

    // Función para calcular el promedio de tiempo por caja
    const calculateAverageBoxTime = (times: number[]): string => {
        if (times.length === 0) return '00:00:00';
        const totalSeconds = times.reduce((sum, time) => sum + time, 0);
        const averageSeconds = Math.round(totalSeconds / times.length);
        return formatTime(averageSeconds);
    };

    // Función para iniciar una nueva caja
    const startNewBox = () => {
        setBoxStartTime(new Date());
        setCurrentBoxTime('00:00:00');
        setBoxCompleted(false);
    };

    // Función para completar una caja
    const completeBox = () => {
        if (boxStartTime) {
            const endTime = new Date();
            const boxDuration = Math.floor((endTime.getTime() - boxStartTime.getTime()) / 1000);
            const boxTimeString = formatTime(boxDuration);
            
            const newTimes = [...boxTimes, boxDuration];
            setBoxTimes(newTimes);
            setBoxStartTime(null);
            setBoxCompleted(true);
            
            // Si es la primera caja, guardar su tiempo
            if (boxTimes.length === 0) {
                setFirstBoxTime(boxTimeString);
            }
            
            // Calcular nuevo promedio solo si hay más de una caja
            if (newTimes.length >= 2) {
                const newAverage = calculateAverageBoxTime(newTimes);
                setAverageBoxTime(newAverage);
                
                // Guardar el promedio en el estado para enviarlo a la BD
                const averageSeconds = Math.round(newTimes.reduce((sum, time) => sum + time, 0) / newTimes.length);
                setAverageBoxTimeSeconds(averageSeconds);
            } else {
                // Para la primera caja, usar su tiempo individual
                setAverageBoxTimeSeconds(boxDuration);
            }
        }
    };

    // Función para obtener las imágenes de una pregunta específica
    const getQuestionImages = (questionNumber: number): string[] => {
        const imageMap: { [key: number]: string[] } = {
            1: ['1.png', '1.1.png'],
            2: ['2.png', '2.1.png'],
            3: ['3.png'],
            4: ['4.png'], // Imagen para pregunta 4
            5: ['5.png'],
            6: ['6.png'],
            7: ['7.png', '7.1.png', '7.2.png'],
            8: ['8.png'],
            9: ['9.png', '9.1.png'],
            10: ['10.png', '10.1.png'],
            11: ['11.png'],
            12: ['12.png', '12.1.png'],
            13: ['13.png'],
            14: [], // No hay imagen para pregunta 14 (especial)
            15: ['15.png', '15.1.png'],
            16: ['16.png', '16.1.png'],
            17: ['17.png', '17.1.png'],
            18: ['18.png'],
            19: ['19.png'],
            20: ['20.png'],
            21: ['21.png'] // Etiqueta verde de categoría
        };
        
        return imageMap[questionNumber] || [];
    };

    // useEffect para actualizar el tiempo actual de la caja
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (boxStartTime && !boxCompleted) {
            interval = setInterval(() => {
                const now = new Date();
                const elapsed = Math.floor((now.getTime() - boxStartTime.getTime()) / 1000);
                setCurrentBoxTime(formatTime(elapsed));
            }, 1000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [boxStartTime, boxCompleted]);

    // useEffect para el parpadeo de los dos puntos
    useEffect(() => {
        const interval = setInterval(() => {
            setColonBlink(prev => !prev);
        }, 1000);
        
        return () => clearInterval(interval);
    }, []);

    // Función para obtener coordenadas GPS
    const getCurrentLocation = (): Promise<{latitude: number, longitude: number}> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.warn('Geolocation is not supported by this browser');
                notifications.show({
                    title: 'Ubicación no disponible',
                    message: 'El navegador no soporta geolocalización. Las coordenadas se guardarán como 0.',
                    color: 'orange',
                    autoClose: 5000
                });
                resolve({ latitude: 0, longitude: 0 });
                return;
            }

            // Mostrar notificación de solicitud de ubicación
            notifications.show({
                title: 'Solicitando ubicación',
                message: 'Se está solicitando acceso a la ubicación para registrar las coordenadas GPS.',
                color: 'blue',
                autoClose: 3000
            });

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    notifications.show({
                        title: 'Ubicación obtenida',
                        message: `Coordenadas GPS capturadas: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
                        color: 'green',
                        autoClose: 3000
                    });
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn('Error getting location:', error);
                    let errorMessage = 'No se pudo obtener la ubicación.';
                    if (error.code === error.PERMISSION_DENIED) {
                        errorMessage = 'Permisos de ubicación denegados. Las coordenadas se guardarán como 0.';
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        errorMessage = 'Ubicación no disponible. Las coordenadas se guardarán como 0.';
                    } else if (error.code === error.TIMEOUT) {
                        errorMessage = 'Tiempo de espera agotado. Las coordenadas se guardarán como 0.';
                    }
                    
                    notifications.show({
                        title: 'Error de ubicación',
                        message: errorMessage,
                        color: 'orange',
                        autoClose: 5000
                    });
                    resolve({ latitude: 0, longitude: 0 });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutos
                }
            );
        });
    };

    // Función para obtener todos los proyectos
    const fetchAllProjects = async () => {
        try {
            const projects = await projectService.getProjects();
            setAllProjects(projects);
        } catch (error) {
            console.error('Error al obtener proyectos:', error);
        }
    };

    // Función para manejar el envío del formulario interno de soporte técnico
    const handleInternalSupportSubmit = async () => {
        try {
            if (!effectiveUser?.id) {
                notifications.show({
                    title: 'Error',
                    message: 'Usuario no autenticado',
                    color: 'red'
                });
                return;
            }

            const issueData = {
                type: internalSupportForm.type,
                part_number_vin: internalSupportForm.partNumberVin,
                project: internalSupportForm.project || activeProject?.name || 'Proyecto no especificado',
                location: internalSupportForm.location || activeProject?.location || 'Ubicación no especificada',
                date_reported: new Date().toISOString().split('T')[0],
                status: 'pendiente',
                created_by: user?.id || 0,
                description: internalSupportForm.description
            };

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/issues/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify(issueData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al crear el issue');
            }

            const createdIssue = await response.json();
            console.log('Issue interno creado exitosamente:', createdIssue);

            notifications.show({
                title: 'Reporte Enviado',
                message: 'Tu reporte de soporte técnico ha sido enviado exitosamente',
                color: 'green',
                autoClose: 3000
            });

            // Limpiar el formulario y cerrar el modal
            setInternalSupportForm({
                type: '',
                partNumberVin: '',
                project: '',
                location: '',
                description: ''
            });
            setInternalSupportModalOpen(false);

        } catch (error) {
            console.error('Error al enviar el reporte interno:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo enviar el reporte. Inténtalo de nuevo.',
                color: 'red',
                autoClose: 5000
            });
        }
    };

    // Función para manejar el envío del formulario de soporte técnico
    const handleSupportSubmit = async () => {
        try {
            if (!effectiveUser?.id) {
                notifications.show({
                    title: 'Error',
                    message: 'Usuario no autenticado',
                    color: 'red'
                });
                return;
            }

            const issueData = {
                type: supportForm.type,
                part_number_vin: supportForm.partNumberVin,
                project: supportForm.project,
                location: supportForm.location,
                date_reported: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
                status: 'pendiente', // Valor por defecto según la tabla
                created_by: user?.id || 0,
                description: supportForm.description
            };

            // Llamada real a la API para crear el issue
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/issues/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify(issueData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al crear el issue');
            }

            const createdIssue = await response.json();
            console.log('Issue creado exitosamente:', createdIssue);

            notifications.show({
                title: 'Reporte Enviado',
                message: 'Tu reporte ha sido enviado al equipo de soporte',
                color: 'green'
            });

            // Limpiar el formulario y cerrar el modal
            setSupportForm({
                type: '',
                partNumberVin: '',
                project: '',
                location: '',
                description: ''
            });
            setSupportModalOpen(false);

        } catch (error) {
            console.error('Error al enviar el reporte:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo enviar el reporte. Inténtalo de nuevo.',
                color: 'red'
            });
        }
    };

    // Función para guardar checkpoints en la nueva tabla
    const savePanasonicCheckpoint = async (checkpointData: {
        checkpointType: string;
        checkpointNumber: number;
        scannedCode: string;
        scanOrder?: number;
        categorie?: string;
        phase: string;
    }) => {
        try {
            if (!activeProject?.id) {
                throw new Error('No hay proyecto activo seleccionado');
            }

            // Obtener coordenadas GPS actuales
            const location = await getCurrentLocation();
            
            const checkpointPayload = {
                session_id: sessionId,
                checkpoint_type: checkpointData.checkpointType,
                checkpoint_number: checkpointData.checkpointNumber,
                scanned_code: checkpointData.scannedCode,
                scan_order: checkpointData.scanOrder,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: 0, // Valor por defecto
                project_id: activeProject.id,
                status: 'ok',
                categorie: checkpointData.categorie,
                phase: checkpointData.phase
            };

            await panasonicCheckpointService.createCheckpoint(checkpointPayload);
            
            console.log('Panasonic checkpoint saved successfully:', checkpointPayload);
        } catch (error) {
            console.error('Error saving panasonic checkpoint:', error);
            // No lanzar error para no interrumpir el flujo principal
        }
    };

    // Función para guardar respuesta de calidad
    const saveQualityAnswer = async (questionNumber: number, answer: string) => {
        try {
            // Caso especial para pregunta 2 - mostrar modal si presiona "No"
            if (questionNumber === 2 && answer === 'no') {
                setQuestion2ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 3 - mostrar modal si presiona "No"
            if (questionNumber === 3 && answer === 'no') {
                setQuestion3ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 4 - mostrar modal si presiona "No"
            if (questionNumber === 4 && answer === 'no') {
                setQuestion4ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 5 - mostrar modal si presiona "No"
            if (questionNumber === 5 && answer === 'no') {
                setQuestion5ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 8 - mostrar modal si presiona "No"
            if (questionNumber === 8 && answer === 'no') {
                setQuestion8ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 9 - mostrar modal si presiona "No"
            if (questionNumber === 9 && answer === 'no') {
                setQuestion9ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 12 - mostrar modal si presiona "No"
            if (questionNumber === 12 && answer === 'no') {
                setQuestion12ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 15 - mostrar modal si presiona "No"
            if (questionNumber === 15 && answer === 'no') {
                setQuestion15ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 16 - mostrar modal si presiona "No"
            if (questionNumber === 16 && answer === 'no') {
                setQuestion16ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 17 - mostrar modal si presiona "No"
            if (questionNumber === 17 && answer === 'no') {
                setQuestion17ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 18 - mostrar modal si presiona "No"
            if (questionNumber === 18 && answer === 'no') {
                setQuestion18ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 19 - mostrar modal si presiona "No"
            if (questionNumber === 19 && answer === 'no') {
                setQuestion19ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 20 - mostrar modal si presiona "No"
            if (questionNumber === 20 && answer === 'no') {
                setQuestion20ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Caso especial para pregunta 21 - mostrar modal si presiona "No"
            if (questionNumber === 21 && answer === 'no') {
                setQuestion21ModalOpen(true);
                return; // No continuar con el procesamiento
            }
            
            // Validar que tenemos un proyecto activo
            if (!activeProject?.id) {
                throw new Error('No hay proyecto activo seleccionado');
            }
            
            // Validar que la pregunta existe
            if (!qualityQuestions[questionNumber - 1]) {
                throw new Error(`Pregunta ${questionNumber} no encontrada`);
            }
            
            // Determinar la fase basada en el número de pregunta
            const phase = questionNumber <= 14 ? 'categorizacion' : 'reempacado';
            
            // Crear el payload para la nueva tabla
            const qualityPayload: any = {
                session_id: sessionId,
                project_id: activeProject.id,
                phase: phase,
                // Incluir avg_box_time solo para pregunta 21 (cuando se completa la caja)
                avg_box_time: questionNumber === 21 ? averageBoxTimeSeconds : null
            };

            // Mapear la respuesta a la columna correspondiente
            const respuestaKey = `respuesta${questionNumber}`;
            qualityPayload[respuestaKey] = answer.startsWith('si:') ? 'Sí' : answer;

            // Si la respuesta incluye escaneo, guardarlo en la columna correspondiente
            if (answer.startsWith('si:')) {
                const scannedCode = answer.split(':')[1];
                
                if (questionNumber === 2) {
                    qualityPayload.escaneo2 = scannedCode;
                    // Guardar checkpoint de caja inicial
                    await savePanasonicCheckpoint({
                        checkpointType: 'box_initial',
                        checkpointNumber: 1,
                        scannedCode: scannedCode,
                        scanOrder: 1,
                        categorie: batteryCategoryAssignments.battery1 || 'A',
                        phase: 'categorizacion'
                    });
                } else if (questionNumber === 9) {
                    qualityPayload.escaneo9 = scannedCode;
                    // Guardar checkpoint de baterías primera capa
                    const batteryCodes = scannedCode.split(',');
                    for (let i = 0; i < batteryCodes.length; i++) {
                        await savePanasonicCheckpoint({
                            checkpointType: 'battery_layer1',
                            checkpointNumber: 2,
                            scannedCode: batteryCodes[i],
                            scanOrder: i + 1,
                            categorie: batteryCategoryAssignments.battery1 || 'A',
                            phase: 'categorizacion'
                        });
                    }
                } else if (questionNumber === 15) {
                    qualityPayload.escaneo15 = scannedCode;
                    // Guardar checkpoint de caja B
                    await savePanasonicCheckpoint({
                        checkpointType: 'box_category_b',
                        checkpointNumber: 3,
                        scannedCode: scannedCode,
                        scanOrder: 1,
                        categorie: batteryCategoryAssignments.battery1 || 'A',
                        phase: 'reempacado'
                    });
                } else if (questionNumber === 17) {
                    qualityPayload.escaneo17 = scannedCode;
                    // Guardar checkpoint de baterías reempacado
                    const batteryCodes = scannedCode.split(',');
                    for (let i = 0; i < batteryCodes.length; i++) {
                        await savePanasonicCheckpoint({
                            checkpointType: 'battery_repack',
                            checkpointNumber: 4,
                            scannedCode: batteryCodes[i],
                            scanOrder: i + 1,
                            categorie: batteryCategoryAssignments.battery1 || 'A',
                            phase: 'reempacado'
                        });
                    }
                }
            }

            // Enviar datos a la nueva API
            await panasonicQualityService.createQualityCheck(qualityPayload);

            // Actualizar estado local
            setQualityAnswers(prev => ({
                ...prev,
                [questionNumber]: answer
            }));

            // Avanzar a la siguiente pregunta (excepto para pregunta 14 que es especial)
            if (questionNumber === 14) {
                // La pregunta 14 no avanza automáticamente, solo se deshabilita
                return;
            }
            
            if (currentQuestionIndex < qualityQuestions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                // Proceso completado - pregunta 21
                completeBox(); // Completar la caja actual y calcular promedio
                
                // Incrementar contador de partes completadas (2 baterías por caja)
                const newPartsCount = partsCompleted + 2;
                setPartsCompleted(newPartsCount);
                
                // Actualizar el estado del modal de project mode
                setProjectModeData(prev => prev ? {
                    ...prev,
                    partsCompleted: newPartsCount
                } : null);
                
                // Actualizar partes completadas en la base de datos en tiempo real
                if (activeProject) {
                    try {
                        await projectService.updateProjectParts(activeProject.id, newPartsCount);
                        console.log(`✅ Partes actualizadas en BD: ${newPartsCount}`);
                    } catch (error) {
                        console.error('❌ Error al actualizar partes en BD:', error);
                        notifications.show({
                            title: 'Error',
                            message: 'No se pudo actualizar el progreso del proyecto',
                            color: 'red'
                        });
                    }
                }
                
                notifications.show({
                    title: '¡Caja completada!',
                    message: 'Todas las preguntas han sido respondidas. Iniciando nueva caja...',
                    color: 'green',
                    icon: <IconUserCheck />
                });
                
                // Regresar a la pregunta 1 después de 2 segundos
                setTimeout(() => {
                    setCurrentQuestionIndex(0);
                    setQualityAnswers({});
                    setScannedCode('');
                    setScannedCode1('');
                    setScannedCode2('');
                    setScannedCode15('');
                    setScannedCode17_1('');
                    setScannedCode17_2('');
                    setQuestion14Answered(false);
                    setQuestion14Answer('');
                    setBoxCompleted(false);
                    setSessionId(generateSessionId());
                    startNewBox(); // Iniciar nueva caja
                }, 2000);
            }

        } catch (error) {
            console.error('Error saving quality answer:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo guardar la respuesta',
                color: 'red',
                icon: <IconAlertCircle />
            });
        }
    };

    // Función para manejar la pregunta especial 14 (escaneo por categorías)
    const handleSpecialQuestion14 = () => {
        setCategoryScanningOpen(true);
        setScannedCode1('');
        setScannedCode2('');
        setBatteryCategoryAssignments({
            battery1: null,
            battery2: null
        });
    };

    // Función para seleccionar categoría de una batería
    const selectBatteryCategory = (battery: 'battery1' | 'battery2', category: string) => {
        setBatteryCategoryAssignments(prev => ({
            ...prev,
            [battery]: prev[battery] === category ? null : category
        }));
    };

    // Función para completar el escaneo de categorías
    const completeCategoryScanning = async () => {
        try {
            // Validar que ambas baterías tengan categoría asignada
            if (!batteryCategoryAssignments.battery1 || !batteryCategoryAssignments.battery2) {
                notifications.show({
                    title: 'Categorías faltantes',
                    message: 'Debes asignar una categoría a ambas baterías',
                    color: 'red'
                });
                return;
            }

            // Validar y asignar categorías a los códigos de baterías
            await validateAndAssignCategories();
            
            // Cerrar el modal de escaneo
            setCategoryScanningOpen(false);
            
            // Avanzar a la pregunta 15
            setCurrentQuestionIndex(prev => prev + 1);
            
            notifications.show({
                title: 'Escaneo completado',
                message: 'Categorías asignadas correctamente a las baterías',
                color: 'green',
                icon: <IconUserCheck />
            });
        } catch (error) {
            console.error('Error completing category scanning:', error);
            notifications.show({
                title: 'Error de validación',
                message: error instanceof Error ? error.message : 'Error al asignar categorías',
                color: 'red'
            });
        }
    };

    // Función para validar y asignar categorías a los códigos de baterías
    const validateAndAssignCategories = async () => {
        try {
            // Obtener los códigos de baterías del modal (que se llenan por escaneo o copy/paste)
            const batteryCode1 = scannedCode1;
            const batteryCode2 = scannedCode2;
            
            if (!batteryCode1 || !batteryCode2) {
                throw new Error('Debes ingresar códigos de baterías en ambos campos');
            }

            // Usar las categorías asignadas directamente (mantener mayúsculas)
            const category1 = batteryCategoryAssignments.battery1;
            const category2 = batteryCategoryAssignments.battery2;

            if (!category1 || !category2) {
                throw new Error('Debes asignar una categoría a ambas baterías');
            }

            // Actualizar el registro existente en panasonic_quality_questions
            await updateQualityCheckWithCategories(batteryCode1, category1, batteryCode2, category2);

        } catch (error) {
            console.error('Error validating battery categories:', error);
            throw error;
        }
    };

    // Función para actualizar las categorías de las baterías en panasonic_quality_questions
    const updateQualityCheckWithCategories = async (batteryCode1: string, category1: string, batteryCode2: string, category2: string) => {
        try {
            if (!activeProject?.id) {
                throw new Error('No hay proyecto activo seleccionado');
            }

            // Crear el payload para actualizar el registro existente
            const qualityPayload = {
                session_id: sessionId,
                project_id: activeProject.id,
                phase: 'categorizacion',
                battery1_code: batteryCode1,
                battery1_category: category1,
                battery2_code: batteryCode2,
                battery2_category: category2
            };

            // Enviar datos a la API para actualizar el registro existente
            await panasonicQualityService.createQualityCheck(qualityPayload);

            console.log('Battery categories updated in panasonic_quality_questions:', {
                battery1_code: batteryCode1,
                battery1_category: category1,
                battery2_code: batteryCode2,
                battery2_category: category2
            });

        } catch (error) {
            console.error('Error updating battery categories:', error);
            throw error;
        }
    };

    // Encontrar el proyecto seleccionado para el modal de detalles
    const projectForDetails = selectedProjectDetails 
        ? assignedProjects.find(p => p.id === selectedProjectDetails) || null 
        : null;

    // Definición global para el modal y resumen
    const groupedEntries: GroupedEntry[] = Object.values(
        timeEntries.reduce((acc: Record<number, GroupedEntry>, entry) => {
            const key = entry.project_id;
            if (!acc[key]) {
                acc[key] = {
                    ...entry,
                    duration: 0,
                    parts_completed: 0
                };
            }
            acc[key].duration += entry.duration;
            acc[key].parts_completed += entry.parts_completed || 0;
            return acc;
        }, {} as Record<number, GroupedEntry>)
    );

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);


    // useEffect para actualizar el tiempo en project mode
    useEffect(() => {
        if ((projectModeOpen || projectModeMinimized) && projectModeData?.modalStartTime) {
            const timer = setInterval(() => {
                const now = new Date();
                const startTime = projectModeData.modalStartTime!;
                const diffMs = now.getTime() - startTime.getTime();
                
                if (diffMs >= 0) {
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
                    
                    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    setModalElapsedTime(timeString);
                }
            }, 1000);

            return () => clearInterval(timer);
        } else {
            setModalElapsedTime('00:00:00');
        }
    }, [projectModeOpen, projectModeMinimized, projectModeData?.modalStartTime]);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Primero recalcular el progreso
                await projectService.recalculateProgress();
                
                // Luego obtener los proyectos actualizados
                const projects = await projectService.getProjects();
                const activeProjects = projects.filter(project => project.status === 'activo');
                setAssignedProjects(activeProjects);
            } catch (error) {
                console.error('Error al obtener proyectos:', error);
                notifications.show({
                    title: 'Error',
                    message: 'No se pudieron cargar los proyectos',
                    color: 'red'
                });
            }
        };

        if (effectiveUser?.email) {
            fetchProjects();
            fetchAllProjects();
        }
    }, [effectiveUser]);

    useEffect(() => {
        localStorage.setItem(timeTrackingKey, JSON.stringify(timeTracking));
    }, [timeTracking, timeTrackingKey]);

    useEffect(() => {
        if (!timeTracking.isActive || !timeTracking.checkInTime) return;

        const timer = setInterval(() => {
            const start = new Date(timeTracking.checkInTime!).getTime();
            const now = new Date().getTime();
            const hoursElapsed = (now - start) / (1000 * 60 * 60);
            
            setTimeTracking(prev => ({
                ...prev,
                hoursWorked: hoursElapsed
            }));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeTracking.isActive, timeTracking.checkInTime]);

    useEffect(() => {
        const loadCurrentStatus = async () => {
            try {
                const status = await attendanceService.getCurrentStatus();
                console.log('Estado actual:', status);
                setIsCheckedIn(status.is_checked_in);
                if (status.is_checked_in) {
                    // Actualizar el time tracking
                    const timeTrackingData = {
                        hoursWorked: 0,
                        checkInTime: status.check_in_time,
                        checkOutTime: null,
                        isActive: true
                    };
                    setTimeTracking(timeTrackingData);
                    localStorage.setItem(timeTrackingKey, JSON.stringify(timeTrackingData));
                }
            } catch (error) {
                console.error('Error al cargar estado actual:', error);
            }
        };
        loadCurrentStatus();
    }, [timeTrackingKey]);

    const handleCheckIn = async (status: 'presente' | 'ausente' | 'tarde') => {
        if (!selectedProjectId) {
            notifications.show({
                title: 'Error',
                message: 'Por favor selecciona un proyecto',
                color: 'red'
            });
            return;
        }

        if (!capturedPhoto) {
            notifications.show({
                title: 'Error',
                message: 'Por favor toma una foto antes de registrar la entrada',
                color: 'red'
            });
            return;
        }

        setLoading(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const response = await attendanceService.checkIn({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                status: status,
                projectId: selectedProjectId,
                photo: capturedPhoto // Incluir la foto capturada
            });

            const project = assignedProjects.find(p => p.id === selectedProjectId);

            if (project) {
                setActiveProject({
                    id: project.id,
                    name: project.name,
                    location: project.location?.plant_address || "Sin dirección",
                    checkInTime: new Date().toLocaleTimeString()
                });

                // Verificar si es el proyecto específico "KM HEV Packaging" para abrir project mode
                if (project.name === "KM HEV Packaging") {
                    // Resetear las preguntas de calidad al abrir el modal
                    console.log('🔄 Reseteando preguntas de calidad para nueva sesión');
                    setCurrentQuestionIndex(0);
                    setQualityAnswers({});
                    setScannedCode('');
                    setScannedCode1('');
                    setScannedCode2('');
                    setScannedCode15('');
                    setScannedCode17_1('');
                    setScannedCode17_2('');
                    setQuestion14Answered(false);
                    setQuestion14Answer('');
                    setBoxCompleted(false);
                    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    setSessionId(newSessionId);
                    console.log('🆕 Nueva sesión ID:', newSessionId);
                    
                    setProjectModeData({
                        projectName: project.name,
                        checkInTime: new Date().toLocaleTimeString(),
                        partsCompleted: 0,
                        modalStartTime: new Date() // Tiempo cuando se abre el modal
                    });
                    setPartsCompleted(0); // Resetear contador de partes completadas
                    
                    // Resetear tiempos de caja
                    setBoxTimes([]);
                    setAverageBoxTime(null);
                    setAverageBoxTimeSeconds(null);
                    setBoxStartTime(null);
                    setCurrentBoxTime('00:00:00');
                    setFirstBoxTime(null);
                    
                    setProjectModeOpen(true);
                    
                    // Iniciar la primera caja
                    startNewBox();
                }
            }

            updateLocation({
                id: Date.now(),
                name: effectiveUser?.full_name || 'Usuario',
                coordinates: [position.coords.latitude, position.coords.longitude],
                status: status === 'tarde' ? 'ausente' : status,
                city: 'Ciudad Actual',
                checkInTime: new Date().toLocaleTimeString()
            });

            notifications.show({
                title: 'Check-in registrado',
                message: `Hora de entrada: ${new Date().toLocaleTimeString()}`,
                color: 'green',
                icon: <IconUserCheck />,
                className: 'animate-bounce'
            });

            setTimeTracking(prev => ({
                ...prev,
                checkInTime: new Date().toLocaleTimeString(),
                isActive: true,
                hoursWorked: 0
            }));

            setIsCheckedIn(true);

        } catch (error) {
            console.error('Error en check-in:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo registrar el check-in',
                color: 'red'
            });
        } finally {
            setLoading(false);
            setSelectedProjectId(null);
        }
    };

    const handleCheckOut = async () => {
        if (!capturedPhoto) {
            notifications.show({
                title: 'Error',
                message: 'Por favor toma una foto antes de registrar la salida',
                color: 'red'
            });
            return;
        }

        setLoading(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const response = await attendanceService.checkOut({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                projectId: activeProject?.id || 0,
                photo: capturedPhoto // Incluir la foto capturada
            });

            removeLocation(activeProject?.id || 0);
            setIsCheckedIn(false);
            setActiveProject(null);
            localStorage.removeItem('activeProject');
            
            // Cerrar definitivamente el project mode
            setProjectModeOpen(false);
            setProjectModeMinimized(false);
            setProjectModeData(null);

            notifications.show({
                title: 'Check-out registrado',
                message: `Tiempo total: ${response.duration ? response.duration.toFixed(2) : '0.00'} horas`,
                color: 'blue',
                icon: <IconClock />,
                className: 'animate-bounce'
            });

            const newTimeTracking = {
                hoursWorked: response.duration || 0,
                checkInTime: timeTracking.checkInTime,
                checkOutTime: new Date().toLocaleTimeString(),
                isActive: false
            };
            
            setTimeTracking(newTimeTracking);
            localStorage.setItem(timeTrackingKey, JSON.stringify(newTimeTracking));

        } catch (error) {
            console.error('Error en check-out:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo registrar el check-out',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        horasTrabajadas: 156,
        proyectosActivos: 3,
        incidentes: 0,
        proximoServicio: 'Mañana 9:00 AM',
        ubicacionServicio: 'APTIV Planta 3',
        estadoActual: isCheckedIn ? 'presente' : 'ausente'
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        logout();
        navigate('/login');
    };

    const loadTimeEntries = async () => {
        setIsLoadingEntries(true);
        try {
            console.log('Iniciando carga de entradas de tiempo...');
            const entries = await attendanceService.getDailyTimeEntries();
            console.log('Entradas recibidas:', entries);
            
            if (entries.length === 0 && timeTracking.isActive && activeProject) {
                console.log('Creando entrada temporal desde check-in activo');
                const tempEntry = {
                    project_id: activeProject.id,
                    project_name: activeProject.name,
                    project_location: activeProject.location,
                    start_time: new Date().toISOString(),
                    end_time: null,
                    duration: timeTracking.hoursWorked || 0,
                    parts_completed: 0
                };
                setTimeEntries([tempEntry]);
            } else {
            setTimeEntries(entries);
                if (entries.length === 0) {
                    notifications.show({
                        title: 'Sin registros',
                        message: 'No hay registros de tiempo para el día de hoy',
                        color: 'yellow'
                    });
                }
            }
        } catch (error: any) {
            console.error('Error detallado al cargar entradas:', {
                error,
                message: error?.message || 'Error desconocido',
                stack: error?.stack || ''
            });
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los registros de tiempo',
                color: 'red'
            });
        } finally {
            setIsLoadingEntries(false);
        }
    };

    useEffect(() => {
        if (hoursReportModalOpen) {
            loadTimeEntries();
            checkDayStatus();
        }
    }, [hoursReportModalOpen]);

    // Función para verificar si el día está cerrado
    const checkDayStatus = async () => {
        try {
            const response = await attendanceService.getDayStatus();
            setIsDayClosed(response.is_closed);
            console.log('Estado del día:', response.is_closed);
        } catch (error) {
            console.error('Error al verificar estado del día:', error);
        }
    };

    useEffect(() => {
        checkDayStatus();

        // Escuchar evento de cierre de día
        const handleDayClosed = () => {
            setIsDayClosed(true);
            console.log('Día cerrado por evento');
        };

        window.addEventListener('day-closed', handleDayClosed);

        return () => {
            window.removeEventListener('day-closed', handleDayClosed);
        };
    }, []);

    const handleSubmitReport = async () => {
        if (isDayClosed) {
            notifications.show({
                title: 'Error',
                message: 'No se pueden enviar reportes cuando el día está cerrado',
                color: 'red'
            });
            return;
        }

        // Validar que las notas tengan al menos 100 palabras
        const wordCount = reportNotes.trim().split(/\s+/).length;
        if (wordCount < 100) {
            notifications.show({
                title: 'Error',
                message: `Debes escribir al menos 100 palabras en las notas. Actualmente tienes ${wordCount} palabras.`,
                color: 'red'
            });
            return;
        }

        try {
            console.log('Time entries a reportar:', timeEntries);
            // Dentro de handleSubmitReport, reemplaza la agrupación local por:
            const groupedEntriesToReport: GroupedEntry[] = Object.values(
                timeEntries.reduce((acc: Record<number, GroupedEntry>, entry) => {
                    const key = entry.project_id;
                    if (!acc[key]) {
                        acc[key] = {
                            ...entry,
                            duration: 0,
                            parts_completed: 0
                        };
                    }
                    acc[key].duration += entry.duration;
                    acc[key].parts_completed += entry.parts_completed || 0;
                    return acc;
                }, {} as Record<number, GroupedEntry>)
            );
            for (const entry of groupedEntriesToReport) {
                const reportData = {
                    projectId: entry.project_id,
                    description: `Trabajo en ${entry.project_name}`,
                    hours: entry.duration,
                    partsCompleted: entry.parts_completed,
                    notes: reportNotes.trim()
                };
                console.log('Enviando reporte:', reportData);
                await attendanceService.submitReport(reportData);
            }
            // Marcar el reporte como enviado
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem(`reportSubmitted_${today}`, 'true');
            setIsReportSubmitted(true);

            notifications.show({
                title: 'Éxito',
                message: 'Reporte enviado correctamente',
                color: 'green'
            });

            setHoursReportModalOpen(false);
            setReportNotes(''); // Limpiar las notas después de enviar
        } catch (error) {
            console.error('Error al enviar reporte:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo enviar el reporte',
                color: 'red'
            });
        }
    };

    // Resetear el estado de envío de reporte cada día
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const checkDate = () => {
            const savedDate = localStorage.getItem('lastReportDate');
            if (savedDate !== today) {
                localStorage.removeItem(`reportSubmitted_${savedDate}`);
                setIsReportSubmitted(false);
                localStorage.setItem('lastReportDate', today);
            }
        };

        checkDate();
        const interval = setInterval(checkDate, 60000); // Verificar cada minuto

        return () => clearInterval(interval);
    }, []);

    const handleReturnToDeveloper = () => {
        try {
            // Recuperar credenciales del developer
            const developerToken = localStorage.getItem('developer_token');
            const developerUser = localStorage.getItem('developer_user');

            if (developerToken && developerUser) {
                // Restaurar las credenciales del developer
                localStorage.setItem('token', developerToken);
                localStorage.setItem('user', developerUser);
                
                // Limpiar las credenciales guardadas
                localStorage.removeItem('developer_token');
                localStorage.removeItem('developer_user');

                notifications.show({
                    title: 'Retorno Exitoso',
                    message: 'Volviendo al dashboard de developer',
                    color: 'green'
                });

                // Redirigir al dashboard de developer
                window.location.href = '/developer';
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo volver al modo developer',
                color: 'red'
            });
        }
    };

    // Funciones para manejar la cámara
    const startCamera = async () => {
        try {
            setCameraError(null);
            
            // Intentar obtener todas las cámaras disponibles
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Buscar cámara frontal específicamente
            const frontCamera = videoDevices.find(device => 
                device.label.toLowerCase().includes('front') || 
                device.label.toLowerCase().includes('frontal') ||
                device.label.toLowerCase().includes('user')
            );
            
            const constraints: MediaStreamConstraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user' // Cámara frontal
                }
            };
            
            // Si encontramos una cámara frontal específica, usarla
            if (frontCamera) {
                constraints.video = {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                    deviceId: { exact: frontCamera.deviceId }
                };
            }
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            setIsCameraActive(true);
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            setCameraError('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
            setIsCameraActive(false);
        }
        // Clear any captured photo when stopping camera
        setCapturedPhoto(null);
    };

    const capturePhoto = () => {
        if (!cameraStream) return;
        
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        video.srcObject = cameraStream;
        video.play().catch(error => {
            // Handle play errors gracefully
            if (error.name !== 'AbortError') {
                console.warn('Video play error in capturePhoto:', error);
            }
        });
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const photoData = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedPhoto(photoData);
            }
        };
    };

    const retakePhoto = () => {
        setCapturedPhoto(null);
    };

    // Agregar un useEffect para cargar los proyectos cuando se abre el modal
    useEffect(() => {
        const loadAssignedProjects = async () => {
            if (checkInModalOpen && !isCheckedIn) {
                try {
                    const projects = await projectService.getProjects();
                    setAssignedProjects(projects);
                    
                    // Si solo hay un proyecto, seleccionarlo automáticamente
                    if (projects.length === 1) {
                        setSelectedProjectId(projects[0].id);
                    }
                } catch (error) {
                    console.error('Error al cargar proyectos:', error);
                    notifications.show({
                        title: 'Error',
                        message: 'No se pudieron cargar los proyectos',
                        color: 'red'
                    });
                }
            }
        };

        loadAssignedProjects();
    }, [checkInModalOpen, isCheckedIn]);

    // useEffect para manejar la cámara cuando se abre el modal
    useEffect(() => {
        if (checkInModalOpen) {
            // Iniciar cámara cuando se abre el modal (tanto para entrada como salida)
            startCamera();
            
            // Limpiar cámara cuando se cierra el modal
            return () => {
                stopCamera();
                setCapturedPhoto(null);
            };
        } else {
            // Ensure camera is stopped when modal is closed
            stopCamera();
        }
    }, [checkInModalOpen]);

    // Cleanup camera on component unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Agregar la función handleTechnicianClick
    const handleTechnicianClick = (technicianName: string) => {
        notifications.show({
            title: 'Información de Técnico',
            message: `Mostrando información de ${technicianName}`,
            color: 'blue'
        });
    };

    // La suscripción a notificaciones push ahora se maneja en AuthContext
    // para todos los usuarios, no solo técnicos

    return (
        <Stack gap="lg" p="md">

            <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Group align="center" gap="xs">
                            <Badge color="blue" size="lg">Técnico</Badge>
                            <Text size="xl" fw={700} c="green.4">
                                {effectiveUser?.full_name}
                            </Text>
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#40C057',
                                    animation: 'pulse 1.5s infinite',
                                }}
                            />
                            <style>
                                {`
                                    @keyframes pulse {
                                        0% { opacity: 1; }
                                        50% { opacity: 0.4; }
                                        100% { opacity: 1; }
                                    }
                                `}
                            </style>
                        </Group>
                        <Text size="sm" c="yellow.4">
                            {new Date().toLocaleDateString('es-MX', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </Text>
                    </div>
                    <Group gap="md">
                        {/* Badge y botón para sesión temporal */}
                        {localStorage.getItem('admin_token') && (
                            <>
                                <Badge 
                                    color="orange" 
                                    variant="light" 
                                    size="sm"
                                    leftSection={<IconUser size={12} />}
                                >
                                    Sesión Temporal
                                </Badge>
                                <Button 
                                    color="orange" 
                                    variant="light"
                                    size="sm"
                                onClick={() => {
                                    // Restaurar credenciales del admin
                                    const adminToken = localStorage.getItem('admin_token');
                                    const adminUser = localStorage.getItem('admin_user');
                                    
                                    if (adminToken && adminUser) {
                                        // Hacer logout de la sesión temporal primero
                                        logout();
                                        
                                        // Restaurar credenciales del admin
                                        localStorage.setItem('token', adminToken);
                                        localStorage.setItem('user', adminUser);
                                        localStorage.removeItem('admin_token');
                                        localStorage.removeItem('admin_user');
                                        
                                        // Actualizar el contexto con las credenciales del admin
                                        setUser(JSON.parse(adminUser));
                                        setAuthenticated(true);
                                    }
                                    
                                    navigate('/dashboard');
                                }}
                                >
                                    Volver a Admin
                                </Button>
                            </>
                        )}
                    </Group>
                    <Stack align="flex-end" gap="xs">
                        <Text 
                            ta="right" 
                            size="xl"
                            fw={700} 
                            c="yellow.4"
                            style={{ letterSpacing: '0.05em' }}
                        >
                            {currentTime.toLocaleTimeString('es-MX', { 
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                            })}
                        </Text>
                        <Group gap="xs">
                            <Badge 
                                size="lg" 
                                color={stats.estadoActual === 'presente' ? 'green' : 'red'}
                            >
                                {stats.estadoActual.toUpperCase()}
                            </Badge>
                            <Button
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => {
                                    modals.openConfirmModal({
                                        title: 'Cerrar Sesión',
                                        centered: true,
                                        children: (
                                            <Text size="sm">
                                                ¿Estás seguro de que deseas cerrar sesión?
                                            </Text>
                                        ),
                                        labels: { confirm: 'Cerrar Sesión', cancel: 'Cancelar' },
                                        confirmProps: { color: 'red' },
                                        onConfirm: handleLogout
                                    });
                                }}
                            >
                                Cerrar Sesión
                            </Button>
                        </Group>
                    </Stack>
                </Group>
            </Paper>

            <Group justify="center">
                <Button
                    variant="subtle"
                    color="gray"
                    onClick={() => setMenuExpanded(!menuExpanded)}
                    rightSection={menuExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                >
                    {menuExpanded ? 'Ocultar Herramientas' : 'Mostrar Herramientas'}
                </Button>
            </Group>

            <Collapse in={menuExpanded}>
                <SimpleGrid 
                    cols={{ base: 2, sm: 3, md: 4 }}
                    spacing={{ base: 'xs', sm: 'md' }}
                >
                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ 
                            backgroundColor: '#1A1B1E', 
                            cursor: 'pointer',
                            borderColor: '#2C2E33'
                        }}
                        onClick={() => setCheckInModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="blue">
                                <IconDoorEnter size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Check In/Out
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ 
                            backgroundColor: '#1A1B1E', 
                            cursor: 'pointer',
                            borderColor: '#2C2E33'
                        }}
                        onClick={() => setHoursReportModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="teal">
                                <IconClockHour4 size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Horas
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ 
                            backgroundColor: '#1A1B1E', 
                            cursor: 'pointer',
                            borderColor: '#2C2E33'
                        }}
                        onClick={() => setProjectsModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="violet">
                                <IconBriefcase size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Proyectos
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ 
                            backgroundColor: '#1A1B1E', 
                            cursor: 'pointer',
                            borderColor: '#2C2E33'
                        }}
                        onClick={() => setDocumentsModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="yellow">
                                <IconFiles size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Documentos
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ 
                            backgroundColor: '#1A1B1E', 
                            cursor: 'pointer',
                            borderColor: '#2C2E33'
                        }}
                        onClick={() => setSupportModalOpen(true)}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="orange">
                                <IconHeadset size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Soporte
                            </Text>
                        </Stack>
                    </Card>

                    <Card 
                        p="md" 
                        radius="md" 
                        style={{ 
                            backgroundColor: '#1A1B1E', 
                            cursor: 'pointer',
                            borderColor: '#2C2E33'
                        }}
                        onClick={() => navigate('/scanner')}
                    >
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={50} radius="md" variant="light" color="cyan">
                                <IconQrcode size={30} />
                            </ThemeIcon>
                            <Text ta="center" fw={500} size="sm" c="gray.2">
                                Escáner
                            </Text>
                        </Stack>
                    </Card>
                </SimpleGrid>
            </Collapse>

            <Modal 
                opened={checkInModalOpen} 
                onClose={() => {
                    setCheckInModalOpen(false);
                    stopCamera();
                    setCapturedPhoto(null);
                }}
                title={isCheckedIn ? "Registro de Salida" : "Registro de Entrada"}
                size="lg"
            >
                <Stack gap="md">
                    {!isCheckedIn && (
                        <>
                            {/* Sección de Cámara */}
                            <Paper p="md" bg="dark.6" radius="sm">
                                <Text fw={500} c="gray.2" mb="md">Captura de Foto</Text>
                                
                                {cameraError ? (
                                    <Alert color="red" title="Error de Cámara">
                                        {cameraError}
                                    </Alert>
                                ) : !isCameraActive ? (
                                    <Center h={200}>
                                        <Loader />
                                    </Center>
                                ) : capturedPhoto ? (
                                    <Stack gap="md">
                                        <Image 
                                            src={capturedPhoto} 
                                            alt="Foto capturada"
                                            radius="sm"
                                            style={{ maxHeight: 300 }}
                                        />
                                        <Group justify="center">
                                            <Button 
                                                variant="light" 
                                                color="blue"
                                                onClick={retakePhoto}
                                                leftSection={<IconClock size={16} />}
                                            >
                                                Tomar Otra Foto
                                            </Button>
                                        </Group>
                                    </Stack>
                                ) : (
                                    <Stack gap="md">
                                        <div 
                                            style={{
                                                width: '100%',
                                                height: 300,
                                                backgroundColor: '#000',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}
                                        >
                                            <video
                                                ref={(video) => {
                                                    if (video && cameraStream) {
                                                        video.srcObject = cameraStream;
                                                        // Add error handling for play() to prevent AbortError
                                                        video.play().catch(error => {
                                                            // Ignore AbortError as it's expected when video is interrupted
                                                            if (error.name !== 'AbortError') {
                                                                console.warn('Video play error:', error);
                                                            }
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                                autoPlay
                                                muted
                                            />
                                        </div>
                                        <Group justify="center">
                                            <Button 
                                                color="blue"
                                                onClick={capturePhoto}
                                                leftSection={<IconClock size={16} />}
                                            >
                                                Tomar Foto
                                            </Button>
                                        </Group>
                                    </Stack>
                                )}
                            </Paper>

                            {/* Sección de Selección de Proyecto */}
                            {assignedProjects.length === 1 ? (
                                <Paper p="xs" bg="dark.6" radius="sm">
                                    <Text size="sm" fw={500} c="gray.2">Proyecto Asignado:</Text>
                                    <Text c="blue.4">{assignedProjects[0].name}</Text>
                                    <Text size="xs" c="pink.4">
                                        {assignedProjects[0].location?.plant_name || 'Sin ubicación'}
                                    </Text>
                                </Paper>
                            ) : assignedProjects.length > 1 ? (
                                <Select
                                    label="Selecciona un proyecto"
                                    placeholder="Elige el proyecto"
                                    data={assignedProjects.map(project => ({
                                        value: project.id.toString(),
                                        label: project.name
                                    }))}
                                    value={selectedProjectId?.toString()}
                                    onChange={(value) => setSelectedProjectId(value ? parseInt(value) : null)}
                                />
                            ) : (
                                <Text c="dimmed">No hay proyectos asignados disponibles</Text>
                            )}

                            {/* Botones de Acción */}
                            {(assignedProjects.length === 1 || selectedProjectId) && (
                                <Group grow>
                                    <Button 
                                        loading={loading}
                                        color="green"
                                        leftSection={<IconUserCheck size={20} />}
                                        onClick={() => {
                                            handleCheckIn('presente');
                                            setCheckInModalOpen(false);
                                        }}
                                        size="md"
                                        disabled={!capturedPhoto}
                                    >
                                        Registrar Entrada
                                    </Button>

                                    <Button 
                                        loading={loading}
                                        color="red"
                                        leftSection={<IconClock size={20} />}
                                        onClick={() => {
                                            handleCheckIn('ausente');
                                            setCheckInModalOpen(false);
                                        }}
                                        size="md"
                                        disabled={!capturedPhoto}
                                    >
                                        Reportar Ausencia
                                    </Button>
                                </Group>
                            )}
                        </>
                    )}
                    {isCheckedIn && (
                        <>
                            {/* Sección de Cámara para Check-out */}
                            <Paper p="md" bg="dark.6" radius="sm">
                                <Text fw={500} c="gray.2" mb="md">Captura de Foto para Salida</Text>
                                
                                {cameraError ? (
                                    <Alert color="red" title="Error de Cámara">
                                        {cameraError}
                                    </Alert>
                                ) : !isCameraActive ? (
                                    <Center h={200}>
                                        <Loader />
                                    </Center>
                                ) : capturedPhoto ? (
                                    <Stack gap="md">
                                        <Image 
                                            src={capturedPhoto} 
                                            alt="Foto capturada"
                                            radius="sm"
                                            style={{ maxHeight: 300 }}
                                        />
                                        <Group justify="center">
                                            <Button 
                                                variant="light" 
                                                color="blue"
                                                onClick={retakePhoto}
                                                leftSection={<IconClock size={16} />}
                                            >
                                                Tomar Otra Foto
                                            </Button>
                                        </Group>
                                    </Stack>
                                ) : (
                                    <Stack gap="md">
                                        <div 
                                            style={{
                                                width: '100%',
                                                height: 300,
                                                backgroundColor: '#000',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}
                                        >
                                            <video
                                                ref={(video) => {
                                                    if (video && cameraStream) {
                                                        video.srcObject = cameraStream;
                                                        // Add error handling for play() to prevent AbortError
                                                        video.play().catch(error => {
                                                            // Ignore AbortError as it's expected when video is interrupted
                                                            if (error.name !== 'AbortError') {
                                                                console.warn('Video play error:', error);
                                                            }
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                                autoPlay
                                                muted
                                            />
                                        </div>
                                        <Group justify="center">
                                            <Button 
                                                color="blue"
                                                onClick={capturePhoto}
                                                leftSection={<IconClock size={16} />}
                                            >
                                                Tomar Foto
                                            </Button>
                                        </Group>
                                    </Stack>
                                )}
                            </Paper>

                            <Paper p="xs" bg="dark.6" radius="sm">
                                <Text size="sm" fw={500} c="gray.2">Hora de Entrada:</Text>
                                <Text c="blue.4">{timeTracking.checkInTime}</Text>
                                <Text size="xs" c="dimmed">Estado: Presente</Text>
                            </Paper>

                            <Button 
                                loading={loading}
                                color="orange"
                                leftSection={<IconDoorEnter size={20} />}
                                onClick={() => {
                                    handleCheckOut();
                                    setCheckInModalOpen(false);
                                }}
                                size="md"
                                fullWidth
                                disabled={!capturedPhoto}
                            >
                                Registrar Salida
                            </Button>
                        </>
                    )}
                </Stack>
            </Modal>

            <Modal
                opened={hoursReportModalOpen}
                onClose={() => setHoursReportModalOpen(false)}
                title="Reporte de Horas"
                size="md"
            >
                {isDayClosed ? (
                    <Alert color="red" title="Día Cerrado">
                        El día ha sido cerrado por el administrador. No se pueden reportar más horas.
                    </Alert>
                ) : (
                    <Stack gap="md">
                        <Paper p="sm" bg="dark.6" radius="sm">
                            <Group justify="space-between">
                                <Text fw={500} c="gray.2">Fecha:</Text>
                                <Text c="blue.4">{new Date().toLocaleDateString('es-MX', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}</Text>
                            </Group>
                        </Paper>

                        {isLoadingEntries ? (
                            <Center h={140}>
                                <Loader />
                            </Center>
                        ) : timeEntries.length === 0 ? (
                            <Center h={140}>
                                <Text c="dimmed">No hay registros de tiempo para hoy</Text>
                            </Center>
                        ) : (
                            <Carousel
                                withIndicators
                                height={140}
                                slideSize="100%"
                                slideGap="md"
                                loop
                                align="start"
                                styles={{
                                    indicators: {
                                        bottom: '0.5rem',
                                    },
                                    control: {
                                        '&[data-inactive]': {
                                            opacity: 0,
                                            cursor: 'default',
                                        },
                                        border: '2px solid #2C2E33',
                                        backgroundColor: '#1A1B1E',
                                    }
                                }}
                            >
                                {groupedEntries.map((entry, index) => (
                                    <Carousel.Slide key={index}>
                                        <Card 
                                            p="sm" 
                                            withBorder
                                            bg="dark.7" 
                                            radius="sm"
                                            style={{
                                                borderColor: '#2C2E33'
                                            }}
                                        >
                                            <Stack gap="xs">
                                                <Group justify="space-between">
                                                    <Text fw={500} c="teal.4">{entry.project_name}</Text>
                                                    <Text size="sm" c="dimmed">{entry.project_location}</Text>
                                                </Group>
                                                <Group grow>
                                                    <Paper p="xs" bg="dark.8" radius="sm">
                                                        <Text size="sm" c="dimmed" ta="center">Horas</Text>
                                                        <Text size="xl" fw={700} c="blue.4" ta="center">
                                                            {entry.duration.toFixed(1)}h
                                                        </Text>
                                                    </Paper>
                                                    <Paper p="xs" bg="dark.8" radius="sm">
                                                        <Text size="sm" c="dimmed" ta="center">Partes</Text>
                                                        <Text size="xl" fw={700} c="teal.4" ta="center">
                                                            {entry.parts_completed || 'N/D'}
                                                        </Text>
                                                    </Paper>
                                                </Group>
                                            </Stack>
                                        </Card>
                                    </Carousel.Slide>
                                ))}
                            </Carousel>
                        )}

                        <Paper p="sm" bg="dark.6" radius="sm">
                            <Text fw={500} c="gray.2" mb="xs">Notas del Proyecto</Text>
                            <Textarea
                                placeholder="Describe las actividades realizadas, problemas encontrados, observaciones importantes, etc. (mínimo 100 palabras)"
                                value={reportNotes}
                                onChange={(event) => setReportNotes(event.currentTarget.value)}
                                minRows={4}
                                maxRows={8}
                                required
                                error={
                                    reportNotes.trim().split(/\s+/).length < 100 && reportNotes.trim() !== ''
                                        ? `Debes escribir al menos 100 palabras. Actualmente tienes ${reportNotes.trim().split(/\s+/).length} palabras.`
                                        : null
                                }
                            />
                        </Paper>

                        <Paper p="sm" bg="dark.6" radius="sm">
                            <Text fw={500} c="gray.2" mb="xs">Resumen del Día</Text>
                            <Group justify="space-between">
                                <Stack gap={4}>
                                    <Text size="sm" c="dimmed">Total Horas:</Text>
                                    <Text size="sm" c="dimmed">Total Partes:</Text>
                                    <Text size="sm" c="dimmed">Proyectos:</Text>
                                </Stack>
                                <Stack gap={4} align="flex-end">
                                    <Text size="sm" fw={500} c="blue.4">
                                        {groupedEntries.reduce((acc, curr) => acc + curr.duration, 0).toFixed(1)}h
                                    </Text>
                                    <Text size="sm" fw={500} c="teal.4">
                                        {groupedEntries.reduce((acc, curr) => acc + (curr.parts_completed || 0), 0) || 'N/D'}
                                    </Text>
                                    <Text size="sm" fw={500} c="blue.4">{groupedEntries.length}</Text>
                                </Stack>
                            </Group>
                        </Paper>

                        <Group justify="flex-end" gap="sm">
                            <Button
                                color="red"
                                variant="light"
                                onClick={() => setHoursReportModalOpen(false)}
                            >
                                Cerrar
                            </Button>
                            {isReportSubmitted && (
                                <Button
                                    color="yellow"
                                    variant="light"
                                    onClick={() => {
                                        const today = new Date().toISOString().split('T')[0];
                                        localStorage.removeItem(`reportSubmitted_${today}`);
                                        setIsReportSubmitted(false);
                                        notifications.show({
                                            title: 'Estado reseteado',
                                            message: 'Puedes enviar el reporte nuevamente',
                                            color: 'green'
                                        });
                                    }}
                                    title="Resetear estado del reporte"
                                >
                                    Resetear Reporte
                                </Button>
                            )}
                            <Tooltip
                                label={
                                    isDayClosed ? "El día está cerrado, no se pueden enviar más reportes" : 
                                    reportNotes.trim().split(/\s+/).length < 100 ? "Debes escribir al menos 100 palabras en las notas" : ""
                                }
                                disabled={!isDayClosed && reportNotes.trim().split(/\s+/).length >= 100}
                            >
                            <Button
                                color="blue"
                                    onClick={handleSubmitReport}
                                    disabled={isDayClosed || isReportSubmitted || reportNotes.trim().split(/\s+/).length < 100}
                                    title={
                                        isReportSubmitted ? "Ya enviaste el reporte de hoy" : 
                                        isDayClosed ? "El día está cerrado" : 
                                        reportNotes.trim().split(/\s+/).length < 100 ? "Debes escribir al menos 100 palabras en las notas" : ""
                                    }
                            >
                                Enviar Reporte
                            </Button>
                            </Tooltip>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal
                opened={projectsModalOpen}
                onClose={() => {
                    setProjectsModalOpen(false);
                    setSelectedProjectDetails(null);
                }}
                title={selectedProjectDetails ? "Detalles del Proyecto" : "Proyectos"}
                size="lg"
            >
                <Stack gap="md">
                    {!selectedProjectDetails ? (
                        <>
                            <Text size="sm" c="dimmed">
                                Selecciona un proyecto para ver más detalles
                            </Text>
                            {assignedProjects.map((project) => (
                                <Card 
                                    key={project.id}
                                    p="sm" 
                                    withBorder
                                    bg="dark.6" 
                                    radius="sm"
                                    style={{ 
                                        cursor: 'pointer',
                                        borderColor: '#2C2E33'
                                    }}
                                    onClick={() => setSelectedProjectDetails(project.id)}
                                >
                                    <Group justify="space-between" align="flex-start">
                                        <div>
                                            <Text fw={500} c="blue.4">
                                                {project.name}
                                            </Text>
                                            <Text size="xs" c="pink.4">
                                                {project.location?.plant_name || 'Sin ubicación'}
                                            </Text>
                                        </div>
                                        <Badge 
                                            color="blue" 
                                            variant="light"
                                            size="sm"
                                        >
                                            Activo
                                        </Badge>
                                    </Group>
                                    <Group mt="xs">
                                        <Text size="sm" c="dimmed">Progreso:</Text>
                                        <Text size="sm" c="teal.4" fw={500}>{Math.round(project.progress || 0)}%</Text>
                                        <Text size="sm" c="dimmed">Partes:</Text>
                                        <Text size="sm" c="blue.4" fw={500}>{project.completed_parts || 0}/{project.total_parts || 0}</Text>
                                    </Group>
                                </Card>
                            ))}
                        </>
                    ) : (
                        <ProjectDetailsModal 
                            project={projectForDetails}
                            onClose={() => setSelectedProjectDetails(null)}
                            onTechnicianClick={handleTechnicianClick}
                            onImageClick={(imageData) => setImageModal(imageData)}
                            onEquipmentClick={() => setEquipmentModalOpen(true)}
                        />
                    )}
                </Stack>
            </Modal>

            <Modal
                opened={documentsModalOpen}
                onClose={() => setDocumentsModalOpen(false)}
                title="Documentos"
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Documentos disponibles para descarga
                    </Text>

                    <Paper p="xs" bg="dark.6" radius="sm">
                        <Stack gap="xs">
                            <Group justify="space-between" align="center">
                                <Group>
                                    <ThemeIcon color="red" variant="light" size="lg">
                                        <IconFileTypePdf size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" fw={500}>Manual de Procedimientos</Text>
                                        <Text size="xs" c="dimmed">PDF • 2.5 MB</Text>
                                    </div>
                                </Group>
                                <Button 
                                    variant="subtle" 
                                    color="blue"
                                    size="sm"
                                    leftSection={<IconDownload size={16} />}
                                >
                                    Descargar
                                </Button>
                            </Group>

                            <Group justify="space-between" align="center">
                                <Group>
                                    <ThemeIcon color="blue" variant="light" size="lg">
                                        <IconFileTypeDoc size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" fw={500}>Formato de Reporte</Text>
                                        <Text size="xs" c="dimmed">DOCX • 500 KB</Text>
                                    </div>
                                </Group>
                                <Button 
                                    variant="subtle" 
                                    color="blue"
                                    size="sm"
                                    leftSection={<IconDownload size={16} />}
                                >
                                    Descargar
                                </Button>
                            </Group>

                            <Group justify="space-between" align="center">
                                <Group>
                                    <ThemeIcon color="green" variant="light" size="lg">
                                        <IconFileTypeXls size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" fw={500}>Control de Horas</Text>
                                        <Text size="xs" c="dimmed">XLSX • 750 KB</Text>
                                    </div>
                                </Group>
                                <Button 
                                    variant="subtle" 
                                    color="blue"
                                    size="sm"
                                    leftSection={<IconDownload size={16} />}
                                >
                                    Descargar
                                </Button>
                            </Group>
                        </Stack>
                    </Paper>
                </Stack>
            </Modal>

            <Modal
                opened={supportModalOpen}
                onClose={() => {
                    setSupportModalOpen(false);
                    setSupportForm({
                        type: '',
                        partNumberVin: '',
                        project: '',
                        location: '',
                        description: ''
                    });
                }}
                title={
                    <Group justify="space-between" align="center" w="100%">
                        <Text size="lg" fw={600}>Soporte Técnico</Text>
                        <Group gap="md" align="center">
                            <Text size="sm" c="dimmed">{new Date().toLocaleDateString()}</Text>
                            <Text size="sm" c="dimmed">{new Date().toLocaleTimeString()}</Text>
                        </Group>
                    </Group>
                }
                size="md"
            >
                <Stack gap="md">
                    <TextInput
                        label="Número de Parte / VIN"
                        placeholder="Escanea el código de barras/QR o escribe manualmente"
                        value={supportForm.partNumberVin}
                        onChange={async (e) => {
                            const value = e.target.value;
                            
                            if (value.trim()) {
                                // Obtener coordenadas GPS reales
                                try {
                                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                                            enableHighAccuracy: true,
                                            timeout: 10000,
                                            maximumAge: 0
                                        });
                                    });
                                    
                                    const lat = position.coords.latitude.toFixed(6);
                                    const lng = position.coords.longitude.toFixed(6);
                                    
                                    setSupportForm(prev => ({ 
                                        ...prev, 
                                        partNumberVin: value,
                                        location: `Lat: ${lat}, Lng: ${lng}`
                                    }));
                                } catch (error) {
                                    // Si falla la geolocalización, usar coordenadas por defecto
                                    console.warn('No se pudo obtener la ubicación GPS:', error);
                                    setSupportForm(prev => ({ 
                                        ...prev, 
                                        partNumberVin: value,
                                        location: 'Ubicación no disponible'
                                    }));
                                }
                            } else {
                                // Limpiar ubicación si se borra el número de parte
                                setSupportForm(prev => ({ 
                                    ...prev, 
                                    partNumberVin: value,
                                    location: ''
                                }));
                            }
                        }}
                        onKeyDown={(e) => {
                            // Captura códigos de barras que terminan con Enter
                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                e.preventDefault();
                                // El valor ya se actualiza con onChange, solo prevenimos el submit
                            }
                        }}
                        autoFocus
                        style={{ 
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            letterSpacing: '0.5px'
                        }}
                        required
                    />

                    <TextInput
                        label="Ubicación"
                        placeholder={supportForm.partNumberVin ? "Coordenadas GPS obtenidas" : "Se obtendrán coordenadas GPS al escanear"}
                        value={supportForm.location}
                        onChange={(e) => setSupportForm(prev => ({ ...prev, location: e.target.value }))}
                        disabled={!!supportForm.partNumberVin}
                        required
                        style={{
                            backgroundColor: supportForm.partNumberVin ? '#2C2E33' : undefined,
                            color: supportForm.partNumberVin ? '#A0A0A0' : undefined
                        }}
                    />

                    <Select
                        label="Proyecto"
                        placeholder="Selecciona el proyecto"
                        value={supportForm.project}
                        onChange={(value) => setSupportForm(prev => ({ ...prev, project: value || '' }))}
                        data={assignedProjects.map(project => ({
                            value: project.name,
                            label: project.name
                        }))}
                        required
                    />

                    <Select
                        label="Tipo de Reporte"
                        placeholder="Selecciona el tipo"
                        value={supportForm.type}
                        onChange={(value) => setSupportForm(prev => ({ ...prev, type: value || '' }))}
                        data={[
                            { value: 'software', label: 'Fallo de Software' },
                            { value: 'emergencia', label: 'Emergencia' },
                            { value: 'equipo', label: 'Falta de Equipo' },
                            { value: 'documentacion', label: 'Falta Documentación' },
                            { value: 'sin_llaves', label: 'Sin llaves' },
                            { value: 'unidad_cerrada', label: 'Unidad cerrada' },
                            { value: 'unidad_danada', label: 'Unidad dañada' },
                            { value: 'sin_bateria', label: 'Sin batería' },
                            { value: 'seguridad', label: 'Problema de Seguridad' }
                        ]}
                        required
                    />


                    <Textarea
                        label="Descripción del Problema"
                        placeholder="Describe detalladamente el problema que estás experimentando"
                        value={supportForm.description}
                        onChange={(e) => setSupportForm(prev => ({ ...prev, description: e.target.value }))}
                        minRows={4}
                        required
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => {
                            setSupportModalOpen(false);
                            setSupportForm({
                                type: '',
                                partNumberVin: '',
                                project: '',
                                location: '',
                                description: ''
                            });
                        }}>
                            Cancelar
                        </Button>
                        <Button 
                            color="orange"
                            leftSection={<IconSend size={16} />}
                            onClick={handleSupportSubmit}
                            disabled={!supportForm.type || !supportForm.partNumberVin || !supportForm.project || !supportForm.location || !supportForm.description}
                        >
                            Enviar Reporte
                        </Button>
                    </Group>
                </Stack>
            </Modal>


            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Carousel
                    withIndicators
                    height="160px"
                    slideSize="100%"
                    slideGap="md"
                    loop
                    align="start"
                    styles={{
                        indicators: {
                            bottom: '0.5rem',
                        },
                        control: {
                            '&[data-inactive]': {
                                opacity: 0,
                                cursor: 'default',
                            },
                            border: '2px solid #2C2E33',
                            backgroundColor: '#1A1B1E',
                        }
                    }}
                >
                    <Carousel.Slide>
                        <Card 
                            p="xs" 
                            radius="md" 
                            withBorder
                            style={{ 
                                backgroundColor: '#1A1B1E', 
                                height: '100%',
                                borderColor: '#2C2E33'
                            }}
                        >
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                            Hoy
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                            {new Date().toLocaleDateString('es-ES', { weekday: 'long' })}
                                        </Text>
                                    </div>
                                    <ThemeIcon color="blue" variant="light" size={38} radius="md">
                                        <IconCalendarTime size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text 
                                            size="2.2rem" 
                                            fw={800} 
                                            c="blue.4"
                                            className={timeTracking.isActive ? 'animate-pulse' : ''}
                                        >
                                            {groupedEntries.reduce((acc, curr) => acc + curr.duration, 0).toFixed(1)}h
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Trabajadas
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="green.4">
                                            {timeTracking.checkInTime ? 
                                                timeTracking.checkInTime.split(':').slice(0, 2).join(':') : 
                                                '--:--'
                                            }
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Entrada
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="red.4">
                                            {timeTracking.checkOutTime ? 
                                                timeTracking.checkOutTime.split(':').slice(0, 2).join(':') : 
                                                '--:--'
                                            }
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Salida
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                    </Carousel.Slide>

                    <Carousel.Slide>
                        <Card 
                            p="xs" 
                            radius="md" 
                            withBorder
                            style={{ 
                                backgroundColor: '#1A1B1E', 
                                height: '100%',
                                borderColor: '#2C2E33'
                            }}
                        >
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                            Esta Semana
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                            13 - 19 Feb
                                        </Text>
                                    </div>
                                    <ThemeIcon color="violet" variant="light" size={38} radius="md">
                                        <IconCalendarTime size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="violet.4">
                                            40h
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Trabajadas
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="green.4">
                                            5/5
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Asistencias
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                    </Carousel.Slide>

                    <Carousel.Slide>
                        <Card 
                            p="xs" 
                            radius="md" 
                            withBorder
                            style={{ 
                                backgroundColor: '#1A1B1E', 
                                height: '100%',
                                borderColor: '#2C2E33'
                            }}
                        >
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                            Quincena
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                            1 - 15 Feb
                                        </Text>
                                    </div>
                                    <ThemeIcon color="orange" variant="light" size={38} radius="md">
                                        <IconCalendarTime size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="orange.4">
                                            80h
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Trabajadas
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="green.4">
                                            10/10
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Asistencias
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="teal.4">
                                            98%
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Puntualidad
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                    </Carousel.Slide>
                </Carousel>

                <Carousel
                    withIndicators
                    height="160px"
                    slideSize="100%"
                    slideGap="md"
                    loop
                    align="start"
                    styles={{
                        indicators: {
                            bottom: '0.5rem',
                        },
                        control: {
                            '&[data-inactive]': {
                                opacity: 0,
                                cursor: 'default',
                            },
                            border: '2px solid #2C2E33',
                            backgroundColor: '#1A1B1E',
                        }
                    }}
                >
                    <Carousel.Slide>
                        {assignedProjects
                          .filter(project => user && user.full_name && project.assigned_to.includes(user.full_name))
                          .map((project) => (
                            <Card 
                                key={project.id}
                                p="xs" 
                                radius="md" 
                                withBorder
                                style={{ 
                                    backgroundColor: '#1A1B1E', 
                                    height: '100%',
                                    borderColor: '#2C2E33'
                                }}
                            >
                            <Stack gap={4} h="100%">
                                <Group justify="space-between">
                                    <div>
                                        <Text size="lg" fw={700} c="gray.2">
                                                {project.name}
                                        </Text>
                                        <Text size="xs" c="pink.4">
                                                {project.location?.plant_name || 'Sin ubicación'}
                                        </Text>
                                    </div>
                                    <ThemeIcon color="green" variant="light" size={38} radius="md">
                                        <IconBriefcase size={24} />
                                    </ThemeIcon>
                                </Group>

                                <Group justify="center" gap={50} mt="xs">
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="teal.4">
                                                {Math.round(project.progress || 0)}%
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Progreso
                                        </Text>
                                    </Stack>
                                    <Stack align="center" gap={0}>
                                        <Text size="2.2rem" fw={800} c="blue.4">
                                                {project.completed_parts || 0}/{project.total_parts || 0}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Partes
                                        </Text>
                                    </Stack>
                                </Group>
                            </Stack>
                        </Card>
                        ))}
                    </Carousel.Slide>
                </Carousel>
            </SimpleGrid>

            <Paper p="md" radius="md" style={{ backgroundColor: '#1A1B1E' }}>
                <Text size="lg" fw={700} c="gray.2" mb="md">
                    Próxima Actividad
                </Text>
                {assignedProjects
                  .filter(project => user && user.full_name && project.assigned_to.includes(user.full_name))
                  .slice(0, 1) // Solo mostrar el primer proyecto asignado
                  .map((project) => (
                    <Group key={project.id} justify="space-between">
                        <div>
                            <Text c="gray.2">{project.name}</Text>
                            <Text size="sm" c="dimmed">
                                {project.location?.plant_name || 'Sin ubicación'} • 8:00 AM
                            </Text>
                        </div>
                        <Button 
                            variant="light"
                            onClick={() => {
                                setSelectedProjectDetails(project.id);
                                setProjectsModalOpen(true);
                            }}
                        >
                            Ver Detalles
                        </Button>
                    </Group>
                  ))}
                {assignedProjects.filter(project => user && user.full_name && project.assigned_to.includes(user.full_name)).length === 0 && (
                    <Group justify="space-between">
                        <div>
                            <Text c="gray.2">No hay actividades programadas</Text>
                            <Text size="sm" c="dimmed">Sin proyectos asignados</Text>
                        </div>
                        <Button variant="light" disabled>
                            Ver Detalles
                        </Button>
                    </Group>
                )}
            </Paper>

            {localStorage.getItem('developer_token') && (
                <Button
                    onClick={handleReturnToDeveloper}
                    color="yellow"
                    style={{ position: 'fixed', bottom: '20px', right: '20px' }}
                >
                    Regresar a Developer
                </Button>
            )}

            {/* Modal de Imagen */}
            <Modal
                opened={!!imageModal}
                onClose={() => setImageModal(null)}
                size="xl"
                title={imageModal?.title}
            >
                {imageModal && (
                    <Image
                        src={imageModal.src}
                        alt={imageModal.title}
                        style={{ 
                            width: '100%',
                            borderRadius: 8
                        }}
                        fit="contain"
                    />
                )}
            </Modal>

            {/* Icono flotante para restaurar Project Mode */}
            {projectModeMinimized && projectModeData && (
                <div
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    {/* Badge de Project Mode Activo */}
                    <Card
                        p="sm"
                        radius="md"
                        style={{
                            backgroundColor: '#1A1B1E',
                            border: '2px solid #228be6',
                            boxShadow: '0 4px 12px rgba(34, 139, 230, 0.3)',
                            minWidth: '200px'
                        }}
                    >
                        <Group justify="space-between" align="center">
                            <div>
                                <Text size="sm" fw={600} c="blue.4">
                                    {projectModeData.projectName}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    Modo Proyecto Activo
                                </Text>
                            </div>
                            <Button
                                variant="light"
                                color="blue"
                                size="xs"
                                onClick={() => {
                                    setProjectModeOpen(true);
                                    setProjectModeMinimized(false);
                                }}
                                leftSection={<IconArrowRight size={14} />}
                            >
                                Restaurar
                            </Button>
                        </Group>
                    </Card>

                    {/* Indicador de tiempo */}
                    <Card
                        p="xs"
                        radius="md"
                        style={{
                            backgroundColor: '#1A1B1E',
                            border: '1px solid #2C2E33',
                            textAlign: 'center'
                        }}
                    >
                        <Text size="xs" c="green.4" fw={600}>
                            {modalElapsedTime}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {projectModeData.partsCompleted} partes
                        </Text>
                    </Card>
                </div>
            )}

            {/* Modal de Project Mode - Pantalla Completa */}
            <Modal
                opened={projectModeOpen}
                onClose={() => {
                    setProjectModeOpen(false);
                    setProjectModeMinimized(true);
                }}
                size="100%"
                fullScreen
                withCloseButton={false}
                styles={{
                    content: {
                        backgroundColor: '#0A0A0A',
                        border: 'none',
                        borderRadius: 0,
                    },
                    header: {
                        backgroundColor: '#0A0A0A',
                        border: 'none',
                    },
                    body: {
                        padding: 0,
                        height: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }}
            >
                {projectModeData && (
                    <div
                        style={{ 
                            background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1B1E 100%)',
                            position: 'relative',
                            height: '100vh',
                            display: 'flex'
                        }}
                    >
                        {/* Fila superior con botón de cerrar y badge de proceso */}
                        <div style={{
                            position: 'absolute',
                            top: 20,
                            left: 20,
                            right: 20,
                            zIndex: 10,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ width: '60px' }}></div> {/* Espaciador para centrar */}
                            
                            {/* Badge de proceso centrado */}
                            {(() => {
                                const questionNumber = qualityQuestions[currentQuestionIndex]?.number || 1;
                                if (questionNumber >= 1 && questionNumber <= 14) {
                                    return (
                                        <Badge 
                                            color="blue" 
                                            variant="filled" 
                                            size="lg"
                                            style={{ 
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                fontWeight: 700,
                                                fontSize: '14px',
                                                padding: '8px 16px'
                                            }}
                                        >
                                            CATEGORIZE PROCESS
                                        </Badge>
                                    );
                                } else if (questionNumber >= 15 && questionNumber <= 21) {
                                    return (
                                        <Badge 
                                            color="green" 
                                            variant="filled" 
                                            size="lg"
                                            style={{ 
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                fontWeight: 700,
                                                fontSize: '14px',
                                                padding: '8px 16px'
                                            }}
                                        >
                                            REPACK PROCESS
                                        </Badge>
                                    );
                                }
                                return null;
                            })()}
                            
                            {/* Botón de minimizar */}
                            <Button
                                variant="subtle"
                                color="gray"
                                size="lg"
                                onClick={() => {
                                    setProjectModeOpen(false);
                                    setProjectModeMinimized(true);
                                }}
                                style={{
                                    width: '60px',
                                    height: '40px'
                                }}
                            >
                                <IconArrowLeft size={20} />
                            </Button>
                        </div>

                        {/* Panel Izquierdo - Elementos del Proyecto */}
                        <div style={{ 
                            flex: '1', 
                            padding: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            gap: '1.5rem'
                        }}>
                            {/* Título del Proyecto */}
                            <Stack align="flex-start" gap="md">
                                <Text 
                                    size="2.5rem" 
                                    fw={900} 
                                    c="blue.4"
                                    style={{ 
                                        textShadow: '0 0 20px rgba(34, 139, 255, 0.5)',
                                        letterSpacing: '0.1em'
                                    }}
                                >
                                    {projectModeData.projectName}
                                </Text>
                                <Group align="center" gap="sm">
                                    <Text 
                                        size="md" 
                                        c="gray.4"
                                    >
                                        Modo Proyecto
                                    </Text>
                                    <Badge color="green" size="md">ACTIVO</Badge>
                                </Group>
                                <Text 
                                    size="sm" 
                                    c="blue.3"
                                    fw={500}
                                >
                                    Bienvenido, {effectiveUser?.full_name}
                                </Text>
                            </Stack>

                            {/* Fila de Tiempos */}
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', width: '100%' }}>
                                {/* Tiempo Total */}
                                <div style={{
                                    backgroundColor: '#1A1B1E',
                                    border: '2px solid #2C2E33',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    flex: 1,
                                    textAlign: 'center',
                                    minWidth: '200px'
                                }}>
                                    <ThemeIcon size={36} radius="xl" variant="light" color="blue" style={{ margin: '0 auto 10px' }}>
                                        <IconClock size={18} />
                                    </ThemeIcon>
                                    <Text size="sm" c="gray.4" fw={500} style={{ marginBottom: '8px' }}>
                                        Tiempo Total
                                    </Text>
                                    <Text 
                                        size="1.8rem" 
                                        fw={900} 
                                        c="blue.4"
                                        className="animate-pulse"
                                        style={{ 
                                            display: 'block',
                                            marginBottom: '6px'
                                        }}
                                    >
                                        {modalElapsedTime}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        Desde: {projectModeData.modalStartTime?.toLocaleTimeString() || projectModeData.checkInTime}
                                    </Text>
                                </div>

                                {/* Tiempo por Caja */}
                                <div style={{
                                    backgroundColor: '#1A1B1E',
                                    border: '2px solid #2C2E33',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    flex: 1,
                                    textAlign: 'center',
                                    minWidth: '200px'
                                }}>
                                    <ThemeIcon size={36} radius="xl" variant="light" color="green" style={{ margin: '0 auto 10px' }}>
                                        <IconClock size={18} />
                                    </ThemeIcon>
                                    <Text size="sm" c="gray.4" fw={500} style={{ marginBottom: '8px' }}>
                                        Tiempo por Caja
                                    </Text>
                                    <Text 
                                        size="1.8rem" 
                                        fw={900} 
                                        c="green.4"
                                        style={{ 
                                            display: 'block',
                                            marginBottom: '6px'
                                        }}
                                    >
                                        {(() => {
                                            // Si hay cajas completadas y estamos en la primera caja, mostrar su tiempo estático
                                            if (boxTimes.length > 0 && !boxStartTime && !boxCompleted) {
                                                return firstBoxTime;
                                            }
                                            // Si hay promedio (2+ cajas), mostrar promedio
                                            if (averageBoxTime) {
                                                return averageBoxTime;
                                            }
                                            // Si hay caja en progreso, mostrar tiempo actual con parpadeo
                                            if (boxStartTime && !boxCompleted) {
                                                return formatTimeWithBlinkingColon(currentBoxTime);
                                            }
                                            // Si no hay cajas, mostrar 00:00 con parpadeo
                                            return formatTimeWithBlinkingColon('00:00:00');
                                        })()}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {(() => {
                                            if (boxTimes.length > 0 && !boxStartTime && !boxCompleted) {
                                                return `Primera caja terminada`;
                                            }
                                            if (averageBoxTime) {
                                                return `Promedio (${boxTimes.length} cajas)`;
                                            }
                                            if (boxStartTime) {
                                                return 'Caja en progreso...';
                                            }
                                            return 'Iniciando...';
                                        })()}
                                    </Text>
                                </div>
                            </div>

                            {/* Fila de Partes e Incidencias */}
                            <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                                {/* Partes Completadas */}
                                <div style={{
                                    backgroundColor: '#1A1B1E',
                                    border: '2px solid #2C2E33',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    flex: 1,
                                    textAlign: 'center',
                                    minWidth: '200px'
                                }}>
                                    <ThemeIcon size={36} radius="xl" variant="light" color="teal" style={{ margin: '0 auto 10px' }}>
                                        <IconTools size={18} />
                                    </ThemeIcon>
                                    <Text size="sm" c="gray.4" fw={500} style={{ marginBottom: '8px' }}>
                                        Partes Completadas
                                    </Text>
                                    <Text 
                                        size="2.2rem" 
                                        fw={900} 
                                        c="teal.4"
                                        style={{ 
                                            display: 'block',
                                            marginBottom: '4px'
                                        }}
                                    >
                                        {partsCompleted}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        de 28 total
                                    </Text>
                                </div>

                                {/* Reportar Incidencias */}
                                <div style={{
                                    backgroundColor: '#1A1B1E',
                                    border: '2px solid #2C2E33',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    flex: 1,
                                    textAlign: 'center',
                                    minWidth: '200px'
                                }}>
                                    <Text size="sm" c="gray.4" fw={500} style={{ marginBottom: '15px' }}>
                                        Reportar Incidencias
                                    </Text>
                                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                        <ThemeIcon 
                                            size={48} 
                                            radius="xl" 
                                            variant="light" 
                                            color="red" 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setParteFallidaModalOpen(true)}
                                        >
                                            <IconX size={24} />
                                        </ThemeIcon>
                                        <ThemeIcon 
                                            size={48} 
                                            radius="xl" 
                                            variant="light" 
                                            color="orange" 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                // Pre-llenar el proyecto activo
                                                setInternalSupportForm(prev => ({
                                                    ...prev,
                                                    project: activeProject?.name || ''
                                                }));
                                                setInternalSupportModalOpen(true);
                                            }}
                                        >
                                            <IconAlertTriangle size={24} />
                                        </ThemeIcon>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Panel Derecho - Ventana de Instrucciones */}
                        <div style={{ 
                            flex: '1', 
                            padding: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderLeft: '2px solid #2C2E33',
                            backgroundColor: '#0F0F0F'
                        }}>
                            <Card 
                                p="lg" 
                                radius="xl" 
                                style={{ 
                                    backgroundColor: '#1A1B1E',
                                    border: '2px solid #2C2E33',
                                    width: '100%',
                                    maxWidth: '500px'
                                }}
                            >
                                <Stack gap="lg" align="center">
                                    <Group align="center" justify="space-between" style={{ width: '100%' }}>
                                        <Group align="center" gap="md">
                                            <ThemeIcon size={40} radius="xl" variant="light" color="yellow">
                                                <IconClipboardList size={20} />
                                            </ThemeIcon>
                                            <Text 
                                                size="lg" 
                                                fw={700} 
                                                c="yellow.4"
                                            >
                                                Instrucciones de proceso
                                            </Text>
                                        </Group>
                                        <Text size="sm" c="gray.4" fw={500}>
                                            Pregunta {qualityQuestions[currentQuestionIndex]?.number || 1} de {qualityQuestions.length}
                                        </Text>
                                    </Group>
                                    
                                    <Divider color="gray.7" style={{ width: '100%' }} />
                                    
                                    <Stack gap="sm" align="center">
                                        
                                        {/* Texto en inglés */}
                                        <Group justify="space-between" align="center" style={{ width: '100%' }}>
                                            <Text size="sm" c="gray.2" ta="center" style={{ lineHeight: 1.3, fontStyle: 'italic', flex: 1 }}>
                                                {(() => {
                                                    const text = qualityQuestions[currentQuestionIndex]?.text || '';
                                                    if (text.includes('¿')) {
                                                        const parts = text.split('¿');
                                                        const englishPart = parts[0]?.trim() || '';
                                                        
                                                        // Separar la parte en español del texto en inglés
                                                        const lastCommaIndex = englishPart.lastIndexOf(',');
                                                        if (lastCommaIndex !== -1) {
                                                            const pureEnglish = englishPart.substring(0, lastCommaIndex).trim();
                                                            return pureEnglish;
                                                        }
                                                        
                                                        return englishPart;
                                                    }
                                                    return 'Inspect a packaging box to see if there is any damage due to the fork lift and/or during transportation.';
                                                })()}
                                            </Text>
                                            {qualityQuestions[currentQuestionIndex]?.requiresMultipleOperators && (
                                                <Badge 
                                                    color="orange" 
                                                    variant="filled" 
                                                    size="sm"
                                                    style={{ 
                                                        backgroundColor: '#ff6b35',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        marginLeft: '16px'
                                                    }}
                                                >
                                                    2+ Operadores
                                                </Badge>
                                            )}
                                        </Group>
                                        
                                        {/* Texto en español */}
                                        <Text size="sm" c="blue.4" ta="center" style={{ lineHeight: 1.3, fontWeight: 600, marginTop: '4px' }}>
                                            {(() => {
                                                const text = qualityQuestions[currentQuestionIndex]?.text || '';
                                                if (text.includes('¿')) {
                                                    const parts = text.split('¿');
                                                    const englishPart = parts[0]?.trim() || '';
                                                    
                                                    // Extraer la parte en español que está en el texto en inglés
                                                    const lastCommaIndex = englishPart.lastIndexOf(',');
                                                    if (lastCommaIndex !== -1) {
                                                        const spanishInEnglish = englishPart.substring(lastCommaIndex + 1).trim();
                                                        return spanishInEnglish;
                                                    }
                                                    
                                                    return '';
                                                }
                                                return '';
                                            })()}
                                        </Text>
                                        
                                        {/* Imágenes de la pregunta */}
                                        {(() => {
                                            const questionNumber = qualityQuestions[currentQuestionIndex]?.number || 1;
                                            const images = getQuestionImages(questionNumber);
                                            
                                            if (images.length === 0) return null;
                                            
                                            // Si solo hay una imagen, mostrarla directamente
                                            if (images.length === 1) {
                                                return (
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'center', 
                                                        margin: '8px 0'
                                                    }}>
                                                        <div style={{ 
                                                            borderRadius: '6px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #2C2E33',
                                                            maxWidth: '350px'
                                                        }}>
                                                            <Image
                                                                src={`/images/questions/${images[0]}`}
                                                                alt={`Imagen para pregunta ${questionNumber}`}
                                                                style={{
                                                                    maxWidth: '350px',
                                                                    maxHeight: '160px',
                                                                    width: '100%',
                                                                    height: 'auto',
                                                                    objectFit: 'contain'
                                                                }}
                                                                fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMkMyRTMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2E2YTZhNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg=="
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            // Si hay múltiples imágenes, usar carrusel
                                            return (
                                                <div style={{ 
                                                    margin: '8px 0',
                                                    maxWidth: '350px',
                                                    marginLeft: 'auto',
                                                    marginRight: 'auto'
                                                }}>
                                                    <Carousel
                                                        withIndicators
                                                        withControls
                                                        height={160}
                                                        styles={{
                                                            control: {
                                                                '&[data-inactive]': {
                                                                    opacity: 0.3,
                                                                    cursor: 'default',
                                                                },
                                                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                                color: 'white',
                                                                width: '32px',
                                                                height: '32px',
                                                                '&:hover': {
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                                                    transform: 'scale(1.05)',
                                                                }
                                                            },
                                                            indicator: {
                                                                width: 8,
                                                                height: 8,
                                                                transition: 'width 250ms ease',
                                                                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                                                                '&[data-active]': {
                                                                    width: 16,
                                                                    backgroundColor: '#228be6',
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        {images.map((imageName, index) => (
                                                            <Carousel.Slide key={index}>
                                                                <div style={{ 
                                                                    display: 'flex',
                                                                    justifyContent: 'center',
                                                                    alignItems: 'center',
                                                                    height: '100%',
                                                                    padding: '10px'
                                                                }}>
                                                                    <div style={{ 
                                                                        borderRadius: '6px',
                                                                        overflow: 'hidden',
                                                                        border: '1px solid #2C2E33',
                                                                        maxWidth: '100%',
                                                                        maxHeight: '100%'
                                                                    }}>
                                                                        <Image
                                                                            src={`/images/questions/${imageName}`}
                                                                            alt={`Imagen ${index + 1} para pregunta ${questionNumber}`}
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                objectFit: 'contain'
                                                                            }}
                                                                            fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMkMyRTMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2E2YTZhNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg=="
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </Carousel.Slide>
                                                        ))}
                                                    </Carousel>
                                                </div>
                                            );
                                        })()}
                                        
                                        {/* Pregunta en español */}
                                        <Text size="md" c="white" fw={600} ta="center" style={{ lineHeight: 1.4, marginTop: '4px' }}>
                                            {(() => {
                                                const text = qualityQuestions[currentQuestionIndex]?.text || '';
                                                if (text.includes('¿')) {
                                                    const questionPart = text.split('¿')[1]?.trim();
                                                    return questionPart ? `¿${questionPart}` : '¿La caja tiene algún daño visible?';
                                                }
                                                return '¿La caja tiene algún daño visible?';
                                            })()}
                                        </Text>
                                        
                                        {/* Mensaje de caja completada */}
                                        {boxCompleted && (
                                            <Card 
                                                style={{ 
                                                    backgroundColor: 'rgba(34, 197, 94, 0.2)', 
                                                    border: '2px solid #22c55e',
                                                    marginTop: '20px'
                                                }}
                                            >
                                                <Stack align="center" gap="md">
                                                    <ThemeIcon size="xl" color="green" variant="light">
                                                        <IconUserCheck size={40} />
                                                    </ThemeIcon>
                                                    <Text size="xl" c="green" fw={700} ta="center">
                                                        ¡CAJA COMPLETADA!
                                        </Text>
                                                    <Text size="md" c="green.3" ta="center">
                                                        Iniciando nueva caja...
                                                    </Text>
                                                </Stack>
                                            </Card>
                                        )}
                                        
                                        {qualityQuestions[currentQuestionIndex]?.special ? (
                                            <Stack gap="md" align="center">
                                                {/* Botones Sí/No para pregunta 14 */}
                                                {!question14Answered ? (
                                                    <Group gap="md">
                                                        <Button 
                                                            color="green" 
                                                            size="lg"
                                                            style={{ minWidth: '100px' }}
                                                            onClick={async () => {
                                                                setQuestion14Answer('si');
                                                                setQuestion14Answered(true);
                                                                await saveQualityAnswer(14, 'si');
                                                            }}
                                                        >
                                                            Sí
                                                        </Button>
                                                        <Button 
                                                            color="red" 
                                                            size="lg"
                                                            style={{ minWidth: '100px' }}
                                                            onClick={async () => {
                                                                setQuestion14Answer('no');
                                                                setQuestion14Answered(true);
                                                                await saveQualityAnswer(14, 'no');
                                                            }}
                                                        >
                                                            No
                                                        </Button>
                                                    </Group>
                                                ) : (
                                                    <Text size="md" c="green" ta="center">
                                                        Respuesta: {question14Answer === 'si' ? 'Sí' : 'No'}
                                                    </Text>
                                                )}
                                                
                                                {/* Botón para iniciar escaneo por categorías */}
                                                <Button 
                                                    color="blue" 
                                                    size="lg"
                                                    style={{ minWidth: '200px' }}
                                                    onClick={handleSpecialQuestion14}
                                                    leftSection={<IconQrcode size={20} />}
                                                >
                                                    Iniciar Escaneo por Categorías
                                                </Button>
                                            </Stack>
                                        ) : (
                                            <Stack gap="md" mt="md" align="center">
                                                {/* Campo de texto para pregunta 2 (código escaneado) */}
                                                {qualityQuestions[currentQuestionIndex]?.number === 2 && (
                                                    <TextInput
                                                        placeholder="Ingresa el código escaneado o pega aquí"
                                                        value={scannedCode}
                                                        onChange={(event) => setScannedCode(event.currentTarget.value)}
                                                        size="lg"
                                                        style={{ minWidth: '300px' }}
                                                        styles={{
                                                            input: {
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                color: 'white',
                                                                '&::placeholder': {
                                                                    color: 'rgba(255, 255, 255, 0.6)'
                                                                }
                                                            }
                                                        }}
                                                    />
                                                )}
                                                
                                                {/* Campos de texto para pregunta 9 (2 códigos de baterías) */}
                                                {qualityQuestions[currentQuestionIndex]?.number === 9 && (
                                                    <Stack gap="md" align="center" style={{ minWidth: '300px' }}>
                                                        <Group gap="md" style={{ width: '100%' }}>
                                                            <TextInput
                                                                placeholder="Código de batería 1"
                                                                value={scannedCode1}
                                                                onChange={(event) => setScannedCode1(event.currentTarget.value)}
                                                                size="lg"
                                                                style={{ flex: 1 }}
                                                                styles={{
                                                                    input: {
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                        color: 'white',
                                                                        '&::placeholder': {
                                                                            color: 'rgba(255, 255, 255, 0.6)'
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            <TextInput
                                                                placeholder="Código de batería 2"
                                                                value={scannedCode2}
                                                                onChange={(event) => setScannedCode2(event.currentTarget.value)}
                                                                size="lg"
                                                                style={{ flex: 1 }}
                                                                styles={{
                                                                    input: {
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                        color: 'white',
                                                                        '&::placeholder': {
                                                                            color: 'rgba(255, 255, 255, 0.6)'
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </Group>
                                                    </Stack>
                                                )}
                                                
                                                {/* Campo de texto para pregunta 15 (código de barras de la caja) */}
                                                {qualityQuestions[currentQuestionIndex]?.number === 15 && (
                                                    <TextInput
                                                        placeholder="Ingresa el código de barras de la caja"
                                                        value={scannedCode15}
                                                        onChange={(event) => setScannedCode15(event.currentTarget.value)}
                                                        size="lg"
                                                        style={{ minWidth: '300px' }}
                                                        styles={{
                                                            input: {
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                color: 'white',
                                                                '&::placeholder': {
                                                                    color: 'rgba(255, 255, 255, 0.6)'
                                                                }
                                                            }
                                                        }}
                                                    />
                                                )}
                                                
                                                {/* Campos de texto para pregunta 17 (2 códigos de baterías) */}
                                                {qualityQuestions[currentQuestionIndex]?.number === 17 && (
                                                    <Stack gap="md" align="center" style={{ minWidth: '300px' }}>
                                                        <Group gap="md" style={{ width: '100%' }}>
                                                            <TextInput
                                                                placeholder="Código de batería 1"
                                                                value={scannedCode17_1}
                                                                onChange={(event) => setScannedCode17_1(event.currentTarget.value)}
                                                                size="lg"
                                                                style={{ flex: 1 }}
                                                                styles={{
                                                                    input: {
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                        color: 'white',
                                                                        '&::placeholder': {
                                                                            color: 'rgba(255, 255, 255, 0.6)'
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            <TextInput
                                                                placeholder="Código de batería 2"
                                                                value={scannedCode17_2}
                                                                onChange={(event) => setScannedCode17_2(event.currentTarget.value)}
                                                                size="lg"
                                                                style={{ flex: 1 }}
                                                                styles={{
                                                                    input: {
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                        color: 'white',
                                                                        '&::placeholder': {
                                                                            color: 'rgba(255, 255, 255, 0.6)'
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </Group>
                                                    </Stack>
                                                )}
                                                
                                                <Group gap="md">
                                                <Button 
                                                    color="green" 
                                                    size="lg"
                                                    style={{ minWidth: '100px' }}
                                                        onClick={() => {
                                                            let answer = 'si';
                                                            const questionNumber = qualityQuestions[currentQuestionIndex]?.number || 1;
                                                            
                                                            if (questionNumber === 2 && scannedCode) {
                                                                answer = `si:${scannedCode}`;
                                                            } else if (questionNumber === 9 && scannedCode1 && scannedCode2) {
                                                                answer = `si:${scannedCode1},${scannedCode2}`;
                                                            } else if (questionNumber === 15 && scannedCode15) {
                                                                answer = `si:${scannedCode15}`;
                                                            } else if (questionNumber === 17 && scannedCode17_1 && scannedCode17_2) {
                                                                answer = `si:${scannedCode17_1},${scannedCode17_2}`;
                                                            }
                                                            
                                                            saveQualityAnswer(questionNumber, answer);
                                                        }}
                                                        disabled={
                                                            (qualityQuestions[currentQuestionIndex]?.number === 2 && !scannedCode.trim()) ||
                                                            (qualityQuestions[currentQuestionIndex]?.number === 9 && (!scannedCode1.trim() || !scannedCode2.trim())) ||
                                                            (qualityQuestions[currentQuestionIndex]?.number === 15 && !scannedCode15.trim()) ||
                                                            (qualityQuestions[currentQuestionIndex]?.number === 17 && (!scannedCode17_1.trim() || !scannedCode17_2.trim()))
                                                        }
                                                >
                                                    Sí
                                                </Button>
                                                <Button 
                                                    color="red" 
                                                    size="lg"
                                                    style={{ minWidth: '100px' }}
                                                    onClick={() => saveQualityAnswer(qualityQuestions[currentQuestionIndex]?.number || 1, 'no')}
                                                >
                                                    No
                                                </Button>
                                            </Group>
                                            </Stack>
                                        )}
                                        
                                    </Stack>
                                </Stack>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Modal Interno de Soporte Técnico dentro de Project Mode */}
                <Modal
                    opened={internalSupportModalOpen}
                    onClose={() => {
                        setInternalSupportModalOpen(false);
                        setInternalSupportForm({
                            type: '',
                            partNumberVin: '',
                            project: '',
                            location: '',
                            description: ''
                        });
                    }}
                    title={
                        <Group justify="space-between" align="center" w="100%">
                            <Text size="lg" fw={600}>Soporte Técnico</Text>
                            <Group gap="md" align="center">
                                <Text size="sm" c="dimmed">{new Date().toLocaleDateString()}</Text>
                                <Text size="sm" c="dimmed">{new Date().toLocaleTimeString()}</Text>
                            </Group>
                        </Group>
                    }
                    size="md"
                    centered
                    zIndex={10000}
                    styles={{
                        content: {
                            zIndex: 10000
                        },
                        header: {
                            zIndex: 10001
                        },
                        body: {
                            zIndex: 10000
                        }
                    }}
                >
                    <Stack gap="md">
                        <TextInput
                            label="Número de Parte / VIN"
                            placeholder="Escanea el código de barras/QR o escribe manualmente"
                            value={internalSupportForm.partNumberVin}
                            onChange={async (e) => {
                                const value = e.target.value;
                                
                                if (value.trim()) {
                                    // Obtener coordenadas GPS reales
                                    try {
                                        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                                enableHighAccuracy: true,
                                                timeout: 10000,
                                                maximumAge: 0
                                            });
                                        });
                                        
                                        const lat = position.coords.latitude.toFixed(6);
                                        const lng = position.coords.longitude.toFixed(6);
                                        
                                        setInternalSupportForm(prev => ({ 
                                            ...prev, 
                                            partNumberVin: value,
                                            location: `Lat: ${lat}, Lng: ${lng}`
                                        }));
                                    } catch (error) {
                                        // Si falla la geolocalización, usar coordenadas por defecto
                                        console.warn('No se pudo obtener la ubicación GPS:', error);
                                        setInternalSupportForm(prev => ({ 
                                            ...prev, 
                                            partNumberVin: value,
                                            location: 'Ubicación no disponible'
                                        }));
                                    }
                                } else {
                                    // Limpiar ubicación si se borra el número de parte
                                    setInternalSupportForm(prev => ({ 
                                        ...prev, 
                                        partNumberVin: value,
                                        location: ''
                                    }));
                                }
                            }}
                            onKeyDown={(e) => {
                                // Captura códigos de barras que terminan con Enter
                                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                    e.preventDefault();
                                    // El valor ya se actualiza con onChange, solo prevenimos el submit
                                }
                            }}
                            autoFocus
                            style={{ 
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                letterSpacing: '0.5px'
                            }}
                            required
                        />

                        <TextInput
                            label="Ubicación"
                            placeholder={internalSupportForm.partNumberVin ? "Coordenadas GPS obtenidas" : "Se obtendrán coordenadas GPS al escanear"}
                            value={internalSupportForm.location}
                            onChange={(e) => setInternalSupportForm(prev => ({ ...prev, location: e.target.value }))}
                            disabled={!!internalSupportForm.partNumberVin}
                            required
                            style={{
                                backgroundColor: internalSupportForm.partNumberVin ? '#2C2E33' : undefined,
                                color: internalSupportForm.partNumberVin ? '#A0A0A0' : undefined
                            }}
                        />

                        <Select
                            label="Proyecto"
                            placeholder="Selecciona el proyecto"
                            value={internalSupportForm.project || activeProject?.name || ''}
                            onChange={(value) => setInternalSupportForm(prev => ({ ...prev, project: value || '' }))}
                            data={allProjects.map(project => ({
                                value: project.name,
                                label: project.name
                            }))}
                            required
                            styles={{
                                dropdown: {
                                    zIndex: 10002
                                }
                            }}
                        />

                        <Select
                            label="Tipo de Reporte"
                            placeholder="Selecciona el tipo"
                            value={internalSupportForm.type}
                            onChange={(value) => setInternalSupportForm(prev => ({ ...prev, type: value || '' }))}
                            data={[
                                { value: 'software', label: 'Fallo de Software' },
                                { value: 'emergencia', label: 'Emergencia' },
                                { value: 'equipo', label: 'Falta de Equipo' },
                                { value: 'documentacion', label: 'Falta Documentación' },
                                { value: 'sin_llaves', label: 'Sin llaves' },
                                { value: 'unidad_cerrada', label: 'Unidad cerrada' },
                                { value: 'unidad_danada', label: 'Unidad dañada' },
                                { value: 'sin_bateria', label: 'Sin batería' },
                                { value: 'seguridad', label: 'Problema de Seguridad' }
                            ]}
                            required
                            styles={{
                                dropdown: {
                                    zIndex: 10002
                                }
                            }}
                        />

                        <Textarea
                            label="Descripción del Problema"
                            placeholder="Describe detalladamente el problema que estás experimentando"
                            value={internalSupportForm.description}
                            onChange={(e) => setInternalSupportForm(prev => ({ ...prev, description: e.target.value }))}
                            minRows={4}
                            required
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => {
                                setInternalSupportModalOpen(false);
                                setInternalSupportForm({
                                    type: '',
                                    partNumberVin: '',
                                    project: '',
                                    location: '',
                                    description: ''
                                });
                            }}>
                                Cancelar
                            </Button>
                            <Button 
                                color="orange"
                                leftSection={<IconSend size={16} />}
                                onClick={handleInternalSupportSubmit}
                                disabled={!internalSupportForm.type || !internalSupportForm.partNumberVin || !internalSupportForm.project || !internalSupportForm.location || !internalSupportForm.description}
                            >
                                Enviar Reporte
                            </Button>
                        </Group>
                    </Stack>
                </Modal>
            </Modal>

            {/* Modal para escaneo por categorías (Pregunta 14) */}
            <Modal
                opened={categoryScanningOpen}
                onClose={() => setCategoryScanningOpen(false)}
                size="md"
                title="Asignar Categorías"
                centered
            >
                <Stack gap="lg">
                    {/* Campo 1 */}
                    <Stack gap="sm">
                        <TextInput
                            placeholder="Código de batería 1"
                            value={scannedCode1}
                            onChange={(event) => setScannedCode1(event.currentTarget.value)}
                            size="lg"
                        />
                        <Group gap="xs">
                            {['A', 'B', 'C', 'D', 'E'].map((category) => {
                                const getCategoryColor = (cat: string) => {
                                    switch (cat) {
                                        case 'A': return '#00BFFF'; // Azul claro
                                        case 'B': return '#0000ff'; // Azul
                                        case 'C': return '#ffff00'; // Amarillo
                                        case 'D': return '#ff8000'; // Naranja
                                        case 'E': return '#ff0000'; // Rojo
                                        default: return '#909296';
                                    }
                                };
                                
                                return (
                                    <Badge
                                        key={category}
                                        size="lg"
                                        variant={batteryCategoryAssignments.battery1 === category ? 'filled' : 'outline'}
                                        style={{ 
                                            cursor: 'pointer',
                                            backgroundColor: batteryCategoryAssignments.battery1 === category ? getCategoryColor(category) : 'transparent',
                                            color: batteryCategoryAssignments.battery1 === category ? 'white' : getCategoryColor(category),
                                            borderColor: getCategoryColor(category)
                                        }}
                                        onClick={() => selectBatteryCategory('battery1', category)}
                                    >
                                        {category}
                                    </Badge>
                                );
                            })}
                        </Group>
                    </Stack>

                    {/* Campo 2 */}
                    <Stack gap="sm">
                        <TextInput
                            placeholder="Código de batería 2"
                            value={scannedCode2}
                            onChange={(event) => setScannedCode2(event.currentTarget.value)}
                            size="lg"
                        />
                        <Group gap="xs">
                            {['A', 'B', 'C', 'D', 'E'].map((category) => {
                                const getCategoryColor = (cat: string) => {
                                    switch (cat) {
                                        case 'A': return '#00BFFF'; // Azul claro
                                        case 'B': return '#0000ff'; // Azul
                                        case 'C': return '#ffff00'; // Amarillo
                                        case 'D': return '#ff8000'; // Naranja
                                        case 'E': return '#ff0000'; // Rojo
                                        default: return '#909296';
                                    }
                                };
                                
                                return (
                                    <Badge
                                        key={category}
                                        size="lg"
                                        variant={batteryCategoryAssignments.battery2 === category ? 'filled' : 'outline'}
                                        style={{ 
                                            cursor: 'pointer',
                                            backgroundColor: batteryCategoryAssignments.battery2 === category ? getCategoryColor(category) : 'transparent',
                                            color: batteryCategoryAssignments.battery2 === category ? 'white' : getCategoryColor(category),
                                            borderColor: getCategoryColor(category)
                                        }}
                                        onClick={() => selectBatteryCategory('battery2', category)}
                                    >
                                        {category}
                                    </Badge>
                                );
                            })}
                        </Group>
                    </Stack>
                    
                    {/* Botones */}
                    <Group justify="space-between" mt="md">
                        <Button 
                            variant="subtle" 
                            color="gray"
                            onClick={() => setCategoryScanningOpen(false)}
                        >
                            Cancelar
                        </Button>
                        
                        <Button 
                            color="green"
                            onClick={completeCategoryScanning}
                            disabled={!batteryCategoryAssignments.battery1 || !batteryCategoryAssignments.battery2}
                        >
                            Completar
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal Parte Fallida */}
            <Modal
                opened={parteFallidaModalOpen}
                onClose={() => setParteFallidaModalOpen(false)}
                title="Parte Fallida"
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Ingresa el código de la parte fallida mediante escaneo, copia y pega, o escritura manual
                    </Text>

                    <TextInput
                        label="Código de la Parte"
                        placeholder="Escanea, pega o escribe el código aquí"
                        value={codigoParteFallida}
                        onChange={(event) => setCodigoParteFallida(event.currentTarget.value)}
                        required
                    />

                    <Group justify="flex-end" mt="md">
                        <Button 
                            variant="subtle" 
                            color="gray"
                            onClick={() => {
                                setParteFallidaModalOpen(false);
                                setCodigoParteFallida('');
                            }}
                        >
                            Cancelar
                        </Button>
                        
                        <Button 
                            color="red"
                            onClick={async () => {
                                if (codigoParteFallida.trim()) {
                                    try {
                                        // Crear registro en la tabla issues con status "failed"
                                        const issueData = {
                                            type: 'Parte Fallida',
                                            part_number_vin: codigoParteFallida,
                                            project: activeProject?.name || 'Proyecto no especificado',
                                            location: activeProject?.location || 'Ubicación no especificada',
                                            date_reported: new Date().toISOString().split('T')[0],
                                            status: 'failed',
                                            created_by: effectiveUser?.id,
                                            description: `Parte fallida reportada: ${codigoParteFallida}`
                                        };

                                        const token = localStorage.getItem('token');
                                        if (!token) {
                                            throw new Error('No authentication token found');
                                        }

                                        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/issues/`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            credentials: 'include',
                                            body: JSON.stringify(issueData)
                                        });

                                        if (!response.ok) {
                                            const errorData = await response.json();
                                            throw new Error(errorData.detail || 'Error al crear el issue');
                                        }

                                        const createdIssue = await response.json();
                                        console.log('Issue de parte fallida creado:', createdIssue);

                                    notifications.show({
                                        title: 'Parte Fallida Reportada',
                                            message: `Código: ${codigoParteFallida} - Registro creado exitosamente`,
                                        color: 'red',
                                        autoClose: 3000
                                    });
                                        
                                    setParteFallidaModalOpen(false);
                                    setCodigoParteFallida('');
                                    } catch (error) {
                                        console.error('Error al reportar parte fallida:', error);
                                        notifications.show({
                                            title: 'Error',
                                            message: 'No se pudo crear el registro de parte fallida',
                                            color: 'red',
                                            autoClose: 3000
                                        });
                                    }
                                } else {
                                    notifications.show({
                                        title: 'Error',
                                        message: 'Por favor ingresa un código válido',
                                        color: 'red',
                                        autoClose: 3000
                                    });
                                }
                            }}
                            disabled={!codigoParteFallida.trim()}
                        >
                            Enviar
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal Pregunta 2 - Escaneo Requerido */}
            <Modal
                opened={question2ModalOpen}
                onClose={() => setQuestion2ModalOpen(false)}
                title="Escaneo Requerido"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconQrcode size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, escanea el código de barras de la caja.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Debes escanear el código de barras de la caja antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion2ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 3 - Remover Bandas */}
            <Modal
                opened={question3ModalOpen}
                onClose={() => setQuestion3ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar remueve las bandas.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Debes remover las bandas de la caja antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion3ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 4 - Remover Tapa Superior */}
            <Modal
                opened={question4ModalOpen}
                onClose={() => setQuestion4ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, remueve la tapa superior.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Esto debe ser realizado por 2 personas. Debes remover la tapa superior antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion4ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 5 - Remover Tapas Laterales */}
            <Modal
                opened={question5ModalOpen}
                onClose={() => setQuestion5ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, remueve las tapas laterales.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Esto debe ser realizado por 2 personas. Debes remover las tapas laterales antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion5ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 8 - Remover Primera Capa Protectora */}
            <Modal
                opened={question8ModalOpen}
                onClose={() => setQuestion8ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, remueve la primera capa protectora.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Esto debe ser realizado por 2 personas. Debes remover la primera capa protectora antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion8ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 9 - Escanear Códigos de Baterías */}
            <Modal
                opened={question9ModalOpen}
                onClose={() => setQuestion9ModalOpen(false)}
                title="Escaneo Requerido"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconQrcode size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, escanea los códigos de las baterías.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Debes escanear el código de número de serie de cada batería (2) antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion9ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 12 - Mover Baterías a la Mesa */}
            <Modal
                opened={question12ModalOpen}
                onClose={() => setQuestion12ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, mueve las baterías a la mesa.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Esto debe ser realizado por 2 personas. Debes mover las 2 baterías de la caja a la mesa antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion12ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 15 - Escanear Código de Barras de la Caja */}
            <Modal
                opened={question15ModalOpen}
                onClose={() => setQuestion15ModalOpen(false)}
                title="Escaneo Requerido"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconQrcode size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, escanea el código de barras de la caja.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Debes escanear el código de barras de la caja antes de continuar con el proceso de reempacado.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion15ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 16 - Regresar Baterías a la Caja B */}
            <Modal
                opened={question16ModalOpen}
                onClose={() => setQuestion16ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, regresa las baterías a la caja B.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Debes regresar las baterías B a la caja B antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion16ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 17 - Escanear Códigos de Baterías */}
            <Modal
                opened={question17ModalOpen}
                onClose={() => setQuestion17ModalOpen(false)}
                title="Escaneo Requerido"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconQrcode size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, escanea los códigos de las baterías.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Debes escanear el número de serie de cada batería (2) antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion17ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 18 - Remover Paredes Laterales */}
            <Modal
                opened={question18ModalOpen}
                onClose={() => setQuestion18ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, remueve las paredes laterales.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Esto debe ser realizado por 2 personas. Debes remover las paredes laterales antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion18ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 19 - Remover Tapa Superior */}
            <Modal
                opened={question19ModalOpen}
                onClose={() => setQuestion19ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, remueve la tapa superior.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Esto debe ser realizado por 2 personas. Debes remover la tapa superior antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion19ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 20 - Remover Bandas */}
            <Modal
                opened={question20ModalOpen}
                onClose={() => setQuestion20ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, remueve las bandas.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Debes remover las bandas antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion20ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Pregunta 21 - Colocar Etiquetas de Categoría */}
            <Modal
                opened={question21ModalOpen}
                onClose={() => setQuestion21ModalOpen(false)}
                title="Acción Requerida"
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <ThemeIcon size={64} radius="xl" variant="light" color="orange">
                        <IconTools size={32} />
                    </ThemeIcon>
                    <Text size="lg" fw={500} ta="center">
                        Para avanzar, coloca las etiquetas de categoría B.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                        Debes colocar las etiquetas de categoría B a la caja antes de continuar con el proceso.
                    </Text>
                    <Button 
                        color="blue"
                        size="lg"
                        onClick={() => setQuestion21ModalOpen(false)}
                        style={{ marginTop: '10px' }}
                    >
                        Entendido
                    </Button>
                </Stack>
            </Modal>

            {/* Modal Reportar Problema */}
            <Modal
                opened={problemaModalOpen}
                onClose={() => setProblemaModalOpen(false)}
                title="Reportar Problema"
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Describe detalladamente el problema que has encontrado durante el trabajo
                    </Text>

                    <Textarea
                        label="Descripción del Problema"
                        placeholder="Escribe aquí una descripción detallada del problema..."
                        value={descripcionProblema}
                        onChange={(event) => setDescripcionProblema(event.currentTarget.value)}
                        required
                        minRows={4}
                        maxRows={8}
                        autosize
                    />

                    <Group justify="flex-end" mt="md">
                        <Button 
                            variant="subtle" 
                            color="gray"
                            onClick={() => {
                                setProblemaModalOpen(false);
                                setDescripcionProblema('');
                            }}
                        >
                            Cancelar
                        </Button>
                        
                        <Button 
                            color="orange"
                            onClick={() => {
                                if (descripcionProblema.trim()) {
                                    // Aquí se puede agregar la lógica para enviar el reporte del problema
                                    notifications.show({
                                        title: 'Problema Reportado',
                                        message: 'Tu reporte ha sido enviado correctamente',
                                        color: 'orange',
                                        autoClose: 3000
                                    });
                                    setProblemaModalOpen(false);
                                    setDescripcionProblema('');
                                } else {
                                    notifications.show({
                                        title: 'Error',
                                        message: 'Por favor describe el problema antes de enviar',
                                        color: 'red',
                                        autoClose: 3000
                                    });
                                }
                            }}
                            disabled={!descripcionProblema.trim()}
                        >
                            Enviar
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
} 