import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { subastasService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DetallePujaScreen({ route, navigation }) {
  const { subastaId, itemId } = route.params;
  const { user } = useAuth();
  const [item, setItem] = useState({ pujas: [], nombreItem: '', precioBase: 0 });
  const [fechaSubasta, setFechaSubasta] = useState(null);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        const res = await subastasService.historial(subastaId);
        const encontrado = res.data.items.find(i => i.itemId === itemId);
        if (encontrado) setItem(encontrado);
        if (res.data.fecha) setFechaSubasta(res.data.fecha);
      } catch (error) {
        console.log('Error cargando detalle de puja:', error);
      }
    };
    load();
  }, [subastaId, itemId]));

  const pujaGanadora = item.pujas.find(p => p.ganador);
  const misPujas = item.pujas.filter(p => p.postorId === user?.id);
  const gane = misPujas.some(p => p.ganador);
  const competidores = new Set(
    item.pujas.filter(p => p.postorId !== user?.id).map(p => p.postorId)
  ).size;

  const fechaFormateada = fechaSubasta
    ? (() => {
        const d = new Date(fechaSubasta);
        return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      })()
    : '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.title}>Item: "{item.nombreItem}"</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitulo}>
          Subasta #{subastaId}. Finalizada {fechaFormateada}
        </Text>

        <View style={styles.resultadoRow}>
          <View>
            <Text style={styles.label}>Tu resultado</Text>
            <View style={[styles.badgeResultado, { backgroundColor: gane ? '#2e7d32' : '#c62828' }]}>
              <Text style={styles.badgeResultadoTexto}>{gane ? 'GANADA' : 'PERDIDA'}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Precio final pagado</Text>
            <Text style={styles.precioFinal}>$ {pujaGanadora?.monto?.toLocaleString('es-AR')}</Text>
          </View>
        </View>

        {gane && (
          <TouchableOpacity
            style={styles.botonFactura}
            onPress={() => navigation.navigate('Factura', { subastaId, itemId })}
          >
            <Text style={styles.botonFacturaTexto}>VER FACTURA</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{misPujas.length}</Text>
            <Text style={styles.statLabel}>Pujas tuyas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>$ {item.precioBase?.toLocaleString('es-AR')}</Text>
            <Text style={styles.statLabel}>Precio base</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{competidores}</Text>
            <Text style={styles.statLabel}>Competidores</Text>
          </View>
        </View>

        <View style={styles.leyendaRow}>
          <View style={styles.leyendaItem}>
            <View style={[styles.dot, { backgroundColor: '#C9973A' }]} />
            <Text style={styles.leyendaTexto}>Tu puja</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.dot, { backgroundColor: '#A0AAB5' }]} />
            <Text style={styles.leyendaTexto}>Otro postor</Text>
          </View>
        </View>

        <Text style={styles.seccionTitulo}>Historial de pujas - Orden cronológico</Text>

        {item.pujas.length === 0 ? (
          <Text style={styles.sinPujas}>No hay pujas registradas para este ítem</Text>
        ) : (
          [...item.pujas].reverse().map((p) => {
            const esMia = p.postorId === user?.id;
            return (
              <View key={p.pujaId} style={styles.pujaRow}>
                <View style={styles.pujaIzquierda}>
                  <View style={[styles.dot, { backgroundColor: esMia ? '#C9973A' : '#A0AAB5' }]} />
                  <Text style={styles.pujaMonto}>$ {p.monto?.toLocaleString('es-AR')}</Text>
                </View>
                <View style={[styles.badgeEstado, { backgroundColor: p.ganador ? '#2e7d32' : '#5c1f1f' }]}>
                  <Text style={[styles.badgeEstadoTexto, { color: p.ganador ? '#fff' : '#ff8a80' }]}>
                    {p.ganador ? 'GANADORA' : 'SUPERADA'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  header: { backgroundColor: '#1A2E4A', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 15 },
  title: { color: '#C9973A', fontSize: 18, fontWeight: 'bold', flexShrink: 1 },
  content: { padding: 20, paddingBottom: 40 },
  subtitulo: { color: '#1A2E4A', fontSize: 13, marginBottom: 16 },
  resultadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  label: { color: '#1A2E4A', fontSize: 12, marginBottom: 6 },
  badgeResultado: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' },
  badgeResultadoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  botonFactura: { backgroundColor: '#E8593C', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  botonFacturaTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  precioFinal: { color: '#C9973A', fontSize: 24, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#1A2E4A', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#A0AAB5', fontSize: 11, textAlign: 'center' },
  leyendaRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 20 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaTexto: { color: '#1A2E4A', fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  seccionTitulo: { fontSize: 14, fontWeight: 'bold', color: '#1A2E4A', marginBottom: 10 },
  sinPujas: { color: '#888', fontSize: 13, fontStyle: 'italic' },
  pujaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 8 },
  pujaIzquierda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pujaMonto: { color: '#1A2E4A', fontSize: 15, fontWeight: '600' },
  badgeEstado: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  badgeEstadoTexto: { fontSize: 10, fontWeight: 'bold' },
});