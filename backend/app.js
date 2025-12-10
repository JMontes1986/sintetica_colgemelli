require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const estadisticasRoutes = require('./routes/estadisticas');
const healthRoutes = require('./routes/health');

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middlewares
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
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
