// En /la_capital_fidelizacion/clientAuthRoutes.js (Versión 2.0 - Simple y Correcta)

const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

router.post(
    '/register',
    [
        // Tus validaciones están perfectas
        body('nombres').not().isEmpty().trim().escape().withMessage('El nombre es requerido.'),
        body('apellidos').not().isEmpty().trim().escape().withMessage('El apellido es requerido.'),
        body('email').isEmail().normalizeEmail().withMessage('Por favor, introduce un email válido.'),
        body('numero_telefono').not().isEmpty().trim().withMessage('El número de teléfono es requerido.'),
        body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // ----- ¡LA MAGIA! Ahora también recibimos estos campos opcionales -----
        const { nombres, apellidos, email, password, numero_telefono, fecha_nacimiento, genero } = req.body;

        try {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            // ¡Ahora los incluimos en la inserción a la base de datos!
            const { data, error } = await supabase
                .from('Clientes')
                .insert({
                    nombres, apellidos,
                    numero_telefono,
                    email,
                    password_hash,
                    fecha_nacimiento, // <-- Nuevo
                    genero            // <-- Nuevo
                })
                .select('id, nombres, email, created_at')
                .single();

            if (error) {
                // El error de "email o teléfono duplicado" se maneja igual
                if (error.code === '23505') {
                    return res.status(409).json({ message: 'Este correo o teléfono ya está registrado.' });
                }
                throw error;
            }

            res.status(201).json({ message: '¡Cuenta creada con éxito!', user: data });

        } catch (error) {
            console.error('Error en el registro de cliente:', error);
            res.status(500).json({ message: 'Ocurrió un error en el servidor.' });
        }
    }
);

// --- RUTA DE LOGIN PARA CLIENTES ---
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('El email no es válido.'),
    body('password').not().isEmpty().withMessage('La contraseña es requerida.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // 1. Buscamos al cliente por su email y pedimos los campos correctos
        const { data: cliente, error: findError } = await supabase
            .from('Clientes')
            .select('id, nombres, apellidos, password_hash') // <-- ¡Aseguramos que pedimos nombres y apellidos!
            .eq('email', email)
            .single();

        if (findError || !cliente || !cliente.password_hash) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 2. Comparamos la contraseña
        const isMatch = await bcrypt.compare(password, cliente.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        
        // 3. ¡CREAMOS EL PASAPORTE CORRECTAMENTE CON BACKTICKS!
        const payload = {
            id: cliente.id,
            // Construimos el nombre de verdad, usando las variables
            nombre: `${cliente.nombres} ${cliente.apellidos}`, // <-- ¡LA MAGIA!
            role: 'Cliente'
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token });

    } catch (error) {
        console.error("Error en el login de cliente:", error);
        res.status(500).json({ message: "Error en el servidor." });
    }
});

// Aquí añadiremos el '/login' del cliente en el futuro

module.exports = router;