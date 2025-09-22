// En src/pages/ProductAssetPage.jsx

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, Alert, RingProgress, Stack, Box, Modal, ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconVideo, IconUpload, IconCheck, IconRotateClockwise, IconSwitchCamera, IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

// --- Pequeños componentes de estado para mantener el código limpio ---
const StatusDisplay = ({ status, error }) => {
    if (status === 'error') {
        return <Alert icon={<IconAlertCircle size="1rem" />} title="¡Error!" color="red">{error || 'Ocurrió un error inesperado.'}</Alert>;
    }
    if (status === 'success') {
        return <Alert icon={<IconCheck size="1rem" />} title="¡Éxito!" color="green">El modelo 3D ha sido subido y asociado correctamente.</Alert>;
    }
    return null;
};

const UploadProgress = ({ progress }) => {
    if (progress === null) return null;
    return <RingProgress sections={[{ value: progress, color: 'blue' }]} label={<Text c="blue" fw={700} ta="center" size="xl">{progress}%</Text>} />;
};


function ProductAssetPage() {
    const { id: productId } = useParams();
    const [product, setProduct] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [error, setError] = useState('');
    const [assetUrl, setAssetUrl] = useState(null); // <-- URL del video existente
    const [status, setStatus] = useState('loading'); // loading, idle, previewing, recording, uploading, success, error
    
    // --- Refs para la cámara y la grabación ---
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    // Para el modal de confirmación
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

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


    // --- LÓGICA DE LA CÁMARA ---
    const startCamera = async (facingMode = 'environment') => {
        try {
            // Detenemos cualquier stream anterior
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
            videoRef.current.srcObject = stream;
            setStatus('previewing');
        } catch (err) {
            setStatus('error');
            setError('No se pudo acceder a la cámara. Revisa los permisos.');
        }
    };
    
    // --- Inicia la cámara ---
    const startRecording = () => {
        if (assetUrl) {
            openModal(); // Si ya hay un video, pedimos confirmación
        } else {
            initiateRecording(); // Si no, grabamos directamente
        }
    };

    const switchCamera = () => {
        const currentStream = videoRef.current.srcObject;
        const currentTrack = currentStream.getTracks()[0];
        const currentFacingMode = currentTrack.getSettings().facingMode;
        // Cambiamos al modo opuesto
        startCamera(currentFacingMode === 'user' ? 'environment' : 'user');
    };

    const initiateRecording = () => {
        closeModal(); // Cierra el modal si estaba abierto
        setStatus('recording');
        recordedChunksRef.current = [];
        const stream = videoRef.current.srcObject;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => recordedChunksRef.current.push(event.data);
        mediaRecorder.start();
    };

    // --- Detiene la grabación y sube el archivo ---
    const stopAndUpload = () => {
        mediaRecorderRef.current.onstop = async () => {
            const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const videoFile = new File([videoBlob], `producto-${productId}-captura.webm`, { type: 'video/webm' });
            
            // --- ¡Aquí empieza la subida! ---
            setStatus('uploading');
            setUploadProgress(0);

            const formData = new FormData();
            formData.append('modelFile', videoFile);

            try {
                const token = localStorage.getItem('authToken');
                // CAMBIAMOS LA URL AQUI
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/model`;

                const response = await axios.post(apiUrl, formData, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    },
                });
                setAssetUrl(response.data.asset.url_modelo_3d); 
                setStatus('success');
            } catch (err) {
                setStatus('error');
                setError(err.response?.data?.message || 'Error al subir el archivo.');
            } finally {
                setUploadProgress(null);
                 // Detenemos la cámara
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
        mediaRecorderRef.current.stop();
    };

    // --- LÓGICA DE GESTIÓN DE ARCHIVOS ---
    const handleDelete = async () => {
        setStatus('uploading'); // Mostramos un loader
        try {
            const token = localStorage.getItem('authToken');
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/model`;
            await axios.delete(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
            notifications.show({ title: 'Éxito', message: 'El activo ha sido eliminado.', color: 'green' });
            setAssetUrl(null);
            setStatus('idle');
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.message || 'No se pudo eliminar el activo.');
        }
    };


    if (!product && status !== 'error') return <Center><Loader /></Center>;

    return (
        <Paper withBorder p="md" shadow="md">
            {/* ... Modal y Título ... */}
            <Modal opened={modalOpened} onClose={closeModal} title="Confirmación Requerida" centered>
                <Text>Ya existe un modelo 3D para este producto.</Text>
                <Text fw={700} c="red" mt="sm">Grabar uno nuevo lo reemplazará de forma permanente. ¿Estás seguro?</Text>
                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={closeModal}>Cancelar</Button>
                    <Button color="orange" onClick={initiateRecording}>Sí, grabar nuevo</Button>
                </Group>
            </Modal>
            
            <Title order={3}>Gestionar Activo de Realidad Aumentada</Title>
            <Text c="dimmed" mb="lg">Producto: <Text span fw={700}>{product?.nombre}</Text></Text>

            <Stack align="center" gap="lg">
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', aspectRatio: '16/9', borderRadius: '8px', background: '#222' }} />
                
                {status !== 'recording' && assetUrl && (
                    <Alert title="Modelo 3D Existente" color="blue" w="100%">
                        Este producto ya tiene un modelo 3D asociado.
                        <Group justify="flex-end" mt="sm">
                            <Button component="a" href={assetUrl} target="_blank" variant="outline" size="xs">Previsualizar</Button>
                            <Button color="red" variant="light" size="xs" onClick={handleDelete} leftSection={<IconTrash size={14}/>}>Eliminar Modelo</Button>
                        </Group>
                    </Alert>
                )}

                <Group>
                    {status === 'idle' && <Button onClick={() => startCamera()} leftSection={<IconVideo size={16} />}>Activar Cámara</Button>}
                    {status === 'previewing' && <Button onClick={switchCamera} leftSection={<IconSwitchCamera size={16}/>} variant="default">Cambiar Cámara</Button>}
                    {status === 'previewing' && <Button color="green" onClick={startRecording} leftSection={<IconPlayerPlay size={16}/>}>Empezar a Grabar</Button>}
                    {status === 'recording' && <Button color="red" onClick={stopAndUpload} leftSection={<IconUpload size={16} />}>Detener y Subir Video</Button>}
                </Group>

                {/* ... tu lógica de uploadProgress y statusDisplay ... */}
            </Stack>
        </Paper>
    );
}

export default ProductAssetPage;