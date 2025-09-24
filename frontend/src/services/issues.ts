import { apiClient, API_URL } from './api';
import { getToken } from './auth';

// Interfaz para Issue
export interface Issue {
    id: number;
    type: string;
    part_number_vin: string;
    project: string;
    location: string;
    date_reported: string;
    status: 'pendiente' | 'en-revision' | 'resuelto';
    created_at: string;
    updated_at: string;
    created_by?: number;
    description?: string;
    resolved_at?: string;
}

// Interfaz para la respuesta de conteo de issues
export interface IssuesCountResponse {
    count: number;
    status: string;
}

export const issuesService = {
    // Obtener todos los issues
    getIssues: async (): Promise<Issue[]> => {
        try {
            console.log('Obteniendo todos los issues...');
            
            // Verificar si es admin y usar endpoint diferente
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = user.role === 'admin';
            
            if (isAdmin) {
                console.log('Usuario es admin, usando endpoint de cliente...');
                // Para admin, usar el mismo endpoint que el cliente
                try {
                    const response = await apiClient.get('/api/issues/?admin=true');
                    console.log('Issues obtenidos del endpoint admin:', response);
                    return response;
                } catch (error) {
                    console.log('Error con endpoint admin, usando endpoint normal:', error);
                    // Si falla, usar endpoint normal
                    const response = await apiClient.get('/api/issues/');
                    console.log('Issues obtenidos del endpoint normal:', response);
                    return response;
                }
            } else {
                // Para otros usuarios, usar endpoint normal
                const response = await apiClient.get('/api/issues/');
                console.log('Issues obtenidos:', response);
                return response;
            }
        } catch (error) {
            console.error('Error fetching issues:', error);
            // En caso de error, retornar array vacío para no romper la UI
            return [];
        }
    },

    // Obtener issues por status
    getIssuesByStatus: async (status: string): Promise<Issue[]> => {
        try {
            const response = await apiClient.get(`/api/issues?status=${status}`);
            return response;
        } catch (error) {
            console.log(`Status filter not supported, falling back to full list for status: ${status}`);
            // Si falla el filtro por status, obtener todos y filtrar en el frontend
            try {
                const allIssues = await apiClient.get('/api/issues');
                return allIssues.filter((issue: Issue) => issue.status === status);
            } catch (fallbackError) {
                console.error(`Error fetching issues with status ${status}:`, fallbackError);
                throw fallbackError;
            }
        }
    },

    // Contar issues por status
    getIssuesCountByStatus: async (status: string): Promise<number> => {
        try {
            const response = await apiClient.get(`/api/issues/count?status=${status}`);
            return response.count || 0;
        } catch (error) {
            console.error(`Error counting issues with status ${status}:`, error);
            throw error;
        }
    },

    // Obtener conteo de issues pendientes (método específico para el dashboard)
    getPendingIssuesCount: async (): Promise<number> => {
        try {
            console.log('Intentando obtener conteo de issues pendientes...');
            
            // Verificar si es admin y usar endpoint diferente
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = user.role === 'admin';
            
            if (isAdmin) {
                console.log('Usuario es admin, usando endpoint de cliente...');
                // Para admin, usar el mismo endpoint que el cliente
                try {
                    const response = await apiClient.get('/api/issues/count?status=pendiente&admin=true');
                    console.log('Conteo obtenido del endpoint admin:', response);
                    return response.count || 0;
                } catch (error) {
                    console.log('Error con endpoint admin, usando endpoint normal:', error);
                    // Si falla, usar endpoint normal
                    const response = await apiClient.get('/api/issues/count?status=pendiente');
                    console.log('Conteo obtenido del endpoint normal:', response);
                    return response.count || 0;
                }
            } else {
                // Para otros usuarios, usar endpoint normal
                const response = await apiClient.get('/api/issues/count?status=pendiente');
                console.log('Conteo obtenido del endpoint:', response);
                return response.count || 0;
            }
        } catch (error) {
            console.error('Error counting pending issues:', error);
            // En caso de error, retornar 0 para no romper la UI
            return 0;
        }
    },

    // Crear un nuevo issue
    createIssue: async (issueData: Partial<Issue>): Promise<Issue> => {
        try {
            const response = await apiClient.post('/api/issues/', issueData);
            return response;
        } catch (error) {
            console.error('Error creating issue:', error);
            throw error;
        }
    },

    // Actualizar un issue
    updateIssue: async (id: number, issueData: Partial<Issue>): Promise<Issue> => {
        try {
            const response = await apiClient.put(`/api/issues/${id}`, issueData);
            return response;
        } catch (error) {
            console.error('Error updating issue:', error);
            throw error;
        }
    },

    // Eliminar un issue
    deleteIssue: async (id: number): Promise<void> => {
        try {
            await apiClient.delete(`/api/issues/${id}`);
        } catch (error) {
            console.error('Error deleting issue:', error);
            throw error;
        }
    }
};
