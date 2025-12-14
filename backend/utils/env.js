const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    const error = new Error(
      'JWT_SECRET no está configurada. Define JWT_SECRET en tu archivo .env o variables de entorno del despliegue.'
    );
    error.code = 'JWT_SECRET_MISSING';
    throw error;
  }

  const secret = process.env.JWT_SECRET;

  if (secret.length < 32) {
    const error = new Error(
      'JWT_SECRET es débil. Usa una cadena de al menos 32 caracteres. Ejemplo: `openssl rand -hex 64`'
    );
    error.code = 'JWT_SECRET_WEAK';
    throw error;
  }

  return secret;
};

module.exports = { getJwtSecret };
