// Importar el framework Express
const express = require('express');

// Inicializar la aplicación de Express
const app = express();

// Definir el puerto en el que correrá el servidor
const PORT = process.env.PORT || 3001;

// ----- Definición de Endpoints (Rutas) -----
// Este es un endpoint de prueba para la raíz del servidor
app.get('/', (req, res) => {
  res.json({
    message: '¡Bienvenido a la API del Sistema de Fidelización La Capital!'
  });
});

// ----- Iniciar el Servidor -----
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});