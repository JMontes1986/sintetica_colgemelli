import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservasAPI } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DashboardCancha = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email_cliente: '',
    celular_cliente: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora: '10:00'
  });

  useEffect(() => {
    cargarReservas();
  }, [filtro]);

  const cargarReservas = async () => {
    try {
      setLoading(true);
      const params = filtro !== 'todas' ? { estado: filtro === 'pendientes' ? 'Pendiente' : 'Jugado' } : {};
      const response = await reservasAPI.obtenerTodas(params);
      setReservas(response.data.reservas);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar las reservas' });
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const reservasFiltradas = reservas.filter(reserva => {
    if (filtro === 'pendientes') return reserva.estado === 'Pendiente';
    if (filtro === 'jugadas') return reserva.estado === 'Jugado';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
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
              onClick={() => setFiltro('jugadas')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filtro === 'jugadas'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Jugadas ({reservas.filter(r => r.estado === 'Jugado').length})
            </button>
          </div>
        </div>

        {/* Lista de Reservas */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando reservas...</div>
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
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {reserva.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {reserva.estado === 'Pendiente' && (
                          <button
                            onClick={() => cambiarEstado(reserva.id, 'Jugado')}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                          >
                            Marcar Jugado
                          </button>
                        )}
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
