/*
 * Evita que Netlify inyecte claves de Supabase en el bundle del frontend.
 * Si se detecta cualquier variable SUPABASE_ en el entorno de build, el proceso falla
 * para forzar que esas llaves se definan únicamente en el backend/funciones.
 */
const hasSupabaseEnv = Object.keys(process.env).some(
  (key) => key.startsWith('SUPABASE_') && process.env[key]
);

if (hasSupabaseEnv) {
  console.error(
    '\n⛔️ Variables SUPABASE_* detectadas en el entorno del frontend.\n' +
      'Renómbralas en Netlify a PRIVATE_SUPABASE_URL y PRIVATE_SUPABASE_SERVICE_ROLE_KEY para que solo las use el backend/functions.'
  );
  process.exit(1);
}

console.log('✅ Sin variables de Supabase expuestas en el build del frontend');
