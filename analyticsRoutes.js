// --- ARCHIVO COMPLETO: la_capital_fidelizacion/analyticsRoutes.js ---
const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAuthenticated } = require('./authMiddleware');

// Helper para convertir numeric a number
const parseNumeric = (value) => {
    if (value === null || value === undefined) return 0;
    return Number(value);
};

// ============================================
// ENDPOINT: Dashboard Summary (DashboardPage)
// ============================================
router.get('/dashboard-summary', isAuthenticated, async (req, res) => {
    try {
        console.log('📊 Iniciando dashboard-summary...');
        
        // KPIs
        const [
            newClientsData,
            totalLikesData,
            totalCommentsData,
            totalArData,
            visitsTrendData,
            topArProductData,
            topLikedProductsData
        ] = await Promise.all([
            // Nuevos clientes últimos 30 días
            supabase
                .from('Clientes')
                .select('id', { count: 'exact' })
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
            
            // Total de likes
            supabase
                .from('ProductLikes')
                .select('id', { count: 'exact' }),
            
            // Total de comentarios
            supabase
                .from('ProductComments')
                .select('id', { count: 'exact' }),
            
            // Total de tiempo en AR (en segundos, convertiremos a minutos)
            supabase
                .from('InteraccionesAR')
                .select('duracion_segundos'),
            
            // Tendencia de visitas últimos 30 días
            supabase
                .from('Visitas')
                .select('fecha_visita')
                .gte('fecha_visita', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
            
            // Producto más visto en AR - Cambiado a query directo
            supabase
                .from('InteraccionesAR')
                .select('id_producto, duracion_segundos, Productos(nombre)'),
            
            // Top 3 productos con más likes - Cambiado a query directo
            supabase
                .from('ProductLikes')
                .select('id_producto, Productos(nombre)')
        ]);

        // Validar errores
        if (newClientsData.error) throw new Error(`NewClients: ${newClientsData.error.message}`);
        if (totalLikesData.error) throw new Error(`TotalLikes: ${totalLikesData.error.message}`);
        if (totalCommentsData.error) throw new Error(`TotalComments: ${totalCommentsData.error.message}`);
        if (totalArData.error) throw new Error(`TotalAR: ${totalArData.error.message}`);
        if (visitsTrendData.error) throw new Error(`VisitsTrend: ${visitsTrendData.error.message}`);
        if (topArProductData.error) throw new Error(`TopARProduct: ${topArProductData.error.message}`);
        if (topLikedProductsData.error) throw new Error(`TopLikedProducts: ${topLikedProductsData.error.message}`);

        // Calcular total de minutos en AR
        const totalArSeconds = totalArData.data.reduce((sum, row) => sum + parseNumeric(row.duracion_segundos), 0);
        const totalArMinutes = Math.round(totalArSeconds / 60);

        // Procesar tendencia de visitas por día
        const visitsMap = {};
        visitsTrendData.data.forEach(visit => {
            const date = new Date(visit.fecha_visita).toISOString().split('T')[0];
            visitsMap[date] = (visitsMap[date] || 0) + 1;
        });
        const visitsTrend = Object.entries(visitsMap)
            .map(([fecha, visitas]) => ({ fecha, visitas }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));

        // Procesar producto más visto en AR
        const arProductMap = {};
        topArProductData.data.forEach(item => {
            const nombre = item.Productos?.nombre || 'Desconocido';
            if (!arProductMap[nombre]) {
                arProductMap[nombre] = 0;
            }
            arProductMap[nombre] += parseNumeric(item.duracion_segundos);
        });
        const topArProduct = Object.entries(arProductMap)
            .map(([nombre, total_duracion]) => ({ nombre, total_duracion }))
            .sort((a, b) => b.total_duracion - a.total_duracion)[0] || { nombre: 'N/A', total_duracion: 0 };

        // Procesar top 3 productos con más likes
        const likesProductMap = {};
        topLikedProductsData.data.forEach(item => {
            const nombre = item.Productos?.nombre || 'Desconocido';
            likesProductMap[nombre] = (likesProductMap[nombre] || 0) + 1;
        });
        const topLikedProducts = Object.entries(likesProductMap)
            .map(([nombre, like_count]) => ({ nombre, like_count }))
            .sort((a, b) => b.like_count - a.like_count)
            .slice(0, 3);

        const summary = {
            kpis: {
                newClientsLast30Days: newClientsData.count || 0,
                totalLikes: totalLikesData.count || 0,
                totalComments: totalCommentsData.count || 0,
                totalArInteractionMinutes: totalArMinutes
            },
            charts: {
                visitsTrend: visitsTrend
            },
            topStats: {
                mostViewedARProduct: topArProduct,
                topLikedProducts: topLikedProducts
            }
        };

        console.log('✅ Dashboard summary generado exitosamente');
        res.json(summary);
    } catch (error) {
        console.error("❌ Error al generar dashboard summary:", error);
        res.status(500).json({ 
            message: 'Error al procesar el resumen del dashboard.',
            error: error.message 
        });
    }
});

// ============================================
// ENDPOINT: Client Analysis (ClientAnalysisPage)
// ============================================
router.get('/client-analysis', isAuthenticated, async (req, res) => {
    try {
        console.log('📊 Iniciando client-analysis...');
        
        // Obtener todos los datos necesarios
        const [
            clientesData,
            interaccionesData,
            likesData,
            commentsData,
            productosData,
            holidaysData
        ] = await Promise.all([
            supabase.from('Clientes').select('*'),
            supabase.from('InteraccionesAR').select('*'),
            supabase.from('ProductLikes').select('*'),
            supabase.from('ProductComments').select('*, Clientes(nombres, apellidos), Productos(nombre)').order('created_at', { ascending: false }),
            supabase.from('Productos').select('*'),
            supabase.from('Feriados').select('*').order('fecha', { ascending: true })
        ]);

        if (clientesData.error) throw new Error(`Clientes: ${clientesData.error.message}`);
        if (interaccionesData.error) throw new Error(`Interacciones: ${interaccionesData.error.message}`);
        if (likesData.error) throw new Error(`Likes: ${likesData.error.message}`);
        if (commentsData.error) throw new Error(`Comments: ${commentsData.error.message}`);
        if (productosData.error) throw new Error(`Productos: ${productosData.error.message}`);
        if (holidaysData.error) throw new Error(`Holidays: ${holidaysData.error.message}`);

        // Procesar demographics
        const ageGroups = { 'Menor de 20': 0, '20-29 años': 0, '30-39 años': 0, '40-49 años': 0, '50+ años': 0 };
        const genderGroups = {};
        
        clientesData.data.forEach(cliente => {
            // Edad
            if (cliente.fecha_nacimiento) {
                const edad = new Date().getFullYear() - new Date(cliente.fecha_nacimiento).getFullYear();
                if (edad < 20) ageGroups['Menor de 20']++;
                else if (edad < 30) ageGroups['20-29 años']++;
                else if (edad < 40) ageGroups['30-39 años']++;
                else if (edad < 50) ageGroups['40-49 años']++;
                else ageGroups['50+ años']++;
            }
            
            // Género
            const genero = cliente.genero || 'No especificado';
            genderGroups[genero] = (genderGroups[genero] || 0) + 1;
        });

        const demographics = {
            ageDistribution: Object.entries(ageGroups).map(([group_name, count]) => ({ group_name, count })),
            genderDistribution: Object.entries(genderGroups).map(([group_name, count]) => ({ group_name, count }))
        };

        // Procesar top clients
        const clientStats = {};
        clientesData.data.forEach(c => {
            clientStats[c.id] = {
                id: c.id,
                nombres: c.nombres,
                apellidos: c.apellidos,
                total_ar_seconds: 0,
                total_likes: 0,
                total_comments: 0
            };
        });

        interaccionesData.data.forEach(i => {
            if (i.id_cliente && clientStats[i.id_cliente]) {
                clientStats[i.id_cliente].total_ar_seconds += parseNumeric(i.duracion_segundos);
            }
        });

        likesData.data.forEach(l => {
            if (l.id_cliente && clientStats[l.id_cliente]) {
                clientStats[l.id_cliente].total_likes++;
            }
        });

        commentsData.data.forEach(c => {
            if (c.id_cliente && clientStats[c.id_cliente]) {
                clientStats[c.id_cliente].total_comments++;
            }
        });

        const topClients = Object.values(clientStats)
            .sort((a, b) => (b.total_ar_seconds + b.total_likes * 10 + b.total_comments * 20) - 
                           (a.total_ar_seconds + a.total_likes * 10 + a.total_comments * 20))
            .slice(0, 3);

        // Procesar top products
        const productStats = {};
        productosData.data.forEach(p => {
            productStats[p.id] = {
                id: p.id,
                nombre: p.nombre,
                total_likes: 0,
                total_ar_seconds: 0,
                total_comments: 0
            };
        });

        interaccionesData.data.forEach(i => {
            if (productStats[i.id_producto]) {
                productStats[i.id_producto].total_ar_seconds += parseNumeric(i.duracion_segundos);
            }
        });

        likesData.data.forEach(l => {
            if (productStats[l.id_producto]) {
                productStats[l.id_producto].total_likes++;
            }
        });

        commentsData.data.forEach(c => {
            if (c.id_producto && productStats[c.id_producto]) {
                productStats[c.id_producto].total_comments++;
            }
        });

        const topProducts = Object.values(productStats)
            .sort((a, b) => (b.total_likes * 10 + b.total_ar_seconds + b.total_comments * 5) - 
                           (a.total_likes * 10 + a.total_ar_seconds + a.total_comments * 5))
            .slice(0, 3);

        // Procesar cumpleaños por mes
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const birthdaysByMonth = Array(12).fill(0).map((_, i) => ({ mes: monthNames[i], cantidad: 0 }));
        
        clientesData.data.forEach(c => {
            if (c.fecha_nacimiento) {
                const month = new Date(c.fecha_nacimiento).getMonth();
                birthdaysByMonth[month].cantidad++;
            }
        });

        const analysis = {
            demographics,
            topClients,
            topProducts,
            recentComments: commentsData.data.slice(0, 5),
            birthdaysByMonth,
            holidays: holidaysData.data || []
        };

        console.log('✅ Client analysis generado exitosamente');
        res.json(analysis);
    } catch (error) {
        console.error("❌ Error al generar el análisis de clientela:", error);
        res.status(500).json({ 
            message: 'Error al procesar el análisis de clientes.',
            error: error.message
        });
    }
});

// ============================================
// ENDPOINT: New Clients Trend (con rango de fechas)
// ============================================
router.get('/new-clients-trend', isAuthenticated, async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }
    try {
        console.log(`📊 Obteniendo tendencia de clientes: ${start} a ${end}`);
        const { data, error } = await supabase
            .from('Clientes')
            .select('created_at')
            .gte('created_at', start)
            .lte('created_at', end)
            .order('created_at', { ascending: true });
        
        if (error) throw error;

        // Agrupar por mes
        const monthMap = {};
        data.forEach(cliente => {
            const mes = new Date(cliente.created_at).toISOString().substring(0, 7); // YYYY-MM
            monthMap[mes] = (monthMap[mes] || 0) + 1;
        });

        const result = Object.entries(monthMap)
            .map(([mes, nuevos_clientes]) => ({ mes, nuevos_clientes }))
            .sort((a, b) => a.mes.localeCompare(b.mes));

        console.log('✅ Tendencia obtenida');
        res.json(result);
    } catch(error) {
        console.error("❌ Error al obtener tendencia de clientes:", error);
        res.status(500).json({ 
            message: 'Error al obtener la tendencia de clientes.',
            error: error.message 
        });
    }
});

// ============================================
// ENDPOINT: All Comments (para modal)
// ============================================
router.get('/all-comments', isAuthenticated, async (req, res) => {
    try {
        console.log('📊 Obteniendo todos los comentarios...');
        const { data, error } = await supabase
            .from('ProductComments')
            .select('*, Clientes(nombres, apellidos), Productos(nombre)')
            .order('created_at', { ascending: false });
        if(error) throw error;
        console.log(`✅ ${data.length} comentarios obtenidos`);
        res.json(data);
    } catch(error) {
        console.error("❌ Error al obtener todos los comentarios:", error);
        res.status(500).json({ 
            message: 'Error al obtener todos los comentarios.',
            error: error.message 
        });
    }
});

// ============================================
// ENDPOINT: Top Products con filtros personalizados
// ============================================
router.get('/top-products-filtered', isAuthenticated, async (req, res) => {
    try {
        const { metrics } = req.query; // "likes,comments,ar" o cualquier combinación
        console.log(`📊 Obteniendo top productos con métricas: ${metrics}`);
        
        const metricsArray = metrics ? metrics.split(',') : ['likes', 'comments', 'ar'];
        const useLikes = metricsArray.includes('likes');
        const useComments = metricsArray.includes('comments');
        const useAr = metricsArray.includes('ar');

        const [productosData, interaccionesData, likesData, commentsData] = await Promise.all([
            supabase.from('Productos').select('*'),
            useAr ? supabase.from('InteraccionesAR').select('*') : Promise.resolve({ data: [] }),
            useLikes ? supabase.from('ProductLikes').select('*') : Promise.resolve({ data: [] }),
            useComments ? supabase.from('ProductComments').select('*') : Promise.resolve({ data: [] })
        ]);

        if (productosData.error) throw productosData.error;

        const productStats = {};
        productosData.data.forEach(p => {
            productStats[p.id] = {
                id: p.id,
                nombre: p.nombre,
                total_likes: 0,
                total_ar_seconds: 0,
                total_comments: 0
            };
        });

        if (useAr && interaccionesData.data) {
            interaccionesData.data.forEach(i => {
                if (productStats[i.id_producto]) {
                    productStats[i.id_producto].total_ar_seconds += parseNumeric(i.duracion_segundos);
                }
            });
        }

        if (useLikes && likesData.data) {
            likesData.data.forEach(l => {
                if (productStats[l.id_producto]) {
                    productStats[l.id_producto].total_likes++;
                }
            });
        }

        if (useComments && commentsData.data) {
            commentsData.data.forEach(c => {
                if (c.id_producto && productStats[c.id_producto]) {
                    productStats[c.id_producto].total_comments++;
                }
            });
        }

        // Calcular score según las métricas seleccionadas
        const topProducts = Object.values(productStats)
            .map(p => {
                let score = 0;
                if (useLikes) score += p.total_likes * 10;
                if (useAr) score += p.total_ar_seconds;
                if (useComments) score += p.total_comments * 5;
                return { ...p, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        res.json(topProducts);
    } catch(error) {
        console.error("❌ Error al obtener top productos filtrados:", error);
        res.status(500).json({ 
            message: 'Error al obtener top productos.',
            error: error.message 
        });
    }
});

// ============================================
// ENDPOINT: Visits Trend con rango de fechas personalizado
// ============================================
router.get('/visits-trend', isAuthenticated, async (req, res) => {
    try {
        const { start, end } = req.query;
        const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = end || new Date().toISOString();

        console.log(`📊 Obteniendo visitas: ${startDate} a ${endDate}`);

        const { data, error } = await supabase
            .from('Visitas')
            .select('fecha_visita')
            .gte('fecha_visita', startDate)
            .lte('fecha_visita', endDate);

        if (error) throw error;

        // Procesar tendencia de visitas por día
        const visitsMap = {};
        data.forEach(visit => {
            const date = new Date(visit.fecha_visita).toISOString().split('T')[0];
            visitsMap[date] = (visitsMap[date] || 0) + 1;
        });
        
        const visitsTrend = Object.entries(visitsMap)
            .map(([fecha, visitas]) => ({ fecha, visitas }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));

        res.json(visitsTrend);
    } catch(error) {
        console.error("❌ Error al obtener tendencia de visitas:", error);
        res.status(500).json({ 
            message: 'Error al obtener tendencia de visitas.',
            error: error.message 
        });
    }
});

module.exports = router;