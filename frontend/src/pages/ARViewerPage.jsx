// En src/pages/ARViewerPage.jsx (Versión FINAL Y DE LA VICTORIA)

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Loader, Center, Alert, Paper, Title, Text, Group, Button, Stack, Box, Container } from '@mantine/core';
import { notifications } from '@mantine/notifications'; // ¡Para tus banderas de detective!
import { IconArrowLeft } from '@tabler/icons-react';

// ¡El componente ARScene ahora es más "tonto" y por eso, más inteligente!
// Solo se preocupa de renderizar los datos que YA le llegan listos.
function ARScene({ assetData }) {
    const markerRef = useRef(null);

    useEffect(() => {
        const marker = markerRef.current;
        if (!marker) return;

        const handleMarkerFound = () => {
            console.log(`%c¡MARCADOR ENCONTRADO! Mostrando producto.`, 'color: lightgreen; font-weight: bold;');
            notifications.show({
                title: '¡Marcador Detectado!',
                message: 'Mostrando producto en tu mesa.',
                color: 'teal',
                autoClose: 2000,
            });
        };
        const handleMarkerLost = () => {
            console.log(`%cMarcador perdido.`, 'color: orange;');
        };

        marker.addEventListener('markerFound', handleMarkerFound);
        marker.addEventListener('markerLost', handleMarkerLost);

        return () => {
            marker.removeEventListener('markerFound', handleMarkerFound);
            marker.removeEventListener('markerLost', handleMarkerLost);
        };
    }, []);

    if (!assetData.markerUrl) {
        return <Center h="100%"><Text c="red" size="sm">Error Crítico: No se pudo cargar el marcador AR para este producto.</Text></Center>;
    }
    
    return (
        <Box w="100%" style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: 'var(--mantine-radius-md)' }}>
            <a-scene embedded vr-mode-ui="enabled: false" arjs='sourceType: webcam; debugUIEnabled: false;'>
                <a-assets>
                    <img id="sprite" src={assetData.imageUrl} crossOrigin="anonymous" alt="Sprite del Producto"/>
                </a-assets>

                <a-marker ref={markerRef} type='pattern' url={assetData.markerUrl}>
                    <a-entity position="0 0.5 0" rotation="-90 0 0" look-at="[camera]">
                        <a-image 
                            src="#sprite" width="1.5" height="1.5"
                            animation="property: scale; to: 1 1 1; from: 0.2 0.2 0.2; dur: 500; easing: easeOutQuad;"
                        />
                    </a-entity>
                </a-marker>
                
                <a-entity camera />
            </a-scene>
        </Box>
    );
}


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
                
                const imageUrl = data.ActivosDigitales?.urls_imagenes?.perspectiva || data.ActivosDigitales?.urls_imagenes?.frente;
                const markerUrl = data.ActivosDigitales?.url_marker_patt;

                if (!imageUrl || !markerUrl) {
                    throw new Error('A este producto le faltan los archivos necesarios para la AR.');
                }
                
                setProductData({
                    imageUrl,
                    markerUrl,
                    name: data.nombres, // ¡CORREGIDO A LA NUEVA ESTRUCTURA ATÓMICA!
                });
            } catch (err) {
                setError(err.message || 'Este producto no tiene una vista de AR disponible.');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);


    if (loading) return <Center h="100vh"><Loader /></Center>;
    if (error || !productData) return (
        <Center h="100vh" p="md">
            <Stack align="center">
                <Alert color="red" title="Error">{error || 'No se pudo cargar el producto.'}</Alert>
                <Button component={Link} to="/experiencia-cliente" variant="default">Volver a la galería</Button>
            </Stack>
        </Center>
    );

    return (
        <Container size="xs" py="md">
            <Paper withBorder p="md" shadow="lg" radius="md">
                <Group justify="space-between" mb="sm">
                    <Button component={Link} to="/experiencia-cliente" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14}/>} >
                        Volver a la galería
                    </Button>
                    <Text fw={700}>{productData.name}</Text>
                </Group>
                
                <ARScene assetData={productData} />
                
                {/* He dejado esta parte comentada para centrarnos en la AR, ¡pero la tienes lista para cuando quieras! */}
                {/* 
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
                */}
            </Paper>
        </Container>
    );
}

export default ARViewerPage;