// --- ARCHIVO: la_capital_fidelizacion/campaignRoutes.js ---

const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAuthenticated } = require('./authMiddleware');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// OBTENER TODOS los ajustes de campaña
router.get('/settings', isAuthenticated, async (req, res) => {
    try {
        const { data, error } = await supabase.from('CampaignSettings').select('*');
        if (error) throw error;
        // Transformamos el array en un objeto para que el frontend lo use más fácil
        const settings = data.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
        res.json(settings);
    } catch (error) { res.status(500).json({ message: 'Error al obtener los ajustes.' }); }
});

// GUARDAR un ajuste de campaña (ej: un mensaje)
router.put('/settings', isAuthenticated, async (req, res) => {
    const { key, value } = req.body;
    try {
        const { data, error } = await supabase
            .from('CampaignSettings')
            .update({ value })
            .eq('key', key)
            .select();
        if (error) throw error;
        res.json(data);
    } catch (error) { res.status(500).json({ message: 'Error al guardar el ajuste.' }); }
});

// SUBIR Y GUARDAR LA IMAGEN de una campaña
router.post('/settings/image', isAuthenticated, upload.single('campaignImage'), async (req, res) => {
    const { campaignKey } = req.body; // 'birthday_campaign' o 'promo_campaign'
    if (!req.file || !campaignKey) return res.status(400).json({ message: 'Falta la imagen o la clave de la campaña.' });
    
    // El nombre del archivo es fijo para que se sobreescriba
    const fileName = `${campaignKey}_image.png`;
    try {
        const { error: uploadError } = await supabase.storage
            .from('campaigns')
            .upload(fileName, req.file.buffer, { contentType: 'image/png', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('campaigns').getPublicUrl(fileName);
        
        // Actualizamos la DB con la nueva URL
        const { data: campaignData } = await supabase.from('CampaignSettings').select('value').eq('key', campaignKey).single();
        const newValue = { ...campaignData.value, imageUrl: urlData.publicUrl };
        
        const { data, error: updateError } = await supabase
            .from('CampaignSettings').update({ value: newValue }).eq('key', campaignKey).select();
        
        if (updateError) throw updateError;
        res.json(data);

    } catch (error) { res.status(500).json({ message: 'Error al subir la imagen.' }); }
});

// GESTIONAR EL RATE LIMIT (la pausa anti-spam)
router.post('/rate-limit/check', isAuthenticated, async (req, res) => {
    try {
        const { data, error } = await supabase.from('CampaignSettings').select('value').eq('key', 'rate_limit').single();
        if (error) throw error;

        let { count, lastSent } = data.value;
        const now = new Date();
        const lastSentDate = new Date(lastSent);
        const diffMinutes = (now - lastSentDate) / 1000 / 60;

        if (count >= 5 && diffMinutes < 1) {
            const timeLeft = Math.ceil(60 - (diffMinutes * 60));
            return res.status(429).json({ message: `Límite alcanzado. Espera ${timeLeft} segundos.`, cooldown: timeLeft });
        }

        count = (diffMinutes >= 1) ? 1 : count + 1; // Si ha pasado más de 1 min, reiniciamos el contador a 1

        await supabase.from('CampaignSettings').update({ value: { count, lastSent: now.toISOString() } }).eq('key', 'rate_limit');

        res.status(200).json({ message: 'OK' });
    } catch (error) { res.status(500).json({ message: 'Error al verificar el límite.' }); }
});

module.exports = router;