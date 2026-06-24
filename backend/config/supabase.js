const { createClient } = require('@supabase/supabase-js');

let supabaseInstance = null;
const buildMissingVarsMessage = (missingVars) =>
  `Configuración de Supabase incompleta: faltan ${missingVars.join(', ')}. En Netlify usa variables privadas sin prefijo SUPABASE_ para no exponerlas al build del frontend.`;

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

const getFirstEnv = (names) => {
  const name = names.find((envName) => process.env[envName]);
  return { name, value: name ? process.env[name] : undefined };
};

const getSupabaseKeyInfo = () => {
  const serviceKeyEnv = getFirstEnv(['PRIVATE_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);
  const anonKeyEnv = getFirstEnv(['PRIVATE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']);
  const publishableKeyEnv = getFirstEnv(['PRIVATE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY']);
  const legacyKeyEnv = getFirstEnv(['PRIVATE_SUPABASE_KEY', 'SUPABASE_KEY']);

  const serviceKey = serviceKeyEnv.value;
  const anonKey = anonKeyEnv.value;
  const publishableKey = publishableKeyEnv.value;
  const legacyKey = legacyKeyEnv.value;

  const selectedKeyEnv =
    serviceKeyEnv.name
      ? serviceKeyEnv
      : anonKeyEnv.name
        ? anonKeyEnv
        : publishableKeyEnv.name
          ? publishableKeyEnv
          : legacyKeyEnv.name
            ? legacyKeyEnv
            : { name: 'missing', value: undefined };
  const selectedKey = selectedKeyEnv.value;
  const selectedKeySource = selectedKeyEnv.name;
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
  const supabaseUrl = process.env.PRIVATE_SUPABASE_URL || process.env.SUPABASE_URL;
  const { selectedKey: supabaseKey } = getSupabaseKeyInfo();

  const missingVars = [];
  if (!supabaseUrl) missingVars.push('PRIVATE_SUPABASE_URL (o SUPABASE_URL local)');
  if (!supabaseKey) {
    missingVars.push('PRIVATE_SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SERVICE_ROLE_KEY local)');
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
  const supabaseUrl = process.env.PRIVATE_SUPABASE_URL || process.env.SUPABASE_URL;
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
