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

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin encabezado Origin (Postman, servidores internos) y orígenes válidos
    if (!origin || allowedOrigins.includes(origin)) {
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
