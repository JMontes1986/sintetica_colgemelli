import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api, { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUsuario(null);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const verificarToken = useCallback(async () => {
    try {
      const response = await authAPI.verificar();
      setUsuario(response.data.usuario);
    } catch (error) {
      console.error('Error al verificar token:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Revalidar token cuando cambie
  useEffect(() => {
    if (token) {
      verificarToken();
    } else {
      setLoading(false);
    }
  }, [token, verificarToken]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, usuario } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUsuario(usuario);
      
      // Asegurar que el token esté disponible inmediatamente en el cliente compartido
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true, usuario };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión'
      };
    }
  };

  const value = {
    usuario,
    loading,
    login,
    logout,
    isAuthenticated: !!usuario
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
