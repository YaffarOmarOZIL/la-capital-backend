import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TextInput, Textarea, NumberInput, Switch, Button, Paper, Title, Group, Stack, Loader, Center, Alert } from '@mantine/core';

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

  // --- CARGA LOS DATOS SI ESTAMOS EDITANDO ---
  useEffect(() => {
    if (isEditing) {
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${id}`;
      axios.get(apiUrl, { headers: { 'Authorization': `Bearer ${token}` }})
        .then(response => {
          setProduct(response.data);
          setLoading(false);
        })
        .catch(err => {
          setError('No se pudo cargar el producto para editar.');
          setLoading(false);
        });
    }
  }, [id, isEditing]);
  
  const handleChange = (event) => {
    const { name, value } = event.currentTarget;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (event) => {
    setProduct(prev => ({ ...prev, activo: event.currentTarget.checked }));
  };

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
      await axios[method](apiUrl, {
          nombre: product.nombre,
          descripcion: product.descripcion,
          precio: product.precio,
          categoria: product.categoria,
          activo: product.activo,
        }, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      navigate('/admin/products');
    } catch (err) {
      setError(err.response?.data?.message || 'Ocurrió un error al guardar.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <Center h={200}><Loader/></Center>;

  return (
    <Paper withBorder shadow="md" p="md" radius="md">
      <Title order={3} mb="lg">{isEditing ? `Editando: ${product.nombre}` : 'Crear Nuevo Producto'}</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput name="nombre" label="Nombre del Producto" value={product.nombre} onChange={handleChange} required />
          <Textarea name="descripcion" label="Descripción" placeholder="Ingredientes, tamaño, etc." value={product.descripcion} onChange={handleChange} />
          <NumberInput name="precio" label="Precio (Bs.)" value={product.precio} onChange={(val) => setProduct(p => ({...p, precio: val}))} min={0} precision={2} step={0.5} required />
          <TextInput name="categoria" label="Categoría" placeholder="Hamburguesas, Bebidas, etc." value={product.categoria} onChange={handleChange} required />
          <Switch name="activo" label="Producto Activo en el Menú" checked={product.activo} onChange={handleSwitchChange} />
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