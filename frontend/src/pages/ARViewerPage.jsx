// --- ARCHIVO: frontend/src/pages/ARViewerPage.jsx (VERSIÓN FINAL Y ROBUSTA) ---

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Loader, Center, Alert, Paper, Text, Button, Stack, Box } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

function ARViewerPage() {
    const { productId } = useParams();
    const [productData, setProductData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const sceneRef = useRef(null);

    // 1. Cargar la información del producto (sin cambios)
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/public/${productId}`;
                const { data } = await axios.get(apiUrl);
                const modelUrl = data.ActivosDigitales?.url_modelo_3d;
                if (!modelUrl) throw new Error('Este producto no tiene un modelo 3D activo para la AR.');
                setProductData({ modelUrl, name: data.nombre || 'Producto' });
            } catch (err) { setError(err.message || 'No se pudo cargar la información del producto.');
            } finally { setLoading(false); }
        };
        fetchProduct();
    }, [productId]);
    
    // 2. CORRECCIÓN: Dejar que MindAR se inicie solo y solo nos preocupamos de apagarlo
    useEffect(() => {
        const sceneEl = sceneRef.current;
        
        // La función de limpieza se ejecuta solo cuando el componente se va a desmontar
        return () => {
            // Si el usuario navega a otra página, nos aseguramos de que el sistema de AR se detenga
            // para liberar la cámara.
            if (sceneEl && sceneEl.systems['mindar-image-system']?.controller) {
                sceneEl.systems['mindar-image-system'].stop();
            }
        };
    }, []); // El array vacío asegura que la limpieza se configure una sola vez.

    if (loading) return <Center h="100vh"><Loader /></Center>;

    if (error || !productData) {
        return (
            <Center h="100vh" p="md">
                <Stack align="center">
                    <Alert color="red" title="Error">{error || 'No se pudo cargar el producto.'}</Alert>
                    <Button component={Link} to="/experiencia-cliente" variant="default">Volver a la galería</Button>
                </Stack>
            </Center>
        );
    }

    return (
        <Box style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            {/* ... La UI no cambia ... */}
            <Paper withBorder p="xs" shadow="lg" style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 1000, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <Stack gap="xs">
                    <Button component={Link} to="/experiencia-cliente" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14}/>}>Volver</Button>
                    <Text fw={700} size="sm" ta="center">{productData.name}</Text>
                    <Text size="xs" c="dimmed" ta="center">📸 Apunta la cámara al marcador para ver el modelo</Text>
                </Stack>
            </Paper>

            <a-scene
                ref={sceneRef}
                // LA CORRECCIÓN CLAVE: autoStart ahora es 'true'.
                // MindAR se encargará de pedir la cámara cuando esté listo.
                mindar-image="imageTargetSrc: /targets.mind; autoStart: true; uiLoading: no; uiError: no; uiScanning: no;"
                color-space="sRGB"
                renderer="colorManagement: true, physicallyCorrectLights: true"
                vr-mode-ui="enabled: false"
                device-orientation-permission-ui="enabled: false"
                style={{ width: '100%', height: '100%' }}
            >
                <a-camera position="0 0 0" look-controls="enabled: false" />
                
                <a-entity mindar-image-target="targetIndex: 0">
                    <a-gltf-model
                        src={productData.modelUrl}
                        position="0 0 0"
                        rotation="0 0 0"
                        scale="0.5 0.5 0.5"
                        animation-mixer
                    />
                </a-entity>
            </a-scene>

            <Paper withBorder p="xs" style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', zIndex: 1000, backgroundColor: 'rgba(255, 255, 255, 0.95)'}}>
                <Text size="xs" c="dimmed" ta="center">💡 Si no ves el producto, asegúrate de tener buena luz.</Text>
                <Button component="a" href="https://mphktccqzeahjrsmdzsj.supabase.co/storage/v1/object/public/qrcodes/hiro.png" target="_blank" download="marcador-hiro.png" size="xs" variant="light" fullWidth mt="xs">Descargar Marcador</Button>
            </Paper>
        </Box>
    );
}

export default ARViewerPage;