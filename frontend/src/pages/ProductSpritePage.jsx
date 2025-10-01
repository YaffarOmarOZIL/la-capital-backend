// En src/pages/ProductSpritePage.jsx (VERSIÓN FINAL, DESDE CERO)
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, SimpleGrid, FileButton, Image, Box, Stack, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconCamera, IconPhotoOff, IconEdit } from '@tabler/icons-react';
import ImageEditor from '../components/ImageEditor';
import { removeBackground } from '@imgly/background-removal';

const VISTAS = [ { id: 'frente', label: 'Vista Frontal' }, { id: 'lado_d', label: 'Lateral Derecho' }, { id: 'perspectiva', label: 'En Perspectiva' }, { id: 'atras', label: 'Vista Trasera' }, { id: 'lado_i', label: 'Lateral Izquierdo' }, { id: 'arriba', label: 'Desde Arriba (Cenital)' } ];

const resizeImage = (file, maxSize = 1024) => { return new Promise((resolve) => { const img = new window.Image(); img.src = URL.createObjectURL(file); img.onload = () => { let { width, height } = img; if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } } const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(img, 0, 0, width, height); canvas.toBlob((blob) => { resolve(new File([blob], file.name.split('.')[0] + '.png', { type: 'image/png' })); }, 'image/png', 0.9); }; }); };

function ProductSpritePage() {
    const { id: productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    const [images, setImages] = useState({});
    const [modal, setModal] = useState({ opened: false, vistaId: null, file: null, mode: null });
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`;
                const { data } = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
                setProduct(data);
                if (data.ActivosDigitales?.urls_imagenes) {
                    const initialImages = {};
                    for (const vistaId in data.ActivosDigitales.urls_imagenes) {
                        initialImages[vistaId] = { preview: data.ActivosDigitales.urls_imagenes[vistaId], file: null, source: 'db' };
                    }
                    setImages(initialImages);
                }
            } catch (error) { notifications.show({ title: 'Error', message: 'No se pudo cargar el producto.', color: 'red' }); }
            setLoading(false);
        };
        initialize();
    }, [productId]);

    const handleFileChange = async (file, vistaId) => {
        if (!file) return;
        const resized = await resizeImage(file);
        setModal({ opened: true, vistaId, file: resized, mode: 'chooser' });
    };

    const handleAIProcess = async () => {
        setIsProcessingAI(true);
        try {
            const blob = await removeBackground(modal.file);
            const finalFile = new File([blob], modal.file.name, { type: 'image/png' });
            onProcessComplete(finalFile, modal.vistaId);
        } catch (error) { notifications.show({ title: 'Error de IA', message: 'No se pudo quitar el fondo.', color: 'red' }); closeAllModals(); } 
        finally { setIsProcessingAI(false); }
    };

    const handleManualProcess = () => setModal(prev => ({ ...prev, mode: 'canvas' }));
    const onProcessComplete = (processedFile, vistaId) => {
        setImages(prev => ({ ...prev, [vistaId]: { preview: URL.createObjectURL(processedFile), file: processedFile, source: 'new' } }));
        closeAllModals();
    };
    const closeAllModals = () => setModal({ opened: false, vistaId: null, file: null, mode: null });

    const handleSubmit = async () => {
        setUploading(true);
        const formData = new FormData();
        let newOrUpdated = false;
        for (const vistaId in images) {
            if (images[vistaId].source === 'new') { // Solo sube los archivos nuevos/modificados
                formData.append(vistaId, images[vistaId].file);
                newOrUpdated = true;
            } else if (images[vistaId].source === 'db') { // Mantiene los antiguos
                formData.append(vistaId, images[vistaId].preview);
            }
        }
        if (!newOrUpdated) { notifications.show({ title: 'Sin cambios', message: 'No has añadido ni modificado imágenes.', color: 'blue' }); setUploading(false); return; }
        
        try {
            const token = localStorage.getItem('authToken');
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/images`;
            await axios.post(apiUrl, formData, { headers: { Authorization: `Bearer ${token}` } });
            notifications.show({ title: '¡Éxito!', message: 'Los cambios se han guardado.', color: 'green' });
            navigate('/admin/products');
        } catch (error) { notifications.show({ title: 'Error', message: 'No se pudieron subir las imágenes.', color: 'red' }); } 
        finally { setUploading(false); }
    };
    
    if (loading) return <Center h="80vh"><Loader /></Center>;

    return (
        <Paper withBorder p="xl">
            <Modal opened={modal.opened} onClose={closeAllModals} title={`Editando: ${modal.vistaId}`} size={modal.mode === 'canvas' ? 'xl' : 'sm'} centered>
                {modal.mode === 'chooser' && modal.file && (
                    <Stack align="center">
                        <Image src={URL.createObjectURL(modal.file)} maw={250} radius="md" />
                        <Group>
                            <Button onClick={handleAIProcess} loading={isProcessingAI} leftSection={<IconPhotoOff size={16}/>}>Quitar Fondo (IA)</Button>
                            <Button onClick={handleManualProcess} variant="outline" leftSection={<IconEdit size={16}/>}>Editar Manualmente</Button>
                        </Group>
                    </Stack>
                )}
                {modal.mode === 'canvas' && modal.file && (
                    <ImageEditor file={modal.file} onProcessComplete={(file) => onProcessComplete(file, modal.vistaId)} onClear={closeAllModals} />
                )}
            </Modal>
            
            <Title order={3}>Estudio Fotográfico AR</Title>
            <Text c="dimmed" mb="xl">Producto: <Text span fw={700}>{product?.nombre}</Text></Text>

            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="lg">
                {VISTAS.map((vista) => (
                    <Stack key={vista.id} align="center" gap="xs">
                        <Text fw={500} size="sm">{vista.label}</Text>
                        <Box w={150} h={150} style={{ border: '2px dashed #ccc', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Image radius="sm" src={images[vista.id]?.preview} fit="contain" style={{ display: images[vista.id] ? 'block' : 'none', width: '100%', height: '100%' }} />
                            {!images[vista.id] && <IconCamera color='gray' />}
                        </Box>
                        <Group gap="xs">
                            <FileButton onChange={(file) => handleFileChange(file, vista.id)} accept="image/png,image/jpeg,image/webp">
                                {(props) => <Button {...props} variant="light" size="xs">{images[vista.id] ? 'Cambiar' : 'Seleccionar'}</Button>}
                            </FileButton>
                        </Group>
                    </Stack>
                ))}
            </SimpleGrid>
            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={() => navigate('/admin/products')}>Cancelar</Button>
                <Button onClick={handleSubmit} loading={uploading} leftSection={<IconUpload size={16}/>}>Guardar Cambios</Button>
            </Group>
        </Paper>
    );
}
export default ProductSpritePage;