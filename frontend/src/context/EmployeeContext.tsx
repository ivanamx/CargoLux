import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Employee } from '../pages/Employees';
import { employeeService } from '../services/api';

interface EmployeeContextType {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    loading: boolean;
    error: string | null;
    refreshEmployees: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider = ({ children }: { children: React.ReactNode }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const data = await employeeService.getEmployees();
            console.log('Empleados cargados:', data); // Debug
            setEmployees(data);
            setError(null);
        } catch (err) {
            console.error('Error al cargar empleados:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar empleados');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshEmployees();
    }, [refreshEmployees]);

    return (
        <EmployeeContext.Provider value={{ employees, setEmployees, loading, error, refreshEmployees }}>
            {children}
        </EmployeeContext.Provider>
    );
};

export function useEmployees() {
    const context = useContext(EmployeeContext);
    if (context === undefined) {
        throw new Error('useEmployees must be used within a EmployeeProvider');
    }
    return context;
} 