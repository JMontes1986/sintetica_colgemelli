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
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Jugado')),
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para mejorar consultas
CREATE INDEX idx_reservas_fecha ON reservas(fecha);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_fecha_hora ON reservas(fecha, hora);

- 4. Crear cuentas manualmente (no se incluyen usuarios por defecto)
  
-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de seguridad para usuarios
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

-- 7. Políticas de seguridad para reservas
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

-- 8. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_reservas_updated_at
  BEFORE UPDATE ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Datos de ejemplo (se omiten para evitar usuarios o reservas predefinidos)
