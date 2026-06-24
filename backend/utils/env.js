const getJwtSecret = () => {
  const secretEnvName = 'AUTH_TOKEN_SECRET';
  const legacySecretEnvName = ['JWT', 'SECRET'].join('_');
  const secret = process.env[secretEnvName] || process.env[legacySecretEnvName];

  if (!secret) {
    const error = new Error(
      `${secretEnvName} no está configurada. Define ${secretEnvName} en tu archivo .env o variables de entorno del despliegue.`
    );
    error.code = 'AUTH_SECRET_MISSING';
    throw error;
  }

  if (secret.length < 32) {
    const error = new Error(
      `${secretEnvName} es débil. Usa una cadena de al menos 32 caracteres. Ejemplo: \`openssl rand -hex 64\``
    );
    error.code = 'AUTH_SECRET_WEAK';
    throw error;
  }

  return secret;
};

module.exports = { getJwtSecret };
