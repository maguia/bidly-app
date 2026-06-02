import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { subastasService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DetalleItemScreen({ route, navigation }) {
  const { subastaId, itemId, subasta } = route.params;
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [monto, setMonto] = useState('');
  const [pujando, setPujando] = useState(false);

  useEffect(() => {
    cargarDetalle();
  }, []);

  const cargarDetalle = async () => {
    setCargando(true);
    try {
      const res = await subastasService.itemDetalle(subastaId, itemId);
      setItem(res.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el detalle del ítem');
      navigation.goBack();
    } finally {
      setCargando(false);
    }
  };

  const handlePujar = async () => {
    // Validaciones
    if (!monto) {
      Alert.alert('Error', 'Ingresá un monto para pujar');
      return;
    }

    const montoNum = parseFloat(monto);

    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Error', 'El monto debe ser un número válido mayor a 0');
      return;
    }

    // Validar rango si aplica (no aplica para oro y platino)
    if (!item.sinLimitesPuja) {
      if (montoNum < item.rangoMinimo) {
        Alert.alert(
          'Monto muy bajo',
          `El monto mínimo es $${item.rangoMinimo?.toLocaleString('es-AR')}`
        );
        return;
      }
      if (montoNum > item.rangoMaximo) {
        Alert.alert(
          'Monto muy alto',
          `El monto máximo es $${item.rangoMaximo?.toLocaleString('es-AR')}`
        );
        return;
      }
    } else {
      // Oro y platino: solo debe superar la mejor oferta
      if (montoNum <= item.mejorOferta) {
        Alert.alert(
          'Monto insuficiente',
          `Tu oferta debe superar la mejor oferta actual de $${item.mejorOferta?.toLocaleString('es-AR')}`
        );
        return;
      }
    }

    setPujando(true);
    try {
      // Por ahora usamos un medioId fijo, en la entrega final se elige
      const res = await subastasService.pujar(subastaId, itemId, montoNum, 'mp_visa_4521');
      
      Alert.alert(
        '✅ Puja enviada',
        `Tu puja de $${montoNum.toLocaleString('es-AR')} fue registrada.\nID: ${res.data.pujaId}`,
        [{ text: 'OK', onPress: () => cargarDetalle() }]
      );
      setMonto('');
    } catch (error) {
      const codigo = error.response?.status;
      const datos = error.response?.data;

      if (codigo === 400) {
        Alert.alert(
          'Oferta fuera de rango',
          `Mínimo: $${datos.rangoMinimo?.toLocaleString('es-AR')}\nMáximo: $${datos.rangoMaximo?.toLocaleString('es-AR')}`
        );
      } else if (codigo === 423) {
        Alert.alert('Subasta no activa', 'Esta subasta no está abierta en este momento');
      } else if (codigo === 403) {
        Alert.alert('Sin permiso', 'No tenés habilitación para pujar en esta subasta');
      } else {
        Alert.alert('Error', 'No se pudo registrar la puja. Intentá de nuevo');
      }
    } finally {
      setPujando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#C9973A" />
      </View>
    );
  }

  const puedePublicar = subasta?.accesoUsuario?.puedePujar;

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>← Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitulo}>Ítem #{itemId}</Text>
          {puedePublicar && (
            <View style={styles.badgePujando}>
              <Text style={styles.badgePujandoTexto}>PUJANDO</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>

        {/* Info del ítem */}
        <Text style={styles.nombre}>{item?.nombre}</Text>
        <Text style={styles.descripcion}>{item?.descripcion}</Text>
        <Text style={styles.duenio}>Dueño actual: {item?.duenioActual}</Text>
        <Text style={styles.precioBase}>
          Precio Base: ${item?.precioBase?.toLocaleString('es-AR')}
        </Text>

        {/* Mejor oferta */}
        <View style={styles.mejorOfertaBox}>
          <Text style={styles.mejorOfertaLabel}>Mejor oferta actual</Text>
          <Text style={styles.mejorOfertaValor}>
            ${item?.mejorOferta?.toLocaleString('es-AR')}
          </Text>
        </View>

        {/* Rango válido */}
        {!item?.sinLimitesPuja && (
          <View style={styles.rangoBox}>
            <Text style={styles.rangoTexto}>
              Rango válido: ${item?.rangoMinimo?.toLocaleString('es-AR')} — ${item?.rangoMaximo?.toLocaleString('es-AR')}
            </Text>
            <Text style={styles.rangoNota}>
              Los límites no aplican a categorías Oro y Platino
            </Text>
          </View>
        )}

        {item?.sinLimitesPuja && (
          <View style={styles.rangoBox}>
            <Text style={styles.rangoTexto}>
              Sin límites de rango (categoría {user?.categoria})
            </Text>
          </View>
        )}

        {/* Historial de pujas */}
        <Text style={styles.seccionTitulo}>Historial de pujas</Text>
        {item?.historialPujas?.length === 0 && (
          <Text style={styles.sinPujas}>Aún no hay pujas para este ítem</Text>
        )}
        {item?.historialPujas?.map((p, index) => (
          <View key={index} style={styles.pujaRow}>
            <Text style={styles.pujaPostor}>Postor #{p.postorId}</Text>
            <Text style={[styles.pujaMonto, p.ganador && styles.pujaGanadora]}>
              ${p.monto?.toLocaleString('es-AR')} {p.ganador ? '🏆' : ''}
            </Text>
          </View>
        ))}

        {/* Formulario de puja */}
        {puedePublicar && item?.estado !== 'vendido' && (
          <View style={styles.pujarBox}>
            <Text style={styles.seccionTitulo}>Tu oferta</Text>
            <TextInput
              style={styles.input}
              placeholder={
                item?.sinLimitesPuja
                  ? `Mínimo: $${(item?.mejorOferta + 1)?.toLocaleString('es-AR')}`
                  : `Mínimo: $${item?.rangoMinimo?.toLocaleString('es-AR')}`
              }
              placeholderTextColor="#999"
              value={monto}
              onChangeText={setMonto}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.boton, pujando && styles.botonDeshabilitado]}
              onPress={handlePujar}
              disabled={pujando}
            >
              {pujando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.botonTexto}>OFERTAR AHORA</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {item?.estado === 'vendido' && (
          <View style={styles.vendidoBox}>
            <Text style={styles.vendidoTexto}>Este ítem ya fue vendido</Text>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  header: {
    backgroundColor: '#1A2E4A',
    padding: 20,
    paddingTop: 50,
  },
  volver: {
    color: '#C9973A',
    fontSize: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C9973A',
  },
  badgePujando: {
    backgroundColor: '#E8593C',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePujandoTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  body: {
    padding: 20,
  },
  nombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A2E4A',
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  duenio: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  precioBase: {
    fontSize: 14,
    color: '#1A2E4A',
    fontWeight: '600',
    marginBottom: 16,
  },
  mejorOfertaBox: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  mejorOfertaLabel: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 4,
  },
  mejorOfertaValor: {
    color: '#C9973A',
    fontSize: 32,
    fontWeight: 'bold',
  },
  rangoBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  rangoTexto: {
    color: '#1A2E4A',
    fontSize: 13,
    fontWeight: '600',
  },
  rangoNota: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A2E4A',
    marginBottom: 10,
    marginTop: 10,
  },
  sinPujas: {
    color: '#666',
    fontSize: 13,
    marginBottom: 10,
  },
  pujaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  pujaPostor: {
    color: '#1A2E4A',
    fontSize: 13,
  },
  pujaMonto: {
    color: '#1A2E4A',
    fontSize: 13,
    fontWeight: '600',
  },
  pujaGanadora: {
    color: '#4CAF50',
  },
  pujarBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1A2E4A',
    marginBottom: 12,
  },
  boton: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vendidoBox: {
    backgroundColor: '#999',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  vendidoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});