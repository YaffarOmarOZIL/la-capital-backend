import { Title, Text, Button, Container } from '@mantine/core';
import { Link } from 'react-router-dom';

function ClientHomePage() {
  return (
    <Container py="xl" ta="center">
      <Title order={1} mb="md">
        Bienvenido a La Capital
      </Title>
      <Text size="lg" c="dimmed" mb="xl">
        ¡Prepárate para una experiencia única! Próximamente aquí podrás visualizar nuestro menú con Realidad Aumentada.
      </Text>

      {/* Botón sutil para el acceso del personal */}
      <Button 
        component={Link} 
        to="/login" 
        variant="subtle" 
        color="gray"
      >
        Acceso para el personal
      </Button>
    </Container>
  );
}

export default ClientHomePage;