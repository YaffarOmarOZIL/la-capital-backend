// En /la_capital_f_idelizacion/assetRoutes.js (Versión FINAL que acepta JSON)

require('dotenv').config(); // <-- Es una buena práctica cargarlo aquí
const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAdmin } = require('./authMiddleware');
const { Buffer } = require('buffer');

// ----- ¡YA NO NECESITAMOS multer AQUÍ! -----

router.post('/products/:productId/assets/images', isAdmin, async (req, res) => {
    const { productId } = req.params;
    const { finalFileMap } = req.body; // <-- Ahora esperamos un objeto JSON del frontend

    if (!finalFileMap || Object.keys(finalFileMap).length === 0) {
        return res.status(400).json({ message: 'No hay imágenes para subir.' });
    }

    try {
        const imageUrls = {};

        // 1. Primero, obtenemos la lista de archivos antiguos para saber cuáles borrar
        const { data: oldAsset } = await supabase.from('ActivosDigitales').select('urls_imagenes').eq('id_producto', productId).single();

        // 2. Iteramos sobre el "mapa" de imágenes que nos manda el frontend
        for (const angle in finalFileMap) {
            const fileData = finalFileMap[angle];
            
            // Si el dato es una URL (empieza con http), significa que es una imagen antigua
            // que no ha cambiado, así que simplemente la guardamos.
            if (typeof fileData === 'string' && fileData.startsWith('http')) {
                imageUrls[angle] = fileData;
                continue; // <-- Saltamos al siguiente archivo
            }

            // Si no es una URL, ¡es un archivo nuevo en Base64!
            const fileExt = fileData.startsWith('data:image/png') ? 'png' : 'jpg';
            const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `producto_${productId}_${angle}_${Date.now()}.${fileExt}`;
            
            // 3. Borramos el archivo antiguo de esta vista si existía, para no dejar basura
            if (oldAsset?.urls_imagenes?.[angle]) {
                const oldFileName = oldAsset.urls_imagenes[angle].split('/').pop();
                await supabase.storage.from('modelos-3d').remove([oldFileName]);
            }
            
            // 4. Subimos el nuevo archivo
            const { error: uploadError } = await supabase.storage.from('modelos-3d').upload(fileName, buffer, { contentType: `image/${fileExt}` });
            if (uploadError) throw uploadError;
            
            // 5. Obtenemos su nueva URL pública
            const { data: urlData } = supabase.storage.from('modelos-3d').getPublicUrl(fileName);
            imageUrls[angle] = urlData.publicUrl;
        }

        // 6. Guardamos el objeto JSONB completo y actualizado en la base de datos
        const { data: dbData, error: dbError } = await supabase.from('ActivosDigitales').upsert({ id_producto: productId, urls_imagenes: imageUrls }, { onConflict: 'id_producto' }).select().single();
        if (dbError) throw dbError;

        res.status(201).json({ message: 'Imágenes guardadas correctamente.', asset: dbData });
    } catch (error) {
        console.error('Error al subir las imágenes:', error);
        res.status(500).json({ message: 'Error en el servidor al procesar las imágenes.' });
    }
});

module.exports = router;