import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservasAPI } from '../services/api';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const Home = () => {
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email_cliente: '',
    celular_cliente: '',
    hora: ''
  });

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Cargar disponibilidad cuando cambia la fecha
  React.useEffect(() => {
    if (fecha) {
      cargarDisponibilidad();
    }
  }, [fecha]);

  const cargarDisponibilidad = async () => {
    try {
      setLoading(true);
      const response = await reservasAPI.obtenerDisponibilidad(fecha);
      setHorasDisponibles(response.data.horasDisponibles);
    } catch (error) {
      console.error('Error al cargar disponibilidad:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar horarios disponibles' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.hora) {
      setMensaje({ tipo: 'error', texto: 'Por favor selecciona una hora' });
      return;
    }

    try {
      setLoading(true);
      await reservasAPI.crear({
        ...formData,
        fecha
      });
      
      setMensaje({ 
        tipo: 'success', 
        texto: '¡Reserva creada exitosamente! Te contactaremos pronto.' 
      });
      
      setFormData({
        nombre_cliente: '',
        email_cliente: '',
        celular_cliente: '',
        hora: ''
      });
      
      setMostrarFormulario(false);
      cargarDisponibilidad();
    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: error.response?.data?.error || 'Error al crear la reserva' 
      });
    } finally {
      setLoading(false);
    }
  };

  const seleccionarHora = (hora) => {
    setFormData({ ...formData, hora });
    setMostrarFormulario(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">⚽ Cancha Sintética</h1>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-600 transition"
          >
            Iniciar Sesión
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Título */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Reserva tu Cancha
            </h2>
            <p className="text-gray-600 text-lg">
              Selecciona fecha y hora disponible para tu partido
            </p>
          </div>

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

          {/* Selector de Fecha */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <label className="block text-gray-700 font-semibold mb-3 text-lg">
              Selecciona la Fecha:
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
            />
          </div>

          {/* Horarios Disponibles */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Horarios Disponibles
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Cargando horarios...</div>
              </div>
            ) : horasDisponibles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {horasDisponibles.map((hora) => (
                  <button
                    key={hora}
                    onClick={() => seleccionarHora(hora)}
                    className={`py-3 px-4 rounded-lg font-medium transition ${
                      formData.hora === hora
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {hora}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay horarios disponibles para esta fecha
              </div>
            )}
          </div>

          {/* Formulario de Reserva */}
          {mostrarFormulario && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Completa tus Datos
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_cliente}
                    onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email_cliente}
                    onChange={(e) => setFormData({ ...formData, email_cliente: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Celular *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.celular_cliente}
                    onChange={(e) => setFormData({ ...formData, celular_cliente: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="3001234567"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <span className="font-semibold">Fecha:</span> {format(new Date(fecha), "dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Hora:</span> {formData.hora}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-gray-400"
                  >
                    {loading ? 'Reservando...' : 'Confirmar Reserva'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFormulario(false);
                      setFormData({ ...formData, hora: '' });
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p>© 2024 Cancha Sintética - Sistema de Reservas</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
