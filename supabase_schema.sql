-- ============================================
-- SCHEMA PARA SISTEMA DE RESERVAS
-- ============================================

-- 1. Crear tabla de usuarios con roles
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('publico', 'cancha', 'admin')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de reservas
CREATE TABLE IF NOT EXISTS reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_cliente TEXT NOT NULL,
  email_cliente TEXT NOT NULL,
  celular_cliente TEXT NOT NULL,
  es_familia_gemellista BOOLEAN NOT NULL DEFAULT FALSE,
  nombre_gemellista TEXT,
  cedula_gemellista TEXT,
  estado_gemellista TEXT NOT NULL DEFAULT 'No aplica'
    CHECK (estado_gemellista IN ('No aplica', 'Pendiente', 'Aprobado', 'Rechazado')),
  tipo_cancha TEXT NOT NULL DEFAULT 'futbol_7' CHECK (tipo_cancha IN ('futbol_7', 'futbol_9')),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobado', 'Jugado')),
  metodo_pago TEXT CHECK (metodo_pago IN ('Nequi', 'Efectivo')),
  referencia_nequi TEXT,
  pago_registrado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar columnas de pago en instalaciones existentes
ALTER TABLE IF EXISTS reservas
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT CHECK (metodo_pago IN ('Nequi', 'Efectivo')),
  ADD COLUMN IF NOT EXISTS referencia_nequi TEXT,
  ADD COLUMN IF NOT EXISTS pago_registrado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS es_familia_gemellista BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nombre_gemellista TEXT,
  ADD COLUMN IF NOT EXISTS cedula_gemellista TEXT,
  ADD COLUMN IF NOT EXISTS estado_gemellista TEXT NOT NULL DEFAULT 'No aplica'
    CHECK (estado_gemellista IN ('No aplica', 'Pendiente', 'Aprobado', 'Rechazado')),
  ADD COLUMN IF NOT EXISTS tipo_cancha TEXT NOT NULL DEFAULT 'futbol_7'
    CHECK (tipo_cancha IN ('futbol_7', 'futbol_9'));

-- Normalizar valores existentes
UPDATE reservas
SET estado_gemellista = COALESCE(estado_gemellista, 'No aplica')
WHERE estado_gemellista IS NULL;

-- Corregir constraint de estado en instalaciones previas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'reservas'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'reservas_estado_check'
  ) THEN
    ALTER TABLE reservas DROP CONSTRAINT reservas_estado_check;
  END IF;

  ALTER TABLE reservas
    ADD CONSTRAINT reservas_estado_check
    CHECK (estado IN ('Pendiente', 'Aprobado', 'Jugado'));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 3. Configuración de horarios (rangos personalizados por fecha)
CREATE TABLE IF NOT EXISTS configuracion_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  hora_apertura TIME NOT NULL,
  hora_cierre TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_fecha_fin_mayor CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT chk_hora_cierre_mayor CHECK (hora_cierre > hora_apertura)
);

-- 4. Crear índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_hora ON reservas(fecha, hora);

-- 5. Crear cuentas manualmente (no se incluyen usuarios por defecto)

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_horarios ENABLE ROW LEVEL SECURITY;

-- Permisos base para que las políticas RLS puedan aplicarse con las llaves anon/authenticated.
-- La llave service_role del backend sigue omitiendo RLS y debe usarse para login, administración y paneles.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reservas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON configuracion_horarios TO anon, authenticated;

-- 7. Función auxiliar para evaluar roles sin recursión en políticas de usuarios.
CREATE OR REPLACE FUNCTION public.usuario_actual_tiene_roles(roles_permitidos TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.rol = ANY (roles_permitidos)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.usuario_actual_tiene_roles(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usuario_actual_tiene_roles(TEXT[]) TO anon, authenticated;

-- 8. Políticas de seguridad para usuarios
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON usuarios;
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON usuarios FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins pueden ver todos los usuarios" ON usuarios;
CREATE POLICY "Admins pueden ver todos los usuarios"
  ON usuarios FOR SELECT
  TO authenticated
  USING (public.usuario_actual_tiene_roles(ARRAY['admin']));

DROP POLICY IF EXISTS "Admins pueden crear usuarios" ON usuarios;
CREATE POLICY "Admins pueden crear usuarios"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (public.usuario_actual_tiene_roles(ARRAY['admin']));

DROP POLICY IF EXISTS "Admins pueden actualizar usuarios" ON usuarios;
CREATE POLICY "Admins pueden actualizar usuarios"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (public.usuario_actual_tiene_roles(ARRAY['admin']))
  WITH CHECK (public.usuario_actual_tiene_roles(ARRAY['admin']));

DROP POLICY IF EXISTS "Admins pueden eliminar usuarios" ON usuarios;
CREATE POLICY "Admins pueden eliminar usuarios"
  ON usuarios FOR DELETE
  TO authenticated
  USING (public.usuario_actual_tiene_roles(ARRAY['admin']));

-- Eliminar nombres antiguos para evitar políticas duplicadas en instalaciones previas.
DROP POLICY IF EXISTS "Solo admins pueden ver todos los usuarios" ON usuarios;

-- 9. Políticas de seguridad para reservas
DROP POLICY IF EXISTS "Publico puede consultar disponibilidad" ON reservas;
CREATE POLICY "Publico puede consultar disponibilidad"
  ON reservas FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Todos pueden crear reservas" ON reservas;
CREATE POLICY "Todos pueden crear reservas"
  ON reservas FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    estado = 'Pendiente'
    AND pago_registrado = FALSE
    AND creado_por IS NULL
  );

DROP POLICY IF EXISTS "Operadores cancha pueden crear reservas" ON reservas;
CREATE POLICY "Operadores cancha pueden crear reservas"
  ON reservas FOR INSERT
  TO authenticated
  WITH CHECK (public.usuario_actual_tiene_roles(ARRAY['cancha', 'admin']));

DROP POLICY IF EXISTS "Operadores cancha pueden ver reservas" ON reservas;
CREATE POLICY "Operadores cancha pueden ver reservas"
  ON reservas FOR SELECT
  TO authenticated
  USING (public.usuario_actual_tiene_roles(ARRAY['cancha', 'admin']));

DROP POLICY IF EXISTS "Operadores cancha pueden actualizar reservas" ON reservas;
CREATE POLICY "Operadores cancha pueden actualizar reservas"
  ON reservas FOR UPDATE
  TO authenticated
  USING (public.usuario_actual_tiene_roles(ARRAY['cancha', 'admin']))
  WITH CHECK (public.usuario_actual_tiene_roles(ARRAY['cancha', 'admin']));

DROP POLICY IF EXISTS "Solo admins pueden eliminar reservas" ON reservas;
CREATE POLICY "Solo admins pueden eliminar reservas"
  ON reservas FOR DELETE
  TO authenticated
  USING (public.usuario_actual_tiene_roles(ARRAY['admin']));

-- 10. Políticas de seguridad para configuración de horarios
DROP POLICY IF EXISTS "Publico puede ver configuracion de horarios" ON configuracion_horarios;
CREATE POLICY "Publico puede ver configuracion de horarios"
  ON configuracion_horarios FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins pueden crear configuracion de horarios" ON configuracion_horarios;
CREATE POLICY "Admins pueden crear configuracion de horarios"
  ON configuracion_horarios FOR INSERT
  TO authenticated
  WITH CHECK (public.usuario_actual_tiene_roles(ARRAY['admin']));

DROP POLICY IF EXISTS "Admins pueden actualizar configuracion de horarios" ON configuracion_horarios;
CREATE POLICY "Admins pueden actualizar configuracion de horarios"
  ON configuracion_horarios FOR UPDATE
  TO authenticated
  USING (public.usuario_actual_tiene_roles(ARRAY['admin']))
  WITH CHECK (public.usuario_actual_tiene_roles(ARRAY['admin']));

DROP POLICY IF EXISTS "Admins pueden eliminar configuracion de horarios" ON configuracion_horarios;
CREATE POLICY "Admins pueden eliminar configuracion de horarios"
  ON configuracion_horarios FOR DELETE
  TO authenticated
  USING (public.usuario_actual_tiene_roles(ARRAY['admin']));

-- 9. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Función para actualizar timestamp
DROP TRIGGER IF EXISTS update_reservas_updated_at ON reservas;
CREATE TRIGGER update_reservas_updated_at
  BEFORE UPDATE ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Datos de ejemplo (se omiten para evitar usuarios o reservas predefinidos)
