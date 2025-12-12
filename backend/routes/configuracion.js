const express = require('express');
const getSupabase = require('../config/supabase');
const { verificarToken, verificarRol } = require('../middleware/auth');

const router = express.Router();

const parseHora = (valor) => {
  if (!valor) return null;
  const [hora] = valor.split(':');
  const numero = parseInt(hora, 10);
  return Number.isInteger(numero) ? numero : null;
};

const validarRango = ({ fecha_inicio, fecha_fin, hora_apertura, hora_cierre }) => {
  if (!fecha_inicio || !fecha_fin || !hora_apertura || !hora_cierre) {
    return 'Todos los campos son obligatorios.';
  }

  if (fecha_fin < fecha_inicio) {
    return 'La fecha fin debe ser igual o posterior a la fecha inicio.';
  }

  const apertura = parseHora(hora_apertura);
  const cierre = parseHora(hora_cierre);

  if (apertura === null || cierre === null) {
    return 'Formato de hora inválido. Usa HH:mm.';
  }

  if (cierre <= apertura) {
    return 'La hora de cierre debe ser mayor a la hora de apertura.';
  }

  return null;
};

router.get('/horarios', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('configuracion_horarios')
      .select('*')
      .order('fecha_inicio', { ascending: true });

    if (error) throw error;

    res.json({ configuraciones: data || [] });
  } catch (error) {
    console.error('Error al obtener configuraciones de horario:', error);
    return res.status(500).json({ error: 'No pudimos cargar los horarios configurados.' });
  }
});

router.post('/horarios', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { fecha_inicio, fecha_fin, hora_apertura, hora_cierre } = req.body;

    const mensajeValidacion = validarRango({ fecha_inicio, fecha_fin, hora_apertura, hora_cierre });
    if (mensajeValidacion) {
      return res.status(400).json({ error: mensajeValidacion });
    }

    const { data, error } = await supabase
      .from('configuracion_horarios')
      .insert([{ fecha_inicio, fecha_fin, hora_apertura, hora_cierre }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ configuracion: data, message: 'Horario actualizado correctamente.' });
  } catch (error) {
    console.error('Error al guardar configuración de horario:', error);
    return res.status(500).json({ error: 'No pudimos guardar el horario.' });
  }
});

router.delete('/horarios/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    const { error } = await supabase.from('configuracion_horarios').delete().eq('id', id);

    if (error) throw error;

    res.json({ message: 'Horario eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar configuración de horario:', error);
    return res.status(500).json({ error: 'No pudimos eliminar el horario.' });
  }
});

module.exports = router;
