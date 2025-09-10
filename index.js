const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// ----- Middlewares -----
app.use(cors()); 
app.use(express.json());

// ----- Rutas -----
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');


app.get('/', (req, res) => {
  res.json({ message: '¡API de La Capital funcionando!' });
});

// ------ Rutas que lee Express ----------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);


app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});