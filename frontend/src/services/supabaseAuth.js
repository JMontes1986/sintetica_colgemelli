import axios from 'axios';
import { authAPI } from './api';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const HAS_CLIENT_CREDS = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const getAuthHeaders = () => {
  if (!HAS_CLIENT_CREDS) {
    throw new Error('Faltan las credenciales de Supabase.');
  }

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
};

export const signUpUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('El correo y la contraseña son obligatorios.');
  }

  if (HAS_CLIENT_CREDS) {
    const { data } = await axios.post(
      `${SUPABASE_URL}/auth/v1/signup`,
      { email, password },
      { headers: getAuthHeaders() }
    );

    return data;
  }

  const { data } = await authAPI.registroSupabase(email, password);

  return data;
};
