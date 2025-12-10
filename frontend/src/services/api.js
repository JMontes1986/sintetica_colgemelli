import axios from 'axios';

// Fallback para despliegues sin REACT_APP_API_URL configurada
// - Producción: intenta usar funciones de Netlify
// - Desarrollo: usa el backend local
export const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? '/.netlify/functions/api'
    : 'http://localhost:5000/api');

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
  crearManual: (datos) => api.post('/reservas/manual', datos),
  eliminar: (id) => api.delete(`/reservas/${id}`),
  obtenerDisponibilidad: (fecha) => api.get(`/reservas/disponibilidad/${fecha}`)
};

// API de Estadísticas
export const estadisticasAPI = {
  obtenerGeneral: () => api.get('/estadisticas/general'),
  obtenerPorDia: () => api.get('/estadisticas/por-dia'),
  obtenerPorMes: () => api.get('/estadisticas/por-mes'),
  obtenerHoy: () => api.get('/estadisticas/hoy')
};

// API de Autenticación
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  verificar: () => api.get('/auth/verificar'),
  registro: (datos) => api.post('/auth/registro', datos)
};

export default api;
