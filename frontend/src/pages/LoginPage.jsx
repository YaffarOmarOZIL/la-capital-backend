import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Importa Link
import axios from 'axios';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Transition, Group, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoonStars } from '@tabler/icons-react'; // Importa los iconos

function DarkModeToggle() { // Creamos el componente de modo oscuro reutilizable
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

function LoginPage() {
  // ... (toda tu lógica de useState, useEffect, handleLogin se queda exactamente igual) ...
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e) => { /* ... tu función handleLogin no cambia ... */
    e.preventDefault();
    setError('');
    try {
      const backendUrl = `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`;
      const response = await axios.post(backendUrl, { email, password });
      localStorage.setItem('authToken', response.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError('Credenciales inválidas o error de conexión.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Container size={420} my={40}>
        <Title ta="center" c="brand-yellow.5">
          Acceso Personal
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
          Restaurante La Capital
        </Text>
        <Transition mounted={mounted} transition="fade" duration={800} timingFunction="ease">
          {(styles) => (
            <Paper style={styles} withBorder shadow="md" p={30} radius="md">
              <form onSubmit={handleLogin}>
                {/* ... Tus Inputs de Email y Password no cambian ... */}
                <TextInput label="Email" /* ... */ onChange={(event) => setEmail(event.currentTarget.value)} required />
                <PasswordInput label="Contraseña" /* ... */ onChange={(event) => setPassword(event.currentTarget.value)} required mt="md" />
                
                {error && <Text c="red" size="sm" ta="center" mt="md">{error}</Text>}

                {/* --- AÑADIMOS LOS NUEVOS BOTONES AQUÍ --- */}
                <Group justify="space-between" mt="xl">
                  <Button component={Link} to="/" variant="subtle" color="gray">
                    ← Volver
                  </Button>
                  <Button type="submit">
                    Ingresar
                  </Button>
                </Group>
              </form>
            </Paper>
          )}
        </Transition>
        <Group justify="center" mt="md">
            <DarkModeToggle />
        </Group>
      </Container>
    </div>
  );
}

export default LoginPage;