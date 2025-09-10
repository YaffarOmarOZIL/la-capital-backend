const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAdmin } = require('./authMiddleware'); // ¡Importamos a nuestro guardián!
const { body, validationResult } = require('express-validator');

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

router.post(
  '/', 
  isAdmin,
  // Las validaciones de express-validator se quedan exactamente igual
  [
    body('nombre_completo', 'El nombre es requerido').not().isEmpty().trim().escape(),
    body('email', 'Por favor, introduce un email válido').isEmail().normalizeEmail(),
    body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1, }).withMessage('La contraseña debe tener al menos 8 caracteres...'),
    body('id_rol', 'El rol es requerido').isInt({ min: 1, max: 2 }),
  ],
  async (req, res) => {
    // 1. Revisar si hay errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre_completo, email, password, id_rol } = req.body;

    try {
      // 2. Hashear la contraseña
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);
      
      const newUser = { nombre_completo, email, password_hash, id_rol };

      // 3. Insertar en Supabase (esto ya sabemos que funciona)
      const { data, error } = await supabase
        .from('Usuarios')
        .insert(newUser)
        .select()
        .single();
      
      // 4. Manejar los errores específicos de Supabase
      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }
        // Si es otro error de Supabase, lo logueamos y enviamos un 500
        console.error('Error de Supabase al crear usuario:', error);
        return res.status(500).json({ message: "Error en la base de datos." });
      }

      // 5. Si todo salió bien, enviamos la respuesta de éxito
      res.status(201).json({ message: 'Usuario creado exitosamente', user: data });

    } catch (e) {
      // Este catch es solo para errores catastróficos, que no deberían ocurrir
      console.error("Error inesperado en el endpoint:", e);
      res.status(500).json({ message: "Ocurrió un error inesperado en el servidor." });
    }
  }
);

module.exports = router;