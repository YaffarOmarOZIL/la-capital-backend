const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAuthenticated, isAdmin } = require('./authMiddleware');
const { body, validationResult } = require('express-validator');

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
                ActivosDigitales ( id, url_modelo_3d, url_qr_code )
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
            .select('*, ActivosDigitales (*)')
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
        const { nombre, descripcion, precio, categoria } = req.body;
        const newProduct = { nombre, descripcion, precio, categoria, activo: true };

        const { data, error } = await supabase
            .from('Productos')
            .insert(newProduct)
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