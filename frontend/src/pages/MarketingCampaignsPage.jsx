// --- ARCHIVO: frontend/src/pages/MarketingCampaignsPage.jsx ---

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Title, Text, Tabs, Card, Group, Avatar, Badge, Button, Table, Checkbox, Textarea, SimpleGrid, Modal, Paper } from '@mantine/core';
import { IconCake, IconSend, IconDiscount2, IconUsers } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Componente para la lista de cumpleaños
function BirthdayList() {
    const [birthdayClients, setBirthdayClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBirthdays = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/clients/birthdays`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBirthdayClients(data);
            } catch (error) {
                notifications.show({ title: 'Error', message: 'No se pudo cargar la lista de cumpleaños.', color: 'red' });
            }
            setLoading(false);
        };
        fetchBirthdays();
    }, []);

    const handleSendMessage = (cliente) => {
        const nombre = cliente.nombres.split(' ')[0]; // Usamos solo el primer nombre
        const message = `¡Feliz cumpleaños ${nombre}! 🥳 De parte de La Capital, te regalamos un 20% de descuento en tu próxima visita. ¡Te esperamos para celebrar!`;
        const encodedMessage = encodeURIComponent(message);
        // Asumimos código de país de Bolivia 591
        window.open(`https://wa.me/591${cliente.numero_telefono}?text=${encodedMessage}`, '_blank');
    };

    if (loading) return <Text>Cargando cumpleaños...</Text>;

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mt="md">
            {birthdayClients.length > 0 ? birthdayClients.map(client => (
                <Card key={client.id} shadow="sm" p="lg" radius="md" withBorder>
                    <Group justify="space-between">
                        <Group>
                            <Avatar color="cyan" radius="xl">{client.nombres[0]}{client.apellidos[0]}</Avatar>
                            <div>
                                <Text fw={500}>{client.nombres} {client.apellidos}</Text>
                                <Text size="xs" c="dimmed">{new Date(client.fecha_nacimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</Text>
                            </div>
                        </Group>
                        <Button onClick={() => handleSendMessage(client)} variant="light" color="green" size="xs" leftSection={<IconCake size={14}/>}>
                            Felicitar
                        </Button>
                    </Group>
                </Card>
            )) : <Text>No hay cumpleaños en los próximos 7 días.</Text>}
        </SimpleGrid>
    );
}

// Componente para la campaña masiva
function BulkCampaign() {
    const [clients, setClients] = useState([]);
    const [selected, setSelected] = useState([]);
    const [message, setMessage] = useState('¡Hola [Nombre]! Tenemos una promoción especial para ti en La Capital: ');
    const [modalOpened, setModalOpened] = useState(false);
    
    useEffect(() => {
        const fetchClients = async () => {
            const token = localStorage.getItem('authToken');
            const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
            setClients(data);
        };
        fetchClients();
    }, []);
    
    const selectedClientsData = clients.filter(c => selected.includes(c.id));
    
    const handleSendMessage = (cliente) => {
        const personalizedMessage = message
            .replace(/\[Nombre\]/g, cliente.nombres.split(' ')[0])
            .replace(/\[Apellido\]/g, cliente.apellidos.split(' ')[0]);
        const encodedMessage = encodeURIComponent(personalizedMessage);
        window.open(`https://wa.me/591${cliente.numero_telefono}?text=${encodedMessage}`, '_blank');
    };

    const rows = clients.map(client => (
        <Table.Tr key={client.id}>
            <Table.Td>
                <Checkbox checked={selected.includes(client.id)} onChange={(e) => 
                    setSelected(e.currentTarget.checked ? [...selected, client.id] : selected.filter(id => id !== client.id))
                }/>
            </Table.Td>
            <Table.Td>{client.nombres}</Table.Td>
            <Table.Td>{client.apellidos}</Table.Td>
            <Table.Td>{client.numero_telefono}</Table.Td>
        </Table.Tr>
    ));

    return (
        <>
            <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={`Enviar a ${selected.length} clientes`} size="lg">
                <Text c="dimmed" mb="md">Haz clic en "Enviar" para cada cliente para abrir WhatsApp con el mensaje pre-cargado.</Text>
                {selectedClientsData.map(c => (
                     <Paper withBorder p="xs" radius="md" mb="xs" key={c.id}>
                         <Group justify="space-between">
                            <Text>{c.nombres} {c.apellidos}</Text>
                            <Button size="xs" variant="outline" onClick={() => handleSendMessage(c)} leftSection={<IconSend size={14}/>}>Enviar</Button>
                        </Group>
                    </Paper>
                ))}
            </Modal>

            <SimpleGrid cols={{ base: 1, md: 2 }} mt="md" spacing="xl">
                <div>
                    <Text fw={500}>1. Escribe tu mensaje promocional</Text>
                    <Textarea
                        mt="xs"
                        placeholder="Escribe tu oferta aquí..."
                        value={message}
                        onChange={(e) => setMessage(e.currentTarget.value)}
                        minRows={6}
                    />
                    <Text size="xs" mt="xs">Usa los botones para añadir personalización:</Text>
                    <Group mt="xs">
                        <Button size="xs" variant="light" onClick={() => setMessage(m => m + '[Nombre]')}>[Nombre]</Button>
                        <Button size="xs" variant="light" onClick={() => setMessage(m => m + '[Apellido]')}>[Apellido]</Button>
                    </Group>
                </div>
                <div>
                    <Text fw={500}>2. Selecciona los clientes</Text>
                     <Paper withBorder radius="md" style={{ maxHeight: 300, overflowY: 'auto' }} mt="xs">
                        <Table stickyHeader>
                            <Table.Thead>
                                <Table.Tr><Table.Th><Checkbox onChange={e => setSelected(e.currentTarget.checked ? clients.map(c => c.id) : [])} /></Table.Th><Table.Th>Nombres</Table.Th><Table.Th>Apellidos</Table.Th><Table.Th>Teléfono</Table.Th></Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>{rows}</Table.Tbody>
                        </Table>
                    </Paper>
                    <Button onClick={() => setModalOpened(true)} disabled={selected.length === 0} fullWidth mt="md" leftSection={<IconSend size={16}/>}>
                        Preparar envío a {selected.length} cliente(s)
                    </Button>
                </div>
            </SimpleGrid>
        </>
    );
}

function MarketingCampaignsPage() {
    return (
        <Container my="xl">
            <Title order={2}>Campañas de Marketing por WhatsApp</Title>
            <Text c="dimmed">Gestiona la comunicación directa con tus clientes para cumpleaños y promociones especiales.</Text>

            <Tabs defaultValue="birthdays" mt="xl">
                <Tabs.List>
                    <Tabs.Tab value="birthdays" leftSection={<IconCake size={16} />}>
                        Campaña de Cumpleaños
                    </Tabs.Tab>
                    <Tabs.Tab value="promo" leftSection={<IconDiscount2 size={16} />}>
                        Campaña Promocional
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="birthdays" pt="md">
                    <BirthdayList />
                </Tabs.Panel>
                <Tabs.Panel value="promo" pt="md">
                    <BulkCampaign />
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}

export default MarketingCampaignsPage;