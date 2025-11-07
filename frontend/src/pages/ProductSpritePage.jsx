// --- ARCHIVO CORREGIDO: frontend/src/pages/ProductSpritePage.jsx ---

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Title, Text, Paper, Button, Group, Loader, Center, SimpleGrid, FileButton, Image, Box, Stack, Modal, Divider, SegmentedControl, Slider, Badge, Tabs, Switch } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconBox, IconSettings, IconCircleCheck, IconPhoto, IconAdjustments, IconWand, IconSticker } from '@tabler/icons-react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

// Importar modelos base
import hamburgerModel from '../assets/modelos3d/hamburguesa/Hamburguesa.glb?url';
import vasoModel from '../assets/modelos3d/vaso/Vaso.glb?url';
import alitasModel from '../assets/modelos3d/alitas/source/Chickenwings.glb?url';

const VISTAS = [
    { id: 'frente', label: 'Vista Frontal' },
    { id: 'lado_d', label: 'Lateral Derecho' },
    { id: 'atras', label: 'Vista Trasera' },
    { id: 'lado_i', label: 'Lateral Izquierdo' },
    { id: 'arriba', label: 'Desde Arriba (Cenital)' },
    { id: 'perspectiva', label: 'En Perspectiva' }
];

const MODEL_TEMPLATES = {
    hamburguesa: { name: 'Hamburguesa', path: hamburgerModel, icon: '🍔' },
    vaso: { name: 'Vaso/Bebida', path: vasoModel, icon: '🥤' },
    alitas: { name: 'Alitas', path: alitasModel, icon: '🍗' },
    primitiva: { name: 'Forma Básica', path: null, icon: '📦' }
};

const resizeImage = (file, maxSize = 1024) => new Promise((resolve) => {
    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
        let { width, height } = img;
        if (width > height) {
            if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
            if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
            resolve(new File([blob], file.name.split('.')[0] + '.png', { type: 'image/png' }));
        }, 'image/png', 0.9);
    };
});

function ProductSpritePage() {
    const { id: productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState({});
    const [workshopModalOpen, setWorkshopModalOpen] = useState(false);
    const [galleryModalOpen, setGalleryModalOpen] = useState(false);
    
    // Configuración del modelo
    const [modelType, setModelType] = useState('hamburguesa');
    const [primitiveType, setPrimitiveType] = useState('box');
    const [dimensions, setDimensions] = useState({ w: 1, h: 1, d: 1, r: 0.5 });
    const [bevelSize, setBevelSize] = useState(0.05);
    const [modelScale, setModelScale] = useState(1);

    // Referencias para el sistema de decals
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const baseModelRef = useRef(null);
    const decalMeshesRef = useRef([]); // Array de meshes de decals en la escena
    
    const [decals, setDecals] = useState([]); // Array para guardar datos de las calcomanías
    const [selectedStickerTexture, setSelectedStickerTexture] = useState(null);
    const [stickerMode, setStickerMode] = useState(false);
    
    // Configuración de texturas por vista
    const [textureSettings, setTextureSettings] = useState({
        frente: { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, enabled: true },
        atras: { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, enabled: true },
        lado_d: { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, enabled: true },
        lado_i: { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, enabled: true },
        arriba: { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, enabled: true },
        perspectiva: { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, enabled: false }
    });
    
    const [models, setModels] = useState([]);
    const previewCanvasRef = useRef(null);
    const [selectedTexture, setSelectedTexture] = useState('frente');
    // Nuevos estados para controlar stickers
    const [stickerSize, setStickerSize] = useState(0.5); // Tamaño del sticker
    const [stickerRotation, setStickerRotation] = useState(0); // Rotación del sticker antes de pegar
    const cameraPositionRef = useRef({ x: 2, y: 1.5, z: 3 }); // Guardar posición de cámara
    const [hoveredDecalIndex, setHoveredDecalIndex] = useState(null); // Para highlight
    const [previewDecal, setPreviewDecal] = useState(null); // Preview del sticker antes de pegar

    // Dentro del componente ProductSpritePage
    const handleTextureEnabledChange = () => { // <--- Ya no necesita 'event'
        setTextureSettings(currentSettings => {
            // 1. Leemos el valor ACTUAL directamente desde el estado
            const estadoActual = currentSettings[selectedTexture].enabled;

            // 2. Calculamos el nuevo estado invirtiéndolo
            const nuevoEstado = !estadoActual;
            
            console.log(`Cambiando textura '${selectedTexture}' de ${estadoActual} -> ${nuevoEstado}`);

            // 3. Devolvemos el objeto de estado actualizado y 100% inmutable
            return {
                ...currentSettings,
                [selectedTexture]: {
                    ...currentSettings[selectedTexture],
                    enabled: nuevoEstado, // <--- Usamos el valor invertido
                },
            };
        });
    };

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('authToken');
                const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProduct(data);
                if (data.ActivosDigitales?.urls_imagenes) {
                    const initialImages = Object.entries(data.ActivosDigitales.urls_imagenes).reduce(
                        (acc, [key, value]) => ({ ...acc, [key]: { preview: value, file: null, source: 'db' } }),
                        {}
                    );
                    setImages(initialImages);
                }
            } catch (error) {
                notifications.show({ title: 'Error', message: 'No se pudo cargar el producto.', color: 'red' });
            }
            setLoading(false);
        };
        initialize();
    }, [productId]);


    const removeDecal = (index) => {
        setDecals(prev => prev.filter((_, i) => i !== index));
        notifications.show({
            title: 'Sticker eliminado',
            message: 'El sticker ha sido removido',
            color: 'orange',
            autoClose: 2000
        });
    };
    // VISTA PREVIA 3D CON DECALS
    useEffect(() => {
        if (!workshopModalOpen || !previewCanvasRef.current) return;

        let controls, animationId;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        sceneRef.current = scene;
        
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        // Restaurar posición de cámara guardada
        camera.position.set(
            cameraPositionRef.current.x,
            cameraPositionRef.current.y,
            cameraPositionRef.current.z
        );
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({ canvas: previewCanvasRef.current, antialias: true });
        renderer.setSize(500, 500);
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enabled = !stickerMode;
                
        // Guardar posición de cámara cuando se mueve
        controls.addEventListener('change', () => {
            cameraPositionRef.current = {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            };
        });

        // Iluminación
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 0, -5);
        scene.add(fillLight);

        // Plano de sombra
        const planeGeometry = new THREE.PlaneGeometry(10, 10);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.5;
        plane.receiveShadow = true;
        scene.add(plane);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.setCrossOrigin('anonymous');

        const loadTextures = async () => {
            const loadedTextures = {};
            for (const [key, imageData] of Object.entries(images)) {
                if (imageData?.preview && textureSettings[key]?.enabled) {
                    try {
                        const texture = await textureLoader.loadAsync(imageData.preview);
                        const settings = textureSettings[key];
                        texture.offset.set(settings.offsetX, settings.offsetY);
                        texture.repeat.set(settings.scaleX, settings.scaleY);
                        texture.rotation = settings.rotation * (Math.PI / 180);
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.needsUpdate = true;
                        loadedTextures[key] = texture;
                    } catch (err) {
                        console.warn(`Error loading texture ${key}:`, err);
                    }
                }
            }
            return loadedTextures;
        };

        // Función para añadir decals a la escena
        const addDecalsToScene = (targetMesh) => {
            // Limpiar decals anteriores
            decalMeshesRef.current.forEach(decalMesh => {
                scene.remove(decalMesh);
                if (decalMesh.geometry) decalMesh.geometry.dispose();
                if (decalMesh.material) {
                    if (decalMesh.material.map) decalMesh.material.map.dispose();
                    decalMesh.material.dispose();
                }
            });
            decalMeshesRef.current = [];

            // Añadir cada decal
            decals.forEach(decalData => {
                textureLoader.load(decalData.textureUrl, (texture) => {
                    const decalMaterial = new THREE.MeshPhongMaterial({
                        map: texture,
                        transparent: true,
                        depthTest: true,
                        depthWrite: false,
                        polygonOffset: true,
                        polygonOffsetFactor: -4,
                    });

                    // Crear geometría del decal
                    const decalGeometry = new DecalGeometry(
                        targetMesh,
                        decalData.position,
                        decalData.orientation,
                        decalData.size
                    );

                    const decalMesh = new THREE.Mesh(decalGeometry, decalMaterial);
                    scene.add(decalMesh);
                    decalMeshesRef.current.push(decalMesh);
                }, undefined, (error) => {
                    console.error('Error loading decal texture:', error);
                });
            });
        };

        const buildModel = async () => {
            // Limpiar modelo anterior
            if (baseModelRef.current) {
                scene.remove(baseModelRef.current);
                baseModelRef.current = null;
            }

            const textures = await loadTextures();

            if (modelType === 'primitiva') {
                const { w, h, d, r } = dimensions;
                const greyMaterial = new THREE.MeshStandardMaterial({ color: '#888' });
                let modelMesh;

                if (primitiveType === 'box') {
                // Cubo con bordes redondeados
                const geometry = new THREE.BoxGeometry(w, h, d, 10, 10, 10);
                
                // Aplicar bevel a las aristas
                const positionAttribute = geometry.getAttribute('position');
                const vertex = new THREE.Vector3();
                
                for (let i = 0; i < positionAttribute.count; i++) {
                    vertex.fromBufferAttribute(positionAttribute, i);
                    
                    // Aplicar suavizado en las esquinas
                    const bevel = Math.min(bevelSize, Math.min(w, h, d) / 4);
                    
                    const signX = Math.sign(vertex.x);
                    const signY = Math.sign(vertex.y);
                    const signZ = Math.sign(vertex.z);
                    
                    const absX = Math.abs(vertex.x);
                    const absY = Math.abs(vertex.y);
                    const absZ = Math.abs(vertex.z);
                    
                    // Redondear las esquinas
                    if (absX > w/2 - bevel && absY > h/2 - bevel && absZ > d/2 - bevel) {
                        const cornerX = signX * (w/2 - bevel);
                        const cornerY = signY * (h/2 - bevel);
                        const cornerZ = signZ * (d/2 - bevel);
                        
                        const dx = vertex.x - cornerX;
                        const dy = vertex.y - cornerY;
                        const dz = vertex.z - cornerZ;
                        
                        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                        if (distance > 0) {
                            const normalized = bevel / distance;
                            vertex.x = cornerX + dx * normalized;
                            vertex.y = cornerY + dy * normalized;
                            vertex.z = cornerZ + dz * normalized;
                        }
                    }
                    
                    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
                }
                
                geometry.computeVertexNormals();
                
                const materials = [
                        textures.lado_d ? new THREE.MeshStandardMaterial({ map: textures.lado_d }) : greyMaterial.clone(),
                        textures.lado_i ? new THREE.MeshStandardMaterial({ map: textures.lado_i }) : greyMaterial.clone(),
                        textures.arriba ? new THREE.MeshStandardMaterial({ map: textures.arriba }) : greyMaterial.clone(),
                        textures.arriba ? new THREE.MeshStandardMaterial({ map: textures.arriba }) : greyMaterial.clone(),
                        textures.frente ? new THREE.MeshStandardMaterial({ map: textures.frente }) : greyMaterial.clone(),
                        textures.atras ? new THREE.MeshStandardMaterial({ map: textures.atras }) : greyMaterial.clone()
                    ];
                    modelMesh = new THREE.Mesh(geometry, materials);
                } else if (primitiveType === 'cylinder') {
                    const geometry = new THREE.CylinderGeometry(r, r, h, 32, 10, false);
                    if (bevelSize > 0) {
                    const positionAttribute = geometry.getAttribute('position');
                    const vertex = new THREE.Vector3();
                    const bevel = Math.min(bevelSize, Math.min(r, h/2) * 0.5);
                    
                    for (let i = 0; i < positionAttribute.count; i++) {
                        vertex.fromBufferAttribute(positionAttribute, i);
                        
                        const distFromCenter = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
                        const absY = Math.abs(vertex.y);
                        
                        // Redondear bordes superior e inferior
                        if (absY > (h/2 - bevel) && distFromCenter > (r - bevel)) {
                            const edgeY = Math.sign(vertex.y) * (h/2 - bevel);
                            const edgeR = r - bevel;
                            
                            const dy = vertex.y - edgeY;
                            const dr = distFromCenter - edgeR;
                            
                            const distance = Math.sqrt(dy*dy + dr*dr);
                            if (distance > 0 && distance > bevel) {
                                const normalized = bevel / distance;
                                const angle = Math.atan2(vertex.z, vertex.x);
                                
                                vertex.y = edgeY + dy * normalized;
                                const newR = edgeR + dr * normalized;
                                vertex.x = Math.cos(angle) * newR;
                                vertex.z = Math.sin(angle) * newR;
                            }
                        }
                        
                        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
                    }
                    
                    geometry.computeVertexNormals();
                }
                    const sideTexture = textures.perspectiva || textures.frente;
                    const materials = [
                        sideTexture ? new THREE.MeshStandardMaterial({ map: sideTexture }) : greyMaterial.clone(),
                        textures.arriba ? new THREE.MeshStandardMaterial({ map: textures.arriba }) : greyMaterial.clone(),
                        textures.arriba ? new THREE.MeshStandardMaterial({ map: textures.arriba }) : greyMaterial.clone()
                    ];
                    modelMesh = new THREE.Mesh(geometry, materials);
                } else if (primitiveType === 'sphere') {
                    const geometry = new THREE.SphereGeometry(r, 32, 16);
                    const material = textures.perspectiva ?
                        new THREE.MeshStandardMaterial({ map: textures.perspectiva }) : greyMaterial;
                    modelMesh = new THREE.Mesh(geometry, material);
                }
                
                if (modelMesh) {
                    modelMesh.castShadow = true;
                    scene.add(modelMesh);
                    baseModelRef.current = modelMesh;
                    addDecalsToScene(modelMesh);
                }
            } else {
                // Cargar modelo base
                const loader = new GLTFLoader();
                const modelPath = MODEL_TEMPLATES[modelType].path;
                
                await new Promise((resolve, reject) => {
                    loader.load(modelPath, (gltf) => {
                        const modelMesh = gltf.scene;
                        modelMesh.scale.setScalar(modelScale);
                        
                        // Encontrar el primer mesh para aplicar decals
                        let targetMesh = null;
                        modelMesh.traverse((child) => {
                            if (child.isMesh) {
                                if (!targetMesh) targetMesh = child;
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                const availableTextures = Object.entries(textures).filter(([key, tex]) => tex);
                                
                                if (availableTextures.length > 0) {
                                    const primaryTexture = textures.perspectiva || textures.frente || availableTextures[0][1];
                                    
                                    child.material = new THREE.MeshStandardMaterial({
                                        map: primaryTexture,
                                        roughness: 0.7,
                                        metalness: 0.1
                                    });
                                    
                                    if (child.name) {
                                        const name = child.name.toLowerCase();
                                        
                                        if (name.includes('top') || name.includes('arriba') || name.includes('tapa')) {
                                            if (textures.arriba) child.material.map = textures.arriba;
                                        } else if (name.includes('side') || name.includes('lado') || name.includes('lateral')) {
                                            if (textures.lado_d) child.material.map = textures.lado_d;
                                        } else if (name.includes('back') || name.includes('atras') || name.includes('trasera')) {
                                            if (textures.atras) child.material.map = textures.atras;
                                        } else if (name.includes('front') || name.includes('frente') || name.includes('frontal')) {
                                            if (textures.frente) child.material.map = textures.frente;
                                        }
                                    }
                                }
                            }
                        });
                        
                        scene.add(modelMesh);
                        baseModelRef.current = targetMesh || modelMesh;
                        addDecalsToScene(baseModelRef.current);
                        resolve();
                    }, undefined, reject);
                });
            }
        };

        buildModel();

        // Raycaster para click en el modelo
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const decalSize = new THREE.Vector3(0.3, 0.3, 0.3);

        const onCanvasClick = (event) => {
            if (!stickerMode || !baseModelRef.current || !selectedStickerTexture) return;

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(baseModelRef.current, true);

            if (intersects.length > 0) {
                const intersection = intersects[0];
                const position = intersection.point.clone();
                const orientation = new THREE.Euler();
                orientation.setFromRotationMatrix(new THREE.Matrix4().lookAt(
                    new THREE.Vector3(),
                    intersection.face.normal,
                    new THREE.Vector3(0, 1, 0)
                ));
                
                // Aplicar rotación adicional del slider
                orientation.z += stickerRotation * (Math.PI / 180);

                // Guardar el decal en el estado con el tamaño personalizado
                const decalSize = new THREE.Vector3(stickerSize, stickerSize, stickerSize);
                
                setDecals(prev => [...prev, {
                    position: position.clone(),
                    orientation: orientation.clone(),
                    size: decalSize.clone(),
                    textureUrl: selectedStickerTexture,
                }]);

                notifications.show({
                    title: 'Sticker añadido',
                    message: `Sticker de tamaño ${stickerSize.toFixed(2)} añadido`,
                    color: 'blue',
                    autoClose: 2000
                });
            }
        };


        const canvasElement = previewCanvasRef.current;
        canvasElement.addEventListener('click', onCanvasClick);

        const animate = () => {
            if (!renderer.domElement.isConnected) return;
            animationId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            canvasElement.removeEventListener('click', onCanvasClick);
            
            // Limpiar decals
            decalMeshesRef.current.forEach(decalMesh => {
                scene.remove(decalMesh);
                if (decalMesh.geometry) decalMesh.geometry.dispose();
                if (decalMesh.material) {
                    if (decalMesh.material.map) decalMesh.material.map.dispose();
                    decalMesh.material.dispose();
                }
            });
            decalMeshesRef.current = [];
            
            renderer.dispose();
            controls.dispose();
        };
    }, [workshopModalOpen, modelType, primitiveType, dimensions, bevelSize, modelScale, images, textureSettings, decals, stickerMode, selectedStickerTexture]);

    const handleFileChange = async (file, vistaId) => {
        if (!file) return;
        const resized = await resizeImage(file);
        setImages(prev => ({
            ...prev,
            [vistaId]: { preview: URL.createObjectURL(resized), file: resized, source: 'new' }
        }));
    };

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
            notifications.show({
                title: 'Sin cambios',
                message: 'No hay imágenes nuevas o modificadas para subir.',
                color: 'blue'
            });
            setUploading(false);
            return;
        }
        
        try {
            const token = localStorage.getItem('authToken');
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/images`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            notifications.show({
                title: '¡Éxito!',
                message: 'Las imágenes se han guardado.',
                color: 'green'
            });
            window.location.reload();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudieron subir las imágenes.',
                color: 'red'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateModel = async () => {
        setUploading(true);
        notifications.show({
            id: 'gen-3d',
            title: 'Generando Modelo',
            message: 'Procesando texturas...',
            loading: true,
            autoClose: false
        });

        try {
            const sceneForExport = new THREE.Scene();
            const textureLoader = new THREE.TextureLoader();
            textureLoader.setCrossOrigin('anonymous');

            // Cargar texturas
            const loadedTextures = {};
            for (const [key, imageData] of Object.entries(images)) {
                if (imageData?.preview && textureSettings[key]?.enabled) {
                    const texture = await textureLoader.loadAsync(imageData.preview);
                    const settings = textureSettings[key];
                    texture.offset.set(settings.offsetX, settings.offsetY);
                    texture.repeat.set(settings.scaleX, settings.scaleY);
                    texture.rotation = settings.rotation * (Math.PI / 180);
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    loadedTextures[key] = texture;
                }
            }

            notifications.update({ id: 'gen-3d', message: 'Construyendo geometría...' });

            let baseModelForExport = null;

            if (modelType === 'primitiva') {
                const { w, h, d, r } = dimensions;
                const greyMaterial = new THREE.MeshStandardMaterial({ color: '#888' });
                let mesh;

                if (primitiveType === 'box') {
                    const geometry = new THREE.BoxGeometry(w, h, d, 10, 10, 10);
                    const positionAttribute = geometry.getAttribute('position');
                    const vertex = new THREE.Vector3();
                    
                    for (let i = 0; i < positionAttribute.count; i++) {
                        vertex.fromBufferAttribute(positionAttribute, i);
                        const bevel = Math.min(bevelSize, Math.min(w, h, d) / 4);
                        const signX = Math.sign(vertex.x);
                        const signY = Math.sign(vertex.y);
                        const signZ = Math.sign(vertex.z);
                        const absX = Math.abs(vertex.x);
                        const absY = Math.abs(vertex.y);
                        const absZ = Math.abs(vertex.z);
                        if (absX > w/2 - bevel && absY > h/2 - bevel && absZ > d/2 - bevel) {
                            const cornerX = signX * (w/2 - bevel);
                            const cornerY = signY * (h/2 - bevel);
                            const cornerZ = signZ * (d/2 - bevel);
                            const dx = vertex.x - cornerX;
                            const dy = vertex.y - cornerY;
                            const dz = vertex.z - cornerZ;
                            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                            if (distance > 0) {
                                const normalized = bevel / distance;
                                vertex.x = cornerX + dx * normalized;
                                vertex.y = cornerY + dy * normalized;
                                vertex.z = cornerZ + dz * normalized;
                            }
                        }
                        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
                    }
                    geometry.computeVertexNormals();
                    const materials = [
                        loadedTextures.lado_d ? new THREE.MeshStandardMaterial({ map: loadedTextures.lado_d }) : greyMaterial.clone(),
                        loadedTextures.lado_i ? new THREE.MeshStandardMaterial({ map: loadedTextures.lado_i }) : greyMaterial.clone(),
                        loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial.clone(),
                        loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial.clone(),
                        loadedTextures.frente ? new THREE.MeshStandardMaterial({ map: loadedTextures.frente }) : greyMaterial.clone(),
                        loadedTextures.atras ? new THREE.MeshStandardMaterial({ map: loadedTextures.atras }) : greyMaterial.clone()
                    ];
                    mesh = new THREE.Mesh(geometry, materials);
                } else if (primitiveType === 'cylinder') {
                    const geometry = new THREE.CylinderGeometry(r, r, h, 32, 10, false);
                    if (bevelSize > 0) {
                        const positionAttribute = geometry.getAttribute('position');
                        const vertex = new THREE.Vector3();
                        const bevel = Math.min(bevelSize, Math.min(r, h/2) * 0.5);
                        
                        for (let i = 0; i < positionAttribute.count; i++) {
                            vertex.fromBufferAttribute(positionAttribute, i);
                            const distFromCenter = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
                            const absY = Math.abs(vertex.y);
                            if (absY > (h/2 - bevel) && distFromCenter > (r - bevel)) {
                                const edgeY = Math.sign(vertex.y) * (h/2 - bevel);
                                const edgeR = r - bevel;
                                const dy = vertex.y - edgeY;
                                const dr = distFromCenter - edgeR;
                                const distance = Math.sqrt(dy*dy + dr*dr);
                                if (distance > 0 && distance > bevel) {
                                    const normalized = bevel / distance;
                                    const angle = Math.atan2(vertex.z, vertex.x);
                                    vertex.y = edgeY + dy * normalized;
                                    const newR = edgeR + dr * normalized;
                                    vertex.x = Math.cos(angle) * newR;
                                    vertex.z = Math.sin(angle) * newR;
                                }
                            }
                            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
                        }
                        geometry.computeVertexNormals();
                    }
                    const sideTexture = loadedTextures.perspectiva || loadedTextures.frente;
                    const materials = [
                        sideTexture ? new THREE.MeshStandardMaterial({ map: sideTexture }) : greyMaterial.clone(),
                        loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial.clone(),
                        loadedTextures.arriba ? new THREE.MeshStandardMaterial({ map: loadedTextures.arriba }) : greyMaterial.clone()
                    ];
                    mesh = new THREE.Mesh(geometry, materials);
                } else if (primitiveType === 'sphere') {
                    const geometry = new THREE.SphereGeometry(r, 32, 16);
                    const material = loadedTextures.perspectiva ?
                        new THREE.MeshStandardMaterial({ map: loadedTextures.perspectiva }) :
                        greyMaterial;
                    mesh = new THREE.Mesh(geometry, material);
                }

                if (mesh) {
                    sceneForExport.add(mesh);
                    baseModelForExport = mesh;
                }
            } else {
                const loader = new GLTFLoader();
                const modelPath = MODEL_TEMPLATES[modelType].path;

                await new Promise((resolve, reject) => {
                    loader.load(modelPath, (gltf) => {
                        const model = gltf.scene;
                        model.scale.setScalar(modelScale);

                        let targetMesh = null;
                        model.traverse((child) => {
                            if (child.isMesh) {
                                if (!targetMesh) targetMesh = child;
                                const availableTextures = Object.entries(loadedTextures).filter(([key, tex]) => tex);
                                
                                if (availableTextures.length > 0) {
                                    const primaryTexture = loadedTextures.perspectiva || loadedTextures.frente || availableTextures[0][1];
                                    
                                    child.material = new THREE.MeshStandardMaterial({
                                        map: primaryTexture,
                                        roughness: 0.7,
                                        metalness: 0.1
                                    });
                                    
                                    if (child.name) {
                                        const name = child.name.toLowerCase();
                                        
                                        if (name.includes('top') || name.includes('arriba') || name.includes('tapa')) {
                                            if (loadedTextures.arriba) child.material.map = loadedTextures.arriba;
                                        } else if (name.includes('side') || name.includes('lado') || name.includes('lateral')) {
                                            if (loadedTextures.lado_d) child.material.map = loadedTextures.lado_d;
                                        } else if (name.includes('back') || name.includes('atras') || name.includes('trasera')) {
                                            if (loadedTextures.atras) child.material.map = loadedTextures.atras;
                                        } else if (name.includes('front') || name.includes('frente') || name.includes('frontal')) {
                                            if (loadedTextures.frente) child.material.map = loadedTextures.frente;
                                        }
                                    }
                                    
                                    child.material.needsUpdate = true;
                                }
                            }
                        });

                        sceneForExport.add(model);
                        baseModelForExport = targetMesh || model;
                        resolve();
                    }, undefined, reject);
                });
            }

            // Añadir decals al modelo de exportación
            notifications.update({ id: 'gen-3d', message: 'Aplicando stickers...' });
            
            const decalPromises = decals.map(decalData => {
                return new Promise((resolve) => {
                    textureLoader.load(decalData.textureUrl, (texture) => {
                        const decalMaterial = new THREE.MeshPhongMaterial({
                            map: texture,
                            transparent: true,
                            depthTest: true,
                            depthWrite: false,
                            polygonOffset: true,
                            polygonOffsetFactor: -4,
                        });

                        const decalGeometry = new DecalGeometry(
                            baseModelForExport,
                            decalData.position,
                            decalData.orientation,
                            decalData.size
                        );

                        const decalMesh = new THREE.Mesh(decalGeometry, decalMaterial);
                        sceneForExport.add(decalMesh);
                        resolve();
                    }, undefined, () => {
                        console.error('Error loading decal texture');
                        resolve();
                    });
                });
            });

            await Promise.all(decalPromises);

            notifications.update({ id: 'gen-3d', message: 'Exportando a GLB...' });

            const exporter = new GLTFExporter();
            exporter.parse(
                sceneForExport,
                async (gltfData) => {
                    try {
                        const blob = new Blob([gltfData], { type: 'model/gltf-binary' });
                        const fileName = `modelo_${productId}_${modelType}_${Date.now()}.glb`;
                        const file = new File([blob], fileName);

                        const formData = new FormData();
                        formData.append('modelFile', file);

                        const token = localStorage.getItem('authToken');
                        await axios.post(
                            `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/model`,
                            formData,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );

                        notifications.update({
                            id: 'gen-3d',
                            title: '¡Éxito!',
                            message: `Modelo con ${decals.length} stickers guardado correctamente.`,
                            color: 'green',
                            loading: false,
                            autoClose: 5000
                        });
                    } catch (error) {
                        notifications.update({
                            id: 'gen-3d',
                            title: 'Error',
                            message: 'No se pudo guardar el modelo.',
                            color: 'red',
                            loading: false
                        });
                    } finally {
                        setUploading(false);
                        setWorkshopModalOpen(false);
                    }
                },
                (error) => {
                    console.error(error);
                    throw new Error('Error en la exportación.');
                },
                { binary: true, embedImages: true }
            );
        } catch (error) {
            notifications.update({
                id: 'gen-3d',
                title: 'Error',
                message: error.message,
                color: 'red',
                loading: false,
                autoClose: 5000
            });
            setUploading(false);
        }
    };

    const fetchModels = async () => {
        setGalleryModalOpen(true);
        try {
            const token = localStorage.getItem('authToken');
            const { data } = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/models`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setModels(data);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los modelos.',
                color: 'red'
            });
        }
    };

    const setActiveModel = async (modelUrl) => {
        try {
            const token = localStorage.getItem('authToken');
            await axios.put(
                `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}/assets/set-active-model`,
                { modelUrl },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            notifications.show({
                title: '¡Actualizado!',
                message: 'El nuevo modelo está activo para la experiencia AR.',
                color: 'green'
            });
            setModels(models.map(m => ({ ...m, isActive: m.url === modelUrl })));
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo activar el modelo.',
                color: 'red'
            });
        }
    };

    if (loading) return <Center h="80vh"><Loader /></Center>;

    return (
        <Paper withBorder p="xl">
            <Title order={3}>Estudio Fotográfico AR 2.0</Title>
            <Text c="dimmed" mb="xl">
                Producto: <Text span fw={700}>{product?.nombre}</Text>
            </Text>

            <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="lg">
                {VISTAS.map((vista) => (
                    <Stack key={vista.id} align="center" gap="xs">
                        <Text fw={500} size="sm">{vista.label}</Text>
                        <Box
                            w={150}
                            h={150}
                            style={{
                                border: '2px dashed #ccc',
                                borderRadius: '8px',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f8f9fa'
                            }}
                        >
                            <Image
                                radius="sm"
                                src={images[vista.id]?.preview}
                                fit="contain"
                                style={{
                                    display: images[vista.id] ? 'block' : 'none',
                                    width: '100%',
                                    height: '100%'
                                }}
                            />
                            {!images[vista.id] && <IconPhoto color="gray" />}
                        </Box>
                        <FileButton
                            onChange={(file) => handleFileChange(file, vista.id)}
                            accept="image/png,image/jpeg,image/webp"
                        >
                            {(props) => (
                                <Button {...props} variant="light" size="xs">
                                    {images[vista.id] ? 'Cambiar' : 'Subir'}
                                </Button>
                            )}
                        </FileButton>
                    </Stack>
                ))}
            </SimpleGrid>

            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={() => navigate('/admin/products')}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmitImages}
                    loading={uploading}
                    leftSection={<IconUpload size={16} />}
                >
                    Guardar Imágenes 2D
                </Button>
            </Group>

            <Divider my="xl" label="Gestión de Modelos 3D para AR" labelPosition="center" />

            <Group justify="center">
                <Button
                    onClick={() => setWorkshopModalOpen(true)}
                    disabled={Object.keys(images).length < 6}
                    leftSection={<IconWand size={18} />}
                    size="md"
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan' }}
                >
                    Taller de Creación 3D con Stickers
                </Button>
                <Button
                    onClick={fetchModels}
                    leftSection={<IconSettings size={18} />}
                    variant="outline"
                    size="md"
                >
                    Administrar Modelos
                </Button>
            </Group>
            {Object.keys(images).length < 6 && (
                <Text size="xs" c="dimmed" ta="center" mt="xs">
                    Sube las 6 imágenes para activar el taller de creación 3D.
                </Text>
            )}

            {/* MODAL DEL TALLER CON DECALS */}
            <Modal
                opened={workshopModalOpen}
                onClose={() => {
                    setWorkshopModalOpen(false);
                    setStickerMode(false);
                }}
                title="🎨 Taller de Creación 3D con Stickers"
                size="90%"
                centered
            >
                <SimpleGrid cols={2} spacing="xl">
                    {/* PANEL IZQUIERDO: CONFIGURACIÓN */}
                    <Stack>
                        <Tabs defaultValue="model">
                            <Tabs.List>
                                <Tabs.Tab value="model" leftSection={<IconBox size={14} />}>
                                    Modelo Base
                                </Tabs.Tab>
                                <Tabs.Tab value="textures" leftSection={<IconAdjustments size={14} />}>
                                    Ajustar Texturas
                                </Tabs.Tab>
                                <Tabs.Tab value="stickers" leftSection={<IconSticker size={14} />}>
                                    Stickers / Calcomanías
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="model" pt="md">
                                <Stack>
                                    <Text fw={500}>1. Selecciona el Tipo de Modelo</Text>
                                    <SimpleGrid cols={2} spacing="sm">
                                        {Object.entries(MODEL_TEMPLATES).map(([key, template]) => (
                                            <Button
                                                key={key}
                                                variant={modelType === key ? 'filled' : 'outline'}
                                                onClick={() => setModelType(key)}
                                                leftSection={<span>{template.icon}</span>}
                                            >
                                                {template.name}
                                            </Button>
                                        ))}
                                    </SimpleGrid>

                                    {modelType === 'primitiva' && (
                                        <>
                                            <Text fw={500} mt="md">2. Elige una Forma Base</Text>
                                            <SegmentedControl
                                                value={primitiveType}
                                                onChange={setPrimitiveType}
                                                data={[
                                                    { label: 'Cubo', value: 'box' },
                                                    { label: 'Cilindro', value: 'cylinder' },
                                                    { label: 'Esfera', value: 'sphere' }
                                                ]}
                                                fullWidth
                                            />

                                            <Text fw={500} mt="md">3. Ajusta las Dimensiones</Text>
                                            {primitiveType === 'box' && (
                                                <>
                                                    <Text size="sm">Ancho:</Text>
                                                    <Slider
                                                        value={dimensions.w}
                                                        onChange={v => setDimensions(d => ({ ...d, w: v }))}
                                                        min={0.1}
                                                        max={3}
                                                        step={0.05}
                                                        label={v => v.toFixed(2)}
                                                    />
                                                    <Text size="sm">Alto:</Text>
                                                    <Slider
                                                        value={dimensions.h}
                                                        onChange={v => setDimensions(d => ({ ...d, h: v }))}
                                                        min={0.1}
                                                        max={3}
                                                        step={0.05}
                                                        label={v => v.toFixed(2)}
                                                    />
                                                    <Text size="sm">Profundidad:</Text>
                                                    <Slider
                                                        value={dimensions.d}
                                                        onChange={v => setDimensions(d => ({ ...d, d: v }))}
                                                        min={0.1}
                                                        max={3}
                                                        step={0.05}
                                                        label={v => v.toFixed(2)}
                                                    />
                                                    <Text size="sm" mt="md">Redondeo de Esquinas:</Text>
                                                    <Slider
                                                        value={bevelSize}
                                                        onChange={setBevelSize}
                                                        min={0}
                                                        max={0.3}
                                                        step={0.01}
                                                        label={v => v.toFixed(2)}
                                                        marks={[
                                                            { value: 0, label: 'Recto' },
                                                            { value: 0.05, label: 'Suave' },
                                                            { value: 0.15, label: 'Redondeado' },
                                                            { value: 0.3, label: 'Muy Redondeado' }
                                                        ]}
                                                    />
                                                </>
                                            )}
                                            {primitiveType === 'cylinder' && (
                                                <>
                                                    <Text size="sm">Radio:</Text>
                                                    <Slider
                                                        value={dimensions.r}
                                                        onChange={v => setDimensions(d => ({ ...d, r: v }))}
                                                        min={0.1}
                                                        max={2}
                                                        step={0.05}
                                                        label={v => v.toFixed(2)}
                                                    />
                                                    <Text size="sm">Altura:</Text>
                                                    <Slider
                                                        value={dimensions.h}
                                                        onChange={v => setDimensions(d => ({ ...d, h: v }))}
                                                        min={0.1}
                                                        max={3}
                                                        step={0.05}
                                                        label={v => v.toFixed(2)}
                                                    />
                                                    <Text size="sm" mt="md">Redondeo de Bordes:</Text>
                                                    <Slider
                                                        value={bevelSize}
                                                        onChange={setBevelSize}
                                                        min={0}
                                                        max={0.2}
                                                        step={0.01}
                                                        label={v => v.toFixed(2)}
                                                        marks={[
                                                            { value: 0, label: 'Recto' },
                                                            { value: 0.05, label: 'Suave' },
                                                            { value: 0.1, label: 'Redondeado' }
                                                        ]}
                                                    />
                                                </>
                                            )}
                                            {primitiveType === 'sphere' && (
                                                <>
                                                    <Text size="sm">Radio:</Text>
                                                    <Slider
                                                        value={dimensions.r}
                                                        onChange={v => setDimensions(d => ({ ...d, r: v }))}
                                                        min={0.1}
                                                        max={2}
                                                        step={0.05}
                                                        label={v => v.toFixed(2)}
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}

                                    {modelType !== 'primitiva' && (
                                        <>
                                            <Text fw={500} mt="md">2. Escala del Modelo</Text>
                                            <Slider
                                                value={modelScale}
                                                onChange={setModelScale}
                                                min={0.1}
                                                max={3}
                                                step={0.1}
                                                label={v => `${v.toFixed(1)}x`}
                                                marks={[
                                                    { value: 0.5, label: '0.5x' },
                                                    { value: 1, label: '1x' },
                                                    { value: 2, label: '2x' }
                                                ]}
                                            />
                                        </>
                                    )}

                                    <Button
                                        onClick={handleGenerateModel}
                                        loading={uploading}
                                        mt="xl"
                                        size="lg"
                                        fullWidth
                                        leftSection={<IconWand size={18} />}
                                    >
                                        Generar y Guardar Modelo
                                    </Button>
                                </Stack>
                            </Tabs.Panel>

                            <Tabs.Panel value="textures" pt="md">
                                <Stack>
                                    <Text fw={500}>Ajusta las Texturas por Vista</Text>
                                    <SegmentedControl
                                        value={selectedTexture}
                                        onChange={setSelectedTexture}
                                        data={VISTAS.slice(0, 5).map(v => ({
                                            label: v.label.split(' ')[0],
                                            value: v.id
                                        }))}
                                        fullWidth
                                    />

                                    {selectedTexture && textureSettings[selectedTexture] && (
                                        <Stack mt="md">
                                            <Switch
                                                label="Habilitar esta textura"
                                                checked={textureSettings[selectedTexture].enabled}
                                                onChange={handleTextureEnabledChange}
                                            />

                                            {textureSettings[selectedTexture].enabled && (
                                                <>
                                                    <Text size="sm" fw={500}>Posición Horizontal (Offset X):</Text>
                                                    <Slider
                                                        value={textureSettings[selectedTexture].offsetX}
                                                        onChange={(v) =>
                                                            setTextureSettings(prev => ({
                                                                ...prev,
                                                                [selectedTexture]: {
                                                                    ...prev[selectedTexture],
                                                                    offsetX: v
                                                                }
                                                            }))
                                                        }
                                                        min={-1}
                                                        max={1}
                                                        step={0.01}
                                                        label={v => v.toFixed(2)}
                                                    />

                                                    <Text size="sm" fw={500}>Posición Vertical (Offset Y):</Text>
                                                    <Slider
                                                        value={textureSettings[selectedTexture].offsetY}
                                                        onChange={(v) =>
                                                            setTextureSettings(prev => ({
                                                                ...prev,
                                                                [selectedTexture]: {
                                                                    ...prev[selectedTexture],
                                                                    offsetY: v
                                                                }
                                                            }))
                                                        }
                                                        min={-1}
                                                        max={1}
                                                        step={0.01}
                                                        label={v => v.toFixed(2)}
                                                    />

                                                    <Text size="sm" fw={500}>Escala Horizontal:</Text>
                                                    <Slider
                                                        value={textureSettings[selectedTexture].scaleX}
                                                        onChange={(v) =>
                                                            setTextureSettings(prev => ({
                                                                ...prev,
                                                                [selectedTexture]: {
                                                                    ...prev[selectedTexture],
                                                                    scaleX: v
                                                                }
                                                            }))
                                                        }
                                                        min={0.1}
                                                        max={3}
                                                        step={0.1}
                                                        label={v => `${v.toFixed(1)}x`}
                                                    />

                                                    <Text size="sm" fw={500}>Escala Vertical:</Text>
                                                    <Slider
                                                        value={textureSettings[selectedTexture].scaleY}
                                                        onChange={(v) =>
                                                            setTextureSettings(prev => ({
                                                                ...prev,
                                                                [selectedTexture]: {
                                                                    ...prev[selectedTexture],
                                                                    scaleY: v
                                                                }
                                                            }))
                                                        }
                                                        min={0.1}
                                                        max={3}
                                                        step={0.1}
                                                        label={v => `${v.toFixed(1)}x`}
                                                    />

                                                    <Text size="sm" fw={500}>Rotación:</Text>
                                                    <Slider
                                                        value={textureSettings[selectedTexture].rotation}
                                                        onChange={(v) =>
                                                            setTextureSettings(prev => ({
                                                                ...prev,
                                                                [selectedTexture]: {
                                                                    ...prev[selectedTexture],
                                                                    rotation: v
                                                                }
                                                            }))
                                                        }
                                                        min={0}
                                                        max={360}
                                                        step={5}
                                                        label={v => `${v}°`}
                                                    />

                                                    <Button
                                                        onClick={() =>
                                                            setTextureSettings(prev => ({
                                                                ...prev,
                                                                [selectedTexture]: {
                                                                    offsetX: 0,
                                                                    offsetY: 0,
                                                                    scaleX: 1,
                                                                    scaleY: 1,
                                                                    rotation: 0,
                                                                    enabled: true
                                                                }
                                                            }))
                                                        }
                                                        variant="light"
                                                        size="xs"
                                                        mt="sm"
                                                    >
                                                        Resetear Ajustes
                                                    </Button>
                                                </>
                                            )}
                                        </Stack>
                                    )}
                                </Stack>
                            </Tabs.Panel>

                            <Tabs.Panel value="stickers" pt="md">
                                <Stack>
                                    <Badge color={stickerMode ? 'green' : 'gray'} size="lg">
                                        {stickerMode ? '✓ Modo Sticker ACTIVO' : 'Modo Sticker INACTIVO'}
                                    </Badge>
                                    
                                    <Text fw={500}>1. Selecciona una imagen para usar como sticker</Text>
                                    <SimpleGrid cols={3} spacing="xs">
                                        {Object.entries(images).map(([key, imgData]) => (
                                            imgData?.preview && (
                                                <Box
                                                    key={key}
                                                    style={{
                                                        cursor: 'pointer',
                                                        border: selectedStickerTexture === imgData.preview 
                                                            ? '3px solid #228be6' 
                                                            : '2px solid transparent',
                                                        borderRadius: '8px',
                                                        padding: '4px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onClick={() => setSelectedStickerTexture(imgData.preview)}
                                                >
                                                    <Image
                                                        src={imgData.preview}
                                                        radius="sm"
                                                        fit="cover"
                                                        h={80}
                                                    />
                                                    <Text size="xs" ta="center" mt={4}>
                                                        {VISTAS.find(v => v.id === key)?.label}
                                                    </Text>
                                                </Box>
                                            )
                                        ))}
                                    </SimpleGrid>
                                    
                                    <Divider my="md" />
                                    
                                    {/* CONTROLES DE TAMAÑO Y ROTACIÓN */}
                                    {selectedStickerTexture && (
                                        <>
                                            <Text fw={500}>2. Ajusta el tamaño del sticker</Text>
                                            <Group grow>
                                                <Box>
                                                    <Text size="sm" mb={5}>Tamaño: {stickerSize.toFixed(2)}x</Text>
                                                    <Slider
                                                        value={stickerSize}
                                                        onChange={setStickerSize}
                                                        min={0.1}
                                                        max={2}
                                                        step={0.05}
                                                        label={(v) => `${v.toFixed(2)}x`}
                                                        marks={[
                                                            { value: 0.3, label: 'Pequeño' },
                                                            { value: 0.5, label: 'Normal' },
                                                            { value: 1, label: 'Grande' },
                                                            { value: 1.5, label: 'Muy Grande' }
                                                        ]}
                                                    />
                                                </Box>
                                            </Group>

                                            <Text fw={500} mt="md">3. Ajusta la rotación del sticker</Text>
                                            <Group grow>
                                                <Box>
                                                    <Text size="sm" mb={5}>Rotación: {stickerRotation}°</Text>
                                                    <Slider
                                                        value={stickerRotation}
                                                        onChange={setStickerRotation}
                                                        min={0}
                                                        max={360}
                                                        step={15}
                                                        label={(v) => `${v}°`}
                                                        marks={[
                                                            { value: 0, label: '0°' },
                                                            { value: 90, label: '90°' },
                                                            { value: 180, label: '180°' },
                                                            { value: 270, label: '270°' }
                                                        ]}
                                                    />
                                                </Box>
                                            </Group>

                                            <Divider my="md" />
                                        </>
                                    )}
                                    
                                    <Switch
                                        size="lg"
                                        label="Activar Modo 'Pegar Sticker'"
                                        description="Cuando esté activo, haz click en el modelo 3D para añadir stickers"
                                        checked={stickerMode}
                                        onChange={(event) => setStickerMode(event.currentTarget.checked)}
                                        disabled={!selectedStickerTexture}
                                        color="blue"
                                    />

                                    {!selectedStickerTexture && (
                                        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                                            Primero selecciona una imagen arriba para usar como sticker
                                        </Text>
                                    )}

                                    <Divider my="md" />

                                    {/* LISTA DE STICKERS AÑADIDOS */}
                                    <Group justify="space-between">
                                        <Badge variant="light" size="lg">
                                            {decals.length} sticker(s) añadido(s)
                                        </Badge>
                                        <Button 
                                            size="xs" 
                                            variant="light" 
                                            color="red" 
                                            onClick={() => {
                                                setDecals([]);
                                                notifications.show({
                                                    title: 'Stickers eliminados',
                                                    message: 'Todos los stickers han sido removidos',
                                                    color: 'orange'
                                                });
                                            }}
                                            disabled={decals.length === 0}
                                        >
                                            Limpiar todos los stickers
                                        </Button>
                                    </Group>

                                    {/* LISTA DE STICKERS INDIVIDUALES */}
                                    {decals.length > 0 && (
                                        <Stack mt="md" gap="xs">
                                            <Text fw={500} size="sm">Stickers añadidos:</Text>
                                            {decals.map((decal, index) => (
                                                <Paper key={index} p="xs" withBorder radius="md">
                                                    <Group justify="space-between">
                                                        <Group gap="xs">
                                                            <Badge size="sm" variant="light">#{index + 1}</Badge>
                                                            <Text size="xs">
                                                                Tamaño: {decal.size.x.toFixed(2)}
                                                            </Text>
                                                        </Group>
                                                        <Button 
                                                            size="xs" 
                                                            variant="subtle" 
                                                            color="red"
                                                            onClick={() => removeDecal(index)}
                                                        >
                                                            Eliminar
                                                        </Button>
                                                    </Group>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    )}

                                    <Text size="xs" c="dimmed" mt="md">
                                        💡 <strong>Tip:</strong> Ajustá el tamaño y la rotación ANTES de hacer click en el modelo. 
                                        Los stickers se añaden con la configuración actual.
                                    </Text>
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>
                    </Stack>

                    {/* PANEL DERECHO: VISTA PREVIA */}
                    <Stack align="center">
                        <Badge size="lg" variant="light" color="blue">
                            Vista Previa 3D Interactiva
                        </Badge>
                        {stickerMode && (
                            <Badge size="md" color="green" variant="filled">
                                🎯 Click en el modelo para añadir stickers
                            </Badge>
                        )}
                        <Box
                            w={500}
                            h={500}
                            style={{
                                border: stickerMode ? '3px solid #51cf66' : '2px solid #228be6',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                cursor: stickerMode ? 'crosshair' : 'grab'
                            }}
                        >
                            <canvas ref={previewCanvasRef} />
                        </Box>
                        <Text size="xs" c="dimmed" ta="center">
                            {stickerMode 
                                ? '🎯 Click para añadir sticker • Desactiva el modo para rotar'
                                : '🖱️ Arrastra para rotar • 🖱️ Rueda para hacer zoom'
                            }
                        </Text>
                        <Text size="xs" c="dimmed" ta="center">
                            💡 Los cambios se aplican en tiempo real
                        </Text>
                    </Stack>
                </SimpleGrid>
            </Modal>

            {/* MODAL DE GALERÍA */}
            <Modal
                opened={galleryModalOpen}
                onClose={() => setGalleryModalOpen(false)}
                title="Administrar Modelos 3D"
                size="xl"
                centered
            >
                <Stack>
                    {models.length > 0 ? (
                        models.map((model) => (
                            <Paper withBorder p="sm" key={model.name} radius="md">
                                <SimpleGrid cols={3} spacing="md" style={{ alignItems: 'center' }}>
                                    <Center>
                                        <ModelPreview modelUrl={model.url} />
                                    </Center>

                                    <Text size="sm" truncate>
                                        {model.name
                                            .replace(`modelo_producto_${productId}_`, '')
                                            .replace('.glb', '')}
                                    </Text>

                                    <Box>
                                        {model.isActive ? (
                                            <Badge
                                                color="green"
                                                variant="light"
                                                leftSection={<IconCircleCheck size={14} />}
                                            >
                                                Activo en AR
                                            </Badge>
                                        ) : (
                                            <Button
                                                onClick={() => setActiveModel(model.url)}
                                                variant="light"
                                                size="xs"
                                            >
                                                Activar para AR
                                            </Button>
                                        )}
                                    </Box>
                                </SimpleGrid>
                            </Paper>
                        ))
                    ) : (
                        <Text c="dimmed">Aún no has generado modelos 3D para este producto.</Text>
                    )}
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
        controls.enableZoom = false;

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