import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DetallePujaScreen({ route, navigation }) {
  const { subastaId } = route.params;
  const [data, setData] = useState({ historial: [] });

  useFocusEffect(useCallback(() => {
    const load = async () => {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/usuarios/me/historial/${subastaId}/pujas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    };
    load();
  }, [subastaId]));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#C9973A" /></TouchableOpacity>
        <Text style={styles.title}>Item: {data.descripcionCatalogo}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statVal}>${data.historial[0]?.importe}</Text><Text>Precio Final</Text></View>
        <View style={styles.stat}><Text style={styles.statVal}>${data.precioBase}</Text><Text>Base</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Historial de pujas</Text>
      <FlatList
        data={data.historial}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.price}>$ {item.importe}</Text>
            <Text style={styles.date}>{new Date(item.fecha).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e0e0e0' },
  header: { backgroundColor: '#1A2E4A', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  title: { color: '#C9973A', fontSize: 18, marginLeft: 15, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
  stat: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center' },
  statVal: { fontWeight: 'bold', fontSize: 18 },
  sectionTitle: { padding: 20, fontWeight: 'bold', color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 5, borderRadius: 5 },
  price: { fontWeight: 'bold' },
  date: { color: '#888', fontSize: 12 }
});