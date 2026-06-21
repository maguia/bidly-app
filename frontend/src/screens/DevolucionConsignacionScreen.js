import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { consignacionesService } from '../services/api';

export default function DevolucionConsignacionScreen({ route, navigation }) {
  const { consignacionId } = route.params;
  const [insp, setInsp] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        try {
          const res = await consignacionesService.inspeccion(consignacionId);
          setInsp(res.data);
        } catch (error) {
          console.log('Error cargando devolución:', error);
        }
      };
      cargar();
    }, [consignacionId])
  );

  if (!insp) return <View style={styles.container} />;

  const esEnvio = insp.devolucionMetodo === 'envio';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Devolución del bien</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.facturaMarca}>Bidly</Text>
        <Text style={styles.facturaSubtitulo}>Comprobante de devolución</Text>

        <View style={styles.separador} />

        {esEnvio ? (
            <>
                <Text style={styles.bannerTexto}>
                {insp.estadoProceso === 'rechazada_inspeccion'
                    ? 'El bien no superó la inspección, así que nunca se llegó a confirmar un valor de venta. El envío de vuelta tiene un costo fijo, pendiente de pago en el medio que registraste al consignarlo.'
                    : 'Rechazaste las condiciones ofrecidas. El costo de envío se calculó sobre el valor base que te habían ofrecido, y queda pendiente de pago en el medio que registraste al consignarlo.'}
                </Text>

                {insp.estadoProceso !== 'rechazada_inspeccion' && (
                <View style={styles.filaInfo}>
                    <Text style={styles.filaLabel}>Valor base ofrecido</Text>
                    <Text style={styles.filaValor}>$ {insp.valorBaseOfrecido?.toLocaleString('es-AR')}</Text>
                </View>
                )}
                <View style={styles.filaInfo}>
                <Text style={styles.filaLabel}>Costo de envío</Text>
                <Text style={styles.filaValor}>$ {insp.costoEnvio?.toLocaleString('es-AR')}</Text>
                </View>

                <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>TOTAL PENDIENTE</Text>
                <Text style={styles.totalValor}>$ {insp.costoEnvio?.toLocaleString('es-AR')}</Text>
                </View>
            </>
            ) : (
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerInfoTexto}>
              Elegiste retirar el bien vos mismo. Podés pasar a buscarlo por: {insp.direccionDestino}
            </Text>
          </View>
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
  facturaMarca: { fontSize: 28, fontWeight: 'bold', color: '#1A2E4A', fontStyle: 'italic', textAlign: 'center' },
  facturaSubtitulo: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 4 },
  separador: { height: 1, backgroundColor: '#ccc', marginVertical: 16 },
  bannerTexto: { color: '#1A2E4A', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  bannerInfo: { backgroundColor: '#dce6f5', borderRadius: 8, padding: 14 },
  bannerInfoTexto: { color: '#1A2E4A', fontSize: 13, lineHeight: 19 },
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  filaLabel: { color: '#666', fontSize: 13 },
  filaValor: { color: '#1A2E4A', fontSize: 13, fontWeight: '600' },
  totalBox: { backgroundColor: '#1A2E4A', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  totalLabel: { fontSize: 12, color: '#aaa', letterSpacing: 1, marginBottom: 4 },
  totalValor: { fontSize: 24, fontWeight: 'bold', color: '#C9973A' },
});