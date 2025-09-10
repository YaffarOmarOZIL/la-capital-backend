import { useState, useEffect } from 'react';
import { Title, Text, Table, ScrollArea, Avatar, Badge, Loader, Alert } from '@mantine/core';
import axios from 'axios';
import { IconAlertCircle } from '@tabler/icons-react';

function UserListPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Efecto para cargar los datos cuando la página carga ---
  useEffect(() => {
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

    fetchUsers();
  }, []); // El array vacío asegura que se ejecute solo una vez

  // --- Renderizado Condicional ---
  if (loading) {
    return <Loader color="brand-yellow" />;
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size="1rem" />} title="¡Error!" color="red" variant="light">
        {error}
      </Alert>
    );
  }

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
    </Table.Tr>
  ));

  // --- Renderizado de la Tabla Final ---
  return (
    <>
      <Title order={2} mb="md">Lista de Usuarios del Sistema</Title>
      <Text mb="lg">Aquí se muestran todos los usuarios registrados en el panel de administración.</Text>
      
      <ScrollArea> {/* ¡Esto la hace responsiva en celulares! */}
        <Table miw={700} striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Avatar</Table.Th>
              <Table.Th>Nombre Completo</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Rol</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>
    </>
  );
}

export default UserListPage;