import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservasAPI, estadisticasAPI, configuracionAPI } from '../services/api';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

const DIAS_CALENDARIO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const CAPACIDAD_CANCHAS = 3;
const HORA_APERTURA_DEFAULT = 8;
const HORA_CIERRE_DEFAULT = 21;
const HORAS_OPERATIVAS_DEFAULT = HORA_CIERRE_DEFAULT - HORA_APERTURA_DEFAULT + 1;

const obtenerDiasMes = (mesActual) => {
  const fechaBase = new Date(`${mesActual}-01T00:00:00`);
  const inicio = startOfWeek(startOfMonth(fechaBase), { weekStartsOn: 1 });
  const fin = endOfWeek(endOfMonth(fechaBase), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: inicio, end: fin });
};

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vistaActual, setVistaActual] = useState('estadisticas'); // estadisticas o reservas
  
  // Estados para estadísticas
  const [estadisticasGenerales, setEstadisticasGenerales] = useState(null);
  const [reservasPorDia, setReservasPorDia] = useState([]);
  const [reservasPorMes, setReservasPorMes] = useState([]);
  
  // Estados para reservas
  const [reservas, setReservas] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [vistaReservas, setVistaReservas] = useState('tabla');
  const [mesCalendario, setMesCalendario] = useState(format(new Date(), 'yyyy-MM'));
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [reservaPagoSeleccionada, setReservaPagoSeleccionada] = useState(null);
  const [pagoForm, setPagoForm] = useState({ metodo_pago: 'Nequi', referencia_nequi: '' });
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [reservaEdicionSeleccionada, setReservaEdicionSeleccionada] = useState(null);
  const [editForm, setEditForm] = useState({ fecha: format(new Date(), 'yyyy-MM-dd'), hora: '10:00' });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [procesandoGemellista, setProcesandoGemellista] = useState('');

  // Configuración de horarios
  const [horariosConfig, setHorariosConfig] = useState([]);
  const [horarioForm, setHorarioForm] = useState({
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: format(new Date(), 'yyyy-MM-dd'),
    hora_apertura: '08:00',
    hora_cierre: '21:00'
  });
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  // Recaudo
  const [recaudo, setRecaudo] = useState({ total: 0, reservasPagadas: 0, precioUnitario: 0 });
  const [filtroRecaudo, setFiltroRecaudo] = useState({
    tipo: 'dia',
    valor: format(new Date(), 'yyyy-MM-dd')
  });
  const [cargandoRecaudo, setCargandoRecaudo] = useState(false);
  const isPrimerCargaRecaudo = useRef(true);
  
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email_cliente: '',
    celular_cliente: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora: '10:00',
    reserva_recurrente: false,
    semanas_repeticion: 1,
    dias_semana: [4, 5],
    es_familia_gemellista: false,
    nombre_gemellista: '',
    cedula_gemellista: ''
  });

  const cargarEstadisticas = useCallback(async () => {
    try {
      const [general, porDia, porMes] = await Promise.all([
        estadisticasAPI.obtenerGeneral(),
        estadisticasAPI.obtenerPorDia(),
        estadisticasAPI.obtenerPorMes()
      ]);

      setEstadisticasGenerales(general.data);
      setReservasPorDia(porDia.data.reservasPorDia);
      setReservasPorMes(porMes.data.reservasPorMes);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar estadísticas' });
    }
  }, []);

  const cargarReservas = useCallback(async () => {
    try {
      const response = await reservasAPI.obtenerTodas();
      setReservas(response.data.reservas);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar las reservas' });
    }
  }, []);

  const cargarHorarios = useCallback(async () => {
    setCargandoHorarios(true);
    try {
      const response = await configuracionAPI.obtenerHorarios();
      setHorariosConfig(response.data?.configuraciones || []);
    } catch (error) {
      console.error('Error al cargar horarios configurados:', error);
      setMensaje({ tipo: 'error', texto: 'No pudimos cargar los horarios configurados.' });
    } finally {
      setCargandoHorarios(false);
    }
  }, []);

  const cargarRecaudo = useCallback(async () => {
    setCargandoRecaudo(true);
    try {
      const params =
        filtroRecaudo.tipo === 'mes'
          ? { tipo: 'mes', mes: filtroRecaudo.valor }
          : { tipo: 'dia', fecha: filtroRecaudo.valor };

      const response = await estadisticasAPI.obtenerRecaudado(params);
      setRecaudo({
        total: response.data?.totalRecaudado || 0,
        reservasPagadas: response.data?.reservasPagadas || 0,
        precioUnitario: response.data?.precioUnitario || 0
      });
    } catch (error) {
      console.error('Error al cargar recaudo:', error);
      setMensaje({ tipo: 'error', texto: 'No pudimos cargar el recaudo.' });
    } finally {
      setCargandoRecaudo(false);
    }
  }, [filtroRecaudo]);
  
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      if (vistaActual === 'estadisticas') {
        await Promise.all([cargarEstadisticas(), cargarRecaudo(), cargarReservas()]);
      } else {
        await Promise.all([cargarReservas(), cargarHorarios()]);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }, [vistaActual, cargarEstadisticas, cargarReservas, cargarHorarios, cargarRecaudo]);
  
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (vistaActual !== 'estadisticas') return;

    if (isPrimerCargaRecaudo.current) {
      isPrimerCargaRecaudo.current = false;
      return;
    }

    cargarRecaudo();
  }, [filtroRecaudo, vistaActual, cargarRecaudo]);
  
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await reservasAPI.actualizarEstado(id, nuevoEstado);
      setMensaje({ tipo: 'success', texto: 'Estado actualizado correctamente' });
      cargarReservas();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      setMensaje({ tipo: 'error', texto: 'Error al actualizar el estado' });
    }
  };

  const actualizarEstadoGemellista = async (id, estado) => {
    try {
      setProcesandoGemellista(id);
      await reservasAPI.actualizarGemellista(id, estado);
      const texto =
        estado === 'Aprobado'
          ? 'Tarifa familiar aprobada'
          : 'Se aplicará la tarifa general para esta reserva';
      setMensaje({ tipo: 'success', texto });
      cargarReservas();
    } catch (error) {
      console.error('Error al actualizar familia Gemellista:', error);
      setMensaje({ tipo: 'error', texto: 'No pudimos actualizar la verificación de familia Gemellista' });
    } finally {
      setProcesandoGemellista('');
    }
  };

  const esSolicitudGemellista = (reserva) =>
    Boolean(
      reserva.es_familia_gemellista ||
        reserva.estado_gemellista === 'Pendiente' ||
        reserva.estado_gemellista === 'Aprobado' ||
        reserva.nombre_gemellista ||
        reserva.cedula_gemellista
    );
  
  const eliminarReserva = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta reserva?')) return;
    
    try {
      await reservasAPI.eliminar(id);
      setMensaje({ tipo: 'success', texto: 'Reserva eliminada exitosamente' });
      cargarReservas();
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      setMensaje({ tipo: 'error', texto: 'Error al eliminar la reserva' });
    }
  };

  const guardarHorario = async (e) => {
    e.preventDefault();
    setGuardandoHorario(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      await configuracionAPI.crearHorario(horarioForm);
      setMensaje({ tipo: 'success', texto: 'Horario guardado correctamente.' });
      setHorarioForm((prev) => ({
        ...prev,
        fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
        fecha_fin: format(new Date(), 'yyyy-MM-dd')
      }));
      await cargarHorarios();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.error || 'No pudimos guardar el horario.' });
    } finally {
      setGuardandoHorario(false);
    }
  };

  const eliminarHorario = async (id) => {
    if (!window.confirm('¿Eliminar este rango horario?')) return;

    try {
      await configuracionAPI.eliminarHorario(id);
      setMensaje({ tipo: 'success', texto: 'Horario eliminado correctamente.' });
      await cargarHorarios();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.error || 'No pudimos eliminar el horario.' });
    }
  };
  
  const crearReservaManual = async (e) => {
    e.preventDefault();
    try {
      await reservasAPI.crearManual({
        ...formData,
        semanas_repeticion: Number(formData.semanas_repeticion) || 1,
        dias_semana: formData.reserva_recurrente ? formData.dias_semana : [],
        es_familia_gemellista: false,
        nombre_gemellista: '',
        cedula_gemellista: ''
      });
      setMensaje({ tipo: 'success', texto: 'Reserva creada exitosamente' });
      setMostrarFormulario(false);
      setFormData({
        nombre_cliente: '',
        email_cliente: '',
        celular_cliente: '',
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora: '10:00',
        reserva_recurrente: false,
        semanas_repeticion: 1,
        dias_semana: [4, 5],
        es_familia_gemellista: false,
        nombre_gemellista: '',
        cedula_gemellista: ''
      });
      cargarReservas();
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.error || 'Error al crear la reserva'
      });
    }
  };

  const abrirModalPago = (reserva) => {
    setReservaPagoSeleccionada(reserva);
    setPagoForm({
      metodo_pago: reserva.metodo_pago || 'Nequi',
      referencia_nequi: reserva.referencia_nequi || ''
    });
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    if (!reservaPagoSeleccionada) return;

    try {
      setRegistrandoPago(true);
      await reservasAPI.registrarPago(reservaPagoSeleccionada.id, {
        metodo_pago: pagoForm.metodo_pago,
        referencia_nequi:
          pagoForm.metodo_pago === 'Nequi' && pagoForm.referencia_nequi
            ? pagoForm.referencia_nequi.trim()
            : ''
      });
      setMensaje({ tipo: 'success', texto: 'Pago registrado correctamente' });
      setReservaPagoSeleccionada(null);
      setPagoForm({ metodo_pago: 'Nequi', referencia_nequi: '' });
      cargarReservas();
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.error || 'No pudimos registrar el pago'
      });
    } finally {
      setRegistrandoPago(false);
    }
  };

  const abrirModalEdicion = (reserva) => {
    setReservaEdicionSeleccionada(reserva);
    setEditForm({
      fecha: reserva.fecha || format(new Date(), 'yyyy-MM-dd'),
      hora: reserva.hora || '10:00'
    });
  };

  const reprogramarReserva = async (e) => {
    e.preventDefault();
    if (!reservaEdicionSeleccionada) return;

    try {
      setGuardandoEdicion(true);
      await reservasAPI.reprogramar(reservaEdicionSeleccionada.id, editForm);
      setMensaje({ tipo: 'success', texto: 'Reserva actualizada correctamente' });
      setReservaEdicionSeleccionada(null);
      await cargarReservas();
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.error || 'No pudimos actualizar la reserva'
      });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const toggleDiaSemana = (dia) => {
    setFormData((prev) => {
      const actual = prev.dias_semana || [];
      const yaExiste = actual.includes(dia);
      const dias_semana = yaExiste ? actual.filter((valor) => valor !== dia) : [...actual, dia];
      return { ...prev, dias_semana };
    });
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  const esFinDeSemana = (fecha) => {
    const fechaBase = new Date(`${fecha}T00:00:00`);
    const diaSemana = fechaBase.getDay();

    if (Number.isNaN(diaSemana)) return false;

    return diaSemana === 0 || diaSemana === 6;
  };

  const calcularValorReserva = (reserva) => {
    if (!reserva?.hora) return 0;

    const horaEntera = parseInt(reserva.hora.slice(0, 2), 10);

    if (Number.isNaN(horaEntera)) return 0;

    const aplicaTarifaGemellista = reserva.estado_gemellista === 'Aprobado';

    if (aplicaTarifaGemellista) {
      return horaEntera >= 17 ? 110000 : 90000;
    }

    if (esFinDeSemana(reserva.fecha)) return 130000;

    return horaEntera >= 17 ? 130000 : 100000;
  };

  const formatearFechaCorta = (fecha) =>
    format(new Date(`${fecha}T00:00:00`), 'd MMM', { locale: es });

  const hoy = format(new Date(), 'yyyy-MM-dd');
  const finProximos7Dias = format(
    new Date(new Date(`${hoy}T00:00:00`).setDate(new Date(`${hoy}T00:00:00`).getDate() + 7)),
    'yyyy-MM-dd'
  );

  const reservasOrdenadas = [...reservas].sort((a, b) =>
    `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)
  );
  const reservasHoy = reservas.filter((reserva) => reserva.fecha === hoy);
  const reservasProximos7Dias = reservas.filter(
    (reserva) => reserva.fecha >= hoy && reserva.fecha <= finProximos7Dias && reserva.estado !== 'Jugado'
  );
  const reservasPendientes = reservas.filter((reserva) => reserva.estado === 'Pendiente');
  const reservasAprobadas = reservas.filter((reserva) => reserva.estado === 'Aprobado');
  const reservasJugadas = reservas.filter((reserva) => reserva.estado === 'Jugado');
  const pagosPendientes = reservas.filter((reserva) => !reserva.pago_registrado && reserva.estado !== 'Pendiente');
  const solicitudesGemellistaPendientes = reservas.filter(
    (reserva) => esSolicitudGemellista(reserva) && reserva.estado_gemellista === 'Pendiente'
  );
  const reservasMesActual = reservas.filter((reserva) => reserva.fecha?.startsWith(format(new Date(), 'yyyy-MM')));
  const ingresosConfirmados = reservas
    .filter((reserva) => reserva.pago_registrado)
    .reduce((total, reserva) => total + calcularValorReserva(reserva), 0);
  const ingresosPorCobrar = pagosPendientes.reduce((total, reserva) => total + calcularValorReserva(reserva), 0);
  const ingresosMesEstimados = reservasMesActual.reduce((total, reserva) => total + calcularValorReserva(reserva), 0);
  const capacidadDiaria = CAPACIDAD_CANCHAS * HORAS_OPERATIVAS_DEFAULT;
  const ocupacionHoy = capacidadDiaria > 0 ? Math.round((reservasHoy.length / capacidadDiaria) * 100) : 0;
  const cumplimientoReservas =
    reservas.length > 0 ? Math.round((reservasJugadas.length / reservas.length) * 100) : 0;
  const ticketPromedio =
    reservas.filter((reserva) => reserva.pago_registrado).length > 0
      ? Math.round(ingresosConfirmados / reservas.filter((reserva) => reserva.pago_registrado).length)
      : 0;
  const proximaReserva = reservasOrdenadas.find(
    (reserva) => reserva.fecha >= hoy && reserva.estado !== 'Jugado'
  );
  const reservasPorDiaChart = reservasPorDia.map((item) => ({
    ...item,
    fechaLabel: formatearFechaCorta(item.fecha)
  }));
  const reservasPorMesChart = reservasPorMes.map((item) => ({
    ...item,
    mesLabel: format(new Date(`${item.mes}-01T00:00:00`), 'MMM yy', { locale: es })
  }));
  const metricasPrincipales = [
    {
      titulo: 'Ocupación hoy',
      valor: `${ocupacionHoy}%`,
      detalle: `${reservasHoy.length} de ${capacidadDiaria} bloques estimados`,
      clase: 'border-emerald-100 bg-white'
    },
    {
      titulo: 'Próximos 7 días',
      valor: reservasProximos7Dias.length,
      detalle: `${reservasAprobadas.length} aprobadas activas`,
      clase: 'border-blue-100 bg-white'
    },
    {
      titulo: 'Por cobrar',
      valor: currencyFormatter.format(ingresosPorCobrar),
      detalle: `${pagosPendientes.length} reservas aprobadas o jugadas sin pago`,
      clase: 'border-amber-100 bg-white'
    },
    {
      titulo: 'Familia Gemellista',
      valor: solicitudesGemellistaPendientes.length,
      detalle: 'Solicitudes pendientes de validación',
      clase: 'border-rose-100 bg-white'
    }
  ];
  const resumenEstados = [
    { name: 'Pendientes', value: reservasPendientes.length },
    { name: 'Aprobadas', value: reservasAprobadas.length },
    { name: 'Jugadas', value: reservasJugadas.length }
  ];
  
  const dataPie = resumenEstados.filter((item) => item.value > 0);

  const getEstadoGemellistaStyles = (estado) => {
    if (estado === 'Aprobado') return 'bg-green-100 text-green-800';
    if (estado === 'Pendiente') return 'bg-yellow-100 text-yellow-800';
    if (estado === 'Rechazado') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const reservasFiltradas = reservas.filter((reserva) => {
    if (filtro === 'pendientes') return reserva.estado === 'Pendiente';
    if (filtro === 'aprobadas') return reserva.estado === 'Aprobado';
    if (filtro === 'jugadas') return reserva.estado === 'Jugado';
    return true;
  });

  const diasCalendario = obtenerDiasMes(mesCalendario);
  const reservasPorFecha = reservasFiltradas.reduce((acumulado, reserva) => {
    const llave = reserva.fecha;
    if (!acumulado[llave]) acumulado[llave] = [];
    acumulado[llave].push(reserva);
    return acumulado;
  }, {});
  
  return (
    <div className="min-h-screen bg-gray-50">
    {reservaPagoSeleccionada && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">Registrar pago</h3>
              <button
                onClick={() => setReservaPagoSeleccionada(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Cerrar modal de pago"
              >
                ✕
              </button>
            </div>
            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-semibold text-primary">{reservaPagoSeleccionada.nombre_cliente}</p>
              <p>{format(new Date(reservaPagoSeleccionada.fecha), "dd 'de' MMMM, yyyy", { locale: es })}</p>
              <p className="text-gray-600">Hora: {reservaPagoSeleccionada.hora}</p>
            </div>
            <form onSubmit={registrarPago} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Método de pago</label>
                <select
                  value={pagoForm.metodo_pago}
                  onChange={(e) => setPagoForm({ ...pagoForm, metodo_pago: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary"
                >
                  <option value="Nequi">Nequi</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>

              {pagoForm.metodo_pago === 'Nequi' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Número de transacción (opcional)
                  </label>
                  <input
                    type="text"
                    value={pagoForm.referencia_nequi}
                    onChange={(e) => setPagoForm({ ...pagoForm, referencia_nequi: e.target.value })}
                    placeholder="Ej: 123456789"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReservaPagoSeleccionada(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registrandoPago}
                  className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-green-600 disabled:bg-gray-400"
                >
                  {registrandoPago ? 'Guardando...' : 'Guardar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Header */}
      {reservaEdicionSeleccionada && (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 px-4">
        <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800">Editar reserva</h3>
            <button
              onClick={() => setReservaEdicionSeleccionada(null)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Cerrar modal de edición"
            >
              ✕
            </button>
          </div>

          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold text-primary">{reservaEdicionSeleccionada.nombre_cliente}</p>
            <p>
              Actual: {format(new Date(reservaEdicionSeleccionada.fecha), "dd 'de' MMMM, yyyy", { locale: es })}{' '}
              · {reservaEdicionSeleccionada.hora}
            </p>
          </div>

          <form onSubmit={reprogramarReserva} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nueva fecha</label>
              <input
                type="date"
                required
                value={editForm.fecha}
                onChange={(e) => setEditForm((prev) => ({ ...prev, fecha: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nueva hora</label>
              <input
                type="time"
                required
                value={editForm.hora}
                onChange={(e) => setEditForm((prev) => ({ ...prev, hora: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReservaEdicionSeleccionada(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoEdicion}
                className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-green-600 disabled:bg-gray-400"
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
      
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Administración</p>
            <h1 className="text-2xl font-semibold text-gray-950">Sintética Colgemelli</h1>
            <p className="text-sm text-gray-500">Bienvenido, {usuario?.nombre}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-gray-200 bg-gray-100 p-1">
              <button
                onClick={() => setVistaActual('estadisticas')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  vistaActual === 'estadisticas'
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setVistaActual('reservas')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  vistaActual === 'reservas'
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                Reservas
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Mensajes */}
        {mensaje.texto && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              mensaje.tipo === 'success'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
              <div className="text-lg font-semibold text-gray-700">Cargando operación...</div>
            </div>
          </div>
        ) : vistaActual === 'estadisticas' ? (
          /* VISTA DE ESTADÍSTICAS */
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl bg-gray-950 text-white shadow-xl">
              <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="flex flex-col justify-between gap-8">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Operación diaria</p>
                    <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
                      Tres canchas listas para vender mejor cada bloque horario.
                    </h2>
                    <p className="mt-4 max-w-2xl text-base text-gray-300">
                      Vista ejecutiva para ocupación, recaudo, pagos pendientes y solicitudes familiares en una sola pantalla.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setVistaActual('reservas');
                        setMostrarFormulario(true);
                      }}
                      className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100"
                    >
                      Nueva reserva
                    </button>
                    <button
                      onClick={() => setVistaActual('reservas')}
                      className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Gestionar agenda
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                  <p className="text-sm text-gray-300">Próxima reserva</p>
                  {proximaReserva ? (
                    <div className="mt-4">
                      <p className="text-3xl font-semibold">{proximaReserva.hora}</p>
                      <p className="mt-1 text-gray-200">{formatearFechaCorta(proximaReserva.fecha)}</p>
                      <p className="mt-4 text-lg font-semibold">{proximaReserva.nombre_cliente}</p>
                      <p className="text-sm text-gray-300">{proximaReserva.estado}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-lg font-semibold text-gray-200">No hay reservas activas próximas.</p>
                  )}
                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/10 p-3">
                      <p className="text-gray-300">Capacidad diaria</p>
                      <p className="mt-1 text-xl font-semibold">{capacidadDiaria}</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                      <p className="text-gray-300">Bloques hoy</p>
                      <p className="mt-1 text-xl font-semibold">{reservasHoy.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricasPrincipales.map((metrica) => (
                <div key={metrica.titulo} className={`rounded-2xl border p-5 shadow-sm ${metrica.clase}`}>
                  <p className="text-sm font-medium text-gray-500">{metrica.titulo}</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-950">{metrica.valor}</p>
                  <p className="mt-2 text-sm text-gray-500">{metrica.detalle}</p>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Reservas totales</p>
                <p className="mt-3 text-4xl font-semibold text-gray-950">
                  {estadisticasGenerales?.totalReservas ?? reservas.length}
                </p>
                <p className="mt-2 text-sm text-gray-500">{cumplimientoReservas}% ya fueron marcadas como jugadas</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Ingresos confirmados</p>
                <p className="mt-3 text-4xl font-semibold text-gray-950">{currencyFormatter.format(ingresosConfirmados)}</p>
                <p className="mt-2 text-sm text-gray-500">Ticket promedio: {currencyFormatter.format(ticketPromedio)}</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <select
                    value={filtroRecaudo.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value;
                      setFiltroRecaudo({
                        tipo,
                        valor:
                          tipo === 'mes'
                            ? format(new Date(), 'yyyy-MM')
                            : format(new Date(), 'yyyy-MM-dd')
                      });
                    }}
                    className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary"
                  >
                    <option value="dia">Por día</option>
                    <option value="mes">Por mes</option>
                  </select>

                  <input
                    type={filtroRecaudo.tipo === 'mes' ? 'month' : 'date'}
                    value={filtroRecaudo.valor}
                    onChange={(e) =>
                      setFiltroRecaudo((prev) => ({ ...prev, valor: e.target.value }))
                    }
                    className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary"
                  />
                </div>

                <p className="text-sm font-medium text-gray-500">Recaudo filtrado</p>
                <p className="mt-3 text-4xl font-semibold text-gray-950">
                  {cargandoRecaudo ? 'Calculando...' : currencyFormatter.format(recaudo.total)}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {recaudo.reservasPagadas} pagos confirmados por API
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-950">Estado de reservas</h3>
                    <p className="text-sm text-gray-500">Pendientes, aprobadas y jugadas.</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={dataPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dataPie.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-950">Demanda de los últimos 30 días</h3>
                  <p className="text-sm text-gray-500">Lectura rápida de volumen y reservas jugadas.</p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={reservasPorDiaChart}>
                    <CartesianGrid stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="fechaLabel" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#10b981" name="Total" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="jugadas" fill="#3b82f6" name="Jugadas" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-950">Tendencia anual</h3>
                  <p className="text-sm text-gray-500">Evolución mensual por estado de reserva.</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={reservasPorMesChart}>
                    <CartesianGrid stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="mesLabel" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} name="Total" dot={false} />
                    <Line type="monotone" dataKey="jugadas" stroke="#3b82f6" strokeWidth={3} name="Jugadas" dot={false} />
                    <Line type="monotone" dataKey="pendientes" stroke="#f59e0b" strokeWidth={3} name="Pendientes" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-950">Focos de atención</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">Pagos por registrar</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-950">{pagosPendientes.length}</p>
                    <p className="text-sm text-amber-800">{currencyFormatter.format(ingresosPorCobrar)} por conciliar</p>
                  </div>
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-sm font-semibold text-rose-800">Validación familiar</p>
                    <p className="mt-1 text-2xl font-semibold text-rose-950">{solicitudesGemellistaPendientes.length}</p>
                    <p className="text-sm text-rose-800">Solicitudes esperando aprobación</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-800">Mes actual</p>
                    <p className="mt-1 text-2xl font-semibold text-blue-950">{reservasMesActual.length} reservas</p>
                    <p className="text-sm text-blue-800">{currencyFormatter.format(ingresosMesEstimados)} estimados</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* VISTA DE GESTIÓN DE RESERVAS */
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Gestión de agenda</p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-950">Reservas y horarios</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Administra solicitudes, pagos, reprogramaciones y rangos de atención.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500">Pendientes</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-950">{reservasPendientes.length}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500">Aprobadas</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-950">{reservasAprobadas.length}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500">Sin pago</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-950">{pagosPendientes.length}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500">Hoy</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-950">{reservasHoy.length}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Acciones */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                className="rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                {mostrarFormulario ? 'Cerrar formulario' : 'Nueva reserva'}
              </button>
              <button
                onClick={() => {
                  cargarReservas();
                  cargarHorarios();
                }}
                className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Actualizar
              </button>
            </div>

            {/* Formulario Nueva Reserva */}
            {mostrarFormulario && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Crear Reserva Manual</h3>
                <form onSubmit={crearReservaManual} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Nombre del cliente"
                    value={formData.nombre_cliente}
                    onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={formData.email_cliente}
                    onChange={(e) => setFormData({ ...formData, email_cliente: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Celular"
                    value={formData.celular_cliente}
                    onChange={(e) => setFormData({ ...formData, celular_cliente: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="time"
                    required
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <label className="flex items-center gap-3 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={formData.reserva_recurrente}
                      onChange={(e) => setFormData({ ...formData, reserva_recurrente: e.target.checked })}
                      className="h-5 w-5 text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">Reserva recurrente semanal</p>
                      <p className="text-sm text-gray-600">Ejemplo: separar jueves y viernes por varias semanas.</p>
                    </div>
                  </label>
                  {formData.reserva_recurrente && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Semanas a programar</label>
                        <input
                          type="number"
                          min="1"
                          max="52"
                          required
                          value={formData.semanas_repeticion}
                          onChange={(e) => setFormData({ ...formData, semanas_repeticion: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <p className="block text-sm font-medium text-gray-700 mb-2">Días por semana</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {DIAS_SEMANA.map((dia) => (
                            <label key={dia.value} className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                              <input
                                type="checkbox"
                                checked={(formData.dias_semana || []).includes(dia.value)}
                                onChange={() => toggleDiaSemana(dia.value)}
                                className="h-4 w-4 text-primary focus:ring-primary"
                              />
                              <span>{dia.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    La verificación de familia Gemellista se gestiona después desde la reserva; el administrador solo
                    autoriza o rechaza la solicitud.
                  </div>
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-600"
                  >
                    Crear Reserva
                  </button>
                </form>
              </div>
            )}

            {/* Filtros */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setFiltro('todas')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filtro === 'todas'
                      ? 'bg-gray-950 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFiltro('pendientes')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filtro === 'pendientes'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pendientes
                </button>

                <button
                  onClick={() => setFiltro('aprobadas')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filtro === 'aprobadas'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Aprobadas
                </button>
                    
                <button
                  onClick={() => setFiltro('jugadas')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filtro === 'jugadas'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Jugadas
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setVistaReservas('tabla')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      vistaReservas === 'tabla'
                        ? 'bg-secondary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tabla
                  </button>
                  <button
                    onClick={() => setVistaReservas('calendario')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      vistaReservas === 'calendario'
                        ? 'bg-secondary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Calendario
                  </button>
                  {vistaReservas === 'calendario' && (
                    <input
                      type="month"
                      value={mesCalendario}
                      onChange={(e) => setMesCalendario(e.target.value)}
                      className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Configuración de horarios */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow">
                <h3 className="text-xl font-semibold mb-4">Horario de atención</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ajusta los horarios por rango de fechas para habilitar o restringir reservas (ej. 16:00 a 21:00 en febrero).
                </p>

                <form onSubmit={guardarHorario} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Fecha inicio</label>
                    <input
                      type="date"
                      required
                      value={horarioForm.fecha_inicio}
                      onChange={(e) => setHorarioForm({ ...horarioForm, fecha_inicio: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Fecha fin</label>
                    <input
                      type="date"
                      required
                      value={horarioForm.fecha_fin}
                      onChange={(e) => setHorarioForm({ ...horarioForm, fecha_fin: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Hora apertura</label>
                    <input
                      type="time"
                      required
                      value={horarioForm.hora_apertura}
                      onChange={(e) => setHorarioForm({ ...horarioForm, hora_apertura: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Hora cierre</label>
                    <input
                      type="time"
                      required
                      value={horarioForm.hora_cierre}
                      onChange={(e) => setHorarioForm({ ...horarioForm, hora_cierre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={guardandoHorario}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-400"
                    >
                      {guardandoHorario ? 'Guardando...' : 'Guardar horario'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">Rangos configurados</h4>
                    <p className="text-sm text-gray-500">El más reciente aplica en caso de traslapes.</p>
                  </div>
                  {cargandoHorarios && <span className="text-xs text-gray-500">Actualizando...</span>}
                </div>

                {horariosConfig.length === 0 ? (
                  <p className="text-sm text-gray-600">Aún no hay rangos personalizados.</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {horariosConfig.map((horario) => (
                      <li
                        key={horario.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-gray-800">
                            {horario.fecha_inicio} → {horario.fecha_fin}
                          </p>
                          <p className="text-gray-600">{horario.hora_apertura} - {horario.hora_cierre}</p>
                        </div>
                        <button
                          onClick={() => eliminarHorario(horario.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-semibold"
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Tabla de Reservas */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {vistaReservas === 'calendario' ? (
                <div className="p-4 md:p-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-800">
                    Reservas de {format(new Date(`${mesCalendario}-01T00:00:00`), 'MMMM yyyy', { locale: es })}
                  </h3>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 uppercase">
                    {DIAS_CALENDARIO.map((dia) => (
                      <div key={dia} className="rounded bg-gray-100 py-2">
                        {dia}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {diasCalendario.map((dia) => {
                      const fechaKey = format(dia, 'yyyy-MM-dd');
                      const reservasDia = reservasPorFecha[fechaKey] || [];
                      const esMesActual = isSameMonth(dia, new Date(`${mesCalendario}-01T00:00:00`));

                      return (
                        <div
                          key={fechaKey}
                          className={`min-h-[120px] rounded-lg border p-2 ${
                            esMesActual ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 text-gray-400'
                          }`}
                        >
                          <p className="text-sm font-semibold">{format(dia, 'd')}</p>
                          <div className="mt-2 space-y-1">
                            {reservasDia.slice(0, 3).map((reserva) => (
                              <button
                                key={reserva.id}
                                type="button"
                                onClick={() => abrirModalEdicion(reserva)}
                                className="w-full rounded bg-primary/10 px-2 py-1 text-left text-xs text-gray-700 hover:bg-primary/20"
                              >
                                <p className="font-semibold">{reserva.hora}</p>
                                <p className="truncate">{reserva.nombre_cliente}</p>
                              </button>
                            ))}
                            {reservasDia.length > 3 && (
                              <p className="text-xs font-semibold text-primary">+{reservasDia.length - 3} más</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : reservasFiltradas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fam. Gemellista</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reservasFiltradas.map((reserva) => {
                        const solicitudGemellista = esSolicitudGemellista(reserva);
                        return (
                          <React.Fragment key={reserva.id}>
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{reserva.nombre_cliente}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600">{reserva.email_cliente}</div>
                                <div className="text-sm text-gray-500">{reserva.celular_cliente}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm">{format(new Date(reserva.fecha), 'dd/MM/yyyy')}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium">{reserva.hora}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-gray-900">
                                  {currencyFormatter.format(calcularValorReserva(reserva))}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {solicitudGemellista ? (
                                  <div className="space-y-1">
                                    <span
                                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                        getEstadoGemellistaStyles(reserva.estado_gemellista)
                                      }`}
                                    >
                                      <span className="h-2 w-2 rounded-full bg-current opacity-75" />
                                      {reserva.estado_gemellista || 'Pendiente'}
                                    </span>
                                    {reserva.nombre_gemellista && (
                                      <p className="text-xs text-gray-700 font-semibold">{reserva.nombre_gemellista}</p>
                                    )}
                                    {reserva.cedula_gemellista && (
                                      <p className="text-xs text-gray-500">CC: {reserva.cedula_gemellista}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">Tarifa general</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    reserva.estado === 'Jugado'
                                      ? 'bg-green-100 text-green-800'
                                      : reserva.estado === 'Aprobado'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {reserva.estado === 'Pendiente' ? 'Pendiente de aprobación' : reserva.estado === 'Aprobado' ? 'Aprobada' : reserva.estado}
                                </span>
                                </td>
                              <td className="px-6 py-4">
                                {reserva.pago_registrado ? (
                                  <div className="text-sm text-gray-800">
                                    <p className="font-semibold">{reserva.metodo_pago}</p>
                                    {reserva.metodo_pago === 'Nequi' && reserva.referencia_nequi && (
                                      <p className="text-xs text-gray-500">Ref: {reserva.referencia_nequi}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-6 py-4" colSpan={8}>
                                <div className="flex flex-wrap items-center gap-2">
                                  {solicitudGemellista && (
                                    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 w-full">
                                      {reserva.estado_gemellista !== 'Aprobado' && (
                                        <button
                                          onClick={() => actualizarEstadoGemellista(reserva.id, 'Aprobado')}
                                          disabled={procesandoGemellista === reserva.id}
                                          className="px-3 py-1 rounded bg-emerald-100 text-emerald-700 text-sm font-semibold hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {procesandoGemellista === reserva.id
                                            ? 'Guardando...'
                                            : 'Aprobar tarifa gemellista'}
                                        </button>
                                      )}
                                      {reserva.estado_gemellista !== 'Rechazado' &&
                                        reserva.estado_gemellista !== 'No aplica' && (
                                          <button
                                            onClick={() => actualizarEstadoGemellista(reserva.id, 'Rechazado')}
                                            disabled={procesandoGemellista === reserva.id}
                                            className="px-3 py-1 rounded bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {procesandoGemellista === reserva.id
                                              ? 'Guardando...'
                                              : 'Cobrar tarifa general'}
                                          </button>
                                        )}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => abrirModalEdicion(reserva)}
                                    className="px-3 py-1 rounded bg-indigo-500 text-white text-sm hover:bg-indigo-600"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => abrirModalPago(reserva)}
                                    className="px-3 py-1 rounded bg-secondary text-white text-sm hover:bg-blue-600"
                                  >
                                    {reserva.pago_registrado ? 'Actualizar pago' : 'Registrar pago'}
                                  </button>
                                  {reserva.estado === 'Pendiente' && (
                                    <button
                                      onClick={() => cambiarEstado(reserva.id, 'Aprobado')}
                                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                                    >
                                      Aprobar reserva
                                    </button>
                                  )}
                                  {reserva.estado === 'Aprobado' && (
                                    <button
                                      onClick={() => cambiarEstado(reserva.id, 'Jugado')}
                                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                                    >
                                      Marcar jugado
                                    </button>
                                  )}
                                  <button
                                    onClick={() => eliminarReserva(reserva.id)}
                                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">No hay reservas registradas</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardAdmin;
