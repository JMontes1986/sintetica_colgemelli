# 🚀 Despliegue Completo en Netlify

## Opción 1: Backend en Netlify Functions (Recomendado)

Netlify permite ejecutar backend con **Netlify Functions** (serverless).

### Estructura del Proyecto para Netlify

```
cancha-reservas/
├── frontend/               # React App
│   ├── public/
│   └── src/
├── netlify/
│   └── functions/         # Backend como funciones serverless
│       ├── api.js        # Todas las rutas del backend
│       └── package.json
├── netlify.toml          # Configuración de Netlify
└── package.json          # Root package.json
```

### Paso 1: Configurar Netlify Functions

Crea este archivo en la raíz del proyecto:

**netlify.toml**
```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "build"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Paso 2: Convertir Backend a Netlify Function

**netlify/functions/api.js**
```javascript
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Configuración
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());

// Middleware de autenticación
const verificarToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });
    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    next();
  };
};

// RUTAS DE AUTENTICACIÓN
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { userId: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.get('/auth/verificar', verificarToken, (req, res) => {
  res.json({
    usuario: {
      id: req.usuario.id,
      email: req.usuario.email,
      nombre: req.usuario.nombre,
      rol: req.usuario.rol
    }
  });
});

// RUTAS DE RESERVAS
app.post('/reservas/crear', async (req, res) => {
  try {
    const { nombre_cliente, email_cliente, celular_cliente, fecha, hora } = req.body;

    if (!nombre_cliente || !email_cliente || !celular_cliente || !fecha || !hora) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const { data: existente } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', fecha)
      .eq('hora', hora)
      .single();

    if (existente) {
      return res.status(400).json({ error: 'Ya existe una reserva para esa fecha y hora' });
    }

    const { data, error } = await supabase
      .from('reservas')
      .insert([{ nombre_cliente, email_cliente, celular_cliente, fecha, hora, estado: 'Pendiente' }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Reserva creada exitosamente', reserva: data });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

app.get('/reservas', verificarToken, async (req, res) => {
  try {
    const { fecha, estado } = req.query;
    let query = supabase
      .from('reservas')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (fecha) query = query.eq('fecha', fecha);
    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ reservas: data });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

app.get('/reservas/:id', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json({ reserva: data });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la reserva' });
  }
});

app.patch('/reservas/:id/estado', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado || !['Pendiente', 'Jugado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const { data, error } = await supabase
      .from('reservas')
      .update({ estado })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Estado actualizado exitosamente', reserva: data });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
});

app.post('/reservas/manual', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
    const { nombre_cliente, email_cliente, celular_cliente, fecha, hora } = req.body;

    if (!nombre_cliente || !email_cliente || !celular_cliente || !fecha || !hora) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const { data: existente } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', fecha)
      .eq('hora', hora)
      .single();

    if (existente) {
      return res.status(400).json({ error: 'Ya existe una reserva para esa fecha y hora' });
    }

    const { data, error } = await supabase
      .from('reservas')
      .insert([{
        nombre_cliente,
        email_cliente,
        celular_cliente,
        fecha,
        hora,
        estado: 'Pendiente',
        creado_por: req.usuario.id
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Reserva creada exitosamente', reserva: data });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

app.delete('/reservas/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la reserva' });
  }
});

app.get('/reservas/disponibilidad/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    const horariosDisponibles = [];
    for (let i = 8; i <= 21; i++) {
      horariosDisponibles.push(`${i.toString().padStart(2, '0')}:00`);
    }

    const { data: reservasExistentes, error } = await supabase
      .from('reservas')
      .select('hora')
      .eq('fecha', fecha);

    if (error) throw error;

    const horasOcupadas = reservasExistentes.map(r => r.hora);
    const horasDisponibles = horariosDisponibles.filter(h => !horasOcupadas.includes(h));

    res.json({ fecha, horasDisponibles, horasOcupadas });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
});

// RUTAS DE ESTADÍSTICAS
app.get('/estadisticas/general', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { count: totalReservas } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true });

    const { count: reservasJugadas } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'Jugado');

    const { count: reservasPendientes } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'Pendiente');

    res.json({
      totalReservas: totalReservas || 0,
      reservasJugadas: reservasJugadas || 0,
      reservasPendientes: reservasPendientes || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

app.get('/estadisticas/por-dia', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('fecha, estado')
      .gte('fecha', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('fecha', { ascending: true });

    if (error) throw error;

    const reservasPorDia = {};
    data.forEach(reserva => {
      if (!reservasPorDia[reserva.fecha]) {
        reservasPorDia[reserva.fecha] = { total: 0, jugadas: 0, pendientes: 0 };
      }
      reservasPorDia[reserva.fecha].total++;
      if (reserva.estado === 'Jugado') {
        reservasPorDia[reserva.fecha].jugadas++;
      } else {
        reservasPorDia[reserva.fecha].pendientes++;
      }
    });

    const resultado = Object.keys(reservasPorDia).map(fecha => ({
      fecha,
      ...reservasPorDia[fecha]
    }));

    res.json({ reservasPorDia: resultado });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.get('/estadisticas/por-mes', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('fecha, estado')
      .gte('fecha', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('fecha', { ascending: true });

    if (error) throw error;

    const reservasPorMes = {};
    data.forEach(reserva => {
      const mes = reserva.fecha.substring(0, 7);
      if (!reservasPorMes[mes]) {
        reservasPorMes[mes] = { total: 0, jugadas: 0, pendientes: 0 };
      }
      reservasPorMes[mes].total++;
      if (reserva.estado === 'Jugado') {
        reservasPorMes[mes].jugadas++;
      } else {
        reservasPorMes[mes].pendientes++;
      }
    });

    const resultado = Object.keys(reservasPorMes).map(mes => ({
      mes,
      ...reservasPorMes[mes]
    }));

    res.json({ reservasPorMes: resultado });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.get('/estadisticas/hoy', verificarToken, verificarRol('cancha', 'admin'), async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', hoy)
      .order('hora', { ascending: true });

    if (error) throw error;

    const jugadas = data.filter(r => r.estado === 'Jugado').length;
    const pendientes = data.filter(r => r.estado === 'Pendiente').length;

    res.json({
      fecha: hoy,
      total: data.length,
      jugadas,
      pendientes,
      reservas: data
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Sistema de Reservas - Cancha Sintética',
    version: '1.0.0'
  });
});

module.exports.handler = serverless(app);
```

**netlify/functions/package.json**
```json
{
  "name": "cancha-backend-functions",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "serverless-http": "^3.2.0",
    "cors": "^2.8.5",
    "@supabase/supabase-js": "^2.38.4",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  }
}
```

### Paso 3: Actualizar Frontend

**frontend/.env.production**
```env
REACT_APP_API_URL=/.netlify/functions/api
```

**frontend/src/services/api.js** (actualizar)
```javascript
import axios from 'axios';

// En producción usa /.netlify/functions/api, en desarrollo http://localhost:5000/api
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ... resto del código igual
```

### Paso 4: Desplegar en Netlify

#### Opción A: Desde la interfaz web

1. Sube tu código a GitHub
2. Ve a [Netlify](https://netlify.com)
3. "New site from Git"
4. Conecta tu repositorio
5. Configuración automática (detecta netlify.toml)
6. **Environment variables** → Agregar:
   ```
   SUPABASE_URL=tu_url_supabase
   SUPABASE_ANON_KEY=tu_anon_key
   JWT_SECRET=tu_secreto_jwt
   ```
7. Deploy

#### Opción B: Desde CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Inicializar
netlify init

# Configurar variables de entorno
netlify env:set SUPABASE_URL "tu_url"
netlify env:set SUPABASE_ANON_KEY "tu_key"
netlify env:set JWT_SECRET "tu_secreto"

# Desplegar
netlify deploy --prod
```

### Paso 5: Verificar

1. Tu sitio estará en: `https://tu-sitio.netlify.app`
2. Probar endpoints:
   - `https://tu-sitio.netlify.app/` → Frontend
   - `https://tu-sitio.netlify.app/api/` → Backend

---

## Opción 2: Backend en Railway + Frontend en Netlify

Si prefieres separar backend y frontend:

### Backend en Railway
```bash
# Crear cuenta en railway.app
railway login
railway init
railway up

# Configurar variables
railway variables set SUPABASE_URL=tu_url
railway variables set SUPABASE_ANON_KEY=tu_key
railway variables set JWT_SECRET=tu_secreto
```

### Frontend en Netlify
```bash
cd frontend
netlify init
netlify env:set REACT_APP_API_URL "https://tu-backend.railway.app/api"
netlify deploy --prod
```

---

## Comandos Útiles Netlify

```bash
# Ver logs
netlify logs

# Abrir dashboard
netlify open

# Probar funciones localmente
netlify dev

# Ver variables de entorno
netlify env:list

# Crear nuevo despliegue
netlify deploy --prod
```

## Troubleshooting

### Error: Function timeout
Las Netlify Functions tienen límite de 10 segundos. Si necesitas más tiempo, usa Railway para el backend.

### Error: Cannot find module
```bash
cd netlify/functions
npm install
```

### Error CORS
Verificar que el frontend usa la URL correcta: `/.netlify/functions/api`

### Variables de entorno no funcionan
- Verificar en Dashboard → Site settings → Environment variables
- Redesplegar después de agregar variables

## Dominio Personalizado

1. Netlify Dashboard → Domain settings
2. Add custom domain
3. Configurar DNS según instrucciones
4. SSL automático incluido

## Costo

✅ **100% Gratis** con Netlify (límites generosos para proyectos pequeños)
- 100GB bandwidth/mes
- 300 minutos build/mes
- Functions ilimitadas
