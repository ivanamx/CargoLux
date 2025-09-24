import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getToken, removeToken, refreshAccessToken } from '../services/auth';

// Constantes para notificaciones push
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'REEMPLAZA_CON_TU_VAPID_PUBLIC_KEY';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Función para suscribirse a notificaciones push
async function subscribeToPushNotifications(userId: number, token: string) {
  console.log('=== INICIANDO SUSCRIPCIÓN PUSH PARA USUARIO ===', userId);
  
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker y PushManager disponibles');
    try {
      // Verificar si ya está suscrito
      const existingSubscription = localStorage.getItem(`push_subscription_${userId}`);
      if (existingSubscription) {
        console.log('Usuario ya tiene suscripción push');
        return;
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrado:', registration);
      
      const permission = await Notification.requestPermission();
      console.log('Permiso de notificación:', permission);
      
      if (permission !== 'granted') {
        console.log('Permiso de notificación denegado');
        return;
      }
      
      console.log('VAPID_PUBLIC_KEY:', VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log('Suscripción creada:', subscription);
      
      // Enviar la suscripción al backend
      const response = await fetch(`/api/employees/${userId}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription_info: subscription })
      });
      
      if (response.ok) {
        console.log('Suscripción push enviada al backend exitosamente');
        // Guardar en localStorage para evitar solicitar de nuevo
        localStorage.setItem(`push_subscription_${userId}`, 'true');
      } else {
        console.error('Error al enviar suscripción:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error al suscribirse a notificaciones push:', err);
    }
  } else {
    console.log('Service Worker o PushManager no disponibles');
  }
}

interface User {
  id: number;
  email: string;
  role: 'admin' | 'employee' | 'tecnico' | 'developer' | 'client';
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  // Simulación de usuario
  simulatedUser: User | null;
  setSimulatedUser: (user: User | null) => void;
  effectiveUser: User | null;
  isSimulating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());
  const [simulatedUser, setSimulatedUser] = useState<User | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Usuario efectivo: simulado si existe, sino el usuario real
  const effectiveUser = simulatedUser || user;
  const isSimulating = !!simulatedUser;

  const logout = () => {
    removeToken();
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setSimulatedUser(null); // Limpiar simulación al hacer logout
    setIsAuthenticated(false);
    
    // Limpiar el intervalo de refresh
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (!refreshTokenValue) {
        logout();
        return false;
      }

      const newToken = await refreshAccessToken(refreshTokenValue);
      if (newToken) {
        setIsAuthenticated(true);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      return false;
    }
  };

  // Configurar refresh automático cada 25 minutos (5 minutos antes de que expire)
  useEffect(() => {
    if (isAuthenticated) {
      // Limpiar intervalo anterior si existe
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Establecer nuevo intervalo
      refreshIntervalRef.current = setInterval(() => {
        refreshToken();
      }, 25 * 60 * 1000); // 25 minutos

      // Cleanup
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [isAuthenticated]);

  // Suscripción a notificaciones push para todos los usuarios
  useEffect(() => {
    if (isAuthenticated && user && user.id) {
      const token = getToken();
      if (token) {
        // Verificar si es la primera vez que se autentica
        const hasRequestedPush = localStorage.getItem(`push_subscription_${user.id}`);
        if (!hasRequestedPush) {
          console.log('Primera vez autenticado, solicitando permisos de notificación');
          // Esperar un poco para que se complete la autenticación
          setTimeout(() => {
            subscribeToPushNotifications(user.id, token);
          }, 2000); // Esperar 2 segundos
        }
      }
    }
  }, [isAuthenticated, user]);

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isAuthenticated,
      setAuthenticated: setIsAuthenticated,
      logout,
      refreshToken,
      // Simulación de usuario
      simulatedUser,
      setSimulatedUser,
      effectiveUser,
      isSimulating
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};