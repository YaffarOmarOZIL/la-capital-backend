// --- ARCHIVO: frontend/src/pages/ProductSpritePage.jsx ---

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, SimpleGrid, FileButton, Image, Box, Stack, Modal, Divider, SegmentedControl, Slider, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconCamera, IconBox, IconCylinder, IconSphere, IconSettings, IconCircleCheck, IconPhoto } from '@tabler/icons-react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const VISTAS = [ { id: 'frente', label: 'Vista Frontal' }, { id: 'lado_d', label: 'Lateral Derecho' }, { id: 'atras', label: 'Vista Trasera' }, { id: 'lado_i', label: 'Lateral Izquierdo' }, { id: 'arriba', label: 'Desde Arriba (Cenital)' }, { id: 'perspectiva', label: 'En Perspectiva' } ];
const resizeImage = (file, maxSize = 1024) => new Promise((resolve) => { const img = new window.Image(); img.src = URL.createObjectURL(file); img.onload = () => { let { width, height } = img; if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } } const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(img, 0, 0, width, height); canvas.toBlob((blob) => { resolve(new File([blob], file.name.split('.')[0] + '.png', { type: 'image/png' })); }, 'image/png', 0.9); }; });

function ProductSpritePage() {
    // --- ESTADOS ---
    const { id: productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState({});
    const [primitiveModalOpen, setPrimitiveModalOpen] = useState(false);
    const [galleryModalOpen, setGalleryModalOpen] = useState(false);
    const [primitiveType, setPrimitiveType] = useState('box');
    const [dimensions, setDimensions] = useState({ w: 1, h: 1, d: 1, r: 0.5 });
    const [models, setModels] = useState([]);
    const previewCanvasRef = useRef(null);
    
    // --- LÓGICA PRINCIPAL ---
    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } });
                setProduct(data);
                if (data.ActivosDigitales?.urls_imagenes) {
                    const initialImages = Object.entries(data.ActivosDigitales.urls_imagenes).reduce((acc, [key, value]) => ({...acc, [key]: {preview: value, file: null, source: 'db'}}), {});
                    setImages(initialImages);
                }
            } catch (error) { notifications.show({ title: 'Error', message: 'No se pudo cargar el producto.', color: 'red' }); }
            setLoading(false);
        };
        initialize();
    }, [productId]);

    // VISTA PREVIA 3D EN VIVO DEL TALLER
    useEffect(() => {
        if (!primitiveModalOpen || !previewCanvasRef.current) return;
        
        let renderer, controls;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        camera.position.set(0, 0.5, 2.5);
        renderer = new THREE.WebGLRenderer({ canvas: previewCanvasRef.current, antialias: true });
        renderer.setSize(400, 400);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        scene.add(new THREE.AmbientLight(0xffffff, 1.5));
        scene.add(new THREE.DirectionalLight(0xffffff, 2.5));

        const textureLoader = new THREE.TextureLoader();
        const loadedTextures = Object.fromEntries(Object.entries(images).map(([key, val]) => [key, textureLoader.load(val.preview)]));
        let mesh;

        const updateMesh = () => {
            if (mesh) scene.remove(mesh);
            const { w, h, d, r } = dimensions;
            const greyMaterial = new THREE.MeshStandardMaterial({ color: '#888' });

            if (primitiveType === 'box') { const geometry = new THREE.BoxGeometry(w, h, d); const materials = [ loadedTextures.lado_d ? new THREE.MeshStandardMaterial({ map: loadedTextures.lado_d }) : greyMaterial, loadedTextures.lado_i ? new THREE.MeshStandardMaterial({ map: loadedTextures.lado_i }) : greyMaterial, loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial, loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial, loadedTextures.frente ? new THREE.MeshStandardMaterial({ map: loadedTextures.frente }) : greyMaterial, loadedTextures.atras ? new THREE.MeshStandardMaterial({ map: loadedTextures.atras }) : greyMaterial ]; mesh = new THREE.Mesh(geometry, materials); }
            if (primitiveType === 'cylinder') { const geometry = new THREE.CylinderGeometry(r, r, h, 40); const sideTexture = loadedTextures.perspectiva || loadedTextures.frente; const materials = [ sideTexture ? new THREE.MeshStandardMaterial({ map: sideTexture }) : greyMaterial, loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial, loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial ]; mesh = new THREE.Mesh(geometry, materials); }
            if (primitiveType === 'sphere') { const geometry = new THREE.SphereGeometry(r, 32, 16); const material = loadedTextures.perspectiva ? new THREE.MeshStandardMaterial({ map: loadedTextures.perspectiva }) : greyMaterial; mesh = new THREE.Mesh(geometry, material); }
            if (mesh) scene.add(mesh);
        };
        updateMesh();
        
        const animate = () => { if (!renderer.domElement.isConnected) return; requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
        animate();
        
        return () => { renderer.dispose(); controls.dispose(); };
    }, [primitiveModalOpen, primitiveType, dimensions, images]);

    // --- MANEJADORES DE ACCIONES ---
    const handleFileChange = async (file, vistaId) => { if (!file) return; const resized = await resizeImage(file); setImages(prev => ({ ...prev, [vistaId]: { preview: URL.createObjectURL(resized), file: resized, source: 'new' } })); };

    const handleSubmitImages = async () => {
        setUploading(true);
        const formData = new FormData();
        let changesFound = false;
        for (const vistaId in images) {
            if (images[vistaId].source === 'new') {
                formData.append(vistaId, images[vistaId].file);
                changesFound = true;
            } else if (images[vistaId].source === 'db') {
                 formData.append(vistaId, images[vistaId].preview);
            }
        }
        if (!changesFound) {
            notifications.show({ title: 'Sin cambios', message: 'No hay imágenes nuevas o modificadas para subir.', color: 'blue' });
            setUploading(false); return;
        }
        try {
            const token = localStorage.getItem('authToken');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/images`, formData, { headers: { Authorization: `Bearer ${token}` } });
            notifications.show({ title: '¡Éxito!', message: 'Las imágenes se han guardado.', color: 'green' });
            window.location.reload();
        } catch (error) { notifications.show({ title: 'Error', message: 'No se pudieron subir las imágenes.', color: 'red' }); } finally { setUploading(false); }
    };

    const handleGeneratePrimitiveModel = async () => {
        setUploading(true);
        notifications.show({ id: 'gen-3d', title: 'Generando Modelo', message: 'Cargando texturas...', loading: true, autoClose: false });
        try {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.setCrossOrigin('anonymous');
            const texturePromises = VISTAS
                .filter(vista => images[vista.id]?.preview)
                .map(vista => textureLoader.loadAsync(images[vista.id].preview).then(texture => ({ key: vista.id, texture })));
            const loadedTextureData = await Promise.all(texturePromises);
            const loadedTextures = Object.fromEntries(loadedTextureData.map(({ key, texture }) => [key, texture]));

            notifications.update({ id: 'gen-3d', message: 'Construyendo la geometría...', });

            const scene = new THREE.Scene();
            const { w, h, d, r } = dimensions;
            const greyMaterial = new THREE.MeshStandardMaterial({ color: '#888' });
            let mesh;
            
            if (primitiveType === 'box') { const geometry = new THREE.BoxGeometry(w, h, d); const materials = [ loadedTextures.lado_d ? new THREE.MeshStandardMaterial({ map: loadedTextures.lado_d }) : greyMaterial, loadedTextures.lado_i ? new THREE.MeshStandardMaterial({ map: loadedTextures.lado_i }) : greyMaterial, loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial, loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial, loadedTextures.frente ? new THREE.MeshStandardMaterial({ map: loadedTextures.frente }) : greyMaterial, loadedTextures.atras ? new THREE.MeshStandardMaterial({ map: loadedTextures.atras }) : greyMaterial ]; mesh = new THREE.Mesh(geometry, materials); }
            if (primitiveType === 'cylinder') { const geometry = new THREE.CylinderGeometry(r, r, h, 40); const sideTexture = loadedTextures.perspectiva || loadedTextures.frente; const materials = [ sideTexture ? new THREE.MeshStandardMaterial({ map: sideTexture }) : greyMaterial, loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial, loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial ]; mesh = new THREE.Mesh(geometry, materials); }
            if (primitiveType === 'sphere') { const geometry = new THREE.SphereGeometry(r, 32, 16); const material = loadedTextures.perspectiva ? new THREE.MeshStandardMaterial({ map: loadedTextures.perspectiva }) : greyMaterial; mesh = new THREE.Mesh(geometry, material); }
            if (!mesh) throw new Error('No se pudo construir la forma 3D.');
            scene.add(mesh);

            notifications.update({ id: 'gen-3d', message: 'Exportando a archivo GLB...', });

            const exporter = new GLTFExporter();
            exporter.parse( scene, async (gltfData) => {
                    try {
                        const blob = new Blob([gltfData], { type: 'model/gltf-binary' });
                        const file = new File([blob], `modelo_producto_${productId}_${primitiveType}_${Date.now()}.glb`);
                        const formData = new FormData();
                        formData.append('modelFile', file);
                        const token = localStorage.getItem('authToken');
                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/model`, formData, { headers: { Authorization: `Bearer ${token}` } });
                        notifications.update({ id: 'gen-3d', title: '¡Éxito!', message: `Modelo ${primitiveType} guardado.`, color: 'green', loading: false, autoClose: 5000 });
                    } catch (error) { notifications.update({ id: 'gen-3d', title: 'Error de subida', message: 'No se pudo guardar el modelo.', color: 'red', loading: false });
                    } finally { setUploading(false); setPrimitiveModalOpen(false); }
                },
                (error) => { console.error(error); throw new Error('No se pudo procesar el modelo 3D para exportación.'); },
                { binary: true, embedImages: true }
            );
        } catch (error) {
            notifications.update({ id: 'gen-3d', title: 'Error', message: error.message, color: 'red', loading: false, autoClose: 5000 });
            setUploading(false);
        }
    };

    const fetchModels = async () => {
        setGalleryModalOpen(true);
        try {
            const token = localStorage.getItem('authToken');
            const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/models`, { headers: { Authorization: `Bearer ${token}` } });
            setModels(data);
        } catch (error) { notifications.show({ title: 'Error', message: 'No se pudieron cargar los modelos.', color: 'red' }); }
    };

    const setActiveModel = async (modelUrl) => {
        try {
            const token = localStorage.getItem('authToken');
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/set-active-model`, { modelUrl }, { headers: { Authorization: `Bearer ${token}` } });
            notifications.show({ title: '¡Actualizado!', message: 'El nuevo modelo está activo para la experiencia AR.', color: 'green' });
            setModels(models.map(m => ({ ...m, isActive: m.url === modelUrl })));
        } catch (error) { notifications.show({ title: 'Error', message: 'No se pudo activar el modelo.', color: 'red' }); }
    };

    if (loading) return <Center h="80vh"><Loader /></Center>;

    return (
        <Paper withBorder p="xl">
            <Title order={3}>Estudio Fotográfico AR</Title>
            <Text c="dimmed" mb="xl">Producto: <Text span fw={700}>{product?.nombre}</Text></Text>
            
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="lg">
                 {VISTAS.map((vista) => (
                    <Stack key={vista.id} align="center" gap="xs">
                        <Text fw={500} size="sm">{vista.label}</Text>
                        <Box w={150} h={150} style={{ border: '2px dashed #ccc', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
                            <Image radius="sm" src={images[vista.id]?.preview} fit="contain" style={{ display: images[vista.id] ? 'block' : 'none', width: '100%', height: '100%' }} />
                            {!images[vista.id] && <IconPhoto color='gray' />}
                        </Box>
                         <FileButton onChange={(file) => handleFileChange(file, vista.id)} accept="image/png,image/jpeg,image/webp">
                            {(props) => <Button {...props} variant="light" size="xs">{images[vista.id] ? 'Cambiar' : 'Subir'}</Button>}
                        </FileButton>
                    </Stack>
                ))}
            </SimpleGrid>

            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={() => navigate('/admin/products')}>Cancelar</Button>
                <Button onClick={handleSubmitImages} loading={uploading} leftSection={<IconUpload size={16}/>}>Guardar Imágenes 2D</Button>
            </Group>
            
            <Divider my="xl" label="Gestión de Modelos 3D para AR" labelPosition="center" />
            
            <Group justify="center">
                <Button onClick={() => setPrimitiveModalOpen(true)} disabled={Object.keys(images).length < 6} leftSection={<IconBox size={18} />} size="md">
                    Taller de Creación 3D
                </Button>
                <Button onClick={fetchModels} leftSection={<IconSettings size={18} />} variant="outline" size="md">
                    Administrar Modelos
                </Button>
            </Group>
             {Object.keys(images).length < 6 && <Text size="xs" c="dimmed" ta="center" mt="xs">Sube las 6 imágenes para activar el taller de creación 3D.</Text>}
            
            <Modal opened={primitiveModalOpen} onClose={() => setPrimitiveModalOpen(false)} title="Taller de Creación 3D" size="80%" centered>
                <SimpleGrid cols={2} spacing="xl">
                    <Stack>
                        <Text fw={500}>1. Elige una Forma Base</Text>
                        <SegmentedControl value={primitiveType} onChange={setPrimitiveType} data={[ { label: 'Cubo', value: 'box' }, { label: 'Cilindro', value: 'cylinder' }, { label: 'Esfera', value: 'sphere' } ]} fullWidth />
                        <Text fw={500} mt="md">2. Ajusta las Dimensiones</Text>
                        {primitiveType === 'box' && <>
                            <Text size="sm">Ancho:</Text> <Slider value={dimensions.w} onChange={v => setDimensions(d => ({...d, w: v}))} min={0.1} max={3} step={0.05} label={v => v.toFixed(2)} />
                            <Text size="sm">Alto:</Text> <Slider value={dimensions.h} onChange={v => setDimensions(d => ({...d, h: v}))} min={0.1} max={3} step={0.05} label={v => v.toFixed(2)} />
                            <Text size="sm">Profundidad:</Text> <Slider value={dimensions.d} onChange={v => setDimensions(d => ({...d, d: v}))} min={0.1} max={3} step={0.05} label={v => v.toFixed(2)} />
                        </>}
                         {primitiveType === 'cylinder' && <>
                            <Text size="sm">Radio:</Text> <Slider value={dimensions.r} onChange={v => setDimensions(d => ({...d, r: v}))} min={0.1} max={2} step={0.05} label={v => v.toFixed(2)} />
                            <Text size="sm">Altura:</Text> <Slider value={dimensions.h} onChange={v => setDimensions(d => ({...d, h: v}))} min={0.1} max={3} step={0.05} label={v => v.toFixed(2)} />
                        </>}
                         {primitiveType === 'sphere' && <>
                            <Text size="sm">Radio:</Text> <Slider value={dimensions.r} onChange={v => setDimensions(d => ({...d, r: v}))} min={0.1} max={2} step={0.05} label={v => v.toFixed(2)} />
                        </>}
                        <Button onClick={handleGeneratePrimitiveModel} loading={uploading} mt="xl" size="lg">Generar y Guardar Modelo</Button>
                    </Stack>
                    <Stack align="center">
                        <Text fw={500}>Vista Previa 3D Interactiva</Text>
                        <Box w={400} h={400} style={{ border: '1px solid #ddd', borderRadius: '8px' }}>
                            <canvas ref={previewCanvasRef} />
                        </Box>
                        <Text size="xs" c="dimmed">Arrastra para rotar. Rueda para hacer zoom.</Text>
                    </Stack>
                </SimpleGrid>
            </Modal>
            
            <Modal opened={galleryModalOpen} onClose={() => setGalleryModalOpen(false)} title="Administrar Modelos 3D" size="xl" centered>
                <Stack>
                    {models.length > 0 ? models.map((model) => (
                        <Paper withBorder p="sm" key={model.name} radius="md">
                            <SimpleGrid cols={3} spacing="md" align="center">
                                {/* Columna 1: Vista Previa 3D */}
                                <Center>
                                    <ModelPreview modelUrl={model.url} />
                                </Center>
                                
                                {/* Columna 2: Nombre del Modelo */}
                                <Text size="sm" truncate>{model.name.replace(`modelo_producto_${productId}_`, '').replace('.glb', '')}</Text>

                                {/* Columna 3: Estado y Botón de Acción */}
                                <Box>
                                    {model.isActive ? (
                                        <Badge color="green" variant="light" leftSection={<IconCircleCheck size={14}/>}>Activo en AR</Badge>
                                    ) : (
                                        <Button onClick={() => setActiveModel(model.url)} variant="light" size="xs">Activar para AR</Button>
                                    )}
                                </Box>
                            </SimpleGrid>
                        </Paper>
                    )) : <Text c="dimmed">Aún no has generado modelos 3D para este producto.</Text>}
                </Stack>
            </Modal>
        </Paper>
    );
}
function ModelPreview({ modelUrl }) {
    const canvasRef = useRef();

    useEffect(() => {
        if (!canvasRef.current || !modelUrl) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeeeeee);
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.z = 1.5;

        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
        renderer.setSize(100, 100);

        scene.add(new THREE.AmbientLight(0xffffff, 1.5));
        scene.add(new THREE.DirectionalLight(0xffffff, 2));

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false; // Desactivamos el zoom para que sea más simple

        const loader = new GLTFLoader();
        loader.load(modelUrl, (gltf) => {
            scene.add(gltf.scene);
        });

        const animate = () => {
            if (!renderer.domElement.isConnected) return;
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();
        
        return () => renderer.dispose();
    }, [modelUrl]);

    return <canvas ref={canvasRef} style={{ width: 100, height: 100, borderRadius: '4px' }} />;
}

export default ProductSpritePage;