import { createContext, useContext, useState } from 'react';
import type { Employee } from '../pages/Employees';

interface EmployeeContextType {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

// Reemplazar los datos de prueba con un array vacío
const initialEmployees: Employee[] = [];

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

    return (
        <EmployeeContext.Provider value={{ employees, setEmployees }}>
            {children}
        </EmployeeContext.Provider>
    );
}

export function useEmployees() {
    const context = useContext(EmployeeContext);
    if (context === undefined) {
        throw new Error('useEmployees must be used within a EmployeeProvider');
    }
    return context;
} 