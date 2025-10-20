const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAdmin } = require('./authMiddleware');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const imageUploadFields = [
    { name: 'frente', maxCount: 1 },
    { name: 'atras', maxCount: 1 },
    { name: 'lado_d', maxCount: 1 },
    { name: 'lado_i', maxCount: 1 },
    { name: 'arriba', maxCount: 1 },
    { name: 'perspectiva', maxCount: 1 }
];

// Subir imágenes (las 6 vistas)
router.post('/products/:productId/assets/images', isAdmin, upload.fields(imageUploadFields), async (req, res) => {
    const { productId } = req.params;

    if (!req.files && Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No hay imágenes para guardar.' });
    }

    try {
        const imageUrls = { ...req.body };
        
        if (req.files) {
            for (const angle in req.files) {
                const file = req.files[angle][0];
                const fileName = `producto_${productId}_${angle}_${Date.now()}.png`;
                
                const { error: uploadError } = await supabase.storage
                    .from('modelos-3d')
                    .upload(fileName, file.buffer, { contentType: 'image/png', upsert: true });
                
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('modelos-3d').getPublicUrl(fileName);
                imageUrls[angle] = urlData.publicUrl;
            }
        }

        const { data: dbData, error: dbError } = await supabase
            .from('ActivosDigitales')
            .upsert(
                { id_producto: productId, urls_imagenes: imageUrls },
                { onConflict: 'id_producto' }
            )
            .select()
            .single();

        if (dbError) throw dbError;

        res.status(201).json({ message: 'Imágenes guardadas.', asset: dbData });
    } catch (error) {
        console.error('Error al subir imágenes:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// NUEVO: Subir modelo 3D GLB
router.post('/products/:productId/assets/model', isAdmin, upload.single('modelFile'), async (req, res) => {
    const { productId } = req.params;

    if (!req.file) {
        return res.status(400).json({ message: 'No se recibió el archivo del modelo.' });
    }

    try {
        const fileName = `modelo_producto_${productId}_${Date.now()}.glb`;
        
        const { error: uploadError } = await supabase.storage
            .from('modelos-3d')
            .upload(fileName, req.file.buffer, {
                contentType: 'model/gltf-binary',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('modelos-3d').getPublicUrl(fileName);

        const { data: dbData, error: dbError } = await supabase
            .from('ActivosDigitales')
            .upsert(
                { id_producto: productId, url_modelo_3d: urlData.publicUrl },
                { onConflict: 'id_producto' }
            )
            .select()
            .single();

        if (dbError) throw dbError;

        res.status(201).json({ 
            message: 'Modelo 3D guardado correctamente.', 
            url: urlData.publicUrl,
            asset: dbData 
        });
    } catch (error) {
        console.error('Error al subir modelo 3D:', error);
        res.status(500).json({ message: 'Error en el servidor al subir modelo.' });
    }
});

// Guardar QR Code
router.put('/products/:productId/assets/qr', isAdmin, async (req, res) => {
    const { productId } = req.params;
    const { qrCodeDataUrl } = req.body;

    if (!qrCodeDataUrl) {
        return res.status(400).json({ message: 'No se proporcionó el código QR.' });
    }

    try {
        const buffer = Buffer.from(qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        const fileName = `qr_producto_${productId}.png`;

        const { error: uploadError } = await supabase.storage
            .from('qrcodes')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: true });
        
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('qrcodes').getPublicUrl(fileName);

        const { data: dbData, error: dbError } = await supabase
            .from('ActivosDigitales')
            .upsert(
                { id_producto: productId, url_qr_code: urlData.publicUrl },
                { onConflict: 'id_producto' }
            )
            .select()
            .single();

        if (dbError) throw dbError;

        res.json({ 
            message: 'QR guardado.', 
            asset: dbData 
        });
    } catch (error) {
        console.error("Error al guardar QR:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// --- NUEVAS RUTAS PARA LA ADMINISTRACIÓN DE MODELOS 3D ---

// 1. OBTENER TODOS los modelos 3D generados para un producto
router.get('/products/:productId/assets/models', isAdmin, async (req, res) => {
    const { productId } = req.params;

    try {
        // --- CORRECCIÓN CLAVE ---
        // 1. Pedimos la lista de TODOS los archivos del bucket, SIN la opción 'search'.
        const { data: allFiles, error } = await supabase.storage
            .from('modelos-3d')
            .list(''); // Sin opciones, para traer todo.

        if (error) throw error;
        
        // 2. Obtenemos el modelo activo para poder marcarlo después.
        const { data: activeAsset } = await supabase
            .from('ActivosDigitales').select('url_modelo_3d').eq('id_producto', productId).single();

        // 3. Filtramos la lista COMPLETA nosotros mismos con JavaScript.
        const models = allFiles
            .filter(file => 
                // Condición 1: El nombre debe incluir '_<ID del producto>_'
                file.name.includes(`_${productId}_`) &&
                // Condición 2: El nombre debe terminar en '.glb'
                file.name.endsWith('.glb')
            )
            .map(file => {
                const publicUrl = supabase.storage.from('modelos-3d').getPublicUrl(file.name).data.publicUrl;
                return {
                    name: file.name,
                    url: publicUrl,
                    isActive: activeAsset ? publicUrl === activeAsset.url_modelo_3d : false
                };
            });
            
        res.json(models);
    } catch (error) {
        console.error(`Error al listar modelos 3D para el producto ${productId}:`, error);
        res.status(500).json({ message: "Error en el servidor al listar modelos." });
    }
});



// 2. ESTABLECER un modelo 3D como el ACTIVO para la experiencia AR
router.put('/products/:productId/assets/set-active-model', isAdmin, async (req, res) => {
    const { productId } = req.params;
    const { modelUrl } = req.body; // El frontend nos enviará la URL del modelo a activar

    if (!modelUrl) {
        return res.status(400).json({ message: 'No se proporcionó la URL del modelo.' });
    }

    try {
        const { data, error } = await supabase
            .from('ActivosDigitales')
            .update({ url_modelo_3d: modelUrl })
            .eq('id_producto', productId)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Modelo activo actualizado con éxito.', asset: data });
    } catch (error) {
        console.error(`Error al activar el modelo para el producto ${productId}:`, error);
        res.status(500).json({ message: "Error en el servidor al activar el modelo." });
    }
});

module.exports = router;