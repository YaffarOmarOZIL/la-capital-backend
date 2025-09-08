import { Title, Text, Button, Container, ActionIcon, useMantineColorScheme, Group } from '@mantine/core';
import { Link } from 'react-router-dom';
import { IconSun, IconMoonStars } from '@tabler/icons-react';

function DarkModeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
      onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
    >
      {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
    </ActionIcon>
  );
}

function ClientHomePage() {
  return (
    <>
      {/* Botón de modo oscuro en la esquina */}
      <Group justify="flex-end" p="md">
        <DarkModeToggle />
      </Group>

      <Container py="xl" ta="center">
        <Title order={1} mb="md">
          Bienvenido a La Capital
        </Title>
        <Text size="lg" c="dimmed" mb="xl">
          ¡Prepárate para una experiencia única! Próximamente aquí podrás visualizar nuestro menú con Realidad Aumentada.
        </Text>

        <Button 
          component={Link} 
          to="/login" 
          variant="subtle" 
          color="gray"
        >
          Acceso para el personal
        </Button>
      </Container>
    </>
  );
}

export default ClientHomePage;