import { useState, useEffect } from 'react'; // <--- ¡Asegúrate de importar useEffect!
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Transition } from '@mantine/core';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // Activa la animación cuando el componente carga
  }, []);

  const handleLogin = async (e) => {
  e.preventDefault();
  setError('');

  try {
      const backendUrl = `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`;
      console.log('Intentando conectar con:', backendUrl); // Para depurar
      
      const response = await axios.post(backendUrl, { email, password }); 

      localStorage.setItem('authToken', response.data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error durante el login:', err);
      setError('Credenciales inválidas o error de conexión.');
    }
  };

  return (
    // Fondo de toda la página
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Container size={420} my={40}>
        
        {/* El título está fuera del Paper para que se vea siempre */}
        <Title ta="center" c="brand-yellow.5">
          Acceso Personal
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
          Restaurante La Capital
        </Text>
        
        {/* Aquí la animación envuelve el Paper y su contenido */}
        <Transition mounted={mounted} transition="fade" duration={800} timingFunction="ease">
          {(styles) => (
            <Paper style={styles} withBorder shadow="md" p={30} radius="md">
              {/* ¡EL FORMULARIO VA DENTRO DEL PAPER ANIMADO! */}
              <form onSubmit={handleLogin}>
                <TextInput 
                  label="Email" 
                  placeholder="tu@email.com" 
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required 
                />
                <PasswordInput 
                  label="Contraseña" 
                  placeholder="Tu contraseña" 
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  required 
                  mt="md" 
                />
                {error && <Text c="red" size="sm" ta="center" mt="md">{error}</Text>}
                <Button type="submit" fullWidth mt="xl">
                  Ingresar
                </Button>
              </form>
            </Paper>
          )}
        </Transition>
        
      </Container>
    </div>
  );
}

export default LoginPage;