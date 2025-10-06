const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabaseClient'); 
const router = express.Router();


router.post('/register', async (req, res) => {
    const { nombres, apellidos, email, password, id_rol } = req.body;

    if (!email || !password || !nombres || !apellidos || !id_rol) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Hasheamos la contraseña
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    // Insertamos el nuevo usuario en la tabla Usuarios de Supabase
    const { data, error } = await supabase
        .from('Usuarios')
        .insert([{ nombres, apellidos, email, password_hash, id_rol }]);

    if (error) {
        console.error('Error al registrar:', error);
        return res.status(500).json({ message: 'Error al registrar el usuario', details: error.message });
    }

    res.status(201).json({ message: 'Usuario registrado exitosamente', user: data });
});

// ----- Endpoint para el Login (ACTUALIZADO) -----
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const { data: users, error } = await supabase.from('Usuarios').select('*').eq('email', email);
  if (error || !users || users.length === 0) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const user = users[0];
  const isPasswordCorrect = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  // --- ¡AQUÍ ESTÁ LA NUEVA LÓGICA! ---
  if (user.is_two_factor_enabled) {
    // El usuario tiene 2FA activado. NO le damos el token final.
    // Le damos un token temporal de "pre-autenticación" que solo sirve para el siguiente paso.
    const tempToken = jwt.sign(
        { id: user.id, isPreAuth: true }, // Marcamos que es un token temporal
        'tu_super_secreto_para_el_token',
        { expiresIn: '5m' } // Caduca en 5 minutos
    );
    res.json({ twoFactorRequired: true, tempToken });
  } else {
    // El usuario NO tiene 2FA. Le damos el token final como antes.
    const { data: rolData } = await supabase.from('Roles').select('nombre_rol').eq('id', user.id_rol).single();
    const userRole = rolData ? rolData.nombre_rol : 'Empleado';
    
    const finalToken = jwt.sign(
        { id: user.id, role: userRole },
        'tu_super_secreto_para_el_token',
        { expiresIn: '13h' } // <-- ¡AQUÍ ESTÁ TU SESIÓN DE 13 HORAS!
    );
    res.json({ token: finalToken });
  }
});

const speakeasy = require('speakeasy');
// --- RUTA PARA VERIFICAR EL CÓDIGO 2FA Y OBTENER EL TOKEN FINAL ---
router.post('/verify-2fa', async (req, res) => {
    const { tempToken, twoFactorCode } = req.body;
    
    try {
        const decoded = jwt.verify(tempToken, 'tu_super_secreto_para_el_token');
        if (!decoded.isPreAuth) throw new Error();

        const { data: user } = await supabase.from('Usuarios').select('*').eq('id', decoded.id).single();
        if (!user) return res.sendStatus(401);
        
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: twoFactorCode
        });

        if (verified) {
            const { data: rolData } = await supabase.from('Roles').select('nombre_rol').eq('id', user.id_rol).single();
            const userRole = rolData ? rolData.nombre_rol : 'Empleado';
            
            const finalToken = jwt.sign(
                { id: user.id, role: userRole },
                'tu_super_secreto_para_el_token',
                { expiresIn: '13h' } // <-- ¡Sesión de 13 horas también aquí!
            );
            res.json({ token: finalToken });
        } else {
            res.status(401).json({ message: 'Código 2FA incorrecto.' });
        }
    } catch (error) {
        res.status(401).json({ message: 'Token temporal inválido o expirado.' });
    }
});

module.exports = router;