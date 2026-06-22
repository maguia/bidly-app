import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Image, 
  FlatList, Dimensions, Modal, useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subastasService, usuarioService, formatearHoraArg } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DetalleItemScreen({ route, navigation }) {
  const { subastaId, itemId, subasta } = route.params;
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [monto, setMonto] = useState('');
  const [pujando, setPujando] = useState(false);
  const [pujaActiva, setPujaActiva] = useState(null);
  const [estadoPuja, setEstadoPuja] = useState(null);
  const [segundosRestantes, setSegundosRestantes] = useState(60);
  const [factura, setFactura] = useState(null);
  const [medioSeleccionado, setMedioSeleccionado] = useState(null);
  const [mediosPago, setMediosPago] = useState([]);
  const [mostrarMedios, setMostrarMedios] = useState(false);
  const [imagenActiva, setImagenActiva] = useState(0);
  const [visorVisible, setVisorVisible] = useState(false);
  const [imagenInicial, setImagenInicial] = useState(0);
  const { width } = useWindowDimensions();

  useEffect(() => {
    cargarDetalle();
    if (user) cargarMedios();
    const intervalo = setInterval(async () => {
      if (!pujaActiva) {
        try {
          const res = await subastasService.itemDetalle(subastaId, itemId);
          setItem(res.data);
        } catch {}
      }
    }, 5000);
    return () => clearInterval(intervalo);
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

  const cargarMedios = async () => {
    try {
      const res = await usuarioService.perfil();
      const todos = res.data.mediosPago || [];
      console.log('Medios sin filtrar:', JSON.stringify(todos.map(m => ({ desc: m.descripcion, verificado: m.verificado, tipo: typeof m.verificado }))));
      const monedaSubasta = subasta?.moneda || 'ARS';
      const filtrados = todos.filter(m => 
        m.moneda === monedaSubasta && (m.verificado === 1 || m.verificado === true)
      );
      setMediosPago(filtrados);
      if (filtrados.length > 0) setMedioSeleccionado(filtrados[0]);
    } catch {}
  };

  const getEstadoColor = (estado) => {
    if (estado === 'disponible') return { bg: '#797731', texto: '#E1FF38' };
    if (estado === 'vendido') return { bg: '#3A1000', texto: '#E8593C' };
    return { bg: '#124A1D', texto: '#4DAF52' };
  };

  const iniciarPolling = (pujaId) => {
    let segundos = 20;
    setSegundosRestantes(20);

    const intervalo = setInterval(async () => {
      segundos -= 1;
      setSegundosRestantes(segundos);

      try {
        const res = await subastasService.estadoPuja(subastaId, itemId, pujaId);
        const estado = res.data.estado;
        if (estado === 'superada') {
          clearInterval(intervalo);
          setEstadoPuja('superada');
          cargarDetalle();
          return;
        }
      } catch {}

      if (segundos <= 0) {
        clearInterval(intervalo);
        try {
          const res = await subastasService.confirmarPuja(subastaId, itemId, pujaId);
          setFactura(res.data.factura);
          setEstadoPuja('ganadora');
          cargarDetalle();
        } catch {
          setEstadoPuja('superada');
          cargarDetalle();
        }
      }
    }, 1000);
  };

  const handlePujar = async () => {
    if (!monto) { Alert.alert('Error', 'Ingresá un monto para pujar'); return; }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { Alert.alert('Error', 'El monto debe ser un número válido mayor a 0'); return; }
    if (!medioSeleccionado) { Alert.alert('Error', 'Seleccioná un medio de pago'); return; }
    if (!item.sinLimitesPuja) {
      if (montoNum < item.rangoMinimo) { Alert.alert('Monto muy bajo', `El monto mínimo es $${item.rangoMinimo?.toLocaleString('es-AR')}`); return; }
      if (montoNum > item.rangoMaximo) { Alert.alert('Monto muy alto', `El monto máximo es $${item.rangoMaximo?.toLocaleString('es-AR')}`); return; }
    } else {
      if (montoNum <= item.mejorOferta) { Alert.alert('Monto insuficiente', `Tu oferta debe superar $${item.mejorOferta?.toLocaleString('es-AR')}`); return; }
    }

    setPujando(true);
    try {
      const res = await subastasService.pujar(subastaId, itemId, montoNum, medioSeleccionado.id);
      const { pujaId, expiraEn } = res.data;
      setPujaActiva({ pujaId, monto: montoNum, expiraEn });
      setEstadoPuja('esperando_confirmacion');
      setMonto('');
      iniciarPolling(pujaId);
    } catch (error) {
      const codigo = error.response?.status;
      const datos = error.response?.data;
      if (codigo === 400) Alert.alert('Oferta fuera de rango', `Mínimo: $${datos.rangoMinimo?.toLocaleString('es-AR')}\nMáximo: $${datos.rangoMaximo?.toLocaleString('es-AR')}`);
      else if (codigo === 402) Alert.alert('Fondos insuficientes', datos.mensaje);
      else if (codigo === 423) Alert.alert('Subasta no activa', 'Esta subasta no está abierta en este momento');
      else Alert.alert('Error', 'No se pudo registrar la puja');
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

  const puedePublicar = user && subasta?.accesoUsuario?.puedePujar;
  const estadoColor = getEstadoColor(item?.estado);
  const estaVendido = item?.estado === 'vendido';
  const estaPujando = item?.estado === 'pujando';
  const estaEnVivo = subasta?.estado === 'en_vivo';
  const precioFinal = item?.historialPujas?.find(p => p.ganador)?.monto;

  return (
    <View style={styles.wrapper}>

      <ScrollView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.volver}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Ítem #{itemId}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor.bg }]}>
            <Text style={[styles.estadoTexto, { color: estadoColor.texto }]}>
              {item?.estado?.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.body}>

          {/* Carrusel de imágenes */}
          {item?.imagenes?.length > 0 ? (
            <View style={styles.carruselContainer}>
              <FlatList
                data={item.imagenes}
                keyExtractor={(_, index) => String(index)}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                  setImagenActiva(index);
                }}
                getItemLayout={(_, index) => ({
                  length: width - 40,
                  offset: (width - 40) * index,
                  index,
                })}
                renderItem={({ item: url, index }) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => { setImagenInicial(index); setVisorVisible(true); }}
                  >
                    <Image
                      source={{ uri: url }}
                      style={[styles.carruselImagen, { width: width - 40 }]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              />
              <View style={styles.carruselIndicadores}>
                {item.imagenes.map((_, index) => (
                  <View key={index} style={[styles.indicador, index === imagenActiva && styles.indicadorActivo]} />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.imagenBox}>
              <Text style={styles.imagenTexto}>[ Imágenes del ítem · 6 fotos ]</Text>
            </View>
          )}

          {/* Info básica */}
          <Text style={styles.nombre}>"{item?.nombre}"</Text>
          <Text style={styles.descripcion}>{item?.descripcion}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.duenio}>Actual dueño: {item?.duenioActual}</Text>
            {user && item?.precioBase && (
              <Text style={styles.precioBase}>Precio Base: $ {item?.precioBase?.toLocaleString('es-AR')}</Text>
            )}
          </View>

          {/* SUBASTA VENDIDA */}
          {estaVendido && user && (
            <>
              <View style={styles.precioFinalBox}>
                <Text style={styles.precioFinalValor}>$ {precioFinal?.toLocaleString('es-AR') || item?.mejorOferta?.toLocaleString('es-AR')}</Text>
                <Text style={styles.precioFinalLabel}>Precio final</Text>
              </View>
              <Text style={styles.nuevoDuenio}>Nuevo dueño: Postor #{item?.historialPujas?.find(p => p.ganador)?.postorId}</Text>
              <View style={styles.finalizadaBox}>
                <Text style={styles.finalizadaTexto}>Subasta finalizada</Text>
              </View>
              <Text style={styles.seccionTitulo}>HISTORIAL DE PUJAS</Text>
              {item?.historialPujas?.map((p, index) => (
                <View key={index} style={[styles.pujaRow, p.ganador && styles.pujaGanadoraRow]}>
                  <Text style={styles.pujaPostor}>Postor #{p.postorId}</Text>
                  <Text style={[styles.pujaMonto, p.ganador && styles.pujaGanadoraMonto]}>$ {p.monto?.toLocaleString('es-AR')}</Text>
                </View>
              ))}
            </>
          )}

          {/* SUBASTA PRÓXIMA o DISPONIBLE EN VIVO */}
          {!estaVendido && !estaPujando && user && (
            <>
              <View style={styles.mejorOfertaBox}>
                <Text style={styles.mejorOfertaValor}>$ {item?.precioBase?.toLocaleString('es-AR')}</Text>
                <Text style={styles.mejorOfertaLabel}>Precio base</Text>
              </View>
              <Text style={styles.seccionTitulo}>HISTORIAL DE PUJAS</Text>
              {item?.historialPujas?.length === 0 ? (
                <Text style={styles.sinPujas}>Aún no hay pujas para este ítem</Text>
              ) : (
                <ScrollView style={styles.historialScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {item?.historialPujas?.map((p, index) => (
                    <View key={index} style={styles.pujaRow}>
                      <Text style={styles.pujaPostor}>Postor #{p.postorId}</Text>
                      <Text style={styles.pujaMonto}>$ {p.monto?.toLocaleString('es-AR')}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
              {!estaEnVivo && (
                <View style={styles.proximaBox}>
                  <Text style={styles.proximaTexto}>
                    Subasta comienza {new Date(subasta?.fecha + 'T00:00:00').toLocaleDateString('es-AR')} · {formatearHoraArg(subasta?.hora)} hs
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ÍTEM PUJANDO AHORA */}
          {estaPujando && user && (
            <>
              <View style={styles.mejorOfertaBox}>
                <Text style={styles.mejorOfertaValor}>$ {item?.mejorOferta?.toLocaleString('es-AR')}</Text>
                <Text style={styles.mejorOfertaLabel}>Mejor oferta actual</Text>
              </View>
              <Text style={styles.seccionTitulo}>HISTORIAL DE PUJAS</Text>
              {item?.historialPujas?.length === 0 ? (
                <Text style={styles.sinPujas}>Aún no hay pujas para este ítem</Text>
              ) : (
                <ScrollView style={styles.historialScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {item?.historialPujas?.map((p, index) => (
                    <View key={index} style={styles.pujaRow}>
                      <Text style={styles.pujaPostor}>Postor #{p.postorId}</Text>
                      <Text style={styles.pujaMonto}>$ {p.monto?.toLocaleString('es-AR')}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {puedePublicar && (
                <>
                  {!item?.sinLimitesPuja && item?.rangoMinimo && (
                    <View style={styles.rangoBox}>
                      <Text style={styles.rangoTexto}>
                        Rango válido: mín. $ {item?.rangoMinimo?.toLocaleString('es-AR')} — máx. $ {item?.rangoMaximo?.toLocaleString('es-AR')}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.inputLabel}>Tu oferta</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={item?.sinLimitesPuja ? `Superá la mejor oferta: $ ${item?.mejorOferta?.toLocaleString('es-AR')}` : `Mín. $ ${item?.rangoMinimo?.toLocaleString('es-AR')}`}
                    placeholderTextColor="#aaa"
                    value={monto}
                    onChangeText={setMonto}
                    keyboardType="numeric"
                  />
                  <Text style={styles.verificaTexto}>Verificá que tu medio de pago tenga fondos suficientes para cubrir la puja</Text>
                  <Text style={styles.inputLabel}>Medio de pago</Text>
                  <TouchableOpacity style={styles.medioSelector} onPress={() => setMostrarMedios(!mostrarMedios)}>
                    <Text style={styles.medioSelectorTexto}>{medioSeleccionado ? medioSeleccionado.descripcion : 'Seleccionar medio de pago'}</Text>
                    <Ionicons name="chevron-down" size={16} color="#aaa" />
                  </TouchableOpacity>
                  {mostrarMedios && (
                    <View style={styles.mediosDropdown}>
                      {mediosPago.length === 0 ? (
                        <View style={styles.medioItem}>
                          <Text style={styles.medioItemTexto}>No tenés medios de pago en {subasta?.moneda}</Text>
                        </View>
                      ) : (
                        mediosPago.map(m => (
                          <TouchableOpacity key={m.id} style={styles.medioItem} onPress={() => { setMedioSeleccionado(m); setMostrarMedios(false); }}>
                            <Text style={styles.medioItemTexto}>{m.descripcion}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.botonOfertar, pujando && styles.botonDeshabilitado]}
                    onPress={handlePujar}
                    disabled={pujando}
                  >
                    {pujando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonOfertarTexto}>OFERTAR AHORA</Text>}
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* Invitado */}
          {!user && (
            <View style={styles.restriccionBox}>
              <Text style={styles.restriccionTitulo}>Visualización restringida</Text>
              <Text style={styles.restriccionTexto}>Solo usuarios registrados pueden ver los precios base e historial de pujas</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.restriccionLink}>Iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── MODALES FUERA DEL SCROLLVIEW ── */}

      {/* Modal: Puja aceptada */}
      {estadoPuja === 'esperando_confirmacion' && pujaActiva && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalAceptada}>
            <Text style={styles.modalIcono}>✓</Text>
            <Text style={styles.modalTitulo}>¡Oferta recibida!</Text>
            <Text style={styles.modalTexto}>
              Tu oferta de{'\n'}
              <Text style={styles.modalMonto}>${pujaActiva.monto?.toLocaleString('es-AR')}</Text>
              {'\n'}fue aceptada. Esperamos {segundosRestantes}s{'\n'}para confirmar si ganaste.
            </Text>
            <View style={styles.modalBotonEsperando}>
              <Text style={styles.modalBotonEsperandoTexto}>Esperando confirmación...</Text>
            </View>
          </View>
        </View>
      )}

      {/* Modal: Puja ganadora */}
      {estadoPuja === 'ganadora' && pujaActiva && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalGanadora}>
            <Text style={styles.modalIcono}>✓</Text>
            <Text style={styles.modalTitulo}>¡Oferta ganadora!</Text>
            <Text style={styles.modalTexto}>
              Tu oferta fue la ganadora{'\n'}
              Sos el nuevo dueño de:{'\n'}
              <Text style={styles.modalNombreItem}>"{item?.nombre}"</Text>
            </Text>
            <TouchableOpacity
              style={styles.modalBotonPrimario}
              onPress={() => {
                setEstadoPuja(null);
                setPujaActiva(null);
                navigation.navigate('Factura', { subastaId, itemId });
              }}
            >
              <Text style={styles.modalBotonPrimarioTexto}>Ver factura</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEstadoPuja(null); setPujaActiva(null); setFactura(null); navigation.goBack(); }}>
              <Text style={styles.modalBotonSecundario}>Volver al catálogo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal: Puja superada */}
      {estadoPuja === 'superada' && pujaActiva && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSuperada}>
            <Text style={styles.modalIconoAlerta}>!</Text>
            <Text style={styles.modalTituloSuperada}>¡Alguien superó tu oferta!</Text>
            <Text style={styles.modalTextoSuperada}>Otro postor ofreció más mientras esperabas. Podés volver a pujar antes de que cierre el ítem.</Text>
            <TouchableOpacity style={styles.modalBotonVolverPujar} onPress={() => { setEstadoPuja(null); setPujaActiva(null); }}>
              <Text style={styles.modalBotonVolverPujarTexto}>Volver a pujar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.modalBotonAbandonar}>Abandonar este ítem</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Visor pantalla completa */}
      <Modal visible={visorVisible} transparent onRequestClose={() => setVisorVisible(false)}>
        <View style={styles.visorContainer}>
          <TouchableOpacity style={styles.visorCerrar} onPress={() => setVisorVisible(false)}>
            <Text style={styles.visorCerrarTexto}>✕</Text>
          </TouchableOpacity>
          <FlatList
            data={item?.imagenes || []}
            keyExtractor={(_, index) => String(index)}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            initialScrollIndex={imagenInicial}
            getItemLayout={(_, index) => ({
              length: Dimensions.get('window').width,
              offset: Dimensions.get('window').width * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item: url }) => (
              <Image source={{ uri: url }} style={styles.visorImagen} resizeMode="contain" />
            )}
          />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volver: { color: '#C9973A', fontSize: 22, fontWeight: 'bold' },
  headerTitulo: { fontSize: 20, fontWeight: 'bold', color: '#C9973A', flex: 1 },
  estadoBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTexto: { fontSize: 11, fontWeight: 'bold' },
  body: { padding: 20 },
  imagenBox: { backgroundColor: '#1A2E4A', borderRadius: 10, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  imagenTexto: { color: '#aaa', fontSize: 13 },
  carruselContainer: { marginBottom: 16, borderRadius: 10, overflow: 'hidden' },
  carruselImagen: { height: 200 },
  carruselIndicadores: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#1A2E4A' },
  indicador: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#aaa' },
  indicadorActivo: { backgroundColor: '#C9973A', width: 16 },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#C9973A', marginBottom: 4 },
  descripcion: { fontSize: 13, color: '#444', marginBottom: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  duenio: { fontSize: 12, color: '#666' },
  precioBase: { fontSize: 13, color: '#1A2E4A', fontWeight: 'bold' },
  mejorOfertaBox: { alignItems: 'center', marginBottom: 16 },
  mejorOfertaValor: { color: '#C9973A', fontSize: 36, fontWeight: 'bold' },
  mejorOfertaLabel: { color: '#666', fontSize: 13 },
  precioFinalBox: { alignItems: 'center', marginBottom: 8 },
  precioFinalValor: { color: '#C9973A', fontSize: 36, fontWeight: 'bold' },
  precioFinalLabel: { color: '#666', fontSize: 13 },
  nuevoDuenio: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  finalizadaBox: { backgroundColor: '#3A1000', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  finalizadaTexto: { color: '#E8593C', fontSize: 15, fontWeight: 'bold' },
  proximaBox: { backgroundColor: '#797731', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 16, marginTop: 8 },
  proximaTexto: { color: '#E1FF38', fontSize: 13, fontWeight: 'bold' },
  seccionTitulo: { fontSize: 13, fontWeight: 'bold', color: '#1A2E4A', marginBottom: 10, marginTop: 8, letterSpacing: 1 },
  sinPujas: { color: '#C9973A', fontSize: 13, marginBottom: 10, fontWeight: '600' },
  historialScroll: { maxHeight: 160, borderRadius: 8, backgroundColor: '#E0E0E0', marginBottom: 12 },
  pujaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  pujaGanadoraRow: { backgroundColor: '#f0fff0', borderRadius: 6, paddingHorizontal: 8 },
  pujaPostor: { color: '#1A2E4A', fontSize: 13 },
  pujaMonto: { color: '#1A2E4A', fontSize: 13, fontWeight: '600' },
  pujaGanadoraMonto: { color: '#4CAF50', fontWeight: 'bold' },
  rangoBox: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, marginTop: 8 },
  rangoTexto: { color: '#1A2E4A', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  inputLabel: { fontSize: 13, color: '#1A2E4A', fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, fontSize: 14, color: '#fff', marginBottom: 12 },
  verificaTexto: { color: '#666', fontSize: 11, marginBottom: 8, fontStyle: 'italic' },
  medioSelector: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  medioSelectorTexto: { color: '#fff', fontSize: 14 },
  mediosDropdown: { backgroundColor: '#1A2E4A', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  medioItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a3e5a' },
  medioItemTexto: { color: '#fff', fontSize: 14 },
  botonOfertar: { backgroundColor: '#E8593C', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  botonDeshabilitado: { opacity: 0.6 },
  botonOfertarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  restriccionBox: { backgroundColor: '#ec6e5554', borderRadius: 10, padding: 16, margin: 10, alignItems: 'center' },
  restriccionTitulo: { color: '#E8593C', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  restriccionTexto: { color: '#E8593C', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  restriccionLink: { color: '#E8593C', fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100 },
  modalAceptada: { backgroundColor: '#E8593C', borderRadius: 16, padding: 30, alignItems: 'center', width: '100%' },
  modalGanadora: { backgroundColor: '#4CAF50', borderRadius: 16, padding: 30, alignItems: 'center', width: '100%' },
  modalSuperada: { backgroundColor: '#1A2E4A', borderRadius: 16, padding: 30, alignItems: 'center', width: '100%' },
  modalIcono: { fontSize: 48, color: '#fff', fontWeight: 'bold', marginBottom: 12 },
  modalIconoAlerta: { fontSize: 48, color: '#C9973A', fontWeight: 'bold', marginBottom: 12 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
  modalTituloSuperada: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
  modalTexto: { fontSize: 15, color: '#fff', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  modalTextoSuperada: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalMonto: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  modalNombreItem: { fontWeight: 'bold', color: '#fff' },
  modalBotonEsperando: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: 14, width: '100%', alignItems: 'center' },
  modalBotonEsperandoTexto: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBotonPrimario: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  modalBotonPrimarioTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  modalBotonSecundario: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecorationLine: 'underline' },
  modalBotonVolverPujar: { backgroundColor: '#C9973A', borderRadius: 8, padding: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  modalBotonVolverPujarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  modalBotonAbandonar: { color: '#aaa', fontSize: 14, textDecorationLine: 'underline' },
  visorContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  visorCerrar: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  visorCerrarTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  visorImagen: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
});