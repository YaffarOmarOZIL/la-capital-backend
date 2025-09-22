// En src/pages/ProductAssetPage.jsx

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, Alert, RingProgress, Stack, Box } from '@mantine/core';
import { IconAlertCircle, IconVideo, IconUpload, IconCheck, IconRotateClockwise } from '@tabler/icons-react';

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
    const [status, setStatus] = useState('idle'); // idle, recording, uploading, success, error
    const [uploadProgress, setUploadProgress] = useState(null);
    const [error, setError] = useState('');
    
    // --- Refs para la cámara y la grabación ---
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    // --- Carga la información del producto ---
    useEffect(() => {
        const fetchProduct = async () => {
            const token = localStorage.getItem('authToken');
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`;
            try {
                const { data } = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
                setProduct(data);
            } catch (err) {
                setStatus('error');
                setError('No se pudo cargar la información del producto.');
            }
        };
        fetchProduct();
    }, [productId]);

    // --- Inicia la cámara ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoRef.current.srcObject = stream;
            recordedChunksRef.current = [];
            
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.start();
            setStatus('recording');
        } catch (err) {
            console.error("Error al acceder a la cámara:", err);
            setStatus('error');
            setError('No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.');
        }
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


    if (!product && status !== 'error') return <Center><Loader /></Center>;

    return (
        <Paper withBorder p="md" shadow="md">
            <Title order={3}>Gestionar Activo de Realidad Aumentada</Title>
            <Text c="dimmed" mb="lg">Producto: <Text span fw={700}>{product?.nombre}</Text></Text>

            <Stack align="center" gap="lg">
                {/* Visualizador de la Cámara */}
                <Box w="100%" mah={400} bg="dark.8" style={{ aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden' }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
                
                {/* Botones de Control */}
                <Group>
                    {status === 'idle' && <Button onClick={startRecording} leftSection={<IconVideo size={16} />}>Iniciar Captura</Button>}
                    {status === 'recording' && <Button color="red" onClick={stopAndUpload} leftSection={<IconUpload size={16} />}>Detener y Subir Video</Button>}
                </Group>
                
                {/* Muestra de Estado y Progreso */}
                {status === 'uploading' && <UploadProgress progress={uploadProgress} />}
                <StatusDisplay status={status} error={error} />
                
                { (status === 'success' || status === 'error') && 
                    <Button component={Link} to="/admin/products" variant="outline" leftSection={<IconRotateClockwise size={16} />}>
                        Volver a la Lista de Productos
                    </Button>
                }
            </Stack>
        </Paper>
    );
}

export default ProductAssetPage;