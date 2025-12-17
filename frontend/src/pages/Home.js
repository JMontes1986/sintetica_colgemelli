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

const DURACION_MAXIMA = 3;

const NEQUI_PAYMENT_NUMBER = '313 672 3305';
const NEQUI_QR_LINK =
  process.env.REACT_APP_NEQUI_QR_LINK || 'https://wa.me/573128817505?text=Hola,%20quiero%20pagar%20mi%20reserva';
const NEQUI_QR_IMAGE_URL =
  'https://hfgdlgapdossqycsjzgs.supabase.co/storage/v1/object/sign/imagen/QR%20Nequi.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84OTQzMDZkYi1lNjJmLTQ1MmItYmM1ZS1mNGY4NTlmMGY5YTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW4vUVIgTmVxdWkuanBnIiwiaWF0IjoxNzY1NTY5MzA4LCJleHAiOjE3OTcxMDUzMDh9.YsolxY582xMaRPVjnXzUrWX5SDWsjuqbCnpLY2uXH70';

const parseFechaLocal = (fecha) => {
  if (!fecha) return new Date();
  return new Date(`${fecha}T00:00:00`);
};

const obtenerHorasSeleccionadas = (horaInicio, duracion, horario = []) => {
  if (!horaInicio || !duracion || duracion < 1) return [];

  const indiceInicio = horario.indexOf(horaInicio);
  if (indiceInicio === -1) return [];

  return horario.slice(indiceInicio, indiceInicio + duracion);
};

const formatearRangoHoras = (horas = []) => {
  if (!horas.length) return '';
  if (horas.length === 1) return horas[0];
  return `${horas[0]} - ${horas[horas.length - 1]}`;
};

const esFinDeSemana = (fecha) => {
  const fechaBase = parseFechaLocal(fecha);
  const diaSemana = fechaBase.getDay();
  return diaSemana === 0 || diaSemana === 6;
};

const obtenerTarifaPorHora = (hora, fecha, esFamiliaGemellista = false) => {
  const horaEntera = parseInt(hora?.slice(0, 2), 10);

  if (Number.isNaN(horaEntera)) return 0;

  if (esFamiliaGemellista) {
    return horaEntera >= 17 ? 110000 : 90000;
  }
  
  if (esFinDeSemana(fecha)) return 130000;

  return horaEntera >= 17 ? 130000 : 100000;
};

const moverALunesSiguiente = (fecha) => {
  const diaSemana = fecha.getDay();
  const diasHastaLunes = diaSemana === 1 ? 0 : (8 - diaSemana) % 7;
  const fechaLunes = new Date(fecha);
  fechaLunes.setDate(fechaLunes.getDate() + diasHastaLunes);
  return fechaLunes;
};

const calcularPascua = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mes, dia);
};

const formatearFechaISO = (fecha) => format(fecha, 'yyyy-MM-dd');

const obtenerFestivosColombia = (year) => {
  const pascua = calcularPascua(year);

  const festivosFijos = [
    new Date(year, 0, 1),
    new Date(year, 4, 1),
    new Date(year, 6, 20),
    new Date(year, 7, 7),
    new Date(year, 11, 8),
    new Date(year, 11, 25)
  ];

  const festivosEmiliani = [
    new Date(year, 0, 6),
    new Date(year, 2, 19),
    new Date(year, 5, 29),
    new Date(year, 7, 15),
    new Date(year, 9, 12),
    new Date(year, 10, 1),
    new Date(year, 10, 11)
  ].map(moverALunesSiguiente);

  const festivosSemanaSanta = [
    new Date(pascua.getTime() - 3 * 24 * 60 * 60 * 1000),
    new Date(pascua.getTime() - 2 * 24 * 60 * 60 * 1000)
  ];

  const festivosMoviles = [
    moverALunesSiguiente(new Date(pascua.getTime() + 43 * 24 * 60 * 60 * 1000)),
    moverALunesSiguiente(new Date(pascua.getTime() + 64 * 24 * 60 * 60 * 1000)),
    moverALunesSiguiente(new Date(pascua.getTime() + 71 * 24 * 60 * 60 * 1000))
  ];

  return new Set([
    ...festivosFijos,
    ...festivosEmiliani,
    ...festivosSemanaSanta,
    ...festivosMoviles
  ].map(formatearFechaISO));
};

const esFestivoColombia = (fechaISO) => {
  if (!fechaISO) return false;
  const fecha = parseFechaLocal(fechaISO);
  const festivos = obtenerFestivosColombia(fecha.getFullYear());
  return festivos.has(fechaISO);
};

const calcularTotalReserva = (horas = [], fecha, esFamiliaGemellista = false) =>
  (horas || []).reduce(
    (total, hora) => total + obtenerTarifaPorHora(hora, fecha, esFamiliaGemellista),
    0
  );

const formatearCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

const obtenerHoraInicialDisponible = (duracion, horario = [], horasLibres = []) => {
  if (!duracion || duracion < 1) return '';

  return (horario || []).find((horaSlot) => {
    const rango = obtenerHorasSeleccionadas(horaSlot, duracion, horario);
    return rango.length === duracion && rango.every((hora) => horasLibres.includes(hora));
  }) || '';
};

const Home = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email_cliente: '',
    celular_cliente: '',
    es_familia_gemellista: false,
    nombre_gemellista: '',
    cedula_gemellista: '',
    fecha: today,
    hora: DEFAULT_HORARIO.horas[0],
    duracion: 1
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
  
  const horasValidasParaDuracion = (horarioDelDia.horas || []).filter((horaSlot) => {
    const rango = obtenerHorasSeleccionadas(horaSlot, formData.duracion, horarioDelDia.horas);
    return rango.length === formData.duracion && rango.every((hora) => horasDisponibles.includes(hora));
  });

  const horasSeleccionadas = obtenerHorasSeleccionadas(
    formData.hora,
    formData.duracion,
    horarioDelDia.horas
  );

  const horasParaPago = resumenReserva?.horas || horasSeleccionadas;
  const fechaParaPago = resumenReserva?.fecha || formData.fecha;
  const esFamiliaGemellista = resumenReserva?.es_familia_gemellista || formData.es_familia_gemellista;
  const estadoGemellistaActual =
    resumenReserva?.estado_gemellista || (formData.es_familia_gemellista ? 'Pendiente' : 'No aplica');
  const tieneTarifaGemellistaActiva = estadoGemellistaActual === 'Aprobado';
  const totalResumenReserva = calcularTotalReserva(
    horasParaPago,
    fechaParaPago,
    tieneTarifaGemellistaActiva
  );
  const esDiaFestivoSeleccionado = esFestivoColombia(formData.fecha);
  
  useEffect(() => {
    const horaSugerida = obtenerHoraInicialDisponible(formData.duracion, horarioDelDia.horas, horasDisponibles);

    if (formData.hora && horasValidasParaDuracion.includes(formData.hora)) return;

    setFormData((prev) => ({
      ...prev,
      hora: horaSugerida || prev.hora
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.duracion, horasDisponibles, horarioDelDia.horas]);
  
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
      
      const horaInicialSugerida = obtenerHoraInicialDisponible(
        formData.duracion,
        horario.horas,
        horasSeleccionables
      );

      setFormData((prev) => {
        const duracion = Math.min(prev.duracion, DURACION_MAXIMA);
        const rangoActual = obtenerHorasSeleccionadas(prev.hora, duracion, horario.horas);
        const esRangoValido =
          rangoActual.length === duracion && rangoActual.every((hora) => horasSeleccionables.includes(hora));
        const horaPorDefecto = horaInicialSugerida || horasSeleccionables[0] || '';
        return {
          ...prev,
          hora: esRangoValido ? prev.hora : horaPorDefecto,
          duracion
        };
      });
    } catch (error) {
      // Si no se puede consultar la API, mostramos todos los horarios para evitar dejar la UI vacía
      setHorasDisponibles(DEFAULT_HORARIO.horas);
      setHorasOcupadas([]);
      setHorarioDelDia(DEFAULT_HORARIO);
      setFormData((prev) => ({
        ...prev,
        hora: DEFAULT_HORARIO.horas.includes(prev.hora) ? prev.hora : DEFAULT_HORARIO.horas[0],
        duracion: Math.min(prev.duracion, DURACION_MAXIMA)
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

   const horasSeleccionadas = obtenerHorasSeleccionadas(
      formData.hora,
      formData.duracion,
      horarioDelDia.horas
    );

    if (horasSeleccionadas.length !== formData.duracion) {
      setMensaje({
        tipo: 'error',
        texto: 'Selecciona un bloque de horas consecutivas disponibles'
      });
      return;
    }

    const rangoDisponible = horasSeleccionadas.every((hora) => horasDisponibles.includes(hora));

    if (!rangoDisponible) {
      setMensaje({
        tipo: 'error',
        texto: 'Alguna de las horas ya no está disponible. Elige otro bloque.'
      });
      return;
    }

    if (formData.es_familia_gemellista) {
      if (!formData.nombre_gemellista.trim() || !formData.cedula_gemellista.trim()) {
        setMensaje({
          tipo: 'error',
          texto: 'Ingresa el nombre y la cédula de la Familia Gemellista para aplicar la tarifa especial.'
        });
        return;
      }
    }
    
    try {
      setEnviando(true);
      const response = await reservasAPI.crear({ ...formData, horas: horasSeleccionadas });
      const reservasCreadas = response.data?.reservas || [];
      const reservaBase = reservasCreadas[0] || formData;
      const estadoGemellistaRespuesta =
        reservaBase.estado_gemellista || (reservaBase.es_familia_gemellista ? 'Pendiente' : 'No aplica');
      const horasConfirmadas = reservasCreadas.length
        ? reservasCreadas.map((reserva) => reserva.hora)
        : horasSeleccionadas;
      const horasOrdenadas = [...horasConfirmadas].sort(
        (a, b) => (horarioDelDia.horas || []).indexOf(a) - (horarioDelDia.horas || []).indexOf(b)
      );
      const fechaLegible = format(parseFechaLocal(formData.fecha), "dd 'de' MMMM, yyyy", { locale: es });
      const texto = `¡Reserva creada! Te esperamos el ${fechaLegible} de ${formatearRangoHoras(horasOrdenadas)}.`;
      setMensaje({ tipo: 'exito', texto });
      setResumenReserva({
        nombre_cliente: reservaBase.nombre_cliente,
        email_cliente: reservaBase.email_cliente,
        celular_cliente: reservaBase.celular_cliente,
        es_familia_gemellista: reservaBase.es_familia_gemellista,
        nombre_gemellista: reservaBase.nombre_gemellista,
        cedula_gemellista: reservaBase.cedula_gemellista,
        estado_gemellista: estadoGemellistaRespuesta,
        fecha: reservaBase.fecha,
        horas: horasOrdenadas
      });
      setFormData({
        nombre_cliente: '',
        email_cliente: '',
        celular_cliente: '',
        es_familia_gemellista: false,
        nombre_gemellista: '',
        cedula_gemellista: '',
        fecha: formData.fecha,
        hora: obtenerHoraInicialDisponible(1, horarioDelDia.horas, horasDisponibles),
        duracion: 1
      });
      
      setHorasDisponibles((prev) => prev.filter((hora) => !horasSeleccionadas.includes(hora)));
      setHorasOcupadas((prev) => {
        const nuevasOcupadas = new Set(prev);
        horasSeleccionadas.forEach((hora) => nuevasOcupadas.add(hora));
        return Array.from(nuevasOcupadas);
      });

      setDisponibilidadDias((prev) =>
        prev.map((dia) =>
          dia.fechaValor === formData.fecha
            ? {
                ...dia,
                horasDisponibles: dia.horasDisponibles.filter((hora) => !horasSeleccionadas.includes(hora)),
                horasOcupadas: [...(dia.horasOcupadas || []), ...horasSeleccionadas]
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
        <div
          className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black bg-opacity-50 px-4 py-6 sm:items-center"
          onClick={() => setResumenReserva(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setResumenReserva(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              aria-label="Cerrar resumen de reserva"
            >
              ✕
            </button>
            <div className="grid gap-6 p-6 md:p-8 md:grid-cols-2">
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
                      <p className="text-lg font-semibold text-gray-800">
                        {formatearRangoHoras(resumenReserva.horas || [])}
                      </p>
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
                {resumenReserva.es_familia_gemellista && (
                  <div className="rounded-lg border border-primary/40 bg-white p-3">
                    <p className="text-xs uppercase text-primary font-semibold">Tarifa Familia Gemellista</p>
                    <p className="text-sm text-gray-700">
                      Nombre registrado: <span className="font-semibold">{resumenReserva.nombre_gemellista}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Cédula: <span className="font-semibold">{resumenReserva.cedula_gemellista}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Estado de verificación:{' '}
                      <span className="font-semibold capitalize">
                        {resumenReserva.estado_gemellista || 'Pendiente'}
                      </span>
                    </p>
                    {resumenReserva.estado_gemellista !== 'Aprobado' && (
                      <p className="mt-1 text-xs text-blue-700">
                        Mientras se aprueba, la reserva se cobra con la tarifa general.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-green-50 p-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Paga tu reserva</p>
                    <p className="text-base font-bold text-gray-800">Nequi • Número {NEQUI_PAYMENT_NUMBER}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow">Prioritario</span>
                </div>
                <div className="mt-4 rounded-lg bg-white p-4 shadow">
                  <div className="flex items-start gap-3">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Total a pagar</p>
                      <p className="text-2xl font-bold text-primary">
                        {horasParaPago.length ? formatearCOP.format(totalResumenReserva) : 'Selecciona horario'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {horasParaPago.length
                          ? esFamiliaGemellista
                            ? `${horasParaPago.length} ${horasParaPago.length === 1 ? 'hora' : 'horas'} con tarifa especial Familia Gemellista.`
                            : `${horasParaPago.length} ${horasParaPago.length === 1 ? 'hora' : 'horas'} calculadas automáticamente según la tarifa vigente.`
                          : 'Calcularemos el total cuando confirmes tu horario.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-col items-center gap-3 rounded-lg bg-white p-4 shadow">
                  <img
                    src={NEQUI_QR_IMAGE_URL}
                    alt="Código QR para pagar tu reserva con Nequi"
                    className="h-48 w-48 rounded-lg border border-gray-200 object-contain"
                  />
                  <p className="text-center text-sm text-gray-700">
                    Escanea el código o usa el número <span className="font-semibold">{NEQUI_PAYMENT_NUMBER}</span> para
                    completar tu pago por Nequi.
                  </p>
                  <a
                    href={NEQUI_QR_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-600"
                  >
                    Habla con nosotros
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
        <div className="mt-4 space-y-3 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 p-4 text-gray-800 shadow-sm">
              <p className="text-lg font-semibold">Horarios y tarifas vigentes – Temporada de Vacaciones</p>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">Público general</p>
                <p className="text-sm">Lunes a viernes</p>
                <p className="text-sm">8:00 a.m. a 4:00 p.m.: $100.000 COP por hora</p>
                <p className="text-sm">5:00 p.m. a 9:00 p.m.: $130.000 COP por hora</p>
                <p className="text-sm">Sábados, domingos y festivos</p>
                <p className="text-sm">Todo el día: $130.000 COP por hora</p>
              </div>
              <div className="space-y-2 border-t border-gray-200 pt-3">
                <p className="text-sm font-semibold text-primary">Tarifa especial – Familia Gemellista</p>
                <p className="text-sm">Lunes a domingo</p>
                <p className="text-sm">8:00 a.m. a 4:00 p.m.: $90.000 COP por hora</p>
                <p className="text-sm">5:00 p.m. a 9:00 p.m.: $110.000 COP por hora</p>
              </div>
            </div>
          </div>
          <Link
            to="/login"
            className="hidden md:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white text-primary font-semibold border border-primary shadow-sm hover:bg-primary hover:text-white transition"
          >
            Acceso para administración
          </Link>
        </header>
              
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow-lg p-8 order-1">
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

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-gray-800 font-semibold">¿Eres parte de la Familia Gemellista?</p>
                    <p className="text-sm text-gray-600">
                     Si lo eres, comparte tu nombre y cédula. Un administrador validará la información y, si es aprobado,
                      aplicaremos la tarifa especial.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="radio"
                        name="familia_gemellista"
                        checked={!formData.es_familia_gemellista}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            es_familia_gemellista: false,
                            nombre_gemellista: '',
                            cedula_gemellista: ''
                          }))
                        }
                        className="h-4 w-4 text-primary"
                      />
                      No
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="radio"
                        name="familia_gemellista"
                        checked={formData.es_familia_gemellista}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            es_familia_gemellista: true
                          }))
                        }
                        className="h-4 w-4 text-primary"
                      />
                      Sí, soy Familia Gemellista
                    </label>
                  </div>
                </div>

                {formData.es_familia_gemellista && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Nombre registrado</label>
                      <input
                        type="text"
                        required={formData.es_familia_gemellista}
                        value={formData.nombre_gemellista}
                        onChange={(e) => setFormData({ ...formData, nombre_gemellista: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Nombre completo del familiar"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Cédula</label>
                      <input
                        type="text"
                        required={formData.es_familia_gemellista}
                        value={formData.cedula_gemellista}
                        onChange={(e) => setFormData({ ...formData, cedula_gemellista: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Número de documento"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                )}
              </div>
             <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2 flex items-center justify-between">
                    <span>Hora de inicio</span>
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
                  {horasValidasParaDuracion.map((hora) => (
                      <option key={hora} value={hora}>
                        {hora}
                      </option>
                    ))}
                  </select>
                  {horasValidasParaDuracion.length === 0 && !consultando && (
                    <p className="text-sm text-red-600 mt-2">No hay bloques consecutivos disponibles para esta duración.</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Duración</label>
                  <select
                    value={formData.duracion}
                    onChange={(e) => {
                      const nuevaDuracion = Math.min(parseInt(e.target.value, 10) || 1, DURACION_MAXIMA);
                      const horasValidasNuevaDuracion = (horarioDelDia.horas || []).filter((horaSlot) => {
                        const rango = obtenerHorasSeleccionadas(horaSlot, nuevaDuracion, horarioDelDia.horas);
                        return rango.length === nuevaDuracion && rango.every((hora) => horasDisponibles.includes(hora));
                      });
                      const horaSugerida = obtenerHoraInicialDisponible(
                        nuevaDuracion,
                        horarioDelDia.horas,
                        horasDisponibles
                      );

                      setFormData((prev) => ({
                        ...prev,
                        duracion: nuevaDuracion,
                        hora: prev.hora && horasValidasNuevaDuracion.includes(prev.hora) ? prev.hora : horaSugerida
                      }));
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={consultando || horasDisponibles.length === 0}
                  >
                    {Array.from({ length: DURACION_MAXIMA }, (_, idx) => idx + 1).map((duracion) => (
                      <option key={duracion} value={duracion}>
                        {duracion} hora{duracion > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">Selecciona hasta {DURACION_MAXIMA} horas consecutivas.</p>
                </div>
              </div>

            <button
                type="submit"
                disabled={
                  enviando ||
                  consultando ||
                  horasDisponibles.length === 0 ||
                  horasValidasParaDuracion.length === 0
                }
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-gray-400"
              >
                {enviando ? 'Reservando...' : 'Reservar' }
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 order-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Disponibilidad</p>
                <h3 className="text-xl font-semibold text-gray-800">
                  {format(parseFechaLocal(formData.fecha), "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                {esDiaFestivoSeleccionado && (
                  <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                    Festivo en Colombia
                  </span>
                )}
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                Abierto {horarioDelDia.horaApertura} - {horarioDelDia.horaCierre}
              </span>
            </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(horarioDelDia.horas || []).map((horaSlot) => {
                  const estaReservada = horasOcupadas.includes(horaSlot);
                  const disponible = horasDisponibles.includes(horaSlot) && !estaReservada;
                  const rangoParaHora = obtenerHorasSeleccionadas(
                    horaSlot,
                    formData.duracion,
                    horarioDelDia.horas
                  );
                  const bloqueDisponible =
                    rangoParaHora.length === formData.duracion &&
                    rangoParaHora.every((hora) => horasDisponibles.includes(hora));
                  const estaSeleccionada = horasSeleccionadas.includes(horaSlot);

                  let estadoClase = 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed';
                  if (estaReservada) {
                    estadoClase = 'border-rose-200 bg-rose-50 text-rose-700 cursor-not-allowed';
                  } else if (disponible && estaSeleccionada) {
                    estadoClase = 'border-primary bg-green-50 text-primary';
                  } else if (disponible && bloqueDisponible) {
                    estadoClase = 'border-gray-200 hover:border-primary hover:bg-green-50';
                  }

                  return (
                    <button
                      key={horaSlot}
                      type="button"
                      onClick={() => {
                        if (!disponible) return;

                        if (!bloqueDisponible) {
                          setMensaje({
                            tipo: 'error',
                            texto: 'Elige una hora inicial que tenga suficiente disponibilidad para tu duración.'
                          });
                          return;
                        }

                        setFormData({ ...formData, hora: horaSlot });
                      }}
                      disabled={!disponible || !bloqueDisponible}
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
                <div
                  key={dia.fechaValor}
                  className={`rounded-xl border shadow-sm p-4 ${
                    esFestivoColombia(dia.fechaValor) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs uppercase text-gray-500">{dia.fechaValor}</p>
                      <p className="text-lg font-semibold text-gray-800">{dia.etiqueta}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {esFestivoColombia(dia.fechaValor) && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                          Festivo
                        </span>
                      )}
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
            <div className="mt-10 md:hidden">
          <Link
            to="/login"
            className="block w-full text-center px-4 py-3 rounded-lg bg-white text-primary font-semibold border border-primary shadow-sm hover:bg-primary hover:text-white transition"
          >
            Acceso para administración
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
