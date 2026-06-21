import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { consignacionesService } from '../services/api';

export default function DetalleConsignacionScreen({ route, navigation }) {
  const { consignacionId } = route.params;
  const [consig, setConsig] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        try {
          const res = await consignacionesService.detalle(consignacionId);
          setConsig(res.data);
        } catch (error) {
          console.log('Error cargando consignación:', error);
        }
      };
      cargar();
      const intervalo = setInterval(cargar, 5000);
      return () => clearInterval(intervalo);
    }, [consignacionId])
  );

  const confirmarEntrega = async () => {
    setEnviando(true);
    try {
      await consignacionesService.confirmarEntrega(consignacionId);
      const res = await consignacionesService.detalle(consignacionId);
      setConsig(res.data);
    } finally {
      setEnviando(false);
    }
  };

  if (!consig) return <View style={styles.container} />;

  const proceso = consig.estadoProceso;
  const pasoInteresada = !['enviada', 'rechazada_empresa'].includes(proceso);
  const pasoRecibido = ['inspeccion', 'aceptada_cliente', 'rechazada_inspeccion', 'finalizada', 'rechazada_final'].includes(proceso);
  const pasoInspeccion = pasoRecibido;

  const resultado =
    proceso === 'finalizada' ? 'A subastar' :
    ['rechazada_empresa', 'rechazada_inspeccion', 'rechazada_final'].includes(proceso) ? 'Devuelto' :
    null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Solicitud {consig.numero}</Text>
      </View>

      <View style={styles.body}>
        {proceso === 'enviada' && (
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerInfoTexto}>Tu solicitud está siendo evaluada por la empresa.</Text>
          </View>
        )}

        {proceso === 'rechazada_empresa' && (
          <View style={styles.bannerError}>
            <Text style={styles.bannerErrorTexto}>La empresa no mostró interés en este bien.</Text>
          </View>
        )}

        {proceso === 'interesada' && (
          <View style={styles.bannerExito}>
            <Text style={styles.bannerExitoTexto}>¡Empresa interesada! Enviá el bien a: {consig.direccionDestino}</Text>
          </View>
        )}

        <Text style={styles.seccionTitulo}>ESTADO DEL PROCESO</Text>
        <View style={styles.checklist}>
          <View style={styles.checkRow}>
            <Text style={styles.checkOk}>✓</Text>
            <Text style={styles.checkTexto}>Solicitud enviada</Text>
          </View>
          <View style={styles.checkRow}>
            <Text style={pasoInteresada ? styles.checkOk : styles.checkPendiente}>{pasoInteresada ? '✓' : '○'}</Text>
            <Text style={styles.checkTexto}>Empresa interesada</Text>
          </View>
          <View style={styles.checkRow}>
            <Text style={pasoRecibido ? styles.checkOk : styles.checkPendiente}>{pasoRecibido ? '✓' : '○'}</Text>
            <Text style={styles.checkTexto}>Bien recibido</Text>
          </View>
        </View>

        {proceso === 'interesada' && (
          <TouchableOpacity style={styles.botonPrimario} onPress={confirmarEntrega} disabled={enviando}>
            <Text style={styles.botonPrimarioTexto}>YA ENVIÉ / ENTREGUÉ EL BIEN</Text>
          </TouchableOpacity>
        )}

        {pasoInspeccion && (
          <>
            <TouchableOpacity
              style={styles.inspeccionRow}
              onPress={() => navigation.navigate('InspeccionConsignacion', { consignacionId: consig.id })}
              disabled={proceso === 'inspeccion'}
            >
              <Text style={styles.inspeccionTexto}>Ver inspección →</Text>
              <Text style={styles.inspeccionEstado}>
                {proceso === 'inspeccion' ? 'En curso' : 'Finalizada'}
              </Text>
            </TouchableOpacity>

            <View style={styles.filaResultado}>
              <Text style={styles.resultadoLabel}>Resultado</Text>
              <Text style={[styles.resultadoValor, resultado === 'A subastar' && styles.resultadoValorOk]}>
                {resultado || 'Pendiente'}
              </Text>
            </View>
          </>
        )}

        {proceso === 'finalizada' && (
          <>
            <Text style={styles.label}>Depósito Actual</Text>
            <View style={styles.cajaOscura}>
              <Text style={styles.cajaOscuraTexto}>Depósito Norte — Sector B</Text>
            </View>

            <TouchableOpacity
              style={styles.botonPrimario}
              onPress={() => navigation.navigate('PolizaSeguro', { consignacionId: consig.id })}
            >
              <Text style={styles.botonPrimarioTexto}>VER PÓLIZA DE SEGURO</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  inner: { paddingBottom: 40 },
  header: { backgroundColor: '#1A2E4A', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerTitulo: { fontSize: 18, fontWeight: 'bold', color: '#C9973A' },
  body: { padding: 20 },
  bannerInfo: { backgroundColor: '#dce6f5', borderRadius: 8, padding: 14, marginBottom: 16 },
  bannerInfoTexto: { color: '#1A2E4A', fontSize: 13 },
  bannerExito: { backgroundColor: '#dcefdc', borderRadius: 8, padding: 14, marginBottom: 16 },
  bannerExitoTexto: { color: '#1e5c1e', fontSize: 13, fontWeight: '600' },
  bannerError: { backgroundColor: '#f3dada', borderRadius: 8, padding: 14, marginBottom: 16 },
  bannerErrorTexto: { color: '#5c1f1f', fontSize: 13, fontWeight: '600' },
  seccionTitulo: { fontSize: 12, color: '#666', fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  checklist: { marginBottom: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkOk: { color: '#2e7d32', fontSize: 16, fontWeight: 'bold', width: 22 },
  checkPendiente: { color: '#aaa', fontSize: 16, width: 22 },
  checkTexto: { color: '#1A2E4A', fontSize: 14 },
  botonPrimario: { backgroundColor: '#E8593C', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  botonPrimarioTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  inspeccionRow: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  inspeccionTexto: { color: '#C9973A', fontSize: 14, fontWeight: '600' },
  inspeccionEstado: { color: '#fff', fontSize: 13 },
  filaResultado: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ccc', marginBottom: 20 },
  resultadoLabel: { color: '#666', fontSize: 13 },
  resultadoValor: { color: '#1A2E4A', fontSize: 13, fontWeight: '600' },
  resultadoValorOk: { color: '#2e7d32' },
  label: { fontSize: 13, color: '#1A2E4A', fontWeight: '600', marginBottom: 6 },
  cajaOscura: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, marginBottom: 14 },
  cajaOscuraTexto: { color: '#fff', fontSize: 13 },
});