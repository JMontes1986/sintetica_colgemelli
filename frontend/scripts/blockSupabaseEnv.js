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
      'Mueve las llaves de Supabase al backend/Netlify Functions y elimina las variables del panel del sitio.'
  );
  process.exit(1);
}

console.log('✅ Sin variables de Supabase expuestas en el build del frontend');
