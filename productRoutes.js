const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAuthenticated, isAdmin } = require('./authMiddleware');
const { body, validationResult } = require('express-validator');

// --- RUTAS PÚBLICAS (Para los clientes) ---

// 1. PRIMERO, la ruta MÁS ESPECÍFICA ('/public/with-ar')
// En /la_capital_fidelizacion/productRoutes.js

router.get('/public/with-ar', async (req, res) => {
    try {
        // ----- MICRÓFONO #1: ¿LLEGÓ LA LLAMADA? -----
        console.log('--- RUTA /public/with-ar --- ¡Llamada recibida! Empezando consulta a Supabase...');

        const { data, error } = await supabase
            .from('Productos')
            .select('id, nombre, descripcion, categoria, ActivosDigitales!inner(urls_imagenes)')
            .eq('activo', true)
            .not('ActivosDigitales', 'is', null);

        // ----- MICRÓFONO #2: ¿QUÉ RESPONDIÓ LA BASE DE DATOS? -----
        console.log('--- RUTA /public/with-ar --- Respuesta de Supabase:', { 
            data_recibida: data, 
            error_recibido: error 
        });

        if (error) throw error;
        
        res.json(data);
    } catch(err) { 
        console.error("--- RUTA /public/with-ar --- ¡ERROR CATASTRÓFICO!", err);
        res.status(500).json({ message: 'Error al cargar los productos con AR.' });
    }
});

// 2. Y DESPUÉS, la ruta DINÁMICA ('/public/:id')
router.get('/public/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) return res.status(400).json({ message: 'ID de producto inválido.' });

        const { data, error } = await supabase
            .from('Productos')
            .select('nombre, ActivosDigitales!inner(url_modelo_3d)') // <-- Pedimos el nombre del producto y el modelo
            .eq('id', id)
            .single();

        if (error || !data) return res.status(404).json({ message: "Producto o su modelo 3D no encontrado." });
        res.json(data);
    } catch (error) { res.status(500).json({ message: "Error interno del servidor." }); }
});

// --- 1. LEER TODOS los productos ---
// Cualquiera que esté logueado puede ver la lista.
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Productos')
            .select(`
                id,
                nombre,
                descripcion,
                precio,
                categoria,
                activo,
                ActivosDigitales ( id, urls_imagenes ) 
            `)
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ message: "Error al obtener los productos." });
    }
});

// --- 2. LEER UN SOLO producto por su ID ---
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('Productos')
            .select(`
                *, 
                ActivosDigitales ( id, urls_imagenes )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: 'Producto no encontrado.' });
        res.json(data);
    } catch (error) {
        console.error(`Error al obtener producto ${req.params.id}:`, error);
        res.status(500).json({ message: "Error al obtener el producto." });
    }
});

// --- 3. CREAR un nuevo producto ---
router.post('/', isAdmin, [
    body('nombre').not().isEmpty().withMessage('El nombre es requerido.'),
    body('precio').isFloat({ gt: 0 }).withMessage('El precio debe ser un número positivo.'),
    body('categoria').not().isEmpty().withMessage('La categoría es requerida.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        // ----- ¡LA ÚNICA CORRECCIÓN ESTÁ AQUÍ! -----
        // Ahora también leemos 'activo' del cuerpo de la petición.
        const { nombre, descripcion, precio, categoria, activo } = req.body;

        // Ya no forzamos 'activo: true'. Usamos el valor que llegó.
        const newProduct = { nombre, descripcion, precio, categoria, activo };

        const { data, error } = await supabase
            .from('Productos')
            .insert(newProduct) // <-- Ahora insertará el objeto correcto
            .select()
            .single();
        
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Error al crear producto:", error);
        res.status(500).json({ message: "Error al crear el producto." });
    }
});

// --- 4. ACTUALIZAR un producto existente ---
router.put('/:id', isAdmin, [
    body('nombre')
        .trim()
        .not().isEmpty().withMessage('El nombre es requerido.')
        .isLength({ max: 100 }).withMessage('El nombre no puede exceder los 100 caracteres.'),

    body('precio')
        .isFloat({ gt: 0, max: 10000000 }).withMessage('El precio debe ser un número positivo y menor a 10,000,000.'),

    body('categoria')
        .trim()
        .not().isEmpty().withMessage('La categoría es requerida.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, categoria, activo } = req.body;
        const productToUpdate = { nombre, descripcion, precio, categoria, activo };

        const { data, error } = await supabase
            .from('Productos')
            .update(productToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: 'Producto no encontrado para actualizar.' });
        res.json(data);
    } catch (error) {
        console.error(`Error al actualizar producto ${req.params.id}:`, error);
        res.status(500).json({ message: "Error al actualizar el producto." });
    }
});

// --- 5. ELIMINAR un producto ---
// Solo los administradores pueden hacer esto.
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // ¡Importante! Antes de borrar el producto, borramos sus activos digitales
        // para no dejar basura en la base de datos (integridad referencial).
        await supabase.from('ActivosDigitales').delete().eq('id_producto', id);
        
        const { error } = await supabase
            .from('Productos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        res.status(200).json({ message: 'Producto eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar producto ${req.params.id}:`, error);
        res.status(500).json({ message: "Error al eliminar el producto." });
    }
});


module.exports = router;