import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, TextInput, PasswordInput, Button, Paper, Group, Select, Alert, Loader, Stack } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

function UserCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: '2', // Por defecto, creamos "Empleado"
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRolChange = (value) => {
    setFormData({ ...formData, rol: value });
  };

  // --- VALIDACIÓN DEL LADO DEL CLIENTE ---
  const validateForm = () => {
    const newErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Email no es válido.';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    // Podemos añadir más validaciones de contraseña aquí si queremos
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccess(false);

    if (!validateForm()) return; // Si la validación del cliente falla, no continuamos
    
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users`;
      
      await axios.post(apiUrl, {
        nombres: formData.nombre,
        apellidos: formData.apellido,
        email: formData.email,
        password: formData.password,
        id_rol: parseInt(formData.rol),
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setSuccess(true);
      // Opcional: Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);

    } catch (err) {
        if (err.response?.data?.errors) {
          // Si vienen errores de express-validator
          const serverValidationErrors = err.response.data.errors.map(e => e.msg).join(' ');
          setServerError(serverValidationErrors);
        } else {
          setServerError(err.response?.data?.message || 'Ocurrió un error inesperado.');
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} mb="md">Crear Nuevo Usuario</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput 
            name="nombre" 
            label="Nombre(s)" 
            placeholder="Juan" 
            onChange={handleChange} 
            required 
          />
          <TextInput 
            name="apellido" 
            label="Apellido(s)" 
            placeholder="Pérez" 
            onChange={handleChange} 
            required 
          />
          <TextInput 
            name="email"
            label="Email" 
            placeholder="juan@email.com" 
            onChange={handleChange} 
            error={errors.email}
            required 
          />
          <PasswordInput 
            name="password"
            label="Contraseña"
            placeholder="••••••••"
            description="Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo."
            onChange={handleChange} 
            required 
          />
          <PasswordInput 
            name="confirmPassword"
            label="Confirmar Contraseña" 
            placeholder="••••••••"
            onChange={handleChange} 
            error={errors.confirmPassword}
            required 
          />
          <Select
            label="Rol del Usuario"
            value={formData.rol}
            onChange={handleRolChange}
            data={[
              { value: '1', label: 'Administrador' },
              { value: '2', label: 'Empleado' },
            ]}
            required
          />
        </Stack>
        
        {serverError && <Alert color="red" title="Error del Servidor" icon={<IconAlertCircle />} mt="md">{serverError}</Alert>}
        {success && <Alert color="green" title="¡Éxito!" icon={<IconCheck />} mt="md">Usuario creado correctamente. Redirigiendo a la lista...</Alert>}

        <Group justify="flex-end" mt="xl">
          <Button type="submit" loading={loading}>
            Crear Usuario
          </Button>
        </Group>
      </form>
    </Paper>
  );
}

export default UserCreatePage;