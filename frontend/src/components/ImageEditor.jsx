// En src/components/ImageEditor.jsx (Versión Definitiva y Sin Fantasmas)

import { useState, useRef, useEffect } from 'react';
// ----- ¡LA IMPORTACIÓN CORRECTA Y ÚNICA! ¡SIN 'Canvas'! -----
import { Group, Button, Stack, Text, Slider, Paper } from '@mantine/core';
import { IconBrush, IconEraser } from '@tabler/icons-react';
import { removeBackground } from '@imgly/background-removal'; // <-- La magia de la IA
// -------------------------------------------------------------

function ImageEditor({ file, onProcessComplete, onClear }) {
    const canvasRef = useRef(null);
    const originalImageRef = useRef(null); // Guardamos la imagen original aquí
    
    const [editorState, setEditorState] = useState({ brushSize: 20, mode: 'eraser' });
    const [isDrawing, setIsDrawing] = useState(false);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            originalImageRef.current = img; // Guardamos la imagen original
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
        };
        img.src = URL.createObjectURL(file);
    }, [file]);
    
    const resizeImage = (file, maxSize = 1024) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                resolve(new File([blob], file.name, { type: 'image/png' }));
            }, 'image/png', 0.9); // Calidad del 90%
        };
        img.onerror = reject;
    });
};

    const handleRemoveBackgroundAI = async () => {
        setIsProcessingAI(true);
        try {
            const resizedFile = await resizeImage(file);
            const processedBlob = await removeBackground(resizedFile);
            const finalFile = new File([processedBlob], file.name, { type: 'image/png' });
            onProcessComplete(finalFile);
        } catch (error) { /* ... */ } 
        finally { setIsProcessingAI(false); }
    };

    const getCoords = ({ nativeEvent }) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (nativeEvent.clientX - rect.left) * (canvas.width / rect.width),
            y: (nativeEvent.clientY - rect.top) * (canvas.height / rect.height),
        };
    };
    

    const startDrawing = (event) => {
        const { x, y } = getCoords(event);
        const ctx = canvasRef.current.getContext('2d');
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const draw = (event) => {
        if (!isDrawing) return;
        const { x, y } = getCoords(event);
        const ctx = canvasRef.current.getContext('2d');
        
        if (editorState.mode === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineTo(x,y); ctx.stroke();
        } else {
            ctx.globalCompositeOperation = 'source-over';
            // Restauramos usando la imagen original guardada
            ctx.drawImage(originalImageRef.current, x, y, 20, 20, x, y, 20, 20);
        }
    };

    const handleDone = () => {
        canvasRef.current.toBlob((blob) => {
            const newFile = new File([blob], file.name.split('.')[0] + '.png', { type: 'image/png' });
            onProcessComplete(newFile);
        }, 'image/png');
    };

    return (
        <Stack align="center" gap="md">
            <Text fw={500}>Usa la Goma para quitar el fondo y el Pincel para restaurarlo.</Text>
            
            {/* El Contenedor del Canvas, con scroll si la imagen es gigante */}
            <Paper withBorder style={{ width: '100%', maxHeight: '50vh', overflow: 'auto' }}>
                 <canvas
                    ref={visibleCanvasRef}
                    style={{ cursor: 'crosshair', display: 'block' }}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={draw}
                    onMouseLeave={stopDrawing}
                />
            </Paper>
            
            {/* El lienzo invisible se queda fuera y no molesta */}
            <canvas ref={originalCanvasRef} style={{ display: 'none' }} />

            {/* La barra de herramientas, limpia y fuera del canvas */}
            <Paper p="xs" withBorder>
                <Group>
                    <Button.Group>
                         <Button onClick={() => setEditorState({ ...editorState, mode: 'eraser' })} /* ... */ >
                            Goma de Borrar
                        </Button>
                         <Button onClick={() => setEditorState({ ...editorState, mode: 'brush' })} /* ... */ >
                            Restaurar
                        </Button>
                    </Button.Group>
                    <Stack gap={0} ml="md">
                        {/* ... tu slider ... */}
                    </Stack>
                </Group>
            </Paper>

            {/* Los botones finales */}
            <Group justify="flex-end" w="100%" mt="md">
                <Button variant="default" onClick={onClear}>Cancelar</Button>
                <Button onClick={handleDone}>Hecho</Button>
            </Group>
        </Stack>
    );
}

export default ImageEditor;