// En src/components/ClientPrivateRoute.jsx

import { Navigate, Outlet } from 'react-router-dom';
import { useClientAuth } from '../hooks/useClientAuth';
import { Loader, Center } from '@mantine/core';

function ClientPrivateRoute() {
const { client, loading } = useClientAuth();

    
if (loading) {
    // Mientras comprobamos el token, mostramos un loader
    return <Center h="100vh"><Loader /></Center>;
}

// Si no hay cliente (o el token expiró), lo mandamos a la página de login
if (!client) {
    return <Navigate to="/login-cliente" replace />;
}

// Si todo está bien, le dejamos pasar
return <Outlet />;

}

export default ClientPrivateRoute;