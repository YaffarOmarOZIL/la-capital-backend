const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const supabase = require('./supabaseClient');
const { isAuthenticated } = require('./authMiddleware');

// --- RUTA 1: Generar un secreto y un QR para el setup ---
router.post('/setup', isAuthenticated, async (req, res) => {
    try {
        // Genera un nuevo secreto para el usuario
        const secret = speakeasy.generateSecret({
            name: `La Capital Panel (${req.user.email})`, // Así aparece en la app del usuario
        });

        // Genera el QR code como una imagen en formato Data URI
        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) throw new Error('No se pudo generar el QR code');
            
            // IMPORTANTE: NO guardamos el secreto en la BDD todavía.
            // Lo enviamos al frontend para que el usuario lo verifique.
            res.json({
                secret: secret.base32, // El secreto en texto
                qrCodeUrl: data_url,    // La imagen del QR para mostrar
            });
        });
    } catch (error) {
        console.error('Error en setup de 2FA:', error);
        res.status(500).json({ message: 'No se pudo iniciar la configuración de 2FA.' });
    }
});

// --- RUTA 2: Verificar el token del usuario y activar 2FA ---
router.post('/verify', isAuthenticated, async (req, res) => {
    const { token, secret } = req.body;
    const userId = req.user.id;

    // Verifica que el código de 6 dígitos sea correcto
    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
    });

    if (verified) {
        // ¡El código es correcto! Ahora sí guardamos el secreto en la BDD.
        const { error } = await supabase
            .from('Usuarios')
            .update({ two_factor_secret: secret, is_two_factor_enabled: true })
            .eq('id', userId);
        
        if (error) {
            return res.status(500).json({ message: 'No se pudo guardar la configuración de 2FA.' });
        }
        res.json({ verified: true });
    } else {
        // El código es incorrecto
        res.status(400).json({ verified: false, message: 'El código de verificación es incorrecto.' });
    }
});

// --- RUTA 3: Desactivar 2FA para el usuario actual ---
router.post('/disable', isAuthenticated, async (req, res) => {
  const userId = req.user.id;

  try {
    // Actualizamos la base de datos para desactivar 2FA
    const { error } = await supabase
      .from('Usuarios')
      .update({ 
        is_two_factor_enabled: false, 
        two_factor_secret: null // ¡MUY IMPORTANTE! Borramos el secreto por seguridad.
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }
    
    res.json({ success: true, message: 'La autenticación de dos pasos ha sido desactivada.' });
    
  } catch (error) {
    console.error('Error al desactivar 2FA:', error);
    res.status(500).json({ success: false, message: 'No se pudo desactivar la 2FA.' });
  }
});

module.exports = router;