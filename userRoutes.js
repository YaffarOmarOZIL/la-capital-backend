const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { isAuthenticated, isAdmin } = require('./authMiddleware');

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

// --- RUTA PARA OBTENER LOS DATOS DEL USUARIO ACTUAL (PROTEGIDA) ---
// GET /api/users/me
router.get('/me', isAuthenticated, async (req, res) => {
  const userId = req.user.id; // Obtenemos el ID desde el token verificado
  try {
    const { data, error } = await supabase
      .from('Usuarios')
      .select('nombre_completo, email')
      .eq('id', userId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los datos del perfil.' });
  }
});

// --- RUTA PARA ACTUALIZAR LOS DATOS DEL USUARIO ACTUAL (PROTEGIDA) ---
// PUT /api/users/me
router.put('/me', isAuthenticated, 
  [ // También validamos los datos al actualizar
    body('nombre_completo', 'El nombre no puede estar vacío').not().isEmpty().trim().escape(),
    body('email', 'Email inválido').isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user.id;
    const { nombre_completo, email } = req.body;

    try {
      const { data, error } = await supabase
        .from('Usuarios')
        .update({ nombre_completo, email })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
         // Manejar error de email duplicado
        if (error.code === '23505') { 
            return res.status(409).json({ message: 'El nuevo correo electrónico ya está en uso.' });
        }
        throw error;
      }
      res.json({ message: 'Perfil actualizado con éxito.', user: data });
    } catch (error) {
      res.status(500).json({ message: 'Error al actualizar el perfil.' });
    }
});

router.post(
  '/', 
  isAdmin,
  // Las validaciones de express-validator se quedan exactamente igual
  [
    body('nombre_completo', 'El nombre es requerido y no debe contener números').not().isEmpty().trim().escape().matches(/^[a-zA-Z\s]+$/),
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