require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('./middleware/logger');

// Importar rutas
const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const estadisticasRoutes = require('./routes/estadisticas');
const healthRoutes = require('./routes/health');
const configuracionRoutes = require('./routes/configuracion');

const app = express();

// Configurar cabeceras de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Demasiados intentos de login. Intenta en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false
});

const reservasLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: 'Demasiadas reservas. Intenta más tarde.'
});

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
app.use(logger);
app.use('/api/auth/login', loginLimiter);
app.use('/api/reservas/crear', reservasLimiter);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/configuracion', configuracionRoutes);

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
