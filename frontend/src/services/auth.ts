import { API_URL } from './api';

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface User {
    id: number;
    email: string;
    role: 'admin' | 'tecnico' | 'developer' | 'client' | 'dre';
    full_name: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: User;
}

const TOKEN_KEY = 'token'; // Usar la misma clave en todos lados

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
        console.log('Iniciando login con:', credentials.username);
        
        // Crear FormData para el login
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Login failed');
        }

        const data = await response.json();
        console.log('Token recibido:', data.access_token);

        // Guardar el token, refresh token y la información del usuario
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return data;
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
};

export const getToken = (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('Token recuperado:', token); // Debug
    return token;
};

export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
};

export const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
    try {
        const response = await fetch(`${API_URL}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        localStorage.setItem(TOKEN_KEY, data.access_token);
        return data.access_token;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
};

export const isAuthenticated = (): boolean => {
    const token = getToken();
    return !!token;
};

export const logout = (): void => {
    removeToken();
};