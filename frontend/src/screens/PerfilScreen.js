import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Image, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
//import axios from 'axios';
import { usuarioService } from '../services/api';

export default function PerfilScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  
  const [mediosDePagoReales, setMediosDePagoReales] = useState([]);
  const [direccion, setDireccion] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [verificacion, setVerificacion] = useState({ valido: true, razones: [] });

  useEffect(() => {
    if (user?.domicilio) {
      setDireccion(user.domicilio);
    }
  }, [user]);
  

  // Sacamos la función afuera para poder reutilizarla después de eliminar
  const traerMediosDePago = async () => {
  try {
    const res = await usuarioService.traerMediosPago();
    setMediosDePagoReales(res.data || []);
  } catch (error) {
    console.log("Error trayendo medios de pago:", error);
    setMediosDePagoReales([]);
  }
};

  // Se ejecuta al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      if (user) {
        traerMediosDePago();
        cargarVerificacion();
      }
    }, [user])
  );

const eliminarMedioPago = async (id) => {
    const ejecutarEliminacion = async () => {
      try {
        console.log("--- DEBUG ELIMINAR ---");
        console.log("1. ID del medio a eliminar:", id);

        const res = await usuarioService.eliminarMedioPago(id);
        
        console.log("2. Éxito:", res.data);
        traerMediosDePago();
      } catch (error) {
        console.log("🛑 ERROR EXACTO AL ELIMINAR 🛑");
        console.log(error.response ? error.response.data : error.message);
        
        if (Platform.OS === 'web') {
          window.alert('No se pudo eliminar el medio de pago. Mirá la consola.');
        } else {
          Alert.alert('Error', 'No se pudo eliminar el medio de pago.');
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmarWeb = window.confirm('¿Estás seguro que querés eliminar este medio de pago?');
      if (confirmarWeb) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        'Eliminar medio de pago',
        '¿Estás seguro que querés eliminar este medio de pago?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: ejecutarEliminacion }
        ]
      );
    }
  };

  const cargarVerificacion = async () => {
    try {
      const res = await usuarioService.verificacion();
      setVerificacion(res.data);
    } catch (error) {
      console.log('Error consultando verificación:', error);
      setVerificacion({ valido: false, razones: ['No se pudo verificar tu estado'] });
    }
  };

  const abrirVerificacion = () => {
    setModalVisible(true);
  };
  
  const elegirFotoPerfil = () => {
  Alert.alert(
    'Foto de perfil',
    '¿Cómo querés cargar tu foto?',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tomar foto', onPress: abrirCamaraPerfil },
      { text: 'Elegir de galería', onPress: abrirGaleriaPerfil },
    ]
  );
};

const abrirCamaraPerfil = async () => {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara');
    return;
  }
  const resultado = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
  subirFotoPerfil(resultado);
};

const abrirGaleriaPerfil = async () => {
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
  subirFotoPerfil(resultado);
};

const subirFotoPerfil = async (resultado) => {
  if (resultado.canceled) return;
  const dataUri = `data:image/jpeg;base64,${resultado.assets[0].base64}`;
  try {
    await usuarioService.actualizarFoto(dataUri);
    updateUser({ foto: dataUri });
  } catch (error) {
    console.log('Error subiendo foto de perfil:', error);
    Alert.alert('Error', 'No se pudo actualizar la foto de perfil.');
  }
};

 const guardarDireccion = async () => {
  if (!direccion.trim()) {
    Alert.alert('Error', 'Escribí una dirección antes de guardar.');
    return;
  }
  try {
    await usuarioService.actualizarDireccion(direccion);
    Alert.alert('Éxito', 'Dirección actualizada correctamente');
    if (Platform.OS === 'web') {
          window.alert('Dirección actualizada correctamente.');
        } else {
          Alert.alert('Éxito', 'Dirección actualizada correctamente.');
        }
        setDireccion('');
      } catch (error) {
    console.log("Error guardando dirección:", error);
    Alert.alert('Error', 'No se pudo actualizar la dirección.');

    
  }
};

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmacionWeb = window.confirm('¿Estás seguro que querés salir de tu cuenta?');
      if (confirmacionWeb) {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } else {
      Alert.alert(
        'Cerrar sesión',
        '¿Estás seguro que querés salir de tu cuenta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Salir', 
            style: 'destructive',
            onPress: async () => {
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          },
        ]
      );
    }
  };

  const getInitials = (name) => {
    if (!name || String(name).toLowerCase() === 'undefined') return 'U';
    return String(name).trim().charAt(0).toUpperCase();
  };

  if (!user) {
  return (
    <View style={styles.invitadoContainer}>
      <Ionicons name="person-circle-outline" size={80} color="#1A2E4A" />
      <Text style={styles.invitadoTitulo}>No tenés una cuenta activa</Text>
      <Text style={styles.invitadoTexto}>
        Iniciá sesión o registrate para ver tu perfil, tus medios de pago y tu historial de subastas.
      </Text>
      <TouchableOpacity style={styles.invitadoBoton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.invitadoBotonTexto}>Iniciar sesión</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.invitadoBotonSecundario} onPress={() => navigation.navigate('Registro')}>
        <Text style={styles.invitadoBotonSecundarioTexto}>Registrarme</Text>
      </TouchableOpacity>
    </View>
  );
}

  const tieneDeuda = verificacion.razones.includes('Posee deudas pendientes de pago');
  const sinMediosValidos = verificacion.razones.includes('No posee medios de pago válidos');

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* 1. HEADER AZUL OSCURO */}
      <View style={styles.headerOscuro}>
        <Text style={styles.tituloHeader}>Mi perfil</Text>
      </View>

      {/* 2. SECCIÓN DE INFORMACIÓN DEL USUARIO */}
      <View style={styles.userInfoContainer}>
        <TouchableOpacity style={styles.avatarContainer} onPress={elegirFotoPerfil}>
          {user?.foto
            ? <Image source={{ uri: user.foto }} style={styles.avatarFoto} />
            : <Text style={styles.avatarTexto}>{getInitials(user?.nombre)}</Text>}
        </TouchableOpacity>

        <View style={styles.datosContainer}>
          <Text style={styles.nombreTexto}>{user?.nombre || 'Usuario sin nombre'}</Text>
          <Text style={styles.emailTexto}>{user?.email || 'Sin email registrado'}</Text>
          
          {user?.categoria && (
            <View style={styles.badgeCategoria}>
              <Text style={styles.badgeCategoriaTexto}>Categoría {user.categoria.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.iconosContainer}>
          <View style={styles.iconosTop}>
            <TouchableOpacity style={styles.iconoAction} onPress={() => navigation.navigate('Historial')}>
              <Ionicons name="time-outline" size={26} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconoAction} onPress={() => navigation.navigate('Notificaciones')}>
              <Ionicons name="notifications" size={26} color="#000" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.badgeVerificado, !verificacion.valido && styles.badgeNoVerificado]}
            onPress={abrirVerificacion}
          >
            <Text style={[styles.badgeVerificadoTexto, !verificacion.valido && styles.badgeNoVerificadoTexto]}>
              {verificacion.valido ? 'Usuario verificado' : 'No verificado'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.lineaSeparadora} />

      {/* 3. SECCIÓN DE MEDIOS DE PAGO */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>MEDIOS DE PAGO</Text>

        {mediosDePagoReales && mediosDePagoReales.length > 0 ? (
          mediosDePagoReales.map((metodo, index) => {
            const numeroIdentificador = metodo.numeroTarjeta 
              ? `terminada en ${metodo.numeroTarjeta.slice(-4)}`
              : (metodo.numeroCuenta || metodo.numeroCheque || '');
              
            const esVerificado = metodo.verificado === 1 || metodo.verificado === true;
            const muestraFondos = metodo.tipo === 'cuenta_bancaria' || metodo.tipo === 'cheque_certificado';

            const calcularPorcentajeAvance = () => {
              const plata = Number(metodo.limiteDisponible) || 0;
              if (plata === 0) return '0%';
              const porcentaje = (plata / 100000) * 100; 
              return `${Math.min(Math.max(porcentaje, 8), 100)}%`;
            };

            return (
              <View key={index} style={styles.cardPago}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{metodo.tipo} {numeroIdentificador}</Text>
                  
                  <View style={styles.cardHeaderRight}>
                    {esVerificado ? (
                      <View style={styles.verificadaBadgeMini}>
                        <Text style={styles.verificadaTextoMini}>VERIFICADA</Text>
                      </View>
                    ) : (
                      <View style={styles.noVerificadaBadgeMini}>
                        <Text style={styles.noVerificadaTextoMini}>NO VERIFICADA</Text>
                      </View>
                    )}
                    {/* Al presionar la cruz, disparamos la alerta pasando el ID real */}
                    <TouchableOpacity onPress={() => eliminarMedioPago(metodo.id)}>
                      <Ionicons name="close" size={18} color="#E8593C" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.cardDetail}>
                  {metodo.nombreBanco || metodo.descripcion || 'Medio de pago registrado'}
                </Text>

                {/* Barra de Avance y Disponible */}
                {muestraFondos && (
                  <View style={styles.fondosContainer}>
                    <View style={styles.textosFondos}>
                      <Text style={styles.textoFondoDisponible}>
                        Disponible: ${Number(metodo.limiteDisponible).toLocaleString('es-AR')}
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { width: calcularPorcentajeAvance() }]} /> 
                    </View>
                  </View>
                )}
                
              </View>
            );
          })
        ) : (
          <Text style={styles.textoVacio}>Aún no tenés medios de pago registrados.</Text>
        )}
        
        <TouchableOpacity 
          style={styles.botonAgregar} 
          onPress={() => navigation.navigate('MedioPago')}
        >
          <Text style={styles.botonAgregarTexto}>+ Agregar medio de pago</Text>
        </TouchableOpacity>

      </View>

      {/* 4. SECCIÓN DE DIRECCIÓN */}
      <View style={styles.seccionDireccion}>
        <Text style={styles.seccionTituloDireccion}>Cambiar dirección</Text>
        <TextInput 
          style={styles.inputDireccion}
          placeholder="Calle, número, ciudad"
          placeholderTextColor="#888"
          value={direccion}
          onChangeText={(text) => {
            setDireccion(text);
          }}
          returnKeyType="done"
        />

        {/* Solo mostramos el botón si la dirección cambió respecto a la original */}
        {direccion !== user?.domicilio && (
          <TouchableOpacity style={styles.botonGuardar} onPress={guardarDireccion}>
            <Text style={styles.botonGuardarTexto}>Guardar nueva dirección</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 5. CERRAR SESIÓN */}
      <TouchableOpacity style={styles.seccionLink} onPress={handleLogout}>
        <Text style={styles.textoLink}>Cerrar sesión</Text>
      </TouchableOpacity>

    </ScrollView>

      {/* MODAL DE VERIFICACIÓN */}
    <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCaja}>
          <Text style={styles.modalTitulo}>
            {verificacion.valido ? 'Usuario válido para realizar pujas' : 'Usuario Inválido para realizar pujas'}
          </Text>
          <Text style={styles.modalSubtitulo}>La verificación realizada arrojó:</Text>

          <View style={styles.modalChecklist}>
            <View style={styles.modalCheckRow}>
              <Text style={tieneDeuda ? styles.modalCruz : styles.modalCheck}>{tieneDeuda ? '✕' : '✓'}</Text>
              <Text style={styles.modalCheckTexto}>No se tienen deudas</Text>
            </View>
            <View style={styles.modalCheckRow}>
              <Text style={sinMediosValidos ? styles.modalCruz : styles.modalCheck}>{sinMediosValidos ? '✕' : '✓'}</Text>
              <Text style={styles.modalCheckTexto}>Posee medios de pago válidos</Text>
            </View>
          </View>

          {tieneDeuda && (
            <TouchableOpacity
              style={styles.modalIrAPagar}
              onPress={() => { setModalVisible(false); navigation.navigate('Deudas'); }}
            >
              <Text style={styles.modalIrAPagarTexto}>Ir a pagar →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.modalAtras} onPress={() => setModalVisible(false)}>
            <Text style={styles.modalAtrasTexto}>Atrás</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
);
  
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E0E0E0' 
  },
  content: { paddingBottom: 40 },
  headerOscuro: { 
    backgroundColor: '#1A2E4A', 
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 20 
  },
  tituloHeader: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#C9973A' 
  },
  userInfoContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, alignItems: 'center', justifyContent: 'space-between' },
  avatarContainer: { width: 60, height: 60, backgroundColor: '#C9973A', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarTexto: { 
    fontSize: 22, fontWeight: 'bold', color: '#1A2E4A' },
  avatarFoto: { width: '100%', height: '100%', borderRadius: 30 },
  datosContainer: { flex: 1, justifyContent: 'center' },
  nombreTexto: { fontSize: 18, fontWeight: 'bold', color: '#C9973A', marginBottom: 2 },
  emailTexto: { fontSize: 13, color: '#A0AAB5', marginBottom: 6 },
  badgeCategoria: { backgroundColor: '#3b2c12', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeCategoriaTexto: { color: '#C9973A', fontSize: 10, fontWeight: 'bold' },
  iconosContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  iconosTop: { flexDirection: 'row', marginBottom: 8, gap: 12 },
  iconoAction: { padding: 2 },
  badgeVerificado: { backgroundColor: '#0e421e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeVerificadoTexto: { color: '#4cd964', fontSize: 10, fontWeight: 'bold' },
  badgeNoVerificado: { backgroundColor: '#5c1f1f' },
  badgeNoVerificadoTexto: { color: '#ff8a80' },
  lineaSeparadora: { height: 1, backgroundColor: '#C5C5C5', marginHorizontal: 20, marginBottom: 15 },
  seccion: { marginHorizontal: 20 },
  seccionTitulo: { fontSize: 12, color: '#666', fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  textoVacio: { fontSize: 14, color: '#666', fontStyle: 'italic', marginBottom: 10 },
  cardPago: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  cardDetail: { fontSize: 11, color: '#A0AAB5' },
  verificadaBadgeMini: { backgroundColor: 'rgba(76, 217, 100, 0.1)', borderWidth: 1, borderColor: '#4cd964', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verificadaTextoMini: { color: '#4cd964', fontSize: 9, fontWeight: 'bold' },
  noVerificadaBadgeMini: { backgroundColor: 'rgba(232, 89, 60, 0.1)', borderWidth: 1, borderColor: '#E8593C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  noVerificadaTextoMini: { color: '#E8593C', fontSize: 9, fontWeight: 'bold' },
  fondosContainer: { marginTop: 12 },
  textosFondos: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  textoFondoDisponible: { fontSize: 11, color: '#A0AAB5', fontWeight: '500' },
  progressContainer: { height: 6, backgroundColor: '#2a3e5a', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#C9973A', borderRadius: 3 },
  botonAgregar: { backgroundColor: '#1A2E4A', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 5 },
  botonAgregarTexto: { color: '#C9973A', fontSize: 14, fontWeight: 'bold' },
  seccionDireccion: { marginHorizontal: 20, marginTop: 25 },
  seccionTituloDireccion: { fontSize: 14, color: '#444', marginBottom: 8 },
  inputDireccion: { backgroundColor: '#1A2E4A', color: '#FFFFFF', borderRadius: 8, padding: 14, fontSize: 13 },
  seccionLink: { marginHorizontal: 20, marginTop: 20 },
  textoLink: { color: '#E8593C', fontSize: 14 }, 
  botonGuardar: { 
    backgroundColor: '#C9973A', 
    borderRadius: 8, 
    paddingVertical: 10, 
    alignItems: 'center', 
    marginTop: 10 
  },
  botonGuardarTexto: { 
    color: '#1A2E4A', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  invitadoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#E0E0E0' },
invitadoTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1A2E4A', marginTop: 16, textAlign: 'center' },
invitadoTexto: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24 },
invitadoBoton: { backgroundColor: '#1A2E4A', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40, marginBottom: 10 },
invitadoBotonTexto: { color: '#C9973A', fontSize: 14, fontWeight: 'bold' },
invitadoBotonSecundario: { borderWidth: 1, borderColor: '#1A2E4A', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40 },
invitadoBotonSecundarioTexto: { color: '#1A2E4A', fontSize: 14, fontWeight: 'bold' },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
modalCaja: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
modalTitulo: { fontSize: 17, fontWeight: 'bold', color: '#1A2E4A', textAlign: 'center', marginBottom: 6 },
modalSubtitulo: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 18 },
modalChecklist: { marginBottom: 18 },
modalCheckRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
modalCheck: { color: '#2e7d32', fontSize: 16, fontWeight: 'bold', marginRight: 10, width: 18 },
modalCruz: { color: '#c62828', fontSize: 16, fontWeight: 'bold', marginRight: 10, width: 18 },
modalCheckTexto: { color: '#1A2E4A', fontSize: 14 },
modalIrAPagar: { alignSelf: 'flex-end', marginBottom: 18 },
modalIrAPagarTexto: { color: '#E8593C', fontWeight: 'bold', fontSize: 13 },
modalAtras: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee' },
modalAtrasTexto: { color: '#1A2E4A', fontSize: 14, fontWeight: '600' },

});