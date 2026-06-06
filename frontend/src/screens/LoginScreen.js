import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
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
      navigation.replace('Home');
    } catch (error) {
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
  const handleInvitado = async () => {
    // Limpiar cualquier sesión guardada antes de entrar como invitado
    await logout();
    navigation.navigate('Home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* Título */}
        <Text style={styles.titulo}>Iniciar sesión</Text>
        <Text style={styles.subtitulo}>Ingresá a tu cuenta</Text>

        {/* Campo email */}
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="usuario@email.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Campo contraseña */}
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Olvidaste tu contraseña */}
        <TouchableOpacity style={styles.olvidaste} onPress={() => navigation.navigate('RecuperarPassword')}>
          <Text style={styles.olvidasteTexto}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        {/* Botón ingresar */}
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

        {/* Separador */}
        <View style={styles.separador} />

        {/* Registrarse */}
        <View style={styles.registroRow}>
          <Text style={styles.registroTexto}>¿No tenés cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
            <Text style={styles.registroLink}>Registrate</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('CompletarRegistro')}>
            <Text style={styles.completarRegistro}>¿Recibiste tu código de aprobación?</Text>
        </TouchableOpacity>

        {/* Continuar como invitado */}
       <TouchableOpacity onPress={handleInvitado}>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#C9973A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 16,
    color: '#1A2E4A',
    textAlign: 'center',
    marginBottom: 36,
  },
  label: {
    fontSize: 14,
    color: '#1A2E4A',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1A2E4A',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  olvidaste: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  olvidasteTexto: {
    color: '#E8593C',
    fontSize: 13,
  },
  boton: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registroRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  registroTexto: {
    color: '#1A2E4A',
    fontSize: 14,
  },
  registroLink: {
    color: '#E8593C',
    fontSize: 14,
    fontWeight: '600',
  },
  invitado: {
    color: '#1A2E4A',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
    separador: {
    height: 1,
    backgroundColor: '#aaa',
    marginVertical: 16,
  },
  completarRegistro: {
    color: '#1A2E4A',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});