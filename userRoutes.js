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
        nombres, apellidos,
        email,
        Roles ( nombre_rol )
      `);
    
    if (error) throw error;
    
    // Formateamos la data para que sea más fácil de usar en el frontend
    const formattedUsers = data.map(u => ({
        id: u.id,
        nombres: u.nombres,
        apellidos: u.apellidos,
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
      .select('nombres, apellidos, email, is_two_factor_enabled')
      .eq('id', userId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los datos del perfil.' });
  }
});

// --- RUTA PARA ACTUALIZAR CUALQUIER USUARIO (SOLO ADMIN) ---
router.put('/:id', isAdmin, [
    body('nombres').not().isEmpty().withMessage('El nombre es requerido.'), 
    body('apellidos').not().isEmpty().withMessage('El apellido es requerido.'),
    body('email').isEmail().withMessage('Email inválido.'),
    body('id_rol').isInt().withMessage('El rol es inválido.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { nombres, apellidos, email, id_rol } = req.body;

    try {
        const { data, error } = await supabase
            .from('Usuarios')
            .update({ nombres, apellidos, email, id_rol })
            .eq('id', id)
            .select('id, nombres, apellidos, email, id_rol') // Devolvemos los datos actualizados
            .single();

        if (error) {
            if (error.code === '23505') return res.status(409).json({ message: 'Ese email ya está en uso.' });
            throw error;
        }
        res.json({ message: 'Usuario actualizado con éxito', user: data });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el usuario.' });
    }
});

// --- RUTA PARA ELIMINAR UN USUARIO ---
// (Solo Admin)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // ¡Regla de seguridad! Un admin no puede borrarse a sí mismo.
        if (parseInt(req.user.id, 10) === parseInt(id, 10)) {
            return res.status(403).json({ message: 'No puedes eliminar tu propia cuenta.' });
        }

        const { error } = await supabase
            .from('Usuarios')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar usuario ${req.params.id}:`, error);
        res.status(500).json({ message: "Error al eliminar el usuario." });
    }
});

router.post(
  '/', 
  isAdmin,
  // Las validaciones de express-validator se quedan exactamente igual
  [
    body('nombres', 'El nombre es requerido y no debe contener números').not().isEmpty().trim().escape().matches(/^[a-zA-Z\s]+$/),
    body('apellidos', 'El apellido es requerido y no debe contener números').not().isEmpty().trim().escape().matches(/^[a-zA-Z\s]+$/),
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

    const { nombres, apellidos, email, password, id_rol } = req.body;

    try {
      // 2. Hashear la contraseña
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);
      
      const newUser = { nombres, apellidos, email, password_hash, id_rol };

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

router.post(
  '/change-password',
  isAuthenticated, // ¡Solo usuarios logueados pueden cambiar su propia contraseña!
  [
    body('currentPassword', 'La contraseña actual es requerida.').not().isEmpty(),
    body('newPassword').isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    }).withMessage('La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Obtenemos el ID del token verificado

    try {
      // 1. Obtener el hash de la contraseña actual del usuario desde la BDD
      const { data: user, error: fetchError } = await supabase
        .from('Usuarios')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Verificar que la contraseña actual sea correcta
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
      }

      // 3. Hashear la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // 4. Actualizar la contraseña en la base de datos
      const { error: updateError } = await supabase
        .from('Usuarios')
        .update({ password_hash: newPasswordHash })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      res.json({ message: '¡Contraseña actualizada con éxito!' });

    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  }
);

router.get('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Hacemos el JOIN para traernos también el nombre del rol
        const { data, error } = await supabase
            .from('Usuarios')
            .select(`
                id,
                nombres, apellidos,
                email,
                id_rol
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: "Usuario no encontrado." });

        res.json(data);
    } catch (error) {
        console.error(`Error al obtener usuario ${id}:`, error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

module.exports = router;