// En src/pages/ManualImageEditorPage.jsx (Versión Final-Simple y Funcional)

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PinturaEditor } from '@pqina/react-pintura';
import '@pqina/pintura/pintura.css';

// ----- ¡LA IMPORTACIÓN LIMPIA Y CORRECTA! -----
// Solo importamos las herramientas que SÍ existen. ¡Adiós a los idiomas por ahora!
import {
    createDefaultImageReader,
    createDefaultImageWriter,
    plugin_crop,
    plugin_finetune,
    markup_editor_defaults, // <--- Este es para el layout de la UI
} from '@pqina/pintura';
// ---------------------------------------------

import { Center, Loader } from '@mantine/core';

function ManualImageEditorPage() {
    const { productId, vistaId } = useParams();
    const navigate = useNavigate();
    const [imageSrc, setImageSrc] = useState(null);

    useEffect(() => {
        // ... (Tu useEffect para cargar la imagen está perfecto) ...
    }, [productId, navigate]);

    // --- MANEJADOR DEL RESULTADO ---
    const handleProcess = async ({ dest }) => {
        const reader = new FileReader();
        reader.readAsDataURL(dest);
        reader.onloadend = () => {
            const base64data = reader.result;
            sessionStorage.setItem('editedImage', JSON.stringify({
                vistaId: vistaId,
                fileData: base64data,
            }));
            navigate(`/admin/products/sprites/${productId}`);
        };
    };
    
    const handleClose = () => navigate(`/admin/products/sprites/${productId}`);

    if (!imageSrc) return <Center h="100vh"><Loader /></Center>;

    return (
        <div style={{ height: '100vh', width: '100vw' }}>
            {/* ----- ¡LA CONFIGURACIÓN LIMPIA Y CORRECTA! ----- */}
            <PinturaEditor
                // Ya no usamos la variable fantasma 'editorDefaults'
                src={imageSrc}
                imageReader={createDefaultImageReader()}
                imageWriter={createDefaultImageWriter()}
                plugins={[
                    [plugin_crop, { cropAspectRatio: 1 }],
                    [plugin_finetune],
                ]}
                markupEditor={markup_editor_defaults} 
                onProcess={handleProcess}
                onClose={handleClose}
                onLoaderror={(error) => console.error('Error al cargar la imagen en Pintura:', error)}
            />
        </div>
    );
}

export default ManualImageEditorPage;