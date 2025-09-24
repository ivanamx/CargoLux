import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Divider,
  Badge,
  Button,
  LoadingOverlay,
  Alert,
  Grid,
  Card,
  ThemeIcon,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Progress
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconFileText,
  IconCalendar,
  IconMapPin,
  IconBuilding,
  IconUser,
  IconDownload,
  IconPrinter,
  IconSettings,
  IconArrowLeft,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconTrendingUp,
  IconUsers
} from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { getToken } from '../services/auth';
import { Project } from '../types/project';
import panaback from '../assets/images/panaback.png';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ProjectData {
  id: number;
  name: string;
  client: string;
  start_date: string;
  end_date: string;
  status: string;
  location: {
    plant_name: string;
    plant_address: string;
    plant_coordinates: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
  };
  progress: number;
  total_parts: number;
  completed_parts: number;
  project_type: string;
}

interface ReportData {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  categories: {
    [key: string]: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
  technicians: string[];
  uniqueTechniciansFromTimeEntries: number;
  totalHoursFromTimeEntries: number;
  todayStats: {
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    categories: {
      [key: string]: number;
    };
    projectedPartsUntil18: number;
    projectedBoxesUntil18: number;
    avgTimePerBox: number;
  };
  technicianStats: Array<{
    name: string;
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    hours: number;
  }>;
  totalHours: number;
  efficiency: number;
}

const ReportePDF: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projects } = useProjects();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  // Configuración del reporte
  const [reportSettings, setReportSettings] = useState({
    title: 'Reporte de Proyecto Panasonic',
    includeCharts: true,
    includeMaps: true,
    includeDetails: true,
    dateRange: {
      start: new Date(),
      end: new Date()
    }
  });

  // Obtener ID del proyecto desde la URL
  const projectId = searchParams.get('projectId') || searchParams.get('projectid') || '28';

  useEffect(() => {
    loadProjectData();
  }, [projectId, projects]);

  const loadProjectData = async () => {
    try {
      console.log('ReportePDF: Iniciando carga de datos del proyecto', projectId);
      console.log('ReportePDF: Proyectos disponibles en contexto:', projects);
      console.log('ReportePDF: Total de proyectos:', projects.length);
      setLoading(true);
      setError(null);

      // Buscar el proyecto en el contexto
      const projectData = projects.find((p: Project) => p.id === parseInt(projectId));
      
      if (!projectData) {
        console.error('ReportePDF: Proyecto no encontrado en contexto. ID buscado:', projectId, 'Proyectos disponibles:', projects.map(p => ({ id: p.id, name: p.name })));
        
        // Fallback: cargar proyecto directamente desde la API
        console.log('ReportePDF: Intentando cargar proyecto desde API...');
        const projectResponse = await fetch(`/api/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!projectResponse.ok) {
          throw new Error('Error al cargar proyecto desde la API');
        }
        
        const apiProjectData = await projectResponse.json();
        console.log('ReportePDF: Proyecto cargado desde API:', apiProjectData);
        setProject(apiProjectData);
      } else {
      console.log('ReportePDF: Datos del proyecto encontrados en contexto:', projectData);
      setProject(projectData);
      }

      // Cargar datos del reporte (checkpoints de Panasonic)
      console.log('ReportePDF: Haciendo fetch a /api/panasonic-checkpoints/project/' + projectId);
      const reportResponse = await fetch(`/api/panasonic-checkpoints/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('ReportePDF: Respuesta del reporte:', reportResponse.status, reportResponse.ok);

      if (!reportResponse.ok) {
        throw new Error('Error al cargar datos del reporte');
      }

      const checkpoints = await reportResponse.json();
      console.log('ReportePDF: Checkpoints recibidos:', checkpoints);

      // Cargar datos de time_entries para obtener técnicos únicos
      console.log('ReportePDF: Haciendo fetch a /api/time-entries/project/' + projectId);
      const timeEntriesResponse = await fetch(`/api/time-entries/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('ReportePDF: Respuesta de time_entries:', timeEntriesResponse.status, timeEntriesResponse.ok);

      let timeEntries = [];
      if (timeEntriesResponse.ok) {
        timeEntries = await timeEntriesResponse.json();
        console.log('ReportePDF: Time entries recibidos:', timeEntries);
      } else {
        console.warn('ReportePDF: No se pudieron cargar los time_entries, usando datos de checkpoints');
      }

      // Cargar datos de panasonic_quality_questions para obtener tiempo promedio por caja
      console.log('ReportePDF: Haciendo fetch a /api/panasonic-quality-questions/project/' + projectId);
      const qualityQuestionsResponse = await fetch(`/api/panasonic-quality-questions/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('ReportePDF: Respuesta de quality_questions:', qualityQuestionsResponse.status, qualityQuestionsResponse.ok);

      let qualityQuestions = [];
      if (qualityQuestionsResponse.ok) {
        qualityQuestions = await qualityQuestionsResponse.json();
        console.log('ReportePDF: Quality questions recibidos:', qualityQuestions);
      } else {
        console.warn('ReportePDF: No se pudieron cargar los quality_questions, usando estimación');
      }

      // Cargar datos de usuarios para obtener nombres reales
      console.log('ReportePDF: Haciendo fetch a /api/users');
      const usersResponse = await fetch(`/api/users`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('ReportePDF: Respuesta de users:', usersResponse.status, usersResponse.ok);

      let users = [];
      if (usersResponse.ok) {
        users = await usersResponse.json();
        console.log('ReportePDF: Usuarios recibidos:', users);
      } else {
        console.warn('ReportePDF: No se pudieron cargar los usuarios, usando mapeo hardcodeado');
      }

      // Crear mapeo dinámico de usuarios desde la base de datos
      const usersMap: { [key: number]: string } = {};
      if (users.length > 0) {
        users.forEach((user: any) => {
          usersMap[user.id] = user.full_name || user.username || `Usuario ${user.id}`;
        });
        console.log('ReportePDF: Mapeo de usuarios creado desde BD:', usersMap);
      } else {
        // Fallback al mapeo hardcodeado si no se pueden cargar los usuarios
        const fallbackUsersMap = {
          15: 'Admin User',
          22: 'Xavier Zuñiga', 
          23: 'Nancy Zuñiga',
          24: 'Fernando Riveron',
          25: 'Alejandro Zuniga',
          26: 'Monica Mendez',
          27: 'Pablo Fernando Gonzalez Gonzalez',
          28: 'Admin User'
        };
        Object.assign(usersMap, fallbackUsersMap);
        console.log('ReportePDF: Usando mapeo hardcodeado de usuarios:', usersMap);
      }
      
      // Procesar datos para el reporte
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      // Filtrar checkpoints de hoy
      const todayCheckpoints = checkpoints.filter((cp: any) => {
        const cpDate = new Date(cp.timestamp);
        return cpDate >= todayStart && cpDate < todayEnd;
      });

      // Calcular estadísticas correctas por status - contar solo baterías únicas (códigos que empiezan con "BAT")
      const batteryCheckpoints = checkpoints.filter((cp: any) => cp.scanned_code.startsWith('BAT'));
      const uniqueBatteries = [...new Set(batteryCheckpoints.map((cp: any) => cp.scanned_code))];
      const totalParts = uniqueBatteries.length;
      
      // Para exitosos y fallidos, necesitamos contar las baterías únicas que tienen al menos un checkpoint exitoso/fallido
      const successfulParts = [...new Set(
        batteryCheckpoints
          .filter((cp: any) => cp.status === 'ok')
          .map((cp: any) => cp.scanned_code)
      )].length;
      
      const failedParts = [...new Set(
        batteryCheckpoints
          .filter((cp: any) => cp.status === 'failed')
          .map((cp: any) => cp.scanned_code)
      )].length;
      
      // Estadísticas de hoy - solo baterías
      const todayBatteryCheckpoints = todayCheckpoints.filter((cp: any) => cp.scanned_code.startsWith('BAT'));

      // Calcular estadísticas por categoría - solo baterías (contar partes únicas, no escaneos)
      const categoryStats = batteryCheckpoints.reduce((acc: any, cp: any) => {
        if (cp.categorie) {
          const categories = cp.categorie.split(',').map((cat: string) => cat.trim());
          const scannedCode = cp.scanned_code;
          categories.forEach((cat: string) => {
            if (!acc[cat]) {
              acc[cat] = new Set();
            }
            acc[cat].add(scannedCode);
          });
        }
        return acc;
      }, {});

      // Convertir Sets a conteos
      const categoryStatsCounts = Object.keys(categoryStats).reduce((acc: any, cat: string) => {
        acc[cat] = categoryStats[cat].size;
        return acc;
      }, {});

      // Calcular estadísticas de hoy por categoría - solo baterías (contar partes únicas, no escaneos)
      const todayCategoryStats = todayBatteryCheckpoints.reduce((acc: any, cp: any) => {
        if (cp.categorie) {
          const categories = cp.categorie.split(',').map((cat: string) => cat.trim());
          const scannedCode = cp.scanned_code;
          categories.forEach((cat: string) => {
            if (!acc[cat]) {
              acc[cat] = new Set();
            }
            acc[cat].add(scannedCode);
          });
        }
        return acc;
      }, {});

      // Convertir Sets a conteos para hoy
      const todayCategoryStatsCounts = Object.keys(todayCategoryStats).reduce((acc: any, cat: string) => {
        acc[cat] = todayCategoryStats[cat].size;
        return acc;
      }, {});

      // Obtener técnicos únicos desde time_entries (check-ins al proyecto)
      const uniqueTechniciansFromTimeEntries = timeEntries.length > 0 
        ? [...new Set(timeEntries.map((entry: any) => entry.user_id))].length
        : 0;

      // Calcular horas totales trabajadas desde time_entries (suma de duration)
      const totalHoursFromTimeEntries = timeEntries.length > 0 
        ? timeEntries.reduce((total: number, entry: any) => {
            // Convertir duration a horas (asumiendo que duration está en formato HH:MM:SS o en segundos)
            let durationInHours = 0;
            if (entry.duration) {
              if (typeof entry.duration === 'string' && entry.duration.includes(':')) {
                // Formato HH:MM:SS
                const [hours, minutes, seconds] = entry.duration.split(':').map(Number);
                durationInHours = hours + (minutes / 60) + (seconds / 3600);
              } else if (typeof entry.duration === 'number') {
                // Asumir que está en segundos
                durationInHours = entry.duration / 3600;
              }
            }
            return total + durationInHours;
          }, 0)
        : 0;

      // Obtener estadísticas de técnicos desde time_entries (datos reales)
      const technicianStatsFromTimeEntries = timeEntries.length > 0 
        ? timeEntries.reduce((acc: any, entry: any) => {
            // Usar mapeo dinámico de usuarios
            const techName = usersMap[entry.user_id] || `Técnico ID ${entry.user_id}`;
            
            if (!acc[techName]) {
              acc[techName] = {
                name: techName,
                user_id: entry.user_id,
                totalScans: 0,
                successfulScans: 0,
                failedScans: 0,
                hours: 0,
                parts_completed: 0
              };
            }
            
            // Convertir duration a horas si es necesario
            let durationInHours = 0;
            if (entry.duration) {
              if (typeof entry.duration === 'string' && entry.duration.includes(':')) {
                // Formato HH:MM:SS
                const [hours, minutes, seconds] = entry.duration.split(':').map(Number);
                durationInHours = hours + (minutes / 60) + (seconds / 3600);
              } else if (typeof entry.duration === 'number') {
                // Asumir que está en segundos
                durationInHours = entry.duration / 3600;
              }
            }
            
            acc[techName].hours += durationInHours;
            acc[techName].parts_completed += entry.parts_completed || 0;
            return acc;
          }, {})
        : {};

      // Obtener técnicos únicos con sus horas trabajadas - solo baterías (como respaldo)
      const technicianStatsFromCheckpoints = batteryCheckpoints.reduce((acc: any, cp: any) => {
        // Usar mapeo dinámico de usuarios si está disponible, sino usar el nombre del usuario o fallback
        const techName = cp.user_id ? (usersMap[cp.user_id] || `Técnico ID ${cp.user_id}`) : (cp.user?.name || 'Técnico Desconocido');
        if (!acc[techName]) {
          acc[techName] = {
            name: techName,
            totalScans: 0,
            successfulScans: 0,
            failedScans: 0,
            hours: 0
          };
        }
        acc[techName].totalScans++;
        if (cp.status === 'ok') acc[techName].successfulScans++;
        if (cp.status === 'failed') acc[techName].failedScans++;
        return acc;
      }, {});

      // Calcular horas trabajadas (estimación basada en checkpoints de baterías)
      Object.values(technicianStatsFromCheckpoints).forEach((tech: any) => {
        tech.hours = Math.round(tech.totalScans * 0.5); // Estimación: 0.5 horas por checkpoint
      });

      // Usar datos de time_entries si están disponibles, sino usar checkpoints
      const technicianStats: Array<{
        name: string;
        totalScans: number;
        successfulScans: number;
        failedScans: number;
        hours: number;
      }> = Object.keys(technicianStatsFromTimeEntries).length > 0 
        ? Object.values(technicianStatsFromTimeEntries) as Array<{
          name: string;
          totalScans: number;
          successfulScans: number;
          failedScans: number;
          hours: number;
        }>
        : Object.values(technicianStatsFromCheckpoints) as Array<{
          name: string;
          totalScans: number;
          successfulScans: number;
          failedScans: number;
          hours: number;
        }>;
      const todayUniqueBatteries = [...new Set(todayBatteryCheckpoints.map((cp: any) => cp.scanned_code))];
      const todayTotalParts = todayUniqueBatteries.length;
      
      const todaySuccessfulParts = [...new Set(
        todayBatteryCheckpoints
          .filter((cp: any) => cp.status === 'ok')
          .map((cp: any) => cp.scanned_code)
      )].length;
      
      const todayFailedParts = [...new Set(
        todayBatteryCheckpoints
          .filter((cp: any) => cp.status === 'failed')
          .map((cp: any) => cp.scanned_code)
      )].length;

      // Calcular proyecciones hasta las 18:00
      const currentTime = new Date();
      const endOfDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 18, 0, 0);
      const timeUntil18 = (endOfDay.getTime() - currentTime.getTime()) / (1000 * 60 * 60); // Horas hasta las 18:00
      
      // Calcular tasa de producción por hora (partes por hora)
      const hoursWorkedToday = Math.max(1, (currentTime.getTime() - todayStart.getTime()) / (1000 * 60 * 60));
      const productionRatePerHour = todayTotalParts / hoursWorkedToday;
      
      // Proyección de partes hasta las 18:00
      const projectedPartsUntil18 = Math.round(todayTotalParts + (productionRatePerHour * timeUntil18));
      
      // Proyección de cajas hasta las 18:00 (asumiendo 1 caja = 1 parte para simplificar)
      const projectedBoxesUntil18 = Math.round(projectedPartsUntil18);
      
      // Calcular tiempo promedio real por caja desde panasonic_quality_questions
      const avgBoxTimeFromQuality = qualityQuestions.length > 0 
        ? qualityQuestions
            .filter((q: any) => q.avg_box_time && q.avg_box_time > 0)
            .reduce((sum: number, q: any) => sum + q.avg_box_time, 0) / 
          qualityQuestions.filter((q: any) => q.avg_box_time && q.avg_box_time > 0).length
        : 0;
      
      // Tiempo promedio por caja en minutos (usar datos reales si están disponibles, sino estimación)
      const avgTimePerBox = avgBoxTimeFromQuality > 0 
        ? Math.round((avgBoxTimeFromQuality / 60) * 10) / 10 // Convertir de segundos a minutos
        : (todayTotalParts > 0 ? (hoursWorkedToday * 60) / todayTotalParts : 0);

      // Debug logs para verificar los cálculos
      console.log('ReportePDF: Estadísticas calculadas (solo baterías):');
      console.log('- Total baterías únicas:', totalParts);
      console.log('- Baterías exitosas únicas:', successfulParts);
      console.log('- Baterías fallidas únicas:', failedParts);
      console.log('- Total hoy baterías únicas:', todayTotalParts);
      console.log('- Exitosas hoy baterías únicas:', todaySuccessfulParts);
      console.log('- Fallidas hoy baterías únicas:', todayFailedParts);
      console.log('- Códigos de baterías únicos encontrados:', uniqueBatteries);
      console.log('- Total checkpoints de baterías:', batteryCheckpoints.length);
      console.log('- Categorías totales (partes únicas):', categoryStatsCounts);
      console.log('- Categorías hoy (partes únicas):', todayCategoryStatsCounts);
      console.log('ReportePDF: Estadísticas de time_entries:');
      console.log('- Técnicos únicos desde time_entries:', uniqueTechniciansFromTimeEntries);
      console.log('- Horas totales desde time_entries:', totalHoursFromTimeEntries);
      console.log('- Total time_entries encontrados:', timeEntries.length);
      console.log('ReportePDF: Proyecciones hasta las 18:00:');
      console.log('- Horas trabajadas hoy:', hoursWorkedToday);
      console.log('- Tasa de producción por hora:', productionRatePerHour);
      console.log('- Tiempo hasta las 18:00 (horas):', timeUntil18);
      console.log('- Partes proyectadas hasta 18:00:', projectedPartsUntil18);
      console.log('- Cajas proyectadas hasta 18:00:', projectedBoxesUntil18);
      console.log('- Tiempo promedio por caja (min):', avgTimePerBox);
      console.log('ReportePDF: Tiempo promedio por caja:');
      console.log('- Tiempo promedio desde quality_questions (seg):', avgBoxTimeFromQuality);
      console.log('- Tiempo promedio final (min):', avgTimePerBox);
      console.log('- Total quality_questions encontrados:', qualityQuestions.length);
      console.log('ReportePDF: Estadísticas de técnicos:');
      console.log('- Técnicos desde time_entries:', Object.keys(technicianStatsFromTimeEntries));
      console.log('- Técnicos finales:', technicianStats);

      const processedData: ReportData = {
        totalScans: totalParts,
        successfulScans: successfulParts,
        failedScans: failedParts,
        categories: categoryStatsCounts,
        dateRange: {
          start: checkpoints.length > 0 ? new Date(Math.min(...checkpoints.map((cp: any) => new Date(cp.timestamp).getTime()))).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          end: checkpoints.length > 0 ? new Date(Math.max(...checkpoints.map((cp: any) => new Date(cp.timestamp).getTime()))).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        },
        technicians: [...new Set(checkpoints.map((cp: any) => {
          // Usar mapeo dinámico de usuarios si está disponible
          return cp.user_id ? (usersMap[cp.user_id] || `Técnico ID ${cp.user_id}`) : (cp.user?.name || 'Técnico Desconocido');
        }))] as string[],
        uniqueTechniciansFromTimeEntries: uniqueTechniciansFromTimeEntries,
        totalHoursFromTimeEntries: Math.round(totalHoursFromTimeEntries * 100) / 100, // Redondear a 2 decimales
        // Datos adicionales para el reporte
        todayStats: {
          totalScans: todayTotalParts,
          successfulScans: todaySuccessfulParts,
          failedScans: todayFailedParts,
          categories: todayCategoryStatsCounts,
          projectedPartsUntil18: projectedPartsUntil18,
          projectedBoxesUntil18: projectedBoxesUntil18,
          avgTimePerBox: Math.round(avgTimePerBox * 10) / 10 // Redondear a 1 decimal
        },
        technicianStats: technicianStats,
        totalHours: Object.values(technicianStats).reduce((sum: number, tech: any) => sum + tech.hours, 0),
        efficiency: totalParts > 0 ? Math.round((successfulParts / totalParts) * 100) : 0
      };

      setReportData(processedData);
      console.log('ReportePDF: Datos procesados y guardados correctamente');

    } catch (err) {
      console.error('ReportePDF: Error loading project data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      console.log('ReportePDF: Finalizando carga de datos, setLoading(false)');
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!reportRef.current) {
      console.error('No se encontró el elemento del reporte');
      return;
    }

    try {
      console.log('Generando PDF...');
      
      // Mostrar loading
      setLoading(true);
      
      // Configurar html2canvas para capturar el reporte
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Mayor resolución
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: reportRef.current.scrollWidth,
        height: reportRef.current.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });

      // Crear PDF en formato horizontal (A4 landscape)
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Calcular dimensiones para ajustar la imagen al PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calcular el ratio para mantener proporciones
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // Centrar la imagen en el PDF
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      // Agregar la imagen al PDF
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      // Generar nombre del archivo con fecha y hora
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `Reporte_${project?.name || 'Proyecto'}_${timestamp}.pdf`;
      
      // Descargar el PDF
      pdf.save(fileName);
      
      console.log('PDF generado exitosamente:', fileName);
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      setError('Error al generar el PDF. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Debug logs
  console.log('ReportePDF render state:', { loading, error, project: !!project, reportData: !!reportData });

  if (loading) {
    console.log('ReportePDF: Mostrando loading overlay');
    return (
      <Container size="xl" py="md">
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (error) {
    console.log('ReportePDF: Mostrando error:', error);
    return (
      <Container size="xl" py="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!project) {
    console.log('ReportePDF: No hay proyecto cargado');
    return (
      <Container size="xl" py="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          No se pudo cargar la información del proyecto
        </Alert>
      </Container>
    );
  }

  console.log('ReportePDF: Renderizando contenido principal');

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .report-container {
              width: 297mm !important;
              height: 210mm !important;
              margin: 0 !important;
              padding: 10mm !important;
              background-color: white !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>
      <div 
        ref={reportRef}
        className="report-container"
        style={{ 
          width: '297mm', 
          minHeight: '210mm', 
          margin: '0 auto', 
          backgroundColor: '#f8f9fa',
          padding: '10mm',
          boxSizing: 'border-box'
        }}
      >
      {/* Header del Reporte */}
      <Paper 
        shadow="sm" 
        p="xl" 
        mb="md" 
        style={{ 
          position: 'relative', 
          backgroundColor: 'white',
          backgroundImage: `url(${panaback})`,
          backgroundSize: 'contain',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
          height: '180px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Overlay para mejorar legibilidad - solo en la parte izquierda */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '60%',
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1
        }} />
        
        {/* Botones de acción */}
        <Group justify="space-between" mb="lg" style={{ position: 'relative', zIndex: 2 }}>
          <Text size="sm" c="dimmed" fw={500}>
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
          
          <Group>
            <Button
              variant="outline"
              leftSection={<IconSettings size={16} />}
              onClick={() => setSettingsModalOpen(true)}
            >
              Configuración
            </Button>
            <Button
              variant="outline"
              leftSection={<IconPrinter size={16} />}
              onClick={handlePrint}
            >
              Imprimir
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleGeneratePDF}
            >
              Descargar PDF
            </Button>
          </Group>
        </Group>
        
        {/* Información principal del proyecto */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center' }}>
          <Stack gap="xs" style={{ width: '100%' }}>
            <Group gap="md" align="center">
              <Title order={1} c="blue.6">
                {project.name}
              </Title>
              <Badge 
                color={project.status === 'en-progreso' ? 'green' : project.status === 'completado' ? 'blue' : project.status === 'activo' ? 'green' : 'gray'}
                size="lg"
              >
                {project.status === 'en-progreso' ? 'En Progreso' : project.status === 'completado' ? 'Completado' : project.status === 'activo' ? 'Activo' : 'Inactivo'}
              </Badge>
            </Group>
            <Text size="lg" c="dimmed">
              {project.client}
            </Text>
          </Stack>
        </div>
      </Paper>

      {/* Resumen de datos del reporte */}
      {reportData && (
        <Paper shadow="sm" p="xl" mb="md" style={{ backgroundColor: 'white' }}>
            <Group justify="space-between" align="center" mb="md">
              <Title order={3} c="blue.6">
                Resumen de Datos del Reporte
              </Title>
              <Stack gap="xs" align="flex-end" style={{ minWidth: '200px' }}>
                <Text size="sm" c="dimmed" fw={500}>
                  Progreso del Proyecto
                </Text>
                <Progress 
                  value={Math.round((project.completed_parts / project.total_parts) * 100) || 0} 
                  size="lg" 
                  radius="md"
                  color="blue"
                  style={{ width: '200px' }}
                />
                <Text size="sm" c="blue" fw={600}>
                  {Math.round((project.completed_parts / project.total_parts) * 100) || 0}%
                </Text>
              </Stack>
            </Group>
            
          <Grid>
            {/* Sección Totales */}
            <Grid.Col span={6}>
              <Paper p="md" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <Stack gap="md">
                  <Text size="lg" fw={600} c="dark">
              Totales
            </Text>
            
            <Grid>
                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                  <Text size="xl" fw={700} c="blue.6">
                    {reportData.totalScans}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Partes
                  </Text>
                </Card>
              </Grid.Col>

                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                  <Text size="xl" fw={700} c="green.6">
                    {reportData.successfulScans}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Exitosos
                  </Text>
                </Card>
              </Grid.Col>

                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                  <Text size="xl" fw={700} c="red.6">
                    {reportData.failedScans}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Fallidos
                  </Text>
                </Card>
              </Grid.Col>

                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Group justify="space-between" align="center" mb="xs">
                      <Text size="xl" fw={700} c="orange.6">
                        {reportData.uniqueTechniciansFromTimeEntries || reportData.technicians.length}
                      </Text>
                      <Group gap="xs" align="center">
                        <IconUsers size={14} color="var(--mantine-color-orange-6)" />
                        <Text size="xs" c="orange" fw={500}>
                              ({reportData.totalHoursFromTimeEntries || reportData.totalHours}) Horas
                            </Text>
                          </Group>
                        </Group>
                        <Text size="sm" c="dimmed">
                          Técnicos Involucrados
                        </Text>
                </Card>
              </Grid.Col>
            </Grid>
                </Stack>
              </Paper>
            </Grid.Col>

            {/* Sección Hoy */}
            <Grid.Col span={6}>
              <Paper p="md" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <Stack gap="md">
                  <Text size="lg" fw={600} c="dark">
              Hoy ({new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })})
            </Text>
            
            <Grid>
                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Group justify="space-between" align="center" mb="xs">
                      <Text size="xl" fw={700} c="blue.6">
                        {reportData.todayStats.totalScans}
                      </Text>
                      <Group gap="xs" align="center">
                        <IconTrendingUp size={14} color="var(--mantine-color-blue-6)" />
                        <Text size="xs" c="blue" fw={500}>
                              →{reportData.todayStats.projectedPartsUntil18} a las 18:00
                            </Text>
                          </Group>
                        </Group>
                        <Text size="sm" c="dimmed">
                          Partes
                        </Text>
                </Card>
              </Grid.Col>

                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                  <Text size="xl" fw={700} c="green.6">
                    {reportData.todayStats.successfulScans}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Exitosos
                  </Text>
                </Card>
              </Grid.Col>

                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                  <Text size="xl" fw={700} c="red.6">
                    {reportData.todayStats.failedScans}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Fallidos
                  </Text>
                </Card>
              </Grid.Col>

                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Group justify="space-between" align="center" mb="xs">
                      <Text size="xl" fw={700} c="orange.6">
                        {reportData.todayStats.avgTimePerBox}
                      </Text>
                      <Group gap="xs" align="center">
                        <IconTrendingUp size={14} color="var(--mantine-color-orange-6)" />
                        <Text size="xs" c="orange" fw={500}>
                              →{reportData.todayStats.projectedBoxesUntil18} cajas a las 18:00
                            </Text>
                          </Group>
                        </Group>
                        <Text size="sm" c="dimmed">
                          Tiempo por caja (min)
                        </Text>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>
            </Grid.Col>
          </Grid>
          
          {/* Cards adicionales */}
          <Grid mt="md">
            <Grid.Col span={6}>
              <Paper p="md" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <Stack gap="md">
                  <Text size="lg" fw={600} c="dark">
                    Análisis de Calidad
                  </Text>
                  
                  <Stack gap="md">
                      <Card withBorder p="md" style={{ backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Text size="sm" fw={600} c="dark" mb="sm">
                          Distribución por Categoría - Total
                        </Text>
                        <div style={{ 
                          height: '160px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '0 8px'
                        }}>
                          {Object.entries(reportData.categories)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .slice(0, 5).map(([category, count], index) => {
                            const colors = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];
                            const total = Object.values(reportData.categories).reduce((sum, val) => sum + val, 0);
                            const percentage = total > 0 ? (count / total) * 360 : 0;
                            
                            return (
                              <div key={category} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                  width: '80px', 
                                  height: '80px', 
                                  borderRadius: '50%',
                                  background: `conic-gradient(${colors[index]} 0deg ${percentage}deg, #e9ecef ${percentage}deg 360deg)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative'
                                }}>
                                  <div style={{
                                    width: '50px',
                                    height: '50px',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Text size="sm" c="dark" fw={700}>{count}</Text>
                                  </div>
                                </div>
                                <Text size="sm" c="dimmed" ta="center" fw={500}>{category}</Text>
                              </div>
                            );
                          })}
                        </div>
                      </Card>

                      <Card withBorder p="md" style={{ backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Text size="sm" fw={600} c="dark" mb="sm">
                          Distribución por Categoría - Hoy
                        </Text>
                        <div style={{ 
                          height: '160px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '0 8px'
                        }}>
                          {Object.entries(reportData.todayStats.categories)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .slice(0, 5).map(([category, count], index) => {
                            const colors = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];
                            const total = Object.values(reportData.todayStats.categories).reduce((sum, val) => sum + val, 0);
                            const percentage = total > 0 ? (count / total) * 360 : 0;
                            
                            return (
                              <div key={category} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                  width: '80px', 
                                  height: '80px', 
                                  borderRadius: '50%',
                                  background: `conic-gradient(${colors[index]} 0deg ${percentage}deg, #e9ecef ${percentage}deg 360deg)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative'
                                }}>
                                  <div style={{
                                    width: '50px',
                                    height: '50px',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Text size="sm" c="dark" fw={700}>{count}</Text>
                                  </div>
                                </div>
                                <Text size="sm" c="dimmed" ta="center" fw={500}>{category}</Text>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                  </Stack>
                </Stack>
              </Paper>
            </Grid.Col>

            <Grid.Col span={6}>
              <Paper p="md" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <Stack gap="md">
                  <Text size="lg" fw={600} c="dark">
                    Análisis de Tiempo
                  </Text>
                  
                  <Grid>
                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Text size="xl" fw={700} c="blue.6">
                          {reportData.totalHoursFromTimeEntries || reportData.totalHours}h
                        </Text>
                        <Text size="sm" c="dimmed">
                          Horas Trabajadas
                        </Text>
                        <Text size="xs" c="green" fw={500} mt="xs">
                          {reportData.totalHoursFromTimeEntries > 0 ? 'Datos reales' : reportData.totalHours > 0 ? 'Estimado' : 'Sin datos'}
                        </Text>
                      </Card>
                    </Grid.Col>

                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Text size="xl" fw={700} c="green.6">
                          {reportData.efficiency}%
                        </Text>
                        <Text size="sm" c="dimmed">
                          Eficiencia
                        </Text>
                        <Text size="xs" c="green" fw={500} mt="xs">
                          {reportData.efficiency >= 90 ? '+5% vs objetivo' : reportData.efficiency >= 80 ? 'Objetivo alcanzado' : 'Por mejorar'}
                        </Text>
                      </Card>
                    </Grid.Col>
                  </Grid>
                  
                  <Grid mt="md">
                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Text size="sm" fw={600} c="dark" mb="sm">
                          Distribución Semanal
                        </Text>
                        <div style={{ 
                          height: '140px', 
                          display: 'flex', 
                          alignItems: 'end', 
                          justifyContent: 'space-between',
                          padding: '0 4px'
                        }}>
                          <div style={{ 
                            width: '30px', 
                            height: '45px', 
                            backgroundColor: '#1e40af', 
                            borderRadius: '2px 2px 0 0'
                          }}></div>
                          <div style={{ 
                            width: '30px', 
                            height: '75px', 
                            backgroundColor: '#3b82f6', 
                            borderRadius: '2px 2px 0 0'
                          }}></div>
                          <div style={{ 
                            width: '30px', 
                            height: '90px', 
                            backgroundColor: '#60a5fa', 
                            borderRadius: '2px 2px 0 0'
                          }}></div>
                          <div style={{ 
                            width: '30px', 
                            height: '65px', 
                            backgroundColor: '#93c5fd', 
                            borderRadius: '2px 2px 0 0'
                          }}></div>
                          <div style={{ 
                            width: '30px', 
                            height: '100px', 
                            backgroundColor: '#dbeafe', 
                            borderRadius: '2px 2px 0 0'
                          }}></div>
                        </div>
                        <Text size="xs" c="dimmed" mt="xs" ta="center">
                          Lun Mar Mié Jue Vie
                  </Text>
                      </Card>
                    </Grid.Col>

                    <Grid.Col span={6}>
                      <Card withBorder p="md" style={{ backgroundColor: 'white', border: '1px solid #e9ecef' }}>
                        <Text size="sm" fw={600} c="dark" mb="sm">
                          Tiempo por Técnico
                  </Text>
                        <div style={{ height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          {reportData.technicianStats.slice(0, 4).map((tech, index) => {
                            const colors = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'];
                            const maxHours = Math.max(...reportData.technicianStats.map(t => t.hours), 1);
                            const percentage = (tech.hours / maxHours) * 100;
                            
                            return (
                              <div key={tech.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text size="sm" c="dimmed">{tech.name}</Text>
                                <div style={{ width: '80px', height: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                                  <div style={{ 
                                    width: `${percentage}%`, 
                                    height: '100%', 
                                    backgroundColor: colors[index], 
                                    borderRadius: '4px' 
                                  }}></div>
                                </div>
                                <Text size="sm" c="dark" fw={500}>{tech.hours}h</Text>
                              </div>
                            );
                          })}
                        </div>
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>
            </Grid.Col>
          </Grid>
        </Paper>
      )}


      {/* Header de información del proyecto */}
      <Paper shadow="sm" p="md" mb="md" style={{ backgroundColor: 'white' }}>
        <Group justify="space-between" align="center">
          <Group gap="lg">
            <Group gap="xs">
              <ThemeIcon color="green" variant="light" size="sm">
                <IconMapPin size={16} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text size="xs" c="dimmed" fw={500}>UBICACIÓN</Text>
                <Text size="sm" c="dark" fw={600}>
                  {project.location?.plant_name || 'No especificado'}
                </Text>
              </Stack>
            </Group>
            
            <Group gap="xs">
              <ThemeIcon color="orange" variant="light" size="sm">
                <IconUser size={16} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text size="xs" c="dimmed" fw={500}>CONTACTO</Text>
                <Text size="sm" c="dark" fw={600}>
                  {project.location?.contact_name || 'No especificado'}
                </Text>
        </Stack>
            </Group>
          </Group>
          
          <Group gap="md">
            <Text size="xs" c="dimmed">
              {project.location?.contact_phone || 'Sin teléfono'}
            </Text>
            <Text size="xs" c="dimmed">
              {project.location?.contact_email || 'Sin email'}
            </Text>
          </Group>
        </Group>
      </Paper>

      {/* Modal de configuración */}
      <Modal
        opened={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Configuración del Reporte"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Título del Reporte"
            value={reportSettings.title}
            onChange={(e) => setReportSettings(prev => ({
              ...prev,
              title: e.target.value
            }))}
          />
          
          <DatePickerInput
            label="Fecha de Inicio"
            value={reportSettings.dateRange.start}
            onChange={(date: Date | null) => setReportSettings(prev => ({
              ...prev,
              dateRange: { ...prev.dateRange, start: date || new Date() }
            }))}
          />
          
          <DatePickerInput
            label="Fecha de Fin"
            value={reportSettings.dateRange.end}
            onChange={(date: Date | null) => setReportSettings(prev => ({
              ...prev,
              dateRange: { ...prev.dateRange, end: date || new Date() }
            }))}
          />
          
          <Button onClick={() => setSettingsModalOpen(false)}>
            Guardar Configuración
          </Button>
        </Stack>
      </Modal>
      </div>
    </>
  );
};

export default ReportePDF;
