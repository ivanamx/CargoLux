import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, removeToken } from '../services/auth';

interface User {
  id: number;
  email: string;
  role: 'admin' | 'employee';
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  logout: () => void;
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

  const logout = () => {
    removeToken();
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Limpiar datos inválidos al montar
  useEffect(() => {
    if (!getToken()) {
      logout();
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isAuthenticated,
      setAuthenticated: setIsAuthenticated,
      logout
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