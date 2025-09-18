import { useState, useEffect } from 'react';
import { Table, Button, Group, TextInput, Loader, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ClientListPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
        const fetchClients = async () => {
            try {
                const token = localStorage.getItem('authToken');
                // ----- ¡USANDO TU PATRÓN! -----
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/clients`;
                const { data } = await axios.get(apiUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setClients(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error al cargar los clientes:", error);
                setClients([]);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

  const clientRows = clients.map((client) => (
    <Table.Tr key={client.id}>
      <Table.Td>{client.nombre_completo}</Table.Td>
      <Table.Td>{client.numero_telefono}</Table.Td>
      <Table.Td>
        {/*
            Primero, comprobamos si la fecha existe.
            Si existe, la convertimos a un objeto Date y luego a un formato local (DD/MM/YYYY).
            Si no existe, mostramos 'No registrada'.
        */}
        {client.fecha_nacimiento 
            ? new Date(client.fecha_nacimiento).toLocaleDateString() 
            : 'No registrada'}
      </Table.Td>
      <Table.Td>
        <Button component={Link} to={`/admin/clients/edit/${client.id}`} variant="outline" size="xs">
          Editar
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestión de Clientes</Title>
        <Button component={Link} to="/admin/clients/create">
          Añadir Nuevo Cliente
        </Button>
      </Group>
      
      {loading ? <Loader /> : (
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
      )}
    </>
  );
}

export default ClientListPage;