// En /la_capital_fidelizacion/assetRoutes.js (Versión FINAL y LIMPIA con Multer)

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

router.post('/products/:productId/assets/images', isAdmin, upload.fields(imageUploadFields), async (req, res) => {
    const { productId } = req.params;

    if (!req.files && Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No hay imágenes nuevas ni existentes para guardar.' });
    }

    try {
        const imageUrls = { ...req.body }; // <-- ¡Copiamos las URLs antiguas!
        
        // Si hay archivos NUEVOS...
        if (req.files) {
            for (const angle in req.files) {
                const file = req.files[angle][0];
                const fileName = `producto_${productId}_${angle}_${Date.now()}.png`; // Siempre guardamos como PNG
                
                // Subimos el buffer a Supabase
                const { error: uploadError } = await supabase.storage.from('modelos-3d').upload(fileName, file.buffer, { contentType: 'image/png', upsert: true });
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('modelos-3d').getPublicUrl(fileName);
                imageUrls[angle] = urlData.publicUrl;
            }
        }

        const { data: dbData, error: dbError } = await supabase.from('ActivosDigitales').upsert({ id_producto: productId, urls_imagenes: imageUrls }, { onConflict: 'id_producto' }).select().single();
        if (dbError) throw dbError;

        res.status(201).json({ message: 'Imágenes guardadas correctamente.', asset: dbData });
    } catch (error) {
        console.error('Error al subir las imágenes:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

module.exports = router;