const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getSupabase = require('../config/supabase');
const { verificarToken } = require('../middleware/auth');
const { getJwtSecret } = require('../utils/env');

const router = express.Router();

const isEmailValido = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor || '');
const isPasswordFuerte = (valor) => typeof valor === 'string' && valor.length >= 8;
const ROLES_PERMITIDOS = ['admin', 'cancha', 'publico'];

const ensureServiceRole = () => {
  const supabaseStatus = getSupabase.getStatus?.();
  const isServiceRole = supabaseStatus?.keyType === 'service_role';

  return {
    isServiceRole,
    supabaseStatus
  };
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { isServiceRole, supabaseStatus } = ensureServiceRole();

    if (!isServiceRole) {
      return res.status(503).json({
        error: 'Servicio de autenticación no disponible',
        message:
          'Activa SUPABASE_SERVICE_ROLE_KEY en el backend para consultar la tabla usuarios cuando RLS está habilitado.',
        detalle: supabaseStatus
      });
    }
    
    const supabase = getSupabase();
    const email = req.body?.email?.toString().trim();
    const password = req.body?.password;

    if (!isEmailValido(email) || !isPasswordFuerte(password)) {
      return res.status(400).json({ error: 'Email o contraseña inválidos' });
    }

    // Buscar usuario
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      if (error.code === '42501') {
        return res.status(503).json({
          error: 'Servicio de autenticación no disponible',
          message:
            'RLS está activo en la tabla usuarios y la clave actual no tiene permisos. Usa SUPABASE_SERVICE_ROLE_KEY en el backend.',
          detalle: error
        });
      }
      
      console.error('Error de Supabase al buscar usuario:', error);
      return res.status(503).json({ error: 'Servicio de autenticación no disponible' });
    }

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign({ userId: usuario.id, email: usuario.email, rol: usuario.rol }, getJwtSecret(), {
      expiresIn: '2h'
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    if (
      error.code === 'SUPABASE_CONFIG_MISSING' ||
      error.code === 'JWT_SECRET_MISSING' ||
      error.code === 'JWT_SECRET_WEAK'
    ) {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Verificar token actual
router.get('/verificar', verificarToken, (req, res) => {
  res.json({
    usuario: {
      id: req.usuario.id,
      email: req.usuario.email,
      nombre: req.usuario.nombre,
      rol: req.usuario.rol
    }
  });
});

// Crear usuario temporal en Supabase Auth
router.post('/supabase-signup', async (req, res) => {
  try {
    const email = req.body?.email?.toString().trim();
    const password = req.body?.password;

    if (!isEmailValido(email) || !isPasswordFuerte(password)) {
      return res.status(400).json({ error: 'Correo o contraseña inválidos' });
    }

    const { isServiceRole, supabaseStatus } = ensureServiceRole();

    if (!isServiceRole) {
      return res.status(400).json({
        error: 'Faltan credenciales de servicio de Supabase',
        message:
          'Configura SUPABASE_SERVICE_ROLE_KEY en el backend. El frontend no debe exponer ninguna clave de Supabase.',
        detalle: supabaseStatus
      });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { origen: 'registro_temporal_frontend' }
    });

    if (error) {
      console.error('Error al crear usuario temporal en Supabase:', error);
      return res.status(503).json({
        error: 'No se pudo crear el usuario temporal en Supabase',
        message: error.message,
        detalle: error
      });
    }

    return res.status(201).json({
      message: 'Usuario temporal creado en Supabase',
      user: data.user
    });
  } catch (error) {
    console.error('Error inesperado al crear usuario temporal:', error);
    if (error.code === 'SUPABASE_CONFIG_MISSING') {
      return res.status(503).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Error al crear usuario temporal en Supabase' });
  }
});

// Registro (solo para testing, en producción controlar mejor)
router.post('/registro', async (req, res) => {
  try {
    const supabase = getSupabase();
    const email = req.body?.email?.toString().trim();
    const nombre = req.body?.nombre?.toString().trim();
    const password = req.body?.password;
    const rol = ROLES_PERMITIDOS.includes(req.body?.rol) ? req.body.rol : 'publico';
    if (!email || !nombre || !password) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Hash de contraseña
    if (!isEmailValido(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    if (!isPasswordFuerte(password)) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ email, nombre, password_hash: passwordHash, rol }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      throw error;
    }

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: {
        id: data.id,
        email: data.email,
        nombre: data.nombre,
        rol: data.rol
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    if (error.code === 'SUPABASE_CONFIG_MISSING') {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

module.exports = router;
