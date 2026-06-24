const xss = require('xss');

const PROHIBITED_KEYS = ['__proto__', 'constructor', 'prototype'];
const RAW_STRING_KEYS = ['password', 'password_hash', 'contrasena', 'contraseña'];

const shouldDropKey = (key) => {
  const normalized = key?.toString() || '';

  return (
    PROHIBITED_KEYS.includes(normalized) ||
    normalized.startsWith('$') ||
    normalized.includes('.')
  );
};

const shouldKeepRawString = (key) => RAW_STRING_KEYS.includes(key?.toString().toLowerCase());

const sanitizeValue = (value, key) => {
  if (shouldKeepRawString(key) && typeof value === 'string') {
    return value;
  }

  if (typeof value === 'string') {
    return xss(value, { whiteList: [], stripIgnoreTag: true, stripIgnoreTagBody: ['script'] });
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      if (shouldDropKey(key)) {
        return acc;
      }
      
      acc[key] = sanitizeValue(val, key);
      return acc;
    }, {});
  }

  return value;
};

const sanitizeRequest = (req, _res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

module.exports = sanitizeRequest;
