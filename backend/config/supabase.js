const { createClient } = require('@supabase/supabase-js');

let supabaseInstance = null;
const buildMissingVarsMessage = (missingVars) =>
 `Configuración de Supabase incompleta: faltan ${missingVars.join(', ')}. Define estas variables en Netlify (Site settings → Environment variables) o en tu .env local.`;

const FALLBACK_SUPABASE_URL = 'https://hfgdlgapdossqycsjzgs.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_x3IwFsXzhYjI4u_6N3TbxA__iXIohNm';

const createSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_KEY;

  const missingVars = [];
  if (!process.env.SUPABASE_URL && !FALLBACK_SUPABASE_URL)
    missingVars.push('SUPABASE_URL');
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_ANON_KEY &&
    !process.env.SUPABASE_PUBLISHABLE_KEY &&
    !FALLBACK_SUPABASE_KEY
  )
    missingVars.push('SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY o SUPABASE_PUBLISHABLE_KEY');

  if (missingVars.length) {
    const error = new Error(buildMissingVarsMessage(missingVars));
    error.code = 'SUPABASE_CONFIG_MISSING';
    throw error;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
};

/**
 * Obtiene el cliente de Supabase reutilizando la instancia para evitar
 * recrearla en cada petición. Si faltan variables de entorno se lanza un
 * error con un mensaje orientado al despliegue en Netlify.
 */
const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;
  return createSupabaseClient();
};

const getSupabaseStatus = () => {
  const supabaseUrl = process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
 const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY;

  return {
    supabaseUrl,
    supabaseUrlPresent: Boolean(supabaseUrl),
    supabaseKeyPresent: Boolean(serviceKey || anonKey || publishableKey),
    keyType: serviceKey ? 'service_role' : anonKey ? 'anon' : 'publishable'
  };
};

module.exports = getSupabase;
module.exports.getStatus = getSupabaseStatus;
