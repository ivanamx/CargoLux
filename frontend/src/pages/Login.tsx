import { useForm } from '@mantine/form';
import {
    TextInput,
    PasswordInput,
    Paper,
    Title,
    Container,
    Button,
    Text,
    Box,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { login, setToken } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

export default function Login() {
    const navigate = useNavigate();
    const { setAuthenticated, setUser } = useAuth();
    const [backgroundImage, setBackgroundImage] = useState('');

    useEffect(() => {
        // Seleccionar una imagen aleatoria del 1 al 4
        const randomImage = Math.floor(Math.random() * 4) + 1;
        setBackgroundImage(`/images/background/${randomImage}.jpg`);
    }, []);

    const form = useForm({
        initialValues: {
            username: '',
            password: '',
        },
        validate: {
            username: (value) => (value.length < 2 ? 'Email o usuario requerido' : null),
            password: (value) => (value.length < 2 ? 'Contraseña requerida' : null),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        try {
            console.log('1. Iniciando login...');
            const response = await login(values);
            console.log('2. Respuesta del login:', response);

            // Guardar token
            setToken(response.access_token);
            console.log('3. Token guardado');

            // Actualizar estado de autenticación
            setUser(response.user);
            console.log('4. Usuario guardado:', response.user);
            
            setAuthenticated(true);
            console.log('5. Estado de autenticación actualizado');

            // La redirección la manejará AppContent
            console.log('6. Esperando redirección automática...');

        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            form.setErrors({ username: 'Email/usuario o contraseña incorrectos' });
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                paddingTop: 80,
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
                <Title
                    ta="center"
                    c="white"
                    style={(theme) => ({
                        fontFamily: `Greycliff CF, ${theme.fontFamily}`,
                        fontWeight: 900,
                    })}
                >
                    CargoLux
                </Title>
                <Text c="rgba(255, 255, 255, 0.8)" size="sm" ta="center" mt={5}>
                    BIENVENIDO / WELCOME
                </Text>

                <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ backgroundColor: 'rgba(30, 30, 30, 0.9)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <TextInput
                            label="Email o Usuario"
                            placeholder="@"
                            required
                            {...form.getInputProps('username')}
                        />
                        <PasswordInput
                            label="Contraseña"
                            placeholder="*****"
                            required
                            mt="md"
                            {...form.getInputProps('password')}
                        />
                        <Button fullWidth mt="xl" type="submit">
                            Iniciar sesión
                        </Button>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
}