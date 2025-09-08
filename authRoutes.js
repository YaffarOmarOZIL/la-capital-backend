const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Simulación de nuestra base de datos de usuarios
// La contraseña "admin123" ya está "hasheada"
const users = [
  {
    id: 1,
    email: 'admin@lacapital.com',
    passwordHash: '$2b$10$VjcL3sWeju5Zn3gA1SQKVONkl.PFrfIHCrJq34/ZltsELAj7L6O3.', // Contraseña: admin123
    role: 'Administrador'
  }
];

// Endpoint para el login: POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // 1. Buscar al usuario por email
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Credenciales inválidas' }); // 401 Unauthorized
  }

  // Comparar la contraseña enviada con la hasheada en la BDD
  const isPasswordCorrect = bcrypt.compareSync(password, user.passwordHash);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  // token JWT
  const token = jwt.sign(
    { id: user.id, role: user.role },
    'tu_super_secreto_para_el_token', 
    { expiresIn: '1h' }
  );

  res.status(200).json({ token });
});

module.exports = router;