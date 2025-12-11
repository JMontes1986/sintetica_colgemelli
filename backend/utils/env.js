const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    const error = new Error(
      'JWT_SECRET no está configurada. Define JWT_SECRET en tu archivo .env o variables de entorno del despliegue.'
    );
    error.code = 'JWT_SECRET_MISSING';
    throw error;
  }

  return process.env.JWT_SECRET;
};

module.exports = { getJwtSecret };
