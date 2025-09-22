// En /la_capital_fidelizacion/assetRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('./supabaseClient');
const { isAdmin } = require('./authMiddleware');

// Configuración de Multer: Le decimos que guarde el archivo en la memoria del servidor
// temporalmente, antes de subirlo a Supabase.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- RUTA PARA SUBIR UN MODELO 3D ---
// Usará el método POST y recibirá el archivo bajo el campo 'modelFile'
router.post('/products/:productId/assets/model', isAdmin, upload.single('modelFile'), async (req, res) => {
    const { productId } = req.params;

    if (!req.file) {
        return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }

    try {
        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${productId}-${Date.now()}.${fileExt}`;

        // 1. Subir el archivo al bucket de Supabase
        const { error: uploadError } = await supabase.storage
            .from('modelos-3d')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true, // Si ya existe un archivo con ese nombre, lo reemplaza
            });

        if (uploadError) throw uploadError;

        // 2. Obtener la URL pública del archivo recién subido
        const { data: urlData } = supabase.storage
            .from('modelos-3d')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // 3. Guardar la URL en nuestra base de datos (en la tabla ActivosDigitales)
        // Usamos 'upsert' por si ya existía un modelo para este producto, lo actualiza.
        const { data: dbData, error: dbError } = await supabase
            .from('ActivosDigitales')
            .upsert({ 
                id_producto: productId, 
                url_modelo_3d: publicUrl 
            }, { onConflict: 'id_producto' })
            .select()
            .single();

        if (dbError) throw dbError;

        res.status(201).json({ message: 'Modelo 3D subido y asociado correctamente.', asset: dbData });

    } catch (error) {
        console.error('Error al subir el modelo 3D:', error);
        res.status(500).json({ message: 'Error en el servidor al procesar el archivo.' });
    }
});

// --- RUTA PARA ELIMINAR UN MODELO 3D ---
router.delete('/products/:productId/assets/model', isAdmin, async (req, res) => {
    const { productId } = req.params;

    try {
        // 1. Primero, buscamos en la BDD para obtener el nombre del archivo. ¡Esto es clave!
        const { data: assetData, error: findError } = await supabase
            .from('ActivosDigitales')
            .select('url_modelo_3d')
            .eq('id_producto', productId)
            .single();

        if (findError || !assetData) {
            return res.status(404).json({ message: 'No se encontró un activo digital para este producto.' });
        }

        // 2. Extraemos el nombre del archivo de la URL
        const fileName = assetData.url_modelo_3d.split('/').pop();

        // 3. Eliminamos el archivo del Bucket de Supabase Storage
        const { error: storageError } = await supabase.storage
            .from('modelos-3d')
            .remove([fileName]);

        if (storageError) {
            console.warn("Advertencia: No se pudo eliminar el archivo del storage, puede que ya no existiera. Continuando con el borrado de la BDD...");
        }

        // 4. Eliminamos el registro de la tabla 'ActivosDigitales'
        const { error: dbError } = await supabase
            .from('ActivosDigitales')
            .delete()
            .eq('id_producto', productId);

        if (dbError) throw dbError;

        res.status(200).json({ message: 'Activo digital eliminado correctamente.' });

    } catch (error) {
        console.error('Error al eliminar el activo digital:', error);
        res.status(500).json({ message: 'Error en el servidor al eliminar el activo.' });
    }
});

module.exports = router;