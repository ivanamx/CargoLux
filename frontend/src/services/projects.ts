import { Project } from '../types';

const API_URL = 'http://localhost:8000/api';

export const projectService = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/projects`);
        return response.json();
    },
    
    getById: async (id: number) => {
        const response = await fetch(`${API_URL}/projects/${id}`);
        return response.json();
    },
    
    create: async (project: Omit<Project, 'id'>) => {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        return response.json();
    },
    
    update: async (id: number, project: Partial<Project>) => {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        return response.json();
    }
}; 