import { API_URL } from './api';
import { RecentActivity } from '../types';
import { notifications } from '@mantine/notifications';

interface CheckInData {
        latitude: number;
        longitude: number;
        status: 'presente' | 'ausente' | 'tarde';
        projectId: number;
    city: string;
}

interface CheckOutData {
        latitude: number;
        longitude: number;
        projectId: number;
    city: string;
}

class AttendanceService {
    async checkIn(data: CheckInData) {
        try {
            // Aquí iría la llamada a la API
            console.log('Check-in data:', data);
            
            // Emitir el evento de ubicación actualizada
            const locationEvent = new CustomEvent('locationUpdate', {
                detail: {
                    id: Date.now(), // Temporal, debería venir del backend
                    name: localStorage.getItem('userName') || 'Usuario',
                    coordinates: [data.latitude, data.longitude],
                    status: data.status === 'tarde' ? 'ausente' : data.status,
                    city: data.city,
                    checkInTime: new Date().toLocaleTimeString()
                }
            });
            window.dispatchEvent(locationEvent);
            
            return { success: true };
        } catch (error) {
            console.error('Error en check-in:', error);
            throw error;
        }
    }

    async checkOut(data: CheckOutData) {
        try {
            // Aquí iría la llamada a la API
            console.log('Check-out data:', data);
            
            // Emitir evento de eliminación de ubicación
            const locationEvent = new CustomEvent('locationRemove', {
                detail: {
                    id: Date.now() // Debería ser el mismo ID del check-in
                }
            });
            window.dispatchEvent(locationEvent);
            
            return { success: true };
        } catch (error) {
            console.error('Error en check-out:', error);
            throw error;
        }
    }

    async getRecentActivity(): Promise<RecentActivity[]> {
        const response = await fetch(`${API_URL}/api/attendance/recent`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch recent activity');
        }

        return response.json();
    }
}

export const attendanceService = new AttendanceService(); 