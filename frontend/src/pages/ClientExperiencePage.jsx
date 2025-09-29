// En src/pages/ClientExperiencePage.jsx

import { Title, Text, Button, Container, Paper, Stack } from '@mantine/core';
import { useClientAuth } from '../hooks/useClientAuth'; // <-- Usamos nuestro nuevo hook

function ClientExperiencePage() {
    // Obtenemos los datos del cliente y la función de logout de nuestro hook
    const { client, logout } = useClientAuth();

    return (
        <Container my={50}>
            <Paper withBorder shadow="md" p={30} radius="md">
                <Stack align="center">
                    <Title order={2}>¡Bienvenido de vuelta, {client?.nombre || 'Capitalover'}!</Title>
                    <Text c="dimmed" ta="center">
                        Este es tu espacio personal. Próximamente desde aquí podrás escanear los códigos QR del restaurante para vivir la experiencia de Realidad Aumentada.
                    </Text>

                    {/* Placeholder para la cámara AR */}
                    <Paper withBorder p="xl" mt="md" w="100%" bg="dark.6" ta="center">
                        <Text c="dimmed">Futuro Espacio para la Cámara AR</Text>
                    </Paper>

                    <Button onClick={logout} color="red" variant="light" mt="xl">
                        Cerrar Sesión
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
}

export default ClientExperiencePage;