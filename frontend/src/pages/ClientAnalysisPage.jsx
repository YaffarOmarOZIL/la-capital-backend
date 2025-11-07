// --- ARCHIVO COMPLETO: frontend/src/pages/ClientAnalysisPage.jsx ---
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Title, Text, Card, Group, Stack, useMantineTheme, Alert, Center, Loader, 
    Paper, Grid, Box, Modal, Avatar, ScrollArea, List, Button, 
    Container, Badge, ThemeIcon, MultiSelect
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { 
    IconUsers, IconGift, IconStar, IconMessage, IconTrendingUp, IconCake, 
    IconConfetti, IconEye, IconHeart, IconFilter 
} from '@tabler/icons-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Legend, PieChart, Pie, Cell 
} from 'recharts';
import { subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS_AGE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
const COLORS_GENDER = ['#8884d8', '#82ca9d', '#ffc658', '#ff6b6b'];

function ClientAnalysisPage() {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState([subMonths(new Date(), 3), new Date()]);
    const [trendData, setTrendData] = useState([]);
    const [loadingTrend, setLoadingTrend] = useState(false);
    const [commentsModalOpen, setCommentsModalOpen] = useState(false);
    const [allComments, setAllComments] = useState([]);
    
    // Nuevos estados para filtros de productos
    const [productMetrics, setProductMetrics] = useState(['likes', 'comments', 'ar']);
    const [filteredTopProducts, setFilteredTopProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    
    const theme = useMantineTheme();
    const tickColor = theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[7];

    // Opciones para el filtro de métricas
    const metricsOptions = [
        { value: 'likes', label: '❤️ Likes' },
        { value: 'comments', label: '💬 Comentarios' },
        { value: 'ar', label: '👁️ Tiempo AR' }
    ];

    // Cargar análisis inicial
    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get(
                    `${import.meta.env.VITE_API_BASE_URL}/api/analytics/client-analysis`, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setAnalysis(data);
                setError(null);
            } catch (err) { 
                console.error("Error al cargar análisis:", err);
                setError("No se pudieron cargar los datos de análisis."); 
            }
            setLoading(false);
        };
        fetchAnalysis();
    }, []);

    // Cargar tendencia de nuevos clientes cuando cambia el rango de fechas
    useEffect(() => {
        const fetchTrendData = async () => {
            if (dateRange[0] && dateRange[1]) {
                setLoadingTrend(true);
                try {
                    const token = localStorage.getItem('authToken');
                    const start = format(dateRange[0], 'yyyy-MM-dd');
                    const end = format(dateRange[1], 'yyyy-MM-dd');
                    const { data } = await axios.get(
                        `${import.meta.env.VITE_API_BASE_URL}/api/analytics/new-clients-trend?start=${start}&end=${end}`, 
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setTrendData(data);
                } catch(err) { 
                    console.error("Error cargando tendencia:", err); 
                }
                setLoadingTrend(false);
            }
        };
        fetchTrendData();
    }, [dateRange]);

    // Cargar productos filtrados cuando cambian las métricas seleccionadas
    useEffect(() => {
        const fetchFilteredProducts = async () => {
            if (productMetrics.length === 0) {
                setFilteredTopProducts([]);
                return;
            }
            
            setLoadingProducts(true);
            try {
                const token = localStorage.getItem('authToken');
                const metricsParam = productMetrics.join(',');
                const { data } = await axios.get(
                    `${import.meta.env.VITE_API_BASE_URL}/api/analytics/top-products-filtered?metrics=${metricsParam}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setFilteredTopProducts(data);
            } catch(err) {
                console.error("Error cargando productos filtrados:", err);
            }
            setLoadingProducts(false);
        };
        fetchFilteredProducts();
    }, [productMetrics]);

    // Abrir modal de todos los comentarios
    const openAllCommentsModal = async () => {
        setCommentsModalOpen(true);
        try {
            const token = localStorage.getItem('authToken');
            const { data } = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/api/analytics/all-comments`, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAllComments(data);
        } catch (err) {
            console.error("Error al cargar comentarios:", err);
        }
    };

    if (loading) return <Center h="80vh"><Loader size="lg" /></Center>;
    if (error || !analysis) return <Alert color="red" title="Error de Carga">{error}</Alert>;
    
    const { demographics, topClients, recentComments, birthdaysByMonth, holidays } = analysis;

    return (
        <Container fluid>
            <Title order={2} mb="xs">Análisis de Clientela</Title>
            <Text c="dimmed" mb="xl">
                Inteligencia de negocio basada en el comportamiento de tus clientes.
            </Text>
            
            <Grid>
                {/* COLUMNA IZQUIERDA: Gráficos principales */}
                <Grid.Col span={{ base: 12, lg: 8 }}>
                    <Stack>
                        {/* Gráfico de Adquisición de Clientes */}
                        <Card withBorder radius="md" p="xl">
                            <Group>
                                <ThemeIcon size="lg" radius="md" variant="light" color="green">
                                    <IconUsers size="1.2rem" />
                                </ThemeIcon>
                                <div>
                                    <Title order={5}>Adquisición de Clientes</Title>
                                    <Text size="xs" c="dimmed">Clientes nuevos por mes</Text>
                                </div>
                            </Group>
                            
                            <DatePickerInput 
                                type="range" 
                                label="Selecciona un rango de fechas" 
                                value={dateRange} 
                                onChange={setDateRange} 
                                mt="md"
                                locale="es"
                            />
                            
                            <Box style={{ width: '100%', height: 300 }} mt="lg">
                                {loadingTrend ? (
                                    <Center h="100%"><Loader /></Center>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis 
                                                dataKey="mes" 
                                                tick={{ fill: tickColor, fontSize: 12 }} 
                                            />
                                            <YAxis 
                                                allowDecimals={false} 
                                                tick={{ fill: tickColor, fontSize: 12 }} 
                                            />
                                            <Tooltip />
                                            <Legend />
                                            <Bar 
                                                dataKey="nuevos_clientes" 
                                                name="Nuevos Clientes" 
                                                fill={theme.colors.green[6]} 
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Box>
                        </Card>
                        
                        {/* Demografía: Género y Edad */}
                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Card withBorder radius="md" p="md" h="100%">
                                    <Title order={5} mb="md">Distribución por Género</Title>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie 
                                                data={demographics.genderDistribution} 
                                                dataKey="count" 
                                                nameKey="group_name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={80} 
                                                label
                                            >
                                                {demographics.genderDistribution.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={COLORS_GENDER[index % COLORS_GENDER.length]} 
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Grid.Col>
                            
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Card withBorder radius="md" p="md" h="100%">
                                    <Title order={5} mb="md">Distribución por Edad</Title>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie 
                                                data={demographics.ageDistribution} 
                                                dataKey="count" 
                                                nameKey="group_name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={80} 
                                                label
                                            >
                                                {demographics.ageDistribution.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={COLORS_AGE[index % COLORS_AGE.length]} 
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Grid.Col>
                        </Grid>
                        
                        {/* Gráfico de Cumpleaños por Mes */}
                        <Card withBorder radius="md" p="xl">
                            <Group>
                                <ThemeIcon size="lg" radius="md" variant="light" color="pink">
                                    <IconCake size="1.2rem" />
                                </ThemeIcon>
                                <div>
                                    <Title order={5}>Cumpleaños por Mes</Title>
                                    <Text size="xs" c="dimmed">
                                        Planifica promociones especiales
                                    </Text>
                                </div>
                            </Group>
                            
                            <Box style={{ width: '100%', height: 280 }} mt="lg">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={birthdaysByMonth}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="mes" 
                                            tick={{ fill: tickColor, fontSize: 11 }} 
                                        />
                                        <YAxis 
                                            allowDecimals={false} 
                                            tick={{ fill: tickColor }} 
                                        />
                                        <Tooltip />
                                        <Bar 
                                            dataKey="cantidad" 
                                            name="Cumpleaños" 
                                            fill={theme.colors.pink[5]} 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Card>
                    </Stack>
                </Grid.Col>

                {/* COLUMNA DERECHA: Rankings, eventos y comentarios */}
                <Grid.Col span={{ base: 12, lg: 4 }}>
                    <Stack>
                        {/* Top 3 Clientes Activos */}
                        <Card withBorder radius="md" p="md">
                            <Group mb="sm">
                                <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                    <IconStar size="1rem" />
                                </ThemeIcon>
                                <Title order={6}>Top 3 Clientes Activos</Title>
                            </Group>
                            
                            {topClients.length === 0 ? (
                                <Text size="sm" c="dimmed">No hay datos suficientes</Text>
                            ) : (
                                topClients.map((c, idx) => (
                                    <Paper key={c.id} p="sm" mb="xs" withBorder radius="sm">
                                        <Group>
                                            <Avatar size="md" radius="xl" color="blue">
                                                {idx + 1}
                                            </Avatar>
                                            <div style={{ flex: 1 }}>
                                                <Text size="sm" fw={500}>
                                                    {c.nombres} {c.apellidos}
                                                </Text>
                                                <Group gap="xs" mt={4}>
                                                    <Badge size="xs" variant="light" color="blue">
                                                        <IconEye size={10} /> {Math.round(c.total_ar_seconds/60)} min AR
                                                    </Badge>
                                                    <Badge size="xs" variant="light" color="red">
                                                        <IconHeart size={10} /> {c.total_likes}
                                                    </Badge>
                                                    <Badge size="xs" variant="light" color="teal">
                                                        <IconMessage size={10} /> {c.total_comments}
                                                    </Badge>
                                                </Group>
                                            </div>
                                        </Group>
                                    </Paper>
                                ))
                            )}
                        </Card>
                        
                        {/* Top 3 Productos Populares CON FILTROS */}
                        <Card withBorder radius="md" p="md">
                            <Group mb="sm">
                                <ThemeIcon size="md" radius="md" variant="light" color="orange">
                                    <IconTrendingUp size="1rem" />
                                </ThemeIcon>
                                <Title order={6}>Top 3 Productos Populares</Title>
                            </Group>
                            
                            <MultiSelect
                                data={metricsOptions}
                                value={productMetrics}
                                onChange={setProductMetrics}
                                placeholder="Selecciona métricas"
                                label="Filtrar por:"
                                leftSection={<IconFilter size={16} />}
                                mb="md"
                                clearable={false}
                                hidePickedOptions
                            />
                            
                            {loadingProducts ? (
                                <Center h={100}><Loader size="sm" /></Center>
                            ) : filteredTopProducts.length === 0 ? (
                                <Text size="sm" c="dimmed">
                                    {productMetrics.length === 0 
                                        ? 'Selecciona al menos una métrica' 
                                        : 'No hay datos suficientes'}
                                </Text>
                            ) : (
                                filteredTopProducts.map((p, idx) => (
                                    <Paper key={p.id} p="sm" mb="xs" withBorder radius="sm">
                                        <Group>
                                            <Avatar size="md" radius="xl" color="orange">
                                                {idx + 1}
                                            </Avatar>
                                            <div style={{ flex: 1 }}>
                                                <Text size="sm" fw={500}>{p.nombre}</Text>
                                                <Group gap="xs" mt={4}>
                                                    {productMetrics.includes('likes') && (
                                                        <Badge size="xs" variant="light" color="red">
                                                            <IconHeart size={10} /> {p.total_likes}
                                                        </Badge>
                                                    )}
                                                    {productMetrics.includes('ar') && (
                                                        <Badge size="xs" variant="light" color="blue">
                                                            <IconEye size={10} /> {Math.round(p.total_ar_seconds/60)} min
                                                        </Badge>
                                                    )}
                                                    {productMetrics.includes('comments') && (
                                                        <Badge size="xs" variant="light" color="teal">
                                                            <IconMessage size={10} /> {p.total_comments}
                                                        </Badge>
                                                    )}
                                                </Group>
                                            </div>
                                        </Group>
                                    </Paper>
                                ))
                            )}
                        </Card>
                        
                        {/* Comentarios Recientes */}
                        <Card withBorder radius="md" p="md">
                            <Group mb="sm">
                                <ThemeIcon size="md" radius="md" variant="light" color="teal">
                                    <IconMessage size="1rem" />
                                </ThemeIcon>
                                <Title order={6}>Comentarios Recientes</Title>
                            </Group>
                            
                            {recentComments.length === 0 ? (
                                <Text size="sm" c="dimmed">No hay comentarios aún</Text>
                            ) : (
                                <>
                                    {recentComments.map(c => (
                                        <Paper key={c.id} p="xs" radius="sm" withBorder mb="xs">
                                            <Text size="sm" lineClamp={2}>"{c.comentario}"</Text>
                                            <Group justify="space-between" mt={4}>
                                                <Text size="xs" c="dimmed">
                                                    {c.Productos?.nombre || 'Producto'}
                                                </Text>
                                                <Text size="xs" fw={500}>
                                                    - {c.Clientes?.nombres || 'Anónimo'}
                                                </Text>
                                            </Group>
                                        </Paper>
                                    ))}
                                    <Button 
                                        onClick={openAllCommentsModal} 
                                        variant="light" 
                                        size="xs" 
                                        mt="sm" 
                                        fullWidth
                                    >
                                        Ver Todos los Comentarios
                                    </Button>
                                </>
                            )}
                        </Card>
                        
                        {/* Próximos Feriados y Eventos */}
                        <Card withBorder radius="md" p="md">
                            <Group mb="sm">
                                <ThemeIcon size="md" radius="md" variant="light" color="grape">
                                    <IconConfetti size="1rem" />
                                </ThemeIcon>
                                <Title order={6}>Feriados y Eventos 2025</Title>
                            </Group>
                            
                            <ScrollArea h={300}>
                                <List 
                                    spacing="xs" 
                                    size="sm" 
                                    icon={
                                        <ThemeIcon color="grape" size={20} radius="xl">
                                            <IconGift size={12} />
                                        </ThemeIcon>
                                    }
                                >
                                    {holidays.map(h => (
                                        <List.Item key={h.fecha}>
                                            <Group justify="space-between">
                                                <Text size="sm">{h.nombre}</Text>
                                                <Badge size="xs" variant="dot">
                                                    {h.fecha}
                                                </Badge>
                                            </Group>
                                        </List.Item>
                                    ))}
                                </List>
                            </ScrollArea>
                        </Card>
                    </Stack>
                </Grid.Col>
            </Grid>

            {/* MODAL: Todos los Comentarios */}
            <Modal 
                opened={commentsModalOpen} 
                onClose={() => setCommentsModalOpen(false)} 
                title={
                    <Group>
                        <IconMessage />
                        <Title order={4}>Todos los Comentarios</Title>
                    </Group>
                }
                size="xl"
            >
                <ScrollArea h={500}>
                    {allComments.length === 0 ? (
                        <Center h={200}>
                            <Text c="dimmed">No hay comentarios aún</Text>
                        </Center>
                    ) : (
                        allComments.map(c => (
                            <Paper key={c.id} withBorder p="md" mb="sm" radius="md">
                                <Group>
                                    <Avatar size="md" radius="xl" color="blue">
                                        {c.Clientes?.nombres?.[0] || '?'}
                                    </Avatar>
                                    <div>
                                        <Text fw={500}>
                                            {c.Clientes?.nombres || 'Anónimo'} {c.Clientes?.apellidos || ''}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {c.Productos?.nombre || 'Producto desconocido'}
                                        </Text>
                                    </div>
                                </Group>
                                <Text mt="sm">{c.comentario}</Text>
                                <Text mt="xs" size="xs" c="dimmed" ta="right">
                                    {new Date(c.created_at).toLocaleString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </Paper>
                        ))
                    )}
                </ScrollArea>
            </Modal>
        </Container>
    );
}

export default ClientAnalysisPage;