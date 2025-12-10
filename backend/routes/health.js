const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

router.get('/supabase', async (_req, res) => {
  try {
    const { error } = await supabase.from('usuarios').select('id').limit(1);

    if (error) {
      console.error('Error al verificar Supabase:', error);
      return res
        .status(503)
        .json({ estado: 'error', mensaje: 'No se pudo conectar a Supabase' });
    }

    res.json({ estado: 'ok', mensaje: 'Supabase operativo' });
  } catch (error) {
    console.error('Error inesperado al comprobar Supabase:', error);
    res
      .status(503)
      .json({ estado: 'error', mensaje: 'Error al comprobar Supabase' });
  }
});

module.exports = router;
