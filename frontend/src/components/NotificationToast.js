import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationToast } from '../context/NotificationContext';
import { navigate } from '../../navigation/navigationRef';

const ICONOS = {
  consignacion: 'cube-outline',
  venta: 'cash-outline',
  usuario_invalido: 'alert-circle-outline',
  medio_rechazado: 'card-outline',
  categoria: 'star-outline',
};

export default function NotificationToast() {
  const { toast, cerrarToast } = useNotificationToast();
  const traslado = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.spring(traslado, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    const timer = setTimeout(() => {
      Animated.timing(traslado, { toValue: -150, duration: 250, useNativeDriver: true }).start(() => cerrarToast());
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: traslado }] }]}>
      <TouchableOpacity
        style={styles.toast}
        activeOpacity={0.9}
        onPress={() => { cerrarToast(); navigate('Notificaciones'); }}
      >
        <View style={styles.iconoBox}>
          <Ionicons name={ICONOS[toast.tipo] || 'notifications-outline'} size={18} color="#C9973A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} numberOfLines={1}>{toast.titulo}</Text>
          <Text style={styles.mensaje} numberOfLines={2}>{toast.mensaje}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 50, left: 12, right: 12, zIndex: 999 },
  toast: { backgroundColor: '#405f8b', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  iconoBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2a3e5a', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  titulo: { color: '#C9973A', fontSize: 13, fontWeight: 'bold' },
  mensaje: { color: '#fff', fontSize: 12, marginTop: 2 },
});