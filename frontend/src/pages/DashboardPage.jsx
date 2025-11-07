// --- ARCHIVO COMPLETO: frontend/src/pages/DashboardPage.jsx ---

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Title, Text, SimpleGrid, Card, Group, Stack, useMantineTheme, Alert, 
    Center, Loader, Grid, Box, Paper, Badge, ThemeIcon, Container 
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { 
    IconUserPlus, IconHeart, IconMessageCircle, IconEye, IconStar 
} from '@tabler/icons-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend 
} from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Sub-componente para las Tarjetas de KPI ---
function KpiCard({ title, value, icon, unit = '', period = "Total histórico" }) {
    const theme = useMantineTheme();
    return (
        <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {title}
                </Text>
                <ThemeIcon 
                    color={theme.primaryColor} 
                    variant="light" 
                    size={38} 
                    radius="md"
                >
                    {icon}
                </ThemeIcon>
            </Group>
            <Group align="flex-end" gap="xs" mt="xl">
                <Text fz={32} fw={700} lh={1}>
                    {value}
                </Text>
                {unit && (
                    <Text c={theme.primaryColor} fw={500} size="sm" mb={4}>
                        {unit}
                    </Text>
                )}
            </Group>
            <Text fz="xs" c="dimmed" mt={7}>
                {period}
            </Text>
        </Paper>
    );
}

function DashboardPage() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visitDateRange, setVisitDateRange] = useState([subDays(new Date(), 30), new Date()]);
    const [visitsTrend, setVisitsTrend] = useState([]);
    const [loadingVisits, setLoadingVisits] = useState(false);
    const theme = useMantineTheme();

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get(
                    `${import.meta.env.VITE_API_BASE_URL}/api/analytics/dashboard-summary`, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setSummary(data);
                setVisitsTrend(data.charts.visitsTrend || []);
                setError(null);
            } catch (err) {
                console.error("Error al cargar el dashboard:", err);
                setError("No se pudieron cargar los datos del dashboard. Revisa la consola para más detalles.");
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, []);

    // Cargar visitas cuando cambia el rango de fechas
    useEffect(() => {
        const fetchVisitsTrend = async () => {
            if (visitDateRange[0] && visitDateRange[1]) {
                setLoadingVisits(true);
                try {
                    const token = localStorage.getItem('authToken');
                    const start = format(visitDateRange[0], 'yyyy-MM-dd');
                    const end = format(visitDateRange[1], 'yyyy-MM-dd');
                    const { data } = await axios.get(
                        `${import.meta.env.VITE_API_BASE_URL}/api/analytics/visits-trend?start=${start}&end=${end}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setVisitsTrend(data);
                } catch(err) {
                    console.error("Error cargando visitas:", err);
                }
                setLoadingVisits(false);
            }
        };
        fetchVisitsTrend();
    }, [visitDateRange]);

    if (loading) {
        return (
            <Center h="80vh">
                <Loader size="lg" />
            </Center>
        );
    }

    if (error || !summary) {
        return (
            <Alert color="red" title="Error de Carga">
                {error}
            </Alert>
        );
    }
    
    const tickColor = theme.colorScheme === 'dark' 
        ? theme.colors.dark[1] 
        : theme.colors.gray[7];
    
    // Formateador para las fechas en el gráfico
    const formatDate = (dateString) => {
        try {
            return format(parseISO(dateString), 'dd MMM', { locale: es });
        } catch {
            return dateString;
        }
    };
    
    // Tooltip personalizado para el gráfico
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <Paper withBorder shadow="md" radius="md" p="sm">
                    <Text fw={700}>{formatDate(label)}</Text>
                    <Text size="sm">Visitas: {payload[0].value}</Text>
                </Paper>
            );
        }
        return null;
    };

    return (
        <Container fluid>
            <Title order={2} mb="xs">Dashboard de Interacción</Title>
            <Text c="dimmed" mb="xl">
                Resumen de la interacción de los clientes con el sistema.
            </Text>

            {/* KPIs principales */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
                <KpiCard 
                    title="Nuevos Clientes" 
                    value={summary.kpis.newClientsLast30Days} 
                    icon={<IconUserPlus size="1.4rem" />} 
                    period="Últimos 30 días" 
                />
                <KpiCard 
                    title="Total de 'Me Gusta'" 
                    value={summary.kpis.totalLikes} 
                    icon={<IconHeart size="1.4rem" />} 
                />
                <KpiCard 
                    title="Total de Comentarios" 
                    value={summary.kpis.totalComments} 
                    icon={<IconMessageCircle size="1.4rem" />} 
                />
                <KpiCard 
                    title="Interacción en AR" 
                    value={summary.kpis.totalArInteractionMinutes} 
                    unit="min." 
                    icon={<IconEye size="1.4rem" />} 
                />
            </SimpleGrid>

            <Grid>
                {/* GRÁFICO DE TENDENCIA DE VISITAS CON SELECTOR DE FECHAS */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Card withBorder radius="md" p="xl" style={{ height: '100%' }}>
                        <Title order={5}>Tendencia de Visitas</Title>
                        <Text fz="xs" c="dimmed">
                            Visitas diarias registradas
                        </Text>
                        
                        <DatePickerInput 
                            type="range" 
                            label="Selecciona un rango de fechas" 
                            value={visitDateRange} 
                            onChange={setVisitDateRange} 
                            mt="md"
                            locale="es"
                        />
                        
                        <Box style={{ width: '100%', height: 300 }} mt="lg">
                            {loadingVisits ? (
                                <Center h="100%"><Loader /></Center>
                            ) : visitsTrend.length === 0 ? (
                                <Center h="100%">
                                    <Text c="dimmed">No hay datos de visitas en este rango</Text>
                                </Center>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={visitsTrend}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="fecha" 
                                            tickFormatter={formatDate} 
                                            tick={{ fill: tickColor, fontSize: 12 }} 
                                        />
                                        <YAxis 
                                            allowDecimals={false} 
                                            tick={{ fill: tickColor, fontSize: 12 }} 
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="visitas" 
                                            name="Visitas" 
                                            stroke={theme.colors.blue[6]} 
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Card>
                </Grid.Col>

                {/* COLUMNA DERECHA: Tops */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Stack>
                        {/* Producto más visto en AR */}
                        <Card withBorder radius="md" p="md">
                            <Group mb="sm">
                                <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                                    <IconEye size="1.2rem" />
                                </ThemeIcon>
                                <Title order={6}>Más Popular en AR</Title>
                            </Group>
                            
                            <Text fz="xl" fw={700} mt="sm">
                                {summary.topStats.mostViewedARProduct.nombre}
                            </Text>
                            <Text fz="sm" c="dimmed">
                                {Math.round(summary.topStats.mostViewedARProduct.total_duracion / 60)} minutos 
                                de visualización total
                            </Text>
                            <Badge mt="sm" size="lg" variant="light" color="blue">
                                {summary.topStats.mostViewedARProduct.total_duracion} segundos
                            </Badge>
                        </Card>
                        
                        {/* Top 3 Productos con más Likes */}
                        <Card withBorder radius="md" p="md">
                            <Group mb="sm">
                                <ThemeIcon size="lg" radius="md" variant="light" color="red">
                                    <IconStar size="1.2rem" />
                                </ThemeIcon>
                                <Title order={6}>Top 3 Productos con Más Likes</Title>
                            </Group>
                            
                            {summary.topStats.topLikedProducts.length === 0 ? (
                                <Text size="sm" c="dimmed">No hay datos suficientes</Text>
                            ) : (
                                <Stack mt="sm" gap="xs">
                                    {summary.topStats.topLikedProducts.map((prod, index) => (
                                        <Paper key={index} p="sm" withBorder radius="sm">
                                            <Group justify="space-between">
                                                <Group gap="xs">
                                                    <Badge 
                                                        size="lg" 
                                                        variant="filled" 
                                                        color={
                                                            index === 0 ? 'yellow' : 
                                                            index === 1 ? 'gray' : 
                                                            'orange'
                                                        }
                                                        circle
                                                    >
                                                        {index + 1}
                                                    </Badge>
                                                    <Text size="sm" fw={500}>
                                                        {prod.nombre}
                                                    </Text>
                                                </Group>
                                                <Badge variant="light" color="red" size="lg">
                                                    <IconHeart size={14} /> {prod.like_count}
                                                </Badge>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </Card>
                    </Stack>
                </Grid.Col>
            </Grid>
        </Container>
    );
}

export default DashboardPage;