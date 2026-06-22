import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { consignacionesService, formatearHoraArg  } from '../services/api';

export default function InspeccionConsignacionScreen({ route, navigation }) {
  const { consignacionId } = route.params;
  const [insp, setInsp] = useState(null);
  const [cvu, setCvu] = useState('');
  const [enviando, setEnviando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        try {
          const res = await consignacionesService.inspeccion(consignacionId);
          setInsp(res.data);
        } catch (error) {
          console.log('Error cargando inspección:', error);
        }
      };
      cargar();
    }, [consignacionId])
  );

  const rechazar = async () => {
    setEnviando(true);
    try {
      await consignacionesService.decisionFinal(consignacionId, false, null);
      navigation.replace('DevolucionConsignacion', { consignacionId });
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar tu decisión');
    } finally {
      setEnviando(false);
    }
  };

  const aceptar = async () => {
    const limpio = cvu.replace(/\D/g, '');
    if (limpio.length !== 22) {
      Alert.alert('Error', 'Ingresá un CVU válido de 22 dígitos');
      return;
    }
    setEnviando(true);
    try {
      await consignacionesService.decisionFinal(consignacionId, true, limpio);
      const res = await consignacionesService.inspeccion(consignacionId);
      setInsp(res.data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.mensaje || 'No se pudo procesar tu decisión');
    } finally {
      setEnviando(false);
    }
  };

  if (!insp) return <View style={styles.container} />;

  const proceso = insp.estadoProceso;
  const fueRechazado = proceso === 'rechazada_inspeccion' || proceso === 'rechazada_final';
  const pendienteDecision = proceso === 'aceptada_cliente';
  const finalizado = proceso === 'finalizada';
  const enCurso = proceso === 'inspeccion';
  const fechaFormateada = insp.subastaAsignada
    ? (() => {
        const d = new Date(insp.subastaAsignada.fecha);
        return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
        })()
    : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Estado de Inspección</Text>
      </View>

      <View style={styles.body}>
        {enCurso && (
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerInfoTexto}>La empresa está revisando el bien en persona. Te avisamos apenas termine.</Text>
          </View>
        )}

        {fueRechazado && (
          <>
            <Text style={styles.estadoLabel}>ESTADO</Text>
            <View style={styles.bannerRechazo}>
              <Text style={styles.bannerRechazoTexto}>✕ BIEN RECHAZADO</Text>
            </View>
            {insp.motivoRechazo && (
              <>
                <Text style={styles.label}>Motivo</Text>
                <View style={styles.cajaOscura}><Text style={styles.cajaOscuraTexto}>{insp.motivoRechazo}</Text></View>
              </>
            )}
            <TouchableOpacity
              style={styles.botonPrimario}
              onPress={() => navigation.navigate('DevolucionConsignacion', { consignacionId })}
            >
              <Text style={styles.botonPrimarioTexto}>VER DETALLES DE GASTOS</Text>
            </TouchableOpacity>
          </>
        )}

        {(pendienteDecision || finalizado) && (
          <>
            <Text style={styles.estadoLabel}>ESTADO</Text>
            <View style={styles.bannerAceptado}>
              <Text style={styles.bannerAceptadoTexto}>✓ BIEN ACEPTADO — Revisá las condiciones</Text>
            </View>

            <View style={styles.filaDato}>
              <Text style={styles.datoLabel}>Subasta Asignada</Text>
              <Text style={styles.datoValorDestacado}>
                {insp.subastaAsignada ? `${insp.subastaAsignada.numero} - ${insp.subastaAsignada.categoria}` : 'Sin asignar'}
              </Text>
            </View>
            <View style={styles.filaDato}>
              <Text style={styles.datoLabel}>Fecha</Text>
              <Text style={styles.datoValor}>{fechaFormateada} - {formatearHoraArg(insp.subastaAsignada?.hora)}hs</Text>
            </View>
            <View style={styles.filaDato}>
              <Text style={styles.datoLabel}>Valor Base Ofrecido</Text>
              <Text style={styles.datoValor}>$ {insp.valorBaseOfrecido?.toLocaleString('es-AR')}</Text>
            </View>
            <View style={styles.filaDato}>
              <Text style={styles.datoLabel}>Comisión</Text>
              <Text style={styles.datoValor}>{insp.comisionOfrecida}%</Text>
            </View>

            {pendienteDecision && (
              <>
                <Text style={styles.notaTexto}>Si rechazás, el bien será devuelto con cargo.</Text>
                <TouchableOpacity style={styles.botonRechazar} onPress={rechazar} disabled={enviando}>
                  <Text style={styles.botonRechazarTexto}>RECHAZAR — PEDIR DEVOLUCIÓN</Text>
                </TouchableOpacity>

                <Text style={styles.notaTexto}>Ingresá el CVU donde se acreditará el monto del bien una vez sea vendido.</Text>
                <Text style={styles.label}>CVU</Text>
                <TextInput
                  style={styles.input}
                  placeholder="22 dígitos"
                  placeholderTextColor="#aaa"
                  value={cvu}
                  onChangeText={setCvu}
                  keyboardType="numeric"
                  maxLength={22}
                />

                <TouchableOpacity style={styles.botonPrimario} onPress={aceptar} disabled={enviando}>
                  <Text style={styles.botonPrimarioTexto}>ACEPTAR CONDICIONES</Text>
                </TouchableOpacity>
              </>
            )}

            {finalizado && (
              <View style={styles.bannerInfo}>
                <Text style={styles.bannerInfoTexto}>Tu bien ya está cargado en el catálogo de la subasta. ¡Listo para subastarse!</Text>
              </View>
            )}
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
  estadoLabel: { fontSize: 12, color: '#666', fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  bannerRechazo: { backgroundColor: '#f3dada', borderRadius: 8, padding: 14, marginBottom: 16 },
  bannerRechazoTexto: { color: '#5c1f1f', fontSize: 13, fontWeight: '600' },
  bannerAceptado: { backgroundColor: '#dcefdc', borderRadius: 8, padding: 14, marginBottom: 16 },
  bannerAceptadoTexto: { color: '#1e5c1e', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, color: '#1A2E4A', fontWeight: '600', marginBottom: 6, marginTop: 10 },
  cajaOscura: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, marginBottom: 14 },
  cajaOscuraTexto: { color: '#fff', fontSize: 13 },
  filaDato: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  datoLabel: { color: '#666', fontSize: 13 },
  datoValor: { color: '#1A2E4A', fontSize: 13, fontWeight: '600' },
  datoValorDestacado: { color: '#C9973A', fontSize: 13, fontWeight: 'bold' },
  notaTexto: { color: '#1A2E4A', fontSize: 12, marginVertical: 14, lineHeight: 17 },
  input: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, fontSize: 14, color: '#fff', marginBottom: 14 },
  botonPrimario: { backgroundColor: '#E8593C', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  botonPrimarioTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  botonRechazar: { backgroundColor: '#E8593C', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  botonRechazarTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});