import { useState, useEffect } from 'react';
import { Title, Text, Table, ScrollArea, Avatar, Badge, Loader, Alert, Center, Group, ActionIcon, Modal, Button } from '@mantine/core';
import axios from 'axios';
import { IconAlertCircle, IconPencil, IconTrash, IconCheck } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { jwtDecode } from 'jwt-decode';

function UserListPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  const token = localStorage.getItem('authToken');
  const decodedToken = token ? jwtDecode(token) : {};
  const { role: userRole, id: currentUserId } = decodedToken;

  // --- Efecto para cargar los datos cuando la página carga ---
    const fetchUsers = async () => {
      try {
        // Obtenemos el token guardado del login
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error("No autenticado.");
        }

        // Construimos la URL del endpoint
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users`;

        // ¡Hacemos la petición incluyendo el token en los headers!
        const response = await axios.get(apiUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setUsers(response.data);

      } catch (err) {
        setError(err.response?.data?.message || err.message || "Error al cargar los usuarios.");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
      fetchUsers();
    }, []);

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users/${userToDelete.id}`;
      await axios.delete(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      notifications.show({ title: 'Éxito', message: 'Usuario eliminado correctamente.', color: 'green' });
      fetchUsers();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'No se pudo eliminar el usuario.', color: 'red' });
    } finally {
      close();
      setUserToDelete(null);
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    open();
  };

  // --- Renderizado Condicional ---
  if (loading) return <Center><Loader color="brand-yellow" /></Center>;
  if (error) return <Alert icon={<IconAlertCircle />} title="Error" color="red">{error}</Alert>;

  // --- Creación de las Filas de la Tabla ---
  const rows = users.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>
        <Avatar color="brand-yellow" radius="xl">{user.nombre_completo.charAt(0).toUpperCase()}</Avatar>
      </Table.Td>
      <Table.Td>{user.nombre_completo}</Table.Td>
      <Table.Td>{user.email}</Table.Td>
      <Table.Td>
        <Badge color={user.rol === 'Administrador' ? 'orange' : 'gray'} variant="light">
          {user.rol}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          {/* ¡Ahora el botón de editar es funcional! */}
          <ActionIcon variant="light" color="blue" onClick={() => navigate(`/admin/users/edit/${user.id}`)} title="Editar Usuario">
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon 
            variant="light" 
            color="red" 
            onClick={() => openDeleteModal(user)} 
            disabled={user.id === currentUserId}
            title={user.id === currentUserId ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Title order={2} mb="md">Lista de Usuarios del Sistema</Title>
      <Text c="dimmed" mb="lg">Desde aquí puedes ver, editar y eliminar los usuarios del personal.</Text>
      
      <ScrollArea>
        <Table miw={800} striped highlightOnHover withTableBorder >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Avatar</Table.Th>
              <Table.Th>Nombre Completo</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Rol</Table.Th>
              <Table.Th>Acciones</Table.Th> {/* <-- NUEVA COLUMNA */}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      <Modal opened={opened} onClose={close} title="Confirmar Eliminación" centered>
        <Text>¿Estás seguro de que quieres eliminar a 
          <Text span fw={700} mx={4}>{userToDelete?.nombre_completo}</Text>?</Text>
        <Text c="red" fw={700} mt="md">¡Esta acción es irreversible!</Text>
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={close}>Cancelar</Button>
          <Button color="red" onClick={handleDelete}>Sí, eliminar</Button>
        </Group>
      </Modal>
    </>
  );
}

export default UserListPage;