import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface UseInactivityTimerProps {
  timeout: number; // en milisegundos
  onTimeout: () => void;
}

export const useInactivityTimer = ({ timeout, onTimeout }: UseInactivityTimerProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated } = useAuth();

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    // Limpiar el timer anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Establecer nuevo timer
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  }, [timeout, onTimeout, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Limpiar timer si no está autenticado
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];

    // Agregar listeners para todos los eventos
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Iniciar el timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAuthenticated, resetTimer]);

  // Función para resetear manualmente el timer
  const resetTimerManually = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return { resetTimer: resetTimerManually };
};
