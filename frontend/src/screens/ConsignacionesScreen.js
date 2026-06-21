import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { consignacionesService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ConsignacionesScreen({ navigation }) {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) { setCargando(false); return; }
      const cargar = async () => {
        setCargando(true);
        try {
          const res = await consignacionesService.listar();
          setSolicitudes(res.data.consignaciones || []);
        } catch (error) {
          console.log('Error cargando solicitudes:', error);
          setSolicitudes([]);
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [user])
  );

  if (!user) {
    return (
      <View style={styles.invitadoContainer}>
        <Ionicons name="cube-outline" size={80} color="#1A2E4A" />
        <Text style={styles.invitadoTitulo}>No tenés una cuenta activa</Text>
        <Text style={styles.invitadoTexto}>
          Iniciá sesión o registrate para consignar bienes y ver tus solicitudes.
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Mis solicitudes</Text>
      </View>

      <FlatList
        data={solicitudes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        ListEmptyComponent={
          !cargando && <Text style={styles.vacio}>Todavía no consignaste ningún bien.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DetalleConsignacion', { consignacionId: item.id })}
          >
            <Text style={styles.cardTexto}>Solicitud {item.numero}</Text>
            <View style={[styles.badge, { backgroundColor: item.estadoGeneral === 'rechazada'  ? '#c62828': '#2e7d32' }]}>
              <Ionicons name={item.estadoGeneral === 'rechazada' ? 'close' : 'checkmark'} size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.botonConsignar}
        onPress={() => navigation.navigate('ConsignarBien')}
      >
        <Text style={styles.botonConsignarTexto}>CONSIGNAR UN BIEN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  header: { backgroundColor: '#1A2E4A', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitulo: { fontSize: 22, fontWeight: 'bold', color: '#C9973A' },
  lista: { padding: 20, paddingBottom: 10 },
  vacio: { textAlign: 'center', color: '#666', marginTop: 40, fontStyle: 'italic' },
  card: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTexto: { color: '#fff', fontSize: 14, fontWeight: '600' },
  badge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  botonConsignar: { backgroundColor: '#E8593C', borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginHorizontal: 20, marginBottom: 20 },
  botonConsignarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  invitadoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#E0E0E0' },
  invitadoTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1A2E4A', marginTop: 16, textAlign: 'center' },
  invitadoTexto: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  invitadoBoton: { backgroundColor: '#1A2E4A', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40, marginBottom: 10 },
  invitadoBotonTexto: { color: '#C9973A', fontSize: 14, fontWeight: 'bold' },
  invitadoBotonSecundario: { borderWidth: 1, borderColor: '#1A2E4A', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40 },
  invitadoBotonSecundarioTexto: { color: '#1A2E4A', fontSize: 14, fontWeight: 'bold' },
});