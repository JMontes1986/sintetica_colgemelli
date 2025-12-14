const jwt = require('jsonwebtoken');
const getSupabase = require('../config/supabase');
const { getJwtSecret } = require('../utils/env');

const ROLES_VALIDOS = ['admin', 'cancha', 'publico'];

// Middleware para verificar token JWT
const verificarToken = async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    
    // Verificar que el usuario existe
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!ROLES_VALIDOS.includes(usuario.rol)) {
      console.warn(`Intento de acceso con rol no permitido: ${usuario.rol || 'sin rol'}`);
      return res.status(403).json({ error: 'Rol no autorizado' });
    }
    
    req.usuario = usuario;
    next();
  } catch (error) {
    if (
      error.code === 'SUPABASE_CONFIG_MISSING' ||
      error.code === 'JWT_SECRET_MISSING' ||
      error.code === 'JWT_SECRET_WEAK'
    ) {
      return res.status(503).json({ error: error.message });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar rol
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      console.warn(
        `[ACCESS DENIED] Usuario ${req.usuario.id} con rol ${req.usuario.rol} intentó acceder a ${req.originalUrl}`
      );
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
};

module.exports = { verificarToken, verificarRol };
