import { useState, useEffect } from 'react';
import { 
    Container, Title, Text, Grid, Card, Stack, Group, Badge, Button, 
    ThemeIcon, RingProgress, Paper, LoadingOverlay, Alert, Tabs,
    Progress, Avatar, ScrollArea, ActionIcon, Tooltip, Modal, Timeline,
    Table, Box
} from '@mantine/core';
import { 
    IconBrain, IconUsers, IconAlertTriangle, IconTrendingUp, IconRefresh,
    IconSparkles, IconChartBar, IconEye, IconClockHour3, IconUserCheck,
    IconUserX, IconBell, IconCheck, IconTarget, IconActivity, IconFilter
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line
} from 'recharts';

const COLORS = ['#FFD100', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
const RIESGO_COLORS = { bajo: 'green', medio: 'yellow', alto: 'red' };

function PredictiveAnalyticsPage() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [anomalies, setAnomalies] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientInsights, setClientInsights] = useState(null);
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

    const API_BASE = import.meta.env.VITE_API_BASE_URL;
    const getAuthHeaders = () => ({
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
    });

    useEffect(() => {
        fetchDashboard();
        fetchAnomalies();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/predictive/dashboard`, {
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

    const fetchAnomalies = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/predictive/anomalies`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            setAnomalies(data);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleRunAnalysis = async () => {
        setAnalyzing(true);
        setAnalysisProgress(0);

        // Simular progreso mientras se ejecuta
        const progressInterval = setInterval(() => {
            setAnalysisProgress(prev => Math.min(prev + 10, 90));
        }, 500);

        try {
            const response = await fetch(`${API_BASE}/api/predictive/run-analysis`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await response.json();

            clearInterval(progressInterval);
            setAnalysisProgress(100);

            setTimeout(() => {
                notifications.show({
                    title: '✨ Análisis Completado',
                    message: `${data.resultados.patrones_actualizados} patrones actualizados, ${data.resultados.anomalias_detectadas} anomalías detectadas`,
                    color: 'green',
                    autoClose: 5000
                });
                setAnalysisProgress(0);
                fetchDashboard();
                fetchAnomalies();
            }, 1000);

        } catch (error) {
            clearInterval(progressInterval);
            notifications.show({
                title: 'Error',
                message: 'No se pudo completar el análisis',
                color: 'red'
            });
        }

        setAnalyzing(false);
    };

    const handleViewClientInsights = async (clientId, clientName) => {
        setSelectedClient({ id: clientId, name: clientName });
        try {
            const response = await fetch(`${API_BASE}/api/predictive/client/${clientId}/insights`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            setClientInsights(data);
            openModal();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los insights',
                color: 'red'
            });
        }
    };

    const handleResolveAnomaly = async (anomalyId) => {
        try {
            await fetch(`${API_BASE}/api/predictive/anomalies/${anomalyId}/resolve`, {
                method: 'PUT',
                headers: getAuthHeaders()
            });
            notifications.show({
                title: 'Anomalía Resuelta',
                message: 'Marcada como atendida',
                color: 'green'
            });
            fetchAnomalies();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo resolver',
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
                    No se pudieron cargar los datos del análisis predictivo.
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid>
            <Stack gap="xl">
                {/* Header con Animación */}
                <Box style={{ 
                    animation: 'fadeInDown 0.6s ease-out',
                    '@keyframes fadeInDown': {
                        from: { opacity: 0, transform: 'translateY(-20px)' },
                        to: { opacity: 1, transform: 'translateY(0)' }
                    }
                }}>
                    <Group justify="space-between">
                        <div>
                            <Title order={2}>
                                <Group gap="xs">
                                    <IconBrain size={32} style={{ color: '#FFD100' }} />
                                    Análisis Predictivo Avanzado
                                </Group>
                            </Title>
                            <Text c="dimmed" mt="xs">
                                Machine Learning y detección de patrones en tiempo real
                            </Text>
                        </div>
                        <Group>
                            <Button 
                                leftSection={<IconRefresh size={16} />}
                                onClick={fetchDashboard}
                                variant="default"
                                disabled={analyzing}
                            >
                                Actualizar
                            </Button>
                            <Button 
                                leftSection={<IconSparkles size={16} />}
                                onClick={handleRunAnalysis}
                                loading={analyzing}
                                gradient={{ from: 'yellow', to: 'orange' }}
                                variant="gradient"
                            >
                                Ejecutar Análisis
                            </Button>
                        </Group>
                    </Group>

                    {analyzing && (
                        <Paper withBorder p="md" mt="md" style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            animation: 'pulse 2s ease-in-out infinite'
                        }}>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text c="white" fw={500}>🔮 Analizando patrones...</Text>
                                    <Text c="white" fw={700}>{analysisProgress}%</Text>
                                </Group>
                                <Progress 
                                    value={analysisProgress} 
                                    animated 
                                    color="yellow"
                                    size="xl"
                                    radius="xl"
                                />
                            </Stack>
                        </Paper>
                    )}
                </Box>

                {/* KPIs Principales con animación escalonada */}
                <Grid>
                    {[
                        { 
                            label: 'Clientes Activos', 
                            value: dashboard.kpis.clientes_activos, 
                            icon: IconUserCheck, 
                            color: 'green',
                            delay: '0.1s'
                        },
                        { 
                            label: 'En Riesgo', 
                            value: dashboard.kpis.clientes_riesgo, 
                            icon: IconAlertTriangle, 
                            color: 'yellow',
                            delay: '0.2s'
                        },
                        { 
                            label: 'Inactivos', 
                            value: dashboard.kpis.clientes_inactivos, 
                            icon: IconUserX, 
                            color: 'red',
                            delay: '0.3s'
                        },
                        { 
                            label: 'Anomalías Detectadas', 
                            value: dashboard.kpis.anomalias_pendientes, 
                            icon: IconBell, 
                            color: 'orange',
                            delay: '0.4s'
                        }
                    ].map((kpi, index) => (
                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={index}>
                            <Card 
                                withBorder 
                                shadow="sm"
                                style={{ 
                                    animation: `fadeInUp 0.6s ease-out ${kpi.delay}`,
                                    transformOrigin: 'bottom'
                                }}
                            >
                                <Group justify="space-between">
                                    <div>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                            {kpi.label}
                                        </Text>
                                        <Text size="xl" fw={700} mt="xs">
                                            {kpi.value}
                                        </Text>
                                    </div>
                                    <ThemeIcon 
                                        size={60} 
                                        radius="md" 
                                        variant="light" 
                                        color={kpi.color}
                                        style={{ animation: 'bounce 2s ease-in-out infinite' }}
                                    >
                                        <kpi.icon size={32} />
                                    </ThemeIcon>
                                </Group>
                            </Card>
                        </Grid.Col>
                    ))}
                </Grid>

                {/* Tabs con contenido */}
                <Tabs defaultValue="clusters" style={{ animation: 'fadeIn 0.8s ease-out' }}>
                    <Tabs.List>
                        <Tabs.Tab value="clusters" leftSection={<IconUsers size={16} />}>
                            Segmentación de Clientes
                        </Tabs.Tab>
                        <Tabs.Tab value="anomalies" leftSection={<IconAlertTriangle size={16} />}>
                            Anomalías Detectadas
                        </Tabs.Tab>
                        <Tabs.Tab value="predictions" leftSection={<IconTarget size={16} />}>
                            Predicciones
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* TAB 1: Clusters */}
                    <Tabs.Panel value="clusters" pt="md">
                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Card withBorder p="xl">
                                    <Title order={5} mb="md">Distribución de Clusters</Title>
                                    {dashboard.distribucion_clusters.length === 0 ? (
                                        <Alert color="blue">
                                            Ejecuta el análisis para generar clusters
                                        </Alert>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={dashboard.distribucion_clusters}
                                                    dataKey="cantidad_clientes"
                                                    nameKey="cluster_nombre"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    label={(entry) => `${entry.cluster_nombre}: ${entry.cantidad_clientes}`}
                                                    animationBegin={0}
                                                    animationDuration={800}
                                                >
                                                    {dashboard.distribucion_clusters.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </Card>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Card withBorder p="md">
                                    <Title order={5} mb="md">Valor Promedio por Cluster</Title>
                                    {dashboard.distribucion_clusters.length === 0 ? (
                                        <Text c="dimmed" ta="center">Sin datos</Text>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={dashboard.distribucion_clusters}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="cluster_nombre" 
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={100}
                                                />
                                                <YAxis />
                                                <RechartsTooltip />
                                                <Bar 
                                                    dataKey="valor_promedio" 
                                                    fill="#FFD100"
                                                    animationDuration={1000}
                                                    radius={[8, 8, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </Card>
                            </Grid.Col>
                        </Grid>

                        {/* Descripción de Clusters */}
                        <Grid mt="md">
                            {[
                                { 
                                    nombre: 'Fans Leales', 
                                    descripcion: 'Visitan frecuentemente, alta interacción, prefieren categorías específicas',
                                    color: 'green',
                                    icon: '❤️'
                                },
                                { 
                                    nombre: 'Exploradores Casuales', 
                                    descripcion: 'Curiosos, ven muchos productos, baja frecuencia de visita',
                                    color: 'blue',
                                    icon: '🔍'
                                },
                                { 
                                    nombre: 'Compradores Decisivos', 
                                    descripcion: 'Pocas interacciones pero muy directas, saben lo que quieren',
                                    color: 'orange',
                                    icon: '🎯'
                                },
                                { 
                                    nombre: 'Curiosos Pasivos', 
                                    descripción: 'Miran pero rara vez interactúan, potencial sin explotar',
                                    color: 'gray',
                                    icon: '👀'
                                }
                            ].map((cluster, index) => (
                                <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={index}>
                                    <Paper 
                                        withBorder 
                                        p="md" 
                                        radius="md"
                                        style={{ 
                                            borderLeft: `4px solid var(--mantine-color-${cluster.color}-6)`,
                                            animation: `slideInRight 0.5s ease-out ${index * 0.1}s backwards`
                                        }}
                                    >
                                        <Group gap="xs" mb="xs">
                                            <Text size="xl">{cluster.icon}</Text>
                                            <Text fw={600}>{cluster.nombre}</Text>
                                        </Group>
                                        <Text size="sm" c="dimmed">
                                            {cluster.descripcion}
                                        </Text>
                                    </Paper>
                                </Grid.Col>
                            ))}
                        </Grid>
                    </Tabs.Panel>

                    {/* TAB 2: Anomalías */}
                    <Tabs.Panel value="anomalies" pt="md">
                        <Card withBorder>
                            <Group justify="space-between" mb="md">
                                <Title order={5}>Anomalías Detectadas Recientemente</Title>
                                <Badge size="lg" color="orange" variant="light">
                                    {anomalies.length} sin atender
                                </Badge>
                            </Group>

                            {anomalies.length === 0 ? (
                                <Alert color="green" icon={<IconCheck />}>
                                    ¡Excelente! No hay anomalías pendientes de atención
                                </Alert>
                            ) : (
                                <ScrollArea h={500}>
                                    <Stack gap="md">
                                        {anomalies.map((anomaly, index) => (
                                            <Paper 
                                                key={anomaly.id} 
                                                withBorder 
                                                p="md" 
                                                radius="md"
                                                style={{ 
                                                    animation: `fadeInLeft 0.5s ease-out ${index * 0.1}s backwards`,
                                                    borderLeft: `4px solid var(--mantine-color-${anomaly.severidad === 'alta' ? 'red' : anomaly.severidad === 'media' ? 'yellow' : 'blue'}-6)`
                                                }}
                                            >
                                                <Group justify="space-between" align="flex-start">
                                                    <Group align="flex-start">
                                                        <Avatar size="md" radius="xl" color="red">
                                                            <IconAlertTriangle size={20} />
                                                        </Avatar>
                                                        <div>
                                                            <Group gap="xs">
                                                                <Text fw={500}>
                                                                    {anomaly.Clientes?.nombres} {anomaly.Clientes?.apellidos}
                                                                </Text>
                                                                <Badge 
                                                                    color={
                                                                        anomaly.severidad === 'alta' ? 'red' :
                                                                        anomaly.severidad === 'media' ? 'yellow' : 'blue'
                                                                    }
                                                                    size="sm"
                                                                >
                                                                    {anomaly.severidad.toUpperCase()}
                                                                </Badge>
                                                            </Group>
                                                            <Badge variant="outline" mt="xs" size="sm">
                                                                {anomaly.tipo_anomalia}
                                                            </Badge>
                                                            <Text size="sm" c="dimmed" mt="xs">
                                                                {anomaly.descripcion}
                                                            </Text>
                                                            {anomaly.Clientes && (
                                                                <Button
                                                                    variant="subtle"
                                                                    size="xs"
                                                                    mt="xs"
                                                                    leftSection={<IconEye size={14} />}
                                                                    onClick={() => handleViewClientInsights(
                                                                        anomaly.id_cliente,
                                                                        `${anomaly.Clientes.nombres} ${anomaly.Clientes.apellidos}`
                                                                    )}
                                                                >
                                                                    Ver Perfil Completo
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </Group>
                                                    <Tooltip label="Marcar como resuelta">
                                                        <ActionIcon
                                                            variant="light"
                                                            color="green"
                                                            onClick={() => handleResolveAnomaly(anomaly.id)}
                                                        >
                                                            <IconCheck size={18} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </ScrollArea>
                            )}
                        </Card>
                    </Tabs.Panel>

                    {/* TAB 3: Predicciones */}
                    <Tabs.Panel value="predictions" pt="md">
                        <Card withBorder>
                            <Title order={5} mb="md">Predicciones de Alta Confianza</Title>
                            {dashboard.predicciones_alta_confianza.length === 0 ? (
                                <Alert color="blue">
                                    No hay predicciones generadas aún. Ejecuta el análisis completo.
                                </Alert>
                            ) : (
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Cliente</Table.Th>
                                            <Table.Th>Producto Predicho</Table.Th>
                                            <Table.Th>Probabilidad</Table.Th>
                                            <Table.Th>Método</Table.Th>
                                            <Table.Th>Acción</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {dashboard.predicciones_alta_confianza.map(pred => (
                                            <Table.Tr key={pred.id}>
                                                <Table.Td>
                                                    {pred.Clientes?.nombres} {pred.Clientes?.apellidos}
                                                </Table.Td>
                                                <Table.Td>{pred.Productos?.nombre}</Table.Td>
                                                <Table.Td>
                                                    <Group gap="xs">
                                                        <Progress 
                                                            value={pred.probabilidad_interes * 100} 
                                                            w={100}
                                                            color="green"
                                                        />
                                                        <Text size="sm">
                                                            {(pred.probabilidad_interes * 100).toFixed(0)}%
                                                        </Text>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge size="sm" variant="light">
                                                        {pred.metodo_calculo || 'hybrid'}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Button size="xs" variant="light">
                                                        Crear Campaña
                                                    </Button>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            )}
                        </Card>
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            {/* Modal de Insights del Cliente */}
            <Modal
                opened={modalOpened}
                onClose={closeModal}
                title={
                    <Group>
                        <IconActivity />
                        <Title order={4}>Perfil Predictivo: {selectedClient?.name}</Title>
                    </Group>
                }
                size="xl"
            >
                {clientInsights && (
                    <ScrollArea h={600}>
                        <Stack gap="md">
                            {/* Patrones Temporales */}
                            {clientInsights.patrones && (
                                <Paper withBorder p="md" radius="md">
                                    <Title order={6} mb="md">Patrones de Comportamiento</Title>
                                    <Grid>
                                        <Grid.Col span={6}>
                                            <Text size="sm" c="dimmed">Día Preferido</Text>
                                            <Text fw={600}>
                                                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][clientInsights.patrones.dia_preferido_semana]}
                                            </Text>
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <Text size="sm" c="dimmed">Hora Preferida</Text>
                                            <Text fw={600}>{clientInsights.patrones.hora_preferida_dia}:00</Text>
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <Text size="sm" c="dimmed">Categoría Favorita</Text>
                                            <Text fw={600}>{clientInsights.patrones.categoria_dominante}</Text>
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <Text size="sm" c="dimmed">Días sin Actividad</Text>
                                            <Badge color={
                                                clientInsights.patrones.dias_desde_ultima_interaccion <= 7 ? 'green' :
                                                clientInsights.patrones.dias_desde_ultima_interaccion <= 30 ? 'yellow' : 'red'
                                            }>
                                                {clientInsights.patrones.dias_desde_ultima_interaccion} días
                                            </Badge>
                                        </Grid.Col>
                                    </Grid>

                                    <Group mt="xl" grow>
                                        <div>
                                            <Text size="sm" c="dimmed" ta="center">Prob. Compra</Text>
                                            <RingProgress
                                                size={100}
                                                thickness={12}
                                                sections={[
                                                    { 
                                                        value: (clientInsights.patrones.probabilidad_compra_proxima_semana || 0) * 100, 
                                                        color: 'green' 
                                                    }
                                                ]}
                                                label={
                                                    <Text ta="center" size="lg" fw={700}>
                                                        {((clientInsights.patrones.probabilidad_compra_proxima_semana || 0) * 100).toFixed(0)}%
                                                    </Text>
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Text size="sm" c="dimmed" ta="center">Riesgo Abandono</Text>
                                            <RingProgress
                                                size={100}
                                                thickness={12}
                                                sections={[
                                                    { 
                                                        value: (clientInsights.patrones.riesgo_abandono || 0) * 100, 
                                                        color: 'red' 
                                                    }
                                                ]}
                                                label={
                                                    <Text ta="center" size="lg" fw={700}>
                                                        {((clientInsights.patrones.riesgo_abandono || 0) * 100).toFixed(0)}%
                                                    </Text>
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Text size="sm" c="dimmed" ta="center">Valor Potencial</Text>
                                            <RingProgress
                                                size={100}
                                                thickness={12}
                                                sections={[
                                                    { 
                                                        value: clientInsights.patrones.valor_potencial_cliente || 0, 
                                                        color: 'yellow' 
                                                    }
                                                ]}
                                                label={
                                                    <Text ta="center" size="lg" fw={700}>
                                                        {clientInsights.patrones.valor_potencial_cliente || 0}
                                                    </Text>
                                                }
                                            />
                                        </div>
                                    </Group>
                                </Paper>
                            )}

                            {/* Clusters */}
                            {clientInsights.clusters.length > 0 && (
                                <Paper withBorder p="md" radius="md">
                                    <Title order={6} mb="md">Segmentación</Title>
                                    {clientInsights.clusters.map(cluster => (
                                        <Group key={cluster.id} justify="space-between" mb="xs">
                                            <Text>{cluster.ClustersClientes.nombre_cluster}</Text>
                                            <Badge color="blue">
                                                {(cluster.similitud_score * 100).toFixed(0)}% similitud
                                            </Badge>
                                        </Group>
                                    ))}
                                </Paper>
                            )}
                        </Stack>
                    </ScrollArea>
                )}
            </Modal>

            {/* Estilos CSS para animaciones */}
            <style>{`
                @keyframes fadeInDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
            `}</style>
        </Container>
    );
}

export default PredictiveAnalyticsPage;