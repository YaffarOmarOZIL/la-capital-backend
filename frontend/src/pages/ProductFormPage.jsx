import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TextInput, Textarea, NumberInput, Switch, Button, Paper, Title, Group, Stack, Loader, Center, Alert, Text, SegmentedControl, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';

function ProductFormPage() {
  const { id } = useParams(); // Obtiene el :id de la URL
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [product, setProduct] = useState({
    nombre: '',
    descripcion: '',
    precio: 0.00,
    categoria: '',
    activo: true
  });
  const [loading, setLoading] = useState(isEditing); // Si estamos editando, empezamos cargando
  const [error, setError] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [otraCategoria, setOtraCategoria] = useState('');
  
  const categoriasDefault = ['Hamburguesas', 'Alitas', 'Costillas', 'Entradas y Piqueos', 'Postres'];

  // --- CARGA LOS DATOS SI ESTAMOS EDITANDO ---
  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${id}`;
      axios.get(apiUrl, { headers: { 'Authorization': `Bearer ${token}` }})
        .then(response => {
          const productData = response.data;
          setProduct(productData);
          // ¡Aquí está la magia para el selector!
          // Si la categoría del producto no está en la lista, activamos el modo "Otro"
          if (!categoriasDefault.includes(productData.categoria)) {
            setCategoriaSeleccionada('Otro');
            setOtraCategoria(productData.categoria);
          } else {
            setCategoriaSeleccionada(productData.categoria);
          }
        })
        .catch(err => {
          setError('No se pudo cargar el producto para editar.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (categoriaSeleccionada === 'Otro') {
      setProduct(p => ({ ...p, categoria: otraCategoria }));
    } else {
      setProduct(p => ({ ...p, categoria: categoriaSeleccionada }));
    }
  }, [categoriaSeleccionada, otraCategoria]);
  
  
  const handleChange = (event) => {
    const { name, value } = event.currentTarget;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (event) => {
    setProduct(prev => ({ ...prev, activo: event.currentTarget.checked }));
  };

  const handlePriceChange = (value) => setProduct(prev => ({ ...prev, precio: Number(value) || 0 }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const token = localStorage.getItem('authToken');
    const apiUrl = isEditing 
      ? `${import.meta.env.VITE_API_BASE_URL}/api/products/${id}`
      : `${import.meta.env.VITE_API_BASE_URL}/api/products`;
    
    const method = isEditing ? 'put' : 'post';

    try {
            await axios[method](apiUrl, product, { headers: { 'Authorization': `Bearer ${token}` } });
            notifications.show({ title: '¡Éxito!', message: `Producto ${isEditing ? 'actualizado' : 'creado'} correctamente.`, color: 'green' });
            navigate('/admin/products');
        } catch (err) {
            const errorMsg = err.response?.data?.errors ? err.response.data.errors.map(e => e.msg).join(', ') : (err.response?.data?.message || 'Ocurrió un error inesperado.');
            notifications.show({ title: 'Error', message: errorMsg, color: 'red' });
        } finally {
            setLoading(false);
        }
    };
    
  if (loading) return <Center h={200}><Loader/></Center>;

  return (
    <Paper withBorder p="md" shadow="md">
      <Title order={3} mb="lg">{isEditing ? `Editando: ${product.nombre}` : 'Crear Nuevo Producto'}</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            name="nombre"
            label="Nombre del Producto"
            value={product.nombre || ''}
            onChange={handleChange}
            required
          />
          <Textarea
            name="descripcion"
            label="Descripción"
            value={product.descripcion || ''}
            onChange={handleChange}
          />
          <NumberInput
            label="Precio (Bs.)"
            value={Number(product.precio) || 0}
            onChange={handlePriceChange}
            min={0}
            max={10000000} // <-- Validación de precio máximo
            precision={2}
            step={0.5}
            required
          />
          
          <Stack gap="xs">
            <Text size="sm" fw={500}>Categoría</Text>
            <SegmentedControl
              data={['Hamburguesas', 'Alitas', 'Costillas', 'Postres', 'Otro']}
              value={categoriaSeleccionada}
              onChange={setCategoriaSeleccionada}
            />
            {categoriaSeleccionada === 'Otro' && (
              <TextInput placeholder="Especifica otra categoría" value={otraCategoria} onChange={(e) => setOtraCategoria(e.currentTarget.value)} />
            )}
          </Stack>
          
          <Switch
            name="activo"
            label="Producto Activo en el Menú"
            checked={product.activo}
            onChange={handleSwitchChange}
          />
        </Stack>

        {error && <Alert color="red" title="Error" mt="md">{error}</Alert>}
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => navigate('/admin/products')}>Cancelar</Button>
          <Button type="submit" loading={loading}>{isEditing ? 'Guardar Cambios' : 'Crear Producto'}</Button>
        </Group>
      </form>
    </Paper>
  );
}

export default ProductFormPage;