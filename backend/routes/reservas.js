const express = require('express');
const getSupabase = require('../config/supabase');
const { verificarToken, verificarRol } = require('../middleware/auth');

const router = express.Router();

const HORA_APERTURA = 8;
const HORA_CIERRE = 20;

const buildHorariosDisponibles = () => {
  const horarios = [];

  for (let i = HORA_APERTURA; i <= HORA_CIERRE; i++) {
    horarios.push(`${i.toString().padStart(2, '0')}:00`);
  }

  return horarios;
};

const handleSupabaseError = (res, error, defaultMessage, logContext) => {
  if (logContext) {
    console.error(logContext, error);
  }

  if (error.code === 'SUPABASE_CONFIG_MISSING') {
    return res.status(503).json({ error: error.message });
  }

  return res.status(500).json({ error: defaultMessage });
};

// Crear reserva (público - sin autenticación)
router.post('/crear', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { nombre_cliente, email_cliente, celular_cliente, fecha, hora } = req.body;

    // Validaciones
    if (!nombre_cliente || !email_cliente || !celular_cliente || !fecha || !hora) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si ya existe reserva en esa fecha y hora
    const { data: existente, error: errorReservaExistente } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', fecha)
      .eq('hora', hora)
      .maybeSingle();

    if (errorReservaExistente) throw errorReservaExistente;

    if (existente) {
      return res.status(400).json({ error: 'Ya existe una reserva para esa fecha y hora' });
    }

    // Crear reserva
    const { data, error } = await supabase
      .from('reservas')
      .insert([{
        nombre_cliente,
        email_cliente,
        celular_cliente,
        fecha,
        hora,
        estado: 'Pendiente'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reserva: data
    });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al crear la reserva', 'Error al crear reserva:');
  }
});

// Obtener todas las reservas (requiere autenticación)
router.get('/', verificarToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { fecha, estado } = req.query;
    
    let query = supabase
      .from('reservas')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    // Filtros opcionales
    if (fecha) {
      query = query.eq('fecha', fecha);
    }
    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ reservas: data });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al obtener reservas', 'Error al obtener reservas:');
  }
});

// Crear reserva manual (cancha y admin)
router.post('/manual', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { nombre_cliente, email_cliente, celular_cliente, fecha, hora } = req.body;

    if (!nombre_cliente || !email_cliente || !celular_cliente || !fecha || !hora) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar disponibilidad
    const { data: existente, error: errorReservaExistente } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', fecha)
      .eq('hora', hora)
      .maybeSingle();

    if (errorReservaExistente) throw errorReservaExistente;

    if (existente) {
      return res.status(400).json({ error: 'Ya existe una reserva para esa fecha y hora' });
    }

    const { data, error } = await supabase
      .from('reservas')
      .insert([{
        nombre_cliente,
        email_cliente,
        celular_cliente,
        fecha,
        hora,
        estado: 'Pendiente',
        creado_por: req.usuario.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reserva: data
    });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al crear la reserva', 'Error al crear reserva manual:');
  }
});

// Eliminar reserva (solo admin)
router.delete('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al eliminar la reserva', 'Error al eliminar reserva:');
  }
});

// Obtener reservas disponibles por fecha
router.get('/disponibilidad/:fecha', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { fecha } = req.params;

    const horariosDisponibles = buildHorariosDisponibles();
    
    // Obtener reservas existentes para esa fecha
    const { data: reservasExistentes, error } = await supabase
      .from('reservas')
      .select('hora')
      .eq('fecha', fecha);

    if (error) throw error;

    const horasOcupadas = reservasExistentes.map(r => r.hora);
    const horasDisponibles = horariosDisponibles.filter(h => !horasOcupadas.includes(h));

    res.json({
      fecha,
      horasDisponibles,
      horasOcupadas
    });
  } catch (error) {
   // En caso de cualquier error (incluida la falta de configuración de Supabase)
    // devolvemos la lista completa de horarios disponibles para no bloquear
    // la reserva desde el frontend. Se registra el error para poder depurarlo.
    console.error('Error al obtener disponibilidad:', error);

    return res.json({
      fecha: req.params.fecha,
      horasDisponibles: buildHorariosDisponibles(),
      horasOcupadas: [],
      error: 'Se usó disponibilidad por defecto debido a un problema al consultar Supabase'
    });
  }
});

// Obtener reserva por ID
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    res.json({ reserva: data });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al obtener la reserva', 'Error al obtener reserva:');
  }
});

// Actualizar estado de reserva (cancha y admin)
router.patch('/:id/estado', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !['Pendiente', 'Jugado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const { data, error } = await supabase
      .from('reservas')
      .update({ estado })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Estado actualizado exitosamente',
      reserva: data
    });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al actualizar el estado', 'Error al actualizar estado:');
  }
});

module.exports = router;
