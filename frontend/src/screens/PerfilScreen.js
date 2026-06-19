import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function PerfilScreen({ navigation }) {
  const { user, logout } = useAuth();
  
  const [mediosDePagoReales, setMediosDePagoReales] = useState([]);
  const [direccion, setDireccion] = useState('');

  useEffect(() => {
    if (user?.domicilio) {
      setDireccion(user.domicilio);
    }
  }, [user]);
  

  // Sacamos la función afuera para poder reutilizarla después de eliminar
  const traerMediosDePago = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await axios.get('http://localhost:3000/usuarios/me/medios-pago', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMediosDePagoReales(res.data || []);
      }
    } catch (error) {
      console.log("Error trayendo medios de pago:", error);
      setMediosDePagoReales(user?.mediosPago || []);
    }
  };

  // Se ejecuta al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      traerMediosDePago();
    }, [user])
  );

const eliminarMedioPago = async (id) => {
    const ejecutarEliminacion = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log("--- DEBUG ELIMINAR ---");
        console.log("1. ID del medio a eliminar:", id);

        if (token) {
          const url = `http://localhost:3000/usuarios/me/medios-pago/${id}`;
          console.log("2. URL a la que le pegamos:", url);

          const res = await axios.delete(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log("3. Éxito:", res.data);
          traerMediosDePago();
        }
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

 const guardarDireccion = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Asegurate de que esta sea la ruta correcta en tu backend
        await axios.put('http://localhost:3000/usuarios/me/direccion', 
          { direccion: direccion },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        Alert.alert('Éxito', 'Dirección actualizada correctamente');
        // Opcional: Actualizar el contexto del usuario aquí si fuera necesario
      }
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* 1. HEADER AZUL OSCURO */}
      <View style={styles.headerOscuro}>
        <Text style={styles.tituloHeader}>Mi perfil</Text>
      </View>

      {/* 2. SECCIÓN DE INFORMACIÓN DEL USUARIO */}
      <View style={styles.userInfoContainer}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarTexto}>{getInitials(user?.nombre)}</Text>
        </View>

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
          
          <View style={styles.badgeVerificado}>
            <Text style={styles.badgeVerificadoTexto}>
              {user?.verificado ? 'Usuario verificado' : 'No verificado'}
            </Text>
          </View>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  content: { paddingBottom: 40 },
  headerOscuro: { backgroundColor: '#1A2E4A', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  tituloHeader: { fontSize: 24, fontWeight: 'bold', color: '#C9973A' },
  userInfoContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, alignItems: 'center', justifyContent: 'space-between' },
  avatarContainer: { width: 60, height: 60, backgroundColor: '#C9973A', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarTexto: { fontSize: 22, fontWeight: 'bold', color: '#1A2E4A' },
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
});