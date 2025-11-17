// --- ARCHIVO OPTIMIZADO: la_capital_fidelizacion/recommendationRoutes.js ---

const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');
const { isAuthenticated } = require('./authMiddleware');

// ==========================================
// UTILIDADES Y HELPERS
// ==========================================

/**
 * Calcula el score de afinidad de un cliente por una categoría
 */
const calcularScoreAfinidad = async (clienteId, categoria) => {
    try {
        const { data, error } = await supabase.rpc('calcular_score_afinidad', {
            p_id_cliente: clienteId,
            p_categoria: categoria
        });
        
        if (error) throw error;
        return data || 0;
    } catch (err) {
        console.error('Error calculando score:', err);
        return 0;
    }
};

/**
 * Genera un mensaje personalizado para la recomendación
 */
const generarMensajePersonalizado = (cliente, producto, tipoRecomendacion) => {
    const nombre = cliente.nombres.split(' ')[0];
    const mensajes = {
        'alta_interaccion': [
            `¡Hola ${nombre}! 👋 Notamos que te interesó mucho "${producto.nombre}" en AR. ¿Ya lo probaste? ¡Te va a encantar! 😋`,
            `${nombre}, vimos que "${producto.nombre}" captó tu atención. Es uno de nuestros favoritos! 🍔`,
        ],
        'categoria_favorita': [
            `¡${nombre}! Sabemos que te encantan los platos de ${producto.categoria}. Prueba: "${producto.nombre}". ¡Imperdible! ⭐`,
            `Para un amante de ${producto.categoria} como tú, ${nombre}, recomendamos: "${producto.nombre}". 🎉`,
        ],
        'similar_users': [
            `¡Hola ${nombre}! Clientes con gustos similares amaron "${producto.nombre}". ¿Te sumás? 💛`,
        ],
        'abandono': [
            `¡Te extrañamos ${nombre}! 🥺 Tenemos algo nuevo: "${producto.nombre}". ¿Nos visitás pronto?`,
        ]
    };
    
    const opciones = mensajes[tipoRecomendacion] || mensajes['alta_interaccion'];
    return opciones[Math.floor(Math.random() * opciones.length)];
};

/**
 * FUNCIÓN CORE: Genera recomendaciones para UN cliente
 * (Ahora es una función interna, no un endpoint)
 */
const generarRecomendacionesParaCliente = async (clienteId) => {
    try {
        // 1. Obtener datos del cliente
        const { data: cliente, error: clienteError } = await supabase
            .from('Clientes')
            .select('*')
            .eq('id', clienteId)
            .single();
        
        if (clienteError || !cliente) {
            return { clienteId, success: false, error: 'Cliente no encontrado' };
        }
        
        const recomendaciones = [];
        
        // ==========================================
        // ALGORITMO 1: Alta Interacción sin Compra (>60 segundos)
        // ==========================================
        const { data: altaInteraccion } = await supabase
            .from('InteraccionesAR')
            .select(`
                id_producto,
                duracion_segundos,
                Productos(id, nombre, descripcion, precio, categoria)
            `)
            .eq('id_cliente', clienteId)
            .gte('duracion_segundos', 60)
            .order('duracion_segundos', { ascending: false })
            .limit(2);
        
        if (altaInteraccion) {
            for (const interaccion of altaInteraccion) {
                const producto = interaccion.Productos;
                
                // Verificar que no esté ya recomendado en los últimos 7 días
                const { data: yaRecomendado } = await supabase
                    .from('Recomendaciones')
                    .select('id')
                    .eq('id_cliente', clienteId)
                    .eq('id_producto', producto.id)
                    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                    .maybeSingle();
                
                if (!yaRecomendado) {
                    recomendaciones.push({
                        id_cliente: clienteId,
                        id_producto: producto.id,
                        tipo_recomendacion: 'alta_interaccion',
                        score_confianza: Math.min(interaccion.duracion_segundos / 180, 1),
                        mensaje_personalizado: generarMensajePersonalizado(cliente, producto, 'alta_interaccion')
                    });
                }
            }
        }
        
        // ==========================================
        // ALGORITMO 2: Categoría Favorita
        // ==========================================
        const { data: categoriaFavorita } = await supabase
            .from('ClientePreferencias')
            .select('categoria, score_afinidad')
            .eq('id_cliente', clienteId)
            .order('score_afinidad', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (categoriaFavorita && categoriaFavorita.score_afinidad >= 50 && recomendaciones.length < 3) {
            // Productos de esa categoría que NO haya visto
            const { data: productosCategoria } = await supabase
                .from('Productos')
                .select('*')
                .eq('categoria', categoriaFavorita.categoria)
                .eq('activo', true);
            
            const { data: productosVistos } = await supabase
                .from('InteraccionesAR')
                .select('id_producto')
                .eq('id_cliente', clienteId);
            
            const idsVistos = new Set(productosVistos?.map(p => p.id_producto) || []);
            const noVistos = productosCategoria?.filter(p => !idsVistos.has(p.id)) || [];
            
            if (noVistos.length > 0) {
                const producto = noVistos[0]; // Tomar el primero
                
                recomendaciones.push({
                    id_cliente: clienteId,
                    id_producto: producto.id,
                    tipo_recomendacion: 'categoria_favorita',
                    score_confianza: categoriaFavorita.score_afinidad / 100,
                    mensaje_personalizado: generarMensajePersonalizado(cliente, producto, 'categoria_favorita')
                });
            }
        }
        
        // ==========================================
        // Insertar Recomendaciones (Límite máximo: 3)
        // ==========================================
        
        const top3 = recomendaciones.slice(0, 3);
        
        if (top3.length > 0) {
            const { error: insertError } = await supabase
                .from('Recomendaciones')
                .insert(top3);
            
            if (insertError) {
                console.error(`Error insertando para cliente ${clienteId}:`, insertError);
                return { clienteId, success: false, count: 0, error: insertError.message };
            }
        }
        
        return { clienteId, success: true, count: top3.length };
        
    } catch (error) {
        console.error(`Error procesando cliente ${clienteId}:`, error);
        return { clienteId, success: false, count: 0, error: error.message };
    }
};

// ==========================================
// ENDPOINT 1: Generar para UN Cliente (Usa la función interna)
// ==========================================

router.post('/generate/:clientId', isAuthenticated, async (req, res) => {
    const { clientId } = req.params;
    
    try {
        console.log(`🤖 Generando recomendaciones para cliente ${clientId}...`);
        
        const resultado = await generarRecomendacionesParaCliente(clientId);
        
        if (resultado.success) {
            console.log(`✅ ${resultado.count} recomendaciones generadas`);
            return res.json({
                message: 'Recomendaciones generadas exitosamente',
                count: resultado.count
            });
        } else {
            return res.status(400).json({
                message: resultado.error || 'No se pudieron generar recomendaciones',
                count: 0
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ 
            message: 'Error al generar recomendaciones',
            error: error.message 
        });
    }
});

// ==========================================
// ENDPOINT 2: Generación MASIVA OPTIMIZADA
// ==========================================

router.post('/generate-all', isAuthenticated, async (req, res) => {
    try {
        console.log('🚀 Iniciando generación masiva optimizada...');
        
        // Obtener SOLO clientes con al menos 1 interacción AR
        const { data: clientesActivos, error } = await supabase
            .from('vista_perfil_cliente')
            .select('id')
            .gt('total_interacciones_ar', 0)
            .limit(100); // Límite de seguridad
        
        if (error) throw error;
        
        if (!clientesActivos || clientesActivos.length === 0) {
            return res.json({ 
                message: 'No hay clientes activos',
                clientesProcesados: 0,
                recomendacionesGeneradas: 0
            });
        }
        
        console.log(`📊 Procesando ${clientesActivos.length} clientes...`);
        
        // PROCESAMIENTO EN PARALELO (máximo 5 a la vez)
        const BATCH_SIZE = 5;
        let totalGeneradas = 0;
        let clientesProcesados = 0;
        const errores = [];
        
        for (let i = 0; i < clientesActivos.length; i += BATCH_SIZE) {
            const batch = clientesActivos.slice(i, i + BATCH_SIZE);
            
            // Procesar este batch en paralelo
            const resultados = await Promise.allSettled(
                batch.map(cliente => generarRecomendacionesParaCliente(cliente.id))
            );
            
            // Contar resultados
            resultados.forEach((resultado, index) => {
                if (resultado.status === 'fulfilled' && resultado.value.success) {
                    totalGeneradas += resultado.value.count;
                    clientesProcesados++;
                    console.log(`✅ Cliente ${batch[index].id}: ${resultado.value.count} recomendaciones`);
                } else {
                    const error = resultado.reason || resultado.value?.error;
                    errores.push({ clienteId: batch[index].id, error });
                    console.error(`❌ Cliente ${batch[index].id}: ${error}`);
                }
            });
            
            // Log de progreso cada batch
            console.log(`📈 Progreso: ${Math.min(i + BATCH_SIZE, clientesActivos.length)}/${clientesActivos.length}`);
        }
        
        console.log(`✅ Proceso completado: ${totalGeneradas} recomendaciones para ${clientesProcesados} clientes`);
        
        res.json({
            message: 'Generación masiva completada',
            clientesProcesados,
            recomendacionesGeneradas: totalGeneradas,
            totalClientes: clientesActivos.length,
            errores: errores.length > 0 ? errores.slice(0, 5) : null // Solo primeros 5 errores
        });
        
    } catch (error) {
        console.error('❌ Error en generación masiva:', error);
        res.status(500).json({ 
            message: 'Error en el proceso masivo',
            error: error.message 
        });
    }
});

// ==========================================
// ENDPOINT 3: Obtener Recomendaciones de un Cliente
// ==========================================

router.get('/client/:clientId', isAuthenticated, async (req, res) => {
    const { clientId } = req.params;
    const { estado } = req.query;
    
    try {
        let query = supabase
            .from('Recomendaciones')
            .select(`
                *,
                Productos(id, nombre, descripcion, precio, categoria, ActivosDigitales(urls_imagenes))
            `)
            .eq('id_cliente', clientId)
            .order('created_at', { ascending: false });
        
        if (estado) {
            query = query.eq('estado', estado);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json(data || []);
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error al obtener recomendaciones' });
    }
});

// ==========================================
// ENDPOINT 4: Dashboard de Recomendaciones
// ==========================================

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const [totalRes, pendientesRes, enviadasRes, aceptadasRes] = await Promise.all([
            supabase.from('Recomendaciones').select('id', { count: 'exact' }),
            supabase.from('Recomendaciones').select('id', { count: 'exact' }).eq('estado', 'pendiente'),
            supabase.from('Recomendaciones').select('id', { count: 'exact' }).eq('estado', 'enviada'),
            supabase.from('Recomendaciones').select('id', { count: 'exact' }).eq('estado', 'aceptada')
        ]);
        
        const total = totalRes.count || 0;
        const aceptadas = aceptadasRes.count || 0;
        const tasaConversion = total > 0 ? (aceptadas / total * 100).toFixed(2) : 0;
        
        // Distribución por tipo
        const { data: porTipo } = await supabase
            .from('Recomendaciones')
            .select('tipo_recomendacion');
        
        const tiposCount = {};
        porTipo?.forEach(r => {
            tiposCount[r.tipo_recomendacion] = (tiposCount[r.tipo_recomendacion] || 0) + 1;
        });
        
        const dashboard = {
            kpis: {
                total,
                pendientes: pendientesRes.count || 0,
                enviadas: enviadasRes.count || 0,
                aceptadas,
                tasa_conversion: tasaConversion
            },
            distribucion_tipos: Object.entries(tiposCount).map(([tipo, count]) => ({ tipo, count })),
            top_productos: []
        };
        
        res.json(dashboard);
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).json({ message: 'Error al cargar dashboard' });
    }
});

// ==========================================
// ENDPOINT 5: Marcar como Enviada
// ==========================================

router.put('/:id/mark-sent', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('Recomendaciones')
            .update({ 
                estado: 'enviada',
                fecha_envio: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ message: 'Actualizado', data });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error al actualizar' });
    }
});

// ==========================================
// ENDPOINT 6: Actualizar Preferencias de un Cliente
// ==========================================

router.post('/update-preferences/:clientId', isAuthenticated, async (req, res) => {
    const { clientId } = req.params;
    
    try {
        // Obtener todas las categorías
        const { data: categorias } = await supabase
            .from('Productos')
            .select('categoria')
            .eq('activo', true);
        
        const categoriasUnicas = [...new Set(categorias?.map(p => p.categoria) || [])];
        
        // Calcular scores
        for (const categoria of categoriasUnicas) {
            const score = await calcularScoreAfinidad(clientId, categoria);
            
            const { data: stats } = await supabase
                .from('InteraccionesAR')
                .select('duracion_segundos, id_producto')
                .eq('id_cliente', clientId)
                .eq('Productos.categoria', categoria);
            
            const productosVistos = new Set(stats?.map(s => s.id_producto) || []).size;
            const tiempoTotal = stats?.reduce((sum, s) => sum + (s.duracion_segundos || 0), 0) || 0;
            
            await supabase
                .from('ClientePreferencias')
                .upsert({
                    id_cliente: clientId,
                    categoria,
                    score_afinidad: score,
                    productos_vistos: productosVistos,
                    tiempo_total_ar_segundos: tiempoTotal
                }, { onConflict: 'id_cliente,categoria' });
        }
        
        const { data } = await supabase
            .from('ClientePreferencias')
            .select('*')
            .eq('id_cliente', clientId)
            .order('score_afinidad', { ascending: false });
        
        res.json({
            message: 'Preferencias actualizadas',
            preferencias: data
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error interno' });
    }
});

module.exports = router;