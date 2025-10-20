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

    // 1. Obtener la URL del modelo 3D (esto no cambia, estaba bien)
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/public/${productId}`;
                const { data } = await axios.get(apiUrl);
                
                const modelUrl = data.ActivosDigitales?.url_modelo_3d;
                if (!modelUrl) {
                    throw new Error('Este producto no tiene un modelo 3D asignado.');
                }
                
                setProductData({ modelUrl, name: data.nombre || 'Producto' });
            } catch (err) {
                setError(err.message || 'No se pudo cargar la información del producto.');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);
    
    // 2. Controlar el ciclo de vida de la escena de MindAR con React
    useEffect(() => {
        // Solo ejecutar si tenemos los datos del producto y la escena está lista
        if (!productData || !sceneRef.current) return;
    
        const sceneEl = sceneRef.current;
        // Obtenemos el sistema de MindAR que A-Frame ha inicializado
        const mindarSystem = sceneEl.systems['mindar-image-system'];
    
        // Iniciamos el motor de AR. Esto pedirá permiso de cámara.
        mindarSystem.start();
    
        // El 'return' en un useEffect es una función de limpieza.
        // Se ejecuta cuando el componente se desmonta (ej: al navegar a otra página)
        return () => {
            // Detenemos el motor de AR para liberar la cámara y los recursos.
            mindarSystem.stop();
        };
    }, [productData]); // Este efecto se ejecuta cuando 'productData' se carga.

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
            <Paper withBorder p="xs" shadow="lg" style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 1000, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <Stack gap="xs">
                    <Button component={Link} to="/experiencia-cliente" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14}/>}>Volver</Button>
                    <Text fw={700} size="sm" ta="center">{productData.name}</Text>
                    <Text size="xs" c="dimmed" ta="center">📸 Apunta la cámara al marcador para ver el modelo</Text>
                </Stack>
            </Paper>

            {/*
              ESTA ES LA NUEVA ESCENA DE MINDAR
              - 'mindar-image': Es el componente principal. Le decimos dónde está nuestro marcador compilado.
              - Desactivamos la UI por defecto de MindAR para usar la nuestra ('uiLoading: no', etc.)
              - 'a-entity mindar-image-target': Este es el ancla. Su contenido solo es visible cuando el marcador 'targetIndex: 0' (el primero del archivo .mind) es detectado.
            */}
            <a-scene
                ref={sceneRef}
                mindar-image={`imageTargetSrc: /targets.mind; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;`}
                color-space="sRGB"
                renderer="colorManagement: true, physicallyCorrectLights"
                vr-mode-ui="enabled: false"
                device-orientation-permission-ui="enabled: false"
                style={{ width: '100%', height: '100%' }}
            >
                <a-camera position="0 0 0" look-controls="enabled: false" />
                
                <a-entity mindar-image-target="targetIndex: 0">
                    <a-gltf-model
                        src={productData.modelUrl}
                        position="0 0.1 0"
                        rotation="0 0 0"
                        scale="0.8 0.8 0.8" 
                    />
                </a-entity>
            </a-scene>

             <Paper withBorder p="xs" style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', zIndex: 1000, backgroundColor: 'rgba(255, 255, 255, 0.95)'}}>
                <Text size="xs" c="dimmed" ta="center">💡 Si no ves el producto, asegúrate de tener buena luz y el marcador no esté arrugado.</Text>
                <Button component="a" href="https://mphktccqzeahjrsmdzsj.supabase.co/storage/v1/object/public/qrcodes/hiro.png" target="_blank" download="marcador-hiro.png" size="xs" variant="light" fullWidth mt="xs">Descargar Marcador</Button>
            </Paper>
        </Box>
    );
}

export default ARViewerPage;