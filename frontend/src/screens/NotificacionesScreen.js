import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function NotificacionesScreen({ navigation }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // Se ejecuta cada vez que entrás a la pantalla
  useFocusEffect(
    useCallback(() => {
      const traerNotificaciones = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            // --- ACÁ IRÁ TU LLAMADA AL BACKEND ---
            // const res = await axios.get('http://localhost:3000/notificaciones', {
            //   headers: { Authorization: `Bearer ${token}` }
            // });
            // setNotificaciones(res.data);
          }
        } catch (error) {
          console.log("Error trayendo notificaciones:", error);
        }
      };

      traerNotificaciones();
    }, [])
  );

  return (
    <View style={styles.container}>
      
      {/* 1. HEADER AZUL OSCURO */}
      <View style={styles.headerOscuro}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#C9973A" />
            <Text style={styles.tituloHeader}>Notificaciones</Text>
          </TouchableOpacity>
          <Ionicons name="notifications" size={24} color="#A0AAB5" />
        </View>
      </View>

      {/* 2. BARRA DE BÚSQUEDA */}
      <View style={styles.buscadorContainer}>
        <TextInput 
          style={styles.inputBusqueda}
          placeholder="Buscar usuario"
          placeholderTextColor="#A0AAB5"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* 3. LISTA DE NOTIFICACIONES */}
      <FlatList
        data={notificaciones}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listaContainer}
        ListEmptyComponent={
          <Text style={styles.textoVacio}>No tenés notificaciones nuevas.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.notifCard}>
            <Text style={styles.notifTexto}>{item.mensaje || 'Nueva notificación'}</Text>
          </View>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  headerOscuro: {
    backgroundColor: '#1A2E4A',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tituloHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C9973A',
  },
  buscadorContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputBusqueda: {
    backgroundColor: '#1A2E4A',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  listaContainer: {
    padding: 20,
  },
  textoVacio: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    marginTop: 40,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  notifTexto: {
    color: '#1A2E4A',
    fontSize: 14,
  }
});