// En src/pages/ClientLoginPage.jsx (Versión Final y Completa)

import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container } from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import classes from './ClientAuth.module.css'; // Usamos el mismo estilo que el registro
import hamburguesaFotoVertical from '../assets/hamburguesa_foto_5.jpg'; // ¡Una foto diferente para variar!

function ClientLoginPage() {
    const navigate = useNavigate();

    // El cerebro del formulario de login
    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },
        validate: {
            email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'El email no parece ser válido'),
        },
    });

    const handleSubmit = async (values) => {
        try {
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/client-auth/login`;
            const response = await axios.post(apiUrl, values);
            
            // ¡La magia! Guardamos el "pasaporte" del cliente en el navegador
            localStorage.setItem('clientAuthToken', response.data.token);

            notifications.show({
                title: '¡Bienvenido de vuelta!',
                message: 'Iniciaste sesión correctamente. Redirigiendo...',
                color: 'green',
            });
            
            // Redirigimos a la página principal de la experiencia del cliente (que construiremos después)
            navigate('/experiencia-cliente');

        } catch (error) {
            notifications.show({
                title: 'Error al iniciar sesión',
                message: error.response?.data?.message || 'Credenciales incorrectas o error en el servidor.',
                color: 'red',
            });
        }
    };

    return (
        <div className={classes.wrapper}>
            <Paper className={classes.formPaper} shadow="md" radius={0} p="xl">
            <Container size={420} my={40}>
                <Title ta="center">¡Bienvenido de Vuelta!</Title>
                <Text c="dimmed" size="sm" ta="center" mt={5}>
                ¿No tienes una cuenta?{' '}
                <Link to="/registro-cliente" className={classes.link}>Regístrate</Link>
                </Text>

                <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput
                    label="Email"
                    placeholder="tu@email.com"
                    {...form.getInputProps('email')}
                    mt="lg"
                    required
                />
                <PasswordInput
                    label="Contraseña"
                    placeholder="Tu contraseña"
                    {...form.getInputProps('password')}
                    mt="md"
                    required
                />

                <Button fullWidth mt="xl" type="submit">
                    Iniciar Sesión
                </Button>

                <Button
                    component={Link}
                    to="/"
                    variant="subtle"
                    color="gray"
                    fullWidth
                    mt="lg"
                >
                    Volver al inicio
                </Button>
                </form>
            </Container>
            </Paper>

            <div
            className={classes.image}
            style={{ backgroundImage: `url(${hamburguesaFotoVertical})` }}
            />
        </div>
    );
}

export default ClientLoginPage;