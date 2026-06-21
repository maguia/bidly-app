import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { consignacionesService, usuarioService } from '../services/api';

const CATEGORIAS = ['Arte', 'Joyas', 'Vehículos', 'Inmuebles', 'Electrónica', 'Mobiliario', 'Otros'];

export default function ConsignarBienScreen({ navigation }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [mostrarCategorias, setMostrarCategorias] = useState(false);
  const [artista, setArtista] = useState('');
  const [anio, setAnio] = useState('');
  const [fotos, setFotos] = useState([null, null, null, null, null, null]);

  const [declaracionPertenece, setDeclaracionPertenece] = useState(false);
  const [declaracionDevolucion, setDeclaracionDevolucion] = useState(false);
  const [declaracionOrigen, setDeclaracionOrigen] = useState(false);
  const [devolucionMetodo, setDevolucionMetodo] = useState(null); // 'retiro' | 'envio'

  const [medios, setMedios] = useState([]);
  const [medioSeleccionado, setMedioSeleccionado] = useState(null);
  const [mostrarMedios, setMostrarMedios] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const cargarMedios = async () => {
      try {
        const res = await usuarioService.traerMediosPago();
        const validos = (res.data || []).filter(m => m.verificado === 1 || m.verificado === true);
        setMedios(validos);
        if (validos.length > 0) setMedioSeleccionado(validos[0]);
      } catch (error) {
        console.log('Error cargando medios:', error);
      }
    };
    cargarMedios();
  }, []);

  const elegirFoto = (index) => {
    Alert.alert(
      'Foto del bien',
      '¿Cómo querés cargar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => abrirCamara(index) },
        { text: 'Elegir de galería', onPress: () => abrirGaleria(index) },
      ]
    );
  };

  const abrirCamara = async (index) => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
    procesarFoto(resultado, index);
  };

  const abrirGaleria = async (index) => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5,
      mediaTypes: ['images'],
    });
    procesarFoto(resultado, index);
  };

  const procesarFoto = (resultado, index) => {
    if (resultado.canceled) return;
    const dataUri = `data:image/jpeg;base64,${resultado.assets[0].base64}`;
    const nuevasFotos = [...fotos];
    nuevasFotos[index] = dataUri;
    setFotos(nuevasFotos);
  };

  const handleEnviar = async () => {
    if (!titulo.trim()) { Alert.alert('Error', 'Ingresá el título del bien'); return; }
    if (!descripcion.trim()) { Alert.alert('Error', 'Ingresá una descripción'); return; }
    if (!categoria) { Alert.alert('Error', 'Seleccioná una categoría'); return; }
    if (fotos.some(f => !f)) { Alert.alert('Error', 'Subí las 6 fotos obligatorias'); return; }
    if (!declaracionPertenece || !declaracionDevolucion || !declaracionOrigen) {
      Alert.alert('Error', 'Tenés que aceptar las tres declaraciones obligatorias');
      return;
    }
    if (!devolucionMetodo) { Alert.alert('Error', 'Elegí cómo recuperarías el bien en caso de rechazo'); return; }
    if (devolucionMetodo === 'envio' && !medioSeleccionado) { Alert.alert('Error', 'Seleccioná un medio de pago para el cobro de envío'); return; }
    setEnviando(true);
    try {
      await consignacionesService.crear({
        titulo, descripcion, categoria, artista, anio, fotos,
        devolucionMetodo,
        medioPagoCobroId: devolucionMetodo === 'envio' ? medioSeleccionado.id : null,
        declaracionPertenece, declaracionDevolucion, declaracionOrigen,
        });
      Alert.alert('Listo', 'Tu solicitud fue enviada correctamente');
      navigation.goBack();
    } catch (error) {
      console.log('Error enviando solicitud:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intentá de nuevo');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Consignar un bien</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Título del bien</Text>
        <TextInput style={styles.input} placeholder="Título del bien" placeholderTextColor="#aaa" value={titulo} onChangeText={setTitulo} />

        <Text style={styles.label}>Descripción</Text>
        <TextInput style={styles.input} placeholder="Descripción" placeholderTextColor="#aaa" value={descripcion} onChangeText={setDescripcion} multiline />

        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setMostrarCategorias(!mostrarCategorias)}>
          <Text style={categoria ? styles.selectorTexto : styles.selectorPlaceholder}>{categoria || 'Seleccionar categoría'}</Text>
          <Text style={styles.selectorFlecha}>▼</Text>
        </TouchableOpacity>
        {mostrarCategorias && (
          <View style={styles.dropdown}>
            {CATEGORIAS.map(c => (
              <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setCategoria(c); setMostrarCategorias(false); }}>
                <Text style={styles.dropdownTexto}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.filaDoble}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Artista/Diseñador</Text>
            <TextInput style={styles.input} placeholder="Opcional" placeholderTextColor="#aaa" value={artista} onChangeText={setArtista} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Año</Text>
            <TextInput style={styles.input} placeholder="Opcional" placeholderTextColor="#aaa" value={anio} onChangeText={setAnio} keyboardType="numeric" />
          </View>
        </View>

        <Text style={styles.label}>Fotos del bien (mínimo 6 obligatorias)</Text>
        <View style={styles.fotosGrid}>
          {fotos.map((foto, index) => (
            <TouchableOpacity key={index} style={styles.fotoBoton} onPress={() => elegirFoto(index)}>
              {foto
                ? <Image source={{ uri: foto }} style={styles.fotoPreview} />
                : <Text style={styles.fotoTexto}>+ Foto {index + 1}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.declaracionesTitulo}>DECLARACIONES OBLIGATORIAS</Text>

        <TouchableOpacity style={styles.declaracionRow} onPress={() => setDeclaracionPertenece(!declaracionPertenece)}>
          <View style={[styles.checkbox, declaracionPertenece && styles.checkboxActivo]}>
            {declaracionPertenece && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={styles.declaracionTexto}>Declaro que el bien me pertenece y no posee ningún impedimento legal para ser subastado.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declaracionRow} onPress={() => setDeclaracionDevolucion(!declaracionDevolucion)}>
          <View style={[styles.checkbox, declaracionDevolucion && styles.checkboxActivo]}>
            {declaracionDevolucion && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={styles.declaracionTexto}>Acepto que la devolución por rechazo es con cargo a mi cuenta.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declaracionRow} onPress={() => setDeclaracionOrigen(!declaracionOrigen)}>
          <View style={[styles.checkbox, declaracionOrigen && styles.checkboxActivo]}>
            {declaracionOrigen && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={styles.declaracionTexto}>Puedo acreditar el origen lícito si la empresa lo requiere.</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Si tu solicitud es rechazada o no aceptás la oferta, ¿cómo recuperás el bien?</Text>
        <View style={styles.opcionesRow}>
        <TouchableOpacity
            style={[styles.opcionBoton, devolucionMetodo === 'retiro' && styles.opcionBotonActivo]}
            onPress={() => setDevolucionMetodo('retiro')}
        >
            <Text style={[styles.opcionTexto, devolucionMetodo === 'retiro' && styles.opcionTextoActivo]}>Lo retiro yo mismo</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={[styles.opcionBoton, devolucionMetodo === 'envio' && styles.opcionBotonActivo]}
            onPress={() => setDevolucionMetodo('envio')}
        >
            <Text style={[styles.opcionTexto, devolucionMetodo === 'envio' && styles.opcionTextoActivo]}>Pago el envío</Text>
        </TouchableOpacity>
        </View>

        {devolucionMetodo === 'envio' && (
        <>
            <Text style={styles.label}>Medio de pago para cobro de envío</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setMostrarMedios(!mostrarMedios)}>
            <Text style={medioSeleccionado ? styles.selectorTexto : styles.selectorPlaceholder}>
                {medioSeleccionado ? medioSeleccionado.descripcion : 'Sin medios de pago válidos'}
            </Text>
            <Text style={styles.selectorFlecha}>▼</Text>
            </TouchableOpacity>
            {mostrarMedios && (
            <View style={styles.dropdown}>
                {medios.length === 0 ? (
                <Text style={styles.dropdownVacio}>No tenés medios de pago verificados</Text>
                ) : (
                medios.map(m => (
                    <TouchableOpacity key={m.id} style={styles.dropdownItem} onPress={() => { setMedioSeleccionado(m); setMostrarMedios(false); }}>
                    <Text style={styles.dropdownTexto}>{m.descripcion}</Text>
                    </TouchableOpacity>
                ))
                )}
            </View>
            )}
        </>
        )}

        <TouchableOpacity
          style={[styles.botonEnviar, enviando && styles.botonDeshabilitado]}
          onPress={handleEnviar}
          disabled={enviando}
        >
          <Text style={styles.botonEnviarTexto}>{enviando ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  inner: { paddingBottom: 40 },
  header: { backgroundColor: '#1A2E4A', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerTitulo: { fontSize: 20, fontWeight: 'bold', color: '#C9973A' },
  body: { padding: 20 },
  label: { fontSize: 13, color: '#1A2E4A', fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, fontSize: 14, color: '#fff' },
  filaDoble: { flexDirection: 'row' },
  selector: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectorTexto: { color: '#fff', fontSize: 14 },
  selectorPlaceholder: { color: '#aaa', fontSize: 14 },
  selectorFlecha: { color: '#C9973A', fontSize: 12 },
  dropdown: { backgroundColor: '#1A2E4A', borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a3e5a' },
  dropdownTexto: { color: '#fff', fontSize: 14 },
  dropdownVacio: { color: '#aaa', padding: 14, fontSize: 13 },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 4 },
  fotoBoton: { width: '31%', aspectRatio: 1, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  fotoTexto: { color: '#1A2E4A', fontSize: 12, fontWeight: '600' },
  fotoPreview: { width: '100%', height: '100%' },
  declaracionesTitulo: { fontSize: 12, color: '#666', fontWeight: 'bold', letterSpacing: 1, marginTop: 18, marginBottom: 10 },
  declaracionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#1A2E4A', marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginTop: 2 },
  checkboxActivo: { backgroundColor: '#1A2E4A' },
  checkboxCheck: { color: '#C9973A', fontSize: 13, fontWeight: 'bold' },
  declaracionTexto: { flex: 1, color: '#1A2E4A', fontSize: 12, lineHeight: 17 },
  botonEnviar: { backgroundColor: '#E8593C', borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  botonDeshabilitado: { opacity: 0.6 },
  botonEnviarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  opcionesRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  opcionBoton: { flex: 1, borderWidth: 1, borderColor: '#1A2E4A', borderRadius: 8, padding: 12, alignItems: 'center' },
  opcionBotonActivo: { backgroundColor: '#1A2E4A' },
  opcionTexto: { color: '#1A2E4A', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  opcionTextoActivo: { color: '#C9973A' },
});