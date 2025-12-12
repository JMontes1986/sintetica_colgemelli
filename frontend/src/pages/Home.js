import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reservasAPI } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const generarHoras = (horaApertura = '08:00', horaCierre = '21:00') => {
  const inicio = parseInt(horaApertura.slice(0, 2), 10) || 8;
  const fin = parseInt(horaCierre.slice(0, 2), 10) || 21;

  return Array.from({ length: fin - inicio + 1 }, (_, idx) => {
    const hora = inicio + idx;
    return `${hora.toString().padStart(2, '0')}:00`;
  });
};

const DEFAULT_HORARIO = {
  horas: generarHoras(),
  horaApertura: '08:00',
  horaCierre: '21:00'
};

const NEQUI_PAYMENT_NUMBER = '312 881 7505';
const NEQUI_QR_LINK =
  process.env.REACT_APP_NEQUI_QR_LINK || 'https://wa.me/573128817505?text=Hola,%20quiero%20pagar%20mi%20reserva';
const NEQUI_QR_IMAGE_URL =
  'https://hfgdlgapdossqycsjzgs.supabase.co/storage/v1/object/sign/imagen/QR%20Nequi.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84OTQzMDZkYi1lNjJmLTQ1MmItYmM1ZS1mNGY4NTlmMGY5YTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW4vUVIgTmVxdWkuanBnIiwiaWF0IjoxNzY1NTY5MzA4LCJleHAiOjE3OTcxMDUzMDh9.YsolxY582xMaRPVjnXzUrWX5SDWsjuqbCnpLY2uXH70';
const parseFechaLocal = (fecha) => {
  if (!fecha) return new Date();
  return new Date(`${fecha}T00:00:00`);
};

const Home = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email_cliente: '',
    celular_cliente: '',
    fecha: today,
    hora: DEFAULT_HORARIO.horas[0]
  });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [horasDisponibles, setHorasDisponibles] = useState(DEFAULT_HORARIO.horas);
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [horarioDelDia, setHorarioDelDia] = useState(DEFAULT_HORARIO);
  const [consultando, setConsultando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [disponibilidadDias, setDisponibilidadDias] = useState([]);
  const [cargandoDias, setCargandoDias] = useState(true);
  const [errorDias, setErrorDias] = useState('');
  const [resumenReserva, setResumenReserva] = useState(null);
  const [disponibilidadCache, setDisponibilidadCache] = useState({
    [today]: {
      horasDisponibles: DEFAULT_HORARIO.horas,
      horasOcupadas: [],
      horario: DEFAULT_HORARIO,
      error: ''
    }
  });
  
  const cargarDisponibilidad = async (fecha) => {
    try {
      setConsultando(true);
      const response = await reservasAPI.obtenerDisponibilidad(fecha);
      const horasOcupadasAPI = response.data.horasOcupadas || [];
      const horario = response.data.horario?.horas?.length
        ? {
            horas: response.data.horario.horas,
            horaApertura: response.data.horario.horaApertura,
            horaCierre: response.data.horario.horaCierre
          }
        : DEFAULT_HORARIO;

      const horas = horario.horas?.length ? horario.horas : DEFAULT_HORARIO.horas;
      const horasLibres = horas.filter((hora) => !horasOcupadasAPI.includes(hora));
      const horasSeleccionables = horasLibres.length ? horasLibres : horas;

      setHorasDisponibles(horasSeleccionables);
      setHorasOcupadas(horasOcupadasAPI);
      setHorarioDelDia(horario);

      setDisponibilidadCache((prev) => ({
        ...prev,
        [fecha]: {
          horasDisponibles: horasSeleccionables,
          horasOcupadas: horasOcupadasAPI,
          horario,
          error: ''
        }
      }));
      
      // Si la hora seleccionada ya no está disponible, seleccionar la primera disponible
      setFormData((prev) => ({
        ...prev,
        hora: horasSeleccionables.includes(prev.hora) ? prev.hora : horasSeleccionables[0] || ''
      }));
    } catch (error) {
      // Si no se puede consultar la API, mostramos todos los horarios para evitar dejar la UI vacía
      setHorasDisponibles(DEFAULT_HORARIO.horas);
      setHorasOcupadas([]);
      setHorarioDelDia(DEFAULT_HORARIO);
      setFormData((prev) => ({
        ...prev,
        hora: DEFAULT_HORARIO.horas.includes(prev.hora) ? prev.hora : DEFAULT_HORARIO.horas[0]
      }));
      setDisponibilidadCache((prev) => ({
        ...prev,
        [fecha]: {
          horasDisponibles: DEFAULT_HORARIO.horas,
          horasOcupadas: [],
          horario: DEFAULT_HORARIO,
          error: error.response?.data?.error || 'Sin datos de disponibilidad'
        }
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
    let cancelado = false;
    
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
                    const cacheDia = disponibilidadCache[dia.fechaValor];
                if (cacheDia) {
                  return { ...dia, ...cacheDia };
                }
            
            try {
              const response = await reservasAPI.obtenerDisponibilidad(dia.fechaValor);
             const horario = response.data?.horario?.horas?.length
                ? {
                    horas: response.data.horario.horas,
                    horaApertura: response.data.horario.horaApertura,
                    horaCierre: response.data.horario.horaCierre
                  }
                : DEFAULT_HORARIO;
              
              const diaData = {
                horasDisponibles: response.data?.horasDisponibles || horario.horas,
                horasOcupadas: response.data?.horasOcupadas || [],
                horario,
                error: ''
              };

              setDisponibilidadCache((prev) => ({
                ...prev,
                [dia.fechaValor]: diaData
              }));

              return { ...dia, ...diaData };
            } catch (error) {
              const diaData = {
                horasDisponibles: DEFAULT_HORARIO.horas,
                horasOcupadas: [],
                horario: DEFAULT_HORARIO,
                error: error.response?.data?.error || 'Sin datos de disponibilidad'
              };
                        
              setDisponibilidadCache((prev) => ({
                ...prev,
                [dia.fechaValor]: diaData
              }));

              return { ...dia, ...diaData };
            }
          })
        );
       if (!cancelado) {
          setDisponibilidadDias(resultados);
        }
      } catch (error) {
        if (!cancelado) {
          setErrorDias('No pudimos cargar la disponibilidad por día.');
        }
      } finally {
        if (!cancelado) {
          setCargandoDias(false);
        }
      }
    };

    const timeout = setTimeout(() => {
      if (!cancelado) {
        cargarDisponibilidadSemanal();
      }
    }, 200);

    return () => {
      cancelado = true;
      clearTimeout(timeout);
    };
  }, [disponibilidadCache]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!formData.hora) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un horario disponible' });
      return;
    }

    try {
      setEnviando(true);
      const horaReservada = formData.hora;
      const response = await reservasAPI.crear(formData);
      const reservaCreada = response.data?.reserva || formData;
      const fechaLegible = format(parseFechaLocal(reservaCreada.fecha || formData.fecha), "dd 'de' MMMM, yyyy", { locale: es });
      const texto = `¡Reserva creada! Te esperamos el ${fechaLegible} a las ${reservaCreada.hora || formData.hora}.`;
      setMensaje({ tipo: 'exito', texto });
      setResumenReserva({
        nombre_cliente: reservaCreada.nombre_cliente,
        email_cliente: reservaCreada.email_cliente,
        celular_cliente: reservaCreada.celular_cliente,
        fecha: reservaCreada.fecha,
        hora: reservaCreada.hora
      });
      setFormData({
        nombre_cliente: '',
        email_cliente: '',
        celular_cliente: '',
        fecha: formData.fecha,
        hora: ''
      });
      
      setHorasDisponibles((prev) => prev.filter((hora) => hora !== horaReservada));
      setHorasOcupadas((prev) => {
        if (prev.includes(horaReservada)) return prev;
        return [...prev, horaReservada];
      });

      setDisponibilidadDias((prev) =>
        prev.map((dia) =>
          dia.fechaValor === formData.fecha
            ? {
                ...dia,
                horasDisponibles: dia.horasDisponibles.filter((hora) => hora !== horaReservada),
                horasOcupadas: [...(dia.horasOcupadas || []), horaReservada]
              }
            : dia
        )
      );
      
      cargarDisponibilidad(formData.fecha);
      return response;
    } catch (error) {
      const mensajeError =
        error.response?.data?.error ||
        (error.code === 'ERR_NETWORK'
          ? 'No pudimos conectar con el servidor en este momento. Intenta nuevamente en unos minutos o contáctanos si el problema continúa.'
          : error.message);
      
      setMensaje({
        tipo: 'error',
        texto: mensajeError || 'No pudimos crear la reserva'
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
    {resumenReserva && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <button
              onClick={() => setResumenReserva(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              aria-label="Cerrar resumen de reserva"
            >
              ✕
            </button>
            <div className="grid gap-6 p-8 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Reserva creada</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-800">Detalles de tu reserva</h2>
                <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Día</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {resumenReserva.fecha
                        ? format(parseFechaLocal(resumenReserva.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })
                        : 'Fecha por confirmar'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Hora</p>
                      <p className="text-lg font-semibold text-gray-800">{resumenReserva.hora}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Estado</p>
                      <p className="text-sm font-semibold text-green-700">Pendiente de pago</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-gray-500">Reservado por</p>
                    <p className="text-lg font-semibold text-gray-800">{resumenReserva.nombre_cliente}</p>
                    <p className="text-sm text-gray-600">{resumenReserva.email_cliente}</p>
                    <p className="text-sm text-gray-600">{resumenReserva.celular_cliente}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-green-50 p-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Paga tu reserva</p>
                    <p className="text-xs text-gray-600">Nequi • Número {NEQUI_PAYMENT_NUMBER}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow">Prioritario</span>
                </div>
                <div className="mt-4 flex flex-col items-center gap-3 rounded-lg bg-white p-4 shadow">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(NEQUI_QR_LINK)}`}
                    src={NEQUI_QR_IMAGE_URL}
                    className="h-48 w-48 rounded-lg border border-gray-200 object-contain"
                  />
                  <p className="text-center text-sm text-gray-700">
                    Escanea el código o usa el número <span className="font-semibold">{NEQUI_PAYMENT_NUMBER}</span> para
                    completar tu pago por Nequi.
                  </p>
                  <a
                    href={NEQUI_QR_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-600"
                  >
                    Abrir enlace de pago
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
                  {format(parseFechaLocal(formData.fecha), "EEEE d 'de' MMMM", { locale: es })}
                </h3>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                Abierto {horarioDelDia.horaApertura} - {horarioDelDia.horaCierre}
              </span>
            </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(horarioDelDia.horas || []).map((horaSlot) => {
                  const estaReservada = horasOcupadas.includes(horaSlot);
                  const disponible = horasDisponibles.includes(horaSlot) && !estaReservada;
                  const estaSeleccionada = formData.hora === horaSlot;

                  let estadoClase = 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed';
                  if (estaReservada) {
                    estadoClase = 'border-rose-200 bg-rose-50 text-rose-700 cursor-not-allowed';
                  } else if (disponible && estaSeleccionada) {
                    estadoClase = 'border-primary bg-green-50 text-primary';
                  } else if (disponible) {
                    estadoClase = 'border-gray-200 hover:border-primary hover:bg-green-50';
                  }

                  return (
                    <button
                      key={horaSlot}
                      type="button"
                      onClick={() => disponible && setFormData({ ...formData, hora: horaSlot })}
                      disabled={!disponible}
                      className={`p-3 rounded-lg border text-center font-semibold transition ${estadoClase}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{horaSlot}</span>
                        {!disponible && (
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {estaReservada ? 'Reservado' : 'No disponible'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            {(horarioDelDia.horas || []).filter((horaSlot) => horasDisponibles.includes(horaSlot) && !horasOcupadas.includes(horaSlot)).length === 0 &&
              !consultando && (
                <p className="text-sm text-red-600 mt-2">No hay horarios disponibles para esta fecha.</p>
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
                      {(dia.horario?.horas || DEFAULT_HORARIO.horas).map((hora) => {
                        const estaReservada = dia.horasOcupadas?.includes(hora);
                        const disponible = dia.horasDisponibles.includes(hora);
                        const ocupado = estaReservada || !disponible;
                        
                        return (
                          <div
                            key={`${dia.fechaValor}-${hora}`}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                              estaReservada
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : ocupado
                                  ? 'border-gray-200 bg-gray-50 text-gray-600'
                                  : 'border-green-200 bg-green-50 text-green-800'
                            }`}
                          >
                            <span className="font-semibold">{hora}</span>
                            <span className="text-xs uppercase tracking-wide">
                              {estaReservada ? 'Reservado' : ocupado ? 'No disponible' : 'Disponible'}
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
