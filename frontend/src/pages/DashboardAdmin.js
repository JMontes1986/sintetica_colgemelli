import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservasAPI, estadisticasAPI, configuracionAPI } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [reservaPagoSeleccionada, setReservaPagoSeleccionada] = useState(null);
  const [pagoForm, setPagoForm] = useState({ metodo_pago: 'Nequi', referencia_nequi: '' });
  const [registrandoPago, setRegistrandoPago] = useState(false);
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
  
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email_cliente: '',
    celular_cliente: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora: '10:00'
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
      const params = filtro !== 'todas' ? { estado: filtro === 'pendientes' ? 'Pendiente' : 'Jugado' } : {};
      const response = await reservasAPI.obtenerTodas(params);
      setReservas(response.data.reservas);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar las reservas' });
    }
  }, [filtro]);

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
        await Promise.all([cargarEstadisticas(), cargarRecaudo()]);
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
    if (vistaActual === 'estadisticas') {
      cargarRecaudo();
    }
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
      await reservasAPI.crearManual(formData);
      setMensaje({ tipo: 'success', texto: 'Reserva creada exitosamente' });
      setMostrarFormulario(false);
      setFormData({
        nombre_cliente: '',
        email_cliente: '',
        celular_cliente: '',
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora: '10:00'
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
  
  const dataPie = estadisticasGenerales ? [
    { name: 'Jugadas', value: estadisticasGenerales.reservasJugadas },
    { name: 'Pendientes', value: estadisticasGenerales.reservasPendientes }
  ] : [];

  const getEstadoGemellistaStyles = (estado) => {
    if (estado === 'Aprobado') return 'bg-green-100 text-green-800';
    if (estado === 'Pendiente') return 'bg-yellow-100 text-yellow-800';
    if (estado === 'Rechazado') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };
  
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
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">Panel Administrador</h1>
              <p className="text-gray-600 text-sm">Bienvenido, {usuario?.nombre}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Navegación */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setVistaActual('estadisticas')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                vistaActual === 'estadisticas'
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              📊 Estadísticas
            </button>
            <button
              onClick={() => setVistaActual('reservas')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                vistaActual === 'reservas'
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              📋 Gestión de Reservas
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
          <div className="text-center py-12">
            <div className="text-xl text-gray-500">Cargando datos...</div>
          </div>
        ) : vistaActual === 'estadisticas' ? (
          /* VISTA DE ESTADÍSTICAS */
          <div>
            {/* Tarjetas de métricas */}
            {estadisticasGenerales && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Reservas</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {estadisticasGenerales.totalReservas}
                      </p>
                    </div>
                    <div className="bg-blue-100 rounded-full p-3">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Reservas Jugadas</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {estadisticasGenerales.reservasJugadas}
                      </p>
                    </div>
                    <div className="bg-green-100 rounded-full p-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Reservas Pendientes</p>
                      <p className="text-3xl font-bold text-yellow-600 mt-2">
                        {estadisticasGenerales.reservasPendientes}
                      </p>
                    </div>
                    <div className="bg-yellow-100 rounded-full p-3">
                      <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 md:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
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
                          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-primary"
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
                          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <p className="text-gray-500 text-sm font-medium">Recaudado</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {cargandoRecaudo ? 'Calculando...' : currencyFormatter.format(recaudo.total)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Pagos confirmados: {recaudo.reservasPagadas} · Valor por reserva:{' '}
                        {currencyFormatter.format(recaudo.precioUnitario)}
                      </p>
                    </div>

                    <div className="bg-primary/10 rounded-full p-3 text-primary">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V5m0 11v3m7-12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Gráfico de Pie */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Distribución de Reservas</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dataPie}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dataPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de barras - Últimos 30 días */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Reservas por Día (Últimos 30 días)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reservasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#10b981" name="Total" />
                    <Bar dataKey="jugadas" fill="#3b82f6" name="Jugadas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de línea - Por mes */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Tendencia Mensual (Último año)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={reservasPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="jugadas" stroke="#3b82f6" strokeWidth={2} name="Jugadas" />
                  <Line type="monotone" dataKey="pendientes" stroke="#f59e0b" strokeWidth={2} name="Pendientes" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          /* VISTA DE GESTIÓN DE RESERVAS */
          <div>
            {/* Acciones */}
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-600 transition"
              >
                {mostrarFormulario ? 'Cancelar' : '+ Nueva Reserva'}
              </button>
              <button
                onClick={() => {
                  cargarReservas();
                  cargarHorarios();
                }}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-600 transition"
              >
                🔄 Actualizar
              </button>
            </div>

            {/* Formulario Nueva Reserva */}
            {mostrarFormulario && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
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
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-600 transition"
                  >
                    Crear Reserva
                  </button>
                </form>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setFiltro('todas')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filtro === 'todas'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFiltro('pendientes')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filtro === 'pendientes'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setFiltro('jugadas')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filtro === 'jugadas'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  Jugadas
                </button>
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
              {reservas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fam. Gemellista</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reservas.map((reserva) => (
                        <tr key={reserva.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{reserva.nombre_cliente}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{reserva.email_cliente}</div>
                            <div className="text-sm text-gray-500">{reserva.celular_cliente}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">{format(new Date(reserva.fecha), "dd/MM/yyyy")}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{reserva.hora}</div>
                          </td>
                          <td className="px-6 py-4">
                            {reserva.es_familia_gemellista ? (
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                    getEstadoGemellistaStyles(reserva.estado_gemellista)
                                  }`}
                                >
                                  <span className="h-2 w-2 rounded-full bg-current opacity-75" />
                                  {reserva.estado_gemellista || 'Pendiente'}
                                </span>
                                <p className="text-xs text-gray-700 font-semibold">{reserva.nombre_gemellista}</p>
                                <p className="text-xs text-gray-500">CC: {reserva.cedula_gemellista}</p>
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
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {reserva.estado}
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
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              {reserva.es_familia_gemellista && (
                                <div className="flex flex-col gap-2 border-b border-gray-200 pb-2">
                                  {reserva.estado_gemellista !== 'Aprobado' && (
                                    <button
                                      onClick={() => actualizarEstadoGemellista(reserva.id, 'Aprobado')}
                                      disabled={procesandoGemellista === reserva.id}
                                      className="px-3 py-1 rounded bg-emerald-100 text-emerald-700 text-sm font-semibold hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {procesandoGemellista === reserva.id ? 'Guardando...' : 'Aprobar tarifa gemellista'}
                                    </button>
                                  )}
                                  {reserva.estado_gemellista !== 'Rechazado' && reserva.estado_gemellista !== 'No aplica' && (
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
                                onClick={() => abrirModalPago(reserva)}
                                className="px-3 py-1 rounded bg-secondary text-white text-sm hover:bg-blue-600"
                              >
                                {reserva.pago_registrado ? 'Actualizar pago' : 'Registrar pago'}
                              </button>
                              {reserva.estado === 'Pendiente' && (
                                <button
                                  onClick={() => cambiarEstado(reserva.id, 'Jugado')}
                                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                                >
                                  ✓ Jugado
                                </button>
                              )}
                              <button
                                onClick={() => eliminarReserva(reserva.id)}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                              >
                                🗑 Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
