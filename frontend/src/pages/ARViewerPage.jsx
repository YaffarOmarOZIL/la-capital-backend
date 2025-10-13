// En src/pages/ARViewerPage.jsx (Versión 4.0 - La Experiencia Social y Centrada)

import 'aframe'; // Importamos a-frame una sola vez
import { useState, useEffect, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Loader, Center, Alert, Paper, Title, Text, Group, ActionIcon, Textarea, Button, Stack, Box, Container } from '@mantine/core';
import { IconHeart, IconThumbUp, IconMessageCircle, IconSend, IconArrowLeft } from '@tabler/icons-react';

// --- ¡El componente Mágico de la Escena AR, ahora "Memoizado"! ---
// memo() es un truco de React para evitar que la escena se redibuje innecesariamente
const ARScene = memo(({ imageUrl, productName, productId }) => {

    useEffect(() => {
        // Inyectamos el script de AR.js solo cuando este componente se monta
        const arjsScript = document.createElement('script');
        arjsScript.src = "https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js";
        document.body.appendChild(arjsScript);
        
        // Lo limpiamos cuando el componente se va
        return () => {
            if (document.body.contains(arjsScript)) {
                document.body.removeChild(arjsScript);
            }
        };
    }, []); // El array vacío asegura que esto solo pase una vez

    return (
        // El contenedor ahora define el tamaño del recuadro
        <Box w="100%" style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: 'var(--mantine-radius-md)' }}>
            <a-scene embedded arjs='sourceType: webcam; debugUIEnabled: false;'>
                <a-assets>
                    <img id="sprite" src={imageUrl} crossOrigin="anonymous" alt={productName} />
                </a-assets>

                <a-marker type='pattern' url={`/marker-prod-${productId}.patt`}>
                    
                    {/* ----- ¡LA CORRECCIÓN MÁGICA! ----- */}
                    {/* 
                        'position="0 0 0"' => Centra el "pivote" del objeto en el marcador.
                        'rotation="-90 0 0"' => Lo pone "plano".
                        'look-at="[camera]"' => Hace que nos mire.
                        'animation' => ¡Un pequeño bonus! Hace que aparezca suavemente.
                    */}
                    <a-entity position="0 0 0" rotation="-90 0 0" look-at="[camera]">
                        <a-image 
                            src="#sprite"
                            width="1" height="1"
                            animation="property: scale; to: 1 1 1; from: 0.2 0.2 0.2; dur: 500; easing: easeOutQuad;"
                        ></a-image>
                    </a-entity>

                </a-marker>
                
                <a-entity camera />
            </a-scene>
        </Box>
    );
});


function ARViewerPage() {
    const { productId } = useParams();
    const [productData, setProductData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/public/${productId}`;
                const { data } = await axios.get(apiUrl);
                
                const imageUrl = data.ActivosDigitales?.urls_imagenes?.perspectiva || data.ActivosDigitales?.urls_imagenes?.frente || Object.values(data.ActivosDigitales?.urls_imagenes)[0];
                if (!imageUrl) throw new Error('No se encontraron imágenes para este producto.');
                
                setProductData({
                    imageUrl: imageUrl,
                    name: data.nombre,
                    // ¡En el futuro podemos cargar likes y comentarios aquí!
                });
            } catch (err) { setError('Este producto no tiene una vista de AR disponible.'); }
            finally { setLoading(false); }
        };
        fetchProduct();
    }, [productId]);

    if (loading) return <Center h="100vh"><Loader /></Center>;
    if (error || !productData) return <Center h="100vh"><Alert color="red">{error || 'No se pudo cargar el producto.'}</Alert></Center>;

    return (
        <Container size="xs" py="md">
            <Paper withBorder p="md" shadow="lg" radius="md">
                <Group justify="space-between" mb="sm">
                    <Button component={Link} to="/experiencia-cliente" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14}/>}>
                        Volver a la galería
                    </Button>
                    <Text fw={700}>{productData.name}</Text>
                </Group>
                
                {/* --- ¡El componente Mágico en acción! --- */}
                <ARScene imageUrl={productData.imageUrl} productName={productData.name} productId={productId} />

                {/* --- La barra de acciones sociales (como la soñaste) --- */}
                <Group mt="md">
                    <ActionIcon variant="light" size="lg"><IconThumbUp /></ActionIcon>
                    <ActionIcon variant="light" size="lg" color="red"><IconHeart /></ActionIcon>
                    <ActionIcon variant="light" size="lg" color="blue"><IconMessageCircle /></ActionIcon>
                </Group>
                <Stack mt="lg">
                    <Textarea placeholder="Escribe un comentario..." />
                    <Group justify="flex-end">
                        <Button size="xs" leftSection={<IconSend size={14}/>}>Publicar</Button>
                    </Group>
                </Stack>
            </Paper>
        </Container>
    );
}

export default ARViewerPage;