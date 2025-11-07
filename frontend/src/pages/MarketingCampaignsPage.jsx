// --- ARCHIVO COMPLETO: frontend/src/pages/MarketingCampaignsPage.jsx ---

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Title, Text, Tabs, Group, Avatar, Button, Paper, FileButton, Image, Alert, Loader, Stack, Box, TextInput, Badge, useMantineColorScheme, SimpleGrid } from '@mantine/core';
import { IconCake, IconSend, IconDiscount2, IconInfoCircle, IconPhotoUp, IconSearch, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useEditor } from '@tiptap/react';
import { RichTextEditor } from '@mantine/tiptap';
import StarterKit from '@tiptap/starter-kit';
import '@mantine/tiptap/styles.css';
import { modals } from '@mantine/modals';

// --- Función Helper para copiar imagen al portapapeles ---
async function copyImageToClipboard(imageUrl) {
    if (!imageUrl) return false;
    
    if (!navigator.clipboard?.write) {
        console.warn('Clipboard API no disponible');
        return false;
    }
    
    try {
        const response = await fetch(imageUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('Error al cargar la imagen');
        
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        
        return true;
    } catch (error) {
        console.error("Fallo al copiar imagen al portapapeles:", error);
        return false;
    }
}

// --- Componente Reutilizable del Editor ---
function CampaignEditor({ campaignKey, settings, onSave, onImageUpload }) {
    const [imageKey, setImageKey] = useState(Date.now()); // Para forzar re-render de la imagen
    
    const editor = useEditor({
        extensions: [StarterKit],
        content: settings?.message || '',
    });
    
    useEffect(() => {
        // Actualizar el key cuando cambie la URL de la imagen
        if (settings?.imageUrl) {
            setImageKey(Date.now());
        }
    }, [settings?.imageUrl]);
    
    if (!editor) {
        return <Loader size="sm" />;
    }

    return (
        <Stack>
            <Text fw={500}>1. Diseña tu Campaña</Text>
            <RichTextEditor editor={editor}>
                <RichTextEditor.Toolbar sticky stickyOffset={60}>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Strikethrough />
                    </RichTextEditor.ControlsGroup>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Link />
                        <RichTextEditor.Unlink />
                    </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>
                <RichTextEditor.Content />
            </RichTextEditor>
            <Group justify="space-between" mt="sm">
                <Button size="xs" variant="light" onClick={() => editor.chain().focus().insertContent(' [Nombre]').run()}>[Nombre]</Button>
                <Button size="xs" variant="light" onClick={() => editor.chain().focus().insertContent(' [Apellido]').run()}>[Apellido]</Button>
                <Button onClick={() => onSave(campaignKey, editor.getHTML())}>Guardar Mensaje</Button>
            </Group>

            <FileButton onChange={(file) => onImageUpload(campaignKey, file)} accept="image/png,image/jpeg">
                {(props) => <Button {...props} variant="default" leftSection={<IconPhotoUp size={16}/>} mt="md">Adjuntar Imagen de Campaña</Button>}
            </FileButton>

            {settings?.imageUrl && (
                <Paper withBorder p="sm" mt="xs">
                    <Text size="xs" c="dimmed" mb="xs">Imagen de la campaña:</Text>
                    <Image 
                        key={imageKey} // Forzar re-render cuando cambia
                        src={`${settings.imageUrl}?t=${imageKey}`} // Cache-busting
                        maw={200} 
                        mx="auto" 
                        radius="md" 
                    />
                    <Alert icon={<IconInfoCircle size={16}/>} color="blue" mt="xs" variant="light">
                        <Text size="xs">Al enviar mensajes, la imagen se copiará automáticamente. Solo pégala (Ctrl+V) en WhatsApp.</Text>
                    </Alert>
                </Paper>
            )}
        </Stack>
    );
}

// --- Componente para las campañas (unificado) ---
function CampaignSender({ clients, campaignKey, settings, sentToday }) {
    const [cooldown, setCooldown] = useState(0);
    const { colorScheme } = useMantineColorScheme();

    const handleSendMessage = async (cliente) => {
        console.log('Cliente a enviar:', cliente.id);
        console.log('Enviados hoy:', sentToday);
        console.log('¿Ya enviado?:', sentToday.includes(cliente.id));
        
        if (cooldown > 0) {
            notifications.show({ 
                title: 'Pausa Anti-Spam', 
                message: `Por favor, espera ${cooldown} segundos.`, 
                color: 'orange' 
            });
            return;
        }

        // Verificar si ya se le envió hoy
        const wasSentToday = sentToday.includes(cliente.id);
        
        if (wasSentToday) {
            console.log('Mostrando modal de confirmación...');
            // Mostrar confirmación
            modals.openConfirmModal({
                title: '⚠️ Cliente ya contactado hoy',
                children: (
                    <Text size="sm">
                        Ya enviaste un mensaje a <strong>{cliente.nombres} {cliente.apellidos}</strong> hoy. 
                        ¿Estás seguro de que quieres enviar otro mensaje?
                    </Text>
                ),
                labels: { confirm: 'Sí, enviar de nuevo', cancel: 'Cancelar' },
                confirmProps: { color: 'orange' },
                onConfirm: () => sendMessageToClient(cliente),
            });
        } else {
            await sendMessageToClient(cliente);
        }
    };

    const sendMessageToClient = async (cliente) => {
        try {
            const token = localStorage.getItem('authToken');
            
            // Verificar rate limit
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/campaigns/rate-limit/check`, 
                {}, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Intentar copiar la imagen
            let isImageCopied = false;
            if (settings?.imageUrl) {
                console.log('Intentando copiar imagen:', settings.imageUrl);
                isImageCopied = await copyImageToClipboard(settings.imageUrl);
                console.log('Imagen copiada:', isImageCopied);
            }

            // Personalizar mensaje
            const personalizedHtml = (settings?.message || "")
                .replace(/\[Nombre\]/g, cliente.nombres.split(' ')[0])
                .replace(/\[Apellido\]/g, cliente.apellidos.split(' ')[0]);
            
            // Convertir HTML a texto para WhatsApp
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = personalizedHtml
                .replace(/<p><\/p>/g, '\n')
                .replace(/<\/p><p>/g, '\n')
                .replace(/<strong>/g, '*')
                .replace(/<\/strong>/g, '*')
                .replace(/<em>/g, '_')
                .replace(/<\/em>/g, '_')
                .replace(/<s>/g, '~')
                .replace(/<\/s>/g, '~');
            const plainText = tempDiv.textContent || tempDiv.innerText || "";

            // Usar encodeURIComponent pero preservar ciertos caracteres
            const encodedMessage = encodeURIComponent(plainText);
            
            // Abrir WhatsApp
            window.open(`https://wa.me/591${cliente.numero_telefono}?text=${encodedMessage}`, '_blank');
            
            // Marcar como enviado en el backend
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/campaigns/mark-sent`,
                { clientId: cliente.id, campaignKey },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Notificaciones
            if (isImageCopied) {
                notifications.show({ 
                    title: '✅ Mensaje abierto + Imagen copiada', 
                    message: 'Pega la imagen en WhatsApp con Ctrl+V y envía.', 
                    color: 'green',
                    autoClose: 8000 
                });
            } else if (settings?.imageUrl) {
                notifications.show({ 
                    title: '⚠️ No se pudo copiar la imagen', 
                    message: 'Descárgala manualmente y adjúntala en WhatsApp.', 
                    color: 'orange',
                    autoClose: 6000 
                });
            } else {
                notifications.show({ 
                    title: '✅ Mensaje enviado', 
                    message: 'WhatsApp abierto correctamente.', 
                    color: 'green' 
                });
            }

            // Recargar para actualizar la lista
            window.location.reload();

        } catch (error) {
            if (error.response?.status === 429) {
                notifications.show({ 
                    title: 'Pausa Anti-Spam', 
                    message: error.response.data.message, 
                    color: 'orange' 
                });
                setCooldown(error.response.data.cooldown);
                const timer = setInterval(() => setCooldown(c => c > 0 ? c - 1 : 0), 1000);
                setTimeout(() => clearInterval(timer), error.response.data.cooldown * 1000);
            } else {
                notifications.show({ 
                    title: 'Error', 
                    message: 'No se pudo enviar el mensaje.', 
                    color: 'red' 
                });
            }
        }
    };
    
    return (
        <Paper style={{ maxHeight: '60vh', overflowY: 'auto' }} p="xs">
            {clients.length > 0 ? clients.map(client => {
                const wasSentToday = sentToday.includes(client.id);
                
                return (
                    <Paper 
                        withBorder 
                        p="xs" 
                        radius="md" 
                        mb="xs" 
                        key={client.id} 
                        bg={wasSentToday ? (colorScheme === 'dark' ? 'teal.9' : 'teal.1') : undefined}
                    >
                        <Group justify="space-between">
                            <Group gap="xs">
                                <Avatar color="cyan" radius="xl" size="sm">
                                    {client.nombres[0]}{client.apellidos[0]}
                                </Avatar>
                                <div>
                                    <Group gap="xs">
                                        <Text size="sm">{client.nombres} {client.apellidos}</Text>
                                        {wasSentToday && (
                                            <Badge size="xs" color="teal" variant="light">
                                                Enviado hoy
                                            </Badge>
                                        )}
                                    </Group>
                                    <Text size="xs" c="dimmed">
                                        {campaignKey === 'birthday_campaign' 
                                            ? new Date(client.fecha_nacimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) 
                                            : client.numero_telefono}
                                    </Text>
                                </div>
                            </Group>
                            <Button 
                                onClick={() => handleSendMessage(client)} 
                                disabled={cooldown > 0} 
                                variant="light" 
                                color={wasSentToday ? "teal" : "blue"} 
                                size="xs" 
                                leftSection={<IconSend size={14}/>}
                            >
                                {cooldown > 0 ? `${cooldown}s` : "Enviar"}
                            </Button>
                        </Group>
                    </Paper>
                );
            }) : <Text c="dimmed" ta="center">No hay clientes que coincidan.</Text>}
        </Paper>
    );
}

function BirthdayCampaignTab({ settings, birthdayClients, onSave, onImageUpload, sentToday }) {
    return (
        <SimpleGrid cols={{base: 1, lg: 2}} spacing="xl">
            <CampaignEditor 
                campaignKey="birthday_campaign" 
                settings={settings} 
                onSave={onSave} 
                onImageUpload={onImageUpload} 
            />
            <div>
                <Text fw={500}>2. Envía Felicitaciones</Text>
                <Alert icon={<IconInfoCircle/>} title="Clientes con cumpleaños próximo (7 días)" color="blue" mt="xs"/>
                <Box mt="md">
                    <CampaignSender 
                        clients={birthdayClients} 
                        campaignKey="birthday_campaign" 
                        settings={settings}
                        sentToday={sentToday}
                    />
                </Box>
            </div>
        </SimpleGrid>
    );
}

function PromoCampaignTab({ settings, allClients, onSave, onImageUpload, sentToday }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = allClients.filter(client =>
        (client.nombres?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.apellidos?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.numero_telefono || '').includes(searchTerm)
    );

    return (
        <SimpleGrid cols={{base: 1, lg: 2}} spacing="xl">
            <CampaignEditor 
                campaignKey="promo_campaign" 
                settings={settings} 
                onSave={onSave} 
                onImageUpload={onImageUpload} 
            />
            <div>
                <Text fw={500}>2. Envía a Clientes Seleccionados</Text>
                <TextInput
                    placeholder="Buscar por nombre, apellido o teléfono..."
                    leftSection={<IconSearch size={16}/>}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.currentTarget.value)}
                    mt="xs"
                />
                <Box mt="md">
                    <CampaignSender 
                        clients={filteredClients} 
                        campaignKey="promo_campaign" 
                        settings={settings}
                        sentToday={sentToday}
                    />
                </Box>
            </div>
        </SimpleGrid>
    );
}

function MarketingCampaignsPage() {
    const [settings, setSettings] = useState({});
    const [birthdayClients, setBirthdayClients] = useState([]);
    const [allClients, setAllClients] = useState([]);
    const [sentToday, setSentToday] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSettingsAndClients = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const [settingsRes, birthdaysRes, allClientsRes, sentTodayRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/campaigns/settings`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/clients/birthdays`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/clients`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/campaigns/sent-today`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                })
            ]);
            
            setSettings(settingsRes.data);
            setBirthdayClients(birthdaysRes.data);
            setAllClients(allClientsRes.data);
            setSentToday(sentTodayRes.data.clientIds || []);
        } catch (error) {
            notifications.show({ 
                title: 'Error', 
                message: 'No se pudieron cargar los datos iniciales.', 
                color: 'red' 
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSettingsAndClients();
    }, []);

    const handleSaveSetting = async (key, htmlContent) => {
        const currentSetting = settings[key];
        const newValue = { ...currentSetting, message: htmlContent };
        try {
            const token = localStorage.getItem('authToken');
            await axios.put(
                `${import.meta.env.VITE_API_BASE_URL}/api/campaigns/settings`, 
                { key, value: newValue }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            notifications.show({ 
                title: '¡Guardado!', 
                message: 'El mensaje de la campaña ha sido actualizado.', 
                color: 'green' 
            });
            fetchSettingsAndClients();
        } catch (error) {
            notifications.show({ 
                title: 'Error', 
                message: 'No se pudo guardar el mensaje.', 
                color: 'red' 
            });
        }
    };
    
    const handleImageUpload = async (campaignKey, file) => {
        const formData = new FormData();
        formData.append('campaignImage', file);
        formData.append('campaignKey', campaignKey);
        try {
            const token = localStorage.getItem('authToken');
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/campaigns/settings/image`, 
                formData, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            notifications.show({ 
                title: '¡Subida!', 
                message: 'La imagen de la campaña ha sido actualizada.', 
                color: 'green' 
            });
            // Esperar un poco antes de recargar para que Supabase procese la imagen
            setTimeout(() => fetchSettingsAndClients(), 500);
        } catch (error) {
            notifications.show({ 
                title: 'Error', 
                message: 'No se pudo subir la imagen.', 
                color: 'red' 
            });
        }
    };

    if (loading) return <Loader />;

    return (
        <Container my="xl">
            <Title order={2}>Campañas de Marketing por WhatsApp</Title>
            <Text c="dimmed" size="sm" mt="xs">
                Los clientes marcados como "Enviado hoy" recibirán una confirmación antes de enviarles otro mensaje.
            </Text>
            
            <Tabs defaultValue="birthdays" mt="xl" keepMounted={false}>
                <Tabs.List>
                    <Tabs.Tab value="birthdays" leftSection={<IconCake />}>
                        Campaña de Cumpleaños
                    </Tabs.Tab>
                    <Tabs.Tab value="promo" leftSection={<IconDiscount2 />}>
                        Campaña Promocional
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="birthdays" pt="md">
                    <BirthdayCampaignTab 
                        settings={settings.birthday_campaign} 
                        birthdayClients={birthdayClients}
                        onSave={handleSaveSetting}
                        onImageUpload={handleImageUpload}
                        sentToday={sentToday}
                    />
                </Tabs.Panel>
                
                <Tabs.Panel value="promo" pt="md">
                    <PromoCampaignTab
                        settings={settings.promo_campaign}
                        allClients={allClients}
                        onSave={handleSaveSetting}
                        onImageUpload={handleImageUpload}
                        sentToday={sentToday}
                    />
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}

export default MarketingCampaignsPage;