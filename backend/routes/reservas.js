const express = require('express');
const supabase = require('../config/supabase');
const { verificarToken, verificarRol } = require('../middleware/auth');

const router = express.Router();

// Crear reserva (público - sin autenticación)
router.post('/crear', async (req, res) => {
  try {
    const { nombre_cliente, email_cliente, celular_cliente, fecha, hora } = req.body;

    // Validaciones
    if (!nombre_cliente || !email_cliente || !celular_cliente || !fecha || !hora) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si ya existe reserva en esa fecha y hora
    const { data: existente } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', fecha)
      .eq('hora', hora)
      .single();

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
    console.error('Error al crear reserva:', error);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

// Obtener todas las reservas (requiere autenticación)
router.get('/', verificarToken, async (req, res) => {
  try {
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
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// Obtener reserva por ID
router.get('/:id', verificarToken, async (req, res) => {
  try {
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
    console.error('Error al obtener reserva:', error);
    res.status(500).json({ error: 'Error al obtener la reserva' });
  }
});

// Actualizar estado de reserva (cancha y admin)
router.patch('/:id/estado', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
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
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
});

// Crear reserva manual (cancha y admin)
router.post('/manual', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
    const { nombre_cliente, email_cliente, celular_cliente, fecha, hora } = req.body;

    if (!nombre_cliente || !email_cliente || !celular_cliente || !fecha || !hora) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar disponibilidad
    const { data: existente } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', fecha)
      .eq('hora', hora)
      .single();

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
    console.error('Error al crear reserva manual:', error);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

// Eliminar reserva (solo admin)
router.delete('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    res.status(500).json({ error: 'Error al eliminar la reserva' });
  }
});

// Obtener reservas disponibles por fecha
router.get('/disponibilidad/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;

    // Horarios disponibles (de 8:00 a 22:00)
    const horariosDisponibles = [];
    for (let i = 8; i <= 21; i++) {
      horariosDisponibles.push(`${i.toString().padStart(2, '0')}:00`);
    }

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
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
});

module.exports = router;
