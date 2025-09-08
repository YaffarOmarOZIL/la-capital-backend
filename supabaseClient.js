require('dotenv').config(); // Importa la librería para leer .env
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Crea y exporta el cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;