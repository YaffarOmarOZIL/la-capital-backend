// En src/pages/ClientListPage.jsx (Versión Final con todo integrado)

import { useState, useEffect } from 'react';
// ----- LOS INGREDIENTES NUEVOS (Las Importaciones) -----
import { Table, Button, Group, TextInput, Loader, Title, Text, Center, ActionIcon, Modal } from '@mantine/core';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { IconSearch, IconTrash, IconPencil } from '@tabler/icons-react'; // <-- NUEVO: Iconos para los botones
import { notifications } from '@mantine/notifications'; // <-- NUEVO: Para las notificaciones bonitas

function ClientListPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // ----- LA LÓGICA (El Cerebro de la Página) -----

  // <-- NUEVO: Estados para el buscador y el modal
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 500); // Solo busca 500ms después de que dejas de teclear
  const [opened, { open, close }] = useDisclosure(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  // <-- MEJORADO: La función para cargar los clientes ahora está preparada para buscar
  const fetchClients = async () => {
    setLoading(true); // Ponemos el loader al empezar a buscar
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/clients`;
      
      const { data } = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: debouncedSearchTerm } // <-- ¡Enviamos el término de búsqueda al backend!
      });
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar los clientes:", error);
      notifications.show({ title: 'Error', message: 'No se pudieron cargar los clientes.', color: 'red' });
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // <-- MEJORADO: useEffect ahora depende del buscador
  // Se ejecutará al cargar la página y cada vez que dejes de teclear en el buscador
  useEffect(() => {
    fetchClients();
  }, [debouncedSearchTerm]);

  // <-- NUEVO: Función para confirmar la eliminación
  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/clients/${clientToDelete.id}`;
      await axios.delete(apiUrl, { headers: { Authorization: `Bearer ${token}` } });

      notifications.show({ title: 'Éxito', message: `Cliente "${clientToDelete.nombre_completo}" eliminado.`, color: 'green' });
      close();
      fetchClients(); // Volvemos a cargar la lista para que desaparezca el cliente eliminado
    } catch (error) {
      notifications.show({ title: 'Error', message: 'No se pudo eliminar el cliente.', color: 'red' });
    }
  };

  // <-- NUEVO: Función para abrir el modal
  const openDeleteModal = (client) => {
    setClientToDelete(client);
    open();
  };

  // ----- EL CUERPO (Lo que se ve en pantalla - el JSX) -----

  const clientRows = clients.map((client) => (
    <Table.Tr key={client.id}>
      <Table.Td>{client.nombre_completo}</Table.Td>
      <Table.Td>{client.numero_telefono}</Table.Td>
      <Table.Td>{client.fecha_nacimiento ? new Date(client.fecha_nacimiento).toLocaleDateString() : 'No registrada'}</Table.Td>
      <Table.Td>
        {/* <-- MEJORADO: Usamos ActionIcon para que se vea más limpio */}
        <Group gap="xs">
          <ActionIcon component={Link} to={`/admin/clients/edit/${client.id}`} variant="light" color="blue" title="Editar Cliente">
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon variant="light" color="red" onClick={() => openDeleteModal(client)} title="Eliminar Cliente">
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestión de Clientes</Title>
        <Button component={Link} to="/admin/clients/create">Añadir Nuevo Cliente</Button>
      </Group>

      {/* <-- NUEVO: El campo de búsqueda */}
      <TextInput
        placeholder="Buscar por nombre o número de teléfono..."
        leftSection={<IconSearch size={14} />}
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
        mb="md"
      />
      
      {loading ? (
        <Center><Loader /></Center>
      ) : clients.length > 0 ? (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre Completo</Table.Th>
              <Table.Th>Teléfono</Table.Th>
              <Table.Th>Fecha de Nacimiento</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{clientRows}</Table.Tbody>
        </Table>
      ) : (
        // <-- MEJORADO: Mensaje inteligente por si no hay resultados
        <Center><Text mt="xl">No se encontraron clientes {searchTerm ? `con el término "${searchTerm}"` : 'registrados'}.</Text></Center>
      )}

      {/* <-- NUEVO: El modal de confirmación, invisible hasta que se necesite */}
      <Modal opened={opened} onClose={close} title="Confirmar Eliminación" centered>
        <Text>¿Estás seguro de que quieres eliminar a 
          <Text span c="red" fw={700} mx={4}>{clientToDelete?.nombre_completo}</Text>?</Text>
        <Text c="dimmed" size="sm" mt="sm">Esta acción es irreversible y no se podrá deshacer.</Text>
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={close}>Cancelar</Button>
          <Button color="red" onClick={handleDeleteConfirm}>Sí, eliminar</Button>
        </Group>
      </Modal>
    </>
  );
}

export default ClientListPage;