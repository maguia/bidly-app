import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput, Platform 
} from 'react-native';
import { subastasService } from '../services/api';
import { useAuth } from '../context/AuthContext';
//import DateTimePicker from '@react-native-community/datetimepicker';


// Solo importar en móvil
let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [subastas, setSubastas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [filtro, setFiltro] = useState('todas');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  useEffect(() => {
    cargarSubastas();
  }, [filtro, fechaSeleccionada]);

 const cargarSubastas = async () => {
    setCargando(true);
    try {
      let url = '/subastas';
      const hoy = new Date().toISOString().split('T')[0];
      
      if (filtro === 'hoy') {
        const res = await subastasService.listarConFiltro(`fecha=${hoy}`);
        setSubastas(res.data);
      } else if (filtro === 'fecha' && fechaSeleccionada) {
        const res = await subastasService.listarConFiltro(`fecha=${fechaSeleccionada}`);
        setSubastas(res.data);
      } else {
        const res = await subastasService.listar();
        setSubastas(res.data);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las subastas');
    } finally {
      setCargando(false);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'en_vivo') return '#4CAF50';
    if (estado === 'proximo') return '#C9973A';
    return '#999';
  };

  const getEstadoTexto = (estado) => {
    if (estado === 'en_vivo') return 'EN VIVO';
    if (estado === 'proximo') return 'PRÓXIMO';
    return 'FINALIZADO';
  };

 const renderSubasta = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        !item.accesoUsuario.puedePujar && styles.cardBloqueada
      ]}
      onPress={() => navigation.navigate('Catalogo', { subasta: item })}
    >
      {/* Header de la card */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitulo} numberOfLines={1}>
          Subasta #{item.id} — {item.nombre}
        </Text>
        <View style={[styles.badge, { backgroundColor: getEstadoColor(item.estado) }]}>
          <Text style={styles.badgeTexto}>{getEstadoTexto(item.estado)}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfoRow}>
        <Text style={styles.cardInfoIcon}>🔨</Text>
        <Text style={styles.cardInfoTexto}>
          Martillero: <Text style={styles.cardCategoria}>{item.martillero}</Text>
        </Text>
      </View>
      <View style={styles.cardInfoRow}>
        <Text style={styles.cardInfoIcon}>📍</Text>
        <Text style={styles.cardInfoTexto}>{item.ubicacion}</Text>
      </View>
      <View style={styles.cardInfoRow}>
        <Text style={styles.cardInfoIcon}>📅</Text>
        <Text style={styles.cardInfoTexto}>
          {new Date(item.fecha).toLocaleDateString('es-AR')} — {item.hora?.slice(11,16) || ''}
        </Text>
      </View>
      <View style={styles.cardInfoRow}>
        <Text style={styles.cardInfoIcon}>🏷️</Text>
        <Text style={styles.cardInfoTexto}>
          Categoría requerida: <Text style={styles.cardCategoria}>{item.categoriaRequerida}</Text>
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterLeft}>
          <Text style={styles.cardMoneda}>💲 {item.moneda === 'USD' ? 'Dólares' : 'Pesos'}</Text>
          {item.streaming && (
            <View style={styles.streamingBadge}>
              <Text style={styles.streamingTexto}>● Streaming</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardItems}>{item.itemsRestantes} ítems restantes</Text>
      </View>

      {/* Acceso */}
      {(!user || !item.accesoUsuario.puedePujar) && (
        <View style={styles.bloqueadoRow}>
          <Text style={styles.bloqueado}>
            ⛔ {!user ? 'Iniciá sesión para pujar' : item.accesoUsuario.razonBloqueo}
          </Text>
        </View>
      )}

      {user && item.accesoUsuario.puedePujar && (
        <View style={styles.pujarRow}>
          <Text style={styles.pujarTexto}>← Podés pujar</Text>
        </View>
      )}

    </TouchableOpacity>
  );

return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Subastas</Text>
        {user ? (
          <View style={styles.categoriabadge}>
            <Text style={styles.headerCategoria}>
              👤 Mi categoría: {user.categoria?.toUpperCase()}
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnTexto}>👤 Iniciar sesión</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros — fondo gris */}
      <View style={styles.filtrosContainer}>
        <View style={styles.filtros}>
          <TouchableOpacity
            style={[styles.filtroBtn, filtro === 'todas' && !mostrarCalendario && styles.filtroBtnActivo]}
            onPress={() => {
              setFiltro('todas');
              setFechaSeleccionada(null);
              setMostrarCalendario(false);
            }}
          >
            <Text style={[styles.filtroTexto, filtro === 'todas' && !mostrarCalendario && styles.filtroTextoActivo]}>
              Todas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBtn, filtro === 'hoy' && !mostrarCalendario && styles.filtroBtnActivo]}
            onPress={() => {
              setFiltro('hoy');
              setFechaSeleccionada(null);
              setMostrarCalendario(false);
            }}
          >
            <Text style={[styles.filtroTexto, filtro === 'hoy' && !mostrarCalendario && styles.filtroTextoActivo]}>
              Hoy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBtn, (filtro === 'fecha' || mostrarCalendario) && styles.filtroBtnActivo]}
            onPress={() => {
              setFiltro('fecha');
              setMostrarCalendario(true);
            }}
          >
            <Text style={[styles.filtroTexto, (filtro === 'fecha' || mostrarCalendario) && styles.filtroTextoActivo]}>
              {fechaSeleccionada
                ? new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-AR')
                : 'Seleccionar fecha'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Calendario — móvil */}
         {mostrarCalendario && Platform.OS !== 'web' && DateTimePicker && (
          <View style={styles.calendarioMovil}>
            <DateTimePicker
              value={fechaSeleccionada ? new Date(fechaSeleccionada) : new Date()}
              mode="date"
              display="default"
              style={{ alignSelf: 'center' }}
              onChange={(event, date) => {
                setMostrarCalendario(false);
                if (event.type !== 'dismissed' && date) {
                  const fechaStr = date.toISOString().split('T')[0];
                  setFechaSeleccionada(fechaStr);
                  setFiltro('fecha');
                }
              }}
            />
          </View>
        )}

        {/* Input fecha — solo web */}
        {mostrarCalendario && Platform.OS === 'web' && (
          <View style={styles.fechaWebBox}>
            <Text style={styles.fechaWebLabel}>Ingresá la fecha</Text>
            <TextInput
              style={styles.fechaWebInput}
              placeholder="DDMMAAAA"
              placeholderTextColor="#aaa"
              maxLength={8}
              keyboardType="numeric"
              onChangeText={(texto) => {
                const soloNumeros = texto.replace(/\D/g, '');
                if (soloNumeros.length === 8) {
                  const dia = soloNumeros.slice(0, 2);
                  const mes = soloNumeros.slice(2, 4);
                  const anio = soloNumeros.slice(4, 8);

                  if (parseInt(anio) < 2000 || parseInt(anio) > 2100) {
                    Alert.alert('Error', 'Ingresá un año válido (entre 2000 y 2100)');
                    return;
                  }
                  if (parseInt(mes) < 1 || parseInt(mes) > 12) {
                    Alert.alert('Error', 'Mes inválido');
                    return;
                  }
                  if (parseInt(dia) < 1 || parseInt(dia) > 31) {
                    Alert.alert('Error', 'Día inválido');
                    return;
                  }

                  const fechaStr = `${anio}-${mes}-${dia}`;
                  setFechaSeleccionada(fechaStr);
                  setFiltro('fecha');
                  setMostrarCalendario(false);
                }
              }}
              autoFocus
            />
            <TouchableOpacity
              style={styles.fechaWebCerrar}
              onPress={() => {
                setMostrarCalendario(false);
                if (!fechaSeleccionada) setFiltro('todas');
              }}
            >
              <Text style={styles.fechaWebCerrarTexto}>✕ Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Lista */}
      {cargando ? (
        <ActivityIndicator size="large" color="#C9973A" style={styles.loader} />
      ) : (
        <FlatList
          data={subastas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSubasta}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay subastas disponibles</Text>
          }
          onRefresh={cargarSubastas}
          refreshing={cargando}
        />
      )}

    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C9973A',
  },
  categoriabadge: {
    backgroundColor: '#C9973A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerCategoria: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  loginBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginBtnTexto: {
    color: '#1A2E4A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  lista: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#C9973A',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTexto: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardInfoIcon: {
    fontSize: 13,
    marginRight: 6,
    width: 20,
  },
  cardInfoTexto: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  cardCategoria: {
    color: '#C9973A',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a3e5a',
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMoneda: {
    color: '#C9973A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  streamingBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  streamingTexto: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardItems: {
    color: '#aaa',
    fontSize: 12,
  },
  bloqueadoRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a3e5a',
  },
  bloqueado: {
    color: '#E8593C',
    fontSize: 13,
    fontWeight: '600',
  },
  pujarRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a3e5a',
  },
  pujarTexto: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
  vacio: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
 
  fechaBox: {
    backgroundColor: '#1A2E4A',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  fechaInput: {
    backgroundColor: '#2a3e5a',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
  },
  
  fechaWebInput: {
    backgroundColor: '#2a3e5a',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
  },
 header: {
    backgroundColor: '#1A2E4A',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
filtrosContainer: {
    backgroundColor: '#E0E0E0',
    paddingTop: 12,
    paddingHorizontal: 14,
  },
  filtros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filtroBtn: {
    borderRadius: 10,
    paddingVertical: 7,
    backgroundColor: '#1A2E4A',
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filtroBtnActivo: {
    backgroundColor: '#C9973A',
  },
  filtroTexto: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  filtroTextoActivo: {
    color: '#fff',
  },
  fechaWebBox: {
    marginTop: 10,
    gap: 6,
  },
  fechaWebLabel: {
    color: '#444',
    fontSize: 12,
  },
  fechaWebInput: {
    backgroundColor: '#1A2E4A',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
  },
  fechaWebCerrar: {
    alignItems: 'center',
    padding: 6,
  },
  fechaWebCerrarTexto: {
    color: '#E8593C',
    fontSize: 13,
    fontWeight: 'bold',
  },
  calendarioMovil: {
    marginTop: 12,
    alignItems: 'center',
  },

});