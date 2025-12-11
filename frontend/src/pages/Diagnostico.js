import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { healthAPI, API_URL } from '../services/api';

const formatKeyType = (keyType) => {
  switch (keyType) {
    case 'service_role':
      return 'Service role (recomendada para el backend)';
    case 'anon':
      return 'Anon/public';
    default:
      return 'No configurada';
  }
};

const Diagnostico = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState({ cargando: true });

  const supabaseMensaje = useMemo(() => {
    const supabaseData = estado.data?.supabase || estado.supabase;
    if (!supabaseData) return 'Sin información de Supabase aún.';

    const partes = [];
    partes.push(
      supabaseData.supabaseUrlPresent
        ? 'SUPABASE_URL configurada'
        : 'SUPABASE_URL no encontrada'
    );
    partes.push(
      supabaseData.supabaseKeyPresent
        ? `Llave: ${formatKeyType(supabaseData.keyType)}`
        : 'Llave de Supabase ausente'
    );

    return partes.join(' · ');
  }, [estado.data, estado.supabase]);

  useEffect(() => {
    const cargarDiagnostico = async () => {
      try {
        const { data } = await healthAPI.supabase();
        setEstado({ cargando: false, data });
      } catch (error) {
        setEstado({
          cargando: false,
          error: error.response?.data?.mensaje || 'No se pudo completar la prueba',
          detalle: error.response?.data?.detalle,
          supabase: error.response?.data?.supabase
        });
      }
    };

    cargarDiagnostico();
  }, []);

  const tarjetaEstado = estado.data || estado;
  const statusOk = tarjetaEstado?.data?.estado === 'ok' || tarjetaEstado?.estado === 'ok';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Ruta de diagnóstico</p>
              <h1 className="text-2xl font-bold text-gray-900">Conexión con Supabase</h1>
              <p className="text-gray-600 mt-1">Verifica que el backend puede consultar Supabase para el inicio de sesión.</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              ← Volver
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="text-sm text-gray-500">API base utilizada</p>
              <p className="text-lg font-semibold text-gray-800 break-all">{API_URL}</p>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="text-sm text-gray-500">Estado de Supabase</p>
              <p className="text-lg font-semibold text-gray-800">{supabaseMensaje}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`h-3 w-3 rounded-full ${
                estado.cargando
                  ? 'bg-yellow-400'
                  : statusOk
                    ? 'bg-green-500'
                    : 'bg-red-500'
              }`}
            />
            <h2 className="text-lg font-semibold text-gray-900">Resultado de la prueba</h2>
          </div>

          {estado.cargando ? (
            <p className="text-gray-600">Comprobando conexión con Supabase...</p>
          ) : estado.data ? (
            <div className="space-y-2">
              <p className="text-gray-800 font-semibold">{estado.data.mensaje}</p>
              {estado.data.detalle && <p className="text-gray-600 text-sm">{estado.data.detalle}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-red-600 font-semibold">{estado.error}</p>
              {estado.detalle && <p className="text-gray-600 text-sm">{estado.detalle}</p>}
            </div>
          )}

          {estado.data?.supabase || estado.supabase ? (
            <div className="mt-4 p-4 rounded-lg bg-gray-50 border">
              <p className="text-sm font-semibold text-gray-700 mb-2">Detalle técnico</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>
                  <span className="font-medium">SUPABASE_URL:</span>{' '}
                  {estado.data?.supabase?.supabaseUrl || estado.supabase?.supabaseUrl || 'No detectada'}
                </li>
                <li>
                  <span className="font-medium">Llave presente:</span>{' '}
                  {estado.data?.supabase?.supabaseKeyPresent ?? estado.supabase?.supabaseKeyPresent ? 'Sí' : 'No'}
                </li>
                <li>
                  <span className="font-medium">Tipo de llave:</span>{' '}
                  {formatKeyType(
                    estado.data?.supabase?.keyType || estado.supabase?.keyType || 'missing'
                  )}
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Diagnostico;
