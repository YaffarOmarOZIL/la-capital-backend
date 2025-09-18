// En src/pages/ClientFormPage.jsx

import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Box, Group, Title, Select, Textarea } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DateInput } from '@mantine/dates'; // Para la fecha de nacimiento
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

function ClientFormPage() {
    const { clientId } = useParams(); // Obtiene el 'id' de la URL si estamos editando
    const navigate = useNavigate();
    const isEditing = Boolean(clientId); // Si hay un 'clientId', estamos editando

    // --- Configuración del formulario con Mantine ---
    const form = useForm({
        initialValues: {
            nombre_completo: '',
            numero_telefono: '',
            fecha_nacimiento: null, 
            genero: '',
            notas: ''
        },
        validate: {
            nombre_completo: (value) => {
                if (!value.trim()) return 'El nombre es obligatorio.';
                if (value.length > 50) return 'El nombre no debe exceder los 50 caracteres.';
                // Regex para permitir letras (con acentos), espacios, y algunos caracteres comunes en nombres.
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(value)) return 'El nombre solo puede contener letras y espacios.';
                return null;
            },
            numero_telefono: (value) => {
                if (!value) return 'El número es obligatorio.';
                // Regex para números de Bolivia (asume 8 dígitos que empiezan con 6 o 7).
                if (!/^[67]\d{7}$/.test(value)) return 'Introduce un número de celular válido de 8 dígitos (ej: 71234567).';
                return null;
            },
            notas: (value) => (value.length > 300 ? 'Las notas no pueden exceder los 300 caracteres.' : null),
            fecha_nacimiento: (value) => {
                if (!value) return null; // Si está vacío, no hay error.

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (value > today) {
                    return 'La fecha no puede ser en el futuro.';
                }

                const threeYearsAgo = new Date();
                threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

                if (value > threeYearsAgo) {
                    return 'El cliente debe ser mayor de 3 años.';
                }

                return null;
            },
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

    const handleSubmit = async (values) => {
        try {
            const token = localStorage.getItem('authToken');

            // ----- ¡AQUÍ ESTÁ EL ARREGLO! -----
            const payload = {
                ...values,
                fecha_nacimiento: values.fecha_nacimiento 
                    ? dayjs(values.fecha_nacimiento).format('YYYY-MM-DD') 
                    : null,
            };

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

    return (
        <Box maw={500} mx="auto">
            <Title order={2} mb="lg">
                {isEditing ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}
            </Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput 
                    label="Nombre Completo" 
                    placeholder="Ej: Omar Alejandro Jara Renjifo"
                    {...form.getInputProps('nombre_completo')} 
                    required 
                />
                
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
                    valueFormat="DD/MM/YYYY" // Para que se vea bonito
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
                
                {/* --- Botón de envío (sin cambios) --- */}
                
                <Group justify="flex-end" mt="md">
                    <Button type="submit">{isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}</Button>
                </Group>
            </form>
        </Box>
    );
}

export default ClientFormPage;