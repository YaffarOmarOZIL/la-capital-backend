// En src/pages/ProductSpritePage.jsx (Versión 1.0 - El Estudio Fotográfico)

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, SimpleGrid, FileButton, Image, Box, Stack, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconCamera, IconTrash } from '@tabler/icons-react';
import ImageEditor from '../components/ImageEditor';

// Definimos los "slots" de imágenes que nuestro estudio tendrá
const VISTAS = [
    { id: 'frente', label: 'Vista Frontal' },
    { id: 'lado_d', label: 'Lateral Derecho' },
    { id: 'perspectiva', label: 'En Perspectiva' },
    { id: 'atras', label: 'Vista Trasera' },
    { id: 'lado_i', label: 'Lateral Izquierdo' },
    { id: 'arriba', label: 'Desde Arriba (Cenital)' },
];

function ProductSpritePage() {
    const { id: productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // Estados para las imágenes
    const [files, setFiles] = useState({});
    const [previews, setPreviews] = useState({});
    const [existingImages, setExistingImages] = useState({});

    // Modal para la IA de quitar fondo
    const [aiEditorModalOpened, { open: openAiEditorModal, close: closeAiEditorModal }] = useDisclosure(false);
    const [editingImage, setEditingImage] = useState({ vistaId: null, file: null });

    // ----- ¡AQUÍ ESTÁ LA NUEVA LÓGICA! -----
    // Modal para el editor manual
    const [manualEditorModalOpened, { open: openManualEditorModal, close: closeManualEditorModal }] = useDisclosure(false);
    const [manualEditInfo, setManualEditInfo] = useState({ vistaId: null, file: null });

    const handleEditManual = async (vistaId) => {
        const imageUrl = previews[vistaId] || existingImages[vistaId];
        if (imageUrl) {
            try {
                // Convertimos la URL de la imagen a un objeto File, porque nuestro editor lo necesita
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], `${vistaId}-manual.png`, { type: 'image/png' });
                
                // Guardamos el archivo y la vista que estamos editando
                setManualEditInfo({ vistaId, file });
                // ¡Y abrimos el MODAL de edición manual, en lugar de navegar!
                openManualEditorModal();
            } catch (error) {
                notifications.show({ title: 'Error', message: 'No se pudo cargar la imagen para editar.', color: 'red'});
            }
        }
    };

    useEffect(() => {
        const fetchProductData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`;
                const { data } = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` }});
                setProduct(data);
                if (data.ActivosDigitales?.urls_imagenes) {
                    setExistingImages(data.ActivosDigitales.urls_imagenes);
                }
            } catch (error) {
                notifications.show({ title: 'Error', message: 'No se pudo cargar el producto.', color: 'red' });
            } finally {
                setLoading(false);
            }
        };
        fetchProductData();
    }, [productId]); // <-- Solo depende del productId

    // ----- useEffect #2: ¡El "Recogedor" de imágenes editadas! -----
    useEffect(() => {
        const checkEditedImage = async () => {
            const editedImageData = sessionStorage.getItem('editedImage');
            if (editedImageData) {
                try {
                    const { vistaId, fileData } = JSON.parse(editedImageData);

                    // Convertimos la imagen de vuelta a un archivo
                    const base64Response = await fetch(fileData);
                    const blob = await base64Response.blob();
                    const file = new File([blob], `${vistaId}.png`, { type: 'image/png' });

                    // Usamos la lógica de handleProcessComplete directamente aquí
                    setFiles(prev => ({ ...prev, [vistaId]: file }));
                    setPreviews(prev => ({ ...prev, [vistaId]: URL.createObjectURL(file) }));
                    
                } catch (error) {
                    console.error("Error al procesar la imagen editada:", error);
                } finally {
                    // ¡Importante! Limpiamos el almacenamiento para no volver a cogerla por error
                    sessionStorage.removeItem('editedImage');
                    closeEditorModal(); // Cierra el modal de IA si estuviera abierto
                }
            }
        };

        checkEditedImage();
    }, []); // <-- El array vacío asegura que esto solo se ejecute una vez al montar
    

    const handleFileChange = (file, vistaId) => {
        if (!file) return;
        setEditingImage({ vistaId, file });
        openAiEditorModal();
    };

    const handleProcessComplete = (processedFile, vistaId) => {
        setFiles(prev => ({ ...prev, [vistaId]: processedFile }));
        setPreviews(prev => ({ ...prev, [vistaId]: URL.createObjectURL(processedFile) }));
        closeAiEditorModal();
        closeManualEditorModal();
    };

    const handleClearSelection = () => {
        const vistaId = editingImage.vistaId;
        setEditingImage({ vistaId: null, file: null }); // Limpiamos la imagen en edición
        closeEditorModal();
    };

    const handleSubmit = async () => {
        setUploading(true);

        // ----- ¡AQUÍ ESTÁ LA LÓGICA ANTI-OLVIDO! -----
        const finalFileMap = { ...existingImages };
        let hasNewFiles = false;

        // Convertimos los nuevos archivos 'File' a 'Data URLs' (base64) para el envío
        // y los añadimos al mapa final, sobreescribiendo los antiguos si es necesario.
        for (const vistaId in files) {
            if (files[vistaId]) {
                hasNewFiles = true;
                // ¡Esta conversión es asíncrona, así que la envolvemos en una promesa!
                await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(files[vistaId]);
                    reader.onloadend = () => {
                        finalFileMap[vistaId] = reader.result;
                        resolve();
                    };
                });
            }
        }

        if (!hasNewFiles && Object.keys(existingImages).length > 0) {
            notifications.show({ title: 'Información', message: 'No hay nuevos cambios que guardar.', color: 'blue' });
            setUploading(false);
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/images`;
            await axios.post(apiUrl, formData, { headers: { Authorization: `Bearer ${token}` }});
            
            notifications.show({ title: '¡Éxito!', message: 'Las imágenes se han subido y asociado correctamente.', color: 'green' });
            navigate('/admin/products');
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudieron subir las imágenes.', color: 'red' });
        } finally {
            setUploading(false);
        }
    };
    
    if (loading) return <Center h="80vh"><Loader /></Center>;

    return (
        <Paper withBorder p="xl" shadow="md">
            {/* Modal para el Editor de IA (el que ya tenías) */}
            <Modal opened={editorModalOpened} onClose={closeEditorModal} title={`Editando: ${editingImage.vistaId}`}>
                {editingImage.file && (
                    <Stack align="center">
                        <Image src={URL.createObjectURL(editingImage.file)} maw={200} />
                        <Text size="sm" ta="center">¿Qué quieres hacer con esta imagen?</Text>
                        <Group>
                            <Button onClick={handleRemoveBackgroundAI}>Quitar Fondo (IA)</Button>
                            <Button onClick={openManualEditor} variant="outline">Editar Manualmente</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            // ¡Y tendremos un SEGUNDO modal para el editor de Canvas!
            <Modal opened={manualEditorOpened} onClose={closeManualEditor} size="xl" title="Editor Manual">
                {manualEditInfo.file && (
                    <ImageEditor 
                        file={manualEditInfo.file} 
                    
                        onProcessComplete={(file) => handleProcessComplete(file, manualEditInfo.vistaId)} 
                        onClear={closeManualEditor} 
                    />
                )}
            </Modal>
            <Title order={3}>Estudio Fotográfico AR</Title>
            <Text c="dimmed" mb="xl">Producto: <Text span fw={700}>{product?.nombre}</Text></Text>

            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="lg">
                {VISTAS.map((vista) => {
                    const hasImage = previews[vista.id] || existingImages[vista.id];

                    return (
                        <Stack key={vista.id} align="center" gap="xs">
                            <Text fw={500} size="sm">{vista.label}</Text>
                            
                            <Box
                                w={150} h={150}
                                style={{ border: '2px dashed #ccc', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Image
                                    radius="sm"
                                    src={previews[vista.id] || existingImages[vista.id]}
                                    style={{ display: hasImage ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                                {!hasImage && <IconCamera color='gray' />}
                            </Box>
                            
                            {/* --- ¡AQUÍ ESTÁ LA NUEVA ORGANIZACIÓN DE BOTONES! --- */}
                            <Group gap="xs">
                                <FileButton onChange={(file) => handleFileChange(file, vista.id)} accept="image/png,image/jpeg,image-webp">
                                    {(props) => <Button {...props} variant="light" size="xs">
                                        {hasImage ? 'Cambiar' : 'Seleccionar'}
                                    </Button>}
                                </FileButton>
                                <Button 
                                    size="xs"
                                    variant="subtle"
                                    color="gray"
                                    onClick={() => handleEditManual(vista.id)}
                                    disabled={!hasImage} // <-- Se activa solo si hay imagen
                                    p={0} // Un pequeño truco para que parezca un enlace
                                >
                                    Editar
                                </Button>
                            </Group>
                        </Stack>
                    );
                })}
            </SimpleGrid>

            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={() => navigate('/admin/products')}>Cancelar</Button>
                <Button onClick={handleSubmit} loading={uploading} leftSection={<IconUpload size={16}/>}>
                    Guardar Cambios
                </Button>
            </Group>
        </Paper>
    );
}

export default ProductSpritePage;