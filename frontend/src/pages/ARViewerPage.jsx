// En src/pages/ARViewerPage.jsx (Versión 2.0 con AR.js 3)

import 'aframe'; // Mantenemos la importación de A-Frame
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader, Center, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

// ¡IMPORTANTE! Añadimos el script de AR.js directamente en el HTML.
// Esta es la forma oficial y más estable de usarlo.
const loadARJS = () => {
    return new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js';
        script.onload = resolve;
        document.body.appendChild(script);
    });
};


function ARViewerPage() {
    const { productId } = useParams();
    const [assetData, setAssetData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const init = async () => {
            await loadARJS(); // Esperamos a que el script de AR.js se cargue

            try {
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/${productId}`;
                const { data } = await axios.get(apiUrl);

                if (data.ActivosDigitales && data.ActivosDigitales.urls_imagenes) {
                    const imageUrl = data.ActivosDigitales.urls_imagenes.perspectiva || data.ActivosDigitales.urls_imagenes.frente || Object.values(data.ActivosDigitales.urls_imagenes)[0];
                    setAssetData({ productName: data.nombre, imageUrl });
                } else {
                    setError('Este producto no tiene una vista de AR disponible.');
                }
            } catch (err) {
                setError('No se pudo cargar el producto.');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [productId]);

    if (loading || !assetData) {
        // Mostramos un loader o un mensaje de error si algo falla
        return <Center h="100vh">{loading ? <Loader /> : <Alert color="red" icon={<IconAlertCircle />}>{error}</Alert>}</Center>;
    }

    // --- ¡LA ESCENA AR, AHORA MÁS SIMPLE Y PODEROSA! ---
    return (
        <a-scene embedded arjs='sourceType: webcam; debugUIEnabled: false;'>
            <a-assets>
                <img id="productSprite" src={assetData.imageUrl} crossOrigin="anonymous" alt={assetData.productName} />
            </a-assets>
            
            {/* 
                - La magia de "siempre mirar a la cámara" se llama 'billboard'.
                - `look-at="[camera]"` también funciona.
                - scale y position los puedes ajustar para que el tamaño y la distancia sean perfectos.
            */}
            <a-image
                src="#productSprite"
                width="1" height="1"
                position="0 0.5 -3"
                look-at="[camera]"
            ></a-image>

            <a-camera-static />
        </a-scene>
    );
}

export default ARViewerPage;