const express = require('express');
const getSupabase = require('../config/supabase');
const { verificarToken, verificarRol } = require('../middleware/auth');

const router = express.Router();

const handleSupabaseError = (res, error, defaultMessage, logContext) => {
  if (logContext) {
    console.error(logContext, error);
  }

  if (error.code === 'SUPABASE_CONFIG_MISSING') {
    return res.status(503).json({ error: error.message });
  }

  return res.status(500).json({ error: defaultMessage });
};

// Obtener estadísticas generales (solo admin)
router.get('/general', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    // Total de reservas
    const { count: totalReservas, error: errorTotal } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true });

    if (errorTotal) throw errorTotal;

    // Reservas jugadas
    const { count: reservasJugadas, error: errorJugadas } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'Jugado');

    if (errorJugadas) throw errorJugadas;

    // Reservas pendientes
    const { count: reservasPendientes, error: errorPendientes } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'Pendiente');

    if (errorPendientes) throw errorPendientes;

    res.json({
      totalReservas: totalReservas || 0,
      reservasJugadas: reservasJugadas || 0,
      reservasPendientes: reservasPendientes || 0
    });
  } catch (error) {
    return handleSupabaseError(
      res,
      error,
      'Error al obtener estadísticas',
      'Error al obtener estadísticas generales:'
    );
  }
});

// Reservas por día (últimos 30 días)
router.get('/por-dia', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reservas')
      .select('fecha, estado')
      .gte('fecha', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('fecha', { ascending: true });

    if (error) throw error;

    // Agrupar por fecha
    const reservasPorDia = {};
    data.forEach(reserva => {
      if (!reservasPorDia[reserva.fecha]) {
        reservasPorDia[reserva.fecha] = { total: 0, jugadas: 0, pendientes: 0 };
      }
      reservasPorDia[reserva.fecha].total++;
      if (reserva.estado === 'Jugado') {
        reservasPorDia[reserva.fecha].jugadas++;
      } else {
        reservasPorDia[reserva.fecha].pendientes++;
      }
    });

    // Convertir a array
    const resultado = Object.keys(reservasPorDia).map(fecha => ({
      fecha,
      ...reservasPorDia[fecha]
    }));

    res.json({ reservasPorDia: resultado });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al obtener datos', 'Error al obtener reservas por día:');
  }
});

// Reservas por mes (último año)
router.get('/por-mes', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const supabase = getSupabase();
      .from('reservas')
      .select('fecha, estado')
      .gte('fecha', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('fecha', { ascending: true });

    if (error) throw error;

    // Agrupar por mes
    const reservasPorMes = {};
    data.forEach(reserva => {
      const mes = reserva.fecha.substring(0, 7); // YYYY-MM
      if (!reservasPorMes[mes]) {
        reservasPorMes[mes] = { total: 0, jugadas: 0, pendientes: 0 };
      }
      reservasPorMes[mes].total++;
      if (reserva.estado === 'Jugado') {
        reservasPorMes[mes].jugadas++;
      } else {
        reservasPorMes[mes].pendientes++;
      }
    });

    // Convertir a array
    const resultado = Object.keys(reservasPorMes).map(mes => ({
      mes,
      ...reservasPorMes[mes]
    }));

    res.json({ reservasPorMes: resultado });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al obtener datos', 'Error al obtener reservas por mes:');
  }
});

// Resumen del día actual
router.get('/hoy', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', hoy)
      .order('hora', { ascending: true });

    if (error) throw error;

    const jugadas = data.filter(r => r.estado === 'Jugado').length;
    const pendientes = data.filter(r => r.estado === 'Pendiente').length;

    res.json({
      fecha: hoy,
      total: data.length,
      jugadas,
      pendientes,
      reservas: data
    });
  } catch (error) {
    return handleSupabaseError(res, error, 'Error al obtener datos', 'Error al obtener reservas de hoy:');
  }
});

module.exports = router;
