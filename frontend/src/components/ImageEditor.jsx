// En src/components/ImageEditor.jsx (VERSIÓN FINAL, DESDE CERO)
import { useState, useRef, useEffect } from 'react';
import { Group, Button, Stack, Text, Slider, Paper } from '@mantine/core';
import { IconBrush, IconEraser } from '@tabler/icons-react';

function ImageEditor({ file, onProcessComplete, onClear }) {
    const canvasRef = useRef(null);
    const originalCanvasRef = useRef(null);
    const [editorState, setEditorState] = useState({ brushSize: 20, mode: 'eraser' });
    const [isDrawing, setIsDrawing] = useState(false);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const originalCanvas = originalCanvasRef.current;
        if (!canvas || !originalCanvas) return;
        const ctx = canvas.getContext('2d');
        const originalCtx = originalCanvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            canvas.width = originalCanvas.width = img.naturalWidth;
            canvas.height = originalCanvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            originalCtx.drawImage(img, 0, 0);
        };
        img.src = URL.createObjectURL(file);
    }, [file]);

    const getCoords = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x:0, y:0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.nativeEvent.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.nativeEvent.clientY - rect.top) * (canvas.height / rect.height)
        };
    };
    
    const startDrawing = (event) => {
        const { x, y } = getCoords(event);
        const ctx = canvasRef.current.getContext('2d');
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (event) => {
        if (!isDrawing) return;
        const { x, y } = getCoords(event);
        const ctx = canvasRef.current.getContext('2d');
        
        ctx.lineWidth = editorState.brushSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = "rgba(0,0,0,1)"; // Necesario para 'restaurar'

        if (editorState.mode === 'brush') { // Restaurar
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(originalCanvasRef.current, x - ctx.lineWidth / 2, y - ctx.lineWidth / 2, ctx.lineWidth, ctx.lineWidth, x - ctx.lineWidth / 2, y - ctx.lineWidth / 2, ctx.lineWidth, ctx.lineWidth);
        } else { // Borrar
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => setIsDrawing(false);
    
    const handleDone = () => {
        canvasRef.current.toBlob((blob) => {
            onProcessComplete(new File([blob], file.name.split('.')[0] + '.png', { type: 'image/png' }));
        }, 'image/png');
    };
    
    return (
        <Stack align="center" gap="md">
            <Text fw={500}>Usa la Goma para borrar el fondo y el Pincel para restaurar partes.</Text>
            <Paper withBorder style={{ width: '100%', maxHeight: '50vh', overflow: 'auto' }}>
                 <canvas ref={canvasRef} style={{ cursor: 'crosshair', display: 'block' }} onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseMove={draw} onMouseLeave={stopDrawing} />
            </Paper>
            <canvas ref={originalCanvasRef} style={{ display: 'none' }} />
            <Paper p="xs" withBorder>
                <Group>
                    <Button.Group>
                         <Button onClick={() => setEditorState(prev => ({ ...prev, mode: 'eraser' }))} variant={editorState.mode === 'eraser' ? 'filled' : 'light'} leftSection={<IconEraser size={16} />} color="red">Goma de Borrar</Button>
                         <Button onClick={() => setEditorState(prev => ({ ...prev, mode: 'brush' }))} variant={editorState.mode === 'brush' ? 'filled' : 'light'} leftSection={<IconBrush size={16} />} color="blue">Restaurar</Button>
                    </Button.Group>
                    <Stack gap={0} ml="md">
                        <Text size="xs">Tamaño:</Text>
                        <Slider w={150} value={editorState.brushSize} onChange={value => setEditorState(prev => ({...prev, brushSize: value}))} min={2} max={50}/>
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