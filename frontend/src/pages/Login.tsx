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

export default function Login() {
    const navigate = useNavigate();
    const { setAuthenticated } = useAuth();

    const form = useForm({
        initialValues: {
            username: '',
            password: '',
        },
        validate: {
            username: (value) => (value.length < 2 ? 'Email inválido' : null),
            password: (value) => (value.length < 2 ? 'Contraseña requerida' : null),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        try {
            const response = await login(values);
            setToken(response.access_token);
            setAuthenticated(true);
            navigate('/dashboard');
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            form.setErrors({ username: 'Credenciales inválidas' });
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(45deg, #1A1B1E 0%, #2C2E33 100%)',
                paddingTop: 80,
            }}
        >
            <Container size={420}>
                <Title
                    ta="center"
                    style={(theme) => ({
                        fontFamily: `Greycliff CF, ${theme.fontFamily}`,
                        fontWeight: 900,
                    })}
                >
                    Control de Asistencia
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5}>
                    Sistema de Control de Asistencia
                </Text>

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
                        <Button fullWidth mt="xl" type="submit">
                            Iniciar sesión
                        </Button>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
}