// --- ARCHIVO COMPLETO MEJORADO: frontend/src/pages/ClientExperiencePage.jsx ---

import { useState, useEffect } from 'react';
import axios from 'axios';
import { AppShell, Burger, Group, Button, Title, Text, Container, SimpleGrid, Card, Image, AspectRatio, Badge, ActionIcon, Accordion, Textarea, Stack, Avatar, Paper, useMantineColorScheme, Modal, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useClientAuth } from '../hooks/useClientAuth';
import { Link } from 'react-scroll';
import { IconLogout, IconScan, IconHeart, IconHeartFilled, IconMessageCircle2, IconSun, IconMoonStars } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Link as RouterLink, useNavigate  } from 'react-router-dom';

// --- Sub-componente para el botón de Like ---
function LikeButton({ productId, currentLikes, clientLikes, onLikeToggle }) {
    const isLiked = clientLikes.includes(productId);
    //const [likeCount, setLikeCount] = useState(currentLikes);

    const handleClick = () => {
        //setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
        onLikeToggle(productId, isLiked);
    };

    return (
        <Group gap="xs">
            <ActionIcon variant="transparent" color={isLiked ? "red" : "gray"} onClick={handleClick}>
                {isLiked ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
            </ActionIcon>
            <Text size="sm" c="dimmed">{currentLikes}</Text>
        </Group>
    );
}

// --- Sub-componente para los Comentarios ---
function CommentSection({ product, onCommentSubmit }) {
    const [newComment, setNewComment] = useState("");
    const [modalOpened, setModalOpened] = useState(false);
    const [allComments, setAllComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);

    const loadAllComments = async () => {
        setLoadingComments(true);
        try {
            const { data } = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/api/products/${product.id}/all-comments`
            );
            setAllComments(data);
            setModalOpened(true);
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los comentarios.',
                color: 'red'
            });
        }
        setLoadingComments(false);
    };

    return (
        <>
            {/* Modal para ver todos los comentarios */}
            <Modal
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                title={`Todos los comentarios de ${product.nombre}`}
                size="lg"
                centered
            >
                <ScrollArea h={400}>
                    <Stack gap="sm">
                        {allComments.length > 0 ? (
                            allComments.map(comment => (
                                <Paper withBorder p="md" radius="sm" key={comment.id}>
                                    <Group align="flex-start">
                                        <Avatar size="md" radius="xl" color="cyan">
                                            {comment.Clientes?.nombres?.[0] || '?'}
                                        </Avatar>
                                        <div style={{ flex: 1 }}>
                                            <Text size="sm" fw={700}>
                                                {comment.Clientes?.nombres} {comment.Clientes?.apellidos}
                                            </Text>
                                            <Text size="sm" mt="xs">{comment.comentario}</Text>
                                            <Text size="xs" c="dimmed" mt="xs">
                                                {new Date(comment.created_at).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Text>
                                        </div>
                                    </Group>
                                </Paper>
                            ))
                        ) : (
                            <Text ta="center" c="dimmed">No hay comentarios aún.</Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Modal>

            {/* Accordion normal */}
            <Accordion variant="separated" radius="md" mt="md">
                <Accordion.Item value="comments">
                    <Accordion.Control icon={<IconMessageCircle2 size={20}/>}>
                        <Group justify="space-between" wrap="nowrap">
                            <Text size="sm">Comentarios ({product.totalComments || 0})</Text>
                            {product.totalComments > 5 && (
                                <Badge size="xs" color="gray" variant="light">
                                    Mostrando 5 de {product.totalComments}
                                </Badge>
                            )}
                        </Group>
                    </Accordion.Control>
                    
                    <Accordion.Panel>
                        <Stack>
                            <Textarea 
                                placeholder="Escribe tu opinión sobre este plato..." 
                                minRows={2}
                                value={newComment}
                                onChange={(e) => setNewComment(e.currentTarget.value)}
                            />
                            <Button 
                                onClick={() => onCommentSubmit(product.id, newComment, () => setNewComment(""))} 
                                size="xs" 
                                w="100%"
                            >
                                Publicar Comentario
                            </Button>
                            
                            {product.ProductComments?.map(comment => (
                                <Paper withBorder p="xs" radius="sm" key={comment.id}>
                                    <Group align="flex-start">
                                        <Avatar size="sm" radius="xl" color="cyan">
                                            {comment.Clientes?.nombres?.[0] || '?'}
                                        </Avatar>
                                        <div style={{ flex: 1 }}>
                                            <Text size="xs" fw={700}>
                                                {comment.Clientes?.nombres} {comment.Clientes?.apellidos}
                                            </Text>
                                            <Text size="sm">{comment.comentario}</Text>
                                            <Text size="xs" c="dimmed">
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </Text>
                                        </div>
                                    </Group>
                                </Paper>
                            ))}

                            {/* Mensaje cuando no hay comentarios */}
                            {(!product.ProductComments || product.ProductComments.length === 0) && (
                                <Text size="sm" c="dimmed" ta="center">
                                    Sé el primero en comentar sobre este plato 🍔
                                </Text>
                            )}

                            {/* Botón para ver todos los comentarios */}
                            {product.totalComments > 5 && (
                                <Button
                                    variant="subtle"
                                    size="xs"
                                    fullWidth
                                    onClick={loadAllComments}
                                    loading={loadingComments}
                                >
                                    Ver todos los comentarios ({product.totalComments})
                                </Button>
                            )}
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </>
    );
}

function ClientExperiencePage() {
    const { client, logout } = useClientAuth();
    const [opened, { toggle, close }] = useDisclosure();
    const [menu, setMenu] = useState([]);
    const [clientLikes, setClientLikes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const navigate = useNavigate();

    // Dentro del cuerpo de tu componente ClientExperiencePage
const handleNavigateToAR = (productId) => {
    console.log('[DEBUG] Preparando para entrar a AR. Guardando tiempo de inicio...');
    // Guardamos la hora actual en localStorage. El .toString() es buena práctica.
    localStorage.setItem('ar_start_time', Date.now().toString());
    
    // Navegamos manualmente usando el hook
    navigate(`/ar-viewer/${productId}`);
};
    
    const arProducts = menu.filter(p => p.ActivosDigitales?.url_modelo_3d);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('clientAuthToken'); 
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const menuRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products/public/menu`);

                let likesData = [];
                if (token) {
                    try {
                        const likesRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products/likes`, { headers });
                        likesData = likesRes.data;
                    } catch (err) {
                        console.log('No se pudieron cargar los likes');
                    }
                }

                setMenu(menuRes.data);
                setClientLikes(likesData);

            } catch (error) { 
                console.error("Error cargando datos:", error.response?.data || error.message); 
                notifications.show({
                    title: 'Error de Red',
                    message: error.response?.data?.message || 'No se pudo cargar la información.',
                    color: 'red'
                });
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleLikeToggle = async (productId, isCurrentlyLiked) => {
        setMenu(currentMenu => 
            currentMenu.map(product => {
                if (product.id === productId) {
                    const currentCount = product.ProductLikes[0]?.count || 0;
                    const newCount = isCurrentlyLiked ? currentCount - 1 : currentCount + 1;
                    // Devolvemos el producto modificado con el nuevo contador
                    return { 
                        ...product, 
                        ProductLikes: [{ count: newCount }] 
                    };
                }
                return product; // Devolvemos los otros productos sin cambios
            })
        );
        const originalLikes = [...clientLikes];
        const newLikes = isCurrentlyLiked 
            ? clientLikes.filter(id => id !== productId)
            : [...clientLikes, productId];
        setClientLikes(newLikes);
        
        try {
            const token = localStorage.getItem('clientAuthToken');
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/like`, 
                {}, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            setClientLikes(originalLikes);
            notifications.show({ 
                title: 'Error', 
                message: 'No se pudo guardar tu like.', 
                color: 'red' 
            });
        }
    };
    
    const handleCommentSubmit = async (productId, comment, onSuccess) => {
        if (!comment.trim()) {
            notifications.show({ 
                title: 'Aviso', 
                message: 'El comentario no puede estar vacío.', 
                color: 'orange' 
            });
            return;
        }

        try {
            const token = localStorage.getItem('clientAuthToken');
            const { data: newComment } = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/comment`, 
                { comentario: comment }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setMenu(currentMenu => currentMenu.map(product => 
                product.id === productId 
                    ? { ...product, ProductComments: [newComment, ...(product.ProductComments || [])] } 
                    : product
            ));
            onSuccess();
            notifications.show({ 
                title: '¡Gracias!', 
                message: 'Tu comentario ha sido publicado.', 
                color: 'green' 
            });
        } catch(error) {
            notifications.show({ 
                title: 'Error', 
                message: 'No se pudo publicar tu comentario.', 
                color: 'red' 
            });
        }
    };

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Title order={4}>La Capital</Title>
                    </Group>
                    {/* Botones para desktop */}
                    <Group visibleFrom="sm">
                        <Text size="sm">¡Hola, {client?.nombre || 'Capitalover'}!</Text>
                        <ActionIcon 
                            variant="default" 
                            onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')} 
                            size="lg"
                        >
                            {colorScheme === 'dark' ? <IconSun size="1rem" /> : <IconMoonStars size="1rem" />}
                        </ActionIcon>
                        <Button 
                            onClick={logout} 
                            variant="light" 
                            color="red" 
                            size="xs" 
                            leftSection={<IconLogout size={14}/>}
                        >
                            Cerrar Sesión
                        </Button>
                    </Group>
                    {/* Solo Burger para móvil */}
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <Stack>
                    <Text fw={500}>Navegación Rápida</Text>
                    <Button 
                        component={Link} 
                        to="menu-section" 
                        spy={true} 
                        smooth={true} 
                        duration={500} 
                        variant="subtle" 
                        fullWidth 
                        justify="start" 
                        onClick={close}
                    >
                        Ver Menú
                    </Button>
                    <Button 
                        component={Link} 
                        to="ar-section" 
                        spy={true} 
                        smooth={true} 
                        duration={500} 
                        variant="subtle" 
                        leftSection={<IconScan size={16}/>} 
                        fullWidth 
                        justify="start" 
                        onClick={close}
                    >
                        Experiencia AR
                    </Button>
                    
                    {/* Botones móviles en el navbar */}
                    <Stack hiddenFrom="sm" mt="xl" gap="xs">
                        <Text size="sm" c="dimmed">Usuario: {client?.nombre || 'Capitalover'}</Text>
                        <Button 
                            variant="default" 
                            onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')} 
                            fullWidth
                            leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoonStars size={16} />}
                        >
                            {colorScheme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                        </Button>
                        <Button 
                            onClick={() => { logout(); close(); }} 
                            variant="light" 
                            color="red" 
                            fullWidth
                            leftSection={<IconLogout size={16}/>}
                        >
                            Cerrar Sesión
                        </Button>
                    </Stack>
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                <Container>
                    {loading ? (
                        <Text ta="center" mt="xl">Cargando menú...</Text>
                    ) : (
                        <>
                            <div id="menu-section" style={{ paddingTop: '20px', marginTop: '-20px' }}>
                                <Title order={2}>Nuestro Menú</Title>
                                <Text c="dimmed">Explora nuestros platos, deja tus comentarios y marca tus favoritos.</Text>
                                
                                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mt="xl">
                                    {menu.map(product => (
                                        <Card key={product.id} shadow="sm" padding="lg" radius="md" withBorder>
                                            <Card.Section>
                                                <Image 
                                                    src={product.ActivosDigitales?.urls_imagenes?.frente} 
                                                    height={180} 
                                                    alt={product.nombre}
                                                    fallbackSrc="https://placehold.co/600x400?text=Sin+Imagen"
                                                />
                                            </Card.Section>
                                            <Group justify="space-between" mt="md">
                                                <Text fw={500}>{product.nombre}</Text>
                                                <Badge color="yellow" variant="light">{product.categoria}</Badge>
                                            </Group>
                                            <Text size="sm" c="dimmed" mt="xs">{product.descripcion}</Text>
                                            <Group justify="space-between" mt="md">
                                                <Text fw={700}>{product.precio} Bs.</Text>
                                                <LikeButton 
                                                    productId={product.id} 
                                                    currentLikes={product.ProductLikes?.[0]?.count || 0} 
                                                    clientLikes={clientLikes} 
                                                    onLikeToggle={handleLikeToggle} 
                                                />
                                            </Group>
                                            <CommentSection product={product} onCommentSubmit={handleCommentSubmit} />
                                        </Card>
                                    ))}
                                </SimpleGrid>
                            </div>
                            
                            {arProducts.length > 0 && (
                                <>
                                    <Stack align="center" my={50}>
                                        <Title order={3}>Experiencia de Realidad Aumentada</Title>
                                        <Text c="dimmed">Ve cómo se verían estos platos en tu mesa</Text>
                                    </Stack>
                                    
                                    <div id="ar-section" style={{ paddingTop: '20px', marginTop: '-20px' }}>
                                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                                            {arProducts.map((product) => (
                                                <Card key={`ar-${product.id}`} shadow="sm" padding="lg" radius="md" withBorder>
                                                    <Card.Section>
                                                        <AspectRatio ratio={16 / 9}>
                                                            <Image 
                                                                src={product.ActivosDigitales?.urls_imagenes?.perspectiva} 
                                                                alt={product.nombre}
                                                                fallbackSrc="https://placehold.co/600x400?text=Sin+Imagen"
                                                            />
                                                        </AspectRatio>
                                                    </Card.Section>
                                                    <Group justify="space-between" mt="md" mb="xs">
                                                        <Text fw={500}>{product.nombre}</Text>
                                                        <LikeButton 
                                                            productId={product.id} 
                                                            currentLikes={product.ProductLikes?.[0]?.count || 0}
                                                            clientLikes={clientLikes} 
                                                            onLikeToggle={handleLikeToggle} 
                                                        />
                                                    </Group>
                                                    <Text size="sm" c="dimmed">{product.descripcion}</Text>
                                                    <Button 
                                                        onClick={() => handleNavigateToAR(product.id)} // <--- El cambio principal está aquí
                                                        fullWidth 
                                                        mt="md" 
                                                        radius="md" 
                                                        leftSection={<IconScan size={16}/>}
                                                    >
                                                        Ver en mi mesa
                                                    </Button>
                                                </Card>
                                            ))}
                                        </SimpleGrid>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}

export default ClientExperiencePage;