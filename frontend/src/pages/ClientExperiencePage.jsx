// En src/pages/ClientExperiencePage.jsx (Versión 2.0 - La Galería)

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Title, Text, Button, Container, SimpleGrid, Card, Image, Group, Badge, AspectRatio, Stack } from '@mantine/core';
import { useClientAuth } from '../hooks/useClientAuth';
import { Link } from 'react-router-dom';
import { IconLogout, IconScan } from '@tabler/icons-react';

function ClientExperiencePage() {
    const { client, logout } = useClientAuth();
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProductsWithAR = async () => {
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/public/with-ar`;
            const { data } = await axios.get(apiUrl);
            if (data) setProducts(data);
        };
        fetchProductsWithAR();
    }, []);

    return (
        <Container my="xl">
            <Group justify="space-between" mb="xl">
                <Stack gap={0}>
                    <Title order={2}>¡Hola de nuevo, {client?.nombre || 'Capitalover'}!</Title>
                    <Text c="dimmed">Estos son nuestros platos estrella. ¡Pruébalos en Realidad Aumentada!</Text>
                </Stack>
                <Button onClick={logout} color="red" variant="subtle" leftSection={<IconLogout size={16}/>}>
                    Cerrar Sesión
                </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {products.map((product) => (
                    <Card key={product.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Card.Section>
                            <AspectRatio ratio={16 / 9}>
                                <Image
                                    src={product.ActivosDigitales.urls_imagenes.perspectiva || product.ActivosDigitales.urls_imagenes.frente}
                                    alt={product.nombre}
                                />
                            </AspectRatio>
                        </Card.Section>
                        <Group justify="space-between" mt="md" mb="xs">
                            <Text fw={500}>{product.nombre}</Text>
                            <Badge color="yellow" variant="light">{product.categoria}</Badge>
                        </Group>
                        <Text size="sm" c="dimmed">{product.descripcion}</Text>
                        <Button component={Link} to={`/ar-viewer/${product.id}`} fullWidth mt="md" radius="md" leftSection={<IconScan size={16}/>}>
                            Ver en mi mesa
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>
        </Container>
    );
}

export default ClientExperiencePage;