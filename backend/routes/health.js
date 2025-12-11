const express = require('express');
const getSupabase = require('../config/supabase');

const router = express.Router();

router.get('/supabase', async (_req, res) => {
  const supabaseStatus = getSupabase.getStatus?.() || {};
  
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('usuarios').select('id').limit(1);

    if (error) {
      console.error('Error al verificar Supabase:', error);
      return res
        .status(503)
        .json({
          estado: 'error',
          mensaje: 'No se pudo conectar a Supabase',
          detalle: error.message,
          supabase: supabaseStatus
        });
    }

    res.json({
      estado: 'ok',
      mensaje: 'Supabase operativo',
      detalle: 'Consulta de validación en la tabla usuarios ejecutada correctamente.',
      supabase: supabaseStatus
    });
  } catch (error) {
    console.error('Error inesperado al comprobar Supabase:', error);
    if (error.code === 'SUPABASE_CONFIG_MISSING') {
      return res
        .status(503)
        .json({
          estado: 'error',
          mensaje: error.message,
          supabase: supabaseStatus
        });
    }
    res
      .status(503)
      .json({
        estado: 'error',
        mensaje: 'Error al comprobar Supabase',
        detalle: error.message,
        supabase: supabaseStatus
      });
  }
});

module.exports = router;
