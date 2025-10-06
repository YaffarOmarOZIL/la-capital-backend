// En src/pages/ClientRegisterPage.jsx (Versión 2.0 - Diseño Profesional)

import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Group, SimpleGrid, Image, Select } from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { DateInput } from '@mantine/dates';
import dayjs from 'dayjs';
import classes from './ClientAuth.module.css';
import hamburguesaFotoVertical from '../assets/hamburguesa_foto_4.jpg'; // <-- ¡Tu foto!

function ClientRegisterPage() {
    const navigate = useNavigate();

    // ----- El Formulario, ahora con los nuevos campos y validaciones -----
    const form = useForm({
        initialValues: {
            nombres: '',
            apellidos: '',
            email: '',
            numero_telefono: '',
            password: '',
            confirmPassword: '',
            fecha_nacimiento: null,
            genero: '',
        },
        validate: {
            nombres: (value) => {
                if (!value.trim()) return 'El nombre es obligatorio.';
                if (value.length > 50) return 'El nombre no debe exceder los 50 caracteres.';
                // Regex para permitir solo letras (con acentos), espacios y apóstrofes/guiones
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(value)) {
                    return 'El nombre solo puede contener letras y espacios.';
                }
                return null;
            },
            apellidos: (value) => {
                if (!value.trim()) return 'El apellido es obligatorio.';
                if (value.length > 50) return 'El apellido no debe exceder los 50 caracteres.';
                // Regex para permitir solo letras (con acentos), espacios y apóstrofes/guiones
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(value)) {
                    return 'El apellido solo puede contener letras y espacios.';
                }
                return null;
            },
            email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Email inválido'),
            
            // ¡Validación robusta para el teléfono!
            numero_telefono: (value) => {
                if (!value) return 'El número es obligatorio.';
                // Regex para números de celular de Bolivia (8 dígitos, empieza con 6 o 7)
                if (!/^[67]\d{7}$/.test(value)) {
                    return 'Introduce un número de celular válido (ej: 71234567).';
                }
                return null;
            },
            
            password: (value) => (value.length < 8 ? 'La contraseña debe tener al menos 8 caracteres' : null),
            confirmPassword: (value, values) => (value !== values.password ? 'Las contraseñas no coinciden' : null),
            fecha_nacimiento: (value) => {
                if (!value) return null; // Es opcional
                const today = new Date();
                const tooOld = new Date();
                tooOld.setFullYear(tooOld.getFullYear() - 110);

                if (value > today) return 'No puedes nacer en el futuro.';
                if (value < tooOld) return 'La fecha parece demasiado antigua.';
                return null;
            },
        },
    });

    const handleSubmit = async (values) => {
        try {
            const payload = {
                ...values,
                fecha_nacimiento: values.fecha_nacimiento ? dayjs(values.fecha_nacimiento).format('YYYY-MM-DD') : null
            };
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/client-auth/register`;
            await axios.post(apiUrl, payload);

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

    const maxDate = new Date(); // Límite para que no se pueda seleccionar el futuro
    const minDate = new Date(); // Límite para que no se pueda seleccionar más de 110 años
    minDate.setFullYear(minDate.getFullYear() - 110);

     return (
        <div className={classes.wrapper}>
            <Paper className={classes.formPaper} shadow="md" radius={0}>
                <Container size={420} my={40}>
                    <Title ta="center">¡Únete a la Familia!</Title>
                    <Text c="dimmed" size="sm" ta="center" mt={5}>
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/login-cliente" className={classes.link}>Inicia Sesión</Link>
                    </Text>

                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        {/* El formulario ahora incluye los nuevos campos */}
                        <TextInput label="Nombre(s)" {...form.getInputProps('nombres')} required />
                        <TextInput label="Apellido(s)" {...form.getInputProps('apellidos')} required />
                        <TextInput label="Email" {...form.getInputProps('email')} mt="md" required />
                        <TextInput label="Número de Teléfono" {...form.getInputProps('numero_telefono')} mt="md" />
                        
                        <SimpleGrid cols={2} mt="md">
                            <DateInput label="Fecha de Nacimiento" valueFormat="DD/MM/YYYY" {...form.getInputProps('fecha_nacimiento')} maxDate={maxDate} minDate={minDate} />
                            <Select label="Género" data={['Masculino', 'Femenino', 'Otro', 'Prefiero no decir']} {...form.getInputProps('genero')} />
                        </SimpleGrid>

                        <PasswordInput label="Contraseña" {...form.getInputProps('password')} mt="md" required />
                        <PasswordInput label="Confirmar Contraseña" {...form.getInputProps('confirmPassword')} mt="md" required />
                        
                        <Button fullWidth mt="xl" type="submit">Registrarme</Button>
                    </form>
                </Container>
            </Paper>
            {/* ----- LA IMAGEN ELEGANTE A LA DERECHA ----- */}
            <div className={classes.image} style={{ backgroundImage: `url(${hamburguesaFotoVertical})` }} />
        </div>
    );
}

export default ClientRegisterPage;