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
    assigned_user_id?: number;
    assigned_at?: string;
    description?: string;
    resolved_at?: string;
    assigned_user?: {
        id: number;
        full_name: string;
        email: string;
        phone: string;
        location: string;
        avatar?: string;
    };
}

// Interfaz para la respuesta de conteo de issues
export interface IssuesCountResponse {
    count: number;
    status: string;
}

// Interfaz para asignación de técnico a problema
export interface IssueAssignmentRequest {
    issue_id: number;
    assigned_user_id?: number; // None para desasignar
}

// Interfaz para respuesta de asignaciones
export interface IssueAssignmentResponse {
    assignments: Array<{
        issue_id: number;
        issue_type: string;
        issue_project: string;
        issue_location: string;
        assigned_at: string;
        technician: {
            id: number;
            full_name: string;
            email: string;
            phone: string;
            location: string;
            avatar?: string;
        };
    }>;
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
    },

    // Asignar técnico a problema
    assignTechnician: async (assignment: IssueAssignmentRequest): Promise<Issue> => {
        try {
            console.log('Asignando técnico a problema:', assignment);
            const response = await apiClient.post('/api/issues/assign', assignment);
            console.log('Técnico asignado exitosamente:', response);
            return response;
        } catch (error) {
            console.error('Error assigning technician:', error);
            throw error;
        }
    },

    // Desasignar técnico de problema
    unassignTechnician: async (issueId: number): Promise<Issue> => {
        try {
            console.log('Desasignando técnico del problema:', issueId);
            const response = await apiClient.post('/api/issues/assign', {
                issue_id: issueId,
                assigned_user_id: null
            });
            console.log('Técnico desasignado exitosamente:', response);
            return response;
        } catch (error) {
            console.error('Error unassigning technician:', error);
            throw error;
        }
    },

    // Obtener todas las asignaciones
    getAssignments: async (): Promise<IssueAssignmentResponse> => {
        try {
            console.log('Obteniendo asignaciones...');
            const response = await apiClient.get('/api/issues/assignments');
            console.log('Asignaciones obtenidas:', response);
            return response;
        } catch (error) {
            console.error('Error getting assignments:', error);
            throw error;
        }
    }
};
