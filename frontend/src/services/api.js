import axios from 'axios';

// Fallback para despliegues sin REACT_APP_API_URL configurada
// - Producción y entornos con proxy (Netlify): usa /api para aprovechar los redirects
// - Desarrollo local clásico: usa el backend en localhost:5000
const isNetlifyDev =
  typeof window !== 'undefined' && (window.location.port === '8888' || window.location.hostname.includes('netlify'));

// Nos aseguramos de que la URL base siempre incluya el prefijo /api (o el path completo de Netlify)
const normalizeApiUrl = (url) => {
  if (!url) return '';

  const trimmed = url.replace(/\/$/, '');
  const includesNetlifyFunctions = trimmed.includes('/.netlify/functions');

  if (trimmed.endsWith('/api') || includesNetlifyFunctions) {
    return trimmed;
  }

  return `${trimmed}/api`;
};

const envApiUrl = normalizeApiUrl(process.env.REACT_APP_API_URL);

export const API_URL =
  envApiUrl ||
  normalizeApiUrl(
    process.env.NODE_ENV === 'development' && !isNetlifyDev
      ? 'http://localhost:5000/api'
      : '/api'
  );

// Configuración de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Asegurar que las rutas siempre incluyan el prefijo /api cuando no exista baseURL
    const isAbsoluteUrl = /^https?:\/\//i.test(config.url || '');
    const hasApiBase = (config.baseURL || '').includes('/api');
    const needsApiPrefix =
      !isAbsoluteUrl &&
      !hasApiBase &&
      config.url &&
      !config.url.startsWith('/api');

    if (needsApiPrefix) {
      const normalizedPath = config.url.startsWith('/') ? config.url : `/${config.url}`;
      config.url = `/api${normalizedPath}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API de Reservas
export const reservasAPI = {
  crear: (datos) => api.post('/reservas/crear', datos),
  obtenerTodas: (params) => api.get('/reservas', { params }),
  obtenerPorId: (id) => api.get(`/reservas/${id}`),
  actualizarEstado: (id, estado) => api.patch(`/reservas/${id}/estado`, { estado }),
  actualizarGemellista: (id, estado) => api.patch(`/reservas/${id}/gemellista`, { estado }),
  registrarPago: (id, payload) => api.patch(`/reservas/${id}/pago`, payload),
  crearManual: (datos) => api.post('/reservas/manual', datos),
  eliminar: (id) => api.delete(`/reservas/${id}`),
  obtenerDisponibilidad: (fecha) => api.get(`/reservas/disponibilidad/${fecha}`)
};

// API de Estadísticas
export const estadisticasAPI = {
  obtenerGeneral: () => api.get('/estadisticas/general'),
  obtenerPorDia: () => api.get('/estadisticas/por-dia'),
  obtenerPorMes: () => api.get('/estadisticas/por-mes'),
  obtenerHoy: () => api.get('/estadisticas/hoy'),
  obtenerRecaudado: (params) => api.get('/estadisticas/recaudado', { params })
};

// API de Configuración
export const configuracionAPI = {
  obtenerHorarios: () => api.get('/configuracion/horarios'),
  crearHorario: (payload) => api.post('/configuracion/horarios', payload),
  eliminarHorario: (id) => api.delete(`/configuracion/horarios/${id}`)
};

// API de Autenticación
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  verificar: () => api.get('/auth/verificar'),
  registro: (datos) => api.post('/auth/registro', datos),
  registroSupabase: (email, password) => api.post('/auth/supabase-signup', { email, password })
};

// API de salud
export const healthAPI = {
  supabase: () => api.get('/health/supabase')
};

export default api;
