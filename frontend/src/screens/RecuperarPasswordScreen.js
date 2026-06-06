import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { authService } from '../services/api';

export default function RecuperarPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [repetirPassword, setRepetirPassword] = useState('');

  const [emailEnviado, setEmailEnviado] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const [cargandoEmail, setCargandoEmail] = useState(false);
  const [cargandoCodigo, setCargandoCodigo] = useState(false);
  const [cargandoGuardar, setCargandoGuardar] = useState(false);

  const getPasswordSeguridad = (pass) => {
    if (!pass) return null;
    if (pass.length < 6) return { texto: 'Contraseña muy corta', color: '#FF4C4C' };
    if (pass.length < 8) return { texto: 'Seguridad baja — agregá más caracteres', color: '#C9973A' };
    if (!/[0-9]/.test(pass) || !/[^a-zA-Z0-9]/.test(pass))
      return { texto: 'Seguridad media — agregá números y símbolos', color: '#C9973A' };
    return { texto: 'Contraseña segura', color: '#4CAF50' };
  };

  const seguridad = getPasswordSeguridad(nuevaPassword);

  const handleEnviarEmail = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Ingresá un email válido');
      return;
    }
    setCargandoEmail(true);
    try {
      await authService.recuperarPassword(email);
      setEmailEnviado(true);
    } catch (error) {
      const codigo = error.response?.status;
      if (codigo === 404) {
        Alert.alert('Error', 'No existe una cuenta con ese email');
      } else {
        Alert.alert('Error', 'No se pudo enviar el código. Intentá de nuevo');
      }
    } finally {
      setCargandoEmail(false);
    }
  };

  const handleVerificar = async () => {
    if (!codigo || codigo.length !== 6) {
      Alert.alert('Error', 'Ingresá el código de 6 dígitos que recibiste');
      return;
    }
    setCargandoCodigo(true);
    try {
      // Verificar el código contra el backend antes de mostrar el formulario
      await authService.verificarCodigoRecuperacion(email, codigo);
      setVerificado(true);
    } catch (error) {
      const cod = error.response?.status;
      if (cod === 400) {
        Alert.alert('Error', 'Código incorrecto');
      } else if (cod === 410) {
        Alert.alert('Código expirado', 'Pedí un nuevo código');
        setEmailEnviado(false);
        setCodigo('');
      } else {
        Alert.alert('Error', 'No se pudo verificar el código');
      }
    } finally {
      setCargandoCodigo(false);
    }
  };

 const handleGuardar = async () => {
    if (!nuevaPassword || !repetirPassword) {
      Alert.alert('Error', 'Completá ambos campos');
      return;
    }
    if (nuevaPassword !== repetirPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (nuevaPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setCargandoGuardar(true);
    try {
      await authService.verificarCodigo2(email, codigo, nuevaPassword, repetirPassword);
      setGuardado(true);
    } catch (error) {
      const cod = error.response?.status;
      if (cod === 400) {
        Alert.alert('Error', 'Código incorrecto');
      } else if (cod === 410) {
        Alert.alert('Código expirado', 'Pedí un nuevo código');
        setEmailEnviado(false);
        setVerificado(false);
        setCodigo('');
      } else {
        Alert.alert('Error', 'No se pudo actualizar la contraseña');
      }
    } finally {
      setCargandoGuardar(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>

      {/* Título */}
      <Text style={styles.titulo}>Contraseña</Text>

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
        editable={!emailEnviado}
      />

      {emailEnviado && (
        <Text style={styles.infoTexto}>
          Te enviaremos un código para restablecer tu contraseña.
        </Text>
      )}

      {/* Campo código */}
      {emailEnviado && (
        <>
          <Text style={styles.label}>Ingrese código</Text>
          <TextInput
            style={styles.input}
            placeholder="Código"
            placeholderTextColor="#aaa"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="numeric"
            editable={!verificado}
          />
        </>
      )}

      {/* Botón verificar */}
      {!verificado && (
        <TouchableOpacity
          style={styles.boton}
          onPress={emailEnviado ? handleVerificar : handleEnviarEmail}
          disabled={cargandoEmail || cargandoCodigo}
        >
          {cargandoEmail || cargandoCodigo
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>
                {emailEnviado ? 'VERIFICAR' : 'ENVIAR CÓDIGO'}
              </Text>
          }
        </TouchableOpacity>
      )}

      {/* Mensaje verificado */}
      {verificado && (
        <View style={styles.mensajeExito}>
          <Text style={styles.mensajeExitoTexto}>✓ Se ha verificado correctamente.</Text>
        </View>
      )}

      {/* Nueva contraseña */}
      {verificado && (
        <>
        {/* Separador */}
          <View style={styles.separador} />

          <Text style={styles.label}>Creá tu clave personal</Text>
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor="#aaa"
            value={nuevaPassword}
            onChangeText={setNuevaPassword}
            secureTextEntry
            editable={!guardado}
          />

          {/* Indicador de seguridad */}
          {seguridad && (
            <>
              <View style={styles.seguridadBarra}>
                <View style={[
                  styles.seguridadRelleno,
                  { backgroundColor: seguridad.color,
                    width: seguridad.color === '#FF4C4C' ? '30%'
                         : seguridad.color === '#C9973A' ? '60%' : '100%'
                  }
                ]} />
              </View>
              <Text style={[styles.seguridadTexto, { color: seguridad.color }]}>
                {seguridad.texto}
              </Text>
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Repetir contraseña"
            placeholderTextColor="#aaa"
            value={repetirPassword}
            onChangeText={setRepetirPassword}
            secureTextEntry
            editable={!guardado}
          />

          {/* Botón guardar */}
          {!guardado && (
            <TouchableOpacity
              style={styles.boton}
              onPress={handleGuardar}
              disabled={cargandoGuardar}
            >
              {cargandoGuardar
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.botonTexto}>GUARDAR</Text>
              }
            </TouchableOpacity>
          )}

          {/* Mensaje guardado */}
          {guardado && (
            <View style={styles.mensajeExito}>
              <Text style={styles.mensajeExitoTexto}>✓ La contraseña ha sido actualizada con éxito.</Text>
            </View>
          )}

          {/* Volver al inicio */}
          {guardado && (
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={() => navigation.replace('Login')}
            >
              <Text style={styles.botonVolverTexto}>VOLVER AL INICIO</Text>
            </TouchableOpacity>
          )}
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  inner: {
    padding: 24,
    paddingTop: 60,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C9973A',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#1A2E4A',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1A2E4A',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    marginBottom: 14,
  },
  infoTexto: {
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  boton: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mensajeExito: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  mensajeExitoTexto: {
    color: '#4CAF50',
    fontSize: 13,
    textAlign: 'center',
  },
  seguridadBarra: {
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  seguridadRelleno: {
    height: 4,
    borderRadius: 2,
  },
  seguridadTexto: {
    fontSize: 12,
    marginBottom: 14,
  },
  botonVolver: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    opacity: 0.7,
  },
  botonVolverTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  separador: {
    height: 1,
    backgroundColor: '#aaa',
    marginVertical: 16,
  },
});