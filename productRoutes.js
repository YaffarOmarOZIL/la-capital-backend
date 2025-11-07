const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAuthenticated, isAdmin } = require('./authMiddleware');
const { body, validationResult } = require('express-validator');
//const { isClientAuthenticated } = require('./clientAuthRoutes');
const jwt = require('jsonwebtoken');

//Autenticacion
const isClientAuthenticated = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (token == null) {
        return res.sendStatus(401); // No hay token, no autorizado
    }

    // Usamos el mismo secreto, que ahora sí estará disponible
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
        if (err || decodedPayload.role !== 'Cliente') {
            return res.sendStatus(403); // El token no es válido o no es de un cliente
        }
        
        // Guardamos los datos del cliente para que las rutas los usen
        req.client = decodedPayload; 
        
        next(); // El cliente es válido, puede continuar.
    });
};


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

// OBTIENE EL MENÚ COMPLETO PARA CLIENTES (público)
router.get('/public/menu', async (req, res) => {
    try {
        // 1. Primero obtenemos todos los productos activos
        const { data: products, error: productsError } = await supabase
            .from('Productos')
            .select(`
                id, 
                nombre, 
                descripcion, 
                precio, 
                categoria, 
                activo,
                ActivosDigitales (
                    urls_imagenes,
                    url_modelo_3d
                )
            `)
            .eq('activo', true)
            .order('id', { ascending: true });

        if (productsError) throw productsError;

        // 2. Para cada producto, obtenemos sus likes y comentarios (últimos 5)
        const productsWithData = await Promise.all(
            products.map(async (product) => {
                // Obtener likes
                const { data: likes } = await supabase
                    .from('ProductLikes')
                    .select('id')
                    .eq('id_producto', product.id);

                // Obtener últimos 5 comentarios
                const { data: comments } = await supabase
                    .from('ProductComments')
                    .select(`
                        id,
                        comentario,
                        created_at,
                        Clientes (
                            nombres, 
                            apellidos
                        )
                    `)
                    .eq('id_producto', product.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Contar total de comentarios
                const { count: totalComments } = await supabase
                    .from('ProductComments')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_producto', product.id);

                return {
                    ...product,
                    ProductLikes: [{ count: likes?.length || 0 }],
                    ProductComments: comments || [],
                    totalComments: totalComments || 0
                };
            })
        );

        res.json(productsWithData);
    } catch (err) { 
        console.error('Error completo en /public/menu:', err);
        res.status(500).json({ message: 'Error al cargar el menú.', error: err.message }); 
    }
});

// OBTENER TODOS LOS COMENTARIOS DE UN PRODUCTO (público)
router.get('/:id/all-comments', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('ProductComments')
            .select(`
                id,
                comentario,
                created_at,
                Clientes (
                    nombres,
                    apellidos
                )
            `)
            .eq('id_producto', id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error al obtener todos los comentarios:', err);
        res.status(500).json({ message: 'Error al cargar comentarios.' });
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

// OBTIENE LOS LIKES DE UN CLIENTE LOGUEADO (privado)
// Necesita el middleware de autenticación de clientes
router.get('/likes', isClientAuthenticated, async (req, res) => {
    try {
        const clientId = req.client.id; // Asumimos que el middleware pone los datos del cliente en req.client
        const { data, error } = await supabase
            .from('ProductLikes')
            .select('id_producto')
            .eq('id_cliente', clientId);
        if (error) throw error;
        // Devuelve un array simple de IDs de producto [5, 8, 12]
        res.json(data.map(like => like.id_producto));
    } catch (err) { res.status(500).json({ message: 'Error al obtener tus likes.' }); }
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

// --- NUEVAS RUTAS PÚBLICAS Y PRIVADAS PARA LA EXPERIENCIA DE CLIENTE ---

// Trae todos los productos activos con su conteo de likes y comentarios.

// DAR/QUITAR LIKE A UN PRODUCTO (privado)
router.post('/:id/like', isClientAuthenticated, async (req, res) => {
    try {
        const clientId = req.client.id;
        const productId = req.params.id;

        if (!clientId || !productId) {
            return res.status(400).json({ message: "Faltan datos para procesar el like." });
        }
        
        // --- LA ÚNICA LÓGICA QUE NECESITAMOS ---

        // 1. Intentamos borrar el like y le pedimos a Supabase que nos diga cuántas filas borró.
        const { count, error: deleteError } = await supabase
            .from('ProductLikes')
            .delete({ count: 'exact' }) // La clave: Pedimos el conteo de filas afectadas
            .match({ id_cliente: clientId, id_producto: productId });

        if (deleteError) throw deleteError;

        // 2. Ahora, simplemente revisamos si se borró algo.
        if (count > 0) {
            // Si 'count' es 1, significa que encontró un like y lo borró. Fue un "unlike".
            return res.status(200).json({ status: 'unliked' });
        } else {
            // Si 'count' es 0, no encontró nada para borrar. Era un "like" y lo creamos.
            const { error: insertError } = await supabase
                .from('ProductLikes')
                .insert({ id_cliente: clientId, id_producto: productId });
            
            if (insertError) throw insertError;

            return res.status(201).json({ status: 'liked' });
        }
    } catch (err) { 
        console.error("Error al procesar el like:", err.message);
        res.status(500).json({ message: 'Error al procesar el like.' }); 
    }
});

// PUBLICAR UN COMENTARIO (privado)
router.post('/:id/comment', isClientAuthenticated, async (req, res) => {
    const { comentario } = req.body;
    const productId = req.params.id;
    const clientId = req.client.id;

    if (!comentario || comentario.trim() === '') {
        return res.status(400).json({ message: 'El comentario no puede estar vacío.' });
    }

    try {
        const { data, error } = await supabase
            .from('ProductComments')
            .insert({ 
                id_cliente: clientId, 
                id_producto: productId, 
                comentario: comentario.trim() 
            })
            .select(`
                *,
                Clientes (nombres, apellidos)
            `)
            .single();

        if (error) throw error;
        
        // Devolvemos el comentario recién creado con los datos del cliente
        // para que el frontend pueda añadirlo a la lista al instante.
        res.status(201).json(data);

    } catch (err) {
        console.error('Error al publicar comentario:', err);
        res.status(500).json({ message: 'Error al procesar el comentario.' });
    }
});

// REGISTRAR TIEMPO DE INTERACCIÓN EN AR (privado/público)
// RUTA DE DEBUG PARA REGISTRAR INTERACCIÓN
router.post('/interaction', async (req, res) => {
    console.log('\n\n========================================');
    console.log('⚡️ INICIO DE REQUEST A /api/products/interaction ⚡️');
    
    // --- BANDERA 1: ¿ESTÁN LLEGANDO LOS HEADERS? ---
    const authHeader = req.headers['authorization'];
    console.log('--- BANDERA 1: Contenido de req.headers["authorization"] ---');
    console.log(authHeader);

    const token = authHeader && authHeader.split(' ')[1];
    
    // --- BANDERA 2: ¿SE AISLÓ BIEN EL TOKEN? ---
    console.log('\n--- BANDERA 2: Token aislado ---');
    console.log(token);
    
    let clientId = null;

    if (token) {
        console.log('\n--- Se detectó un token, intentando verificar... ---');
        try {
            const jwt = require('jsonwebtoken');

            // --- BANDERA 3: ¿ESTAMOS USANDO EL SECRETO CORRECTO? ---
            const clientSecret = process.env.JWT_CLIENT_SECRET;
            console.log('--- BANDERA 3: Secreto del cliente que se usará para verificar ---');
            console.log(clientSecret ? `SECRET OBTENIDO (longitud: ${clientSecret.length})` : '¡¡¡ERROR: SECRETO NO ENCONTRADO!!!');
            
            const decoded = jwt.verify(token, clientSecret);
            
            // --- BANDERA 4: ¿QUÉ HAY DENTRO DEL TOKEN DECODIFICADO? ---
            console.log('\n--- BANDERA 4: ¡Token verificado! Contenido decodificado ---');
            console.log(decoded);
            
            if (decoded.role === 'Cliente') {
                clientId = decoded.id;
                console.log(`✅ Rol 'Cliente' confirmado. ID de cliente establecido en: ${clientId}`);
            } else {
                console.log(`❌ El rol es '${decoded.role}', no 'Cliente'. clientId sigue siendo null.`);
            }

        } catch (err) {
            // --- BANDERA 5: ¿QUÉ ERROR EXACTO ESTÁ DANDO JWT.VERIFY? ---
            console.error('\n--- BANDERA 5: ¡¡¡FALLÓ LA VERIFICACIÓN DEL TOKEN!!! ---');
            console.error('El error específico es:', err.name);
            console.error('Mensaje del error:', err.message);
        }
    } else {
        console.log('\n--- No se encontró token. Se procesará como usuario anónimo. ---');
    }

    // El resto de la lógica sigue igual...
    let { id_producto, duracion_segundos } = req.body;
    let sessionId = null;
    
    if (!clientId) {
        sessionId = `session_${Date.now()}`;
        console.log(`\n--- No hay clientId, se usará session temporal: ${sessionId} ---`);
    } else {
        console.log(`\n--- Hay clientId (${clientId}), no se usará session temporal. ---`);
    }

    // Lógica para guardar en Supabase (sin cambios)
    try {
        console.log('--- Intentando guardar en Supabase... ---');
        console.log({ id_producto, duracion_segundos, id_cliente: clientId, session_id_temporal: sessionId });
        // Aquí iría tu lógica de `supabase.from('InteraccionesAR').insert(...)` etc.
        // Por ahora, solo responderemos para confirmar los datos.

        console.log('========================================\n\n');
        return res.status(200).json({ 
            message: 'Debug Exitoso', 
            datosRecibidos: {
                id_producto,
                duracion_segundos,
                clientIdDetectado: clientId,
                sessionIdGenerado: sessionId
            } 
        });

    } catch (dbError) {
        console.error('--- ERROR AL INTERACTUAR CON SUPABASE ---', dbError);
        console.log('========================================\n\n');
        return res.status(500).json({ message: 'Error en la base de datos' });
    }
});

router.get('/:id/likes-count', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { count, error } = await supabase
            .from('ProductLikes')
            .select('*', { count: 'exact', head: true })
            .eq('id_producto', id);

        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (err) {
        console.error('Error al obtener conteo de likes:', err);
        res.status(500).json({ message: 'Error al obtener likes.' });
    }
});

module.exports = router;