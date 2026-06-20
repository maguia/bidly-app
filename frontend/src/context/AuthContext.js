import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService,  usuarioService } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al arrancar la app, verifica si hay sesión guardada
  useEffect(() => {
    const cargarSesion = async () => {
      const dataGuardada = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');

      if (dataGuardada) {
        setUser(JSON.parse(dataGuardada));
      }

      if (token) {
        try {
          const res = await usuarioService.perfil();
          console.log('Perfil recibido del backend:', res.data.nombre, '— tiene foto?', !!res.data.foto, '— largo:', res.data.foto?.length);
          const actualizado = { ...(dataGuardada ? JSON.parse(dataGuardada) : {}), ...res.data };
          setUser(actualizado);
          await AsyncStorage.setItem('user', JSON.stringify(actualizado));
        } catch (error) {
          console.log('No se pudo refrescar el perfil:', error);
        }
      }

      setLoading(false);
    };

    cargarSesion();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const { token, usuario } = res.data;

    await AsyncStorage.setItem('token', token);

    let usuarioCompleto = usuario;
    try {
      const perfilRes = await usuarioService.perfil();
      usuarioCompleto = { ...usuario, ...perfilRes.data };
    } catch (error) {
      console.log('No se pudo traer el perfil completo en el login:', error);
    }

    await AsyncStorage.setItem('user', JSON.stringify(usuarioCompleto));
    setUser(usuarioCompleto);
    return usuarioCompleto;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = async (cambios) => {
    setUser(prev => {
      const actualizado = { ...prev, ...cambios };
      AsyncStorage.setItem('user', JSON.stringify(actualizado));
      return actualizado;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto fácilmente desde cualquier pantalla
export function useAuth() {
  return useContext(AuthContext);
}