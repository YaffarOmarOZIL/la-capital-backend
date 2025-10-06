// En src/pages/ClientFormPage.jsx

import { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Box, Group, Title, Select, Textarea, PasswordInput, Modal, Text, Divider, SimpleGrid} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DateInput } from '@mantine/dates'; // Para la fecha de nacimiento
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import dayjs from 'dayjs';

function ClientFormPage() {
    const { clientId } = useParams(); // Obtiene el 'id' de la URL si estamos editando
    const navigate = useNavigate();
    const isEditing = Boolean(clientId); // Si hay un 'clientId', estamos editando

    // --- Nuevos estados para controlar el flujo de la contraseña ---
    const [passwordModalOpened, { open: openPasswordModal, close: closePasswordModal }] = useDisclosure(false);
    const [isPasswordChangeEnabled, setPasswordChangeEnabled] = useState(false);

    // --- Configuración del formulario con Mantine ---
    const form = useForm({
        initialValues: {
            nombres: '',      
            apellidos: '', 
            numero_telefono: '',
            email: '',
            password: '', // <-- Campo para la nueva contraseña
            confirmPassword: '', // <-- Campo para confirmarla
            fecha_nacimiento: null, 
            genero: '',
            notas: ''
        },
        validate: {
            nombres: (value) => {
                if (!value.trim()) return 'El nombre es obligatorio.';
                if (value.length > 50) return 'El nombre no debe exceder los 50 caracteres.';
                // Regex para permitir letras (con acentos), espacios, y algunos caracteres comunes en nombres.
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(value)) return 'El nombre solo puede contener letras y espacios.';
                return null;
            },
            apellidos: (value) => {
                if (!value.trim()) return 'El apeliido es obligatorio.';
                if (value.length > 50) return 'El apellido no debe exceder los 50 caracteres.';
                // Regex para permitir letras (con acentos), espacios, y algunos caracteres comunes en nombres.
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(value)) return 'El apellido solo puede contener letras y espacios.';
                return null;
            },
            numero_telefono: (value) => {
                if (!value) return 'El número es obligatorio.';
                // Regex para números de Bolivia (asume 8 dígitos que empiezan con 6 o 7).
                if (!/^[67]\d{7}$/.test(value)) return 'Introduce un número de celular válido de 8 dígitos (ej: 71234567).';
                return null;
            },
            email: (value) => (value && /^\S+@\S+\.\S+$/.test(value) ? null : 'Email inválido'),
            notas: (value) => (value.length > 300 ? 'Las notas no pueden exceder los 300 caracteres.' : null),
            password: (value) => {
                // Solo validamos la contraseña si hemos habilitado el cambio.
                if (isPasswordChangeEnabled && value.length < 8) {
                    return 'La nueva contraseña debe tener al menos 8 caracteres.';
                }
                return null;
            },
            confirmPassword: (value, values) => {
                if (isPasswordChangeEnabled && value !== values.password) {
                    return 'Las contraseñas no coinciden.';
                }
                return null;
            },
            fecha_nacimiento: (value) => {
                // --- TRUCO DE DEPURACIÓN ---
                // Abre la consola del navegador (F12) para ver esto en acción.
                console.log("Validando la fecha:", value);

                if (!value) return null;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (value > today) {
                    console.log("¡Error! La fecha es del futuro.");
                    return 'La fecha no puede ser en el futuro.';
                }

                const threeYearsAgo = new Date();
                threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

                if (value > threeYearsAgo) {
                    console.log("¡Error! El cliente es menor de 3 años.");
                    return 'El cliente debe ser mayor de 3 años.';
                }

                console.log("¡La fecha es válida!");
                return null;
            },
            notas: (value) => (value && value.length > 300 ? 'Las notas no pueden exceder los 300 caracteres.' : null),
        },
    });

    // --- Cargar datos del cliente si estamos en modo edición ---
    useEffect(() => {
        if (isEditing) {
            const fetchClient = async () => {
                const token = localStorage.getItem('authToken');
                // ----- ¡USANDO TU PATRÓN! -----
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/clients/${clientId}`;
                const { data } = await axios.get(apiUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                form.setValues({ ...data, fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : null });
            };
            fetchClient();
        }
    }, [isEditing, clientId]);

    const handleEnablePasswordChange = () => {
        setPasswordChangeEnabled(true);
        closePasswordModal();
    };

    const handleSubmit = async (values) => {
        try {
            const token = localStorage.getItem('authToken');

            const payload = {
                nombres: values.nombres,
                apellidos: values.apellidos,
                numero_telefono: values.numero_telefono,
                email: values.email,
                genero: values.genero,
                notas: values.notas,
                fecha_nacimiento: values.fecha_nacimiento ? dayjs(values.fecha_nacimiento).format('YYYY-MM-DD') : null,
            };
            if (isPasswordChangeEnabled && values.password) {
                payload.password = values.password;
            }

            if (isEditing) {
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/clients/${clientId}`;
                await axios.put(apiUrl, payload, { headers: { Authorization: `Bearer ${token}` } });
                notifications.show({ title: 'Éxito', message: 'Cliente actualizado correctamente.', color: 'green' });
            } else {
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/clients`;
                await axios.post(apiUrl, payload, { headers: { Authorization: `Bearer ${token}` } });
                notifications.show({ title: 'Éxito', message: 'Cliente creado correctamente.', color: 'green' });
            }
            navigate('/admin/clients');
        } catch (error) {
            console.error('Error al guardar el cliente:', error);
            const message = error.response?.data?.message || 'No se pudo guardar el cliente.';
            notifications.show({ title: 'Error', message, color: 'red' });
        }
    };

    // fecha máxima que se puede seleccionar.
    const maxDate = new Date();
    // Calculamos la fecha de hace exactamente 3 años.
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    return (
        <Box maw={500} mx="auto">
            <Modal opened={passwordModalOpened} onClose={closePasswordModal} title="Confirmación de Seguridad" centered>
                <Text>Estás a punto de establecer una nueva contraseña para este cliente.</Text>
                <Text c="red" fw={700} mt="sm">La contraseña actual se perderá para siempre. ¿Estás seguro?</Text>
                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={closePasswordModal}>Cancelar</Button>
                    <Button color="red" onClick={handleEnablePasswordChange}>Sí, establecer nueva</Button>
                </Group>
            </Modal>
            <Title order={2} mb="lg">
                {isEditing ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}
            </Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <SimpleGrid cols={2}>
                <TextInput 
                    label="Nombre(s)" 
                    placeholder="Ej: Omar Alejandro "
                    {...form.getInputProps('nombres')} 
                    required 
                />

                <TextInput 
                    label="Apellido(s)" 
                    placeholder="Ej: Jara Renjifo"
                    {...form.getInputProps('apellidos')} 
                    required 
                />
                </SimpleGrid>

                <TextInput 
                    label="Email (para la cuenta)"
                    placeholder="cliente@email.com" {...form.getInputProps('email')} mt="sm" />
                
                
                <TextInput 
                    label="Número de Teléfono" 
                    placeholder="Ej: 71234567"
                    {...form.getInputProps('numero_telefono')} 
                    required 
                    mt="sm" 
                />
                
                <DateInput 
                    label="Fecha de Nacimiento" 
                    placeholder="Selecciona una fecha" 
                    {...form.getInputProps('fecha_nacimiento')} 
                    mt="sm"
                    valueFormat="DD/MM/YYYY"
                    // El calendario no permitirá seleccionar fechas posteriores a hoy.
                    maxDate={maxDate} 
                    excludeDate={(date) => date > threeYearsAgo}
                />
                
                {/* --- NUEVOS CAMPOS COMPLETADOS --- */}
                
                <Select
                label="Género"
                placeholder="Selecciona una opción"
                data={[
                    { value: 'Masculino', label: 'Masculino' },
                    { value: 'Femenino', label: 'Femenino' },
                    { value: 'Otro', label: 'Otro' },
                    { value: 'Prefiero no decir', label: 'Prefiero no decir' },
                ]}
                {...form.getInputProps('genero')}
                mt="sm"
                />

                <Textarea
                label="Notas Adicionales"
                placeholder="Alergias, cliente VIP, preferencias, etc."
                {...form.getInputProps('notas')}
                mt="sm"
                />

                <Divider label="Gestión de Contraseña" my="lg" />

                {!isPasswordChangeEnabled ? (
                    <Button variant="outline" onClick={openPasswordModal}>Establecer Nueva Contraseña</Button>
                ) : (
                    <>
                        <PasswordInput label="Nueva Contraseña" placeholder="Nueva contraseña" {...form.getInputProps('password')} required />
                        <PasswordInput label="Confirmar Nueva Contraseña" placeholder="Repite la contraseña" {...form.getInputProps('confirmPassword')} mt="md" required />
                    </>
                )}   
                
                {/* --- Botón de envío (sin cambios) --- */}
                
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={() => navigate('/admin/clients')}>Cancelar</Button>
                    <Button type="submit">{isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}</Button>
                </Group>
            </form>
        </Box>
    );
}

export default ClientFormPage;