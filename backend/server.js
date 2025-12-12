const app = require('./app');
const { ensureDefaultAdmin } = require('./utils/ensureAdminUser');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await ensureDefaultAdmin();

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer();
