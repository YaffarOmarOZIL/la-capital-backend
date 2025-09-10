const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAdmin } = require('./authMiddleware'); // ¡Importamos a nuestro guardián!

// Ruta para obtener TODOS los usuarios (PROTEGIDA)
// GET /api/users
router.get('/', isAdmin, async (req, res) => {
  try {
    // Hacemos un "JOIN" para traernos también el nombre del rol
    const { data, error } = await supabase
      .from('Usuarios')
      .select(`
        id,
        nombre_completo,
        email,
        Roles ( nombre_rol )
      `);
    
    if (error) throw error;
    
    // Formateamos la data para que sea más fácil de usar en el frontend
    const formattedUsers = data.map(u => ({
        id: u.id,
        nombre_completo: u.nombre_completo,
        email: u.email,
        rol: u.Roles.nombre_rol // Aplanamos la estructura
    }));

    res.json(formattedUsers);

  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

module.exports = router;