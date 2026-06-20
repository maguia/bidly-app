import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import { authService } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
const PAISES = [
  'Argentina', 'Brasil', 'Chile', 'Uruguay', 'Paraguay',
  'Bolivia', 'Perú', 'Colombia', 'Venezuela', 'México',
  'España', 'Estados Unidos',
];

export default function RegistroScreen({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('');
  const [mostrarPaises, setMostrarPaises] = useState(false);
  const [domicilio, setDomicilio] = useState('');
  const [email, setEmail] = useState('');
  const [declaracion, setDeclaracion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [documento, setDocumento] = useState('');
  const [fotoFrente, setFotoFrente] = useState(null);
  const [fotoDorso, setFotoDorso] = useState(null);

  const elegirFoto = (lado) => {
  Alert.alert(
    'Foto del DNI',
    `¿Cómo querés cargar el ${lado === 'frente' ? 'frente' : 'dorso'} del DNI?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tomar foto', onPress: () => abrirCamara(lado) },
      { text: 'Elegir de galería', onPress: () => abrirGaleria(lado) },
    ]
  );
};

const abrirCamara = async (lado) => {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para sacar la foto del DNI');
    return;
  }
  const resultado = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
  procesarFoto(resultado, lado);
};

const abrirGaleria = async (lado) => {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para elegir la imagen del DNI');
    return;
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({
    base64: true,
    quality: 0.5,
    mediaTypes: ['images'],
  });
  procesarFoto(resultado, lado);
};

const procesarFoto = (resultado, lado) => {
  if (resultado.canceled) return;
  const dataUri = `data:image/jpeg;base64,${resultado.assets[0].base64}`;
  if (lado === 'frente') setFotoFrente(dataUri);
  else setFotoDorso(dataUri);
};

  const handleEnviar = async () => {
    // Validaciones
    if (!nombre) {
      Alert.alert('Error', 'Ingresá tu nombre');
      return;
    }
    if (!apellido) {
      Alert.alert('Error', 'Ingresá tu apellido');
      return;
    }
    if (!paisOrigen) {
      Alert.alert('Error', 'Seleccioná tu país de origen');
      return;
    }
    if (!domicilio) {
      Alert.alert('Error', 'Ingresá tu domicilio legal');
      return;
    }
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Ingresá un email válido');
      return;
    }
    if (!documento) {
      Alert.alert('Error', 'Ingresá tu número de documento');
      return;
    }
    if (!fotoFrente) {
      Alert.alert('Error', 'Sacá o subí una foto del frente del DNI');
      return;
    }
    if (!fotoDorso) {
      Alert.alert('Error', 'Sacá o subí una foto del dorso del DNI');
      return;
    }
    if (!declaracion) {
      Alert.alert('Error', 'Debés declarar que los datos son correctos y verídicos');
      return;
    }

    setCargando(true);
    try {
      await authService.registro({ nombre, apellido, email, paisOrigen, domicilio, declaracion, documento, fotoDniFrente: fotoFrente, fotoDniDorso: fotoDorso });
      navigation.replace('SolicitudEnviada', { email });
    } catch (error) {
      console.log('Error completo:', error.response?.status, error.response?.data);
      const codigo = error.response?.status;
      if (codigo === 409) {
        Alert.alert(
          'Cuenta existente',
          'Ya existe una cuenta con ese email. ¿Querés iniciar sesión?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Iniciar sesión', onPress: () => navigation.replace('Login') }
          ]
        );
      } else if (codigo === 400) {
        Alert.alert('Error', 'Faltan datos obligatorios');
      } else {
        Alert.alert('Error', 'No se pudo enviar la solicitud. Intentá de nuevo');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>

      {/* Info */}
      <Text style={styles.info}>
        Completá tus datos. La empresa los verificará y te asignará una categoría
      </Text>

      {/* Datos personales */}
      <Text style={styles.seccion}>Datos personales</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre"
        placeholderTextColor="#aaa"
        value={nombre}
        onChangeText={setNombre}
      />

      <TextInput
        style={styles.input}
        placeholder="Apellido"
        placeholderTextColor="#aaa"
        value={apellido}
        onChangeText={setApellido}
      />

      <TextInput
        style={styles.input}
        placeholder="Número de documento (DNI)"
        placeholderTextColor="#aaa"
        value={documento}
        onChangeText={setDocumento}
        keyboardType="numeric"
      />

      {/* País de origen */}
      <Text style={styles.seccion}>País de origen</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setMostrarPaises(!mostrarPaises)}
      >
        <Text style={paisOrigen ? styles.selectorTexto : styles.selectorPlaceholder}>
          {paisOrigen || 'Seleccionar país'}
        </Text>
        <Text style={styles.selectorFlecha}>▼</Text>
      </TouchableOpacity>

      {/* Dropdown de países */}
      {mostrarPaises && (
        <View style={styles.dropdown}>
          {PAISES.map((p) => (
            <TouchableOpacity
              key={p}
              style={styles.dropdownItem}
              onPress={() => {
                setPaisOrigen(p);
                setMostrarPaises(false);
              }}
            >
              <Text style={styles.dropdownTexto}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Domicilio */}
      <Text style={styles.seccion}>Domicilio legal</Text>
      <TextInput
        style={styles.input}
        placeholder="Calle, número, ciudad"
        placeholderTextColor="#aaa"
        value={domicilio}
        onChangeText={setDomicilio}
      />

      {/* Foto del DNI */}
      <Text style={styles.seccion}>Foto del DNI</Text>
      <View style={styles.dniRow}>
        <TouchableOpacity style={styles.dniBoton} onPress={() => elegirFoto('frente')}>
          {fotoFrente
            ? <Image source={{ uri: fotoFrente }} style={styles.dniPreview} />
            : <Text style={styles.dniTexto}>+ Frente</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.dniBoton} onPress={() => elegirFoto('dorso')}>
          {fotoDorso
            ? <Image source={{ uri: fotoDorso }} style={styles.dniPreview} />
            : <Text style={styles.dniTexto}>+ Dorso</Text>}
        </TouchableOpacity>
      </View>

      {/* Email */}
      <Text style={styles.seccion}>EMAIL</Text>
      <TextInput
        style={styles.input}
        placeholder="tu@email.com"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Declaración */}
      <TouchableOpacity
        style={styles.declaracionRow}
        onPress={() => setDeclaracion(!declaracion)}
      >
        <View style={[styles.checkbox, declaracion && styles.checkboxActivo]}>
          {declaracion && <Text style={styles.checkboxCheck}>✓</Text>}
        </View>
        <Text style={styles.declaracionTexto}>
          Declaro que los datos ingresados son correctos y verídicos
        </Text>
      </TouchableOpacity>

      {/* Botón enviar */}
      <TouchableOpacity
        style={[styles.boton, cargando && styles.botonDeshabilitado]}
        onPress={handleEnviar}
        disabled={cargando}
      >
        {cargando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.botonTexto}>ENVIAR SOLICITUD</Text>
        }
      </TouchableOpacity>

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
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  seccion: {
    fontSize: 13,
    color: '#1A2E4A',
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1A2E4A',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    marginBottom: 14,
  },
  selector: {
    backgroundColor: '#1A2E4A',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectorTexto: {
    color: '#fff',
    fontSize: 15,
  },
  selectorPlaceholder: {
    color: '#aaa',
    fontSize: 15,
  },
  selectorFlecha: {
    color: '#C9973A',
    fontSize: 14,
  },
  dropdown: {
    backgroundColor: '#1A2E4A',
    borderRadius: 8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3e5a',
  },
  dropdownTexto: {
    color: '#fff',
    fontSize: 15,
  },
  dniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  dniBoton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dniPreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  dniTexto: {
    color: '#1A2E4A',
    fontSize: 15,
    fontWeight: '600',
  },
  declaracionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1A2E4A',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxActivo: {
    backgroundColor: '#1A2E4A',
  },
  checkboxCheck: {
    color: '#C9973A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  declaracionTexto: {
    flex: 1,
    color: '#1A2E4A',
    fontSize: 13,
  },
  boton: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});