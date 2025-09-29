// En src/hooks/useClientAuth.js (Versión 2.0 - ¡A prueba de fantasmas!)

import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const useClientAuth = () => {
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    // Tu useEffect original está perfecto para la carga inicial
    useEffect(() => {
        try {
            const token = localStorage.getItem('clientAuthToken');
            if (token) {
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;
                if (decodedToken.exp > currentTime) {
                    setClient(decodedToken);
                }
            }
        } catch (error) {
            console.error("Error al decodificar el token:", error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // ----- ¡AQUÍ ESTÁ LA MAGIA ANTI-FANTASMA! -----
    useEffect(() => {
        // Creamos un "espía" que se activa cada vez que la página se muestra.
        const handlePageShow = (event) => {
            // 'event.persisted' es true si la página viene de una "foto fantasma" (bfcache).
            if (event.persisted) {
                // Si detectamos un fantasma, ¡forzamos un reseteo completo!
                console.log('¡Fantasma detectado! Forzando actualización...');
                window.location.reload();
            }
        };

        // Ponemos a nuestro espía a vigilar.
        window.addEventListener('pageshow', handlePageShow);

        // ¡Súper importante! Cuando el componente se desmonta, retiramos al espía.
        return () => {
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, []); // <-- El array vacío asegura que este espía se ponga una sola vez.

    const logout = () => {
        localStorage.removeItem('clientAuthToken');
        setClient(null);
        window.location.href = '/login-cliente';
    };

    return { client, loading, logout };
};