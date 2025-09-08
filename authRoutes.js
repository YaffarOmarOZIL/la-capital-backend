const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabaseClient'); 
const router = express.Router();


router.post('/register', async (req, res) => {
    const { nombre, email, password, id_rol } = req.body;

    if (!email || !password || !nombre || !id_rol) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Hasheamos la contraseña
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    // Insertamos el nuevo usuario en la tabla Usuarios de Supabase
    const { data, error } = await supabase
        .from('Usuarios')
        .insert([{ nombre_completo: nombre, email, password_hash, id_rol }]);

    if (error) {
        console.error('Error al registrar:', error);
        return res.status(500).json({ message: 'Error al registrar el usuario', details: error.message });
    }

    res.status(201).json({ message: 'Usuario registrado exitosamente', user: data });
});

// ----- Endpoint para el Login (ACTUALIZADO) -----
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Buscar al usuario por email en Supabase
  const { data: users, error } = await supabase
    .from('Usuarios')
    .select('*')
    .eq('email', email);
  
  if (error || !users || users.length === 0) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const user = users[0];

  // 2. Comparar la contraseña enviada con la hasheada en la BDD
  const isPasswordCorrect = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }
  
  // 3. Crear un token JWT (aquí obtenemos el rol de la BDD)
  const { data: rolData, error: rolError } = await supabase
    .from('Roles')
    .select('nombre_rol')
    .eq('id', user.id_rol)
    .single();
  
  const userRole = rolError ? 'Desconocido' : rolData.nombre_rol;

  const token = jwt.sign(
    { id: user.id, role: userRole },
    'tu_super_secreto_para_el_token',
    { expiresIn: '1h' }
  );

  // 4. Enviar el token al cliente
  res.status(200).json({ token });
});

module.exports = router;