import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { usuarioService } from '../services/api';

export default function DeudasScreen({ navigation }) {
  const [deuda, setDeuda] = useState(null);
  const [medios, setMedios] = useState([]);
  const [medioSeleccionado, setMedioSeleccionado] = useState(null);
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [pagando, setPagando] = useState(false);

  useFocusEffect(
    useCallback(() => {
        const cargar = async () => {
        let deudaActual = null;
        try {
            const resDeuda = await usuarioService.deuda();
            deudaActual = resDeuda.data.deuda;
            setDeuda(deudaActual);
        } catch (error) {
            setDeuda(null);
        }
        try {
            const resMedios = await usuarioService.traerMediosPago();
            const todos = resMedios.data || [];
            const filtrados = todos.filter(m =>
            m.moneda === deudaActual?.moneda && (m.verificado === 1 || m.verificado === true)
            );
            setMedios(filtrados);
        } catch (error) {
            setMedios([]);
        }
        };
        cargar();
    }, [])
    );

  const pagar = async () => {
    if (!medioSeleccionado) {
      Alert.alert('Error', 'Elegí un medio de pago para cobrar la deuda');
      return;
    }
    setPagando(true);
    try {
      await usuarioService.pagarDeuda(medioSeleccionado.id);
      const mensaje = 'Deuda saldada. Ya podés volver a pujar.';
      Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Éxito', mensaje);
      navigation.goBack();
    } catch (error) {
      const mensaje = error.response?.data?.mensaje || 'No se pudo procesar el pago';
      Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Error', mensaje);
    } finally {
      setPagando(false);
    }
  };

  if (!deuda) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#C9973A" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Deudas</Text>
        </View>
        <Text style={styles.sinDeuda}>No tenés deudas pendientes 🎉</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#C9973A" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Deudas</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.alertaIcono}>
          <Ionicons name="warning-outline" size={32} color="#1A2E4A" />
        </View>
        <Text style={styles.cuentaBloqueada}>Cuenta bloqueada</Text>
        <Text style={styles.cuentaBloqueadaSub}>No podés participar en subastas</Text>

        <Text style={styles.estadoLabel}>ESTADO</Text>
        <View style={styles.deudaBox}>
          <Text style={styles.deudaBoxTitulo}>Deuda pendiente de pago</Text>
          <Text style={styles.deudaBoxTexto}>Subasta #{deuda.subastaId} — {deuda.nombreItem}</Text>
          <Text style={styles.deudaBoxTexto}>Oferta no abonada: $ {deuda.ofertaOriginal?.toLocaleString('es-AR')}</Text>
        </View>

        <View style={styles.filaMonto}>
          <Text style={styles.montoLabel}>Oferta original</Text>
          <Text style={styles.montoValor}>$ {deuda.ofertaOriginal?.toLocaleString('es-AR')}</Text>
        </View>
        <View style={styles.filaMonto}>
          <Text style={styles.montoLabel}>Multa (10%)</Text>
          <Text style={styles.montoValor}>$ {deuda.multa?.toLocaleString('es-AR')}</Text>
        </View>
        <View style={[styles.filaMonto, styles.filaTotal]}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValor}>$ {deuda.total?.toLocaleString('es-AR')}</Text>
        </View>

        <Text style={styles.aviso}>
          Tenés <Text style={{ fontWeight: 'bold' }}>72 hs</Text> para abonar la oferta original. Si no lo hacés, el caso pasa a la justicia.
        </Text>

        <Text style={styles.selectorLabel}>Medio de pago para cobro</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setMostrarSelector(!mostrarSelector)}>
          <Text style={medioSeleccionado ? styles.selectorTexto : styles.selectorPlaceholder}>
            {medioSeleccionado ? medioSeleccionado.descripcion : 'Seleccionar medio de pago'}
          </Text>
          <Text style={styles.selectorFlecha}>▼</Text>
        </TouchableOpacity>

        {mostrarSelector && (
          <View style={styles.dropdown}>
            {medios.length === 0 ? (
              <Text style={styles.dropdownVacio}>No tenés medios de pago cargados</Text>
            ) : (
              medios.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.dropdownItem}
                  onPress={() => { setMedioSeleccionado(m); setMostrarSelector(false); }}
                >
                  <Text style={styles.dropdownTexto}>{m.descripcion}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.botonPagar, pagando && styles.botonDeshabilitado]}
          onPress={pagar}
          disabled={pagando}
        >
          <Text style={styles.botonPagarTexto}>{pagando ? 'PROCESANDO...' : 'PAGAR'}</Text>
        </TouchableOpacity>

        <Text style={styles.footerTexto}>Podés volver a pujar una vez que regularices</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  header: { backgroundColor: '#1A2E4A', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerTitulo: { color: '#C9973A', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  sinDeuda: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 15 },
  alertaIcono: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3dada', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  cuentaBloqueada: { fontSize: 18, fontWeight: 'bold', color: '#1A2E4A' },
  cuentaBloqueadaSub: { fontSize: 13, color: '#666', marginBottom: 20 },
  estadoLabel: { alignSelf: 'flex-start', fontSize: 12, color: '#666', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  deudaBox: { width: '100%', backgroundColor: '#e3a8a8', borderRadius: 8, padding: 14, marginBottom: 20 },
  deudaBoxTitulo: { fontWeight: 'bold', color: '#5c1f1f', marginBottom: 4 },
  deudaBoxTexto: { color: '#5c1f1f', fontSize: 13 },
  filaMonto: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  montoLabel: { color: '#1A2E4A', fontSize: 14 },
  montoValor: { color: '#1A2E4A', fontSize: 14, fontWeight: '600' },
  filaTotal: { borderTopWidth: 1, borderTopColor: '#bbb', marginTop: 6, paddingTop: 12 },
  totalLabel: { color: '#1A2E4A', fontSize: 15, fontWeight: 'bold' },
  totalValor: { color: '#1A2E4A', fontSize: 15, fontWeight: 'bold' },
  aviso: { width: '100%', color: '#1A2E4A', fontSize: 13, marginVertical: 18, lineHeight: 18 },
  selectorLabel: { alignSelf: 'flex-start', color: '#444', fontSize: 13, marginBottom: 6 },
  selector: { width: '100%', backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  selectorTexto: { color: '#fff', fontSize: 14 },
  selectorPlaceholder: { color: '#aaa', fontSize: 14 },
  selectorFlecha: { color: '#C9973A', fontSize: 12 },
  dropdown: { width: '100%', backgroundColor: '#1A2E4A', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a3e5a' },
  dropdownTexto: { color: '#fff', fontSize: 14 },
  dropdownVacio: { color: '#aaa', padding: 14, fontSize: 13 },
  botonPagar: { width: '100%', backgroundColor: '#E8593C', borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  botonDeshabilitado: { opacity: 0.6 },
  botonPagarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerTexto: { color: '#1A2E4A', fontSize: 12, textAlign: 'center', marginTop: 14 },
});