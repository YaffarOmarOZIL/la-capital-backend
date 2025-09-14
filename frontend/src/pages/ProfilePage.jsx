// src/pages/ProfilePage.jsx - VERSIÓN FINAL Y ROBUSTA

import { useState, useEffect } from 'react';
import { Title, TextInput, Button, Paper, Group, Alert, Loader, Stack, Center, Text, Image, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import axios from 'axios';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

function ProfilePage() {
  // Inicializamos el estado como NULL. Esta es nuestra bandera para saber si ya tenemos datos.
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Un estado para errores de carga inicial, y otro para errores de *acciones*
  const [initialLoadError, setInitialLoadError] = useState(''); 
  const [actionError, setActionError] = useState(''); 
  const [actionSuccess, setActionSuccess] = useState('');

  // --- ESTADO Y LÓGICA PARA 2FA ---
  const [opened, { open, close }] = useDisclosure(false); // Hook para el modal
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');

  // Usamos useEffect para cargar los datos del perfil de forma segura
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true); // Empezamos a cargar
      const token = localStorage.getItem('authToken');
      if (!token) {
        setInitialLoadError("Error de autenticación. Por favor, inicia sesión de nuevo.");
        setLoading(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users/me`;
      try {
        const response = await axios.get(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        setFormData(response.data); // ¡Guardamos los datos!
      } catch (err) {
        setInitialLoadError('No se pudieron cargar los datos del perfil desde el servidor.');
      } finally {
        setLoading(false); // Terminamos de cargar, haya éxito o no
      }
    };
    fetchProfile();
  }, []); // El array vacío [] asegura que esto se ejecute solo una vez

  // --- El resto de funciones (handleChange, handleSubmit) no necesitan cambios ---
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdateError('');
    setUpdateSuccess(''); 
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users/me`;
      await axios.put(apiUrl, formData, { headers: { 'Authorization': `Bearer ${token}` }});
      setSuccess('¡Perfil actualizado correctamente!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar.');
    } finally {
      setLoading(false);
    }
  };

  // --- Función para iniciar el setup de 2FA ---
  const handleSetup2FA = async () => {
    const token = localStorage.getItem('authToken');
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/2fa/setup`;
    try {
      const response = await axios.post(apiUrl, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSecret(response.data.secret);
      setQrCode(response.data.qrCodeUrl);
      open(); // ¡Abre el modal!
    } catch (err) {
      setError('No se pudo iniciar la configuración de 2FA.');
    }
  };

  // --- Función para verificar y activar 2FA ---
  const handleVerify2FA = async () => {
    setTwoFactorError('');
    const token = localStorage.getItem('authToken');
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/2fa/verify`;
    try {
      const response = await axios.post(apiUrl, 
        { secret: secret, token: verificationToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.verified) {
        alert('¡2FA activado con éxito!');
        close();
        // Opcional: recargar la página para mostrar "2FA activado"
        window.location.reload();
      }
    } catch (err) {
        setTwoFactorError(err.response?.data?.message || 'Error al verificar.');
    }
  };

  const handleDisable2FA = async () => {
    if (window.confirm('¿Estás seguro de que quieres desactivar la autenticación de dos pasos?')) {
      setActionError(''); setActionSuccess(''); setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/2fa/disable`;
        await axios.post(apiUrl, {}, { headers: { Authorization: `Bearer ${token}` } });
        alert('¡2FA desactivado con éxito!');
        window.location.reload();
      } catch (err) {
        setActionError(err.response?.data?.message || 'Error al desactivar 2FA.');
      } finally { setLoading(false); }
    }
  };

  // ----- ¡LA MAGIA ESTÁ AQUÍ! RENDERIZADO CONDICIONAL -----

  // 1. Mientras `loading` sea true, mostramos un spinner
  if (loading) {
    return (
      <Center h={200}>
        <Loader color="brand-yellow" />
      </Center>
    );
  }

  // 2. Si hubo un error y NO tenemos datos (`formData` sigue siendo `null`), mostramos el error
  if (error && !formData) {
    return (
      <Alert icon={<IconAlertCircle size="1rem" />} title="Error Crítico" color="red">
        {error}
      </Alert>
    );
  }

  // 3. Si todo lo anterior pasó, significa que `formData` SÍ tiene datos y podemos renderizar el formulario
  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} mb="md">Mi Perfil</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          {/* El `|| ''` es una última capa de seguridad por si algún campo viene nulo */}
          <TextInput
            name="nombre_completo"
            label="Nombre Completo"
            value={formData?.nombre_completo || ''}
            onChange={handleChange}
            required
          />
          <TextInput
            name="email"
            type="email"
            label="Email"
            value={formData?.email || ''}
            onChange={handleChange}
            required
          />
        </Stack>

        {/* Solo mostramos errores/éxito relacionados a la actualización, no a la carga */}
        {actionError && <Alert color="red" title="Error" mt="md">{actionError}</Alert>}
        {actionSuccess && <Alert color="green" title="Éxito" icon={<IconCheck />} mt="md">{actionSuccess}</Alert>}
        
        <Group justify="flex-end" mt="xl">
          <Button type="submit" loading={loading}>Guardar Cambios</Button>
        </Group>
      </form>
      
      {/* --- SECCIÓN DE 2FA ACTUALIZADA --- */}
        <Title order={3} mt="xl" pt="xl" style={{ borderTop: '1px solid #e0e0e0' }}>Autenticación de Dos Pasos (2FA)</Title>
        <Text c="dimmed">Activa una capa extra de seguridad para tu cuenta usando una app como Google Authenticator.</Text>
        {/* --- AQUÍ ESTÁ EL FEEDBACK --- */}
        {formData?.is_two_factor_enabled ? (
            <Alert color="green" title="2FA Activado">
                Tu cuenta está protegida con un segundo factor de autenticación. <br></br>
                <Button mt="sm" variant="outline" color="red" onClick={handleDisable2FA} loading={loading}>
              Desactivar 2FA
            </Button>
            </Alert>
        ) : (
            <>
                <Text c="dimmed">Activa una capa extra de seguridad para tu cuenta.</Text>
                <Button mt="md" onClick={handleSetup2FA}>Activar 2FA</Button>
            </>
        )}
    
        {/* --- EL MODAL DE CONFIGURACIÓN DE 2FA --- */}
        <Modal opened={opened} onClose={close} title="Configurar Autenticación de Dos Pasos" size="lg">
            <Stack>
                <Text>1. Escanea este código QR con tu aplicación de autenticación (Google Authenticator, Authy, etc.).</Text>
                <Center>
                    <Image src={qrCode} alt="QR Code para 2FA" w="auto" maw={250} />
                </Center>
                <Text>2. Ingresa el código de 6 dígitos que aparece en tu aplicación para verificar y completar la activación.</Text>
                <TextInput 
                    label="Código de Verificación"
                    placeholder="123456"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.currentTarget.value)}
                />
                {twoFactorError && <Text c="red" size="sm">{twoFactorError}</Text>}
                <Button onClick={handleVerify2FA}>Verificar y Activar</Button>
            </Stack>
        </Modal>
    </Paper>
  );
}

export default ProfilePage;