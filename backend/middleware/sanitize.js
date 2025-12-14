const xss = require('xss');

const PROHIBITED_KEYS = ['__proto__', 'constructor', 'prototype'];

const shouldDropKey = (key) => {
  const normalized = key?.toString() || '';

  return (
    PROHIBITED_KEYS.includes(normalized) ||
    normalized.startsWith('$') ||
    normalized.includes('.')
  );
};

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return xss(value, { whiteList: [], stripIgnoreTag: true, stripIgnoreTagBody: ['script'] });
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      if (shouldDropKey(key)) {
        return acc;
      }
      
      acc[key] = sanitizeValue(val);
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
