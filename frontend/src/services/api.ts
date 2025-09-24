// Definir la interfaz localmente
interface Credentials {
    username: string;
    password: string;
}

import { getToken, removeToken, refreshAccessToken } from './auth';
import axios from 'axios';
import type { Project, ProjectDocument, ProjectFromAPI } from '../types/project';
import { cityImages, getCityFromAddress, predefinedClients, predefinedPlants } from '../data/projectsData';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

// Define Axios error types
interface AxiosError {
    response?: {
        data: {
            detail?: string;
        };
        status: number;
    };
    request?: any;
    message: string;
}

// 1. Definir el tipo para errores de axios
type AxiosErrorResponse = {
    response?: {
        data: {
            detail: string | Record<string, unknown>;
        };
    };
};

interface ApiResponse<T = any> {
    data: T;
    status: number;
    // ... otros campos necesarios
}

interface ApiError {
    response?: {
        data: any;
        status: number;
    };
    message: string;
}

export const API_URL = import.meta.env.VITE_API_URL || 'https://api.apizhe.lat';
console.log('API_URL configurada:', API_URL);

const getHeaders = () => {
    const token = getToken();
    console.log("=== API Headers ===");
    console.log("Token:", token);
    const headers = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    console.log("Final headers:", headers);
    return headers;
};

// Función para manejar el error 401 globalmente
function handleUnauthorized() {
    removeToken();
    notifications.show({
        title: 'Sesión expirada',
        message: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
        color: 'red',
    });
    window.location.href = '/login';
}

// Función para manejar el refresh automático de tokens
async function handleTokenRefresh(): Promise<boolean> {
    try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            handleUnauthorized();
            return false;
        }

        const newAccessToken = await refreshAccessToken(refreshToken);
        if (newAccessToken) {
            return true;
        } else {
            handleUnauthorized();
            return false;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        handleUnauthorized();
        return false;
    }
}

export const apiClient = {
    get: async (endpoint: string) => {
        try {
            let response = await fetch(`${API_URL}${endpoint}`, {
                headers: getHeaders()
            });
            
            // Si recibimos un 401, intentar refresh del token
            if (response.status === 401) {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    // Reintentar la petición con el nuevo token
                    response = await fetch(`${API_URL}${endpoint}`, {
                        headers: getHeaders()
                    });
                } else {
                    throw new Error('Unauthorized');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    post: async (endpoint: string, data: any) => {
        try {
            let response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            
            // Si recibimos un 401, intentar refresh del token
            if (response.status === 401) {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    // Reintentar la petición con el nuevo token
                    response = await fetch(`${API_URL}${endpoint}`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify(data)
                    });
                } else {
                    throw new Error('Unauthorized');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    put: async (endpoint: string, data: any) => {
        try {
            let response = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            
            // Si recibimos un 401, intentar refresh del token
            if (response.status === 401) {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    // Reintentar la petición con el nuevo token
                    response = await fetch(`${API_URL}${endpoint}`, {
                        method: 'PUT',
                        headers: getHeaders(),
                        body: JSON.stringify(data)
                    });
                } else {
                    throw new Error('Unauthorized');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    postFormData: async (endpoint: string, formData: FormData) => {
        try {
            let response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    // No incluir Content-Type, se establecerá automáticamente con FormData
                },
                body: formData
            });
            
            // Si recibimos un 401, intentar refresh del token
            if (response.status === 401) {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    // Reintentar la petición con el nuevo token
                    response = await fetch(`${API_URL}${endpoint}`, {
                        method: 'POST',
                        headers: {
                            ...getHeaders(),
                            // No incluir Content-Type, se establecerá automáticamente con FormData
                        },
                        body: formData
                    });
                } else {
                    throw new Error('Unauthorized');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    delete: async (endpoint: string) => {
        try {
            let response = await fetch(`${API_URL}${endpoint}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            
            // Si recibimos un 401, intentar refresh del token
            if (response.status === 401) {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    // Reintentar la petición con el nuevo token
                    response = await fetch(`${API_URL}${endpoint}`, {
                        method: 'DELETE',
                        headers: getHeaders()
                    });
                } else {
                    throw new Error('Unauthorized');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    putFormData: async (endpoint: string, formData: FormData) => {
        try {
            let response = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    ...getHeaders(),
                    // No incluir Content-Type, se establecerá automáticamente con FormData
                },
                body: formData
            });
            
            // Si recibimos un 401, intentar refresh del token
            if (response.status === 401) {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    // Reintentar la petición con el nuevo token
                    response = await fetch(`${API_URL}${endpoint}`, {
                        method: 'PUT',
                        headers: {
                            ...getHeaders(),
                            // No incluir Content-Type, se establecerá automáticamente con FormData
                        },
                        body: formData
                    });
                } else {
                    throw new Error('Unauthorized');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};

interface EmployeeFormData {
    firstName: string;
    lastName: string;
    secondLastName: string;
    location: string;
    phone: string;
    email: string;
    curp?: string;
    rfc?: string;
    birthDate?: string;
    startDate?: string;
    position?: string;
    salary?: string;
    vacationDays?: string;
    avatar: File | null;
    contractFile: File | null;
}

// Interfaces
interface Employee {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    location: string;
    status: string;
    role: string;
    avatar?: string;
    current_project?: string | null;
    personal_info?: {
        curp?: string;
        rfc?: string;
        birth_date?: string;
    };
    employment_info?: {
        position?: string;
        start_date?: string;
    };
}

export const employeeService = {
    createEmployee: async (employeeData: EmployeeFormData, avatar: File | null, contract: File | null) => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            console.log('Token:', token); // Debug
            
            const formData = new FormData();
            
            const { avatar: _, contractFile: __, ...employeeDataWithoutFiles } = employeeData;
            
            formData.append('employee', JSON.stringify({
                ...employeeDataWithoutFiles,
                salary: employeeData.salary ? parseFloat(employeeData.salary) : 0,
                vacationDays: employeeData.vacationDays ? parseInt(employeeData.vacationDays) : 0,
                company_id: 1
            }));

            if (avatar) {
                formData.append('avatar', avatar);
            }
            if (contract) {
                formData.append('contract', contract);
            }

            const response = await fetch(`${API_URL}/api/employees/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // No incluir Content-Type cuando se usa FormData
                },
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error response:', errorData);
                throw new Error(errorData.detail || 'Error creating employee');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        }
    },

    getEmployees: async () => {
        const token = getToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_URL}/api/employees/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error response:', errorData);
            throw new Error(errorData.detail || 'Error fetching employees');
        }

        return response.json();
    },

    getEmployeesWithLocations: async () => {
        const token = getToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_URL}/api/employees/with-locations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error response:', errorData);
            throw new Error(errorData.detail || 'Error fetching employees with locations');
        }

        return response.json();
    },

    updateEmployee: async (id: number, employeeData: EmployeeFormData, avatar: File | null, contract: File | null) => {
        const formData = new FormData();
        
        formData.append('employee', JSON.stringify({
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            secondLastName: employeeData.secondLastName,
            location: employeeData.location,
            phone: employeeData.phone,
            email: employeeData.email,
            curp: employeeData.curp,
            rfc: employeeData.rfc,
            birthDate: employeeData.birthDate,
            startDate: employeeData.startDate,
            position: employeeData.position,
            salary: employeeData.salary,
            vacationDays: employeeData.vacationDays,
            company_id: 1
        }));

        if (avatar !== null) {
            formData.append('avatar', avatar);
        }
        if (contract !== null) {
            formData.append('contract', contract);
        }

        return apiClient.putFormData(`/api/employees/${id}`, formData);
    },

    deleteEmployee: async (id: number) => {
        return apiClient.delete(`/api/employees/${id}`);
    },

    async getTechnicianByName(fullName: string): Promise<Employee> {
        try {
            const response = await axios.get(
                `${API_URL}/api/employees/technician/${encodeURIComponent(fullName)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                }
            );
            return response.data as Employee;
        } catch (error) {
            console.error('Error fetching technician data:', error);
            throw error;
        }
    },
};

// Definir interfaces para las respuestas
interface ApiResponse<T = any> {
    data: T;
    status: number;
}

interface ProjectResponse {
    id: number;
    name: string;
    // ... otros campos del proyecto
}

export const projectService = {
    createProject: async (formData: FormData) => {
        try {
            console.log('=== CREATE PROJECT ===');
            
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Log de los datos que se están enviando
            console.log('Datos del proyecto:', formData.get('project'));
            console.log('Archivos:', formData.getAll('files'));

            const response = await fetch(`${API_URL}/api/projects/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                throw new Error(errorData.detail || 'Error al crear el proyecto');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    },

    getProjects: async (): Promise<Project[]> => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/projects/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error fetching projects');
            }

            const data = await response.json();
            
            // Transformar los datos del API al formato del frontend
            const transformedProjects = data.map((project: ProjectFromAPI): Project => {
                console.log('\n=== Project Transformation Debug ===');
                console.log('Raw project data:', project);
                console.log('Assigned technicians:', project.assigned_to);
                console.log('Location data from backend:', project.location);
                
                const transformedProject: Project = {
                    id: project.id,
                    name: project.name,
                    description: project.description || null,
                    start_date: project.start_date,
                    end_date: project.end_date,
                    status: project.status,
                    company_id: project.company_id,
                    client: project.client,
                    progress: project.progress,
                    total_parts: project.total_parts,
                    completed_parts: project.completed_parts,
                    project_type: project.project_type,
                    city_image: project.city_image,
                    requires_hotel: !!(project.location?.hotel_name && project.location?.hotel_address),
                    assigned_to: Array.isArray(project.assigned_to) ? project.assigned_to : [],
                    last_technician: {
                        name: project.last_technician_name || '',
                        date: project.last_technician_date || '',
                        action: project.last_technician_action || ''
                    },
                    location: {
                        plant_name: project.location?.plant_name || '',
                        plant_address: project.location?.plant_address || '',
                        plant_coordinates: project.location?.plant_coordinates || '',
                        contact_name: project.location?.contact_name || '',
                        contact_phone: project.location?.contact_phone || '',
                        contact_email: project.location?.contact_email || '',
                        hotel_name: project.location?.hotel_name || '',
                        hotel_address: project.location?.hotel_address || '',
                        hotel_coordinates: project.location?.hotel_coordinates || '',
                        hotel_phone: project.location?.hotel_phone || ''
                    },
                    documents: project.documents || [],
                    equipment: project.equipment || []
                };
                
                console.log('Transformed project:', transformedProject);
                console.log('=== End Debug ===\n');
                
                return transformedProject;
            });
            
            return transformedProjects;
        } catch (error) {
            console.error('Error fetching projects:', error);
            throw error;
        }
    },

    recalculateProgress: async () => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await axios.post(
                `${API_URL}/api/projects/recalculate-progress`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('Error recalculating progress:', error);
            throw error;
        }
    },

    delete: async (id: number) => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/projects/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error deleting project');
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    },

    updateProject: async (id: number, data: any) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/projects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Error al actualizar el proyecto');
        }
        return response.json();
    },

    // Función para actualizar partes completadas en tiempo real
    updateProjectParts: async (projectId: number, partsCompleted: number): Promise<{message: string, project_id: number, completed_parts: number, progress: number}> => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/projects/${projectId}/update-parts`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parts_completed: partsCompleted
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error updating project parts');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating project parts:', error);
            throw error;
        }
    },

    // Función para obtener métricas de proyectos
    getProjectMetrics: async (): Promise<{
        daysRemaining: number;
        delayedProjects: number;
    }> => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/projects/metrics`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error fetching project metrics');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching project metrics:', error);
            throw error;
        }
    }
};

export type { Project } from '../types/project';

// Interfaces para Panasonic Checkpoints
interface PanasonicCheckpoint {
    id: number;
    session_id: string;
    checkpoint_type: string;
    checkpoint_number: number;
    scanned_code: string;
    scan_order?: number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
    user_id: number;
    project_id: number;
    status: string;
    categorie?: string;
    phase: string;
    // Campos adicionales para los 7 checkpoints extra
    checkpoint_7_storage_exit?: string;
    lat_7_storage_exit?: number;
    lon_7_storage_exit?: number;
    checkpoint_8_cd_arrival?: string;
    lat_8_cd_arrival?: number;
    lon_8_cd_arrival?: number;
    checkpoint_8_cde_exit?: string;
    lat_8_cde_exit?: number;
    lon_8_cde_exit?: number;
    checkpoint_10_e_arrival?: string;
    lat_10_e_arrival?: number;
    lon_10_e_arrival?: number;
    checkpoint_11_e_arrival?: string;
    lat_11_e_arrival?: number;
    lon_11_e_arrival?: number;
    checkpoint_11_e_exit?: string;
    lat_11_e_exit?: number;
    lon_11_e_exit?: number;
    checkpoint_ab_exit?: string;
    lat_ab_exit?: number;
    lon_ab_exit?: number;
}

interface PanasonicCheckpointCreate {
    session_id: string;
    checkpoint_type: string;
    checkpoint_number: number;
    scanned_code: string;
    scan_order?: number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    project_id: number;
    status?: string;
    categorie?: string;
    phase: string;
    // Campos adicionales para los 7 checkpoints extra
    checkpoint_7_storage_exit?: string;
    lat_7_storage_exit?: number;
    lon_7_storage_exit?: number;
    checkpoint_8_cd_arrival?: string;
    lat_8_cd_arrival?: number;
    lon_8_cd_arrival?: number;
    checkpoint_8_cde_exit?: string;
    lat_8_cde_exit?: number;
    lon_8_cde_exit?: number;
    checkpoint_10_e_arrival?: string;
    lat_10_e_arrival?: number;
    lon_10_e_arrival?: number;
    checkpoint_11_e_arrival?: string;
    lat_11_e_arrival?: number;
    lon_11_e_arrival?: number;
    checkpoint_11_e_exit?: string;
    lat_11_e_exit?: number;
    lon_11_e_exit?: number;
    checkpoint_ab_exit?: string;
    lat_ab_exit?: number;
    lon_ab_exit?: number;
}

// Interfaces para Panasonic Quality Questions
interface PanasonicQualityQuestion {
    id: number;
    session_id: string;
    user_id: number;
    project_id: number;
    phase: string;
    timestamp: string;
    // Respuestas de categorización (1-14)
    respuesta1?: string;
    respuesta2?: string;
    escaneo2?: string;
    respuesta3?: string;
    respuesta4?: string;
    respuesta5?: string;
    respuesta6?: string;
    respuesta7?: string;
    respuesta8?: string;
    respuesta9?: string;
    escaneo9?: string;
    respuesta10?: string;
    respuesta11?: string;
    respuesta12?: string;
    respuesta13?: string;
    respuesta14?: string;
    // Respuestas de reempacado (15-21)
    respuesta15?: string;
    escaneo15?: string;
    respuesta16?: string;
    respuesta17?: string;
    escaneo17?: string;
    respuesta18?: string;
    respuesta19?: string;
    respuesta20?: string;
    respuesta21?: string;
}

interface PanasonicQualityQuestionCreate {
    session_id: string;
    project_id: number;
    phase: string;
    // Respuestas de categorización (1-14)
    respuesta1?: string;
    respuesta2?: string;
    escaneo2?: string;
    respuesta3?: string;
    respuesta4?: string;
    respuesta5?: string;
    respuesta6?: string;
    respuesta7?: string;
    respuesta8?: string;
    respuesta9?: string;
    escaneo9?: string;
    respuesta10?: string;
    respuesta11?: string;
    respuesta12?: string;
    respuesta13?: string;
    respuesta14?: string;
    // Respuestas de reempacado (15-21)
    respuesta15?: string;
    escaneo15?: string;
    respuesta16?: string;
    respuesta17?: string;
    escaneo17?: string;
    respuesta18?: string;
    respuesta19?: string;
    respuesta20?: string;
    respuesta21?: string;
    // Campos para categorías de baterías (pregunta 14)
    battery1_code?: string;
    battery1_category?: string;
    battery2_code?: string;
    battery2_category?: string;
    
    // Campo para tiempo promedio por caja (en segundos)
    avg_box_time?: number;
}

// Servicios para Panasonic Checkpoints
export const panasonicCheckpointService = {
    createCheckpoint: async (checkpointData: PanasonicCheckpointCreate): Promise<PanasonicCheckpoint> => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/panasonic-checkpoints`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(checkpointData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error creating checkpoint');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating panasonic checkpoint:', error);
            throw error;
        }
    },

    getCheckpointsBySession: async (sessionId: string): Promise<PanasonicCheckpoint[]> => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/panasonic-checkpoints/session/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error fetching checkpoints');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching panasonic checkpoints by session:', error);
            throw error;
        }
    },

    getCheckpointsByProject: async (projectId: number): Promise<PanasonicCheckpoint[]> => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/panasonic-checkpoints/project/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error fetching checkpoints');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching panasonic checkpoints by project:', error);
            throw error;
        }
    }
};

// Servicios para Panasonic Quality Questions
export const panasonicQualityService = {
    createQualityCheck: async (qualityData: PanasonicQualityQuestionCreate): Promise<PanasonicQualityQuestion> => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/quality-check`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(qualityData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error creating quality check');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating panasonic quality check:', error);
            throw error;
        }
    },

    getQualityCheckBySession: async (sessionId: string): Promise<PanasonicQualityQuestion> => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/api/quality-check/session/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error fetching quality check');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching panasonic quality check by session:', error);
            throw error;
        }
    }
};

// Función para obtener geolocalización
export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
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
                console.error('Error getting location:', error);
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    });
};

// Función para generar session_id único
export const generateSessionId = (): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 15);
    return `SESSION_${timestamp}_${random}`;
}; 