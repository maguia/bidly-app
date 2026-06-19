import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function HistorialScreen({ navigation }) {
  const [historial, setHistorial] = useState({ totalSubastas: 0, totalOfertado: 0, participaciones: [] });

  useFocusEffect(
    useCallback(() => {
      const fetchHistorial = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          const res = await axios.get('http://localhost:3000/usuarios/me/historial', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setHistorial(res.data);
        } catch (error) {
          console.error("Error al cargar historial:", error);
        }
      };
      fetchHistorial();
    }, [])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Historial</Text>
        <Ionicons name="time-outline" size={24} color="#C9973A" />
      </View>

      {/* Cards de resumen */}
      <View style={styles.resumenContainer}>
        <View style={styles.cardResumen}><Text style={styles.nro}>{historial.totalSubastas}</Text><Text>Subastas</Text></View>
        <View style={styles.cardResumen}><Text style={styles.nro}>{historial.ganadas}</Text><Text>Ganadas</Text></View>
        <View style={styles.cardResumen}><Text style={styles.nro}>${historial.totalOfertado.toLocaleString()}</Text><Text>Ofertado</Text></View>
      </View>

      {/* Lista de participaciones */}
      <FlatList
        data={historial.participaciones}
        keyExtractor={(item) => item.subastaId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemCard} onPress={() => navigation.navigate('DetallePuja', { subastaId: item.subastaId })}>
            <View>
              <Text style={styles.itemNombre}>{item.itemNombre}</Text>
              <Text style={styles.subInfo}>Subasta #{item.subastaId} - Tu última puja: ${item.ultimaPuja}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: item.resultado === 'ganada' ? '#2e7d32' : '#c62828' }]}>
              <Text style={styles.badgeText}>{item.resultado.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e0e0e0' },
  header: { backgroundColor: '#1A2E4A', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { color: '#C9973A', fontSize: 20, fontWeight: 'bold' },
  resumenContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-around' },
  cardResumen: { backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', width: '30%' },
  nro: { fontWeight: 'bold', fontSize: 16 },
  itemCard: { backgroundColor: '#1A2E4A', marginHorizontal: 20, padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre: { color: '#fff', fontWeight: 'bold' },
  subInfo: { color: '#aaa', fontSize: 12 },
  badge: { padding: 5, borderRadius: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});