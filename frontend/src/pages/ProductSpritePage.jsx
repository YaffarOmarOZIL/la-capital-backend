// En src/pages/ProductSpritePage.jsx (Versión 1.0 - El Estudio Fotográfico)

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, SimpleGrid, FileButton, Image, Box, Stack, Modal, Progress } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconCamera, IconPhotoOff, IconEdit } from '@tabler/icons-react';
import ImageEditor from '../components/ImageEditor';
import { removeBackground } from '@imgly/background-removal'; // <-- La magia de la IA

// Definimos los "slots" de imágenes que nuestro estudio tendrá
const VISTAS = [
    { id: 'frente', label: 'Vista Frontal' },
    { id: 'lado_d', label: 'Lateral Derecho' },
    { id: 'perspectiva', label: 'En Perspectiva' },
    { id: 'atras', label: 'Vista Trasera' },
    { id: 'lado_i', label: 'Lateral Izquierdo' },
    { id: 'arriba', label: 'Desde Arriba (Cenital)' },
];

const resizeImage = (file, maxSize = 1024) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            let { width, height } = img;
            if (width > height) {
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
            } else {
                if (height > maxSize) { width *= maxSize / height; height = maxSize; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                resolve(new File([blob], file.name.split('.')[0] + '.png', { type: 'image/png' }));
            }, 'image/png', 0.9);
        };
    });
};

function ProductSpritePage() {
    const { id: productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // Estados para las imágenes
    const [filesToUpload, setFilesToUpload] = useState({});
    const [previews, setPreviews] = useState({});
    const [existingImages, setExistingImages] = useState({});

    // ----- ¡EL NUEVO ESTADO UNIFICADO PARA EL MODAL! -----
    const [images, setImages] = useState({}); // Contendrá { preview: '...', file: File, source: 'db'/'new' }
    const [modal, setModal] = useState({ opened: false, vistaId: null, file: null, mode: null });
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    useEffect(() => {
        // Definimos la función principal que se ejecutará al cargar
        const initializePage = async () => {
            // Primero, siempre cargamos los datos del producto
            try {
                const token = localStorage.getItem('authToken');
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`;
                const { data } = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
                setProduct(data);
                if (data.ActivosDigitales?.urls_imagenes) {
                    setExistingImages(data.ActivosDigitales.urls_imagenes);
                }
            } catch (error) {
                notifications.show({ title: 'Error', message: 'No se pudo cargar el producto.', color: 'red' });
            }

            // Después, revisamos si hay una imagen editada esperando
            const editedImageData = sessionStorage.getItem('editedImage');
            if (editedImageData) {
                try {
                    const { vistaId, fileData } = JSON.parse(editedImageData);
                    const base64Response = await fetch(fileData);
                    const blob = await base64Response.blob();
                    const file = new File([blob], `${vistaId}.png`, { type: 'image/png' });
                    
                    // Actualizamos los estados con la nueva imagen editada
                    setFilesToUpload(prev => ({ ...prev, [vistaId]: file }));
                    setPreviews(prev => ({ ...prev, [vistaId]: URL.createObjectURL(file) }));

                } catch (error) {
                    console.error("Error al procesar la imagen editada:", error);
                } finally {
                    sessionStorage.removeItem('editedImage');
                }
            }

            setLoading(false); // Ponemos el loading en false al final de TODO
        };

        initializePage();
    }, [productId]); // <-- El único dependiente real es el ID del producto

    const handleFileChange = async (file, vistaId) => {
        if (!file) return;
        const resizedFile = await resizeImage(file);
        setModal({ opened: true, vistaId, file: resizedFile, mode: 'chooser' });
    };
    
    const handleEditManual = async () => {
        // Obtenemos el archivo desde el estado del modal, ¡no desde un nuevo fetch!
        const fileToEdit = modalState.file;
        const vistaId = modalState.vistaId;

        if (fileToEdit) {
            setModalState(prev => ({ ...prev, file: fileToEdit, vistaId: vistaId, mode: 'canvas' }));
        }
    };

    // INICIA el proceso con la IA
    const handleAIProcess = async () => {
        setIsProcessingAI(true);
        try {
            const blob = await removeBackground(modal.file);
            const finalFile = new File([blob], modal.file.name, { type: 'image/png' });
            onProcessComplete(finalFile, modal.vistaId);
        } finally {
            setIsProcessingAI(false);
        }
    };

    const handleManualProcess = () => setModal(prev => ({ ...prev, mode: 'canvas' }));

    const handleRemoveBackgroundAI = async () => {
        setIsProcessingAI(true);
        try {
            const processedBlob = await removeBackground(editingInfo.file);
            const processedFile = new File([processedBlob], editingInfo.file.name, { type: 'image/png' });
            // ¡Llamamos a la función final para guardar el resultado!
            handleProcessComplete(processedFile, editingInfo.vistaId);
        } catch (error) {
            notifications.show({ title: 'Error de IA', message: 'No se pudo quitar el fondo.', color: 'red' });
        } finally {
            setIsProcessingAI(false);
            closeChooserModal();
        }
    };

    const closeAllModals = () => setModal({ opened: false, vistaId: null, file: null, mode: null });

    const handleProcessComplete = (processedFile, vistaId) => {
        setFiles(prev => ({ ...prev, [vistaId]: processedFile }));
        setPreviews(prev => ({ ...prev, [vistaId]: URL.createObjectURL(processedFile) }));
        // Cierra todos los modales por si acaso
        closeChooserModal();
        closeManualEditor();
        setEditingInfo({ vistaId: null, file: null }); // Limpiamos el estado
    };

    const handleClearSelection = () => {
        const vistaId = editingImage.vistaId;
        setEditingImage({ vistaId: null, file: null }); // Limpiamos la imagen en edición
        closeEditorModal();
    };

    const onProcessComplete = (processedFile, vistaId) => {
        setImages(prev => ({ ...prev, [vistaId]: { preview: URL.createObjectURL(processedFile), file: processedFile, source: 'new' } }));
        closeAllModals();
    };

    const handleSubmit = async () => {
        setUploading(true);
        const formData = new FormData();
        let newFileCount = 0;
        
        // 1. Añadimos los archivos NUEVOS (los File)
        for (const vistaId in filesToUpload) {
            formData.append(vistaId, filesToUpload[vistaId]);
            newFileCount++;
        }

        // 2. Añadimos las URLs ANTIGUAS que no hemos cambiado (como campos de texto)
        for (const vistaId in existingImages) {
            if (!filesToUpload[vistaId]) { // Si no hay una versión nueva...
                formData.append(vistaId, existingImages[vistaId]); // ...mandamos la URL vieja.
            }
        }
        
        if (newFileCount === 0) {
            notifications.show({ title: 'Sin cambios', message: 'No has editado ni añadido nuevas imágenes.', color: 'blue' });
            setUploading(false);
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/images`;
            await axios.post(apiUrl, formData, { headers: { Authorization: `Bearer ${token}` } });
            
            notifications.show({ title: '¡Éxito!', message: 'Los cambios se han guardado correctamente.', color: 'green' });
            navigate('/admin/products');
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudieron subir las imágenes.', color: 'red' });
        } finally {
            setUploading(false);
        }
    };
    
    if (loading) return <Center h="80vh"><Loader /></Center>;

    return (
        <Paper withBorder p="xl">
            {/* El Modal Unificado */}
            <Modal opened={modal.opened} onClose={closeAllModals} title={`Editando: ${modal.vistaId}`} size={modal.mode === 'canvas' ? 'xl' : 'sm'}>
                {modal.mode === 'chooser' && (
                    <Stack align="center">
                        <Image src={URL.createObjectURL(modal.file)} maw={250} />
                        <Group>
                            <Button onClick={handleAIProcess} loading={isProcessingAI}>Quitar Fondo (IA)</Button>
                            <Button onClick={handleManualProcess} variant="outline">Editar Manual</Button>
                        </Group>
                    </Stack>
                )}
                {modal.mode === 'canvas' && (
                    <ImageEditor file={modal.file} onProcessComplete={(file) => onProcessComplete(file, modal.vistaId)} onClear={closeAllModals} />
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