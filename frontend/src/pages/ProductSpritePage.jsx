// En src/pages/ProductSpritePage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, SimpleGrid, FileButton, Image, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconCamera } from '@tabler/icons-react';

// Los ángulos que vamos a pedir
const VISTAS = [
    { id: 'frente', label: 'Vista Frontal' },
    { id: 'atras', label: 'Vista Trasera' },
    { id: 'lado_d', label: 'Lateral Derecho' },
    { id: 'lado_i', label: 'Lateral Izquierdo' },
    { id: 'arriba', label: 'Desde Arriba (Cenital)' },
    { id: 'perspectiva', label: 'En Perspectiva' },
];

function ProductSpritePage() {
    const { id: productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState({}); // <-- Guarda los archivos File
    const [previews, setPreviews] = useState({}); // <-- Guarda las URLs de previsualización
    const [existingImages, setExistingImages] = useState({}); // <-- Guarda las URLs de la BDD

    // Carga los datos del producto y sus imágenes existentes
    // --- Carga la información del producto ---
    const fetchProductAndAsset = async () => {
        setStatus('loading');
        try {
            const token = localStorage.getItem('authToken');
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`;
            const { data } = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
            setProduct(data);
            if (data.ActivosDigitales && data.ActivosDigitales.length > 0) {
                setAssetUrl(data.ActivosDigitales[0].url_modelo_3d);
            }
            setStatus('idle');
        } catch (err) {
            setStatus('error');
            setError('No se pudo cargar la información del producto.');
        }
    };
    
    useEffect(() => {
        fetchProductAndAsset();
    }, [productId]);


    const handleFileChange = (file, vistaId) => {
        if (!file) return;
        setFiles(prev => ({ ...prev, [vistaId]: file }));
        setPreviews(prev => ({ ...prev, [vistaId]: URL.createObjectURL(file) }));
    };

    const handleSubmit = async () => {
        setUploading(true);
        const formData = new FormData();
        let fileCount = 0;
        
        // Construimos el FormData con los archivos seleccionados
        for (const vistaId in files) {
            if (files[vistaId]) {
                formData.append(vistaId, files[vistaId]); // El backend espera el nombre del campo como 'frente', 'lado_d', etc.
                fileCount++;
            }
        }
        
        if (fileCount === 0) {
            notifications.show({ title: 'Nada que subir', message: 'Por favor, selecciona al menos una imagen para subir.', color: 'yellow' });
            setUploading(false);
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/images`;
            await axios.post(apiUrl, formData, { headers: { Authorization: `Bearer ${token}` }});
            
            notifications.show({ title: '¡Éxito!', message: 'Las imágenes se han subido correctamente.', color: 'green' });
            navigate('/admin/products');
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudieron subir las imágenes.', color: 'red' });
        } finally {
            setUploading(false);
        }
    };
    
    // ... (Tu loader si es necesario) ...

    return (
        <Paper withBorder p="md" shadow="md">
            <Title order={3}>Gestionar Imágenes para AR</Title>
            <Text c="dimmed" mb="lg">Producto: <Text span fw={700}>{product?.nombre}</Text></Text>

            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="lg">
                {VISTAS.map(vista => (
                    <Stack key={vista.id} align="center">
                        <Text fw={500} size="sm">{vista.label}</Text>
                        <Box w={150} h={150} style={{ border: '2px dashed #ccc', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Image radius="sm" src={previews[vista.id] || existingImages[vista.id]} style={{ display: (previews[vista.id] || existingImages[vista.id]) ? 'block' : 'none' }} />
                            {!(previews[vista.id] || existingImages[vista.id]) && <IconCamera color='gray' />}
                        </Box>
                        <FileButton onChange={(file) => handleFileChange(file, vista.id)} accept="image/png,image/jpeg">
                            {(props) => <Button {...props} variant="light" size="xs">Seleccionar</Button>}
                        </FileButton>
                    </Stack>
                ))}
            </SimpleGrid>

            <Group justify="flex-end" mt="xl">
                <Button onClick={handleSubmit} loading={uploading} leftSection={<IconUpload size={16}/>}>Subir Imágenes</Button>
            </Group>
        </Paper>
    );
}

export default ProductSpritePage;