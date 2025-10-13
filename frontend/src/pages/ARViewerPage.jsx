// En src/pages/ARViewerPage.jsx (Versión FINAL Y OFICIAL)
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
        const fetchAssetData = async () => {
            try {
                const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/products/public/${productId}`;
                const { data } = await axios.get(apiUrl);
                if (data.ActivosDigitales?.urls_imagenes) {
                    const imageUrl = data.ActivosDigitales.urls_imagenes.perspectiva || data.ActivosDigitales.urls_imagenes.frente || Object.values(data.ActivosDigitales.urls_imagenes)[0];
                    if (!imageUrl) throw new Error();
                    setAssetData({ imageUrl });
                } else {
                    throw new Error();
                }
            } catch (err) { setError('Este producto no tiene una vista de AR disponible.'); }
            finally { setLoading(false); }
        };
        fetchAssetData();
    }, [productId]);

    if (loading) return <Center h="100vh"><Loader /></Center>;
    if (error || !assetData) return <Center h="100vh"><Alert color="red">{error || 'No se encontró el producto.'}</Alert></Center>;

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            {/* ----- ¡LA ESCENA AR, 100% SEGÚN LA DOCUMENTACIÓN! ----- */}
            <a-scene embedded arjs='sourceType: webcam; debugUIEnabled: false;'>
                <a-assets>
                    <img id="sprite" src={assetData.imageUrl} crossOrigin="anonymous" alt="Sprite del Producto"/>
                </a-assets>
                
                {/* 
                    Le decimos que busque el marcador "hiro" (el que ya conoce).
                    ¡La magia es que el Sprite ahora estará "pegado" al marcador!
                */}
                <a-marker preset='hiro'>
                    <a-image 
                        src="#sprite"
                        width="1.5" height="1.5"
                        position="0 0.5 0"
                        rotation="-90 0 0" // Lo ponemos "plano" sobre el marcador
                        look-at="[camera]" // ¡Y hacemos que nos mire siempre!
                    ></a-image>
                </a-marker>
                
                <a-camera-static />
            </a-scene>
            
            <Button component={Link} to="/experiencia-cliente" variant="default" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                Volver
            </Button>
        </div>
    );
}

export default ARViewerPage;