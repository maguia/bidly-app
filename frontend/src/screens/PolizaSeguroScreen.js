import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { consignacionesService } from '../services/api';

export default function PolizaSeguroScreen({ route, navigation }) {
  const { consignacionId } = route.params;
  const [seguro, setSeguro] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        try {
          const res = await consignacionesService.seguro(consignacionId);
          setSeguro(res.data);
        } catch (error) {
          console.log('Error cargando seguro:', error);
        }
      };
      cargar();
    }, [consignacionId])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Póliza de seguro</Text>
      </View>

      <View style={styles.body}>
        {!seguro ? (
          <ActivityIndicator color="#1A2E4A" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.documentoBox}>
            <Ionicons name="document-text-outline" size={48} color="#1A2E4A" />
            <Text style={styles.documentoTitulo}>Póliza activa</Text>

            <View style={styles.filaInfo}>
              <Text style={styles.filaLabel}>Compañía</Text>
              <Text style={styles.filaValor}>{seguro.compania}</Text>
            </View>
            <View style={styles.filaInfo}>
              <Text style={styles.filaLabel}>Número de póliza</Text>
              <Text style={styles.filaValor}>{seguro.nroPoliza}</Text>
            </View>
            <View style={styles.filaInfo}>
              <Text style={styles.filaLabel}>Cobertura</Text>
              <Text style={styles.filaValor}>{seguro.polizaCombinada === 'si' ? 'Combinada' : 'Individual'}</Text>
            </View>
            <View style={styles.filaInfo}>
              <Text style={styles.filaLabel}>Monto asegurado</Text>
              <Text style={styles.filaValor}>$ {seguro.importe?.toLocaleString('es-AR')}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.boton}
          onPress={() => navigation.navigate('RedireccionAseguradora', { compania: seguro?.compania || 'tu aseguradora' })}
          disabled={!seguro}
        >
          <Text style={styles.botonTexto}>MEJORAR PÓLIZA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  header: { backgroundColor: '#1A2E4A', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerTitulo: { fontSize: 18, fontWeight: 'bold', color: '#C9973A' },
  body: { padding: 20 },
  documentoBox: { backgroundColor: '#fff', borderRadius: 10, padding: 24, alignItems: 'center', marginBottom: 24 },
  documentoTitulo: { color: '#1A2E4A', fontSize: 15, fontWeight: 'bold', marginTop: 8, marginBottom: 16 },
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  filaLabel: { color: '#666', fontSize: 13 },
  filaValor: { color: '#1A2E4A', fontSize: 13, fontWeight: '600' },
  boton: { backgroundColor: '#E8593C', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});