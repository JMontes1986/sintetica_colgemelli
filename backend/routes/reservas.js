const express = require('express');
const getSupabase = require('../config/supabase');
const { verificarToken, verificarRol } = require('../middleware/auth');

const router = express.Router();

const HORA_APERTURA = 8;
const HORA_CIERRE = 21;
const TIMEZONE_COLOMBIA = 'America/Bogota';
const TIMEZONE_OFFSET_COLOMBIA = '-05:00';

const obtenerFechaActualColombia = () => new Date(
  new Date().toLocaleString('en-US', { timeZone: TIMEZONE_COLOMBIA })
);

const esHorarioEnElPasado = (fecha, hora) => {
  if (!fecha || !hora) return false;

  const fechaReserva = new Date(`${fecha}T${hora}:00${TIMEZONE_OFFSET_COLOMBIA}`);
  const fechaActualColombia = obtenerFechaActualColombia();

  return fechaReserva < fechaActualColombia;
};

const normalizarHora = (hora) => {
  if (!hora) return '';
  return hora.toString().slice(0, 5);
};

const formatearReserva = (reserva) => ({
  ...reserva,
  hora: normalizarHora(reserva.hora)
});

const buildHorariosDisponibles = (horaApertura = HORA_APERTURA, horaCierre = HORA_CIERRE) => {
  const apertura = Number.isInteger(horaApertura) ? horaApertura : HORA_APERTURA;
  const cierre = Number.isInteger(horaCierre) ? horaCierre : HORA_CIERRE;
  
  const horarios = [];

  for (let i = apertura; i <= cierre; i++) {
    horarios.push(`${i.toString().padStart(2, '0')}:00`);
  }

  return horarios;
};

const obtenerHorarioPorFecha = async (supabase, fecha) => {
  const horarioPorDefecto = {
    horaApertura: HORA_APERTURA,
    horaCierre: HORA_CIERRE,
    horas: buildHorariosDisponibles()
  };

  if (!supabase || !fecha) return horarioPorDefecto;

  try {
    const { data, error } = await supabase
      .from('configuracion_horarios')
      .select('id, fecha_inicio, fecha_fin, hora_apertura, hora_cierre')
      .lte('fecha_inicio', fecha)
      .gte('fecha_fin', fecha)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) return horarioPorDefecto;

    const horaApertura = parseInt(data.hora_apertura.toString().slice(0, 2), 10);
    const horaCierre = parseInt(data.hora_cierre.toString().slice(0, 2), 10);

    const horas = buildHorariosDisponibles(horaApertura, horaCierre);

    return {
      horaApertura,
      horaCierre,
      horas
    };
  } catch (error) {
    console.error('Error al obtener horario personalizado:', error);
    return horarioPorDefecto;
  }
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

     const horaNormalizada = normalizarHora(hora);

    if (esHorarioEnElPasado(fecha, horaNormalizada)) {
      return res.status(400).json({ error: 'No puedes reservar para una hora que ya pasó' });
    }
    
    // Verificar si ya existe reserva en esa fecha y hora
    const horarioDelDia = await obtenerHorarioPorFecha(supabase, fecha);

    if (!horarioDelDia.horas.includes(horaNormalizada)) {
      return res.status(400).json({ error: 'La cancha no está habilitada para ese horario.' });
    }
    
    const { data: existente, error: errorReservaExistente } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', fecha)
      .eq('hora', horaNormalizada)
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
        hora: horaNormalizada,
        estado: 'Pendiente'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reserva: formatearReserva(data)
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

    res.json({ reservas: data.map(formatearReserva) });
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

    const horaNormalizada = normalizarHora(hora);

    if (esHorarioEnElPasado(fecha, horaNormalizada)) {
      return res.status(400).json({ error: 'No puedes reservar para una hora que ya pasó' });
    }
    
    const horarioDelDia = await obtenerHorarioPorFecha(supabase, fecha);

    if (!horarioDelDia.horas.includes(horaNormalizada)) {
      return res.status(400).json({ error: 'La cancha no está habilitada para ese horario.' });
    }
    
    // Verificar disponibilidad
    const { data: existente, error: errorReservaExistente } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', fecha)
      .eq('hora', horaNormalizada)
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
        hora: horaNormalizada,
        estado: 'Pendiente',
        creado_por: req.usuario.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reserva: formatearReserva(data)
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

    const horarioDelDia = await obtenerHorarioPorFecha(supabase, fecha);
    const horariosDisponibles = horarioDelDia.horas;
    
    // Obtener reservas existentes para esa fecha
    const { data: reservasExistentes, error } = await supabase
      .from('reservas')
      .select('hora')
      .eq('fecha', fecha);

    if (error) throw error;

    const horasOcupadas = reservasExistentes.map((reserva) => normalizarHora(reserva.hora));
    const horasDisponibles = horariosDisponibles.filter(
      (h) => !horasOcupadas.includes(h) && !esHorarioEnElPasado(fecha, h)
    );

    res.json({
      fecha,
      horasDisponibles,
      horasOcupadas,
      horario: {
        horaApertura: `${horarioDelDia.horaApertura.toString().padStart(2, '0')}:00`,
        horaCierre: `${horarioDelDia.horaCierre.toString().padStart(2, '0')}:00`,
        horas: horarioDelDia.horas
      }
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
      horario: {
        horaApertura: `${HORA_APERTURA.toString().padStart(2, '0')}:00`,
        horaCierre: `${HORA_CIERRE.toString().padStart(2, '0')}:00`,
        horas: buildHorariosDisponibles()
      },
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

    res.json({ reserva: formatearReserva(data) });
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
      reserva: formatearReserva(data)
    });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al actualizar el estado', 'Error al actualizar estado:');
  }
});

module.exports = router;
