// En src/hooks/useClientAuth.js

import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const useClientAuth = () => {
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const token = localStorage.getItem('clientAuthToken');
            if (token) {
                // Decodificamos el token para obtener los datos del cliente
                const decodedToken = jwtDecode(token);
                // Comprobamos si el token ha expirado
                const currentTime = Date.now() / 1000;
                if (decodedToken.exp > currentTime) {
                    setClient(decodedToken);
                }
            }
        } catch (error) {
            console.error("Error al decodificar el token del cliente:", error);
            // Si hay un error, el cliente se queda como null
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = () => {
        localStorage.removeItem('clientAuthToken');
        setClient(null);
        // Recargamos la página para asegurar que todo se limpie
        window.location.href = '/login-cliente';
    };

    return { client, loading, logout };
};