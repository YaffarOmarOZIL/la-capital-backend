import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TextInput, Select, Button, Paper, Title, Group, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';

function UserEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState({ nombres: '', apellidos: '', email: '', id_rol: '2' });

  // Carga los datos del usuario a editar
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` }})
        .then(res => setUser(res.data))
        .catch(err => notifications.show({ title: 'Error', message: 'No se pudo cargar el usuario.', color: 'red' }));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/users/${id}`, user, { headers: { Authorization: `Bearer ${token}` }});
      notifications.show({ title: 'Éxito', message: 'Usuario actualizado.', color: 'green' });
      navigate('/admin/users');
    } catch (err) {
        notifications.show({ title: 'Error', message: err.response?.data?.message || 'Fallo al actualizar.', color: 'red' });
    }
  };

  return (
    <Paper withBorder p="md">
      <Title order={3} mb="lg">Editando Usuario: {user.nombres}</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
            <TextInput label="Nombre(s)" value={user.nombres} onChange={(e) => setUser({...user, nombres: e.target.value})} required />
            <TextInput label="Apellido(s)" value={user.apellidos} onChange={(e) => setUser({...user, apellidos: e.target.value})} required />
            <TextInput label="Email" value={user.email} onChange={(e) => setUser({...user, email: e.target.value})} required />
            <Select label="Rol" value={String(user.id_rol)} onChange={(value) => setUser({...user, id_rol: value})} data={[{ value: '1', label: 'Administrador' }, { value: '2', label: 'Empleado' }]} required />
        </Stack>
        <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => navigate('/admin/users')}>Cancelar</Button>
            <Button type="submit">Guardar Cambios</Button>
        </Group>
      </form>
    </Paper>
  );
}
export default UserEditPage;