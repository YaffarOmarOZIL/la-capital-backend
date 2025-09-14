import { useState, useEffect } from 'react';
import { Title, TextInput, Button, Paper, Group, Alert, Loader, Stack } from '@mantine/core';
import axios from 'axios';
import { IconCheck } from '@tabler/icons-react';

function ProfilePage() {
  const [formData, setFormData] = useState({ nombre_completo: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users/me`;
      try {
        const response = await axios.get(apiUrl, { headers: { 'Authorization': `Bearer ${token}` }});
        setFormData(response.data);
      } catch (err) {
        setError('No se pudieron cargar los datos del perfil.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);
  
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users/me`;
      await axios.put(apiUrl, formData, { headers: { 'Authorization': `Bearer ${token}` }});
      setSuccess('¡Perfil actualizado correctamente!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} mb="md">Mi Perfil</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput name="nombre_completo" label="Nombre Completo" value={formData.nombre_completo} onChange={handleChange} required />
          <TextInput name="email" type="email" label="Email" value={formData.email} onChange={handleChange} required />
        </Stack>
        {error && <Alert color="red" title="Error" mt="md">{error}</Alert>}
        {success && <Alert color="green" title="Éxito" icon={<IconCheck />} mt="md">{success}</Alert>}
        <Group justify="flex-end" mt="xl">
          <Button type="submit" loading={loading}>Guardar Cambios</Button>
        </Group>
      </form>
      
      {/* Aquí irá el módulo de 2FA en el futuro */}
      <Title order={3} mt="xl" pt="xl" style={{ borderTop: '1px solid #e0e0e0' }}>Autenticación de Dos Pasos (2FA)</Title>
      <Text c="dimmed">Próximamente: Activa una capa extra de seguridad para tu cuenta usando Google Authenticator.</Text>
      <Button mt="md" disabled>Activar 2FA (Próximamente)</Button>
    </Paper>
  );
}

export default ProfilePage;