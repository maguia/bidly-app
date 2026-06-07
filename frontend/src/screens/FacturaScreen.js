import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function FacturaScreen({ route, navigation }) {
  const { factura, item, subasta } = route.params;
  const { user } = useAuth();

  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Factura de compra</Text>
      </View>

      <View style={styles.body}>

        {/* Logo y título */}
        <View style={styles.facturaHeader}>
          <Text style={styles.facturaMarca}>Bidly</Text>
          <Text style={styles.facturaSubtitulo}>Comprobante de compra</Text>
          <Text style={styles.facturaFecha}>{fecha}</Text>
        </View>

        {/* Separador */}
        <View style={styles.separador} />

        {/* Datos del comprador */}
        <Text style={styles.seccionTitulo}>COMPRADOR</Text>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Nombre</Text>
          <Text style={styles.filaValor}>{user?.nombre}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Email</Text>
          <Text style={styles.filaValor}>{user?.email}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Dirección de envío</Text>
          <Text style={styles.filaValor}>{user?.domicilio || 'No registrada'}</Text>
        </View>

        {/* Separador */}
        <View style={styles.separador} />

        {/* Datos del ítem */}
        <Text style={styles.seccionTitulo}>BIEN ADQUIRIDO</Text>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Ítem</Text>
          <Text style={styles.filaValor}>#{factura.itemId} — {item?.nombre}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Descripción</Text>
          <Text style={styles.filaValor}>{item?.descripcion}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Subasta</Text>
          <Text style={styles.filaValor}>#{subasta?.id} — {subasta?.nombre}</Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Martillero</Text>
          <Text style={styles.filaValor}>{subasta?.martillero}</Text>
        </View>

        {/* Separador */}
        <View style={styles.separador} />

        {/* Detalle de pago */}
        <Text style={styles.seccionTitulo}>DETALLE DE PAGO</Text>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Precio de remate</Text>
          <Text style={styles.filaValor}>
            ${factura.importe?.toLocaleString('es-AR')} {subasta?.moneda}
          </Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Comisión subastadora</Text>
          <Text style={styles.filaValor}>
            ${factura.comision?.toLocaleString('es-AR')} {subasta?.moneda}
          </Text>
        </View>
        <View style={styles.filaInfo}>
          <Text style={styles.filaLabel}>Envío a domicilio</Text>
          <Text style={styles.filaValorDestacado}>A confirmar</Text>
        </View>

        {/* Total */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValor}>
            ${factura.total?.toLocaleString('es-AR')} {subasta?.moneda}
          </Text>
          <Text style={styles.totalNota}>+ costo de envío a confirmar</Text>
        </View>

        {/* Nota */}
        <View style={styles.notaBox}>
          <Ionicons name="information-circle-outline" size={16} color="#C9973A" />
          <Text style={styles.notaTexto}>
            Recibirás un mensaje privado con el detalle del envío y los pasos para coordinar la entrega o retiro del bien.
          </Text>
        </View>

        {/* Botón volver */}
        <TouchableOpacity
          style={styles.boton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.botonTexto}>VOLVER AL INICIO</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volver: {
    color: '#C9973A',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C9973A',
  },
  body: {
    padding: 20,
  },
  facturaHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  facturaMarca: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A2E4A',
    fontStyle: 'italic',
  },
  facturaSubtitulo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  facturaFecha: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  separador: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 16,
  },
  seccionTitulo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 10,
  },
  filaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  filaLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  filaValor: {
    fontSize: 13,
    color: '#1A2E4A',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  filaValorDestacado: {
    fontSize: 13,
    color: '#C9973A',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  totalBox: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 12,
    color: '#aaa',
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalValor: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C9973A',
  },
  totalNota: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 4,
  },
  notaBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  notaTexto: {
    fontSize: 12,
    color: '#444',
    flex: 1,
    lineHeight: 18,
  },
  boton: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});