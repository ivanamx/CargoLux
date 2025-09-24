import { createContext, useContext, useState, useEffect } from 'react';
import type { Project } from '../types/project';
import { projectService } from '../services/api';
import { notifications } from '@mantine/notifications';

interface ProjectContextType {
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    loading: boolean;
    error: string | null;
    refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshProjects = async () => {
        try {
            setLoading(true);
            console.log('=== REFRESH PROJECTS ===');
            console.log('Iniciando fetch de proyectos...');
            const data = await projectService.getProjects();
            console.log('Proyectos recibidos:', data);
            
            // Log detallado de cada proyecto
            if (Array.isArray(data)) {
                data.forEach((project, index) => {
                    console.log(`📋 Proyecto ${index + 1}:`, {
                        id: project.id,
                        name: project.name,
                        status: project.status,
                        progress: project.progress
                    });
                });
            }
            
            setProjects(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error('Error en refreshProjects:', err);
            if (err instanceof Error) {
                console.error('Mensaje de error:', err.message);
                console.error('Stack trace:', err.stack);
            }
            setError('Error al cargar los proyectos');
            setProjects([]);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los proyectos',
                color: 'red'
            });
        } finally {
            setLoading(false);
            console.log('Finalizado refresh de proyectos');
        }
    };

    useEffect(() => {
        refreshProjects();

        // Escuchar eventos de actualización de estado de proyecto
        const handleProjectStatusUpdate = () => {
            console.log('🎯 Evento project-status-updated recibido en ProjectContext');
            console.log('🔄 Refrescando proyectos...');
            refreshProjects();
        };

        console.log('👂 Configurando listener para project-status-updated en ProjectContext');
        window.addEventListener('project-status-updated', handleProjectStatusUpdate);

        return () => {
            console.log('🧹 Limpiando listener de project-status-updated en ProjectContext');
            window.removeEventListener('project-status-updated', handleProjectStatusUpdate);
        };
    }, []);

    return (
        <ProjectContext.Provider value={{ projects, setProjects, loading, error, refreshProjects }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProjects() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
} 