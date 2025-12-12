import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      // Redirigir según el rol
      if (result.usuario.rol === 'admin') {
        navigate('/admin');
      } else if (result.usuario.rol === 'cancha') {
        navigate('/cancha');
      } else {
        navigate('/');
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">⚽</h1>
          <h2 className="text-3xl font-bold text-gray-800">Iniciar Sesión</h2>
          <p className="text-gray-600 mt-2">Sistema de Reservas - Cancha Sintética</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Iniciar sesión</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="tu@correo.com"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-gray-400"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/')}
              className="w-full text-gray-600 hover:text-gray-800 font-medium"
            >
              ← Volver al inicio
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
