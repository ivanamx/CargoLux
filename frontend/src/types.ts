export interface Project {
    id: number;
    name: string;
    status: 'activo' | 'completado' | 'en-progreso';
    client: string;
    start_date: string;
    end_date: string;
    progress: number;
    assigned_to: string[];
    location: {
        plant: {
            address: string;
            coordinates: string;
            contact: {
                name: string;
                phone: string;
                email: string;
            };
        };
        hotel: {
            name: string;
            address: string;
            coordinates: string;
            phone: string;
        };
    };
    city_image: string;
    documents: Array<{
        name: string;
        type: string;
        url: string;
    }>;
    equipment: string[];
    last_technician: {
        name: string;
        date: string;
        action: string;
    };
    total_parts: number;
    completed_parts: number;
}

export interface RecentActivity {
    id: number;
    type: 'check-in' | 'check-out' | 'project-update';
    user: string;
    user_name: string;
    status: 'presente' | 'ausente' | 'tarde';
    timestamp: string;
    details: string;
}

export interface Employee {
    id: number;
    avatar: string;
    name: string;
    location: string;
    status: 'presente' | 'ausente' | 'incapacidad';
    phone: string;
    email: string;
    project?: string;
} 