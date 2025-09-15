import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Notifications } from '@mantine/notifications'; 
import '@mantine/notifications/styles.css'; 

// ¡Importante! La importación principal de los estilos de Mantine
import '@mantine/core/styles.css';

import { MantineProvider, createTheme } from '@mantine/core';

// Definimos nuestro tema personalizado para "La Capital"
const theme = createTheme({
  fontFamily: 'Verdana, sans-serif',
  colors: {
    'brand-yellow': [
      '#fff9e0', '#fff3bf', '#ffec99', '#ffe473', '#ffdd4d', 
      '#ffd100', // Tu color principal
      '#f2c200', '#d9ad00', '#bf9800', '#a68300'
    ],
  },
  primaryColor: 'brand-yellow', // Color primario de botones, links, etc.
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* El MantineProvider envuelve toda la aplicación */}
    <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </React.StrictMode>
);