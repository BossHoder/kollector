function parseAllowedOrigins(value, fallback = '*') {
  const rawValue = String(value || fallback || '').trim();

  if (!rawValue) {
    return '*';
  }

  if (rawValue === '*') {
    return '*';
  }

  const origins = rawValue
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return '*';
  }

  return origins.length === 1 ? origins[0] : origins;
}

module.exports = {
  parseAllowedOrigins
};
