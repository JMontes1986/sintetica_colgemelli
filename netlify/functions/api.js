const serverless = require('serverless-http');
const app = require('../../backend/app');

// En Netlify, las rutas llegan con el prefijo "/.netlify/functions".
// Configurar basePath permite que Express reciba las rutas limpias
// (por ejemplo, "/api/reservas/crear") y coincidan con las definidas en backend/app.js.
module.exports.handler = serverless(app, {
  basePath: '/.netlify/functions'
});
