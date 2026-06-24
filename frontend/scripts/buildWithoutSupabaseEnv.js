#!/usr/bin/env node
/*
 * Ejecuta el build del frontend sin heredar variables SUPABASE_*.
 * Netlify expone las variables del sitio durante el build completo; aunque esas
 * variables sean necesarias para functions/backend en runtime, no deben llegar
 * a react-scripts ni al prebuild del frontend.
 */
const { spawnSync } = require('child_process');

const sanitizedEnv = { ...process.env };
const removedKeys = Object.keys(sanitizedEnv).filter(
  (key) => key.startsWith('SUPABASE_') && sanitizedEnv[key]
);

for (const key of removedKeys) {
  delete sanitizedEnv[key];
}

if (removedKeys.length) {
  console.log(
    `🔒 Build frontend: se ocultaron ${removedKeys.length} variable(s) SUPABASE_* del entorno del cliente.`
  );
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['run', 'build', '--prefix', 'frontend'], {
  env: sanitizedEnv,
  stdio: 'inherit'
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
