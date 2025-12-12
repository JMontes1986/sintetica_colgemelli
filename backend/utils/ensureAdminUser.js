const bcrypt = require('bcryptjs');
const getSupabase = require('../config/supabase');

const logPrefix = '[Admin inicial]';

const ensureDefaultAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NAME || 'Administrador';

  if (!email || !password) {
    // Sin credenciales configuradas no hacemos nada (útil para despliegues públicos)
    return;
  }

  try {
    const supabase = getSupabase();

    // Buscar usuario existente
    const { data: usuario, error: buscarError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (buscarError && buscarError.code !== 'PGRST116') {
      console.error(logPrefix, 'Error al verificar usuario admin:', buscarError);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (!usuario) {
      const { error: crearError } = await supabase
        .from('usuarios')
        .insert([{ email, nombre, password_hash: passwordHash, rol: 'admin' }]);

      if (crearError) {
        console.error(logPrefix, 'No se pudo crear el admin inicial:', crearError);
        return;
      }

      console.log(logPrefix, 'Administrador creado con éxito');
      return;
    }

    const updates = {};

    // Asegurar rol admin
    if (usuario.rol !== 'admin') {
      updates.rol = 'admin';
    }

    // Actualizar contraseña si no coincide
    const passwordCoincide = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordCoincide) {
      updates.password_hash = passwordHash;
    }

    // Mantener nombre actualizado para que coincida con la config
    if (usuario.nombre !== nombre) {
      updates.nombre = nombre;
    }

    if (Object.keys(updates).length === 0) {
      return; // Nada que actualizar
    }

    const { error: actualizarError } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', usuario.id);

    if (actualizarError) {
      console.error(logPrefix, 'No se pudo actualizar el admin inicial:', actualizarError);
      return;
    }

    console.log(logPrefix, 'Administrador actualizado con los datos configurados');
  } catch (error) {
    console.error(logPrefix, 'Error inesperado al asegurar admin por defecto:', error);
  }
};

module.exports = { ensureDefaultAdmin };
