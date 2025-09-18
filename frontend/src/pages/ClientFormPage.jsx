// En src/pages/ClientFormPage.jsx

import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Box, Group, Title, Select, Textarea } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DateInput } from '@mantine/dates'; // Para la fecha de nacimiento

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
        },
    });

    // --- Cargar datos del cliente si estamos en modo edición ---
    useEffect(() => {
        if (isEditing) {
            const fetchClient = async () => {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get(`/api/clients/${clientId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Convertir la fecha a un objeto Date para el componente DateInput
                form.setValues({ ...data, fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : null });
            };
            fetchClient();
        }
    }, [isEditing, clientId]);

    // --- Función que se ejecuta al enviar el formulario ---
    const handleSubmit = async (values) => {
        try {
            const token = localStorage.getItem('authToken');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            if (isEditing) {
                await axios.put(`/api/clients/${clientId}`, values, config);
            } else {
                await axios.post('/api/clients', values, config);
            }
            navigate('/admin/clients'); // Redirigir a la lista de clientes
        } catch (error) {
            console.error('Error al guardar el cliente:', error);
            // Aquí podrías añadir una notificación de error para el usuario
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