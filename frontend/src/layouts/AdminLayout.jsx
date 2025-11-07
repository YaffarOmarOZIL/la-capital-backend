import { Outlet, useNavigate, NavLink as RouterNavLink } from 'react-router-dom';
//mantine core
import { AppShell, ScrollArea, Group, Image, ActionIcon, Menu, Avatar, Text, useMantineColorScheme, UnstyledButton, Burger, Stack, NavLink as MantineNavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
//iconos
import { IconSend, IconUserPlus, IconUsers, IconSun, IconMoonStars, IconLogout, IconUser, IconSettings, IconClipboardList, IconLayoutDashboard, IconAddressBook, IconChartBar } from '@tabler/icons-react';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import logo from '../assets/logo-la-capital-cuadrado.png';
import { Link } from 'react-router-dom';

// ---- PEQUEÑOS COMPONENTES (sin cambios) ----

function DarkModeToggle() {
    // ... tu componente sin cambios
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    return (
        <ActionIcon variant="default" onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')} size="lg">
            {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
        </ActionIcon>
    );
}

function ProfileMenu({ onLogout }) {
    // ... tu componente sin cambios
    return (
        <Menu shadow="md" width={200}>
            <Menu.Target>
                <Avatar color="brand-yellow" radius="xl" style={{ cursor: 'pointer' }}>A</Avatar>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>Cuenta</Menu.Label>
                <Menu.Item component={Link} to="/admin/profile" leftSection={<IconUser size={14} />}>Ver Perfil</Menu.Item>
                <Menu.Item component={Link} to="/admin/change-password" leftSection={<IconSettings size={14} />}>Cambiar Contraseña</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={onLogout}>
                    Cerrar Sesión
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}

// ---- ¡NUEVO! ----
// Este es nuestro nuevo componente para los enlaces del menú.
// Combina el estilo de Mantine con el enrutamiento de React Router.
function MenuLink({ to, label, icon, onClick }) {
    return (
        <MantineNavLink
            // --- ¡LA MAGIA ESTÁ AQUÍ! ---
            // 1. Le decimos a Mantine que el componente base será el de React Router.
            component={RouterNavLink}
            // 2. Le pasamos las props que necesita React Router.
            to={to}
            end // <- La propiedad 'end' para que no se marquen varios a la vez.
            // 3. Le pasamos las props que necesita Mantine.
            label={label}
            leftSection={icon}
            onClick={onClick}
            // 4. Nuestros estilos bonitos, pero ahora usando el selector de Mantine
            // para cuando el componente está activo, lo que es más robusto.
            styles={(theme) => ({
                root: {
                    // Estilos para cuando el NavLink está activo (&[data-active])
                    '&[data-active]': {
                        backgroundColor: theme.colors['brand-yellow'][5],
                        color: theme.black, // El texto y el ícono se vuelven negros
                    },
                    '&[data-active]:hover': {
                         backgroundColor: theme.colors['brand-yellow'][6], // Se oscurece un poco al pasar el mouse
                    },
                    // Estilos para cuando NO está activo
                    '&:hover': {
                        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1],
                    }
                }
            })}
        />
    );
}


// ---- EL COMPONENTE PRINCIPAL DEL LAYOUT ----

function AdminLayout() {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState(null);
    // ---- ¡CAMBIO! ----
    // Ahora también sacamos la función 'close' del hook.
    const [opened, { toggle, close }] = useDisclosure();


    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                setUserRole(decodedToken.role || 'Empleado');
            } catch (error) {
                handleLogout();
            }
        } else {
            handleLogout();
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/login');
    };

    if (!userRole) {
        return null;
    }

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 250,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        {userRole === 'Administrador' && (
                            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        )}
                        <UnstyledButton component={Link} to="/admin/dashboard">
                            <Group gap="xs">
                                <Image src={logo} h={30} w="auto" alt="Logo La Capital" />
                                <Text size="xl" fw={700} c="brand-yellow.5" visibleFrom="xs">La Capital</Text>
                            </Group>
                        </UnstyledButton>
                    </Group>
                    <Group>
                        <DarkModeToggle />
                        <ProfileMenu onLogout={handleLogout} />
                    </Group>
                </Group>
            </AppShell.Header>

            {userRole === 'Administrador' && (
                <AppShell.Navbar p={0}>
                  <ScrollArea h="100%">
                    <Stack p="md" gap="sm">
                        {/* --- DASHBOARD --- */}
                        <MenuLink to="/admin/dashboard" label="Dashboard" icon={<IconLayoutDashboard size={16} />} onClick={close} />
                        {/* --- GESTIÓN DE CATÁLOGO --- */}
                        <Text size="xs" tt="uppercase" c="dimmed" fw={700} mt="md">Gestión</Text>
                        <MenuLink to="/admin/products" label="Catálogo de Productos" icon={<IconClipboardList size={16} />} onClick={close} />
                        <MenuLink to="/admin/products/create" label="Añadir Producto" icon={<IconUserPlus size={16} />} onClick={close} />
                        {/* ----- ¡NUEVA SECCIÓN DE CLIENTES! ----- */}
                        <Text size="xs" tt="uppercase" c="dimmed" fw={700} mt="md">Clientes</Text>
                        <MenuLink 
                            to="/admin/clients" // Cambiado para que coincida con la ruta del backend
                            label="Ver Clientes" 
                            icon={<IconAddressBook size={16} />} 
                            onClick={close} 
                        />
                        <MenuLink 
                            to="/admin/clients/create" // Cambiado para que coincida con la ruta del backend
                            label="Añadir Nuevo Cliente" 
                            icon={<IconUserPlus size={16} />} 
                            onClick={close} 
                        />
                        {/* --- BOTONES PARA EL FUTURO (deshabilitados) --- */}
                        <MenuLink 
                            to="/admin/analysis"
                            label="Análisis de Clientela" 
                            icon={<IconChartBar size={16} />} 
                            onClick={close} 
                        />
                        <MenuLink 
                            to="/admin/campaigns"
                            label="Campañas de Marketing"
                            icon={<IconSend size={16} />}
                            onClick={close} // 'close' es la función que cierra el menú, igual que en los otros links
                        />
                        {/* --- GESTIÓN DE PERSONAL --- */}
                        <Text size="xs" tt="uppercase" c="dimmed" fw={700} mt="md">Personal</Text>
                        <MenuLink to="/admin/users" label="Ver Usuarios" icon={<IconUsers size={16} />} onClick={close} />
                        <MenuLink to="/admin/users/create" label="Crear Usuario" icon={<IconUserPlus size={16} />} onClick={close} />
                    </Stack>
                  </ScrollArea>
              </AppShell.Navbar>
            )}

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}

export default AdminLayout;