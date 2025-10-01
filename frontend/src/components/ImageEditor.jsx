// En src/components/ImageEditor.jsx (Versión Definitiva y Sin Fantasmas)

import { useState, useRef, useEffect } from 'react';
// ----- ¡LA IMPORTACIÓN CORRECTA Y ÚNICA! ¡SIN 'Canvas'! -----
import { Group, Button, Stack, Text, Slider, Paper } from '@mantine/core';
import { IconBrush, IconEraser } from '@tabler/icons-react';
// -------------------------------------------------------------

function ImageEditor({ file, onProcessComplete, onClear }) {
    const visibleCanvasRef = useRef(null);
    const originalCanvasRef = useRef(null); // <-- ¡El lienzo secreto!
    const [editorState, setEditorState] = useState({ brushSize: 20, mode: 'eraser' });
    const [isDrawing, setIsDrawing] = useState(false);
    
    useEffect(() => {
        const visibleCtx = visibleCanvasRef.current.getContext('2d');
        const originalCtx = originalCanvasRef.current.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Dibujamos la imagen en AMBOS lienzos
            visibleCanvasRef.current.width = originalCanvasRef.current.width = img.naturalWidth;
            visibleCanvasRef.current.height = originalCanvasRef.current.height = img.naturalHeight;
            visibleCtx.drawImage(img, 0, 0);
            originalCtx.drawImage(img, 0, 0);
        };
        img.src = URL.createObjectURL(file);
    }, [file]);
    
    
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
        const ctx = visibleCanvasRef.current.getContext('2d');
        
        if (editorState.mode === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'; // Borra
        } else {
            // ¡LA MAGIA DE RESTAURAR! Copia desde el lienzo secreto
            ctx.globalCompositeOperation = 'source-over';
            const originalData = originalCanvasRef.current.getContext('2d').getImageData(x - editorState.brushSize / 2, y - editorState.brushSize / 2, editorState.brushSize, editorState.brushSize);
            ctx.putImageData(originalData, x - editorState.brushSize / 2, y - editorState.brushSize / 2);
            return; // Salimos para no ejecutar el 'stroke' normal
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const handleDone = () => {
        canvasRef.current.toBlob((blob) => {
            const newFile = new File([blob], 'edited-image.png', { type: 'image/png' });
            onProcessComplete(newFile);
        }, 'image/png');
    };

    return (
        <Stack align="center">
            {/* ... Lienzo visible ... */}
            <canvas ref={visibleCanvasRef} /*...*/ />
            {/* ¡El lienzo invisible que guarda la imagen original! */}
            <canvas ref={originalCanvasRef} style={{ display: 'none' }} />

            <Paper p="xs" withBorder>
                <Group>
                    <Button.Group>
                        <Button onClick={() => setEditorState(s => ({ ...s, mode: 'eraser' }))} variant={editorState.mode === 'eraser' ? 'filled' : 'light'} color="red">Borrador</Button>
                        <Button onClick={() => setEditorState(s => ({ ...s, mode: 'brush' }))} variant={editorState.mode === 'brush' ? 'filled' : 'light'} color="blue">Restaurar</Button>
                    </Button.Group>
                   
                    <Stack gap={0} ml="md">
                        <Text size="xs">Tamaño:</Text>
                        <Slider
                            w={150}
                            value={editorState.brushSize}
                            onChange={(value) => setEditorState(s => ({ ...s, brushSize: value }))}
                            min={2}
                            max={50}
                        />
                    </Stack>
                </Group>
            </Paper>

            <Group justify="flex-end" w="100%" mt="md">
                <Button variant="default" onClick={onClear}>Cancelar</Button>
                <Button onClick={handleDone}>Hecho</Button>
            </Group>
        </Stack>
    );
}

export default ImageEditor;