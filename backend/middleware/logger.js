const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection?.remoteAddress || 'IP no disponible';

  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip}`);

  if (req.path?.includes('/login')) {
    const email = req.body?.email || 'Email no proporcionado';
    console.log(`[LOGIN ATTEMPT] Email: ${email} - IP: ${ip}`);
  }

  next();
};

module.exports = logger;
