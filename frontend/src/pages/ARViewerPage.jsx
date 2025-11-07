// --- ARCHIVO: frontend/src/pages/ARViewerPage.jsx (VERSIÓN MEJORADA) ---

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader, Center, Alert, Paper, Text, Button, Stack, Box, Group, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconArrowLeft, IconHeart, IconHeartFilled, IconSun, IconMoonStars } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

function ARViewerPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [productData, setProductData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const sceneRef = useRef(null);
    const { colorScheme, setColorScheme } = useMantineColorScheme();

    // 1. Cargar información del producto y likes
    useEffect(() => {
        const fetchProductAndLikes = async () => {
            try {
                const token = localStorage.getItem('clientAuthToken');
                
                // Obtener producto
                const { data } = await axios.get(
                    `${import.meta.env.VITE_API_BASE_URL}/api/products/public/${productId}`
                );
                
                const modelUrl = data.ActivosDigitales?.url_modelo_3d;
                if (!modelUrl) throw new Error('Este producto no tiene un modelo 3D activo para la AR.');
                
                setProductData({ 
                    modelUrl, 
                    name: data.nombre || 'Producto',
                    id: productId 
                });

                // Obtener cantidad de likes del producto
                const { data: likesData } = await axios.get(
                    `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/likes-count`
                );
                setLikeCount(likesData.count || 0);

                // Verificar si el usuario le dio like (solo si está logueado)
                if (token) {
                    try {
                        const { data: userLikes } = await axios.get(
                            `${import.meta.env.VITE_API_BASE_URL}/api/products/likes`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setIsLiked(userLikes.includes(parseInt(productId)));
                    } catch (err) {
                        console.log('Usuario no autenticado');
                    }
                }
            } catch (err) { 
                setError(err.message || 'No se pudo cargar la información del producto.');
            } finally { 
                setLoading(false); 
            }
        };
        fetchProductAndLikes();
    }, [productId]);
    
    // 2. Registrar tiempo de interacción
    useEffect(() => {
        const startTime = Date.now();
        const sceneEl = sceneRef.current;
        
        return () => {
            const endTime = Date.now();
            let duracion_segundos = Math.round((endTime - startTime) / 1000);
            duracion_segundos = Math.min(duracion_segundos, 3600);
            
            if (duracion_segundos > 3) {
                const token = localStorage.getItem('clientAuthToken');
                axios.post(
                    `${import.meta.env.VITE_API_BASE_URL}/api/products/interaction`, 
                    {
                        id_producto: productId,
                        duracion_segundos
                    },
                    token ? { headers: { Authorization: `Bearer ${token}` } } : {}
                ).catch(err => console.error("Fallo al registrar interacción:", err));
            }

            // Liberar cámara
            if (sceneEl && sceneEl.systems['mindar-image-system']?.controller) {
                sceneEl.systems['mindar-image-system'].stop();
            }
        };
    }, [productId]);

    const handleLike = async () => {
        const token = localStorage.getItem('clientAuthToken');
        
        if (!token) {
            notifications.show({
                title: 'Inicia sesión',
                message: 'Debes iniciar sesión para dar like.',
                color: 'orange'
            });
            return;
        }

        const originalLiked = isLiked;
        const originalCount = likeCount;
        
        // Actualización optimista
        setIsLiked(!isLiked);
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

        try {
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/like`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            // Revertir si falla
            setIsLiked(originalLiked);
            setLikeCount(originalCount);
            notifications.show({
                title: 'Error',
                message: 'No se pudo guardar tu like.',
                color: 'red'
            });
        }
    };

    const handleBack = () => {
        // Forzar limpieza antes de navegar
        if (sceneRef.current && sceneRef.current.systems['mindar-image-system']?.controller) {
            sceneRef.current.systems['mindar-image-system'].stop();
        }
        // Recargar la página completamente para limpiar A-Frame
        window.location.href = '/experiencia-cliente';
    };

    if (loading) return <Center h="100vh"><Loader /></Center>;

    if (error || !productData) {
        return (
            <Center h="100vh" p="md">
                <Stack align="center">
                    <Alert color="red" title="Error">{error || 'No se pudo cargar el producto.'}</Alert>
                    <Button onClick={handleBack} variant="default">Volver a la galería</Button>
                </Stack>
            </Center>
        );
    }

    const bgColor = colorScheme === 'dark' 
        ? 'rgba(26, 27, 30, 0.95)' 
        : 'rgba(255, 255, 255, 0.95)';

    return (
        <Box style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            {/* Header superior */}
            <Paper 
                withBorder 
                p="xs" 
                shadow="lg" 
                style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    left: '10px', 
                    right: '10px', 
                    zIndex: 1000, 
                    backgroundColor: bgColor 
                }}
            >
                <Stack gap="xs">
                    <Group justify="space-between">
                        <Button 
                            onClick={handleBack} 
                            variant="subtle" 
                            size="xs" 
                            leftSection={<IconArrowLeft size={14}/>}
                        >
                            Volver
                        </Button>
                        <Group gap="xs">
                            <ActionIcon
                                variant="subtle"
                                onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
                            >
                                {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoonStars size={16} />}
                            </ActionIcon>
                            <ActionIcon
                                variant="subtle"
                                color={isLiked ? "red" : "gray"}
                                onClick={handleLike}
                            >
                                {isLiked ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
                            </ActionIcon>
                            <Text size="sm" fw={500}>{likeCount}</Text>
                        </Group>
                    </Group>
                    <Text fw={700} size="sm" ta="center">{productData.name}</Text>
                    <Text size="xs" c="dimmed" ta="center">
                        📸 Apunta la cámara al marcador para ver el modelo
                    </Text>
                </Stack>
            </Paper>

            <a-scene
                ref={sceneRef}
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
                        rotation="-90 0 0"
                        scale="0.5 0.5 0.5"
                        animation-mixer
                    />
                </a-entity>
            </a-scene>

            {/* Footer inferior */}
            <Paper 
                withBorder 
                p="xs" 
                style={{ 
                    position: 'absolute', 
                    bottom: '10px', 
                    left: '10px', 
                    right: '10px', 
                    zIndex: 1000, 
                    backgroundColor: bgColor
                }}
            >
                <Text size="xs" c="dimmed" ta="center">
                    💡 Si no ves el producto, asegúrate de tener buena luz.
                </Text>
                <Button 
                    component="a" 
                    href="https://mphktccqzeahjrsmdzsj.supabase.co/storage/v1/object/public/qrcodes/hiro.png" 
                    target="_blank" 
                    download="marcador-hiro.png" 
                    size="xs" 
                    variant="light" 
                    fullWidth 
                    mt="xs"
                >
                    Descargar Marcador
                </Button>
            </Paper>
        </Box>
    );
}

export default ARViewerPage;