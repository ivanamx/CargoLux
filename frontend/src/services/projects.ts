import { Project } from '../types';
import { API_URL } from './api';
import { getToken } from './auth';

export const projectService = {
    getAll: async () => {
        const token = getToken();
        if (!token) throw new Error('No hay sesión activa');

        const response = await fetch(`${API_URL}/projects`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('auth_token');
                window.location.href = '/login';
                throw new Error('Sesión expirada');
            }
            throw new Error('Error al obtener proyectos');
        }
        
        return response.json();
    },

    getById: async (id: number) => {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        if (!response.ok) {
            throw new Error('Error al obtener el proyecto');
        }
        return response.json();
    },

    create: async (project: Omit<Project, 'id'>) => {
        const token = getToken();
        if (!token) throw new Error('No hay sesión activa');

        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(project)
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('auth_token');
                window.location.href = '/login';
                throw new Error('Sesión expirada');
            }
            throw new Error('Error al crear proyecto');
        }

        return response.json();
    },

    update: async (id: number, project: Partial<Project>) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(project)
        });
        if (!response.ok) {
            throw new Error('Error al actualizar el proyecto');
        }
        return response.json();
    },

    delete: async (id: number) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Error al eliminar el proyecto');
        }
        return response.json();
    },

    getCompletedParts: async (projectId: number) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/projects/${projectId}/completed-parts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Error al obtener partes completadas');
        }
        return response.json();
    }
}; 