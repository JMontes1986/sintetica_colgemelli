require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const estadisticasRoutes = require('./routes/estadisticas');
const healthRoutes = require('./routes/health');

const app = express();

// Permitir el dominio configurado y los dominios generados por Netlify (URL y PREVIEW)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.URL,
  process.env.DEPLOY_PRIME_URL,
  'http://localhost:3000',
  'http://localhost:8888' // netlify dev
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(','))
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Peticiones sin encabezado Origin (Postman, servidores internos)

  // Normalizar para evitar fallos por barras finales
  const normalizedOrigin = origin.replace(/\/$/, '');

  let hostname = '';
  try {
    hostname = new URL(normalizedOrigin).hostname;
  } catch (error) {
    // Si no se puede parsear, se sigue usando la cadena original para validar en la lista blanca
  }

  const isNetlifyPreview = hostname.endsWith('.netlify.app');
  const isLocalhost = hostname === 'localhost';

  return (
    allowedOrigins.includes(normalizedOrigin) ||
    allowedOrigins.includes(origin) ||
    isNetlifyPreview ||
    isLocalhost
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/health', healthRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'API Sistema de Reservas - Cancha Sintética',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      reservas: '/api/reservas',
      estadisticas: '/api/estadisticas'
    }
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

module.exports = app;
