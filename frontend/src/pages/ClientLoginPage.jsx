// En src/pages/ClientLoginPage.jsx

import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Anchor } from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import classes from './ClientAuth.module.css';
import hamburguesaFotoVertical from '../assets/hamburguesa_foto_5.png'; // <-- ¡Usamos otra foto para variar!

function ClientLoginPage() {
    const navigate = useNavigate();
    const form = useForm({
        initialValues: { email: '', password: '' },
        validate: {
            email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Email inválido'),
        },
    });

    const handleSubmit = async (values) => {
        try {
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/client-auth/login`;
            const response = await axios.post(apiUrl, values);
            
            // ¡La magia! Guardamos el "pasaporte" en el navegador para mantener la sesión
            localStorage.setItem('clientAuthToken', response.data.token);

            notifications.show({ title: '¡Bienvenido de vuelta!', message: 'Iniciaste sesión correctamente.', color: 'green' });
            
            // Redirigimos a la página de la experiencia AR
            navigate('/experiencia-ar'); // <-- Nueva ruta que crearemos
        } catch (error) {
            notifications.show({ title: 'Error', message: error.response?.data?.message || 'No se pudo iniciar sesión.', color: 'red' });
        }
    };

    return (
        <div className={classes.wrapper}>
            <Paper className={classes.formPaper} shadow="md" radius={0}>
                <Container size={420} my={40}>
                    <Title ta="center">¡Bienvenido de Vuelta!</Title>
                    <Text c="dimmed" size="sm" ta="center" mt={5}>
                        ¿No tienes una cuenta?{' '}
                        <Link to="/registro-cliente" className={classes.link}>Regístrate</Link>
                    </Text>

                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <TextInput label="Email" placeholder="tu@email.com" {...form.getInputProps('email')} required />
                        <PasswordInput label="Contraseña" placeholder="Tu contraseña" {...form.getInputProps('password')} mt="md" required />
                        
                        <Button fullWidth mt="xl" type="submit">Iniciar Sesión</Button>
                        
                        {/* --- ¡TU BOTÓN DE REGRESAR! --- */}
                        <Button component={Link} to="/" variant="subtle" color="gray" fullWidth mt="lg">
                            Volver al inicio
                        </Button>
                    </form>
                </Paper>
            </Container>
            <div className={classes.image} style={{ backgroundImage: `url(${hamburguesaFotoVertical})` }} />
        </div>
    );
}

export default ClientLoginPage;