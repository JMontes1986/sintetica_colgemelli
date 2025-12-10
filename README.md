# 🏟️ Sistema de Reservas - Cancha Sintética

Sistema completo para gestionar reservas de cancha sintética con diferentes roles de usuario.

## 📋 Características

### Público (Sin registro)
- Ver disponibilidad de horarios
- Crear reservas con datos personales
- Sistema de calendario interactivo

### Operador Cancha
- Ver todas las reservas
- Cambiar estado de reservas a "Jugado"
- Crear reservas manualmente
- Filtrar por estado (Pendiente/Jugado)

### Administrador
- Dashboard con estadísticas completas
- Gráficos de reservas por día y mes
- Gestión completa de reservas
- Eliminar reservas
- Crear reservas manualmente

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de datos**: Supabase (PostgreSQL)
- **Frontend**: React + TailwindCSS
- **Gráficos**: Recharts
- **Autenticación**: JWT

## 📦 Instalación

### 1. Configurar Supabase

1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear nuevo proyecto
3. En SQL Editor, ejecutar el script completo de `supabase_schema.sql`
4. Obtener:
   - URL del proyecto (Settings → API → Project URL)
   - Anon Key (Settings → API → anon/public)

### 2. Backend

```bash
cd backend
npm install
```

Crear archivo `.env` (usa la clave de servicio para que el backend pueda
consultar la disponibilidad y las reservas sin restricciones de RLS):
```env
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_de_supabase
# Opcional: clave pública en caso de no contar con la de servicio
# SUPABASE_ANON_KEY=tu_anon_key_de_supabase
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
PORT=5000
JWT_SECRET=tu_secreto_jwt_seguro_aqui
FRONTEND_URL=http://localhost:3000
```

Iniciar servidor:
```bash
npm start
# o en desarrollo:
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
```

Crear archivo `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Iniciar aplicación:
```bash
npm start
```

## 👥 Usuarios de Prueba

Por defecto, el sistema incluye estos usuarios:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@cancha.com | admin123 | Administrador |
| cancha@cancha.com | admin123 | Operador Cancha |

## 📁 Estructura del Proyecto

```
cancha-reservas/
├── backend/
│   ├── config/
│   │   └── supabase.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── reservas.js
│   │   └── estadisticas.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── DashboardCancha.js
│   │   │   └── DashboardAdmin.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── .env
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── supabase_schema.sql
```

## 🚀 Endpoints API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/verificar` - Verificar token
- `POST /api/auth/registro` - Registrar usuario

### Reservas
- `POST /api/reservas/crear` - Crear reserva (público)
- `GET /api/reservas` - Obtener todas las reservas (autenticado)
- `GET /api/reservas/:id` - Obtener reserva por ID
- `PATCH /api/reservas/:id/estado` - Actualizar estado
- `POST /api/reservas/manual` - Crear reserva manual (cancha/admin)
- `DELETE /api/reservas/:id` - Eliminar reserva (admin)
- `GET /api/reservas/disponibilidad/:fecha` - Ver disponibilidad

### Estadísticas
- `GET /api/estadisticas/general` - Estadísticas generales (admin)
- `GET /api/estadisticas/por-dia` - Reservas por día (admin)
- `GET /api/estadisticas/por-mes` - Reservas por mes (admin)
- `GET /api/estadisticas/hoy` - Resumen del día (cancha/admin)

## 🔒 Seguridad

- JWT para autenticación
- Row Level Security (RLS) en Supabase
- Bcrypt para hash de contraseñas
- CORS configurado
- Validación de datos en backend

## 📱 Rutas Frontend

- `/` - Página pública de reservas
- `/login` - Iniciar sesión
- `/cancha` - Dashboard operador cancha
- `/admin` - Dashboard administrador

## ⚙️ Configuración Adicional

### Horarios Disponibles
Por defecto de 8:00 a 22:00. Modificar en:
```javascript
// backend/routes/reservas.js - línea ~150
for (let i = 8; i <= 21; i++) {
  horariosDisponibles.push(`${i.toString().padStart(2, '0')}:00`);
}
```

### Colores del Sistema
Modificar en `frontend/tailwind.config.js`:
```javascript
colors: {
  primary: '#10b981', // Verde
  secondary: '#3b82f6', // Azul
}
```

## 🐛 Solución de Problemas

### Error de conexión a Supabase
- Verificar URL y Key en `.env`
- Confirmar que el proyecto Supabase está activo
- Revisar que se ejecutó el script SQL completo
- Consultar `GET /api/health/supabase` para validar conectividad desde el backend


### Error CORS
- Verificar FRONTEND_URL en backend `.env`
- Confirmar puertos correctos (5000 backend, 3000 frontend)

### Error de autenticación
- Limpiar localStorage del navegador
- Verificar JWT_SECRET en backend `.env`
- Revisar que los usuarios existen en la base de datos

## 📝 Notas de Desarrollo

- Las contraseñas se hashean automáticamente
- Los tokens JWT expiran en 24 horas
- Las reservas se ordenan por fecha y hora
- El sistema permite reservas hasta 30 días adelante

## 🔄 Próximas Mejoras Sugeridas

- Notificaciones por email
- Sistema de pago integrado
- Recordatorios automáticos
- Cancelación de reservas por el cliente
- Múltiples canchas
- Historial de clientes

## 📄 Licencia

MIT

## 👨‍💻 Soporte

Para problemas o preguntas:
1. Revisar la documentación
2. Verificar configuración de Supabase
3. Comprobar logs del servidor (backend)
4. Revisar consola del navegador (frontend)
