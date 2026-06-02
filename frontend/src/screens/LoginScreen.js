import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    // Validaciones
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completá todos los campos');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Ingresá un email válido');
      return;
    }

    setCargando(true);
    try {
      await login(email, password);
      // Si el login es exitoso, navega al Home
      navigation.replace('Home');
    } catch (error) {
      // Manejo de errores según código HTTP
      const codigo = error.response?.status;
      if (codigo === 401) {
        Alert.alert('Error', 'Email o contraseña incorrectos');
      } else if (codigo === 403) {
        Alert.alert('Cuenta no habilitada', 'Tu cuenta aún no fue verificada por la empresa');
      } else {
        Alert.alert('Error', 'No se pudo conectar al servidor. Verificá tu conexión');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* Logo / Título */}
        <Text style={styles.titulo}>Bidly</Text>
        <Text style={styles.subtitulo}>Iniciá sesión en tu cuenta</Text>

        {/* Campos */}
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="usuario@email.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Botón de ingreso */}
        <TouchableOpacity
          style={[styles.boton, cargando && styles.botonDeshabilitado]}
          onPress={handleLogin}
          disabled={cargando}
        >
          {cargando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>INGRESAR</Text>
          }
        </TouchableOpacity>

        {/* Continuar como invitado */}
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.invitado}>Continuar como invitado</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  titulo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1A2E4A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 16,
    color: '#1A2E4A',
    textAlign: 'center',
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    color: '#1A2E4A',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1A2E4A',
    marginBottom: 20,
  },
  boton: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  invitado: {
    color: '#1A2E4A',
    textAlign: 'center',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});