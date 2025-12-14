const express = require('express');
const getSupabase = require('../config/supabase');
const { verificarToken, verificarRol } = require('../middleware/auth');
const xss = require('xss');

const router = express.Router();

const HORA_APERTURA = 8;
const HORA_CIERRE = 21;
const TIMEZONE_COLOMBIA = 'America/Bogota';
const TIMEZONE_OFFSET_COLOMBIA = '-05:00';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const ESTADOS_VALIDOS = ['Pendiente', 'Jugado'];
const METODOS_PAGO_VALIDOS = ['Nequi', 'Efectivo'];
const MAX_HORAS_CONSECUTIVAS = 3;

const obtenerFechaActualColombia = () => new Date(
  new Date().toLocaleString('en-US', { timeZone: TIMEZONE_COLOMBIA })
);

const esFechaValida = (valor) => Boolean(valor && DATE_REGEX.test(valor));

const esHoraValida = (valor) => Boolean(valor && TIME_REGEX.test(valor));

const esIdValido = (valor) => /^\d+$/.test(String(valor));

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

const sanitizarTexto = (valor) => (typeof valor === 'string' ? xss(valor) : valor);

const ordenarHorasPorHorario = (horas, horario) =>
  horas.slice().sort((a, b) => horario.indexOf(a) - horario.indexOf(b));

const sonHorasConsecutivas = (horas, horario) => {
  if (horas.length <= 1) return true;

  const horasOrdenadas = ordenarHorasPorHorario(horas, horario);

  for (let i = 1; i < horasOrdenadas.length; i++) {
    const diferencia = horario.indexOf(horasOrdenadas[i]) - horario.indexOf(horasOrdenadas[i - 1]);
    if (diferencia !== 1) return false;
  }

  return true;
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
    const nombre_cliente = sanitizarTexto(req.body?.nombre_cliente);
    const email_cliente = sanitizarTexto(req.body?.email_cliente);
    const celular_cliente = sanitizarTexto(req.body?.celular_cliente);
    const fecha = sanitizarTexto(req.body?.fecha);

    const horasSolicitadas = Array.isArray(req.body?.horas)
      ? req.body.horas
      : req.body?.hora
        ? [req.body.hora]
        : [];

    // Validaciones
    if (!nombre_cliente || nombre_cliente.length < 3 || nombre_cliente.length > 100) {
      return res.status(400).json({ error: 'Nombre inválido' });
    }

    if (!celular_cliente || !/^\d{10}$/.test(celular_cliente)) {
      return res.status(400).json({ error: 'Teléfono debe tener 10 dígitos' });
    }

    if (!email_cliente || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_cliente)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    if (!esFechaValida(fecha)) {
      return res.status(400).json({ error: 'Fecha es requerida y debe tener formato YYYY-MM-DD' });
    }

    const fechaReserva = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (Number.isNaN(fechaReserva.getTime())) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }

    if (!horasSolicitadas.length) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un horario' });
    }

    if (horasSolicitadas.length > MAX_HORAS_CONSECUTIVAS) {
      return res
        .status(400)
        .json({ error: `Puedes reservar hasta ${MAX_HORAS_CONSECUTIVAS} horas consecutivas` });
    }

    const horasNormalizadas = [...new Set(horasSolicitadas.map(normalizarHora))];

    if (!horasNormalizadas.every(esHoraValida)) {
      return res.status(400).json({ error: 'Todas las horas deben tener formato HH:mm' });
    }
    
    const horarioDelDia = await obtenerHorarioPorFecha(supabase, fecha);

    if (!horasNormalizadas.every((hora) => horarioDelDia.horas.includes(hora))) {
      return res.status(400).json({ error: 'La cancha no está habilitada para uno de los horarios seleccionados.' });
    }
    
    const horasOrdenadas = ordenarHorasPorHorario(horasNormalizadas, horarioDelDia.horas);

    if (!sonHorasConsecutivas(horasOrdenadas, horarioDelDia.horas)) {
      return res.status(400).json({ error: 'Las horas seleccionadas deben ser consecutivas.' });
    }

    if (horasOrdenadas.some((horaSeleccionada) => esHorarioEnElPasado(fecha, horaSeleccionada))) {
      return res.status(400).json({ error: 'No puedes reservar para una hora que ya pasó' });
    }

    const { data: reservasOcupadas, error: errorReservaExistente } = await supabase
      .from('reservas')
      .select('hora')
      .eq('fecha', fecha)
      .in('hora', horasOrdenadas);

    if (errorReservaExistente) throw errorReservaExistente;

    if (reservasOcupadas?.length) {
      const horasOcupadas = reservasOcupadas.map((reserva) => normalizarHora(reserva.hora));
      return res
        .status(400)
        .json({ error: `Ya existe una reserva para: ${horasOcupadas.join(', ')}` });
    }

    // Crear reservas múltiples (una por cada hora seleccionada)
    const reservasParaInsertar = horasOrdenadas.map((horaSeleccionada) => ({
      nombre_cliente,
      email_cliente,
      celular_cliente,
      fecha,
      hora: horaSeleccionada,
      estado: 'Pendiente'
    }));

    const { data, error } = await supabase.from('reservas').insert(reservasParaInsertar).select();

    if (error) throw error;

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reservas: (data || []).map(formatearReserva)
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
      if (!esFechaValida(fecha)) {
        return res.status(400).json({ error: 'Fecha inválida. Usa formato YYYY-MM-DD.' });
      }
      query = query.eq('fecha', fecha);
    }
    if (estado) {
      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
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
    const nombre_cliente = sanitizarTexto(req.body?.nombre_cliente);
    const email_cliente = sanitizarTexto(req.body?.email_cliente);
    const celular_cliente = sanitizarTexto(req.body?.celular_cliente);
    const fecha = sanitizarTexto(req.body?.fecha);

    const horasSolicitadas = Array.isArray(req.body?.horas)
      ? req.body.horas
      : req.body?.hora
        ? [req.body.hora]
        : [];

    if (!nombre_cliente || !email_cliente || !celular_cliente || !fecha || horasSolicitadas.length === 0) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (!esFechaValida(fecha)) {
      return res.status(400).json({ error: 'Fecha inválida. Usa formato YYYY-MM-DD.' });
    }

    if (horasSolicitadas.length > MAX_HORAS_CONSECUTIVAS) {
      return res
        .status(400)
        .json({ error: `Puedes reservar hasta ${MAX_HORAS_CONSECUTIVAS} horas consecutivas` });
    }

    const horasNormalizadas = [...new Set(horasSolicitadas.map(normalizarHora))];

    if (!horasNormalizadas.every(esHoraValida)) {
      return res.status(400).json({ error: 'Hora inválida. Usa formato HH:mm.' });
    }
    
    const horarioDelDia = await obtenerHorarioPorFecha(supabase, fecha);

    if (!horasNormalizadas.every((hora) => horarioDelDia.horas.includes(hora))) {
      return res.status(400).json({ error: 'La cancha no está habilitada para ese horario.' });
    }

    const horasOrdenadas = ordenarHorasPorHorario(horasNormalizadas, horarioDelDia.horas);

    if (!sonHorasConsecutivas(horasOrdenadas, horarioDelDia.horas)) {
      return res.status(400).json({ error: 'Las horas seleccionadas deben ser consecutivas.' });
    }

    if (horasOrdenadas.some((horaSeleccionada) => esHorarioEnElPasado(fecha, horaSeleccionada))) {
      return res.status(400).json({ error: 'No puedes reservar para una hora que ya pasó' });
    }
    
    // Verificar disponibilidad
    const { data: existentes, error: errorReservaExistente } = await supabase
      .from('reservas')
      .select('hora')
      .eq('fecha', fecha)

    
    if (errorReservaExistente) throw errorReservaExistente;

    if (existentes?.length) {
      const horasOcupadas = existentes.map((reserva) => normalizarHora(reserva.hora));
      return res.status(400).json({ error: `Ya existe una reserva para: ${horasOcupadas.join(', ')}` });
    }

    const reservasParaInsertar = horasOrdenadas.map((horaSeleccionada) => ({
      nombre_cliente,
      email_cliente,
      celular_cliente,
      fecha,
      hora: horaSeleccionada,
      estado: 'Pendiente',
      creado_por: req.usuario.id
    }));

    const { data, error } = await supabase.from('reservas').insert(reservasParaInsertar).select();
    
    if (error) throw error;

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reservas: (data || []).map(formatearReserva)
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

    if (!esIdValido(id)) {
      return res.status(400).json({ error: 'Identificador inválido' });
    }
    
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

    if (!esFechaValida(fecha)) {
      return res.status(400).json({ error: 'Fecha inválida. Usa formato YYYY-MM-DD.' });
    }
    
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

    if (!esIdValido(id)) {
      return res.status(400).json({ error: 'Identificador inválido' });
    }
    
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

    if (!esIdValido(id)) {
      return res.status(400).json({ error: 'Identificador inválido' });
    }

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
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

// Registrar método de pago (cancha y admin)
router.patch('/:id/pago', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const metodo_pago = sanitizarTexto(req.body?.metodo_pago);
    const referencia_nequi = sanitizarTexto(req.body?.referencia_nequi);

    if (!esIdValido(id)) {
      return res.status(400).json({ error: 'Identificador inválido' });
    }

    if (!metodo_pago || !METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
      return res.status(400).json({ error: 'Método de pago inválido' });
    }

    const payload = {
      metodo_pago,
      pago_registrado: true,
      referencia_nequi: metodo_pago === 'Nequi' && referencia_nequi ? referencia_nequi : null
    };

    const { data, error } = await supabase
      .from('reservas')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Pago registrado correctamente',
      reserva: formatearReserva(data)
    });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al registrar el pago', 'Error al registrar pago:');
  }
});

module.exports = router;
