const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection?.remoteAddress || 'IP no disponible';

  const safeEmail = typeof req.body?.email === 'string' ? req.body.email : undefined;
  const userTag = req.usuario?.id ? ` user=${req.usuario.id}` : '';

  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip}${userTag}`);

  if (req.path?.includes('/login') && safeEmail) {
    console.log(`[LOGIN ATTEMPT] Email: ${safeEmail} - IP: ${ip}`);
  }

  next();
};

module.exports = logger;
