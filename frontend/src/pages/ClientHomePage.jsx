// En src/pages/ClientHomePage.jsx (Versión Final Elegante)

import { Title, Text, Button, Container, ActionIcon, useMantineColorScheme, Group, Paper, Stack, SimpleGrid, Image, ThemeIcon, List, ListItem, Box } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import { IconSun, IconMoonStars, IconScan, IconStar, IconMessageCircle, IconChevronRight } from '@tabler/icons-react';
import classes from './ClientHomePage.module.css';
import { Burger, Drawer } from '@mantine/core'; // Para el menú móvil
import { useDisclosure } from '@mantine/hooks';  // El hook que lo controla
import hamburguesaFoto1 from '../assets/hamburguesa_foto_1.jpg'; // Horizontal
import hamburguesaFoto2 from '../assets/hamburguesa_foto_2.jpg'; // Horizontal
import hamburguesaFoto3 from '../assets/hamburguesa_foto_3.jpg'; // Vertical
import hamburguesaFoto4 from '../assets/hamburguesa_foto_4.jpg'; // Vertical
import hamburguesaFoto5 from '../assets/hamburguesa_foto_5.jpg'; // Vertical

// --- PEQUEÑOS COMPONENTES PARA MANTENER TODO ORDENADO ---
function Header() {
    const navigate = useNavigate();
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const [opened, { open, close }] = useDisclosure(false);

    const headerBg = colorScheme === 'dark' 
        ? 'rgba(0, 0, 0, 0.7)' 
        : 'rgba(30, 30, 30, 0.8)'; // Oscuro también en modo claro para la foto

    const textColor = 'white';

    return (
      <>
        <header className={classes.header} style={{ backgroundColor: headerBg, backdropFilter: 'blur(10px)' }}>
            <Container size="lg" className={classes.headerInner}>
                <Text fw={700} c={textColor}>La Capital</Text>
                {/* ----- GRUPO DE BOTONES PARA ESCRITORIO ----- */}
                    {/* 'visibleFrom="sm"' significa que solo se ve en pantallas 'small' y más grandes */}
                    <Group visibleFrom="sm">
                        <Button variant="default" size="xs" onClick={() => navigate('/login-cliente')}>Iniciar Sesión</Button>
                        <Button size="xs" onClick={() => navigate('/registro-cliente')}>Crear Cuenta</Button>
                        <ActionIcon variant="default" onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')} size="lg">
                            {colorScheme === 'dark' ? <IconSun size="1rem" /> : <IconMoonStars size="1rem" />}
                        </ActionIcon>
                    </Group>
                    
                    {/* ----- ICONO DE HAMBURGUESA PARA MÓVIL ----- */}
                    {/* 'hiddenFrom="sm"' significa que se esconde en pantallas 'small' y más grandes */}
                    <Burger opened={opened} onClick={open} hiddenFrom="sm" size="sm" color='white'/>
            </Container>
        </header>
        {/* ----- EL MENÚ DESPLEGABLE QUE SE ABRE AL HACER CLIC EN LA HAMBURGUESA ----- */}
            <Drawer opened={opened} onClose={close} title="Menú" position="right" size="xs">
                <Stack>
                    <Button variant="light" onClick={() => { navigate('/login-cliente'); close(); }}>Iniciar Sesión</Button>
                    <Button onClick={() => { navigate('/registro-cliente'); close(); }}>Crear Cuenta</Button>
                    <ActionIcon variant="default" onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')} size="lg">
                        {colorScheme === 'dark' ? <IconSun size="1rem" /> : <IconMoonStars size="1rem" />}
                    </ActionIcon>
                </Stack>
            </Drawer>
            </>
    );
}

function Footer() {
    return (
        <footer className={classes.footer}>
            <Container size="lg">
                <Group justify="space-between" align="center">
                    {/* El texto de copyright no cambia */}
                    <Text size="sm" c="dimmed">
                        &copy; {new Date().getFullYear()} La Capital. Todos los derechos reservados.
                    </Text>
                    
                    {/* ----- ¡AQUÍ ESTÁ TU NUEVO BOTÓN DISCRETO! ----- */}
                    <Button
                        component={Link}
                        to="/login"
                        variant="subtle"  // <-- La magia: parece texto, pero es un botón.
                        color="#787878"      // <-- Asegura que tenga el color de texto 'dimmed'.
                        size="sm"
                        styles={{ 
                            // Quita el padding para que se vea aún más como texto normal
                            root: { paddingLeft: 0, paddingRight: 0 } 
                        }} 
                    >
                        Acceso para el personal
                    </Button>
                </Group>
            </Container>
        </footer>
    );
}

// --- EL COMPONENTE PRINCIPAL DE LA PÁGINA ---
function ClientHomePage() {
    const navigate = useNavigate();
    return (
        <>
            <Header />
            <div className={classes.wrapper}>
                {/* --- SECCIÓN 1: EL BANNER PRINCIPAL (HERO) --- */}
                <Box className={classes.hero} style={{ backgroundImage: `url(${hamburguesaFoto1})` }}>
                    <div className={classes.heroOverlay} />
                    <Container size="md" className={classes.heroContent}>
                        <Title className={classes.heroTitle}>Donde Cada Hamburguesa es una Obra de Arte</Title>
                        <Text className={classes.heroSubtitle} mt="md">Y ahora, puedes verla en tu propia mesa antes de pedirla. Bienvenido a la nueva era de La Capital.</Text>
                        <Button size="xl" mt="xl" onClick={() => document.getElementById('ar-section').scrollIntoView({ behavior: 'smooth' })}>
                            Descubre la Magia
                        </Button>
                    </Container>
                </Box>

                {/* --- SECCIÓN 2: CALIDAD DE PRODUCTOS --- */}
                <Container size="lg" py="xl" my="xl">
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" verticalSpacing={50}>
                        <Image src={hamburguesaFoto3} radius="md" />
                        <Stack justify="center">
                            <Title order={2}>La Pasión por lo Auténtico</Title>
                            <Text c="dimmed">
                                En "La Capital", no solo hacemos hamburguesas. Creamos experiencias. Cada ingrediente es seleccionado por su calidad y frescura, combinando recetas tradicionales con un toque de innovación que nos caracteriza.
                            </Text>
                        </Stack>
                    </SimpleGrid>
                </Container>
                
                {/* --- SECCIÓN 3: CÓMO FUNCIONA LA AR --- */}
                <Paper id="ar-section" withBorder radius="md" shadow="lg" p="xl" my="xl">
                    <Container size="lg">
                        <Group justify="center">
                            <ThemeIcon size={80} radius={80} c="brand-yellow.5" variant="transparent">🍔</ThemeIcon>
                        </Group>
                        <Title order={2} ta="center" mt="md">Una Experiencia Única te Espera</Title>
                        <Text c="dimmed" ta="center" maw={600} mx="auto" mt="md" mb="xl">
                            Hemos creado una herramienta para que te enamores de nuestros platos incluso antes de probarlos. Es fácil, rápido y divertido. ¡Así funciona!
                        </Text>
                        <List spacing="xl" center>
                            <ListItem icon={<ThemeIcon color="brand-yellow.5" size={40} radius="xl"><IconScan /></ThemeIcon>}>
                                <Text fw={700}>1. Escanea el QR</Text>
                                <Text c="dimmed">Crea tu cuenta, inicia sesión y busca el código QR en tu mesa para activar la cámara de tu celular.</Text>
                            </ListItem>
                            <ListItem icon={<ThemeIcon color="brand-yellow.5" size={40} radius="xl"><IconStar /></ThemeIcon>}>
                                <Text fw={700}>2. Visualiza y Decide</Text>
                                <Text c="dimmed">Apunta a tu mesa y mira cómo nuestros platos aparecen en Realidad Aumentada. ¡Juega con ellos!</Text>
                            </ListItem>
                            <ListItem icon={<ThemeIcon color="brand-yellow.5" size={40} radius="xl"><IconMessageCircle /></ThemeIcon>}>
                                <Text fw={700}>3. Califica y Comparte</Text>
                                <Text c="dimmed">Después de disfrutar tu plato, podrás dejar tu opinión y ayudar a otros a elegir su próxima hamburguesa favorita.</Text>
                            </ListItem>
                        </List>
                    </Container>
                </Paper>
                
                {/* --- SECCIÓN 4: CALL TO ACTION FINAL --- */}
                <Container size="lg" py="xl" my="xl" ta="center">
                    <Title order={2}>¿Listo para Probarlo?</Title>
                    <Text maw={500} mx="auto" c="dimmed" mt="md" mb="xl">Crea tu cuenta gratis para guardar tus favoritos, recibir promociones y ser el primero en probar nuestras nuevas creaciones.</Text>
                    <Group justify="center">
                        <Button size="lg" onClick={() => navigate('/registro-cliente')}>Únete a la Familia de La Capital</Button>
                    </Group>
                </Container>

            </div>
            <Footer />
        </>
    );
}

export default ClientHomePage;