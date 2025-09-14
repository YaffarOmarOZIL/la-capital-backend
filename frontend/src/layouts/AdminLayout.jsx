import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { AppShell, Group, Image, Button, ActionIcon, Menu, Avatar, Text, useMantineColorScheme, Paper, Divider } from '@mantine/core';
import { IconChevronDown, IconUserPlus, IconUsers, IconSun, IconMoonStars, IconLogout, IconUser, IconSettings } from '@tabler/icons-react';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import logo from '../assets/logo-la-capital-cuadrado.png';
import { Link } from 'react-router-dom';

// ---- PEQUEÑOS COMPONENTES PARA MANTENER EL CÓDIGO LIMPIO ----

function DarkModeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  return (
    <ActionIcon variant="default" onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')} size="lg">
      {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
    </ActionIcon>
  );
}

function ProfileMenu({ onLogout }) {
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

function AdminToolsMenu() {
    return (
        <Menu shadow="md" width={200}>
            <Menu.Target>
                <Button variant="subtle" rightSection={<IconChevronDown size={16} />}>
                    Herramientas de Usuario
                </Button>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>Gestión de Personal</Menu.Label>
                <Menu.Item component={NavLink} to="/admin/users" leftSection={<IconUsers size={16} />}>
                    Ver Usuarios
                </Menu.Item>
                <Menu.Item component={NavLink} to="/admin/users/create" leftSection={<IconUserPlus size={16} />}>
                    Crear Nuevo Usuario
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}

// ---- EL COMPONENTE PRINCIPAL DEL LAYOUT ----

function AdminLayout() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

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
    return null; // Muestra una pantalla en blanco mientras se verifica el token
  }

  return (
    <AppShell header={{ height: 'auto' }} padding={0}>
      <AppShell.Header>
        {/* ----- 1. HEADER PRINCIPAL ----- */}
        <Group justify="space-between" h={60} px="md">
          <Group gap="xs"> 
            <Image src={logo} h={30} w="auto" alt="Logo La Capital" /> 
            <Text size="xl" fw={700} c="brand-yellow.5" visibleFrom="xs">La Capital Panel</Text>
             {/* --- 2. NUEVO BOTÓN "DASHBOARD" --- */}
            <Button 
              component={NavLink} 
              to="/admin/dashboard" 
              variant="subtle" 
              color="gray"
            >
              Dashboard
            </Button>
          </Group>
          <Group>
            <DarkModeToggle />
            <ProfileMenu onLogout={handleLogout} />
          </Group>
        </Group>

        {/* ----- 2. SUB-HEADER DE HERRAMIENTAS (CONDICIONAL) ----- */}
        {userRole === 'Administrador' && (
          <>
            <Divider />
            <Paper component={Group} gap="xs" p="xs" shadow="none">
              <AdminToolsMenu />
              {/* Aquí podrías añadir otros menús a futuro */}
            </Paper>
          </>
        )}
      </AppShell.Header>

      <AppShell.Main 
        pt={userRole === 'Administrador' ? 120 : 65} 
        p="md"
      >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default AdminLayout;