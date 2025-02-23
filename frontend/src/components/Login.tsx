import React from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box, Container, Title, Paper } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { setUser, setAuthenticated } = useAuth();

    const form = useForm({
        initialValues: {
            username: '',
            password: ''
        },
        validate: {
            username: (value) => (!value ? 'Email es requerido' : null),
            password: (value) => (!value ? 'Contraseña es requerida' : null)
        }
    });

    const handleSubmit = async (values: typeof form.values) => {
        try {
            console.log('Iniciando login...');
            const response = await login({
                username: values.username,
                password: values.password
            });
            console.log('Login exitoso:', response);

            setUser(response.user);
            setAuthenticated(true);
            console.log('Usuario guardado en contexto:', response.user);
            
            navigate('/dashboard');
            
        } catch (error) {
            console.error('Error completo:', error);
            notifications.show({
                title: 'Error',
                message: 'Credenciales inválidas',
                color: 'red'
            });
        }
    };

    return (
        <Container size={420} my={40}>
            <Title ta="center" fw={900}>
                Bienvenido
            </Title>
            
            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput
                        label="Email"
                        placeholder="tu@email.com"
                        required
                        {...form.getInputProps('username')}
                    />
                    <PasswordInput
                        label="Contraseña"
                        placeholder="Tu contraseña"
                        required
                        mt="md"
                        {...form.getInputProps('password')}
                    />
                    <Button type="submit" fullWidth mt="xl">
                        Iniciar Sesión
                    </Button>
                </form>
            </Paper>
        </Container>
    );
};

export default Login;