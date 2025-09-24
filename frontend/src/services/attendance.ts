import { API_URL } from './api';
import type { RecentActivity } from '../types/api';
import { notifications } from '@mantine/notifications';
import { getToken } from './auth';

interface CheckInData {
        latitude: number;
        longitude: number;
    status: string;
        projectId: number;
        photo?: string; // Base64 de la imagen
}

interface CheckOutData {
        latitude: number;
        longitude: number;
        projectId: number;
        photo?: string; // Base64 de la imagen
}

export interface TimeEntry {
    project_id: number;
    project_name: string;
    project_location: string;
    start_time: string;
    end_time: string | null;
    duration: number;
    parts_completed: number;
}

interface TimeEntryReport {
    id: string;
    technicianName: string;
    date: string;
    hours: number;
    project: string;
    status: 'pending' | 'approved' | 'rejected';
}

interface ReportData {
    projectId: number;
    description: string;
    hours: number;
    partsCompleted: number;
    notes?: string;
}

class AttendanceService {
    private api = {
        post: async (endpoint: string, data: any) => {
            const response = await fetch(`${API_URL}/api${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        get: async (endpoint: string) => {
            const response = await fetch(`${API_URL}/api${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        }
    };

    async checkIn(data: CheckInData) {
        try {
            console.log('🔵 Iniciando check-in...');
            const response = await this.api.post('/time-entries/check-in', data);
            console.log('📡 Respuesta del check-in:', response);
            
            window.dispatchEvent(new Event('attendance-updated'));
            console.log('📢 Evento attendance-updated disparado');
            
            if (response.project_status) {
                console.log('🏗️ project_status encontrado en check-in:', response.project_status);
                console.log('📢 Disparando evento project-status-updated...');
                window.dispatchEvent(new Event('project-status-updated'));
                console.log('✅ Evento project-status-updated disparado exitosamente');
            } else {
                console.log('❌ No se encontró project_status en la respuesta del check-in');
            }
            return response;
        } catch (error) {
            console.error('Error en check-in:', error);
            throw error;
        }
    }

    async checkOut(data: CheckOutData) {
        try {
            console.log('🚪 Iniciando check-out...');
            const response = await this.api.post('/time-entries/check-out', data);
            console.log('📡 Respuesta del check-out:', response);
            
            window.dispatchEvent(new Event('attendance-updated'));
            console.log('📢 Evento attendance-updated disparado');
            
            window.dispatchEvent(new CustomEvent('userStatusUpdate', {
                detail: { status: 'ausente' }
            }));
            console.log('👤 Evento userStatusUpdate disparado');
            
            if (response.project_status) {
                console.log('🏗️ project_status encontrado:', response.project_status);
                console.log('📢 Disparando evento project-status-updated...');
                window.dispatchEvent(new Event('project-status-updated'));
                console.log('✅ Evento project-status-updated disparado exitosamente');
            } else {
                console.log('❌ No se encontró project_status en la respuesta');
            }
            
            return response;
        } catch (error) {
            console.error('Error en check-out:', error);
            throw error;
        }
    }

    async getRecentActivity(): Promise<RecentActivity[]> {
        const response = await this.api.get('/attendance/recent');
        return response;
    }

    async getDailyTimeEntries(): Promise<TimeEntry[]> {
        try {
            console.log('Obteniendo entradas diarias...');
            const response = await this.api.get('/time-entries/daily');
            console.log('Respuesta del servidor:', response);
            
            if (!Array.isArray(response) || response.length === 0) {
                console.log('No hay entradas, buscando check-in activo...');
                
                const timeTracking = JSON.parse(localStorage.getItem('timeTracking') || '{}');
                console.log('Time tracking actual:', timeTracking);
                
                if (timeTracking.isActive && timeTracking.checkInTime) {
                    const activeProject = JSON.parse(localStorage.getItem('activeProject') || '{}');
                    console.log('Proyecto activo:', activeProject);
                    
                    if (activeProject.id) {
                        return [{
                            project_id: activeProject.id,
                            project_name: activeProject.name,
                            project_location: activeProject.location || 'Sin ubicación',
                            start_time: new Date().toISOString(),
                            end_time: null,
                            duration: timeTracking.hoursWorked || 0,
                            parts_completed: 0
                        }];
                    }
                }
            }
            
            return Array.isArray(response) ? response : [];
        } catch (error: any) {
            console.error('Error detallado al obtener entradas diarias:', {
                error,
                message: error?.message || 'Error desconocido',
                stack: error?.stack || ''
            });
            return [];
        }
    }

    async getTodayReports(): Promise<TimeEntryReport[]> {
        const response = await this.api.get('/time-entries/reports/today');
        return response;
    }

    async getCurrentFortnightReports(): Promise<TimeEntryReport[]> {
        const response = await this.api.get('/time-entries/reports/current-fortnight');
        return response;
    }

    async getPreviousFortnightReports(): Promise<TimeEntryReport[]> {
        const response = await this.api.get('/time-entries/reports/previous-fortnight');
        return response;
    }

    async getCurrentMonthReports(): Promise<TimeEntryReport[]> {
        const response = await this.api.get('/time-entries/reports/current-month');
        return response;
    }

    async getPreviousMonthReports(): Promise<TimeEntryReport[]> {
        const response = await this.api.get('/time-entries/reports/previous-month');
        return response;
    }

    async getDayStatus(): Promise<{ is_closed: boolean, closed_at?: string, closed_by?: string }> {
        try {
            const response = await this.api.get('/time-entries/day-status');
            return response;
        } catch (error) {
            console.error('Error al obtener estado del día:', error);
            throw error;
        }
    }

    async closeDay() {
        try {
            const response = await this.api.post('/time-entries/close-day', {
                date: new Date().toISOString().split('T')[0],
                closed_by: localStorage.getItem('user_id') || '',
                closed_at: new Date().toISOString()
            });

            // Disparar evento para actualizar otros componentes
            window.dispatchEvent(new Event('day-closed'));
            
            return response;
        } catch (error) {
            console.error('Error al cerrar el día:', error);
            throw error;
        }
    }

    async openDay() {
        try {
            const response = await this.api.post('/time-entries/open-day', {
                date: new Date().toISOString().split('T')[0],
                opened_by: localStorage.getItem('user_id') || '',
                opened_at: new Date().toISOString()
            });

            // Disparar evento para actualizar otros componentes
            window.dispatchEvent(new Event('day-opened'));
            
            return response;
        } catch (error) {
            console.error('Error al abrir el día:', error);
            throw error;
        }
    }

    async submitReport(data: ReportData) {
        try {
            const response = await this.api.post('/time-entries/report', data);
            return response;
        } catch (error) {
            console.error('Error al enviar reporte:', error);
            throw error;
        }
    }

    async sendTimeReportReminder() {
        try {
            const token = getToken();
            const response = await fetch(`${API_URL}/api/time-entries/send-reminder`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error al enviar recordatorios');
            }

            return await response.json();
        } catch (error) {
            console.error('Error en sendTimeReportReminder:', error);
            throw error;
        }
    }

    async getCurrentStatus() {
        try {
            const response = await this.api.get('/attendance/current-status');
            return response;
        } catch (error) {
            console.error('Error al obtener estado actual:', error);
            throw error;
        }
    }
}

export const attendanceService = new AttendanceService(); 