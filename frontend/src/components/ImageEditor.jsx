// En src/components/ImageEditor.jsx

import { useState } from 'react';
import { Box, Image, Stack, Button, Progress, Text, Group } from '@mantine/core';
import { IconPhotoOff, IconX } from '@tabler/icons-react';
import { removeBackground } from '@imgly/background-removal'; // <-- ¡La magia!

// Este componente recibirá la imagen, le quitará el fondo y se la devolverá al padre
function ImageEditor({ file, onProcessComplete, onClear }) {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleRemoveBackground = async () => {
        if (!file) return;
        setProcessing(true);
        setProgress(0);

        try {
            // ¡La función mágica que quita el fondo!
            const processedBlob = await removeBackground(file, {
                // Le damos una función para que nos informe del progreso
                progress: (current, total) => {
                    const percentage = Math.round((current / total) * 100);
                    setProgress(percentage);
                }
            });

            // Convertimos el resultado (Blob) a un objeto File para que sea consistente
            const processedFile = new File([processedBlob], file.name, { type: 'image/png' });
            
            // Le devolvemos el archivo procesado al componente padre
            onProcessComplete(processedFile);

        } catch (error) {
            console.error('Error al quitar el fondo:', error);
            // Aquí podrías mostrar una notificación de error
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Stack align="center" gap="xs">
            <Image src={URL.createObjectURL(file)} radius="sm" w={120} h={120} fit="contain" />

            {processing ? (
                <Progress value={progress} striped animated w="100%" />
            ) : (
                <Group>
                    <Button
                        size="compact-xs"
                        variant="light"
                        color="blue"
                        onClick={handleRemoveBackground}
                        leftSection={<IconPhotoOff size={14} />}
                    >
                        Quitar Fondo
                    </Button>
                    <Button 
                        size="compact-xs" 
                        variant="subtle" 
                        color="red" 
                        onClick={onClear}
                        leftSection={<IconX size={14}/>}
                    >
                        Descartar
                    </Button>
                </Group>
            )}
        </Stack>
    );
}

export default ImageEditor;