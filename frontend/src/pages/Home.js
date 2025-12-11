import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reservasAPI } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const HORARIO_APERTURA = 8;
const HORARIO_CIERRE = 20;
const HORAS_DEL_DIA = Array.from({ length: HORARIO_CIERRE - HORARIO_APERTURA + 1 }, (_, idx) => {
  const hora = HORARIO_APERTURA + idx;
  return `${hora.toString().padStart(2, '0')}:00`;
});

const Home = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email_cliente: '',
    celular_cliente: '',
    fecha: today,
    hora: ''
  });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [consultando, setConsultando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [disponibilidadDias, setDisponibilidadDias] = useState([]);
  const [cargandoDias, setCargandoDias] = useState(true);
  const [errorDias, setErrorDias] = useState('');

  const cargarDisponibilidad = async (fecha) => {
    try {
      setConsultando(true);
      const response = await reservasAPI.obtenerDisponibilidad(fecha);
      const horas = response.data.horasDisponibles?.length
        ? response.data.horasDisponibles
        : HORAS_DEL_DIA;
      setHorasDisponibles(horas);
      setHorasOcupadas(response.data.horasOcupadas || []);
      
      // Si la hora seleccionada ya no está disponible, seleccionar la primera disponible
      setFormData((prev) => ({
        ...prev,
       hora: horas.includes(prev.hora) ? prev.hora : horas[0] || ''
      }));
    } catch (error) {
      // Si no se puede consultar la API, mostramos todos los horarios para evitar dejar la UI vacía
      setHorasDisponibles(HORAS_DEL_DIA);
      setHorasOcupadas([]);
      setFormData((prev) => ({
        ...prev,
        hora: HORAS_DEL_DIA.includes(prev.hora) ? prev.hora : HORAS_DEL_DIA[0]
      }));
    } finally {
      setConsultando(false);
    }
  };

  useEffect(() => {
    cargarDisponibilidad(formData.fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.fecha]);

  useEffect(() => {
    const cargarDisponibilidadSemanal = async () => {
      setCargandoDias(true);
      setErrorDias('');

      const dias = Array.from({ length: 7 }, (_, idx) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + idx);
        return {
          fechaValor: format(fecha, 'yyyy-MM-dd'),
          etiqueta: format(fecha, "EEEE d 'de' MMMM", { locale: es })
        };
      });

      try {
        const resultados = await Promise.all(
          dias.map(async (dia) => {
            try {
              const response = await reservasAPI.obtenerDisponibilidad(dia.fechaValor);
              return {
                ...dia,
                horasDisponibles: response.data.horasDisponibles,
                horasOcupadas: response.data.horasOcupadas,
                error: ''
              };
            } catch (error) {
              return {
                ...dia,
                horasDisponibles: [],
                horasOcupadas: [],
                error: error.response?.data?.error || 'Sin datos de disponibilidad'
              };
            }
          })
        );

        setDisponibilidadDias(resultados);
      } catch (error) {
        setErrorDias('No pudimos cargar la disponibilidad por día.');
      } finally {
        setCargandoDias(false);
      }
    };

    cargarDisponibilidadSemanal();
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!formData.hora) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un horario disponible' });
      return;
    }

    try {
      setEnviando(true);
      const response = await reservasAPI.crear(formData);
      const texto = `¡Reserva creada! Te esperamos el ${format(new Date(formData.fecha), "dd 'de' MMMM, yyyy", { locale: es })} a las ${formData.hora}.`;
      setMensaje({ tipo: 'exito', texto });
      setFormData({
        nombre_cliente: '',
        email_cliente: '',
        celular_cliente: '',
        fecha: formData.fecha,
        hora: ''
      });
      cargarDisponibilidad(formData.fecha);
      return response;
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.error || 'No pudimos crear la reserva'
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <p className="text-sm font-semibold text-primary uppercase">Reserva pública</p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-1">Cancha Sintética Colgemelli</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Agenda tu partido sin registrarte. Elige la fecha y el horario disponibles, completa tus datos y listo.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white text-primary font-semibold border border-primary shadow-sm hover:bg-primary hover:text-white transition"
          >
            Acceso para administración
          </Link>
        </header>
  
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Reservar un horario</h2>

            {mensaje.texto && (
              <div
                className={`mb-6 p-4 rounded-lg border ${
                  mensaje.tipo === 'exito'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {mensaje.texto}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Nombre y apellido</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_cliente}
                    onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={formData.email_cliente}
                    onChange={(e) => setFormData({ ...formData, email_cliente: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Número de contacto</label>
                  <input
                    type="tel"
                    required
                    value={formData.celular_cliente}
                    onChange={(e) => setFormData({ ...formData, celular_cliente: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="300 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Fecha</label>
                  <input
                    type="date"
                    required
                    min={today}
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2 flex items-center justify-between">
                  <span>Horario</span>
                  {consultando && <span className="text-sm text-gray-500">Actualizando disponibilidad...</span>}
                </label>
                <select
                  required
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={consultando || horasDisponibles.length === 0}
                >
                  <option value="" disabled>
                    {consultando ? 'Consultando horarios...' : 'Selecciona un horario'}
                  </option>
                  {horasDisponibles.map((hora) => (
                    <option key={hora} value={hora}>
                      {hora}
                    </option>
                  ))}
                </select>
                {horasDisponibles.length === 0 && !consultando && (
                  <p className="text-sm text-red-600 mt-2">No hay horarios disponibles para esta fecha.</p>
                )}
              </div>

            <button
                type="submit"
                disabled={enviando || consultando || horasDisponibles.length === 0}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-gray-400"
              >
                {enviando ? 'Reservando...' : 'Reservar' }
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Disponibilidad</p>
                <h3 className="text-xl font-semibold text-gray-800">
                  {format(new Date(formData.fecha), "EEEE d 'de' MMMM", { locale: es })}
                </h3>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                Abierto 8:00 - 20:00
              </span>
            </div>

            {horasDisponibles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {horasDisponibles.map((hora) => (
                  <button
                    key={hora}
                    onClick={() => setFormData({ ...formData, hora })}
                    className={`p-3 rounded-lg border text-center font-semibold transition ${
                      formData.hora === hora
                        ? 'border-primary bg-green-50 text-primary'
                        : 'border-gray-200 hover:border-primary hover:bg-green-50'
                    }`}
                  >
                    {hora}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 rounded-xl text-gray-600">
                {consultando ? 'Consultando horarios disponibles...' : 'Sin reservas para esta fecha.'}
              </div>
            )}

            {horasOcupadas.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-2">Horarios ocupados:</p>
                <div className="flex flex-wrap gap-2">
                  {horasOcupadas.map((hora) => (
                    <span key={hora} className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                      {hora}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <p className="font-semibold">¿Ya eres parte del equipo?</p>
              <p className="mt-1">El panel de administración y cancha está disponible desde el botón de acceso.</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Disponibilidad por día</p>
              <h3 className="text-2xl font-semibold text-gray-800">Próximos 7 días</h3>
            </div>
            {cargandoDias && <span className="text-sm text-gray-500">Actualizando calendario...</span>}
          </div>

          {errorDias ? (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">{errorDias}</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disponibilidadDias.map((dia) => (
                <div key={dia.fechaValor} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs uppercase text-gray-500">{dia.fechaValor}</p>
                      <p className="text-lg font-semibold text-gray-800">{dia.etiqueta}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        dia.error
                          ? 'bg-red-100 text-red-700'
                          : dia.horasDisponibles.length > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {dia.error
                        ? 'Sin reservas'
                        : dia.horasDisponibles.length > 0
                          ? `${dia.horasDisponibles.length} horarios libres`
                          : 'Sin reservas'}
                    </span>
                  </div>

                  {dia.error ? (
                    <p className="text-sm text-red-700">Sin reservas</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {HORAS_DEL_DIA.map((hora) => {
                        const disponible = dia.horasDisponibles.includes(hora);
                        return (
                          <div
                            key={`${dia.fechaValor}-${hora}`}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                              disponible
                                ? 'border-green-200 bg-green-50 text-green-800'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span className="font-semibold">{hora}</span>
                            <span className="text-xs uppercase tracking-wide">
                              {disponible ? 'Disponible' : 'Ocupado'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
