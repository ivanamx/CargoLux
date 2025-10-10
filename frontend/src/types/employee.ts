export interface Employee {
    id: number;
    email: string;
    full_name: string;
    location: string;
    phone: string;
    status: 'presente' | 'ausente' | 'en-ruta' | 'problema';
    avatar?: string;
    personal_info: {
        curp: string;
        rfc: string;
        birth_date: string;
        first_name: string;
        last_name: string;
        second_last_name: string;
    };
    employment_info: {
        start_date: string;
        position: string;
        contract_file?: string;
    };
    hr_info: {
        salary: {
            base: number;
        };
        vacations: {
            days_total: number;
            days_used: number;
        };
    };
    project?: string; // Para compatibilidad con la asignación de proyectos
} 