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

router.put('/products/:productId/assets/qr', isAdmin, async (req, res) => {
    const { productId } = req.params;
    const { qrCodeDataUrl } = req.body; // <-- Recibimos el QR en Base64

    if (!qrCodeDataUrl) {
        return res.status(400).json({ message: 'No se proporcionó la imagen del código QR.' });
    }

    try {
        const buffer = Buffer.from(qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        const fileName = `qr_producto_${productId}.png`;

        // 1. Subimos el QR a nuestro nuevo bucket "qrcodes"
        const { error: uploadError } = await supabase.storage
            .from('qrcodes')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: true });
        
        if (uploadError) throw uploadError;

        // 2. Obtenemos su URL pública
        const { data: urlData } = supabase.storage.from('qrcodes').getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        // 3. Actualizamos la tabla 'ActivosDigitales' con la nueva URL del QR
        const { data: dbData, error: dbError } = await supabase
            .from('ActivosDigitales')
            .upsert({ id_producto: productId, url_qr_code: publicUrl }, { onConflict: 'id_producto' })
            .select()
            .single();

        if (dbError) throw dbError;

        res.json({ message: 'Código QR guardado correctamente.', asset: dbData });
    } catch (error) {
        console.error("Error al guardar el QR:", error);
        res.status(500).json({ message: 'Error en el servidor al guardar el QR.' });
    }
});

module.exports = router;