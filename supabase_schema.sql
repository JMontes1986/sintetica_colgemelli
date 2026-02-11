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
    CHECK (estado_gemellista IN ('No aplica', 'Pendiente', 'Aprobado', 'Rechazado'));

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
CREATE INDEX idx_reservas_fecha ON reservas(fecha);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_fecha_hora ON reservas(fecha, hora);

-- 5. Crear cuentas manualmente (no se incluyen usuarios por defecto)

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de seguridad para usuarios
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON usuarios FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Solo admins pueden ver todos los usuarios"
  ON usuarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- 8. Políticas de seguridad para reservas
CREATE POLICY "Todos pueden crear reservas"
  ON reservas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Operadores cancha pueden ver reservas"
  ON reservas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND rol IN ('cancha', 'admin')
    )
  );

CREATE POLICY "Operadores cancha pueden actualizar reservas"
  ON reservas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND rol IN ('cancha', 'admin')
    )
  );

CREATE POLICY "Solo admins pueden eliminar reservas"
  ON reservas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- 9. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Función para actualizar timestamp
CREATE TRIGGER update_reservas_updated_at
  BEFORE UPDATE ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Datos de ejemplo (se omiten para evitar usuarios o reservas predefinidos)
