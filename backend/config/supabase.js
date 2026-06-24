const { createClient } = require('@supabase/supabase-js');

let supabaseInstance = null;
const buildMissingVarsMessage = (missingVars) =>
  `Configuración de Supabase incompleta: faltan ${missingVars.join(', ')}. Define estas variables en Netlify (Site settings → Environment variables) o en tu .env local.`;

const decodeJwtPayload = (token) => {
  if (!token || token.split('.').length !== 3) return null;

  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (error) {
    return null;
  }
};

const inferSupabaseKeyRole = (key) => {
  if (!key) return null;

  if (key.startsWith('sb_secret_')) return 'service_role';
  if (key.startsWith('sb_publishable_')) return 'publishable';

  const payload = decodeJwtPayload(key);
  return payload?.role || null;
};

const getSupabaseKeyInfo = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const legacyKey = process.env.SUPABASE_KEY;

  const selectedKey =
    serviceKey ||
    anonKey ||
    publishableKey ||
    legacyKey;
  const selectedKeySource = serviceKey
    ? 'SUPABASE_SERVICE_ROLE_KEY'
    : anonKey
      ? 'SUPABASE_ANON_KEY'
      : publishableKey
        ? 'SUPABASE_PUBLISHABLE_KEY'
        : legacyKey
          ? 'SUPABASE_KEY'
          : 'missing';
  const selectedKeyRole = inferSupabaseKeyRole(selectedKey);
  const serviceRoleKeyRole = inferSupabaseKeyRole(serviceKey);
  const serviceRoleKeyValid = serviceRoleKeyRole === 'service_role';
  const serviceRoleKeyMisconfigured = Boolean(serviceKey) && !serviceRoleKeyValid;

  return {
    selectedKey,
    selectedKeySource,
    selectedKeyRole,
    serviceRoleKeyPresent: Boolean(serviceKey),
    serviceRoleKeyRole,
    serviceRoleKeyValid,
    serviceRoleKeyMisconfigured,
    keyType: selectedKeyRole || (selectedKey ? 'unknown' : 'missing')
  };
};

const createSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const { selectedKey: supabaseKey } = getSupabaseKeyInfo();

  const missingVars = [];
  if (!supabaseUrl) missingVars.push('SUPABASE_URL');
  if (!supabaseKey) {
    missingVars.push('SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY o SUPABASE_KEY');
  }
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
  const supabaseUrl = process.env.SUPABASE_URL;
  const {
    selectedKey,
    selectedKeySource,
    selectedKeyRole,
    serviceRoleKeyPresent,
    serviceRoleKeyRole,
    serviceRoleKeyValid,
    serviceRoleKeyMisconfigured,
    keyType
  } = getSupabaseKeyInfo();

  return {
    supabaseUrl,
    supabaseUrlPresent: Boolean(supabaseUrl),
    supabaseKeyPresent: Boolean(selectedKey),
    keyType,
    selectedKeySource,
    selectedKeyRole,
    serviceRoleKeyPresent,
    serviceRoleKeyRole,
    serviceRoleKeyValid,
    serviceRoleKeyMisconfigured
  };
};

module.exports = getSupabase;
module.exports.getStatus = getSupabaseStatus;
