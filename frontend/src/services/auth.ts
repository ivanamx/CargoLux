import { API_URL } from './api';
const TOKEN_KEY = 'auth_token';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: any;
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log('URL de la API:', API_URL);
    console.log('Enviando credenciales:', credentials);
    
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const url = `${API_URL}/token`;
    console.log('URL completa:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    console.log('Respuesta status:', response.status);
    const data = await response.json();
    console.log('Datos recibidos:', data);
    
    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    setToken(data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user');
};