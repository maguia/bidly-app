import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIAS = ['comun', 'especial', 'plata', 'oro', 'platino'];

export default function CompletarRegistroScreen({ navigation }) {
    
  const { login } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [password, setPassword] = useState('');
  const [repetirPassword, setRepetirPassword] = useState('');
  const [verificado, setVerificado] = useState(false);
  const [cargandoVerificar, setCargandoVerificar] = useState(false);
  const [cargandoGuardar, setCargandoGuardar] = useState(false);

  const getPasswordSeguridad = (pass) => {
    if (!pass) return null;
    if (pass.length < 6) return { texto: 'Contraseña muy corta', color: '#FF4C4C' };
    if (pass.length < 8) return { texto: 'Seguridad baja', color: '#C9973A' };
    if (!/[0-9]/.test(pass) || !/[^a-zA-Z0-9]/.test(pass))
      return { texto: 'Seguridad media — agregá números y símbolos', color: '#C9973A' };
    return { texto: 'Contraseña segura', color: '#4CAF50' };
  };

  const seguridad = getPasswordSeguridad(password);

  const handleVerificar = async () => {
    if (!codigo || codigo.length !== 6) {
      Alert.alert('Error', 'Ingresá el código de 6 dígitos que recibiste por email');
      return;
    }
    setCargandoVerificar(true);
    try {
      const res = await authService.verificarCodigo(codigo);
      setCategoria(res.data.categoria);
      setVerificado(true);
    } catch (error) {
      const codigo_error = error.response?.status;
      if (codigo_error === 404) {
        Alert.alert('Error', 'Código incorrecto. Verificá el email que recibiste');
      } else if (codigo_error === 410) {
        Alert.alert('Código expirado', 'El código expiró. Contactá a la empresa para obtener uno nuevo');
      } else {
        Alert.alert('Error', 'No se pudo verificar el código');
      }
    } finally {
      setCargandoVerificar(false);
    }
  };

  const handleGuardar = async () => {
    if (!password || !repetirPassword) {
      Alert.alert('Error', 'Completá ambos campos de contraseña');
      return;
    }
    if (password !== repetirPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setCargandoGuardar(true);
    try {
      const res = await authService.completarRegistro(codigo, password, repetirPassword);
      console.log('Completar registro OK:', res.data);
      console.log('Intentando login con:', res.data.email, password);
      // Login automático para que tenga token al llegar a MedioPago
      await login(res.data.email, password);
      console.log('Login exitoso, navegando a MedioPago');
      navigation.replace('MedioPago');
    } catch (error) {
      console.log('Error completar:', error.response?.status, error.response?.data);
      const cod = error.response?.status;
      if (cod === 404) {
        Alert.alert('Error', 'Código incorrecto');
      } else if (cod === 410) {
        Alert.alert('Código expirado', 'Contactá a la empresa para obtener uno nuevo');
      } else {
        Alert.alert('Error', 'No se pudo completar el registro');
      }
    } finally {
      setCargandoGuardar(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>

      {/* Info */}
      <Text style={styles.info}>Tu solicitud fue aprobada</Text>

      {/* Campo código */}
      {!verificado && (
        <>
          <Text style={styles.label}>Ingresá el código que recibiste por email</Text>
          <TextInput
            style={styles.input}
            placeholder="Código de 6 dígitos"
            placeholderTextColor="#aaa"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="numeric"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.boton, cargandoVerificar && styles.botonDeshabilitado]}
            onPress={handleVerificar}
            disabled={cargandoVerificar}
          >
            {cargandoVerificar
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.botonTexto}>VERIFICAR</Text>
            }
          </TouchableOpacity>
        </>
      )}

      {/* Categoría asignada */}
      {verificado && (
        <>
          <View style={styles.categoriaBox}>
            <View style={styles.categoriaHeader}>
              <View>
                <Text style={styles.categoriaNombre}>{categoria?.toUpperCase()}</Text>
                <Text style={styles.categoriaSubtitulo}>Categoría inicial · Subastas generales</Text>
              </View>
              <View style={styles.badgeAsignada}>
                <Text style={styles.badgeTexto}>ASIGNADA</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTexto}>
              Podés mejorar tu categoría sumando medios de pago verificados y participando en subastas.
            </Text>
          </View>

          {/* Comparativa de categorías */}
          <View style={styles.categoriasBox}>
            <Text style={styles.categoriasLabel}>CATEGORÍAS</Text>
            <View style={styles.categoriasRow}>
              {CATEGORIAS.map((c) => (
                <View
                  key={c}
                  style={[
                    styles.categoriaChip,
                    c === categoria && styles.categoriaChipActivo
                  ]}
                >
                  <Text style={[
                    styles.categoriaChipTexto,
                    c === categoria && styles.categoriaChipTextoActivo
                  ]}>
                    {c.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Separador */}
          <View style={styles.separador} />

          {/* Crear contraseña */}
          <Text style={styles.label}>Creá tu clave personal</Text>
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {seguridad && (
            <>
              <View style={styles.seguridadBarra}>
                <View style={[
                  styles.seguridadRelleno,
                  {
                    backgroundColor: seguridad.color,
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
          />

          <TouchableOpacity
            style={[styles.boton, cargandoGuardar && styles.botonDeshabilitado]}
            onPress={handleGuardar}
            disabled={cargandoGuardar}
          >
            {cargandoGuardar
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.botonTexto}>CONTINUAR</Text>
            }
          </TouchableOpacity>
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
    paddingBottom: 40,
  },
  info: {
    color: '#4CAF50',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#1A2E4A',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A2E4A',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    marginBottom: 14,
  },
  boton: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriaBox: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  categoriaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoriaNombre: {
    color: '#C9973A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoriaSubtitulo: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  badgeAsignada: {
    backgroundColor: '#C9973A',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTexto: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoBoxTexto: {
    color: '#2e7d32',
    fontSize: 13,
    textAlign: 'center',
  },
  categoriasBox: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  categoriasLabel: {
    color: '#aaa',
    fontSize: 11,
    marginBottom: 10,
  },
  categoriasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoriaChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#2a3e5a',
  },
  categoriaChipActivo: {
    backgroundColor: '#C9973A',
  },
  categoriaChipTexto: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoriaChipTextoActivo: {
    color: '#fff',
  },
  separador: {
    height: 1,
    backgroundColor: '#aaa',
    marginVertical: 16,
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
});