import { authAPI } from './api';

export const signUpUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('El correo y la contraseña son obligatorios.');
  }

const { data } = await authAPI.registroSupabase(email, password);

  return data;
};
