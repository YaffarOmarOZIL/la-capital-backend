import { useState, useEffect } from 'react';
import { 
    Container, Title, Text, Grid, Card, Stack, Group, Badge, Button, 
    ThemeIcon, RingProgress, Paper, Select, LoadingOverlay, Alert,
    Tabs, ActionIcon, Modal, ScrollArea, Avatar, Tooltip, Progress
} from '@mantine/core';
import { 
    IconBrain, IconSend, IconTrendingUp, IconUsers, IconAlertTriangle,
    IconRefresh, IconSparkles, IconChartBar, IconCheck
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';

function RecommendationsPage() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [progressInfo, setProgressInfo] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientRecommendations, setClientRecommendations] = useState([]);
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
    const [clients, setClients] = useState([]);

    const API_BASE = import.meta.env.VITE_API_BASE_URL;
    const getAuthHeaders = () => ({
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
    });

    useEffect(() => {
        fetchDashboard();
        fetchClients();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/recommendations/dashboard`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            setDashboard(data);
        } catch (error) {
            console.error('Error:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo cargar el dashboard',
                color: 'red'
            });
        }
        setLoading(false);
    };

    const fetchClients = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/clients`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            setClients(data.map(c => ({ 
                value: c.id.toString(), 
                label: `${c.nombres} ${c.apellidos}` 
            })));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleGenerateAll = async () => {
        setGeneratingAll(true);
        setProgressInfo({ message: 'Iniciando generación...', progress: 0 });
        
        try {
            const response = await fetch(`${API_BASE}/api/recommendations/generate-all`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            setProgressInfo({ 
                message: 'Completado', 
                progress: 100,
                details: data
            });
            
            setTimeout(() => {
                notifications.show({
                    title: '✨ Generación Completada',
                    message: `${data.recomendacionesGeneradas} recomendaciones para ${data.clientesProcesados} clientes`,
                    color: 'green',
                    autoClose: 5000
                });
                setProgressInfo(null);
                fetchDashboard();
            }, 1500);
            
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo completar la generación',
                color: 'red'
            });
            setProgressInfo(null);
        }
        
        setGeneratingAll(false);
    };

    const handleGenerateForClient = async (clientId) => {
        try {
            const response = await fetch(`${API_BASE}/api/recommendations/generate/${clientId}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await response.json();
            
            notifications.show({
                title: '✅ Generadas',
                message: `${data.count} recomendación(es) creada(s)`,
                color: 'green'
            });
            
            fetchClientRecommendations(clientId);
            fetchDashboard();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudieron generar',
                color: 'red'
            });
        }
    };

    const fetchClientRecommendations = async (clientId) => {
        try {
            const response = await fetch(`${API_BASE}/api/recommendations/client/${clientId}`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            setClientRecommendations(data);
            openModal();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleMarkAsSent = async (recommendationId) => {
        try {
            await fetch(`${API_BASE}/api/recommendations/${recommendationId}/mark-sent`, {
                method: 'PUT',
                headers: getAuthHeaders()
            });
            
            notifications.show({
                title: 'Actualizado',
                message: 'Marcada como enviada',
                color: 'blue'
            });
            
            fetchClientRecommendations(selectedClient);
            fetchDashboard();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo actualizar',
                color: 'red'
            });
        }
    };

    if (loading) {
        return (
            <Container>
                <LoadingOverlay visible />
            </Container>
        );
    }

    if (!dashboard) {
        return (
            <Container>
                <Alert color="red" title="Error">
                    No se pudieron cargar los datos.
                </Alert>
            </Container>
        );
    }

    const conversionPercent = parseFloat(dashboard.kpis.tasa_conversion) || 0;

    return (
        <Container fluid>
            <Stack gap="xl">
                <div>
                    <Group justify="space-between">
                        <div>
                            <Title order={2}>
                                <Group gap="xs">
                                    <IconBrain size={32} />
                                    Motor de Recomendaciones
                                </Group>
                            </Title>
                            <Text c="dimmed" mt="xs">
                                Recomendaciones personalizadas basadas en IA y comportamiento AR
                            </Text>
                        </div>
                        <Group>
                            <Button 
                                leftSection={<IconRefresh size={16} />}
                                onClick={fetchDashboard}
                                variant="default"
                                disabled={generatingAll}
                            >
                                Actualizar
                            </Button>
                            <Button 
                                leftSection={<IconSparkles size={16} />}
                                onClick={handleGenerateAll}
                                loading={generatingAll}
                                gradient={{ from: 'yellow', to: 'orange' }}
                                variant="gradient"
                            >
                                Generar Todas
                            </Button>
                        </Group>
                    </Group>
                    
                    {progressInfo && (
                        <Paper withBorder p="md" mt="md" bg="blue.0">
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text fw={500}>{progressInfo.message}</Text>
                                    {progressInfo.progress === 100 && <IconCheck color="green" />}
                                </Group>
                                <Progress value={progressInfo.progress} animated={progressInfo.progress < 100} />
                                {progressInfo.details && (
                                    <Text size="sm" c="dimmed">
                                        {progressInfo.details.clientesProcesados} clientes procesados, {' '}
                                        {progressInfo.details.recomendacionesGeneradas} recomendaciones generadas
                                    </Text>
                                )}
                            </Stack>
                        </Paper>
                    )}
                </div>

                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Card withBorder>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Total Generadas
                                    </Text>
                                    <Text size="xl" fw={700} mt="xs">
                                        {dashboard.kpis.total}
                                    </Text>
                                </div>
                                <ThemeIcon size={50} radius="md" variant="light">
                                    <IconBrain size={28} />
                                </ThemeIcon>
                            </Group>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Card withBorder>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Pendientes
                                    </Text>
                                    <Text size="xl" fw={700} mt="xs">
                                        {dashboard.kpis.pendientes}
                                    </Text>
                                </div>
                                <ThemeIcon size={50} radius="md" variant="light" color="yellow">
                                    <IconAlertTriangle size={28} />
                                </ThemeIcon>
                            </Group>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Card withBorder>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Enviadas
                                    </Text>
                                    <Text size="xl" fw={700} mt="xs">
                                        {dashboard.kpis.enviadas}
                                    </Text>
                                </div>
                                <ThemeIcon size={50} radius="md" variant="light" color="blue">
                                    <IconSend size={28} />
                                </ThemeIcon>
                            </Group>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Card withBorder>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Conversión
                                    </Text>
                                    <Group gap="xs" mt="xs">
                                        <Text size="xl" fw={700}>
                                            {conversionPercent}%
                                        </Text>
                                        <RingProgress
                                            size={50}
                                            thickness={5}
                                            sections={[{ value: conversionPercent, color: 'green' }]}
                                        />
                                    </Group>
                                </div>
                                <ThemeIcon size={50} radius="md" variant="light" color="green">
                                    <IconTrendingUp size={28} />
                                </ThemeIcon>
                            </Group>
                        </Card>
                    </Grid.Col>
                </Grid>

                <Tabs defaultValue="types">
                    <Tabs.List>
                        <Tabs.Tab value="types" leftSection={<IconChartBar size={16} />}>
                            Por Tipo
                        </Tabs.Tab>
                        <Tabs.Tab value="clients" leftSection={<IconUsers size={16} />}>
                            Por Cliente
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="types" pt="md">
                        <Card withBorder>
                            <Title order={5} mb="md">Distribución por Algoritmo</Title>
                            
                            {dashboard.distribucion_tipos.length === 0 ? (
                                <Alert color="blue" title="Sin datos">
                                    Haz clic en "Generar Todas" para crear recomendaciones.
                                </Alert>
                            ) : (
                                <Stack gap="md">
                                    {dashboard.distribucion_tipos.map(tipo => (
                                        <Paper key={tipo.tipo} withBorder p="md" radius="md">
                                            <Group justify="space-between">
                                                <Group>
                                                    <Badge 
                                                        size="lg"
                                                        variant="light"
                                                        color={
                                                            tipo.tipo === 'alta_interaccion' ? 'blue' :
                                                            tipo.tipo === 'categoria_favorita' ? 'orange' :
                                                            'grape'
                                                        }
                                                    >
                                                        {tipo.tipo === 'alta_interaccion' ? '🎯 Alta Interacción' :
                                                         tipo.tipo === 'categoria_favorita' ? '⭐ Categoría Favorita' :
                                                         '👥 Similares'}
                                                    </Badge>
                                                    <Text fw={500}>{tipo.count} recomendaciones</Text>
                                                </Group>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </Card>
                    </Tabs.Panel>

                    <Tabs.Panel value="clients" pt="md">
                        <Card withBorder>
                            <Group mb="md">
                                <Select
                                    placeholder="Selecciona un cliente"
                                    data={clients}
                                    searchable
                                    value={selectedClient}
                                    onChange={(value) => {
                                        setSelectedClient(value);
                                        if (value) fetchClientRecommendations(value);
                                    }}
                                    style={{ flex: 1 }}
                                />
                                {selectedClient && (
                                    <Button
                                        leftSection={<IconSparkles size={16} />}
                                        onClick={() => handleGenerateForClient(selectedClient)}
                                    >
                                        Generar
                                    </Button>
                                )}
                            </Group>

                            {selectedClient && clientRecommendations.length === 0 && (
                                <Alert color="blue">
                                    Sin recomendaciones. Haz clic en "Generar".
                                </Alert>
                            )}
                        </Card>
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            <Modal
                opened={modalOpened}
                onClose={closeModal}
                title="Recomendaciones del Cliente"
                size="xl"
            >
                <ScrollArea h={500}>
                    {clientRecommendations.length === 0 ? (
                        <Text c="dimmed" ta="center">Sin datos</Text>
                    ) : (
                        <Stack gap="md">
                            {clientRecommendations.map(rec => (
                                <Paper key={rec.id} withBorder p="md" radius="md">
                                    <Group justify="space-between" align="flex-start">
                                        <Group align="flex-start">
                                            <Avatar 
                                                size="lg" 
                                                radius="md"
                                                src={rec.Productos?.ActivosDigitales?.urls_imagenes?.frente}
                                            >
                                                {rec.Productos?.nombre?.[0]}
                                            </Avatar>
                                            <div>
                                                <Text fw={500}>{rec.Productos?.nombre}</Text>
                                                <Badge 
                                                    size="sm" 
                                                    mt="xs"
                                                    color={
                                                        rec.tipo_recomendacion === 'alta_interaccion' ? 'blue' :
                                                        rec.tipo_recomendacion === 'categoria_favorita' ? 'orange' :
                                                        'grape'
                                                    }
                                                >
                                                    {rec.tipo_recomendacion}
                                                </Badge>
                                                <Text size="sm" c="dimmed" mt="xs">
                                                    Confianza: {(rec.score_confianza * 100).toFixed(0)}%
                                                </Text>
                                                <Paper withBorder p="xs" mt="sm">
                                                    <Text size="sm">{rec.mensaje_personalizado}</Text>
                                                </Paper>
                                            </div>
                                        </Group>
                                        <Stack gap="xs">
                                            <Badge 
                                                color={
                                                    rec.estado === 'pendiente' ? 'yellow' :
                                                    rec.estado === 'enviada' ? 'blue' :
                                                    rec.estado === 'aceptada' ? 'green' : 'red'
                                                }
                                            >
                                                {rec.estado}
                                            </Badge>
                                            {rec.estado === 'pendiente' && (
                                                <Tooltip label="Enviar">
                                                    <ActionIcon
                                                        variant="light"
                                                        color="blue"
                                                        onClick={() => handleMarkAsSent(rec.id)}
                                                    >
                                                        <IconSend size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </ScrollArea>
            </Modal>
        </Container>
    );
}

export default RecommendationsPage;