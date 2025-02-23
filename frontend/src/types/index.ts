export interface Project {
    id: number;
    name: string;
    status: 'activo' | 'completado' | 'pendiente' | 'retrasado';
    client: string;
    startDate: string;
    endDate: string;
    progress: number;
    assignedTo: string[];
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
    cityImage: string;
    documents: Array<{
        name: string;
        type: string;
        url: string;
    }>;
    equipment: string[];
    lastTechnician: {
        name: string;
        date: string;
        action: string;
    };
    totalParts: number;
    completedParts: number;
}

export interface Credentials {
    username: string;
    password: string;
}

export interface RecentActivity {
    user_name: string;
    status: string;
    timestamp: string;
    time?: string;
} 