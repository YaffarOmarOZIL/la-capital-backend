import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell, Group, Image, ActionIcon, Menu, Avatar, Text, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoonStars, IconLogout, IconUser, IconSettings } from '@tabler/icons-react';
import logo from '../assets/logo-la-capital-cuadrado.png'; // ¡Asegúrate de que esta ruta sea correcta!

function AdminLayout() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header> 
        {/* Usamos justify="space-between" para empujar los elementos a los extremos */}
        <Group justify="space-between" h="100%" px="md">
          
          {/* GRUPO DE LA IZQUIERDA: LOGO Y TÍTULO */}
          <Group gap="xs"> 
            <Image src={logo} h={30} w="auto" alt="Logo La Capital" /> 
            <Text size="xl" fw={700} c="brand-yellow.5" visibleFrom="xs">
              La Capital Panel
            </Text>
          </Group>

          {/* GRUPO DE LA DERECHA: BOTONES DE ACCIÓN */}
          <Group>
            <ActionIcon 
              variant="default" 
              onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
              size="lg"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
            </ActionIcon>

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Avatar color="brand-yellow" radius="xl" style={{ cursor: 'pointer' }}>A</Avatar>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Cuenta</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />}>Ver Perfil</Menu.Item>
                <Menu.Item leftSection={<IconSettings size={14} />}>Cambiar Contraseña</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                  Cerrar Sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default AdminLayout;