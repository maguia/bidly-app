import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { usuarioService } from '../services/api';

const ICONOS = {
  consignacion: 'cube-outline',
  venta: 'cash-outline',
  usuario_invalido: 'alert-circle-outline',
  medio_rechazado: 'card-outline',
  categoria: 'star-outline',
};

function tiempoRelativo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime();
  const minutos = Math.floor(diff / 60000);
  if (minutos < 1) return 'Recién';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} d`;
}

export default function NotificacionesScreen({ navigation }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

useFocusEffect(
  useCallback(() => {
    const cargar = async () => {
      try {
        const res = await usuarioService.notificaciones();
        setNotificaciones(res.data.notificaciones || []);
      } catch (error) {
        console.log('Error cargando notificaciones:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
    const intervalo = setInterval(cargar, 5000);
    return () => clearInterval(intervalo);
  }, [])
);

  const handlePress = async (notif) => {
    if (!notif.leida) {
      try { await usuarioService.marcarNotificacionLeida(notif.id); } catch {}
      setNotificaciones(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n));
    }

    const d = notif.datos;
    if (!d) return;

    if (notif.tipo === 'consignacion' && d.consignacionId) {
      navigation.navigate('DetalleConsignacion', { consignacionId: d.consignacionId });
    } else if (notif.tipo === 'venta' && d.subastaId && d.itemId) {
      navigation.navigate('DetalleItem', { subastaId: d.subastaId, itemId: d.itemId });
    } else if (d.pantalla) {
      navigation.navigate(d.pantalla);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Notificaciones</Text>
      </View>

      <FlatList
        data={notificaciones}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        ListEmptyComponent={
          !cargando && <Text style={styles.vacio}>No tenés notificaciones todavía.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.leida && styles.cardNoLeida]}
            onPress={() => handlePress(item)}
          >
            <View style={styles.iconoBox}>
              <Ionicons name={ICONOS[item.tipo] || 'notifications-outline'} size={20} color="#C9973A" />
            </View>
            <View style={styles.cardTexto}>
              <Text style={styles.cardTitulo}>{item.titulo}</Text>
              <Text style={styles.cardMensaje}>{item.mensaje}</Text>
              <Text style={styles.cardFecha}>{tiempoRelativo(item.fecha)}</Text>
            </View>
            {!item.leida && <View style={styles.puntoNoLeida} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  header: { backgroundColor: '#1A2E4A', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerTitulo: { fontSize: 18, fontWeight: 'bold', color: '#C9973A' },
  lista: { padding: 16 },
  vacio: { textAlign: 'center', color: '#666', marginTop: 40, fontStyle: 'italic' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, alignItems: 'flex-start' },
  cardNoLeida: { backgroundColor: '#fff7ec' },
  iconoBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A2E4A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTexto: { flex: 1 },
  cardTitulo: { color: '#1A2E4A', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  cardMensaje: { color: '#444', fontSize: 12, lineHeight: 17, marginBottom: 4 },
  cardFecha: { color: '#999', fontSize: 11 },
  puntoNoLeida: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8593C', marginLeft: 8, marginTop: 4 },
});