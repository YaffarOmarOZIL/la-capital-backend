// testCreateUser.js - Nuestro laboratorio de pruebas

const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');

// --- DATOS DEL USUARIO DE PRUEBA ---
// ¡Puedes cambiar estos datos para probar diferentes casos!
const testUser = {
  nombre_completo: 'Usuario De Prueba',
  email: `testuser_${Date.now()}@lacapital.com`, // Email único cada vez que corremos
  password: 'TestPassword123!',
  id_rol: 2, // 2 para "Empleado"
};

// Función asíncrona para poder usar await
async function runTest() {
  console.log('--- INICIANDO PRUEBA DE CREACIÓN DE USUARIO ---');
  
  try {
    // --- 1. PRUEBA DE CONEXIÓN A SUPABASE ---
    console.log('\n[Paso 1/3] Verificando conexión con Supabase...');
    const { data: testData, error: testError } = await supabase.from('Roles').select('id').limit(1);
    if (testError) {
      throw new Error(`¡Fallo en la conexión! Supabase dice: ${testError.message}`);
    }
    console.log('✅ Conexión con Supabase exitosa.');
    
    // --- 2. PRUEBA DE HASHEO DE CONTRASEÑA ---
    console.log('\n[Paso 2/3] Hasheando la contraseña...');
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(testUser.password, salt);
    console.log('✅ Hasheo de contraseña exitoso.');
    
    // --- 3. PRUEBA DE INSERCIÓN DE USUARIO ---
    console.log(`\n[Paso 3/3] Intentando insertar usuario con email: ${testUser.email}...`);
    
    const newUserForDb = {
        nombre_completo: testUser.nombre_completo,
        email: testUser.email,
        password_hash: password_hash,
        id_rol: testUser.id_rol
    };

    const { data, error } = await supabase
      .from('Usuarios')
      .insert(newUserForDb)
      .select()
      .single();

    if (error) {
        // Si hay un error de Supabase, lo lanzamos para que lo capture el catch
        throw new Error(`¡FALLO EN EL INSERT! Supabase dice: (código: ${error.code}) ${error.message}`);
    }

    if (!data) {
        throw new Error('FALLO CRÍTICO: El insert fue exitoso pero Supabase no devolvió el objeto del usuario.');
    }
    
    // --- CONCLUSIÓN ---
    console.log('\n\n--- ¡PRUEBA FINALIZADA CON ÉXITO! ---');
    console.log('✅ Usuario insertado correctamente en la base de datos.');
    console.log('Datos del usuario creado:', data);

  } catch (e) {
    console.error('\n\n--- ¡LA PRUEBA FALLÓ! ---');
    console.error('❌ Razón del error:', e.message);
  }
}

// Ejecutamos la prueba
runTest();