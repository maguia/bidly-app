import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { subastasService, usuarioService } from '../services/api';

export default function FacturaScreen({ route, navigation }) {
  const { subastaId, itemId } = route.params;
  const { user } = useAuth();
  const [factura, setFactura] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [metodo, setMetodo] = useState(null);
  const [medios, setMedios] = useState([]);
  const [medioSeleccionado, setMedioSeleccionado] = useState(null);
  const [mostrarMedios, setMostrarMedios] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        setCargando(true);
        try {
          const res = await subastasService.factura(subastaId, itemId);
          setFactura(res.data);
        } catch (error) {
          console.log('Error cargando factura:', error);
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [subastaId, itemId])
  );

  const confirmarEnvio = async () => {
    if (!metodo) { Alert.alert('Error', 'Elegí si lo retirás o querés que te lo enviemos'); return; }

    setConfirmando(true);
    try {
      await subastasService.confirmarEnvio(subastaId, itemId, metodo);
      const res = await subastasService.factura(subastaId, itemId);
      setFactura(res.data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.mensaje || 'No se pudo confirmar el envío');
    } finally {
      setConfirmando(false);
    }
  };

  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (cargando || !factura) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#C9973A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Factura de compra</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.facturaHeader}>
          <Text style={styles.facturaMarca}>Bidly</Text>
          <Text style={styles.facturaSubtitulo}>Comprobante de compra</Text>
          <Text style={styles.facturaFecha}>{fecha}</Text>
        </View>

        <View style={styles.separador} />

        <Text style={styles.seccionTitulo}>COMPRADOR</Text>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Nombre</Text>
          <Text style={styles.filaValor}>{user?.nombre}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Email</Text>
          <Text style={styles.filaValor}>{user?.email}</Text>
        </View>

        <View style={styles.separador} />

        <Text style={styles.seccionTitulo}>BIEN ADQUIRIDO</Text>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Ítem</Text>
          <Text style={styles.filaValor}>#{factura.itemId} — {factura.nombreItem}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Descripción</Text>
          <Text style={styles.filaValor}>{factura.descripcion}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Subasta</Text>
          <Text style={styles.filaValor}>#{factura.subastaId}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Martillero</Text>
          <Text style={styles.filaValor}>{factura.martillero}</Text>
        </View>

        <View style={styles.separador} />

        <Text style={styles.seccionTitulo}>DETALLE DE PAGO</Text>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Precio de remate</Text>
          <Text style={styles.filaValor}>${factura.importe?.toLocaleString('es-AR')} {factura.moneda}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Comisión subastadora</Text>
          <Text style={styles.filaValor}>${factura.comision?.toLocaleString('es-AR')} {factura.moneda}</Text>
        </View>

        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Envío</Text>
          <Text style={styles.filaValorDestacado}>
            {!factura.envioMetodo ? 'A confirmar'
              : factura.envioMetodo === 'retiro' ? 'Retira el comprador'
              : `$${factura.envioCosto?.toLocaleString('es-AR')} ${factura.moneda}`}
          </Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValor}>${factura.total?.toLocaleString('es-AR')} {factura.moneda}</Text>
        </View>

        {!factura.envioMetodo && (
          <>
            <Text style={styles.preguntaTitulo}>¿Cómo querés recibir el bien?</Text>
            <View style={styles.opcionesRow}>
              <TouchableOpacity
                style={[styles.opcionBoton, metodo === 'retiro' && styles.opcionBotonActivo]}
                onPress={() => setMetodo('retiro')}
              >
                <Text style={[styles.opcionTexto, metodo === 'retiro' && styles.opcionTextoActivo]}>Retiro en persona</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.opcionBoton, metodo === 'envio' && styles.opcionBotonActivo]}
                onPress={() => setMetodo('envio')}
              >
                <Text style={[styles.opcionTexto, metodo === 'envio' && styles.opcionTextoActivo]}>Abono el envio</Text>
              </TouchableOpacity>
            </View>

          

            <TouchableOpacity style={styles.boton} onPress={confirmarEnvio} disabled={confirmando}>
              {confirmando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>CONFIRMAR</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.botonSecundario}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Inicio' })}
        >
          <Text style={styles.botonSecundarioTexto}>VOLVER AL INICIO</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0E0E0' },
  header: { backgroundColor: '#1A2E4A', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  volver: { color: '#C9973A', fontSize: 22, fontWeight: 'bold' },
  headerTitulo: { fontSize: 20, fontWeight: 'bold', color: '#C9973A' },
  body: { padding: 20 },
  facturaHeader: { alignItems: 'center', marginBottom: 20 },
  facturaMarca: { fontSize: 32, fontWeight: 'bold', color: '#1A2E4A', fontStyle: 'italic' },
  facturaSubtitulo: { fontSize: 14, color: '#666', marginTop: 4 },
  facturaFecha: { fontSize: 12, color: '#999', marginTop: 4 },
  separador: { height: 1, backgroundColor: '#ccc', marginVertical: 16 },
  seccionTitulo: { fontSize: 12, fontWeight: 'bold', color: '#999', letterSpacing: 1, marginBottom: 10 },
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  filaLabel: { fontSize: 13, color: '#666', flex: 1 },
  filaValor: { fontSize: 13, color: '#1A2E4A', fontWeight: '600', flex: 2, textAlign: 'right' },
  filaValorDestacado: { fontSize: 13, color: '#C9973A', fontWeight: '600', flex: 2, textAlign: 'right' },
  totalBox: { backgroundColor: '#1A2E4A', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  totalLabel: { fontSize: 12, color: '#aaa', letterSpacing: 1, marginBottom: 4 },
  totalValor: { fontSize: 28, fontWeight: 'bold', color: '#C9973A' },
  preguntaTitulo: { fontSize: 13, color: '#1A2E4A', fontWeight: '600', marginBottom: 10, marginTop: 4 },
  opcionesRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  opcionBoton: { flex: 1, borderWidth: 1, borderColor: '#1A2E4A', borderRadius: 8, padding: 12, alignItems: 'center' },
  opcionBotonActivo: { backgroundColor: '#1A2E4A' },
  opcionTexto: { color: '#1A2E4A', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  opcionTextoActivo: { color: '#C9973A' },
  selector: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 6 },
  selectorTexto: { color: '#fff', fontSize: 14 },
  selectorPlaceholder: { color: '#aaa', fontSize: 13 },
  selectorFlecha: { color: '#C9973A', fontSize: 12 },
  dropdown: { backgroundColor: '#1A2E4A', borderRadius: 8, marginBottom: 14, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a3e5a' },
  dropdownTexto: { color: '#fff', fontSize: 14 },
  dropdownVacio: { color: '#aaa', padding: 14, fontSize: 13 },
  boton: { backgroundColor: '#E8593C', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 14 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botonSecundario: { borderWidth: 1, borderColor: '#1A2E4A', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 40 },
  botonSecundarioTexto: { color: '#1A2E4A', fontSize: 14, fontWeight: 'bold' },
});