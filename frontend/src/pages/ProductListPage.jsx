import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Table, ScrollArea, Button, Group, ActionIcon, Badge, Loader, Alert, Center } from '@mantine/core';
import { IconPencil, IconTrash, IconPlus, IconAlertCircle, IconPhotoScan } from '@tabler/icons-react';
import { jwtDecode } from 'jwt-decode';

function ProductListPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const handleDelete = async (productId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
      try {
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`;
        await axios.delete(apiUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        // Refrescar la lista de productos después de eliminar
        fetchProducts(); 
      } catch (err) {
        setError("Error al eliminar el producto.");
      }
    }
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
            <ActionIcon variant="light" color="red" onClick={() => handleDelete(product.id)} title="Eliminar Producto">
              <IconTrash size={16} />
            </ActionIcon>
            <ActionIcon variant="light" color="teal" onClick={() => navigate(`/admin/products/asset/${product.id}`)} title="Gestionar Activo Digital (3D/QR)">
              <IconPhotoScan size={16} />
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
    </>
  );
}

export default ProductListPage;