// En /la_capital_fidelizacion/assetRoutes.js (Versión 2.0 - Sprites)

const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('./supabaseClient');
const { isAdmin } = require('./authMiddleware');

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

// ----- ¡NUEVA RUTA DE SUBIDA! Ahora acepta múltiples archivos -----
// El nombre clave que el frontend usará es 'imageFiles'
// '12' es el número máximo de imágenes que aceptaremos. ¡Más que suficiente!
router.post('/products/:productId/assets/images', isAdmin, upload.fields(imageUploadFields), async (req, res) => {
    const { productId } = req.params;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: 'No se han subido imágenes.' });
    }

    try {
        const imageUrls = {};
        
        // El bucle ahora es más simple, iteramos sobre los campos que llegaron
        for (const angle in req.files) {
            const file = req.files[angle][0]; // Obtenemos el archivo
            const fileExt = file.originalname.split('.').pop();
            const fileName = `producto_${productId}_${angle}_${Date.now()}.${fileExt}`;

            // 1. Subir a Supabase (igual que antes)
            const { error: uploadError } = await supabase.storage.from('modelos-3d').upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
            if (uploadError) throw uploadError;

            // 2. Obtener URL pública (igual que antes)
            const { data: urlData } = supabase.storage.from('modelos-3d').getPublicUrl(fileName);

            // 3. Añadir al objeto JSONB
            imageUrls[angle] = urlData.publicUrl;
        }

        // 4. Guardar en la base de datos (igual que antes)
        const { data: dbData, error: dbError } = await supabase.from('ActivosDigitales').upsert({ id_producto: productId, urls_imagenes: imageUrls }, { onConflict: 'id_producto' }).select().single();
        if (dbError) throw dbError;

        res.status(201).json({ message: 'Imágenes subidas y asociadas correctamente.', asset: dbData });
    } catch (error) {
        console.error('Error al subir las imágenes:', error);
        res.status(500).json({ message: 'Error en el servidor al procesar los archivos.' });
    }
});

// La ruta DELETE que hicimos antes la podemos adaptar más adelante.
// Por ahora, ¡nos centramos en la creación!

module.exports = router;