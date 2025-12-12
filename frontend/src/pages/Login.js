import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signUpUser } from '../services/supabaseAuth';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    setRegisterLoading(true);

    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Las contraseñas no coinciden.');
      setRegisterLoading(false);
      return;
    }

    try {
      await signUpUser(registerData.email, registerData.password);
      setRegisterSuccess('Usuario creado temporalmente en Supabase. Revisa tu correo para confirmar.');
      setRegisterData({ email: '', password: '', confirmPassword: '' });
    } catch (registerErr) {
      const message = registerErr.response?.data?.message || registerErr.message || 'No se pudo crear el usuario.';
      setRegisterError(message);
    } finally {
      setRegisterLoading(false);
    }
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

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Crear usuario temporal</h3>
              <span className="text-xs font-medium text-primary bg-green-50 px-3 py-1 rounded-full">Supabase</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Crea un usuario temporalmente en Supabase para pruebas. Las credenciales se almacenan de forma segura en el proveedor.
            </p>

            {registerError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg">
                {registerError}
              </div>
            )}
            {registerSuccess && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg">
                {registerSuccess}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Correo electrónico</label>
                <input
                  type="email"
                  required
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="nuevo@correo.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Confirmar contraseña</label>
                  <input
                    type="password"
                    required
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {registerLoading ? 'Creando usuario...' : 'Crear usuario en Supabase'}
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
