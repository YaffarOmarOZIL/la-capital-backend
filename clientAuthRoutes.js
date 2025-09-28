// En /la_capital_fidelizacion/clientAuthRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// --- RUTA DE REGISTRO PARA CLIENTES ---
router.post(
    '/register',
    [
        // Validaciones súper importantes en el backend
        body('nombre_completo').not().isEmpty().trim().escape().withMessage('El nombre es requerido.'),
        body('email').isEmail().normalizeEmail().withMessage('Por favor, introduce un email válido.'),
        body('numero_telefono').not().isEmpty().trim().withMessage('El número de teléfono es requerido.'),
        body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre_completo, email, password, numero_telefono } = req.body;

        try {
            // 1. Encriptamos la contraseña (¡Nunca se guarda en texto plano!)
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            // 2. Primero, creamos el perfil del cliente en la tabla 'Clientes'
            const { data: clienteData, error: clienteError } = await supabase
                .from('Clientes')
                .insert({ nombre_completo, numero_telefono })
                .select()
                .single();

            if (clienteError) throw clienteError;

            // 3. Ahora, creamos la cuenta de acceso con la contraseña encriptada
            const { data: cuentaData, error: cuentaError } = await supabase
                .from('CuentasCliente')
                .insert({ email, password_hash, id_cliente: clienteData.id })
                .select('id, email, created_at')
                .single();
            
            if (cuentaError) {
                // Si la cuenta falla (ej: email duplicado), borramos el cliente que acabamos de crear para no dejar basura.
                await supabase.from('Clientes').delete().eq('id', clienteData.id);
                if (cuentaError.code === '23505') {
                    return res.status(409).json({ message: 'Este correo electrónico ya está registrado.' });
                }
                throw cuentaError;
            }

            // ¡Si todo sale bien, respondemos con éxito!
            res.status(201).json({ message: '¡Cuenta creada con éxito!', user: cuentaData });

        } catch (error) {
            console.error('Error en el registro de cliente:', error);
            res.status(500).json({ message: 'Ocurrió un error en el servidor.' });
        }
    }
);

module.exports = router;