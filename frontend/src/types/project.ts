export interface ProjectDocument {
    name: string;
    type: string;
    url: string;
    size: number;
    file?: File;  // Archivo original para subir al servidor
}

// Interfaz que coincide con la estructura de la base de datos
export interface ProjectFromAPI {
    id: number;
    name: string;
    status: string;
    client: string;
    start_date: string;
    end_date: string;
    progress: number;
    total_parts: number;
    completed_parts: number;
    project_type: string;
    city_image: string;
    description?: string;
    company_id: number;
    last_technician_name?: string;
    last_technician_id?: number;
    last_technician_date?: string;
    last_technician_action?: string;
    assigned_to?: string[];
    location?: {
        plant_name?: string;
        plant_address?: string;
        plant_coordinates?: string;
        contact_name?: string;
        contact_phone?: string;
        contact_email?: string;
        hotel_name?: string;
        hotel_address?: string;
        hotel_coordinates?: string;
        hotel_phone?: string;
    };
    documents?: ProjectDocument[];
    equipment?: string[];
}

// Interfaz para el frontend
export interface Project {
    id: number;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: string;
    company_id: number;
    client: string;
    progress: number;
    total_parts: number;
    completed_parts: number;
    project_type: string;
    city_image: string;
    requires_hotel: boolean;
    assigned_to: string[];
    last_technician: {
        name: string;
        date: string;
        action: string;
    };
    location: {
        plant_name: string;
        plant_address: string;
        plant_coordinates: string;
        contact_name: string;
        contact_phone: string;
        contact_email: string;
        hotel_name: string;
        hotel_address: string;
        hotel_coordinates: string;
        hotel_phone: string;
    };
    documents: ProjectDocument[];
    equipment: string[];
}

// Asegurarnos de que estos tipos estén definidos
type HotelImageMap = {
    'Fiesta': {
        thumbnail: string;
        full: string;
    };
    default: {
        thumbnail: string;
        full: string;
    };
};

type PlantImageMap = {
    'APTIV': {
        thumbnail: string;
        full: string;
    };
    default: {
        thumbnail: string;
        full: string;
    };
};

const plantImages: PlantImageMap = {
    'APTIV': {
        thumbnail: '/images/plants/aptiv.png',
        full: '/images/plants/aptiv-full.jpg'
    },
    'default': {
        thumbnail: '/images/plants/default-plant.png',
        full: '/images/plants/default-plant-full.jpg'
    }
};

const hotelImages: HotelImageMap = {
    'Fiesta': {
        thumbnail: '/images/hotels/fiesta-inn.jpg',
        full: '/images/hotels/fiesta-inn-full.jpg'
    },
    'default': {
        thumbnail: '/images/hotels/default-hotel.jpg',
        full: '/images/hotels/default-hotel-full.jpg'
    }
};