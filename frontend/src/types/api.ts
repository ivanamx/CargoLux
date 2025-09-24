export interface ApiError {
    detail: string;
    status_code: number;
}

export interface ApiResponse<T> {
    data: T;
    message?: string;
    error?: ApiError;
}

export interface DashboardStats {
    total_users: number;
    active_users: number;
    total_projects: number;
    active_projects: number;
}

export interface RecentActivity {
    user_name: string;
    status: string;
    timestamp: string;
    type: 'check-in' | 'check-out';
    latitude: number;
    longitude: number;
    city: string;
    project_name: string;
} 