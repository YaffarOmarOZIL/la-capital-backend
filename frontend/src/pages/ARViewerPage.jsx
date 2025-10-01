// En src/pages/ARViewerPage.jsx (Versión 2.0 - Funcional)

import 'aframe'; // ¡Importante! Mantenemos esto
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Loader, Center, Alert, Button } from '@mantine/core';

function ARViewerPage() {
    const { productId } = useParams();
    const [assetData, setAssetData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // --- Carga los datos del producto desde nuestra NUEVA RUTA PÚBLICA ---
        const fetchAssetData = async () => {
            try {
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/public/${productId}`;
                const { data } = await axios.get(apiUrl);

                if (data.ActivosDigitales?.urls_imagenes) {
                    // Cogemos la imagen de perspectiva, o la frontal, o la que sea.
                    const imageUrl = data.ActivosDigitales.urls_imagenes.perspectiva || data.ActivosDigitales.urls_imagenes.frente || Object.values(data.ActivosDigitales.urls_imagenes)[0];
                    if (!imageUrl) throw new Error();
                    setAssetData({ imageUrl });
                } else {
                    throw new Error();
                }
            } catch (err) {
                setError('Este producto no tiene una vista de AR disponible.');
            } finally {
                setLoading(false);
            }
        };

        // Inyectamos el script de AR.js
        const arjsScript = document.createElement('script');
        arjsScript.src = "https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js";
        arjsScript.onload = fetchAssetData;
        document.body.appendChild(arjsScript);

        return () => { document.body.removeChild(arjsScript); }; // Limpiamos al salir
    }, [productId]);

    if (loading) return <Center h="100vh"><Loader /></Center>;
    if (error) return <Center h="100vh" p="md"><Alert color="red">{error}</Alert></Center>;
    if (!assetData) return <Center h="100vh"><Alert color="yellow">No se encontró el activo para mostrar.</Alert></Center>;

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <a-scene embedded arjs='sourceType: webcam; trackingMethod: best; debugUIEnabled: false;'>
                <a-assets>
                    <img id="sprite" src={assetData.imageUrl} crossOrigin="anonymous" alt="Product Sprite"/>
                </a-assets>
                
                {/* Nuestra imagen "Sprite" que siempre mira a la cámara */}
                <a-image src="#sprite" width="1" height="1" position="0 0.5 -3" look-at="[camera]"></a-image>

                <a-camera-static />
            </a-scene>
            {/* ¡BONUS! Un botón para volver atrás, ¡esencial para la UX! */}
            <Button component={Link} to="/experiencia-cliente" variant="default" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                Volver
            </Button>
        </div>
    );
}

export default ARViewerPage;