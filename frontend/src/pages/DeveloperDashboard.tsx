import { Grid, Paper, Text, Group, Card, Title, Stack, Badge, Button, ThemeIcon, Box, Modal, ScrollArea, Progress } from '@mantine/core';
import { 
    IconDashboard, 
    IconTools, 
    IconUsers,
    IconDatabase,
    IconBug,
    IconTrash,
    IconRefresh,
    IconBriefcase,
    IconRotate
} from '@tabler/icons-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { API_URL } from '../services/api';

interface Project {
    id: number;
    name: string;
    project_name: string;
    completed_parts: number;
    total_parts: number;
    status: string;
    client: string;
    start_date: string;
    end_date: string;
    progress: number;
    project_type: string;
    city_image?: string;
    description?: string;
    location?: {
        plant: {
            name: string;
            address: string;
            coordinates: string;
            contact: {
                name: string;
                phone: string;
                email: string;
            }
        }
    };
    documents?: any[];
    equipment?: string[];
    assigned_to: string[];
}

const DeveloperDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isClearing, setIsClearing] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [updateLogs, setUpdateLogs] = useState<string[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateProgress, setUpdateProgress] = useState(0);

    // Función para simular el login como otro usuario
    const simulateUserLogin = async (email: string) => {
        try {
            console.log('Iniciando simulación para:', email);
            
            // Primero guardamos las credenciales actuales del developer
            const currentToken = localStorage.getItem('token');
            const currentUser = localStorage.getItem('user');
            
            if (currentToken && currentUser) {
                localStorage.setItem('developer_token', currentToken);
                localStorage.setItem('developer_user', currentUser);
                console.log('Credenciales del developer guardadas');
            }

            // Seleccionar la contraseña correcta según el usuario
            const password = email === 'admin@apizhe.com' ? 'admin123' : 'tech123';

            // Crear FormData para el login
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);
            formData.append('grant_type', 'password');

            // Intentamos hacer login con el usuario a simular
            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                body: formData
            });

            console.log('Respuesta del servidor:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error detallado:', errorData);
                throw new Error(`Error al simular usuario: ${response.status}`);
            }

            const data = await response.json();
            console.log('Login exitoso, datos recibidos:', data);

            // Guardamos el nuevo token y usuario
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            notifications.show({
                title: 'Simulación Iniciada',
                message: `Ahora estás viendo el dashboard como ${email}`,
                color: 'green'
            });

            // Redirigimos según el rol
            if (email === 'admin@apizhe.com') {
                window.location.href = '/dashboard';
            } else if (email === 'tech@apizhe.com') {
                window.location.href = '/technician';
            }

        } catch (error) {
            console.error('Error completo:', error);
            notifications.show({
                title: 'Error',
                message: error instanceof Error ? error.message : 'No se pudo simular el usuario',
                color: 'red'
            });
        }
    };

    // Función para restaurar el usuario developer
    const restoreDevUser = () => {
        try {
            const developerToken = localStorage.getItem('developer_token');
            const developerUser = localStorage.getItem('developer_user');

            if (developerToken && developerUser) {
                // Restauramos las credenciales originales
                localStorage.setItem('token', developerToken);
                localStorage.setItem('user', developerUser);
                
                // Limpiamos las credenciales temporales
                localStorage.removeItem('developer_token');
                localStorage.removeItem('developer_user');

                notifications.show({
                    title: 'Restaurado',
                    message: 'Has vuelto a tu cuenta de developer',
                    color: 'green'
                });

                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error('Error al restaurar:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo restaurar el usuario developer',
                color: 'red'
            });
        }
    };

    const handleClearLocalStorage = () => {
        localStorage.clear();
        notifications.show({
            title: 'LocalStorage Limpiado',
            message: 'Se ha limpiado el almacenamiento local correctamente',
            color: 'green'
        });
    };

    const handleClearTable = async (tableName: string) => {
        setIsClearing(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/dev/clear-table/${tableName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                notifications.show({
                    title: 'Tabla Limpiada',
                    message: `Se ha limpiado la tabla ${tableName} correctamente`,
                    color: 'green'
                });
            } else {
                throw new Error('Error al limpiar la tabla');
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo limpiar la tabla',
                color: 'red'
            });
        } finally {
            setIsClearing(false);
        }
    };

    // Función para actualizar todos los proyectos
    const handleUpdateAllProjects = async () => {
        setIsUpdating(true);
        setUpdateProgress(0);
        try {
            setUpdateLogs(prev => [...prev, "🔄 Iniciando proceso de actualización..."]);
            
            // Paso 1: Obtener proyectos activos
            setUpdateLogs(prev => [...prev, "📋 Obteniendo lista de proyectos activos..."]);
            setUpdateProgress(10);

            const activeProjectsResponse = await fetch(`${API_URL}/api/projects/update/fetch-active-projects`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!activeProjectsResponse.ok) {
                throw new Error('Error al obtener proyectos activos');
            }

            const activeProjectsData = await activeProjectsResponse.json();
            setUpdateLogs(prev => [
                ...prev, 
                `✅ Proyectos activos encontrados: ${activeProjectsData.count}`,
                ...activeProjectsData.projects.map((project: any) => `   • ${project.name}`)
            ]);
            setUpdateProgress(20);

            // Paso 2: Login en Nexus
            setUpdateLogs(prev => [...prev, "\n👤 Accediendo a Nexus..."]);
            setUpdateProgress(30);

            const loginResponse = await fetch(`${API_URL}/api/projects/update/nexus-login`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!loginResponse.ok) {
                throw new Error('Error al acceder a Nexus');
            }

            setUpdateLogs(prev => [...prev, "✅ Acceso a Nexus exitoso"]);
            setUpdateProgress(40);

            // Paso 3: Acceder al dashboard
            setUpdateLogs(prev => [...prev, "🔄 Accediendo al dashboard..."]);
            setUpdateProgress(50);
            setUpdateLogs(prev => [...prev, "✅ Dashboard cargado correctamente"]);

            // Paso 4: Buscar proyecto
            const projectName = activeProjectsData.projects[0].name;
            setUpdateLogs(prev => [...prev, `\n🔍 Buscando proyecto: ${projectName}`]);
            setUpdateProgress(60);

            const searchResponse = await fetch(`${API_URL}/api/projects/update/search-project`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ project_name: projectName })
            });

            if (!searchResponse.ok) {
                throw new Error('Error al buscar proyecto');
            }

            setUpdateLogs(prev => [...prev, `✅ Búsqueda completada para: ${projectName}`]);
            setUpdateProgress(70);

            // Paso 5: Acceder al reporte
            setUpdateLogs(prev => [...prev, "\n🔄 Accediendo al reporte..."]);

            const viewReportResponse = await fetch(`${API_URL}/api/projects/update/click-view-report`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ project_name: projectName })
            });

            if (!viewReportResponse.ok) {
                throw new Error('Error al acceder al reporte');
            }

            setUpdateLogs(prev => [...prev, "✅ Reporte accedido correctamente"]);
            setUpdateProgress(80);

            // Paso 6: Descargar Excel
            setUpdateLogs(prev => [...prev, "\n📥 Descargando reporte Excel..."]);
            setUpdateProgress(90);

            const downloadResponse = await fetch(`${API_URL}/api/projects/update/download-excel-report`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!downloadResponse.ok) {
                const errorData = await downloadResponse.json();
                throw new Error(errorData.detail || 'Error al descargar reporte');
            }

            const excelData = await downloadResponse.json();

            // Agregar los logs específicos del procesamiento del Excel
            setUpdateLogs(prev => [...prev,
                "\n📥 Iniciando procesamiento del Excel...",
                "🔍 Buscando pestaña 'All' en el Excel...",
                "✅ Pestaña 'All' encontrada",
                "\n📋 Verificando columnas requeridas:",
                "✅ Columna encontrada: Traceability",
                "✅ Columna encontrada: Flash Status",
                "✅ Columna encontrada: Ending Part Identifier",
                "✅ Columna encontrada: Date Completed",
                "✅ Columna encontrada: Username",
                "✅ Columna encontrada: Project Name",
                "\n🔄 Preparando datos para la base de datos...",
                `✅ ${excelData.data.total_records} registros preparados`,
                "\n💾 Insertando registros en la base de datos...",
                `✅ ${excelData.data.total_records} registros insertados exitosamente`,
                "\n🔄 Actualizando completed_parts en proyectos...",
                ...excelData.data.projects_updated.map((p: Project) => 
                    `📊 Proyecto: ${p.project_name} - Partes actualizadas: ${p.completed_parts}`
                ),
                "✅ Proyectos actualizados correctamente"
            ]);

            setUpdateProgress(100);

            notifications.show({
                title: 'Éxito',
                message: `Se procesaron ${excelData.data.total_records} registros correctamente`,
                color: 'green'
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setUpdateLogs(prev => [...prev, `\n❌ Error: ${errorMessage}`]);
            setUpdateProgress(0);
            
            notifications.show({
                title: 'Error',
                message: 'No se pudo completar la actualización',
                color: 'red'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <Group justify="space-between" mb="xl">
                <div>
                    <Group align="center" gap="xs">
                        <Badge color="cyan" size="lg">DEVELOPER</Badge>
                        <Group gap={8}>
                            <Text size="lg" fw={700} c="teal.4">
                                {user?.full_name}
                            </Text>
                            <Box
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#10B981',
                                    animation: 'pulse 1s ease-in-out infinite'
                                }}
                            />
                        </Group>
                    </Group>
                    <Text size="sm" c="dimmed">Panel de Desarrollo</Text>
                </div>
                <Group>
                    {localStorage.getItem('developer_token') && (
                        <Button 
                            onClick={restoreDevUser}
                            color="yellow"
                            variant="light"
                        >
                            Volver a Developer
                        </Button>
                    )}
                    <Button onClick={logout} color="red">Cerrar Sesión</Button>
                </Group>
            </Group>

            {/* Botones de simulación de usuarios */}
            <Paper withBorder p="md" mb="xl">
                <Stack>
                    <Title order={4}>Simular Usuario</Title>
                    <Group>
                        <Button
                            leftSection={<IconDashboard size={20} />}
                            onClick={() => simulateUserLogin('admin@apizhe.com')}
                            variant="light"
                            color="blue"
                            size="lg"
                        >
                            Dashboard Admin
                        </Button>
                        <Button
                            leftSection={<IconUsers size={20} />}
                            onClick={() => simulateUserLogin('tech@apizhe.com')}
                            variant="light"
                            color="teal"
                            size="lg"
                        >
                            Dashboard Técnico
                        </Button>
                    </Group>
                </Stack>
            </Paper>

            <Grid>
                {/* Herramientas DB - Existente */}
                <Grid.Col span={6}>
                    <Card withBorder>
                        <Group mb="md">
                            <ThemeIcon size="lg" color="orange" variant="light">
                                <IconDatabase size={20} />
                            </ThemeIcon>
                            <Title order={3}>Herramientas DB</Title>
                        </Group>
                        <Stack gap="md">
                            <Button
                                leftSection={<IconTrash size={20} />}
                                onClick={() => handleClearTable('time_entries')}
                                loading={isClearing}
                                color="red"
                                variant="light"
                            >
                                Limpiar Registros de Tiempo
                            </Button>
                            <Button
                                leftSection={<IconTrash size={20} />}
                                onClick={() => handleClearTable('attendances')}
                                loading={isClearing}
                                color="red"
                                variant="light"
                            >
                                Limpiar Registros de Asistencia
                            </Button>
                            <Button
                                leftSection={<IconTrash size={20} />}
                                onClick={() => handleClearTable('projects')}
                                loading={isClearing}
                                color="red"
                                variant="light"
                            >
                                Limpiar Proyectos
                            </Button>
                        </Stack>
                    </Card>
                </Grid.Col>

                {/* Herramientas Debug - Existente */}
                <Grid.Col span={6}>
                    <Card withBorder>
                        <Group mb="md">
                            <ThemeIcon size="lg" color="blue" variant="light">
                                <IconBug size={20} />
                            </ThemeIcon>
                            <Title order={3}>Herramientas Debug</Title>
                        </Group>
                        <Stack gap="md">
                            <Button
                                leftSection={<IconTrash size={20} />}
                                onClick={handleClearLocalStorage}
                                color="orange"
                                variant="light"
                            >
                                Limpiar LocalStorage
                            </Button>
                            <Button
                                leftSection={<IconRefresh size={20} />}
                                onClick={() => window.location.reload()}
                                color="teal"
                                variant="light"
                            >
                                Recargar Aplicación
                            </Button>
                        </Stack>
                    </Card>
                </Grid.Col>

                {/* Herramientas Proyectos - NUEVA */}
                <Grid.Col span={6}>
                    <Card withBorder>
                        <Group mb="md">
                            <ThemeIcon size="lg" color="violet" variant="light">
                                <IconBriefcase size={20} />
                            </ThemeIcon>
                            <Title order={3}>Herramientas Proyectos</Title>
                        </Group>
                        <Stack gap="md">
                            <Button
                                leftSection={<IconRotate size={20} />}
                                onClick={() => setUpdateModalOpen(true)}
                                color="teal"
                                variant="light"
                            >
                                Actualizar Proyectos
                            </Button>
                            <Button
                                leftSection={<IconTools size={20} />}
                                onClick={() => handleClearTable('project_assignments')}
                                loading={isClearing}
                                color="red"
                                variant="light"
                            >
                                Limpiar Asignaciones
                            </Button>
                            <Button
                                leftSection={<IconTrash size={20} />}
                                onClick={() => handleClearTable('project_equipment')}
                                loading={isClearing}
                                color="red"
                                variant="light"
                            >
                                Limpiar Equipo de Proyectos
                            </Button>
                        </Stack>
                    </Card>
                </Grid.Col>
            </Grid>

            {/* Modal de Actualización de Proyectos */}
            <Modal
                opened={updateModalOpen}
                onClose={() => {
                    setUpdateModalOpen(false);
                    setUpdateLogs([]);
                    setUpdateProgress(0);
                }}
                title="Actualización de Proyectos"
                size="lg"
            >
                <Stack>
                    {/* Zona de Acción */}
                    <Card withBorder>
                        <Group justify="space-between">
                            <Text fw={500}>Actualización Global</Text>
                            <Button
                                onClick={handleUpdateAllProjects}
                                loading={isUpdating}
                                leftSection={<IconRotate size={20} />}
                                color="teal"
                            >
                                Actualizar Todos
                            </Button>
                        </Group>
                    </Card>

                    {/* Zona de Logs con Progress Bar */}
                    <Card withBorder>
                        <Text fw={500} mb="md">Logs de Actualización</Text>
                        
                        {/* Barra de Progreso */}
                        <Progress 
                            value={updateProgress}
                            color="lime"
                            size="md"
                            radius="xs"
                            mb="md"
                            animated={isUpdating}
                            striped={isUpdating}
                        />

                        <ScrollArea h={300} type="always">
                            <Stack gap="xs">
                                {updateLogs.length === 0 ? (
                                    <Text c="dimmed" fs="italic">
                                        No hay logs disponibles. Inicia una actualización para ver los resultados.
                                    </Text>
                                ) : (
                                    updateLogs.map((log, index) => (
                                        <Text 
                                            key={index}
                                            style={{
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap'
                                            }}
                                        >
                                            {log}
                                        </Text>
                                    ))
                                )}
                            </Stack>
                        </ScrollArea>
                    </Card>
                </Stack>
            </Modal>
        </div>
    );
};

export default DeveloperDashboard;