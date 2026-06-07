import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions , 
  StyleSheet, ActivityIndicator, Alert, TextInput, Image, Dimensions
} from 'react-native';
import { subastasService } from '../services/api';
import { useAuth } from '../context/AuthContext';


export default function CatalogoScreen({ route, navigation }) {
  const { subasta } = route.params;
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [itemsFiltrados, setItemsFiltrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 32) / 2;

  useEffect(() => {
    cargarCatalogo();
  }, []);

  useEffect(() => {
    if (busqueda.trim() === '') {
      setItemsFiltrados(items);
    } else {
      const filtrados = items.filter(i =>
        i.nombre.toLowerCase().includes(busqueda.toLowerCase())
      );
      setItemsFiltrados(filtrados);
    }
  }, [busqueda, items]);

  const cargarCatalogo = async () => {
    setCargando(true);
    try {
      const res = await subastasService.catalogo(subasta.id);
      setItems(res.data);
      setItemsFiltrados(res.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el catálogo');
    } finally {
      setCargando(false);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'disponible') return { bg: '#797731', texto: '#E1FF38' };
    if (estado === 'vendido') return { bg: '#3A1000', texto: '#E8593C' };
    return { bg: '#124A1D', texto: '#4DAF52' }; // pujando
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH }]}
      onPress={() => navigation.navigate('DetalleItem', {
        subastaId: subasta.id,
        itemId: item.id,
        subasta: subasta
      })}
    >
      {/* Imagen principal */}
      {item.fotoPrincipal ? (
        <Image
          source={{ uri: item.fotoPrincipal }}
          style={styles.cardImagen}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardImagenPlaceholder}>
          <Text style={styles.cardImagenTexto}>🖼</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.cardInfo}>

        {/* Nombre */}
        <Text style={styles.cardNombre} numberOfLines={2}>
          #{item.id} {item.nombre}
        </Text>

        {/* Estado + Ver detalle en la misma fila */}
        
        <View style={styles.cardRow}>
          <View style={[styles.badge, { backgroundColor: getEstadoColor(item.estado).bg }]}>
            <Text style={[styles.badgeTexto, { color: getEstadoColor(item.estado).texto }]}>
              {item.estado.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.verDetalle}>Ver detalle →</Text>
        </View>

        {/* Precio alineado a la derecha */}
        <View style={styles.precioRow}>
          {user && item.precioBase ? (
            <Text style={styles.cardPrecio}>
              Base: ${item.precioBase?.toLocaleString('es-AR')}
            </Text>
          ) : (
            <Text style={styles.cardPrecioRestringido}>Precio restringido</Text>
          )}
        </View>

      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerBackTexto}>←</Text>
          <Text style={styles.headerTitulo}>Catálogo #{subasta.id}</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda — fondo gris */}
      <View style={styles.busquedaContainer}>
        <TextInput
          style={styles.busquedaInput}
          placeholder="Buscar ítem..."
          placeholderTextColor="#aaa"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Lista */}
      {cargando ? (
        <ActivityIndicator size="large" color="#C9973A" style={styles.loader} />
      ) : (
        <FlatList
          data={itemsFiltrados}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          numColumns={2}
          columnWrapperStyle={styles.columnas}
          ListEmptyComponent={
            <Text style={styles.vacio}>No se encontraron ítems</Text>
          }
          onRefresh={cargarCatalogo}
          refreshing={cargando}
          ListFooterComponent={
            !user ? (
              <View style={styles.restriccionBox}>
                <Text style={styles.restriccionTitulo}>Visualización restringida</Text>
                <Text style={styles.restriccionTexto}>
                  Solo usuarios registrados pueden ver los precios base
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.restriccionLink}>Iniciar sesión</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBackTexto: {
    color: '#C9973A',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerTitulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C9973A',
  },
  busquedaContainer: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  busquedaInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    color: '#1A2E4A',
    fontSize: 14,
  },
  loader: {
    flex: 1,
  },
  lista: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  columnas: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardImagen: {
    width: '100%',
    height: 110,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
    cardImagenPlaceholder: {
    width: '100%',
    height: 110,
    backgroundColor: '#2a3e5a',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  cardImagenTexto: {
    fontSize: 40,
  },
  cardInfo: {
    padding: 10,
  },
  cardNombre: {
    fontSize: 15,
    fontWeight: 500,
    color: '#C9973A',
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeTexto: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  verDetalle: {
    color: '#C9973A',
    fontSize: 12,
    fontWeight: '400',
  },
  precioRow: {
    alignItems: 'flex-end',
  },
  cardPrecio: {
    color: '#8a9bbc',
    fontSize: 16,
    fontWeight: '450',
  },
  cardPrecioRestringido: {
    color: '#aaa',
    fontSize: 10,
    fontStyle: 'italic',
  },
  vacio: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
restriccionBox: {
    backgroundColor: '#ec6e5554',
    borderRadius: 10,
    padding: 16,
    margin: 10,
    alignItems: 'center',
  },
  restriccionTitulo: {
    color: '#E8593C',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  restriccionTexto: {
    color: '#E8593C',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  restriccionLink: {
    color: '#E8593C',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },

});