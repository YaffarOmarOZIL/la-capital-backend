//U:\Documentos\la_capital_fidelizacion\clientRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient'); // Corregido para que la ruta sea relativa a la carpeta raíz
const { isAuthenticated, isAdmin } = require('./authMiddleware'); // Usamos los mismos middlewares que en productos
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// --- 1. LEER TODOS los clientes (con búsqueda) ---
// Solo el personal autenticado puede ver los clientes.
router.get('/', isAuthenticated, async (req, res) => {
    const { search } = req.query;
    try {
        let query = supabase.from('Clientes').select('*').order('apellidos', { ascending: true });

        if (search) {
            query = query.or(`nombres.ilike.%${search}%,numero_telefono.ilike.%${search}%`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Error al obtener clientes:", error);
        res.status(500).json({ message: "Error al obtener los clientes." });
    }
});

// --- 2. CREAR un nuevo cliente ---
// El personal autenticado (no necesita ser admin) puede registrar clientes.
router.post('/', isAuthenticated, [
    body('nombres').notEmpty().withMessage('El nombre es requerido'),
    body('apellidos').notEmpty().withMessage('El apellido es requerido'),
    body('numero_telefono').isLength({ min: 8 }).withMessage('El número de teléfono debe ser válido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { nombres, apellidos, numero_telefono, fecha_nacimiento, genero, notas } = req.body;
    try {
        const { data, error } = await supabase
            .from('Clientes')
            .insert([{ nombres, apellidos, numero_telefono, fecha_nacimiento, genero, notas }])
            .select()
            .single();
            
        if (error) {
            if (error.code === '23505') { 
                return res.status(409).json({ message: 'El número de teléfono ya está registrado.' });
            }
            throw error;
        }
        res.status(201).json(data);
    } catch (error) {
        console.error("Error al crear cliente:", error);
        res.status(500).json({ message: "Error al crear el cliente." });
    }
});

// --- 3. ACTUALIZAR un cliente ---
router.put('/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { nombres, apellidos, numero_telefono, email, fecha_nacimiento, genero, notas, password } = req.body;

    try {
        const updates = { nombres, apellidos, numero_telefono, email, fecha_nacimiento, genero, notas };

        // ----- ¡LA MAGIA ESTÁ AQUÍ! -----
        // Si el admin nos mandó una nueva contraseña...
        if (password) {
            // ...la encriptamos y la añadimos al objeto que vamos a actualizar.
            const salt = await bcrypt.genSalt(10);
            updates.password_hash = await bcrypt.hash(password, salt);
        }

        const { data, error } = await supabase
            .from('Clientes')
            .update(updates) // <-- Actualizamos solo los campos necesarios
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: 'Cliente no encontrado para actualizar.' });
        res.json(data);
    } catch (error) {
        console.error(`Error al actualizar cliente ${req.params.id}:`, error);
        res.status(500).json({ message: "Error al actualizar el cliente." });
    }
});

// --- 4. ELIMINAR un cliente ---
// Para borrar clientes, requerimos que sea un Administrador.
router.delete('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('Clientes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Cliente eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar cliente ${req.params.id}:`, error);
        res.status(500).json({ message: "Error al eliminar el cliente." });
    }
});

router.get('/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('Clientes')
            .select('*')
            .eq('id', id)
            .single(); // .single() es clave, dice "solo espero un resultado"

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }
        res.json(data);
    } catch (error) {
        console.error(`Error al obtener cliente ${id}:`, error);
        res.status(500).json({ message: 'Error al obtener el cliente.' });
    }
});

router.get('/birthdays', isAuthenticated, async (req, res) => {
    try {
        // Obtenemos el "día del año" de hoy y de aquí a 7 días.
        // Por ejemplo, 1 de Enero es 1, 31 de Diciembre es 365.
        const hoy = new Date();
        const fin = new Date();
        fin.setDate(hoy.getDate() + 7);

        // Usamos una consulta SQL directa (raw) porque es la forma más eficiente
        // de comparar cumpleaños ignorando el año.
        const { data, error } = await supabase.rpc('get_upcoming_birthdays', {
            start_day: hoy.getDate(),
            start_month: hoy.getMonth() + 1, // Los meses en JS son 0-11, en PG son 1-12
            end_day: fin.getDate(),
            end_month: fin.getMonth() + 1
        });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Error al obtener cumpleaños:", error);
        res.status(500).json({ message: "Error al obtener la lista de cumpleaños." });
    }
});

module.exports = router;