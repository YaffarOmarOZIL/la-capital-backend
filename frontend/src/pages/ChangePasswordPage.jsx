import { useState } from 'react';
import { Title, PasswordInput, Button, Paper, Alert, Loader, Stack } from '@mantine/core';
import axios from 'axios';
import { IconCheck } from '@tabler/icons-react';

function ChangePasswordPage() {
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 1. Validación del lado del cliente
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users/change-password`;
      
      const response = await axios.post(apiUrl, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setSuccess(response.data.message);
      setFormData({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); // Limpia el formulario

    } catch (err) {
        setError(err.response?.data?.errors ? err.response.data.errors[0].msg : err.response?.data?.message || 'Ocurrió un error inesperado.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md" maw={500} mx="auto">
      <Title order={2} mb="md">Cambiar Contraseña</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          <PasswordInput 
            name="currentPassword"
            label="Contraseña Actual"
            placeholder="Ingresa tu contraseña actual"
            value={formData.currentPassword}
            onChange={handleChange} 
            required 
          />
          <PasswordInput 
            name="newPassword"
            label="Nueva Contraseña"
            placeholder="••••••••"
            description="Mínimo 8 caracteres, con mayúsculas, minúsculas, números y símbolos."
            value={formData.newPassword}
            onChange={handleChange} 
            required 
          />
          <PasswordInput 
            name="confirmNewPassword"
            label="Confirmar Nueva Contraseña"
            placeholder="••••••••"
            value={formData.confirmNewPassword}
            onChange={handleChange} 
            required 
          />
        </Stack>
        
        {error && <Alert color="red" title="Error" mt="md">{error}</Alert>}
        {success && <Alert color="green" title="Éxito" icon={<IconCheck />} mt="md">{success}</Alert>}

        <Button type="submit" mt="xl" loading={loading}>
          Actualizar Contraseña
        </Button>
      </form>
    </Paper>
  );
}

export default ChangePasswordPage;