const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// ----- Middlewares -----
app.use(express.json());
app.use(cors());

// ----- Rutas -----
const authRoutes = require('./authRoutes'); // Importar el archivo de rutas

app.get('/', (req, res) => {
  res.json({ message: '¡API de La Capital funcionando!' });
});

// Usar las rutas de autenticación bajo el prefijo /api/auth
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});