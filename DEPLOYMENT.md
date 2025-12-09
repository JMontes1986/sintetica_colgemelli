# 🚀 Guía de Despliegue

## Despliegue en Producción

### 1. Supabase (Base de Datos)

Ya está configurado si seguiste los pasos de instalación. Supabase es cloud-native.

### 2. Backend (Node.js)

#### Opción A: Render.com (Gratis)

1. Crear cuenta en [Render](https://render.com)
2. Conectar repositorio de GitHub
3. Crear nuevo Web Service:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server.js`
   - **Environment Variables**:
     ```
     SUPABASE_URL=tu_url
     SUPABASE_ANON_KEY=tu_key
     JWT_SECRET=tu_secreto
     PORT=5000
     FRONTEND_URL=tu_url_frontend
     ```

#### Opción B: Railway.app (Gratis)

1. Crear cuenta en [Railway](https://railway.app)
2. Nuevo proyecto desde GitHub
3. Configurar variables de entorno
4. Automáticamente detecta Node.js

#### Opción C: Heroku

```bash
heroku create nombre-app-backend
heroku config:set SUPABASE_URL=tu_url
heroku config:set SUPABASE_ANON_KEY=tu_key
heroku config:set JWT_SECRET=tu_secreto
git push heroku main
```

### 3. Frontend (React)

#### Opción A: Vercel (Recomendado - Gratis)

1. Instalar Vercel CLI: `npm i -g vercel`
2. En la carpeta frontend:
   ```bash
   vercel
   ```
3. Configurar variables de entorno en Vercel Dashboard:
   ```
   REACT_APP_API_URL=https://tu-backend.render.com/api
   ```

#### Opción B: Netlify

1. Crear cuenta en [Netlify](https://netlify.com)
2. Conectar repositorio
3. Build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
4. Variables de entorno:
   ```
   REACT_APP_API_URL=https://tu-backend.render.com/api
   ```

#### Opción C: Build manual y hosting tradicional

```bash
cd frontend
npm run build
# Subir carpeta build/ a tu servidor web
```

### 4. Configuración Post-Despliegue

#### En el Backend
Actualizar `.env` con la URL del frontend en producción:
```env
FRONTEND_URL=https://tu-frontend.vercel.app
```

#### En el Frontend
Actualizar `.env` con la URL del backend en producción:
```env
REACT_APP_API_URL=https://tu-backend.render.com/api
```

#### En Supabase
Configurar URL permitidas:
1. Dashboard → Authentication → URL Configuration
2. Agregar:
   - Site URL: `https://tu-frontend.vercel.app`
   - Redirect URLs: `https://tu-frontend.vercel.app/*`

### 5. Verificación

Probar estos endpoints:
- `https://tu-backend.com/` - Debe mostrar info de la API
- `https://tu-frontend.com/` - Debe cargar la página principal
- `https://tu-frontend.com/login` - Login funcional

## Comandos Útiles

### Backend local
```bash
cd backend
npm install
npm start
```

### Frontend local
```bash
cd frontend
npm install
npm start
```

### Build frontend
```bash
cd frontend
npm run build
```

## Variables de Entorno Requeridas

### Backend
- `SUPABASE_URL` - URL de tu proyecto Supabase
- `SUPABASE_ANON_KEY` - Anon key de Supabase
- `JWT_SECRET` - Secreto para tokens JWT (genera uno seguro)
- `PORT` - Puerto del servidor (opcional, default: 5000)
- `FRONTEND_URL` - URL del frontend para CORS

### Frontend
- `REACT_APP_API_URL` - URL completa del backend con /api

## Seguridad en Producción

1. **JWT_SECRET**: Usar un secreto fuerte y único
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **CORS**: Configurar solo URLs específicas en producción

3. **HTTPS**: Usar siempre HTTPS en producción (Vercel/Render lo incluyen)

4. **Variables de entorno**: NUNCA commitear archivos `.env`

5. **Supabase RLS**: Ya está configurado, pero revisar políticas

## Monitoreo

### Logs Backend (Render)
```bash
render logs --service tu-servicio
```

### Logs Frontend (Vercel)
Ver en Dashboard → Deployments → Logs

### Base de Datos
Supabase Dashboard → Logs

## Troubleshooting Producción

### Error CORS
- Verificar FRONTEND_URL en backend
- Verificar que ambas apps usen HTTPS

### Error 500 Backend
- Revisar logs del servidor
- Verificar variables de entorno
- Comprobar conexión a Supabase

### Error de autenticación
- Verificar JWT_SECRET
- Limpiar localStorage
- Revisar logs de red en DevTools

### Frontend no se conecta al Backend
- Verificar REACT_APP_API_URL
- Probar endpoint directamente: `curl https://tu-backend.com/`
- Revisar CORS en navegador (F12 → Network)

## Actualizaciones

### Actualizar Backend
```bash
git push origin main
# Render/Railway detectan cambios automáticamente
```

### Actualizar Frontend
```bash
git push origin main
# Vercel/Netlify rebuilds automáticamente
```

## Costos Estimados

- **Supabase**: Gratis hasta 500MB DB, 2GB storage
- **Render**: Gratis con limitaciones (spin down después de inactividad)
- **Vercel**: Gratis para proyectos personales
- **Netlify**: Gratis con 100GB bandwidth/mes

**Total en tier gratuito**: $0/mes

## Backup

### Exportar Base de Datos
Supabase Dashboard → Database → Backups

### Código
Git + GitHub (ya configurado)

## Dominio Personalizado

### Vercel
1. Settings → Domains
2. Agregar dominio custom
3. Configurar DNS según instrucciones

### Render
1. Settings → Custom Domain
2. Agregar dominio
3. Configurar DNS (A o CNAME)
