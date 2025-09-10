const jwt = require('jsonwebtoken');

// Este middleware verifica si el usuario está autenticado y es Administrador
const isAdmin = (req, res, next) => {
  // 1. Buscamos el token en los headers de la petición
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    return res.sendStatus(401); // 401 Unauthorized (No hay token)
  }

  // 2. Verificamos que el token sea válido y no haya expirado
  jwt.verify(token, 'tu_super_secreto_para_el_token', (err, user) => {
    if (err) {
      return res.sendStatus(403); // 403 Forbidden (Token inválido o expirado)
    }

    // 3. ¡La clave! Verificamos que el rol sea "Administrador"
    if (user.role !== 'Administrador') {
        return res.status(403).json({ message: 'Acceso denegado: Se requiere rol de Administrador.' });
    }
    
    // Si todo está bien, guardamos el usuario en la petición y continuamos
    req.user = user;
    next();
  });
};

module.exports = { isAdmin };