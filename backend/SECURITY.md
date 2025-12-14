# Controles de inyección SQL/NoSQL

Se revisaron las rutas del backend (`routes/`) y no se encontraron consultas construidas por concatenación de strings ni llamadas `rpc` con SQL crudo. Todas las operaciones con Supabase se realizan mediante el query builder (`from`, `select`, `eq`, `gte`, `lte`, `insert`, `update`, etc.), lo que aplica sanitización automática de los parámetros.

## Buenas prácticas reforzadas
- Mantener el uso de los métodos encadenados del cliente Supabase para filtrar valores provenientes del usuario (por ejemplo: `.eq('fecha', fecha)`, `.in('hora', horasOrdenadas)`).
- Evitar construir strings de filtros manualmente en métodos como `.or()` o `rpc` y preferir pasar los valores como parámetros independientes.
- Validar y sanear entradas antes de llegar a la capa de datos (por ejemplo, las rutas existentes usan validaciones de formato y `sanitizeRequest`).

## Qué verificar en cambios futuros
- Si se incorpora SQL crudo o funciones RPC personalizadas, pasar los parámetros como argumentos y nunca interpolar valores directamente en la cláusula SQL.
- Añadir validaciones de formato cuando se introduzcan nuevos filtros o parámetros en las rutas.
