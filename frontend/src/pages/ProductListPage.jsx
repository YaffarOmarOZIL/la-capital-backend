import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Table, ScrollArea, Button, Group, ActionIcon, Badge, Loader, Alert, Center, Modal } from '@mantine/core';
import { IconPencil, IconTrash, IconPlus, IconAlertCircle, IconPhotoScan, IconCheck, IconBox } from '@tabler/icons-react';
import { jwtDecode } from 'jwt-decode';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

function ProductListPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Obtenemos el rol del usuario para la UI condicional
  const token = localStorage.getItem('authToken');
  const userRole = token ? jwtDecode(token).role : 'Empleado';

  // --- FUNCIÓN PARA CARGAR LOS DATOS ---
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products`;
      const response = await axios.get(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (err) {
      setError("No se pudieron cargar los productos. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []); // Se ejecuta solo una vez al cargar

  // --- FUNCIÓN PARA ELIMINAR UN PRODUCTO ---
  const handleDelete = async () => {
    if (!productToDelete) return;
        try {
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productToDelete.id}`;
        await axios.delete(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        
        notifications.show({
            title: 'Producto Eliminado',
            message: `El producto #${productToDelete.id} (${productToDelete.nombre}) ha sido eliminado con éxito.`,
            color: 'green',
            icon: <IconCheck />,
        });
        fetchProducts();
        } catch (err) {
        notifications.show({
            title: 'Error al Eliminar',
            message: err.response?.data?.message || 'No se pudo completar la operación.',
            color: 'red',
            icon: <IconAlertCircle />,
        });
        } finally {
        close();
        setProductToDelete(null);
        }
    };

    const openDeleteModal = (product) => {
        setProductToDelete(product);
        open();
    };
  
  // ----- RENDERIZADO -----

  if (loading) {
    return <Center h={200}><Loader color="brand-yellow" /></Center>;
  }

  if (error) {
    return <Alert icon={<IconAlertCircle />} title="Error" color="red">{error}</Alert>;
  }

  const rows = products.map((product) => (
    <Table.Tr key={product.id}>
      <Table.Td>{product.id}</Table.Td>
      <Table.Td fw={500}>{product.nombre}</Table.Td>
      <Table.Td>Bs. {product.precio ? product.precio.toFixed(2) : '0.00'}</Table.Td>
      <Table.Td>{product.categoria}</Table.Td>
      <Table.Td>
        <Badge color={product.ActivosDigitales ? 'teal' : 'gray'}>
          {product.ActivosDigitales ? 'Sí' : 'No'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge color={product.activo ? 'green' : 'red'}>
          {product.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </Table.Td>
      {userRole === 'Administrador' && (
        <Table.Td>
          <Group gap="xs">
            <ActionIcon variant="light" color="blue" onClick={() => navigate(`/admin/products/edit/${product.id}`)} title="Editar Producto">
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon variant="light" color="red" onClick={() => openDeleteModal(product)}>
                <IconTrash size={16} />
            </ActionIcon>
            <ActionIcon component={Link} to={`/admin/products/asset/${product.id}`} variant="light" color="teal" title="Gestionar Activo 3D">
                <IconBox size={16} />
            </ActionIcon>
          </Group>
        </Table.Td>
      )}
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Gestión de Productos</Title>
          <Text c="dimmed">Administra el catálogo de productos del menú.</Text>
        </div>
        {userRole === 'Administrador' && (
          <Button component={Link} to="/admin/products/create" leftSection={<IconPlus size={16} />}>
            Añadir Producto
          </Button>
        )}
      </Group>
      
      <ScrollArea>
        <Table miw={800} striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Precio</Table.Th>
              <Table.Th>Categoría</Table.Th>
              <Table.Th>3D/QR</Table.Th>
              <Table.Th>Estado</Table.Th>
              {userRole === 'Administrador' && <Table.Th>Acciones</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={userRole === 'Administrador' ? 7 : 6}><Text ta="center">No hay productos registrados.</Text></Table.Td></Table.Tr>}</Table.Tbody>
        </Table>
      </ScrollArea>
      <Modal opened={opened} onClose={close} title="Confirmar Eliminación" centered>
                <Text>¿Estás seguro de que quieres eliminar el producto
                    <Text span fw={700} mx={4}>{productToDelete?.nombre}</Text>?
                </Text>
                <Text c="red" fw={700} mt="md">
                    ¡Esta acción es irreversible!
                </Text>
                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={close}>Cancelar</Button>
                    <Button color="red" onClick={handleDelete}>
                        Sí, eliminar producto
                    </Button>
                </Group>
            </Modal>
    </>
  );
}

export default ProductListPage;