import React from 'react';
import { Link } from 'react-router-dom';

const MAPS_URL = 'https://maps.app.goo.gl/zy5UyJU9hKmyeLbG6';
const HERO_IMAGE = '/assets/como-llegar-hero.png';

const pasosLlegada = [
  {
    titulo: 'Abre la ruta exacta',
    texto: 'El enlace te lleva directo al punto de la cancha para que no pierdas tiempo buscando referencias.'
  },
  {
    titulo: 'Sal con margen',
    texto: 'Llegar 10 minutos antes ayuda a cambiarte, reunir el equipo y empezar el partido sin correr.'
  },
  {
    titulo: 'Confirma tu horario',
    texto: 'Si vas a jugar, reserva primero y llega con tu bloque separado para disfrutar la cancha completa.'
  }
];

const motivos = [
  'Entrada fácil de identificar al llegar',
  'Cancha iluminada para partidos de tarde y noche',
  'Ideal para partidos entre amigos, entrenamientos y torneos cortos',
  'Ruta lista para compartir con todo el equipo'
];

const ComoLlegar = () => {
  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center justify-between rounded-full border border-white/70 bg-white/80 px-5 py-3 shadow-sm backdrop-blur-xl">
          <Link to="/" className="text-sm font-semibold tracking-tight text-gray-900">
            Sintética Colgemelli
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/#reservar"
              className="hidden rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 sm:inline-flex"
            >
              Reservar
            </Link>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
            >
              Abrir Maps
            </a>
          </div>
        </nav>
      </div>

      <section className="relative mx-auto min-h-[78vh] max-w-7xl overflow-hidden bg-gray-950 sm:rounded-[2rem]">
        <img
          src={HERO_IMAGE}
          alt="Entrada iluminada a una cancha sintética"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="relative flex min-h-[78vh] max-w-3xl flex-col justify-center px-6 py-16 text-white sm:px-10 lg:px-14">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Cómo llegar</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Ven directo a jugar, sin perderte.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Usa la ubicación exacta de Google Maps y comparte la ruta con tu equipo. La cancha te espera con el espacio
            listo para jugar fútbol 7, fútbol 9 o un partido completo entre amigos.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-600"
            >
              Iniciar ruta en Google Maps
            </a>
            <Link
              to="/#reservar"
              className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/12 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Reservar antes de salir
            </Link>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {['Ruta exacta', 'Fácil acceso', 'Cancha iluminada', 'Lista para jugar'].map((item) => (
              <span key={item} className="rounded-lg border border-white/20 bg-white/12 px-3 py-2 text-center font-semibold backdrop-blur">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Punto de encuentro</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
              La forma más rápida de llegar es abrir la ruta oficial.
            </h2>
            <p className="mt-4 text-gray-600">
              Guarda este enlace, compártelo en el grupo del partido y llega con el equipo completo al mismo punto.
            </p>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-black sm:w-auto"
            >
              Ver ubicación exacta
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {pasosLlegada.map((paso, index) => (
              <article key={paso.titulo} className="rounded-lg bg-white p-5 shadow-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-gray-950">{paso.titulo}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{paso.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Por qué venir</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
              Una llegada simple para que el partido empiece con energía.
            </h2>
          </div>
          <div className="grid gap-3">
            {motivos.map((motivo) => (
              <div key={motivo} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                <span className="font-medium text-gray-800">{motivo}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-lg bg-gray-950 p-6 text-white shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Listo para el partido</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Separa la cancha y envía la ruta a tu equipo.</h2>
            <p className="mt-3 max-w-2xl text-white/70">
              Reservas tu horario, abres la ubicación y llegas directo al juego. Menos vueltas, más fútbol.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link
              to="/#reservar"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-emerald-600"
            >
              Reservar ahora
            </Link>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Compartir ubicación
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ComoLlegar;
