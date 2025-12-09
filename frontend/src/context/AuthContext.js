import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

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

  const API_URL = process.env.REACT_APP_API_URL;

  // Configurar axios con token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verificarToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verificarToken = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/verificar`);
      setUsuario(response.data.usuario);
    } catch (error) {
      console.error('Error al verificar token:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, usuario } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUsuario(usuario);
      
      return { success: true, usuario };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUsuario(null);
    delete axios.defaults.headers.common['Authorization'];
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
