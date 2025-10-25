// --- ARCHIVO COMPLETO: frontend/src/pages/MarketingCampaignsPage.jsx ---

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Container, Title, Text, Tabs, Card, Group, Avatar, Button, Textarea, SimpleGrid, Modal, Paper, FileButton, Image, Alert } from '@mantine/core';
import { IconCake, IconSend, IconDiscount2, IconInfoCircle, IconPhotoUp } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useEditor } from '@tiptap/react';
import { RichTextEditor, Link } from '@mantine/tiptap';
import StarterKit from '@tiptap/starter-kit';

// --- Función Helper para copiar imagen al portapapeles ---
async function copyImageToClipboard(imageUrl) {
    if (!imageUrl) return false;
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        return true;
    } catch (error) {
        console.error("No se pudo copiar la imagen al portapapeles:", error);
        return false;
    }
}

// --- Componente Reutilizable del Editor ---
function CampaignEditor({ campaignKey, settings, onSave, onImageUpload }) {
    const editor = useEditor({
        extensions: [StarterKit, Link],
        content: settings?.message || '',
    });

    return (
        <Stack>
            <Text fw={500}>1. Diseña tu Campaña</Text>
            <RichTextEditor editor={editor}>
                <RichTextEditor.Toolbar sticky stickyOffset={60}>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold /> <RichTextEditor.Italic /> <RichTextEditor.Strikethrough />
                    </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>
                <RichTextEditor.Content />
            </RichTextEditor>
            <Group justify="flex-end">
                <Button onClick={() => onSave(campaignKey, editor.getHTML())}>Guardar Mensaje</Button>
            </Group>

            <FileButton onChange={(file) => onImageUpload(campaignKey, file)} accept="image/png,image/jpeg">
                {(props) => <Button {...props} variant="default" leftSection={<IconPhotoUp size={16}/>}>Adjuntar Imagen</Button>}
            </FileButton>

            {settings?.imageUrl && (
                <Paper withBorder p="sm" mt="xs">
                    <Text size="xs" c="dimmed">Imagen de la campaña:</Text>
                    <Image src={settings.imageUrl} maw={200} mx="auto" radius="md" />
                </Paper>
            )}
        </Stack>
    );
}

// --- Componente para las campañas (unificado) ---
function CampaignSender({ clients, campaignKey, settings }) {
    const [sentIds, setSentIds] = useState(new Set());
    const [cooldown, setCooldown] = useState(0);

    const handleSendMessage = async (cliente) => {
        if (cooldown > 0) {
            notifications.show({ title: 'Pausa Anti-Spam', message: `Por favor, espera ${cooldown} segundos.`, color: 'orange' });
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/campaigns/rate-limit/check`, {}, { headers: { Authorization: `Bearer ${token}` } });
            
            const isImageCopied = await copyImageToClipboard(settings?.imageUrl);

            const personalizedHtml = (settings?.message || "")
                .replace(/\[Nombre\]/g, cliente.nombres.split(' ')[0])
                .replace(/\[Apellido\]/g, cliente.apellidos.split(' ')[0]);
            
            // Convertir HTML a texto plano para WhatsApp
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = personalizedHtml.replace(/<p><\/p>/g, '\n').replace(/<\/p><p>/g, '\n').replace(/<strong>/g, '*').replace(/<\/strong>/g, '*').replace(/<em>/g, '_').replace(/<\/em>/g, '_').replace(/<s>/g, '~').replace(/<\/s>/g, '~');
            const plainText = tempDiv.textContent || "";

            const encodedMessage = encodeURIComponent(plainText);
            
            window.open(`https://wa.me/591${cliente.numero_telefono}?text=${encodedMessage}`, '_blank');
            setSentIds(prev => new Set(prev).add(cliente.id));

            if (isImageCopied) {
                notifications.show({ title: '¡Acción requerida!', message: 'La imagen ha sido copiada. Pégala (Ctrl+V) en el chat de WhatsApp y envía.', autoClose: 10000 });
            }

        } catch (error) {
            if (error.response?.status === 429) {
                notifications.show({ title: 'Pausa Anti-Spam', message: error.response.data.message, color: 'orange' });
                setCooldown(error.response.data.cooldown);
                const timer = setInterval(() => setCooldown(c => c > 0 ? c - 1 : 0), 1000);
                setTimeout(() => clearInterval(timer), error.response.data.cooldown * 1000);
            } else {
                notifications.show({ title: 'Error', message: 'No se pudo verificar el límite de envío.', color: 'red' });
            }
        }
    };
    
    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mt="md">
            {clients.length > 0 ? clients.map(client => {
                const isSent = sentIds.has(client.id);
                return (
                <Card key={client.id} shadow="sm" p="lg" radius="md" withBorder style={{ opacity: isSent ? 0.6 : 1 }}>
                    <Group justify="space-between">
                         <Group>
                            <Avatar color="cyan" radius="xl">{client.nombres[0]}{client.apellidos[0]}</Avatar>
                            <div>
                                <Text fw={500}>{client.nombres} {client.apellidos}</Text>
                                <Text size="xs" c="dimmed">{campaignKey === 'birthday_campaign' ? new Date(client.fecha_nacimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : client.numero_telefono}</Text>
                            </div>
                        </Group>
                        <Button onClick={() => handleSendMessage(client)} disabled={cooldown > 0} variant="light" color={isSent ? "gray" : "blue"} size="xs" leftSection={<IconSend size={14}/>}>
                            {isSent ? "Enviado" : "Enviar"}
                        </Button>
                    </Group>
                </Card>
            )}) : <Text>No hay clientes para esta campaña.</Text>}
        </SimpleGrid>
    );
}


function MarketingCampaignsPage() {
    const [settings, setSettings] = useState({});
    const [birthdayClients, setBirthdayClients] = useState([]);
    const [allClients, setAllClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSettingsAndClients = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const [settingsRes, birthdaysRes, allClientsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/campaigns/settings`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/clients/birthdays`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setSettings(settingsRes.data);
            setBirthdayClients(birthdaysRes.data);
            setAllClients(allClientsRes.data);
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudieron cargar los datos iniciales.', color: 'red' });
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
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/campaigns/settings`, { key, value: newValue }, { headers: { Authorization: `Bearer ${token}` } });
            notifications.show({ title: '¡Guardado!', message: 'El mensaje de la campaña ha sido actualizado.', color: 'green' });
            fetchSettingsAndClients();
        } catch (error) {
             notifications.show({ title: 'Error', message: 'No se pudo guardar el mensaje.', color: 'red' });
        }
    };
    
    const handleImageUpload = async (campaignKey, file) => {
        const formData = new FormData();
        formData.append('campaignImage', file);
        formData.append('campaignKey', campaignKey);
        try {
            const token = localStorage.getItem('authToken');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/campaigns/settings/image`, formData, { headers: { Authorization: `Bearer ${token}` } });
            notifications.show({ title: '¡Subida!', message: 'La imagen de la campaña ha sido actualizada.', color: 'green' });
            fetchSettingsAndClients();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudo subir la imagen.', color: 'red' });
        }
    };

    if (loading) return <Loader />;

    return (
        <Container my="xl">
            <Title order={2}>Campañas de Marketing por WhatsApp</Title>
            <Tabs defaultValue="birthdays" mt="xl">
                <Tabs.List>
                    <Tabs.Tab value="birthdays" leftSection={<IconCake />}>Campaña de Cumpleaños</Tabs.Tab>
                    <Tabs.Tab value="promo" leftSection={<IconDiscount2 />}>Campaña Promocional</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="birthdays" pt="md">
                    <SimpleGrid cols={{base: 1, lg: 2}} spacing="xl">
                       <CampaignEditor campaignKey="birthday_campaign" settings={settings.birthday_campaign} onSave={handleSaveSetting} onImageUpload={handleImageUpload} />
                       <div>
                            <Text fw={500}>2. Envía Felicitaciones</Text>
                            <Alert icon={<IconInfoCircle/>} title="Clientes con cumpleaños próximo (7 días)" color="blue" mt="xs"/>
                            <CampaignSender clients={birthdayClients} campaignKey="birthday_campaign" settings={settings.birthday_campaign}/>
                       </div>
                    </SimpleGrid>
                </Tabs.Panel>
                
                <Tabs.Panel value="promo" pt="md">
                    <SimpleGrid cols={{base: 1, lg: 2}} spacing="xl">
                        <CampaignEditor campaignKey="promo_campaign" settings={settings.promo_campaign} onSave={handleSaveSetting} onImageUpload={handleImageUpload} />
                        <div>
                             <Text fw={500}>2. Envía a todos los clientes</Text>
                             <CampaignSender clients={allClients} campaignKey="promo_campaign" settings={settings.promo_campaign}/>
                        </div>
                    </SimpleGrid>
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}

export default MarketingCampaignsPage;