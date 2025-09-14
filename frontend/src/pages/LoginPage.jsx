import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Importa Link
import axios from 'axios';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Transition, Group, ActionIcon, useMantineColorScheme,  Modal, PinInput } from '@mantine/core';
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
  const [opened, { open, close }] = useDisclosure(false); // Hook para el modal 2FA
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e) => { /* ... tu función handleLogin no cambia ... */
    e.preventDefault();
    setError('');
    try {
      const backendUrl = `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`;
      const response = await axios.post(backendUrl, { email, password });
      if (response.data.twoFactorRequired) {
                // El backend nos pide el código 2FA
                setTempToken(response.data.tempToken);
                open(); // Abrimos el modal
            } else {
                // Login normal
                localStorage.setItem('authToken', response.data.token);
                navigate('/admin/dashboard');
            }
    } catch (err) {
      setError('Credenciales inválidas o error de conexión.');
    }
  };

  const handleVerify2FA = async () => {
        try {
            const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/auth/verify-2fa`;
            const response = await axios.post(apiUrl, { tempToken, twoFactorCode });
            localStorage.setItem('authToken', response.data.token);
            close();
            navigate('/admin/dashboard');
        } catch (err) {
            setError('Código 2FA incorrecto.');
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
      <Modal opened={opened} onClose={close} title="Verificación de Dos Pasos" centered>
                <Text ta="center">Abre tu app de autenticación e ingresa el código de 6 dígitos.</Text>
                <Group justify="center" my="md">
                    <PinInput length={6} value={twoFactorCode} onChange={setTwoFactorCode} />
                </Group>
                <Button onClick={handleVerify2FA} fullWidth>Verificar</Button>
                {error && <Text c="red" size="sm" ta="center" mt="md">{error}</Text>}
      </Modal>
    </div>
  );
}

export default LoginPage;