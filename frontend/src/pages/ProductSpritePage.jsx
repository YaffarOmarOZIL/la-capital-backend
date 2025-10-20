// En src/pages/ProductSpritePage.jsx (VERSIÓN CON GENERACIÓN 3D AVANZADA)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, SimpleGrid, FileButton, Image, Box, Stack, Modal, Divider, Slider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconCamera, IconPhotoOff, IconEdit, IconCube, IconRefreshDot, IconDimensions } from '@tabler/icons-react';
import ImageEditor from '../components/ImageEditor';
import { removeBackground } from '@imgly/background-removal';
import { QRCodeCanvas } from 'qrcode.react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

const VISTAS = [ { id: 'frente', label: 'Vista Frontal' }, { id: 'lado_d', label: 'Lateral Derecho' }, { id: 'perspectiva', label: 'En Perspectiva' }, { id: 'atras', label: 'Vista Trasera' }, { id: 'lado_i', label: 'Lateral Izquierdo' }, { id: 'arriba', label: 'Desde Arriba (Cenital)' } ];
const resizeImage = (file, maxSize = 1024) => new Promise((resolve) => { const img = new window.Image(); img.src = URL.createObjectURL(file); img.onload = () => { let { width, height } = img; if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } } const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(img, 0, 0, width, height); canvas.toBlob((blob) => { resolve(new File([blob], file.name.split('.')[0] + '.png', { type: 'image/png' })); }, 'image/png', 0.9); }; });

function ProductSpritePage() {
    const { id: productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState({});
    const [modal, setModal] = useState({ opened: false, vistaId: null, file: null, mode: null });
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const qrRef = useRef();

    // --- NUEVOS ESTADOS PARA LA GENERACIÓN 3D AVANZADA ---
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
    const [generatorType, setGeneratorType] = useState(null); // 'revolve' o 'extrude'
    const [extrusionDepth, setExtrusionDepth] = useState(0.5);
    const imageRef = useRef(null);
    const previewCanvasRef = useRef(null);
    
    // Función para abrir el modal de generación 3D
    const openGeneratorModal = (type) => {
        setGeneratorType(type);
        setIsGeneratorModalOpen(true);
    };

    // Función para cerrar y limpiar el modal
    const closeGeneratorModal = () => {
        setIsGeneratorModalOpen(false);
        setGeneratorType(null);
    };

    // Efecto para manejar la vista previa en 3D del extrusor
    useEffect(() => {
        if (generatorType !== 'extrude' || !isGeneratorModalOpen || !previewCanvasRef.current) return;
        
        let scene, camera, renderer, mesh;
        const init = () => {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
            camera.position.z = 1.5;

            renderer = new THREE.WebGLRenderer({ canvas: previewCanvasRef.current, alpha: true });
            renderer.setSize(300, 300);

            const frontTexture = new THREE.TextureLoader().load(images.frente.preview);
            const frontMaterial = new THREE.MeshBasicMaterial({ map: frontTexture, transparent: true });
            const sideMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
            
            const shape = new THREE.Shape();
            shape.moveTo(-0.5, -0.5); shape.lineTo(0.5, -0.5); shape.lineTo(0.5, 0.5); shape.lineTo(-0.5, 0.5);
            
            const extrudeSettings = { steps: 1, depth: extrusionDepth, bevelEnabled: false };
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            
            mesh = new THREE.Mesh(geometry, [frontMaterial, sideMaterial]);
            scene.add(mesh);
            
            animate();
        };

        const animate = () => {
            if (!renderer) return; // Si se limpió, paramos
            requestAnimationFrame(animate);
            mesh.rotation.y += 0.01;
            mesh.geometry = new THREE.ExtrudeGeometry(mesh.geometry.parameters.shapes, { ...mesh.geometry.parameters.options, depth: extrusionDepth });
            renderer.render(scene, camera);
        };

        init();
        
        // Limpieza al cerrar el modal
        return () => {
            renderer.dispose();
            scene.clear();
            renderer = null;
        };

    }, [generatorType, isGeneratorModalOpen, extrusionDepth, images.frente]);


    // El resto de tus useEffects y funciones de manejo de archivos no cambian...
    // (Pego solo los relevantes para mantener el snippet más corto, pero no los borres)
     useEffect(() => {
        const initialize = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } });
                setProduct(data);
                if (data.ActivosDigitales?.urls_imagenes) {
                    setImages(Object.entries(data.ActivosDigitales.urls_imagenes).reduce((acc, [key, value]) => ({...acc, [key]: {preview: value, file: null, source: 'db'}}), {}));
                }
            } catch (error) { notifications.show({ title: 'Error', message: 'No se pudo cargar el producto.', color: 'red' }); }
            setLoading(false);
        };
        initialize();
    }, [productId]);
    
    // ... Tus otras funciones como handleFileChange, handleAIProcess, etc.
     const handleFileChange = async (file, vistaId) => { if (!file) return; const resized = await resizeImage(file); setModal({ opened: true, vistaId, file: resized, mode: 'chooser' }); };
    const handleAIProcess = async () => { setIsProcessingAI(true); try { const blob = await removeBackground(modal.file); const finalFile = new File([blob], modal.file.name, { type: 'image/png' }); onProcessComplete(finalFile, modal.vistaId); } catch (error) { notifications.show({ title: 'Error de IA', message: 'No se pudo quitar el fondo.', color: 'red' }); closeAllModals(); } finally { setIsProcessingAI(false); } };
    const handleManualProcess = () => setModal(prev => ({ ...prev, mode: 'canvas' }));
    const onProcessComplete = (processedFile, vistaId) => { setImages(prev => ({ ...prev, [vistaId]: { preview: URL.createObjectURL(processedFile), file: processedFile, source: 'new' } })); closeAllModals(); };
    const closeAllModals = () => setModal({ opened: false, vistaId: null, file: null, mode: null });
    const handleSubmit = async () => { setUploading(true); const formData = new FormData(); for (const vistaId in images) { if (images[vistaId].source === 'new') formData.append(vistaId, images[vistaId].file); } try { const token = localStorage.getItem('authToken'); const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/images`; await axios.post(apiUrl, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }); notifications.show({ title: '¡Éxito!', message: 'Los cambios se han guardado correctamente.', color: 'green' }); window.location.reload(); } catch (error) { notifications.show({ title: 'Error', message: 'No se pudieron subir las imágenes.', color: 'red' }); } finally { setUploading(false); } };


    // --- NUEVAS FUNCIONES PARA GENERAR LOS MODELOS 3D ---
    
    // 1. GENERACIÓN POR REVOLUCIÓN (LATHE)
    const handleGenerateRevolveModel = async (pivotX) => {
        closeGeneratorModal(); // Cerramos el modal de selección
        setUploading(true);
        notifications.show({ id: 'gen-3d', title: 'Generando Modelo 3D', message: 'Creando modelo por revolución...', loading: true, autoClose: false });

        try {
            const texture = await new THREE.TextureLoader().loadAsync(images.frente.preview);
            const scene = new THREE.Scene();
            const mainGroup = new THREE.Group();
            const STEPS = 40;
            
            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });

            for (let i = 0; i < STEPS; i++) {
                const angle = (i / STEPS) * Math.PI * 2;
                const plane = new THREE.Mesh(geometry, material);
                plane.position.x = 0.5 - pivotX; // <- Tu mágica idea en acción
                
                const pivot = new THREE.Object3D();
                pivot.add(plane);
                pivot.rotation.y = angle;
                mainGroup.add(pivot);
            }
            scene.add(mainGroup);
            
            await exportAndUploadGLB(scene, 'revolucion');

        } catch (error) {
            notifications.update({ id: 'gen-3d', title: 'Error', message: `No se pudo generar el modelo: ${error.message}`, color: 'red', loading: false });
            setUploading(false);
        }
    };

    // 2. GENERACIÓN POR EXTRUSIÓN (PROFUNDIDAD)
    const handleGenerateExtrudeModel = async () => {
        closeGeneratorModal(); // Cerramos el modal
        setUploading(true);
        notifications.show({ id: 'gen-3d', title: 'Generando Modelo 3D', message: 'Creando modelo por profundidad...', loading: true, autoClose: false });

        try {
            const texture = await new THREE.TextureLoader().loadAsync(images.frente.preview);
            const scene = new THREE.Scene();
            
            const shape = new THREE.Shape();
            // Creamos una forma cuadrada simple de 1x1
            shape.moveTo(-0.5, -0.5); shape.lineTo(0.5, -0.5); shape.lineTo(0.5, 0.5); shape.lineTo(-0.5, 0.5);
            
            const extrudeSettings = { steps: 1, depth: extrusionDepth, bevelEnabled: false };
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

            const frontMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            const sideMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 }); // Color para los lados

            const mesh = new THREE.Mesh(geometry, [frontMaterial, sideMaterial]);
            scene.add(mesh);
            
            await exportAndUploadGLB(scene, 'extrusion');

        } catch (error) {
            notifications.update({ id: 'gen-3d', title: 'Error', message: `No se pudo generar el modelo: ${error.message}`, color: 'red', loading: false });
            setUploading(false);
        }
    };
    
    // 3. FUNCIÓN AYUDANTE PARA EXPORTAR Y SUBIR EL GLB
    const exportAndUploadGLB = (scene, type) => {
        return new Promise((resolve, reject) => {
            const exporter = new GLTFExporter();
            exporter.parse(
                scene,
                async (gltfData) => {
                    try {
                        const glbBlob = new Blob([gltfData], { type: 'model/gltf-binary' });
                        const glbFile = new File([glbBlob], `modelo_${type}_${productId}.glb`, { type: 'model/gltf-binary' });
                        const formData = new FormData();
                        formData.append('modelFile', glbFile);
                        const token = localStorage.getItem('authToken');
                        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/model`;
                        const response = await axios.post(apiUrl, formData, { headers: { Authorization: `Bearer ${token}` } });
                        
                        notifications.update({ id: 'gen-3d', title: '¡Éxito!', message: `Modelo 3D (${type}) guardado.`, color: 'green', loading: false });
                        setUploading(false);
                        resolve(response.data);
                    } catch (uploadError) {
                        reject(uploadError);
                    }
                },
                (error) => { reject(error); },
                { binary: true, embedImages: true }
            );
        });
    };

    if (loading) return <Center h="80vh"><Loader /></Center>;

    return (
        <Paper withBorder p="xl">
            {/* ... Tu modal de ImageEditor no cambia ... */}
            <Modal opened={modal.opened} onClose={closeAllModals} title={`Editando: ${modal.vistaId}`} size={modal.mode === 'canvas' ? 'xl' : 'sm'} centered> {modal.mode === 'chooser' && modal.file && ( <Stack align="center"> <Image src={URL.createObjectURL(modal.file)} maw={250} radius="md" /> <Group> <Button onClick={handleAIProcess} loading={isProcessingAI} leftSection={<IconPhotoOff size={16}/>}>Quitar Fondo (IA)</Button> <Button onClick={handleManualProcess} variant="outline" leftSection={<IconEdit size={16}/>}>Editar Manualmente</Button> </Group> </Stack> )} {modal.mode === 'canvas' && modal.file && ( <ImageEditor file={modal.file} onProcessComplete={(file) => onProcessComplete(file, modal.vistaId)} onClear={closeAllModals} /> )} </Modal>
            
            <Title order={3}>Estudio Fotográfico AR</Title>
            <Text c="dimmed" mb="xl">Producto: <Text span fw={700}>{product?.nombre}</Text></Text>
            
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="lg">
                {VISTAS.map((vista) => (
                    <Stack key={vista.id} align="center" gap="xs">
                        <Text fw={500} size="sm">{vista.label}</Text>
                        <Box w={150} h={150} style={{ border: '2px dashed #ccc', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Image radius="sm" src={images[vista.id]?.preview} fit="contain" style={{ display: images[vista.id] ? 'block' : 'none', width: '100%', height: '100%' }} />
                            {!images[vista.id] && <IconCamera color='gray' />}
                        </Box>
                        <Group gap="xs">
                            <FileButton onChange={(file) => handleFileChange(file, vista.id)} accept="image/png,image/jpeg,image/webp">
                                {(props) => <Button {...props} variant="light" size="xs">{images[vista.id] ? 'Cambiar' : 'Seleccionar'}</Button>}
                            </FileButton>
                        </Group>
                    </Stack>
                ))}
            </SimpleGrid>
            
            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={() => navigate('/admin/products')}>Cancelar</Button>
                <Button onClick={handleSubmit} loading={uploading} leftSection={<IconUpload size={16}/>}>Guardar Imágenes 2D</Button>
            </Group>
            
            <Divider my="xl" label="Generadores de Modelos 3D" labelPosition="center" />
            
            <Text size="sm" c="dimmed" ta="center" mb="md">Usa la imagen frontal para crear un modelo 3D para la Realidad Aumentada.</Text>
            <Group justify="center">
                <Button 
                    onClick={() => openGeneratorModal('revolve')} 
                    disabled={!images.frente} 
                    leftSection={<IconRefreshDot size={18} />}
                    loading={uploading}
                >
                    Crear por Revolución
                </Button>
                <Button 
                    onClick={() => openGeneratorModal('extrude')} 
                    disabled={!images.frente} 
                    leftSection={<IconDimensions size={18} />}
                    loading={uploading}
                >
                    Crear por Profundidad
                </Button>
            </Group>
            {!images.frente && <Text size="xs" c="dimmed" ta="center" mt="xs">Estos botones se activarán cuando subas una imagen frontal.</Text>}


            {/* --- MODAL DINÁMICO PARA LOS GENERADORES 3D --- */}
            <Modal
                opened={isGeneratorModalOpen}
                onClose={closeGeneratorModal}
                title={generatorType === 'revolve' ? 'Generar por Revolución' : 'Generar por Profundidad'}
                size="xl"
                centered
            >
                {generatorType === 'revolve' && (
                    <Stack align="center">
                        <Text c="dimmed" size="sm" ta="center">Haz clic en la imagen sobre el punto que será el **eje central** del giro.</Text>
                        <Image
                            ref={imageRef}
                            src={images.frente?.preview}
                            style={{ cursor: 'crosshair', maxWidth: '80%', borderRadius: '8px' }}
                            onClick={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                const pivotX = (event.clientX - rect.left) / rect.width;
                                handleGenerateRevolveModel(pivotX);
                            }}
                        />
                    </Stack>
                )}
                {generatorType === 'extrude' && (
                     <SimpleGrid cols={2} spacing="xl">
                        <Stack>
                            <Text fw={500}>1. Ajusta la Profundidad</Text>
                            <Text c="dimmed" size="sm">Usa el deslizador para darle grosor al modelo.</Text>
                             <Slider
                                value={extrusionDepth}
                                onChange={setExtrusionDepth}
                                min={0.1} max={2} step={0.05}
                                label={(value) => value.toFixed(2)}
                            />
                             <Button onClick={handleGenerateExtrudeModel} mt="xl">Generar y Guardar Modelo</Button>
                        </Stack>
                        <Stack align="center">
                            <Text fw={500}>2. Vista Previa</Text>
                            <Box w={300} h={300} style={{ border: '1px solid #ddd', borderRadius: '8px' }}>
                                <canvas ref={previewCanvasRef} />
                            </Box>
                        </Stack>
                    </SimpleGrid>
                )}
            </Modal>
        </Paper>
    );
}

export default ProductSpritePage;