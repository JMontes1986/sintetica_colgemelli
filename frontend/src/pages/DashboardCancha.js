import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservasAPI } from '../services/api';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

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

const obtenerDiasMes = (mesActual) => {
  const fechaBase = new Date(`${mesActual}-01T00:00:00`);
  const inicio = startOfWeek(startOfMonth(fechaBase), { weekStartsOn: 1 });
  const fin = endOfWeek(endOfMonth(fechaBase), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: inicio, end: fin });
};

const DashboardCancha = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const cargarReservas = useCallback(async () => {
    try {
      setLoading(true);
      const estadoPorFiltro = { pendientes: 'Pendiente', aprobadas: 'Aprobado', jugadas: 'Jugado' };
      const params = filtro !== 'todas' ? { estado: estadoPorFiltro[filtro] } : {};
      const response = await reservasAPI.obtenerTodas(params);
      setReservas(response.data.reservas);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar las reservas' });
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargarReservas();
  }, [cargarReservas]);

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

  const crearReservaManual = async (e) => {
    e.preventDefault();
    try {
      await reservasAPI.crearManual({
        ...formData,
        semanas_repeticion: Number(formData.semanas_repeticion) || 1,
        dias_semana: formData.reserva_recurrente ? formData.dias_semana : []
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
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const reservasFiltradas = reservas.filter(reserva => {
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
  
  const toggleDiaSemana = (dia) => {
    setFormData((prev) => {
      const actual = prev.dias_semana || [];
      const yaExiste = actual.includes(dia);
      const dias_semana = yaExiste ? actual.filter((valor) => valor !== dia) : [...actual, dia];
      return { ...prev, dias_semana };
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
    {reservaPagoSeleccionada && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Panel Operador</h1>
            <p className="text-gray-600 text-sm">Bienvenido, {usuario?.nombre}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Cerrar Sesión
          </button>
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

        {/* Acciones */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-600 transition"
          >
            {mostrarFormulario ? 'Cancelar' : '+ Nueva Reserva'}
          </button>
          <button
            onClick={cargarReservas}
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
              <label className="flex items-center gap-3 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.es_familia_gemellista}
                  onChange={(e) => setFormData({ ...formData, es_familia_gemellista: e.target.checked })}
                  className="h-5 w-5 text-primary focus:ring-primary"
                />
                <div>
                  <p className="font-semibold text-gray-800">¿Familia Gemellista?</p>
                  <p className="text-sm text-gray-600">Activa la verificación de tarifa especial para la reserva.</p>
                </div>
              </label>
              {formData.es_familia_gemellista && (
                <>
                  <input
                    type="text"
                    required
                    placeholder="Nombre de la familia Gemellista"
                    value={formData.nombre_gemellista}
                    onChange={(e) => setFormData({ ...formData, nombre_gemellista: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Cédula para validar"
                    value={formData.cedula_gemellista}
                    onChange={(e) => setFormData({ ...formData, cedula_gemellista: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </>
              )}
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setFiltro('todas')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filtro === 'todas'
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Todas ({reservas.length})
            </button>
            <button
              onClick={() => setFiltro('pendientes')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filtro === 'pendientes'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Pendientes ({reservas.filter(r => r.estado === 'Pendiente').length})
            </button>
            <button
              onClick={() => setFiltro('aprobadas')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filtro === 'aprobadas'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Aprobadas ({reservas.filter(r => r.estado === 'Aprobado').length})
            </button>
            <button
              onClick={() => setFiltro('jugadas')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filtro === 'jugadas'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Jugadas ({reservas.filter(r => r.estado === 'Jugado').length})
            </button>

                <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => setVistaReservas('tabla')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  vistaReservas === 'tabla' ? 'bg-secondary text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Tabla
              </button>
              <button
                onClick={() => setVistaReservas('calendario')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  vistaReservas === 'calendario' ? 'bg-secondary text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Calendario
              </button>
              {vistaReservas === 'calendario' && (
                <input
                  type="month"
                  value={mesCalendario}
                  onChange={(e) => setMesCalendario(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-primary"
                />
              )}
            </div>
          </div>
        </div>

        {/* Lista de Reservas */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando reservas...</div>
          ) : vistaReservas === 'calendario' ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reservasFiltradas.map((reserva) => (
                    <tr key={reserva.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{reserva.nombre_cliente}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{reserva.email_cliente}</div>
                        <div className="text-sm text-gray-500">{reserva.celular_cliente}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(reserva.fecha), "dd 'de' MMMM, yyyy", { locale: es })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{reserva.hora}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => abrirModalEdicion(reserva)}
                            className="px-3 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600 transition"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => abrirModalPago(reserva)}
                            className="px-3 py-1 rounded bg-secondary text-white hover:bg-blue-600 transition"
                          >
                            {reserva.pago_registrado ? 'Actualizar pago' : 'Registrar pago'}
                          </button>
                        {reserva.estado === 'Pendiente' && (
                          <button
                              onClick={() => cambiarEstado(reserva.id, 'Aprobado')}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                            >
                              Aprobar reserva
                            </button>
                          )}
                          {reserva.estado === 'Aprobado' && (
                            <button
                              onClick={() => cambiarEstado(reserva.id, 'Jugado')}
                              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                            >
                              Marcar Jugado
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No hay reservas {filtro !== 'todas' ? filtro : 'registradas'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardCancha;
