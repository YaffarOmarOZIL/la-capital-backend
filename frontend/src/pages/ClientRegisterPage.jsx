// En src/pages/ClientRegisterPage.jsx

import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Group, Box } from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import classes from './ClientAuth.module.css'; // Un CSS para el estilo

function ClientRegisterPage() {
    const navigate = useNavigate();
    const form = useForm({
        initialValues: {
            nombre_completo: '',
            email: '',
            numero_telefono: '',
            password: '',
            confirmPassword: '',
        },
        validate: {
            nombre_completo: (value) => (value.trim().length < 2 ? 'El nombre parece muy corto' : null),
            email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Email inválido'),
            password: (value) => (value.length < 8 ? 'La contraseña debe tener al menos 8 caracteres' : null),
            confirmPassword: (value, values) => (value !== values.password ? 'Las contraseñas no coinciden' : null),
        },
    });

    const handleSubmit = async (values) => {
        try {
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/client-auth/register`;
            await axios.post(apiUrl, values);

            notifications.show({
                title: '¡Bienvenido a La Capital!',
                message: 'Tu cuenta ha sido creada con éxito. Ahora inicia sesión.',
                color: 'green',
            });
            navigate('/login-cliente');
        } catch (error) {
            notifications.show({
                title: 'Error de Registro',
                message: error.response?.data?.message || 'No se pudo crear la cuenta.',
                color: 'red',
            });
        }
    };

    return (
        <div className={classes.wrapper}>
            <Container size={420} my={40}>
                <Title ta="center">¡Únete a la Familia!</Title>
                <Text c="dimmed" size="sm" ta="center" mt={5}>
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login-cliente" className={classes.link}>Inicia Sesión</Link>
                </Text>

                <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <TextInput label="Nombre Completo" placeholder="Tu nombre" {...form.getInputProps('nombre_completo')} required />
                        <TextInput label="Email" placeholder="tu@email.com" {...form.getInputProps('email')} mt="md" required />
                        <TextInput label="Número de Teléfono" placeholder="71234567" {...form.getInputProps('numero_telefono')} mt="md" />
                        <PasswordInput label="Contraseña" placeholder="Tu contraseña" {...form.getInputProps('password')} mt="md" required />
                        <PasswordInput label="Confirmar Contraseña" placeholder="Repite tu contraseña" {...form.getInputProps('confirmPassword')} mt="md" required />
                        <Button fullWidth mt="xl" type="submit">Registrarme</Button>
                    </form>
                </Paper>
            </Container>
        </div>
    );
}

export default ClientRegisterPage;