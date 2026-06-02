import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { subastasService } from '../services/api';

export default function CatalogoScreen({ route, navigation }) {
  const { subasta } = route.params;
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const cargarCatalogo = async () => {
    setCargando(true);
    try {
      const res = await subastasService.catalogo(subasta.id);
      setItems(res.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el catálogo');
    } finally {
      setCargando(false);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'disponible') return '#C9973A';
    if (estado === 'vendido') return '#999';
    return '#E8593C';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('DetalleItem', {
        subastaId: subasta.id,
        itemId: item.id,
        subasta: subasta
      })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitulo}>#{item.id} {item.nombre}</Text>
        <View style={[styles.badge, { backgroundColor: getEstadoColor(item.estado) }]}>
          <Text style={styles.badgeTexto}>{item.estado.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.cardPrecio}>Base: ${item.precioBase?.toLocaleString('es-AR')}</Text>
      <Text style={styles.cardComision}>Comisión: ${item.comision?.toLocaleString('es-AR')}</Text>

      <Text style={styles.verDetalle}>Ver detalle →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Catálogo #{subasta.id}</Text>
        <Text style={styles.headerSubtitulo}>{subasta.nombre}</Text>
      </View>

      {/* Lista */}
      {cargando ? (
        <ActivityIndicator size="large" color="#C9973A" style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          numColumns={2}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay ítems en este catálogo</Text>
          }
          onRefresh={cargarCatalogo}
          refreshing={cargando}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  header: {
    backgroundColor: '#1A2E4A',
    padding: 20,
    paddingTop: 50,
  },
  volver: {
    color: '#C9973A',
    fontSize: 16,
    marginBottom: 8,
  },
  headerTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C9973A',
  },
  headerSubtitulo: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  loader: {
    flex: 1,
  },
  lista: {
    padding: 10,
  },
  card: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    padding: 14,
    margin: 6,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitulo: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 4,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTexto: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardPrecio: {
    color: '#C9973A',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardComision: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 8,
  },
  verDetalle: {
    color: '#E8593C',
    fontSize: 12,
    fontWeight: '600',
  },
  vacio: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
});