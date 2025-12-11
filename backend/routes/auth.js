const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getSupabase = require('../config/supabase');
const { verificarToken } = require('../middleware/auth');
const { getJwtSecret } = require('../utils/env');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
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
    const token = jwt.sign(
      { userId: usuario.id, email: usuario.email, rol: usuario.rol },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

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
    if (error.code === 'SUPABASE_CONFIG_MISSING' || error.code === 'JWT_SECRET_MISSING') {
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

// Registro (solo para testing, en producción controlar mejor)
router.post('/registro', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { email, nombre, password, rol = 'publico' } = req.body;

    if (!email || !nombre || !password) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Hash de contraseña
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
