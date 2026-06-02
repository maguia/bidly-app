import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { subastasService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [subastas, setSubastas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarSubastas();
  }, []);

  const cargarSubastas = async () => {
    setCargando(true);
    try {
      const res = await subastasService.listar();
      setSubastas(res.data);
    } catch (error) {
      const codigo = error.response?.status;
      if (codigo === 401) {
        Alert.alert('Sesión expirada', 'Por favor volvé a iniciar sesión');
        logout();
        navigation.replace('Login');
      } else {
        Alert.alert('Error', 'No se pudieron cargar las subastas');
      }
    } finally {
      setCargando(false);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'en_vivo') return '#4CAF50';
    if (estado === 'proximo') return '#C9973A';
    return '#999';
  };

  const getEstadoTexto = (estado) => {
    if (estado === 'en_vivo') return 'EN VIVO';
    if (estado === 'proximo') return 'PRÓXIMO';
    return 'FINALIZADO';
  };

  const renderSubasta = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        !item.accesoUsuario.puedePujar && styles.cardBloqueada
      ]}
      onPress={() => navigation.navigate('Catalogo', { subasta: item })}
    >
      {/* Header de la card */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitulo}>Subasta #{item.id} — {item.nombre}</Text>
        <View style={[styles.badge, { backgroundColor: getEstadoColor(item.estado) }]}>
          <Text style={styles.badgeTexto}>{getEstadoTexto(item.estado)}</Text>
        </View>
      </View>

      {/* Info */}
      <Text style={styles.cardInfo}>📍 {item.ubicacion}</Text>
      <Text style={styles.cardInfo}>📅 {new Date(item.fecha).toLocaleDateString('es-AR')} — {item.hora?.slice(11,16) || ''}</Text>
      <Text style={styles.cardInfo}>🏷️ Categoría requerida: {item.categoriaRequerida}</Text>
      <Text style={styles.cardInfo}>📦 {item.itemsRestantes} ítems restantes</Text>

      {/* Acceso */}
      {!item.accesoUsuario.puedePujar && (
        <Text style={styles.bloqueado}>⛔ {item.accesoUsuario.razonBloqueo}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Subastas</Text>
        {user && (
          <Text style={styles.headerCategoria}>
            Mi categoría: {user.categoria?.toUpperCase()}
          </Text>
        )}
      </View>

      {/* Lista */}
      {cargando ? (
        <ActivityIndicator size="large" color="#C9973A" style={styles.loader} />
      ) : (
        <FlatList
          data={subastas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSubasta}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay subastas disponibles</Text>
          }
          onRefresh={cargarSubastas}
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
  headerTitulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C9973A',
  },
  headerCategoria: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  lista: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  cardBloqueada: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#C9973A',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeTexto: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardInfo: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 4,
  },
  bloqueado: {
    color: '#E8593C',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  vacio: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
});