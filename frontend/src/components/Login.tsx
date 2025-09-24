import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Text, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await login(credentials);
            console.log('Login successful:', response); // Debug

            // Verificar que tenemos el token
            if (!response.access_token) {
                throw new Error('No token received');
            }

            notifications.show({
                title: 'Éxito',
                message: 'Inicio de sesión exitoso',
                color: 'green'
            });

            // Redirigir al dashboard
            navigate('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            notifications.show({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Error al iniciar sesión',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                backgroundImage: 'url(/images/background/1.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}
        >
            {/* Overlay para mejorar la legibilidad */}
            <Box
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    zIndex: 1
                }}
            />
            
            <Container size={420} style={{ position: 'relative', zIndex: 2 }}>
                <Title ta="center" c="white">
                    Bienvenido
                </Title>
                <Text c="rgba(255, 255, 255, 0.8)" size="sm" ta="center" mt={5}>
                    Ingresa tus credenciales para continuar
                </Text>

                <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                    <form onSubmit={handleSubmit}>
                        <TextInput
                            label="Email"
                            placeholder="tu@email.com"
                            required
                            value={credentials.username}
                            onChange={(e) => setCredentials(prev => ({
                                ...prev,
                                username: e.target.value
                            }))}
                        />
                        <PasswordInput
                            label="Contraseña"
                            placeholder="Tu contraseña"
                            required
                            mt="md"
                            value={credentials.password}
                            onChange={(e) => setCredentials(prev => ({
                                ...prev,
                                password: e.target.value
                            }))}
                        />
                        <Button 
                            fullWidth 
                            mt="xl" 
                            type="submit"
                            loading={loading}
                        >
                            Iniciar Sesión
                        </Button>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
}