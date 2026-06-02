import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al arrancar la app, verifica si hay sesión guardada
  useEffect(() => {
    AsyncStorage.getItem('user').then(data => {
      if (data) setUser(JSON.parse(data));
      setLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const { token, usuario } = res.data;
    
    // Guardar token y usuario en el dispositivo
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(usuario));
    
    setUser(usuario);
    return usuario;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto fácilmente desde cualquier pantalla
export function useAuth() {
  return useContext(AuthContext);
}