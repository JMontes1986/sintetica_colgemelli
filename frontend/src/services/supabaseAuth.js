import axios from 'axios';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const getAuthHeaders = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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

  if (!SUPABASE_URL) {
    throw new Error('No se encontró la URL de Supabase.');
  }

  const { data } = await axios.post(
    `${SUPABASE_URL}/auth/v1/signup`,
    { email, password },
    { headers: getAuthHeaders() }
  );

  return data;
};
