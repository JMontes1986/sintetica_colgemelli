# Tareas para mejoras en PageSpeed

Estas tareas se derivan de las recomendaciones típicas de PageSpeed y de la revisión del código actual. Cada una apunta a disminuir el peso de la carga inicial, mejorar el LCP/CLS y reducir el bloqueo del hilo principal.

## 1) Dividir el bundle y cargar dashboards bajo demanda
- **Problema:** Todas las páginas (incluyendo dashboards con gráficas) se importan de forma estática en `App.js`, por lo que el usuario público descarga código de administración que nunca usa.
- **Tarea:** Migrar las rutas de `DashboardCancha`, `DashboardAdmin` y `Diagnostico` a `React.lazy`/`Suspense` y mover las importaciones de Recharts a cargas diferidas dentro de cada página. Esto reduce "Reduce unused JavaScript" y el tiempo de carga inicial.
- **Referencia:** `frontend/src/App.js`.

## 2) Optimizar la imagen de pago por Nequi
- **Problema:** El QR se carga desde una URL firmada externa sin control de peso ni formato, y se renderiza siempre, afectando LCP/CLS.
- **Tarea:** Descargar y versionar una copia optimizada (WebP/AVIF <100 KB) en `public/`, añadir tamaños explícitos y `loading="lazy"`, y solo renderizar el bloque de pago cuando exista un resumen de reserva. Esto atiende "Serve images in next-gen formats" y "Defer offscreen images".
- **Referencias:** `frontend/src/pages/Home.js` (constantes `NEQUI_QR_*` y `<img>` del QR).

## 3) Habilitar compresión y cacheado en el backend
- **Problema:** El servidor Express no aplica `gzip/br` ni cabeceras de caché, por lo que las respuestas JSON viajan sin comprimir.
- **Tarea:** Añadir `compression` y cabeceras `Cache-Control` adecuadas (p.ej. 5-15 min para endpoints de disponibilidad y 1 min para estadísticas) en `backend/app.js`. Esto responde a "Enable text compression" y mejora TTFB para PageSpeed.
- **Referencia:** `backend/app.js`.

## 4) Preload y hints para la API desde el HTML base
- **Problema:** El HTML base no ofrece `preconnect`/`dns-prefetch` hacia el dominio del API, añadiendo latencia en la primera petición.
- **Tarea:** Añadir en `frontend/public/index.html` las etiquetas `<link rel="preconnect" href="https://tu-api">` y, si aplica, `dns-prefetch` para Supabase/backend público. Mejora "Reduce initial server response time" y "Preconnect to required origins".
- **Referencia:** `frontend/public/index.html`.

## 5) Reducir trabajo del hilo principal en el formulario público
- **Problema:** La página pública recalcula horarios y festivos en cada render, y monta toda la capa de resumen aun cuando no hay reserva.
- **Tarea:** Memoizar los cálculos intensivos (`obtenerFestivosColombia`, formato de tarifas) y aplazar el modal/resumen hasta después de enviar el formulario. Esto contribuye a "Minimize main-thread work".
- **Referencia:** `frontend/src/pages/Home.js`.
